-- =============================================================================
-- Fix RLS: Allow anon role to perform write operations
-- 
-- The app currently operates without authentication (uses anon key).
-- All write policies were restricted to 'authenticated' role, causing
-- silent failures on: base creation, media uploads, updates, deletes.
-- 
-- This migration adds anon write policies to all platform tables and
-- storage buckets so the app works without login.
-- =============================================================================

-- -------------------------------------------------------
-- 1. TABLE POLICIES — Add anon write access
-- -------------------------------------------------------

-- Sessions
CREATE POLICY "sessions_anon_write" ON sessions
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Moments
CREATE POLICY "moments_anon_write" ON moments
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Songs
CREATE POLICY "songs_anon_write" ON songs
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "songs_anon_update" ON songs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "songs_anon_delete" ON songs
  FOR DELETE TO anon USING (true);

-- Moment Songs V2
CREATE POLICY "moment_songs_v2_anon_write" ON moment_songs_v2
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "moment_songs_v2_anon_update" ON moment_songs_v2
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "moment_songs_v2_anon_delete" ON moment_songs_v2
  FOR DELETE TO anon USING (true);

-- Media Items
CREATE POLICY "media_items_anon_write" ON media_items
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "media_items_anon_update" ON media_items
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "media_items_anon_delete" ON media_items
  FOR DELETE TO anon USING (true);

-- Moment Media
CREATE POLICY "moment_media_anon_write" ON moment_media
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "moment_media_anon_update" ON moment_media
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "moment_media_anon_delete" ON moment_media
  FOR DELETE TO anon USING (true);

-- Media Sync Jobs
CREATE POLICY "media_sync_jobs_anon_write" ON media_sync_jobs
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "media_sync_jobs_anon_update" ON media_sync_jobs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "media_sync_jobs_anon_read" ON media_sync_jobs
  FOR SELECT TO anon USING (true);

-- Display Outputs
CREATE POLICY "display_outputs_anon_write" ON display_outputs
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "display_outputs_anon_update" ON display_outputs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "display_outputs_anon_delete" ON display_outputs
  FOR DELETE TO anon USING (true);

-- Display State
CREATE POLICY "display_state_anon_write" ON display_state
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "display_state_anon_update" ON display_state
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Player State
CREATE POLICY "player_state_anon_write" ON player_state
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "player_state_anon_update" ON player_state
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Player Commands
CREATE POLICY "player_commands_anon_write" ON player_commands
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "player_commands_anon_read" ON player_commands
  FOR SELECT TO anon USING (true);

-- Bases
CREATE POLICY "bases_anon_write" ON bases
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "bases_anon_update" ON bases
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bases_anon_delete" ON bases
  FOR DELETE TO anon USING (true);

-- Executors
CREATE POLICY "executors_anon_write" ON executors
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "executors_anon_update" ON executors
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "executors_anon_read" ON executors
  FOR SELECT TO anon USING (true);

-- Executor Media Inventory
CREATE POLICY "inventory_anon_write" ON executor_media_inventory
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "inventory_anon_update" ON executor_media_inventory
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "inventory_anon_read" ON executor_media_inventory
  FOR SELECT TO anon USING (true);

-- -------------------------------------------------------
-- 2. STORAGE POLICIES — Add anon access to all buckets
-- -------------------------------------------------------

-- Audio bucket
CREATE POLICY "Anon can upload audio"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media-audio');
CREATE POLICY "Anon can read audio"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'media-audio');
CREATE POLICY "Anon can update audio"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'media-audio');
CREATE POLICY "Anon can delete audio"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'media-audio');

-- Video bucket
CREATE POLICY "Anon can upload video"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media-video');
CREATE POLICY "Anon can read video"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'media-video');
CREATE POLICY "Anon can update video"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'media-video');
CREATE POLICY "Anon can delete video"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'media-video');

-- Slides bucket
CREATE POLICY "Anon can upload slides"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media-slides');
CREATE POLICY "Anon can read slides"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'media-slides');
CREATE POLICY "Anon can update slides"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'media-slides');
CREATE POLICY "Anon can delete slides"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'media-slides');

-- Images bucket
CREATE POLICY "Anon can upload images"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'media-images');
CREATE POLICY "Anon can read images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'media-images');
CREATE POLICY "Anon can update images"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'media-images');
CREATE POLICY "Anon can delete images"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'media-images');
