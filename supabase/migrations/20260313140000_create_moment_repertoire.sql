CREATE TABLE IF NOT EXISTS public.moment_song_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'main',
  culto_id TEXT NOT NULL,
  momento_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT moment_song_forms_session_momento_unique UNIQUE (session_id, momento_id)
);

CREATE TABLE IF NOT EXISTS public.moment_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'main',
  culto_id TEXT NOT NULL,
  momento_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NULL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  youtube_url TEXT NULL,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  notes TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moment_song_forms_session ON public.moment_song_forms (session_id);
CREATE INDEX IF NOT EXISTS idx_moment_song_forms_momento ON public.moment_song_forms (momento_id);
CREATE INDEX IF NOT EXISTS idx_moment_songs_session_momento ON public.moment_songs (session_id, momento_id, position);
CREATE INDEX IF NOT EXISTS idx_moment_songs_culto ON public.moment_songs (culto_id, momento_id);

ALTER TABLE public.moment_song_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_songs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'moment_song_forms' AND policyname = 'Anyone can read moment song forms'
  ) THEN
    CREATE POLICY "Anyone can read moment song forms"
      ON public.moment_song_forms
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'moment_songs' AND policyname = 'Anyone can read moment songs'
  ) THEN
    CREATE POLICY "Anyone can read moment songs"
      ON public.moment_songs
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.moment_song_forms;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.moment_songs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_moment_song_forms_updated_at ON public.moment_song_forms;
CREATE TRIGGER touch_moment_song_forms_updated_at
BEFORE UPDATE ON public.moment_song_forms
FOR EACH ROW
EXECUTE FUNCTION public.touch_timestamp_updated_at();

DROP TRIGGER IF EXISTS touch_moment_songs_updated_at ON public.moment_songs;
CREATE TRIGGER touch_moment_songs_updated_at
BEFORE UPDATE ON public.moment_songs
FOR EACH ROW
EXECUTE FUNCTION public.touch_timestamp_updated_at();

