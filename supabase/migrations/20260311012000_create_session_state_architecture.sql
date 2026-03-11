CREATE TABLE IF NOT EXISTS public.session_state (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'planned',
  cultos JSONB NOT NULL DEFAULT '[]'::jsonb,
  all_momentos JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_culto_id TEXT,
  current_index INTEGER NOT NULL DEFAULT -1,
  execution_mode TEXT NOT NULL DEFAULT 'manual',
  timer_status TEXT NOT NULL DEFAULT 'idle',
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  accumulated_ms BIGINT NOT NULL DEFAULT 0,
  moment_started_at TIMESTAMPTZ,
  moment_paused_at TIMESTAMPTZ,
  moment_accumulated_ms BIGINT NOT NULL DEFAULT 0,
  current_command TEXT NOT NULL DEFAULT '',
  next_command TEXT NOT NULL DEFAULT '',
  current_stage TEXT NOT NULL DEFAULT '',
  revision BIGINT NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS public.session_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system',
  expected_revision BIGINT,
  applied_revision BIGINT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT
);

ALTER TABLE public.session_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_state' AND policyname = 'Anyone can read session state'
  ) THEN
    CREATE POLICY "Anyone can read session state" ON public.session_state FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_state' AND policyname = 'Anyone can mutate session state'
  ) THEN
    CREATE POLICY "Anyone can mutate session state" ON public.session_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_events' AND policyname = 'Anyone can read session events'
  ) THEN
    CREATE POLICY "Anyone can read session events" ON public.session_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'session_events' AND policyname = 'Anyone can insert session events'
  ) THEN
    CREATE POLICY "Anyone can insert session events" ON public.session_events FOR INSERT WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_state;

CREATE OR REPLACE FUNCTION public.session_settings_defaults()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'isBlinking', false,
    'orangeThreshold', 120,
    'redThreshold', 20,
    'topFontSize', 4,
    'bottomFontSize', 2.75,
    'timerFontSize', 28,
    'messageFontSize', 16,
    'backgroundColor', '#000000',
    'timerTextColor', '#ffffff',
    'topTextColor', '#b8c0d4',
    'bottomTextColor', '#99a2b3',
    'messageTextColor', '#ffffff',
    'warningColor', '#f59e0b',
    'dangerColor', '#ef4444',
    'message', '',
    'showMessage', false
  );
$$;

