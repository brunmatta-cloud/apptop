-- =============================================================================
-- 7Flow Platform Foundation
-- Migration: 20260315100000_7flow_platform_foundation.sql
--
-- Creates all new tables for the media platform evolution.
-- Does NOT alter any existing tables (session_state, session_events,
-- culto_sync_state, moment_song_forms, moment_songs, people,
-- person_access_tokens) to preserve runtime compatibility.
--
-- Tables created:
--   sessions, moments, songs, media_items, moment_media,
--   media_sync_jobs, display_outputs, display_state, player_state,
--   player_commands, bases, executors, executor_media_inventory
--
-- Also creates:
--   - Enum types for status/type fields
--   - Storage buckets for media
--   - Indexes for operational queries
--   - RLS policies for multi-tenant security
-- =============================================================================

-- -------------------------------------------------------
-- 1. ENUM TYPES
-- -------------------------------------------------------

-- Session lifecycle
CREATE TYPE session_status AS ENUM (
  'draft',
  'planned',
  'live',
  'paused',
  'finished',
  'archived'
);

-- Moment type classification
CREATE TYPE moment_type AS ENUM (
  'musica_ao_vivo',
  'playback',
  'video',
  'vinheta',
  'oracao',
  'fala',
  'aviso',
  'leitura',
  'ceia',
  'ofertorio',
  'batismo',
  'outro',
  'nenhum'
);

-- Media types
CREATE TYPE media_type AS ENUM (
  'audio',
  'video',
  'slides',
  'image'
);

-- Upload/sync status
CREATE TYPE upload_status AS ENUM (
  'pending',
  'uploading',
  'uploaded',
  'failed'
);

-- Media availability (for library display)
CREATE TYPE availability_status AS ENUM (
  'metadata_only',
  'remote',
  'syncing',
  'synced_local',
  'failed'
);

-- Sync job status
CREATE TYPE sync_job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- Sync job type
CREATE TYPE sync_job_type AS ENUM (
  'download_to_local',
  'upload_to_storage',
  'delete_local',
  'verify_integrity'
);

-- Player types
CREATE TYPE player_type AS ENUM (
  'audio',
  'video',
  'slides'
);

-- Player status
CREATE TYPE player_status AS ENUM (
  'idle',
  'loading',
  'playing',
  'paused',
  'stopped',
  'error'
);

-- Command target
CREATE TYPE command_target AS ENUM (
  'session',
  'audio',
  'video',
  'slides',
  'display',
  'moderator'
);

-- Command processing status
CREATE TYPE command_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected',
  'expired'
);

-- Display types
CREATE TYPE display_type AS ENUM (
  'main',
  'stage',
  'audio',
  'moderator',
  'custom'
);

-- Display modes
CREATE TYPE display_mode AS ENUM (
  'idle',
  'logo',
  'message',
  'video',
  'slides',
  'timeline',
  'countdown',
  'blackout',
  'custom'
);

-- Base type
CREATE TYPE base_type AS ENUM (
  'primary',
  'secondary',
  'backup',
  'remote'
);

-- Executor sync status
CREATE TYPE executor_sync_status AS ENUM (
  'not_synced',
  'syncing',
  'synced',
  'outdated',
  'error'
);

-- Session event types (extending existing events)
CREATE TYPE session_event_type AS ENUM (
  -- Session lifecycle
  'SESSION_CREATED',
  'SESSION_STARTED',
  'SESSION_PAUSED',
  'SESSION_RESUMED',
  'SESSION_FINISHED',
  -- Moment transitions
  'MOMENT_ADVANCED',
  'MOMENT_SKIPPED',
  'MOMENT_GOTO',
  -- Audio commands
  'AUDIO_PLAY',
  'AUDIO_PAUSE',
  'AUDIO_STOP',
  'AUDIO_NEXT',
  'AUDIO_PREV',
  'AUDIO_QUEUE',
  -- Video commands
  'VIDEO_LOAD',
  'VIDEO_PLAY',
  'VIDEO_PAUSE',
  'VIDEO_STOP',
  -- Slides commands
  'SLIDES_LOAD',
  'SLIDE_NEXT',
  'SLIDE_PREV',
  'SLIDE_GOTO',
  -- Display commands
  'DISPLAY_MODE_SET',
  'DISPLAY_BLACKOUT',
  -- Moderator commands
  'MODERATOR_RELEASE',
  'MODERATOR_ACK',
  'MODERATOR_CALL_STATUS',
  -- Media events
  'SONG_UPLOADED',
  'MEDIA_SYNCED',
  'MEDIA_SYNC_FAILED',
  -- Executor events
  'EXECUTOR_REGISTERED',
  'EXECUTOR_HEARTBEAT',
  'EXECUTOR_OFFLINE',
  -- Base events
  'BASE_ACTIVATED',
  'BASE_DEACTIVATED',
  -- System events
  'REVISION_CONFLICT',
  'RECONCILIATION',
  'CONNECTION_FALLBACK'
);

