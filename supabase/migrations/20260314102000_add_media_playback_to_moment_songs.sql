ALTER TABLE public.moment_songs
  ADD COLUMN IF NOT EXISTS has_media BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_playback BOOLEAN NOT NULL DEFAULT false;

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
      has_media,
      has_playback,
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
      CASE lower(COALESCE(v_item->>'has_media', v_item->>'hasMedia', 'false'))
        WHEN 'true' THEN true
        WHEN '1' THEN true
        WHEN 'yes' THEN true
        ELSE false
      END,
      CASE lower(COALESCE(v_item->>'has_playback', v_item->>'hasPlayback', 'false'))
        WHEN 'true' THEN true
        WHEN '1' THEN true
        WHEN 'yes' THEN true
        ELSE false
      END,
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
          'has_media', song.has_media,
          'has_playback', song.has_playback,
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
          'has_media', song.has_media,
          'has_playback', song.has_playback,
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
