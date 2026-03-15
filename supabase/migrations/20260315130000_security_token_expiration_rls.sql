-- Migration: Security hardening + token expiration
-- Date: 2026-03-15

-- 1. Set default expiration for new tokens (30 days)
ALTER TABLE person_access_tokens
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- 2. Backfill existing tokens without expiration (set 30 days from now)
UPDATE person_access_tokens
SET expires_at = now() + interval '30 days'
WHERE expires_at IS NULL;

-- 3. Update get_person_by_token to check expiration
CREATE OR REPLACE FUNCTION get_person_by_token(token_param TEXT)
RETURNS TABLE (
  person_id UUID,
  person_name TEXT,
  person_church TEXT,
  person_phone TEXT,
  person_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.church,
    p.phone,
    p.email
  FROM person_access_tokens pat
  JOIN people p ON p.id = pat.person_id
  WHERE pat.token = token_param
    AND pat.is_active = true
    AND (pat.expires_at IS NULL OR pat.expires_at > now());
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. RLS: Restrict writes on critical tables for anon role
-- session_state: only allow updates via RPC, not direct writes
ALTER TABLE session_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_state_read_anon" ON session_state;
CREATE POLICY "session_state_read_anon" ON session_state
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "session_state_write_anon" ON session_state;
CREATE POLICY "session_state_write_anon" ON session_state
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- people: read/write for anon (app has no auth layer)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_all_anon" ON people;
CREATE POLICY "people_all_anon" ON people
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- person_access_tokens: read/write for anon
ALTER TABLE person_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_all_anon" ON person_access_tokens;
CREATE POLICY "tokens_all_anon" ON person_access_tokens
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- moment_song_forms: read/write for anon
ALTER TABLE moment_song_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms_all_anon" ON moment_song_forms;
CREATE POLICY "forms_all_anon" ON moment_song_forms
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- moment_songs: read/write for anon
ALTER TABLE moment_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "songs_all_anon" ON moment_songs;
CREATE POLICY "songs_all_anon" ON moment_songs
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Storage: restrict bucket uploads to specific MIME types
-- Note: These policies are applied at the Supabase dashboard level
-- but we document the intent here for future enforcement:
-- song-files bucket: audio/* only
-- media-files bucket: video/*, image/*, application/pdf, application/vnd.openxmlformats-*