-- User roles
CREATE TYPE user_role AS ENUM (
  'admin',
  'gestao',
  'cerimonialista',
  'sonoplastia',
  'moderador',
  'equipe_musica',
  'visualizador'
);

-- -------------------------------------------------------
-- 2. SESSIONS TABLE
-- Represents a worship service / event session.
-- This is separate from session_state which holds the
-- live runtime JSONB state for sync purposes.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  title TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status session_status NOT NULL DEFAULT 'draft',
  auto_mode BOOLEAN NOT NULL DEFAULT false,
  current_moment_id UUID,  -- FK added after moments table
  revision BIGINT NOT NULL DEFAULT 0,
  active_base_id UUID,     -- FK added after bases table
  sync_session_id TEXT,    -- Links to session_state.session_id for runtime
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_sessions_date ON sessions(date DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_org_date ON sessions(organization_id, date DESC);

-- -------------------------------------------------------
-- 3. MOMENTS TABLE
-- Normalized moments for a session.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type moment_type NOT NULL DEFAULT 'nenhum',
  sort_order INTEGER NOT NULL DEFAULT 0,
  planned_start TIME,
  planned_duration_seconds INTEGER NOT NULL DEFAULT 0,
  requires_manual_confirmation BOOLEAN NOT NULL DEFAULT false,
  auto_advance BOOLEAN NOT NULL DEFAULT false,
  trigger_media BOOLEAN NOT NULL DEFAULT false,
  trigger_alert BOOLEAN NOT NULL DEFAULT false,
  responsible TEXT,
  ministry TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_moments_session ON moments(session_id);
CREATE INDEX idx_moments_session_order ON moments(session_id, sort_order);
CREATE INDEX idx_moments_type ON moments(type);

-- Now add FK for sessions.current_moment_id
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_current_moment
  FOREIGN KEY (current_moment_id) REFERENCES moments(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- 4. SONGS TABLE
-- Central song library, independent of moments.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  title TEXT NOT NULL,
  artist TEXT,
  duration_seconds INTEGER,
  storage_bucket TEXT,
  storage_path TEXT,
  local_file_path TEXT,
  youtube_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  upload_status upload_status NOT NULL DEFAULT 'pending',
  usage_count INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_songs_org ON songs(organization_id);
CREATE INDEX idx_songs_title ON songs USING gin(to_tsvector('portuguese', title));
CREATE INDEX idx_songs_artist ON songs USING gin(to_tsvector('portuguese', coalesce(artist, '')));
CREATE INDEX idx_songs_tags ON songs USING gin(tags);
CREATE INDEX idx_songs_upload_status ON songs(upload_status);
CREATE INDEX idx_songs_usage ON songs(organization_id, usage_count DESC);
CREATE INDEX idx_songs_search ON songs(organization_id, title, artist);

-- -------------------------------------------------------
-- 5. MOMENT_SONGS (junction) — enhanced
-- Links songs from library to moments.
-- Note: The existing moment_songs table stores inline data.
-- This new junction uses FK to songs table.
-- We create it as moment_songs_v2 to avoid conflict.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS moment_songs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(moment_id, song_id)
);

CREATE INDEX idx_moment_songs_v2_moment ON moment_songs_v2(moment_id);
CREATE INDEX idx_moment_songs_v2_song ON moment_songs_v2(song_id);
CREATE INDEX idx_moment_songs_v2_order ON moment_songs_v2(moment_id, sort_order);

-- -------------------------------------------------------
-- 6. MEDIA_ITEMS TABLE
-- Generic media library (videos, slides, images).
-- Songs have their own table for specialized fields.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  title TEXT NOT NULL,
  type media_type NOT NULL,
  artist TEXT,
  duration_seconds INTEGER,
  storage_bucket TEXT,
  storage_path TEXT,
  local_file_path TEXT,
  remote_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  availability_status availability_status NOT NULL DEFAULT 'metadata_only',
  file_size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_items_org ON media_items(organization_id);
CREATE INDEX idx_media_items_type ON media_items(organization_id, type);
CREATE INDEX idx_media_items_title ON media_items USING gin(to_tsvector('portuguese', title));
CREATE INDEX idx_media_items_artist ON media_items USING gin(to_tsvector('portuguese', coalesce(artist, '')));
CREATE INDEX idx_media_items_tags ON media_items USING gin(tags);
CREATE INDEX idx_media_items_usage ON media_items(organization_id, usage_count DESC);
CREATE INDEX idx_media_items_availability ON media_items(availability_status);

-- -------------------------------------------------------
-- 7. MOMENT_MEDIA (junction)
-- Links media items to moments.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS moment_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  autoplay BOOLEAN NOT NULL DEFAULT false,
  auto_advance BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(moment_id, media_item_id)
);

