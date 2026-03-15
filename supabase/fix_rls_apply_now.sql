-- =============================================================================
-- SCRIPT PARA APLICAR NO SQL EDITOR DO SUPABASE
-- 
-- Este script é IDEMPOTENTE — pode ser executado múltiplas vezes sem erro.
-- Ele garante que o role "anon" tenha permissão de escrita em todas as
-- tabelas e buckets de storage necessários para o app funcionar sem login.
--
-- COMO USAR:
-- 1. Abra o Supabase Dashboard → SQL Editor
-- 2. Cole todo este script
-- 3. Clique em "Run"
-- 4. Verifique que não houve erros
-- =============================================================================

-- -------------------------------------------------------
-- PARTE 1: Garantir que RLS está habilitado
-- -------------------------------------------------------
ALTER TABLE IF EXISTS sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moment_songs_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS moment_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS media_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS display_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS display_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS player_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS executor_media_inventory ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- PARTE 2: Policies para ANON em todas as tabelas
-- (DROP + CREATE para idempotência)
-- -------------------------------------------------------

-- Sessions
DROP POLICY IF EXISTS "sessions_anon_write" ON sessions;
CREATE POLICY "sessions_anon_write" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);

-- Moments
DROP POLICY IF EXISTS "moments_anon_write" ON moments;
CREATE POLICY "moments_anon_write" ON moments FOR ALL TO anon USING (true) WITH CHECK (true);

-- Songs
DROP POLICY IF EXISTS "songs_anon_write" ON songs;
DROP POLICY IF EXISTS "songs_anon_update" ON songs;
DROP POLICY IF EXISTS "songs_anon_delete" ON songs;
DROP POLICY IF EXISTS "songs_anon_all" ON songs;
CREATE POLICY "songs_anon_all" ON songs FOR ALL TO anon USING (true) WITH CHECK (true);

-- Moment Songs V2
DROP POLICY IF EXISTS "moment_songs_v2_anon_write" ON moment_songs_v2;
DROP POLICY IF EXISTS "moment_songs_v2_anon_update" ON moment_songs_v2;
DROP POLICY IF EXISTS "moment_songs_v2_anon_delete" ON moment_songs_v2;
DROP POLICY IF EXISTS "moment_songs_v2_anon_all" ON moment_songs_v2;
CREATE POLICY "moment_songs_v2_anon_all" ON moment_songs_v2 FOR ALL TO anon USING (true) WITH CHECK (true);

-- Media Items
DROP POLICY IF EXISTS "media_items_anon_write" ON media_items;
DROP POLICY IF EXISTS "media_items_anon_update" ON media_items;
DROP POLICY IF EXISTS "media_items_anon_delete" ON media_items;
DROP POLICY IF EXISTS "media_items_anon_all" ON media_items;
CREATE POLICY "media_items_anon_all" ON media_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- Moment Media
DROP POLICY IF EXISTS "moment_media_anon_write" ON moment_media;
DROP POLICY IF EXISTS "moment_media_anon_update" ON moment_media;
DROP POLICY IF EXISTS "moment_media_anon_delete" ON moment_media;
DROP POLICY IF EXISTS "moment_media_anon_all" ON moment_media;
CREATE POLICY "moment_media_anon_all" ON moment_media FOR ALL TO anon USING (true) WITH CHECK (true);

-- Media Sync Jobs
DROP POLICY IF EXISTS "media_sync_jobs_anon_write" ON media_sync_jobs;
DROP POLICY IF EXISTS "media_sync_jobs_anon_update" ON media_sync_jobs;
DROP POLICY IF EXISTS "media_sync_jobs_anon_read" ON media_sync_jobs;
DROP POLICY IF EXISTS "media_sync_jobs_anon_all" ON media_sync_jobs;
CREATE POLICY "media_sync_jobs_anon_all" ON media_sync_jobs FOR ALL TO anon USING (true) WITH CHECK (true);

-- Display Outputs
DROP POLICY IF EXISTS "display_outputs_anon_write" ON display_outputs;
DROP POLICY IF EXISTS "display_outputs_anon_update" ON display_outputs;
DROP POLICY IF EXISTS "display_outputs_anon_delete" ON display_outputs;
DROP POLICY IF EXISTS "display_outputs_anon_all" ON display_outputs;
CREATE POLICY "display_outputs_anon_all" ON display_outputs FOR ALL TO anon USING (true) WITH CHECK (true);

-- Display State
DROP POLICY IF EXISTS "display_state_anon_write" ON display_state;
DROP POLICY IF EXISTS "display_state_anon_update" ON display_state;
DROP POLICY IF EXISTS "display_state_anon_all" ON display_state;
CREATE POLICY "display_state_anon_all" ON display_state FOR ALL TO anon USING (true) WITH CHECK (true);