CREATE OR REPLACE FUNCTION public.generate_moment_song_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT lower(
    substring(
      md5(
        random()::text
        || clock_timestamp()::text
        || pg_backend_pid()::text
      )
      || md5(
        clock_timestamp()::text
        || random()::text
      )
      FROM 1 FOR 24
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_moment_song_form(
  p_session_id text DEFAULT 'main',
  p_culto_id text DEFAULT '',
  p_momento_id text DEFAULT ''
)
RETURNS public.moment_song_forms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form public.moment_song_forms;
BEGIN
  IF trim(COALESCE(p_momento_id, '')) = '' THEN
    RAISE EXCEPTION 'momento_id is required';
  END IF;

  SELECT *
  INTO v_form
  FROM public.moment_song_forms
  WHERE session_id = COALESCE(NULLIF(trim(p_session_id), ''), 'main')
    AND momento_id = p_momento_id
  LIMIT 1;

  IF FOUND THEN
    IF v_form.culto_id IS DISTINCT FROM COALESCE(NULLIF(trim(p_culto_id), ''), v_form.culto_id) THEN
      UPDATE public.moment_song_forms
      SET culto_id = COALESCE(NULLIF(trim(p_culto_id), ''), v_form.culto_id)
      WHERE id = v_form.id
      RETURNING * INTO v_form;
    END IF;

    RETURN v_form;
  END IF;

  INSERT INTO public.moment_song_forms (
    session_id,
    culto_id,
    momento_id,
    token
  )
  VALUES (
    COALESCE(NULLIF(trim(p_session_id), ''), 'main'),
    COALESCE(NULLIF(trim(p_culto_id), ''), ''),
    p_momento_id,
    public.generate_moment_song_token()
  )
  RETURNING * INTO v_form;

  RETURN v_form;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_moment_repertoire(
  p_session_id text DEFAULT 'main',
  p_culto_id text DEFAULT '',
  p_momento_id text DEFAULT '',
  p_songs jsonb DEFAULT '[]'::jsonb,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form public.moment_song_forms;
  v_item jsonb;
  v_position integer := 0;
BEGIN
  IF jsonb_typeof(COALESCE(p_songs, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'songs payload must be an array';
  END IF;

  v_form := public.ensure_moment_song_form(p_session_id, p_culto_id, p_momento_id);

  DELETE FROM public.moment_songs
  WHERE session_id = v_form.session_id
    AND momento_id = v_form.momento_id;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_songs, '[]'::jsonb))
  LOOP
    INSERT INTO public.moment_songs (
      session_id,
      culto_id,
      momento_id,
      title,
      duration_seconds,
      youtube_url,
      position,
      notes,
      created_by
    )
    VALUES (
      v_form.session_id,
      v_form.culto_id,
      v_form.momento_id,
      trim(COALESCE(v_item->>'title', '')),
      CASE
        WHEN NULLIF(trim(COALESCE(v_item->>'duration_seconds', v_item->>'durationSeconds', '')), '') IS NULL THEN NULL
        ELSE GREATEST(0, (NULLIF(trim(COALESCE(v_item->>'duration_seconds', v_item->>'durationSeconds', '')), ''))::integer)
      END,
      NULLIF(trim(COALESCE(v_item->>'youtube_url', v_item->>'youtubeUrl', '')), ''),
      v_position,
      NULLIF(trim(COALESCE(v_item->>'notes', '')), ''),
      NULLIF(trim(COALESCE(p_created_by, '')), '')
    );

    v_position := v_position + 1;
  END LOOP;

  UPDATE public.moment_song_forms
  SET culto_id = COALESCE(NULLIF(trim(p_culto_id), ''), culto_id)
  WHERE id = v_form.id
  RETURNING * INTO v_form;

  RETURN jsonb_build_object(
    'form', to_jsonb(v_form),
    'songs', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', song.id,
          'session_id', song.session_id,
          'culto_id', song.culto_id,
          'momento_id', song.momento_id,
          'title', song.title,
          'duration_seconds', song.duration_seconds,
          'youtube_url', song.youtube_url,
          'position', song.position,
          'notes', song.notes,
          'created_by', song.created_by,
          'created_at', song.created_at,
          'updated_at', song.updated_at
        )
        ORDER BY song.position ASC, song.created_at ASC
      )
      FROM public.moment_songs AS song
      WHERE song.session_id = v_form.session_id
        AND song.momento_id = v_form.momento_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_moment_song_bundle_by_token(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form public.moment_song_forms;
BEGIN
  SELECT *
  INTO v_form
  FROM public.moment_song_forms
  WHERE token = trim(COALESCE(p_token, ''))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'form', to_jsonb(v_form),
    'songs', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', song.id,
          'session_id', song.session_id,
          'culto_id', song.culto_id,
          'momento_id', song.momento_id,
          'title', song.title,
          'duration_seconds', song.duration_seconds,
          'youtube_url', song.youtube_url,
          'position', song.position,
          'notes', song.notes,
          'created_by', song.created_by,
          'created_at', song.created_at,
          'updated_at', song.updated_at
        )
        ORDER BY song.position ASC, song.created_at ASC
      )
      FROM public.moment_songs AS song
      WHERE song.session_id = v_form.session_id
        AND song.momento_id = v_form.momento_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_moment_repertoire_by_token(
  p_token text,
  p_songs jsonb DEFAULT '[]'::jsonb,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form public.moment_song_forms;
BEGIN
  SELECT *
  INTO v_form
  FROM public.moment_song_forms
  WHERE token = trim(COALESCE(p_token, ''))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token not found';
  END IF;

  RETURN public.save_moment_repertoire(
    v_form.session_id,
    v_form.culto_id,
    v_form.momento_id,
    p_songs,
    p_created_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_moment_song_form(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_moment_repertoire(text, text, text, jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_moment_song_bundle_by_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_moment_repertoire_by_token(text, jsonb, text) TO anon, authenticated, service_role;