CREATE INDEX idx_moment_media_moment ON moment_media(moment_id);
CREATE INDEX idx_moment_media_item ON moment_media(media_item_id);

-- -------------------------------------------------------
-- 8. MEDIA_SYNC_JOBS TABLE
-- Queue for syncing media to local executors.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS media_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  media_type media_type NOT NULL,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  media_item_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  job_type sync_job_type NOT NULL DEFAULT 'download_to_local',
  status sync_job_status NOT NULL DEFAULT 'pending',
  payload_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  CONSTRAINT chk_media_ref CHECK (
    song_id IS NOT NULL OR media_item_id IS NOT NULL
  )
);

CREATE INDEX idx_sync_jobs_status ON media_sync_jobs(status);
CREATE INDEX idx_sync_jobs_pending ON media_sync_jobs(status, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_sync_jobs_org ON media_sync_jobs(organization_id);
CREATE INDEX idx_sync_jobs_song ON media_sync_jobs(song_id) WHERE song_id IS NOT NULL;
CREATE INDEX idx_sync_jobs_media ON media_sync_jobs(media_item_id) WHERE media_item_id IS NOT NULL;

-- -------------------------------------------------------
-- 9. DISPLAY_OUTPUTS TABLE
-- Registered display screens for a session.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS display_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_type display_type NOT NULL DEFAULT 'main',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_display_outputs_session ON display_outputs(session_id);
CREATE INDEX idx_display_outputs_active ON display_outputs(session_id, is_active)
  WHERE is_active = true;

-- -------------------------------------------------------
-- 10. DISPLAY_STATE TABLE
-- Current state of each display output.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS display_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_output_id UUID NOT NULL REFERENCES display_outputs(id) ON DELETE CASCADE,
  mode display_mode NOT NULL DEFAULT 'idle',
  current_media_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  current_slide_index INTEGER DEFAULT 0,
  current_moment_id UUID REFERENCES moments(id) ON DELETE SET NULL,
  current_cue JSONB DEFAULT '{}',
  custom_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT 'system',
  UNIQUE(display_output_id)
);

CREATE INDEX idx_display_state_output ON display_state(display_output_id);

-- -------------------------------------------------------
-- 11. PLAYER_STATE TABLE
-- Current state of each player type in a session.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_type player_type NOT NULL,
  current_media_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  status player_status NOT NULL DEFAULT 'idle',
  current_time_seconds NUMERIC(10, 3) NOT NULL DEFAULT 0,
  duration_seconds NUMERIC(10, 3) NOT NULL DEFAULT 0,
  volume NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  queue_json JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT 'system',
  UNIQUE(session_id, player_type)
);

