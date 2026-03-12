ALTER TABLE public.session_state
  ADD COLUMN IF NOT EXISTS moderador_release_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderador_release_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderador_release_by text,
  ADD COLUMN IF NOT EXISTS moderador_release_pending_moment_id text,
  ADD COLUMN IF NOT EXISTS moderador_release_granted_moment_id text;

ALTER TABLE public.culto_sync_state
  ADD COLUMN IF NOT EXISTS moderador_release_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderador_release_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderador_release_by text,
  ADD COLUMN IF NOT EXISTS moderador_release_pending_moment_id text,
  ADD COLUMN IF NOT EXISTS moderador_release_granted_moment_id text;

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
  v_safe_payload jsonb := CASE WHEN jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) = 'object' THEN COALESCE(p_payload, '{}'::jsonb) ELSE '{}'::jsonb END;
  v_current_moment jsonb;
  v_next_moment jsonb;
  v_new_cultos jsonb;
  v_new_momentos jsonb;
  v_culto_id text;
  v_target_id text;
  v_new_duration numeric;
  v_culto_payload jsonb := COALESCE(v_safe_payload->'culto', '{}'::jsonb);
  v_momento_payload jsonb := COALESCE(v_safe_payload->'momento', '{}'::jsonb);
  v_command text := lower(trim(COALESCE(p_command, '')));
  v_actor text := COALESCE(NULLIF(p_actor, ''), 'anonymous');
  v_target_exists boolean := false;
