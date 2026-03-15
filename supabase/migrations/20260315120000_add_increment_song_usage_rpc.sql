-- =============================================================================
-- Atomic song usage increment RPC
-- Prevents race conditions in concurrent usage counting.
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_song_usage(song_uuid UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE songs
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = song_uuid;
$$;

-- Grant access to anon role (app uses anon key)
GRANT EXECUTE ON FUNCTION increment_song_usage(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_song_usage(UUID) TO authenticated;