CREATE OR REPLACE FUNCTION public.session_default_row(p_session_id text)
RETURNS public.session_state
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.session_state;
BEGIN
  INSERT INTO public.session_state (session_id, settings)
  VALUES (p_session_id, public.session_settings_defaults())
  ON CONFLICT (session_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.session_state
  WHERE session_id = p_session_id;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_session_state(p_session_id text DEFAULT 'main')
RETURNS public.session_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row public.session_state;
BEGIN
  SELECT * INTO v_row
  FROM public.session_state
  WHERE session_id = p_session_id;

  IF NOT FOUND THEN
    v_row := public.session_default_row(p_session_id);
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_session_command(
  p_session_id text DEFAULT 'main',
  p_command text DEFAULT '',
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_expected_revision bigint DEFAULT NULL,
  p_actor text DEFAULT 'anonymous'
)
RETURNS public.session_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state public.session_state;
  v_event_id bigint;
  v_now timestamptz := now();
  v_expected bigint := p_expected_revision;
  v_current_moment jsonb;
  v_next_moment jsonb;
  v_new_cultos jsonb;
  v_new_momentos jsonb;
  v_culto_id text;
  v_target_id text;
  v_payload_revision bigint;
  v_new_duration numeric;
BEGIN
  v_state := public.get_session_state(p_session_id);

  INSERT INTO public.session_events (
    session_id,
    event_type,
    payload,
    created_by,
    expected_revision,
    success
  )
  VALUES (
    p_session_id,
    p_command,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(p_actor, ''), 'anonymous'),
    v_expected,
    false
  )
  RETURNING id INTO v_event_id;

  SELECT * INTO v_state
  FROM public.session_state
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF v_expected IS NULL AND (p_payload ? 'expectedRevision') THEN
    v_expected := (p_payload->>'expectedRevision')::bigint;
  END IF;

  IF v_expected IS NOT NULL AND v_expected <> v_state.revision THEN
    UPDATE public.session_events
    SET error_message = format('revision conflict: expected %s, got %s', v_expected, v_state.revision)
    WHERE id = v_event_id;
    RAISE EXCEPTION 'revision conflict';
  END IF;

  v_culto_id := COALESCE(NULLIF(p_payload->>'activeCultoId', ''), v_state.active_culto_id);
  v_target_id := NULLIF(p_payload->>'id', '');

  CASE p_command
    WHEN 'start' THEN
      IF v_state.status = 'live' AND v_state.timer_status <> 'finished' THEN
        RAISE EXCEPTION 'session already live';
      END IF;
      v_state.status := 'live';
      v_state.timer_status := CASE WHEN COALESCE(jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id), 0) > 0 THEN 'running' ELSE 'idle' END;
      v_state.current_index := CASE WHEN COALESCE(jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id), 0) > 0 THEN 0 ELSE -1 END;
      v_state.started_at := CASE WHEN v_state.current_index >= 0 THEN v_now ELSE NULL END;
      v_state.paused_at := NULL;
      v_state.accumulated_ms := 0;
      v_state.moment_started_at := CASE WHEN v_state.current_index >= 0 THEN v_now ELSE NULL END;
      v_state.moment_paused_at := NULL;
      v_state.moment_accumulated_ms := 0;
    WHEN 'pause' THEN
      IF v_state.timer_status <> 'running' THEN
        RAISE EXCEPTION 'timer is not running';
      END IF;
      v_state.accumulated_ms := v_state.accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.started_at)) * 1000))::bigint;
      v_state.moment_accumulated_ms := v_state.moment_accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.moment_started_at)) * 1000))::bigint;
      v_state.timer_status := 'paused';
      v_state.started_at := NULL;
      v_state.moment_started_at := NULL;
      v_state.paused_at := v_now;
      v_state.moment_paused_at := v_now;
    WHEN 'resume' THEN
      IF v_state.timer_status <> 'paused' OR v_state.status <> 'live' THEN
        RAISE EXCEPTION 'timer cannot resume from current state';
      END IF;
      v_state.timer_status := 'running';
      v_state.started_at := v_now;
      v_state.moment_started_at := v_now;
      v_state.paused_at := NULL;
      v_state.moment_paused_at := NULL;
    WHEN 'advance' THEN
      IF v_state.status <> 'live' THEN
        RAISE EXCEPTION 'session is not live';
      END IF;
      IF v_state.timer_status = 'running' THEN
        v_state.accumulated_ms := v_state.accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.started_at)) * 1000))::bigint;
        v_state.moment_accumulated_ms := v_state.moment_accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.moment_started_at)) * 1000))::bigint;
      END IF;
      IF v_state.current_index + 1 >= COALESCE(jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id), 0) THEN
        v_state.status := 'finished';
        v_state.timer_status := 'finished';
        v_state.started_at := NULL;
        v_state.moment_started_at := NULL;
        v_state.paused_at := v_now;
        v_state.moment_paused_at := v_now;
      ELSE
        v_state.current_index := v_state.current_index + 1;
        v_state.moment_accumulated_ms := 0;
        IF v_state.timer_status = 'paused' THEN
          v_state.moment_paused_at := v_now;
          v_state.moment_started_at := NULL;
        ELSE
          v_state.timer_status := 'running';
          v_state.started_at := v_now;
          v_state.moment_started_at := v_now;
          v_state.paused_at := NULL;
          v_state.moment_paused_at := NULL;
        END IF;
      END IF;
    WHEN 'back' THEN
      IF v_state.status <> 'live' OR v_state.current_index <= 0 THEN
        RAISE EXCEPTION 'cannot move back';
      END IF;
      IF v_state.timer_status = 'running' THEN
        v_state.accumulated_ms := v_state.accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.started_at)) * 1000))::bigint;
      END IF;
      v_state.current_index := v_state.current_index - 1;
      v_state.moment_accumulated_ms := 0;
      IF v_state.timer_status = 'paused' THEN
        v_state.moment_paused_at := v_now;
        v_state.moment_started_at := NULL;
      ELSE
        v_state.started_at := v_now;
        v_state.moment_started_at := v_now;
      END IF;
    WHEN 'skip' THEN
      RETURN public.apply_session_command(p_session_id, 'advance', p_payload, v_expected, p_actor);
    WHEN 'finish' THEN
      IF v_state.timer_status = 'running' THEN
        v_state.accumulated_ms := v_state.accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.started_at)) * 1000))::bigint;
        v_state.moment_accumulated_ms := v_state.moment_accumulated_ms + greatest(0, floor(extract(epoch from (v_now - v_state.moment_started_at)) * 1000))::bigint;
      END IF;
      v_state.status := 'finished';
      v_state.timer_status := 'finished';
      v_state.started_at := NULL;
      v_state.moment_started_at := NULL;
      v_state.paused_at := v_now;
      v_state.moment_paused_at := v_now;
    WHEN 'set_execution_mode' THEN
      v_state.execution_mode := COALESCE(NULLIF(p_payload->>'mode', ''), v_state.execution_mode);
    WHEN 'adjust_duration' THEN
      IF v_state.current_index < 0 THEN
        RAISE EXCEPTION 'no active moment';
      END IF;
      v_new_duration := GREATEST(
        0,
        COALESCE((((v_state.all_momentos -> v_state.active_culto_id -> v_state.current_index) ->> 'duracao')::numeric), 0) +
        (COALESCE((p_payload->>'deltaSeconds')::numeric, 0) / 60)
      );
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN ordinality - 1 = v_state.current_index THEN
              jsonb_set(
                jsonb_set(value, '{duracao}', to_jsonb(v_new_duration)),
                '{duracaoOriginal}',
                COALESCE(value->'duracaoOriginal', value->'duracao')
              )
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.all_momentos -> v_state.active_culto_id) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb));
    WHEN 'mark_called' THEN
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN jsonb_set(value, '{chamado}', 'true'::jsonb)
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.all_momentos -> v_state.active_culto_id) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb));
    WHEN 'patch_settings' THEN
      v_state.settings := COALESCE(v_state.settings, public.session_settings_defaults()) || COALESCE(p_payload->'patch', '{}'::jsonb);
    WHEN 'set_active_culto' THEN
      v_state.active_culto_id := COALESCE(NULLIF(p_payload->>'id', ''), v_state.active_culto_id);
      v_state.current_index := -1;
      v_state.status := 'planned';
      v_state.timer_status := 'idle';
      v_state.started_at := NULL;
      v_state.paused_at := NULL;
      v_state.accumulated_ms := 0;
      v_state.moment_started_at := NULL;
      v_state.moment_paused_at := NULL;
      v_state.moment_accumulated_ms := 0;
    WHEN 'set_culto' THEN
      v_target_id := COALESCE(NULLIF(p_payload->>'id', ''), v_state.active_culto_id);
      v_new_cultos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN p_payload->'culto'
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY
      );
      v_state.cultos := COALESCE(v_new_cultos, v_state.cultos);
    WHEN 'set_momentos' THEN
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(p_payload->'momentos', '[]'::jsonb));
    WHEN 'add_culto' THEN
      v_state.cultos := COALESCE(v_state.cultos, '[]'::jsonb) || jsonb_build_array(p_payload->'culto');
      v_state.all_momentos := v_state.all_momentos || jsonb_build_object((p_payload->'culto'->>'id'), '[]'::jsonb);
      v_state.active_culto_id := p_payload->'culto'->>'id';
    WHEN 'update_culto' THEN
      v_target_id := p_payload->'culto'->>'id';
      v_new_cultos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN p_payload->'culto'
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY
      );
      v_state.cultos := COALESCE(v_new_cultos, v_state.cultos);
    WHEN 'remove_culto' THEN
      v_target_id := COALESCE(NULLIF(p_payload->>'id', ''), '');
      v_state.cultos := COALESCE((
        SELECT jsonb_agg(value ORDER BY ordinality)
        FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY
        WHERE value->>'id' <> v_target_id
      ), '[]'::jsonb);
      v_state.all_momentos := v_state.all_momentos - v_target_id;
      IF v_state.active_culto_id = v_target_id THEN
        v_state.active_culto_id := COALESCE(v_state.cultos->0->>'id', NULL);
      END IF;
    WHEN 'duplicate_culto' THEN
      v_state.cultos := COALESCE(v_state.cultos, '[]'::jsonb) || jsonb_build_array(p_payload->'culto');
      v_state.all_momentos := v_state.all_momentos || jsonb_build_object((p_payload->'culto'->>'id'), COALESCE(p_payload->'momentos', '[]'::jsonb));
    WHEN 'add_momento' THEN
      v_state.all_momentos := jsonb_set(
        v_state.all_momentos,
        ARRAY[v_state.active_culto_id],
        COALESCE(v_state.all_momentos->v_state.active_culto_id, '[]'::jsonb) || jsonb_build_array(p_payload->'momento')
      );
    WHEN 'update_momento' THEN
      v_target_id := p_payload->'momento'->>'id';
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN p_payload->'momento'
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.all_momentos -> v_state.active_culto_id) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb));
    WHEN 'remove_momento' THEN
      v_target_id := COALESCE(NULLIF(p_payload->>'id', ''), '');
      v_new_momentos := (
        SELECT COALESCE(jsonb_agg(value ORDER BY ordinality), '[]'::jsonb)
        FROM jsonb_array_elements(v_state.all_momentos -> v_state.active_culto_id) WITH ORDINALITY
        WHERE value->>'id' <> v_target_id
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], v_new_momentos);
    ELSE
      RAISE EXCEPTION 'unsupported command: %', p_command;
  END CASE;

  v_current_moment := CASE
    WHEN v_state.active_culto_id IS NULL OR v_state.current_index < 0 THEN NULL
    ELSE v_state.all_momentos -> v_state.active_culto_id -> v_state.current_index
  END;
  v_next_moment := CASE
    WHEN v_state.active_culto_id IS NULL OR v_state.current_index < 0 THEN NULL
    ELSE v_state.all_momentos -> v_state.active_culto_id -> (v_state.current_index + 1)
  END;

  v_state.current_command := COALESCE(v_current_moment->>'atividade', '');
  v_state.next_command := COALESCE(v_next_moment->>'atividade', '');
  v_state.current_stage := COALESCE(v_current_moment->>'bloco', '');
  v_state.revision := v_state.revision + 1;
  v_state.updated_at := v_now;
  v_state.updated_by := COALESCE(NULLIF(p_actor, ''), 'anonymous');

  UPDATE public.session_state
  SET
    status = v_state.status,
    cultos = v_state.cultos,
    all_momentos = v_state.all_momentos,
    active_culto_id = v_state.active_culto_id,
    current_index = v_state.current_index,
    execution_mode = v_state.execution_mode,
    timer_status = v_state.timer_status,
    started_at = v_state.started_at,
    paused_at = v_state.paused_at,
    accumulated_ms = v_state.accumulated_ms,
    moment_started_at = v_state.moment_started_at,
    moment_paused_at = v_state.moment_paused_at,
    moment_accumulated_ms = v_state.moment_accumulated_ms,
    current_command = v_state.current_command,
    next_command = v_state.next_command,
    current_stage = v_state.current_stage,
    revision = v_state.revision,
    settings = COALESCE(v_state.settings, public.session_settings_defaults()),
    updated_at = v_state.updated_at,
    updated_by = v_state.updated_by
  WHERE session_id = p_session_id
  RETURNING * INTO v_state;

  UPDATE public.session_events
  SET success = true, applied_revision = v_state.revision
  WHERE id = v_event_id;

  RETURN v_state;

EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.session_events
    SET error_message = SQLERRM
    WHERE id = v_event_id;
    RAISE;
END;
$$;

SELECT public.get_session_state('main');