-- Player State
DROP POLICY IF EXISTS "player_state_anon_write" ON player_state;
DROP POLICY IF EXISTS "player_state_anon_update" ON player_state;
DROP POLICY IF EXISTS "player_state_anon_all" ON player_state;
CREATE POLICY "player_state_anon_all" ON player_state FOR ALL TO anon USING (true) WITH CHECK (true);

-- Player Commands
DROP POLICY IF EXISTS "player_commands_anon_write" ON player_commands;
DROP POLICY IF EXISTS "player_commands_anon_read" ON player_commands;
DROP POLICY IF EXISTS "player_commands_anon_all" ON player_commands;
CREATE POLICY "player_commands_anon_all" ON player_commands FOR ALL TO anon USING (true) WITH CHECK (true);

-- Bases
DROP POLICY IF EXISTS "bases_anon_write" ON bases;
DROP POLICY IF EXISTS "bases_anon_update" ON bases;
DROP POLICY IF EXISTS "bases_anon_delete" ON bases;
DROP POLICY IF EXISTS "bases_anon_all" ON bases;
CREATE POLICY "bases_anon_all" ON bases FOR ALL TO anon USING (true) WITH CHECK (true);

-- Executors
DROP POLICY IF EXISTS "executors_anon_write" ON executors;
DROP POLICY IF EXISTS "executors_anon_update" ON executors;
DROP POLICY IF EXISTS "executors_anon_read" ON executors;
DROP POLICY IF EXISTS "executors_anon_all" ON executors;
CREATE POLICY "executors_anon_all" ON executors FOR ALL TO anon USING (true) WITH CHECK (true);

-- Executor Media Inventory
DROP POLICY IF EXISTS "inventory_anon_write" ON executor_media_inventory;
DROP POLICY IF EXISTS "inventory_anon_update" ON executor_media_inventory;
DROP POLICY IF EXISTS "inventory_anon_read" ON executor_media_inventory;
DROP POLICY IF EXISTS "inventory_anon_all" ON executor_media_inventory;
CREATE POLICY "inventory_anon_all" ON executor_media_inventory FOR ALL TO anon USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- PARTE 3: Garantir que os buckets de Storage existem
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES
  ('media-audio', 'media-audio', false,
   ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/flac','audio/aac','audio/mp4','audio/x-m4a','audio/webm'],
   52428800)  -- 50MB
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES
  ('media-video', 'media-video', false,
   ARRAY['video/mp4','video/webm','video/ogg','video/quicktime','video/x-msvideo','video/x-matroska'],
   524288000)  -- 500MB
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES
  ('media-slides', 'media-slides', false,
   ARRAY['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.ms-powerpoint'],
   104857600)  -- 100MB
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES
  ('media-images', 'media-images', false,
   ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'],
   20971520)  -- 20MB
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- -------------------------------------------------------
-- PARTE 4: Policies de Storage (anon acesso total)
-- -------------------------------------------------------

-- Remover policies antigas de storage para anon (se existem)
DROP POLICY IF EXISTS "Anon can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete audio" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload video" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read video" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update video" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete video" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload slides" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read slides" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update slides" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete slides" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read images" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update images" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete images" ON storage.objects;
DROP POLICY IF EXISTS "anon_storage_all" ON storage.objects;

-- Policy única para anon em todos os buckets de mídia
CREATE POLICY "anon_storage_all"
  ON storage.objects FOR ALL TO anon
  USING (bucket_id IN ('media-audio', 'media-video', 'media-slides', 'media-images'))
  WITH CHECK (bucket_id IN ('media-audio', 'media-video', 'media-slides', 'media-images'));

-- -------------------------------------------------------
-- PARTE 5: Garantir que authenticated também tem acesso
-- (caso as policies originais tenham sido perdidas)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "auth_storage_all" ON storage.objects;
CREATE POLICY "auth_storage_all"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id IN ('media-audio', 'media-video', 'media-slides', 'media-images'))
  WITH CHECK (bucket_id IN ('media-audio', 'media-video', 'media-slides', 'media-images'));

-- -------------------------------------------------------
-- VERIFICAÇÃO: Listar policies criadas
-- -------------------------------------------------------
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN (
  'bases', 'songs', 'media_items', 'media_sync_jobs',
  'executors', 'executor_media_inventory', 'display_outputs',
  'display_state', 'player_state', 'player_commands',
  'sessions', 'moments', 'moment_songs_v2', 'moment_media',
  'objects'
)
AND 'anon' = ANY(roles)
ORDER BY tablename, policyname;