BEGIN
  PERFORM public.get_session_state(p_session_id);

  IF v_expected IS NULL AND (v_safe_payload ? 'expectedRevision') THEN
    v_expected := NULLIF(v_safe_payload->>'expectedRevision', '')::bigint;
  END IF;

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
    v_command,
    v_safe_payload,
    v_actor,
    v_expected,
    false
  )
  RETURNING id INTO v_event_id;

  SELECT *
  INTO v_state
  FROM public.session_state
  WHERE session_id = p_session_id
  FOR UPDATE;

  IF v_expected IS NOT NULL AND v_expected <> v_state.revision THEN
    UPDATE public.session_events
    SET error_message = format('revision conflict: expected %s, got %s', v_expected, v_state.revision)
    WHERE id = v_event_id;
    RAISE EXCEPTION 'revision conflict: expected %, got %', v_expected, v_state.revision;
  END IF;

  v_state.cultos := CASE WHEN jsonb_typeof(v_state.cultos) = 'array' THEN v_state.cultos ELSE '[]'::jsonb END;
  v_state.all_momentos := CASE WHEN jsonb_typeof(v_state.all_momentos) = 'object' THEN v_state.all_momentos ELSE '{}'::jsonb END;
  v_state.settings := COALESCE(v_state.settings, public.session_settings_defaults());
  v_state.moderador_release_active := COALESCE(v_state.moderador_release_active, false);
  v_state.moderador_release_pending_moment_id := NULLIF(v_state.moderador_release_pending_moment_id, '');
  v_state.moderador_release_granted_moment_id := NULLIF(v_state.moderador_release_granted_moment_id, '');

  v_culto_id := COALESCE(
    NULLIF(v_safe_payload->>'cultoId', ''),
    NULLIF(v_momento_payload->>'cultoId', ''),
    NULLIF(v_safe_payload->>'activeCultoId', ''),
    v_state.active_culto_id
  );
  v_target_id := COALESCE(
    NULLIF(v_safe_payload->>'id', ''),
    NULLIF(v_culto_payload->>'id', ''),
    NULLIF(v_momento_payload->>'id', '')
  );

  CASE v_command
    WHEN 'start' THEN
      IF v_state.status = 'live' AND v_state.timer_status <> 'finished' THEN
        RAISE EXCEPTION 'session already live';
      END IF;
      IF v_state.active_culto_id IS NULL THEN
        RAISE EXCEPTION 'no active culto';
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
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
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
    WHEN 'advance', 'skip' THEN
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
        v_state.moderador_release_active := false;
        v_state.moderador_release_pending_moment_id := NULL;
        v_state.moderador_release_granted_moment_id := NULL;
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
        v_state.moderador_release_active := false;
        v_state.moderador_release_pending_moment_id := NULL;
        v_state.moderador_release_granted_moment_id := NULL;
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
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
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
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
    WHEN 'set_execution_mode' THEN
      v_state.execution_mode := COALESCE(NULLIF(v_safe_payload->>'mode', ''), v_state.execution_mode);
    WHEN 'adjust_duration' THEN
      IF v_state.current_index < 0 THEN
        RAISE EXCEPTION 'no active moment';
      END IF;
      v_new_duration := GREATEST(
        0,
        COALESCE((((v_state.all_momentos -> v_state.active_culto_id -> v_state.current_index) ->> 'duracao')::numeric), 0) +
        (COALESCE((v_safe_payload->>'deltaSeconds')::numeric, 0) / 60)
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
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos -> v_state.active_culto_id, '[]'::jsonb)) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb), true);
    WHEN 'mark_called' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'moment id is required';
      END IF;
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN
              jsonb_set(
                jsonb_set(value, '{chamado}', 'true'::jsonb),
                '{moderadorStatus}',
                '"chamado"'::jsonb,
                true
              )
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos -> v_state.active_culto_id, '[]'::jsonb)) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb), true);
    WHEN 'toggle_moderador_release' THEN
      v_state.moderador_release_active := COALESCE((v_safe_payload->>'active')::boolean, false);
      v_state.moderador_release_updated_at := v_now;
      v_state.moderador_release_by := v_actor;
      IF v_state.moderador_release_active THEN
        IF v_state.active_culto_id IS NOT NULL AND v_state.current_index >= 0 THEN
          v_state.moderador_release_granted_moment_id := COALESCE(
            v_state.all_momentos -> v_state.active_culto_id -> v_state.current_index ->> 'id',
            v_state.moderador_release_granted_moment_id
          );
        END IF;
        v_state.moderador_release_pending_moment_id := NULL;
      END IF;
    WHEN 'update_moderador_status' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'moment id is required';
      END IF;
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN value->>'id' = v_target_id THEN
              jsonb_set(
                jsonb_set(
                  value,
                  '{moderadorStatus}',
                  to_jsonb(COALESCE(NULLIF(v_safe_payload->>'status', ''), 'pendente')),
                  true
                ),
                '{chamado}',
                CASE
                  WHEN COALESCE(NULLIF(v_safe_payload->>'status', ''), 'pendente') = 'pendente' THEN 'false'::jsonb
                  ELSE 'true'::jsonb
                END,
                true
              )
            ELSE value
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos -> v_state.active_culto_id, '[]'::jsonb)) WITH ORDINALITY
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], COALESCE(v_new_momentos, '[]'::jsonb), true);
    WHEN 'patch_settings' THEN
      v_state.settings := COALESCE(v_state.settings, public.session_settings_defaults()) || COALESCE(v_safe_payload->'patch', '{}'::jsonb);
    WHEN 'set_active_culto' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS value
        WHERE value->>'id' = v_target_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_target_id;
      END IF;
      v_state.active_culto_id := v_target_id;
      v_state.current_index := -1;
      v_state.status := 'planned';
      v_state.timer_status := 'idle';
      v_state.started_at := NULL;
      v_state.paused_at := NULL;
      v_state.accumulated_ms := 0;
      v_state.moment_started_at := NULL;
      v_state.moment_paused_at := NULL;
      v_state.moment_accumulated_ms := 0;
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
    WHEN 'set_culto', 'update_culto' THEN
      v_target_id := COALESCE(NULLIF(v_culto_payload->>'id', ''), v_target_id, v_state.active_culto_id);
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required';
      END IF;
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_target_id
      ) INTO v_target_exists;
      IF NOT v_target_exists THEN
        RAISE EXCEPTION 'culto not found: %', v_target_id;
      END IF;
      v_new_cultos := (
        SELECT jsonb_agg(
          CASE
            WHEN elem->>'id' = v_target_id THEN v_culto_payload
            ELSE elem
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY AS arr(elem, ordinality)
      );
      v_state.cultos := COALESCE(v_new_cultos, v_state.cultos);
    WHEN 'set_momentos' THEN
      IF v_culto_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required for momentos';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_culto_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_culto_id;
      END IF;
      v_state.all_momentos := jsonb_set(
        v_state.all_momentos,
        ARRAY[v_culto_id],
        CASE WHEN jsonb_typeof(COALESCE(v_safe_payload->'momentos', '[]'::jsonb)) = 'array' THEN COALESCE(v_safe_payload->'momentos', '[]'::jsonb) ELSE '[]'::jsonb END,
        true
      );
      v_state.active_culto_id := v_culto_id;
    WHEN 'add_culto' THEN
      v_target_id := NULLIF(v_culto_payload->>'id', '');
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_target_id
      ) THEN
        v_new_cultos := (
          SELECT jsonb_agg(
            CASE
              WHEN elem->>'id' = v_target_id THEN v_culto_payload
              ELSE elem
            END
            ORDER BY ordinality
          )
          FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY AS arr(elem, ordinality)
        );
        v_state.cultos := COALESCE(v_new_cultos, v_state.cultos);
      ELSE
        v_state.cultos := v_state.cultos || jsonb_build_array(v_culto_payload);
      END IF;
      v_state.all_momentos := v_state.all_momentos || jsonb_build_object(v_target_id, COALESCE(v_state.all_momentos->v_target_id, '[]'::jsonb));
      v_state.active_culto_id := v_target_id;
      v_state.current_index := -1;
      v_state.status := 'planned';
      v_state.timer_status := 'idle';
      v_state.started_at := NULL;
      v_state.paused_at := NULL;
      v_state.accumulated_ms := 0;
      v_state.moment_started_at := NULL;
      v_state.moment_paused_at := NULL;
      v_state.moment_accumulated_ms := 0;
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
    WHEN 'remove_culto', 'delete_culto' THEN
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_target_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_target_id;
      END IF;
      v_state.cultos := COALESCE((
        SELECT jsonb_agg(elem ORDER BY ordinality)
        FROM jsonb_array_elements(v_state.cultos) WITH ORDINALITY AS arr(elem, ordinality)
        WHERE elem->>'id' <> v_target_id
      ), '[]'::jsonb);
      v_state.all_momentos := v_state.all_momentos - v_target_id;
      IF jsonb_array_length(v_state.cultos) = 0 THEN
        v_state.active_culto_id := NULL;
        v_state.current_index := -1;
        v_state.status := 'planned';
        v_state.timer_status := 'idle';
      ELSIF v_state.active_culto_id = v_target_id OR v_state.active_culto_id IS NULL THEN
        v_state.active_culto_id := v_state.cultos->0->>'id';
        v_state.current_index := -1;
        v_state.status := 'planned';
        v_state.timer_status := 'idle';
      END IF;
      v_state.moderador_release_active := false;
      v_state.moderador_release_pending_moment_id := NULL;
      v_state.moderador_release_granted_moment_id := NULL;
    WHEN 'duplicate_culto' THEN
      v_target_id := NULLIF(v_culto_payload->>'id', '');
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_target_id
      ) THEN
        RAISE EXCEPTION 'duplicate culto id: %', v_target_id;
      END IF;
      v_state.cultos := v_state.cultos || jsonb_build_array(v_culto_payload);
      v_state.all_momentos := v_state.all_momentos || jsonb_build_object(v_target_id, COALESCE(v_safe_payload->'momentos', '[]'::jsonb));
    WHEN 'add_momento' THEN
      v_culto_id := COALESCE(NULLIF(v_momento_payload->>'cultoId', ''), v_culto_id);
      v_target_id := NULLIF(v_momento_payload->>'id', '');
      IF v_culto_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required for momento';
      END IF;
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'momento id is required';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_culto_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_culto_id;
      END IF;
      IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) AS elem
        WHERE elem->>'id' = v_target_id
      ) THEN
        v_new_momentos := (
          SELECT jsonb_agg(
            CASE
              WHEN elem->>'id' = v_target_id THEN v_momento_payload
              ELSE elem
            END
            ORDER BY ordinality
          )
          FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) WITH ORDINALITY AS arr(elem, ordinality)
        );
      ELSE
        v_new_momentos := COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb) || jsonb_build_array(v_momento_payload);
      END IF;
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_culto_id], COALESCE(v_new_momentos, '[]'::jsonb), true);
      v_state.active_culto_id := v_culto_id;
    WHEN 'update_momento' THEN
      v_culto_id := COALESCE(NULLIF(v_momento_payload->>'cultoId', ''), v_culto_id);
      v_target_id := NULLIF(v_momento_payload->>'id', '');
      IF v_culto_id IS NULL OR v_target_id IS NULL THEN
        RAISE EXCEPTION 'momento id and culto id are required';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_culto_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_culto_id;
      END IF;
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) AS elem
        WHERE elem->>'id' = v_target_id
      ) INTO v_target_exists;
      IF NOT v_target_exists THEN
        RAISE EXCEPTION 'momento not found: %', v_target_id;
      END IF;
      v_new_momentos := (
        SELECT jsonb_agg(
          CASE
            WHEN elem->>'id' = v_target_id THEN v_momento_payload
            ELSE elem
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) WITH ORDINALITY AS arr(elem, ordinality)
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_culto_id], COALESCE(v_new_momentos, '[]'::jsonb), true);
      v_state.active_culto_id := v_culto_id;
    WHEN 'remove_momento', 'delete_momento' THEN
      IF v_culto_id IS NULL THEN
        RAISE EXCEPTION 'culto id is required for momento';
      END IF;
      IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'momento id is required';
      END IF;
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_state.cultos) AS elem
        WHERE elem->>'id' = v_culto_id
      ) THEN
        RAISE EXCEPTION 'culto not found: %', v_culto_id;
      END IF;
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) AS elem
        WHERE elem->>'id' = v_target_id
      ) INTO v_target_exists;
      IF NOT v_target_exists THEN
        RAISE EXCEPTION 'momento not found: %', v_target_id;
      END IF;
      v_new_momentos := (
        SELECT COALESCE(jsonb_agg(elem ORDER BY ordinality), '[]'::jsonb)
        FROM jsonb_array_elements(COALESCE(v_state.all_momentos->v_culto_id, '[]'::jsonb)) WITH ORDINALITY AS arr(elem, ordinality)
        WHERE elem->>'id' <> v_target_id
      );
      v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_culto_id], v_new_momentos, true);
      v_state.active_culto_id := v_culto_id;
    ELSE
      RAISE EXCEPTION 'unsupported command: %', v_command;
  END CASE;

  IF jsonb_array_length(v_state.cultos) > 0 AND (
    v_state.active_culto_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_state.cultos) AS elem
      WHERE elem->>'id' = v_state.active_culto_id
    )
  ) THEN
    v_state.active_culto_id := v_state.cultos->0->>'id';
  END IF;

  IF v_state.active_culto_id IS NOT NULL AND COALESCE(jsonb_typeof(v_state.all_momentos -> v_state.active_culto_id), '') <> 'array' THEN
    v_state.all_momentos := jsonb_set(v_state.all_momentos, ARRAY[v_state.active_culto_id], '[]'::jsonb, true);
  END IF;

  IF v_state.active_culto_id IS NULL OR COALESCE(jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id), 0) = 0 THEN
    v_state.current_index := -1;
  ELSIF v_state.current_index >= COALESCE(jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id), 0) THEN
    v_state.current_index := jsonb_array_length(v_state.all_momentos -> v_state.active_culto_id) - 1;
  END IF;

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
  IF v_current_moment IS NULL THEN
    v_state.moderador_release_pending_moment_id := NULL;
    v_state.moderador_release_granted_moment_id := NULL;
    v_state.moderador_release_active := false;
  ELSIF v_state.moderador_release_granted_moment_id IS DISTINCT FROM (v_current_moment->>'id') THEN
    v_state.moderador_release_pending_moment_id := v_current_moment->>'id';
  ELSE
    v_state.moderador_release_pending_moment_id := NULL;
  END IF;
  v_state.revision := v_state.revision + 1;
  v_state.updated_at := v_now;
  v_state.updated_by := v_actor;

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
    settings = v_state.settings,
    moderador_release_active = v_state.moderador_release_active,
    moderador_release_updated_at = v_state.moderador_release_updated_at,
    moderador_release_by = v_state.moderador_release_by,
    moderador_release_pending_moment_id = v_state.moderador_release_pending_moment_id,
    moderador_release_granted_moment_id = v_state.moderador_release_granted_moment_id,
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