CREATE INDEX idx_player_state_session ON player_state(session_id);

-- -------------------------------------------------------
-- 12. PLAYER_COMMANDS TABLE
-- Command queue for controlling players.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS player_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  target command_target NOT NULL,
  command_type TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}',
  expected_revision BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'system',
  processed_at TIMESTAMPTZ,
  processed_by TEXT,
  status command_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  idempotency_key TEXT
);

CREATE INDEX idx_player_commands_session ON player_commands(session_id);
CREATE INDEX idx_player_commands_pending ON player_commands(session_id, status, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_player_commands_target ON player_commands(session_id, target);
CREATE INDEX idx_player_commands_idempotency ON player_commands(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- -------------------------------------------------------
-- 13. BASES TABLE
-- Physical or virtual execution bases.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name TEXT NOT NULL,
  description TEXT,
  base_type base_type NOT NULL DEFAULT 'primary',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_primary_candidate BOOLEAN NOT NULL DEFAULT false,
  default_media_root TEXT DEFAULT 'C:\7flow-media',
  supports_audio BOOLEAN NOT NULL DEFAULT true,
  supports_video BOOLEAN NOT NULL DEFAULT true,
  supports_slides BOOLEAN NOT NULL DEFAULT true,
  supports_displays BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bases_org ON bases(organization_id);
CREATE INDEX idx_bases_enabled ON bases(organization_id, is_enabled)
  WHERE is_enabled = true;

-- Add FK for sessions.active_base_id
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_active_base
  FOREIGN KEY (active_base_id) REFERENCES bases(id) ON DELETE SET NULL;

-- -------------------------------------------------------
-- 14. EXECUTORS TABLE
-- Machines running the 7Flow executor agent.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS executors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  base_id UUID NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL,
  device_label TEXT,
  executor_version TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  base_path TEXT DEFAULT 'C:\7flow-media',
  supports_audio BOOLEAN NOT NULL DEFAULT true,
  supports_video BOOLEAN NOT NULL DEFAULT true,
  supports_slides BOOLEAN NOT NULL DEFAULT true,
  supports_displays BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_executors_org ON executors(organization_id);
CREATE INDEX idx_executors_base ON executors(base_id);
CREATE INDEX idx_executors_online ON executors(is_online)
  WHERE is_online = true;

-- -------------------------------------------------------
-- 15. EXECUTOR_MEDIA_INVENTORY TABLE
-- Tracks which media files are available locally.
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS executor_media_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executor_id UUID NOT NULL REFERENCES executors(id) ON DELETE CASCADE,
  media_item_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  local_file_path TEXT NOT NULL,
  sync_status executor_sync_status NOT NULL DEFAULT 'not_synced',
  file_size_bytes BIGINT,
  checksum TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_inventory_media_ref CHECK (
    media_item_id IS NOT NULL OR song_id IS NOT NULL
  )
);

CREATE INDEX idx_inventory_executor ON executor_media_inventory(executor_id);
CREATE INDEX idx_inventory_media ON executor_media_inventory(media_item_id)
  WHERE media_item_id IS NOT NULL;
CREATE INDEX idx_inventory_song ON executor_media_inventory(song_id)
  WHERE song_id IS NOT NULL;
CREATE INDEX idx_inventory_status ON executor_media_inventory(executor_id, sync_status);

-- -------------------------------------------------------
-- 16. PLATFORM SESSION_EVENTS (enhanced)
-- Extended event log for the new platform capabilities.
-- This extends the existing session_events with new columns.
-- -------------------------------------------------------

-- Add new columns to existing session_events if they exist
DO $$
BEGIN
  -- Add revision_before if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_events' AND column_name = 'revision_before'
  ) THEN
    ALTER TABLE session_events ADD COLUMN revision_before BIGINT;
  END IF;

  -- Add revision_after if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_events' AND column_name = 'revision_after'
  ) THEN
    ALTER TABLE session_events ADD COLUMN revision_after BIGINT;
  END IF;

  -- Add event_category for filtering
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_events' AND column_name = 'event_category'
  ) THEN
    ALTER TABLE session_events ADD COLUMN event_category TEXT;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 17. STORAGE BUCKETS
-- -------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('media-audio', 'media-audio', false, 52428800, -- 50MB
   ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/m4a', 'audio/webm']),
  ('media-video', 'media-video', false, 524288000, -- 500MB
   ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/mpeg', 'video/quicktime']),
  ('media-slides', 'media-slides', false, 104857600, -- 100MB
   ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'image/svg+xml']),
  ('media-images', 'media-images', false, 20971520, -- 20MB
   ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 18. STORAGE POLICIES
-- Isolated by organization_id path convention:
--   org_<organization_id>/songs/filename.mp3
-- -------------------------------------------------------

-- Audio bucket policies
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-audio');

CREATE POLICY "Authenticated users can read audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media-audio');

CREATE POLICY "Authenticated users can update audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-audio');

CREATE POLICY "Authenticated users can delete audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-audio');

-- Video bucket policies
CREATE POLICY "Authenticated users can upload video"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-video');

CREATE POLICY "Authenticated users can read video"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media-video');

CREATE POLICY "Authenticated users can update video"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-video');

CREATE POLICY "Authenticated users can delete video"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-video');

-- Slides bucket policies
CREATE POLICY "Authenticated users can upload slides"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-slides');

CREATE POLICY "Authenticated users can read slides"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media-slides');

CREATE POLICY "Authenticated users can update slides"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-slides');

CREATE POLICY "Authenticated users can delete slides"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-slides');

-- Images bucket policies
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-images');

CREATE POLICY "Authenticated users can read images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media-images');

CREATE POLICY "Authenticated users can update images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-images');

CREATE POLICY "Authenticated users can delete images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-images');

-- -------------------------------------------------------
-- 19. RLS POLICIES ON NEW TABLES
-- -------------------------------------------------------

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_songs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_media_inventory ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users full access.
-- Organization-based filtering will be enforced via application logic
-- and refined RLS policies in a future migration when auth is integrated.

CREATE POLICY "sessions_all" ON sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sessions_anon_read" ON sessions FOR SELECT TO anon USING (true);

CREATE POLICY "moments_all" ON moments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "moments_anon_read" ON moments FOR SELECT TO anon USING (true);

CREATE POLICY "songs_all" ON songs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "songs_anon_read" ON songs FOR SELECT TO anon USING (true);

CREATE POLICY "moment_songs_v2_all" ON moment_songs_v2 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "moment_songs_v2_anon_read" ON moment_songs_v2 FOR SELECT TO anon USING (true);

CREATE POLICY "media_items_all" ON media_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "media_items_anon_read" ON media_items FOR SELECT TO anon USING (true);

CREATE POLICY "moment_media_all" ON moment_media FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "moment_media_anon_read" ON moment_media FOR SELECT TO anon USING (true);

CREATE POLICY "media_sync_jobs_all" ON media_sync_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "display_outputs_all" ON display_outputs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "display_outputs_anon_read" ON display_outputs FOR SELECT TO anon USING (true);

CREATE POLICY "display_state_all" ON display_state FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "display_state_anon_read" ON display_state FOR SELECT TO anon USING (true);

CREATE POLICY "player_state_all" ON player_state FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "player_state_anon_read" ON player_state FOR SELECT TO anon USING (true);

CREATE POLICY "player_commands_all" ON player_commands FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bases_all" ON bases FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bases_anon_read" ON bases FOR SELECT TO anon USING (true);

CREATE POLICY "executors_all" ON executors FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "inventory_all" ON executor_media_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- 20. REALTIME ENABLEMENT
-- Enable realtime for operational tables.
-- -------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE player_state;
ALTER PUBLICATION supabase_realtime ADD TABLE player_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE display_state;
ALTER PUBLICATION supabase_realtime ADD TABLE songs;
ALTER PUBLICATION supabase_realtime ADD TABLE media_sync_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE executors;

-- -------------------------------------------------------
-- 21. HELPER RPC: Process Player Command
-- Validates revision, processes command, logs event.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION process_player_command(
  p_command_id UUID,
  p_session_id UUID,
  p_processor TEXT DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cmd RECORD;
  v_session RECORD;
  v_result JSONB;
BEGIN
  -- Fetch and lock command
  SELECT * INTO v_cmd
  FROM player_commands
  WHERE id = p_command_id AND session_id = p_session_id
  FOR UPDATE SKIP LOCKED;

  IF v_cmd IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Command not found or already locked');
  END IF;

  IF v_cmd.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Command already processed');
  END IF;

  -- Check idempotency
  IF v_cmd.idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM player_commands
      WHERE idempotency_key = v_cmd.idempotency_key
        AND id != p_command_id
        AND status = 'completed'
    ) THEN
      UPDATE player_commands
      SET status = 'rejected', error_message = 'Duplicate (idempotency)', processed_at = now()
      WHERE id = p_command_id;
      RETURN jsonb_build_object('ok', false, 'error', 'Duplicate command');
    END IF;
  END IF;

  -- Validate revision if expected
  IF v_cmd.expected_revision IS NOT NULL THEN
    SELECT revision INTO v_session FROM sessions WHERE id = p_session_id;
    IF v_session.revision != v_cmd.expected_revision THEN
      UPDATE player_commands
      SET status = 'rejected',
          error_message = format('Revision conflict: expected %s, got %s', v_cmd.expected_revision, v_session.revision),
          processed_at = now(),
          processed_by = p_processor
      WHERE id = p_command_id;

      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Revision conflict',
        'expected', v_cmd.expected_revision,
        'actual', v_session.revision
      );
    END IF;
  END IF;

  -- Mark as completed
  UPDATE player_commands
  SET status = 'completed',
      processed_at = now(),
      processed_by = p_processor
  WHERE id = p_command_id;

  -- Increment session revision
  UPDATE sessions
  SET revision = revision + 1, updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'command_id', p_command_id);
END;
$$;

-- -------------------------------------------------------
-- 22. HELPER RPC: Executor Heartbeat
-- Updates executor last_seen_at and is_online status.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION executor_heartbeat(
  p_executor_id UUID,
  p_machine_name TEXT DEFAULT NULL,
  p_executor_version TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE executors
  SET
    is_online = true,
    last_seen_at = now(),
    machine_name = COALESCE(p_machine_name, machine_name),
    executor_version = COALESCE(p_executor_version, executor_version),
    updated_at = now()
  WHERE id = p_executor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Executor not found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'last_seen_at', now());
END;
$$;

-- -------------------------------------------------------
-- 23. HELPER RPC: Claim Sync Job
-- Atomically claims a pending sync job for an executor.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION claim_sync_job(
  p_organization_id UUID,
  p_processor TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT * INTO v_job
  FROM media_sync_jobs
  WHERE organization_id = p_organization_id
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No pending jobs');
  END IF;

  UPDATE media_sync_jobs
  SET status = 'processing',
      processed_by = p_processor,
      processed_at = now()
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'ok', true,
    'job_id', v_job.id,
    'job_type', v_job.job_type,
    'media_type', v_job.media_type,
    'song_id', v_job.song_id,
    'media_item_id', v_job.media_item_id,
    'payload', v_job.payload_json
  );
END;
$$;

-- -------------------------------------------------------
-- 24. HELPER RPC: Complete Sync Job
-- Marks a sync job as completed or failed.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION complete_sync_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_processor TEXT DEFAULT 'executor'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_success THEN
    UPDATE media_sync_jobs
    SET status = 'completed',
        processed_at = now(),
        processed_by = p_processor,
        error_message = NULL
    WHERE id = p_job_id;
  ELSE
    UPDATE media_sync_jobs
    SET status = CASE
          WHEN retry_count + 1 >= max_retries THEN 'failed'::sync_job_status
          ELSE 'pending'::sync_job_status
        END,
        retry_count = retry_count + 1,
        error_message = p_error_message,
        processed_at = now(),
        processed_by = p_processor
    WHERE id = p_job_id;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Job not found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- -------------------------------------------------------
-- 25. TRIGGER: Auto-update updated_at
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON moments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON moment_songs_v2
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON media_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bases
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON executors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON executor_media_inventory
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
