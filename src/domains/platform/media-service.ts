// =============================================================================
// 7Flow Media Service
// CRUD and operational queries for songs, media items, and sync jobs.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Song, MediaItem, MediaSyncJob, MediaType,
  UploadStatus, AvailabilityStatus, SyncJobStatus,
} from './types';
import { logger } from '@/lib/logger';

const log = logger.scoped('Media');

const DEFAULT_ORG = '00000000-0000-0000-0000-000000000000';

// -------------------------------------------------------
// SONGS CRUD
// -------------------------------------------------------

export async function listSongs(
  organization_id = DEFAULT_ORG,
  options?: { search?: string; tags?: string[]; limit?: number; offset?: number; orderBy?: 'title' | 'usage_count' | 'created_at' }
): Promise<{ data: Song[]; count: number }> {
  let query = supabase
    .from('songs')
    .select('*', { count: 'exact' })
    .eq('organization_id', organization_id);

  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(`title.ilike.${term},artist.ilike.${term}`);
  }

  if (options?.tags?.length) {
    query = query.overlaps('tags', options.tags);
  }

  const orderCol = options?.orderBy ?? 'created_at';
  query = query.order(orderCol, { ascending: orderCol === 'title' });

  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) {
    log.error(`listSongs error`, error);
    return { data: [], count: 0 };
  }
  return { data: (data ?? []) as Song[], count: count ?? 0 };
}

export async function getSong(id: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Song;
}

export async function createSong(song: Partial<Song>): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      organization_id: song.organization_id ?? DEFAULT_ORG,
      title: song.title ?? '',
      artist: song.artist ?? null,
      duration_seconds: song.duration_seconds ?? null,
      storage_bucket: song.storage_bucket ?? null,
      storage_path: song.storage_path ?? null,
      youtube_url: song.youtube_url ?? null,
      tags: song.tags ?? [],
      notes: song.notes ?? null,
      upload_status: song.upload_status ?? 'pending',
      uploaded_by: song.uploaded_by ?? null,
    })
    .select()
    .single();

  if (error) {
    log.error(`createSong error`, error);
    throw new Error(`Falha ao cadastrar música: ${error.message}`);
  }
  return data as Song;
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error(`updateSong error`, error);
    throw new Error(`Falha ao atualizar música: ${error.message}`);
  }
  return data as Song;
}

export async function deleteSong(id: string): Promise<boolean> {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) {
    log.error(`deleteSong error`, error);
    throw new Error(`Falha ao excluir música: ${error.message}`);
  }
  return true;
}

export async function incrementSongUsage(id: string): Promise<void> {
  // Atomic increment via RPC; falls back to direct update if RPC not available
  const { error: rpcError } = await supabase.rpc('increment_song_usage', { song_uuid: id });
  if (rpcError) {
    // Fallback: direct increment (less safe but functional)
    const { data: song } = await supabase
      .from('songs')
      .select('usage_count')
      .eq('id', id)
      .single();
    if (song) {
      await supabase
        .from('songs')
        .update({ usage_count: (song.usage_count ?? 0) + 1 })
        .eq('id', id);
    }
  }
}

// -------------------------------------------------------
// MEDIA ITEMS CRUD
// -------------------------------------------------------

export async function listMediaItems(
  organization_id = DEFAULT_ORG,
  options?: { type?: MediaType; search?: string; tags?: string[]; limit?: number; offset?: number; orderBy?: 'title' | 'usage_count' | 'created_at' }
): Promise<{ data: MediaItem[]; count: number }> {
  let query = supabase
    .from('media_items')
    .select('*', { count: 'exact' })
    .eq('organization_id', organization_id);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  if (options?.search) {
    const term = `%${options.search}%`;
    query = query.or(`title.ilike.${term},artist.ilike.${term}`);
  }

  if (options?.tags?.length) {
    query = query.overlaps('tags', options.tags);
  }

  const orderCol = options?.orderBy ?? 'created_at';
  query = query.order(orderCol, { ascending: orderCol === 'title' });

  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);

  const { data, error, count } = await query;
  if (error) {
    log.error(`listMediaItems error`, error);
    return { data: [], count: 0 };
  }
  return { data: (data ?? []) as MediaItem[], count: count ?? 0 };
}

export async function createMediaItem(item: Partial<MediaItem>): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media_items')
    .insert({
      organization_id: item.organization_id ?? DEFAULT_ORG,
      title: item.title ?? '',
      type: item.type ?? 'audio',
      artist: item.artist ?? null,
      duration_seconds: item.duration_seconds ?? null,
      storage_bucket: item.storage_bucket ?? null,
      storage_path: item.storage_path ?? null,
      remote_url: item.remote_url ?? null,
      tags: item.tags ?? [],
      notes: item.notes ?? null,
      availability_status: item.availability_status ?? 'metadata_only',
      file_size_bytes: item.file_size_bytes ?? null,
      mime_type: item.mime_type ?? null,
    })
    .select()
    .single();

  if (error) {
    log.error(`createMediaItem error`, error);
    throw new Error(`Falha ao registrar mídia: ${error.message}`);
  }
  return data as MediaItem;
}

export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<MediaItem> {
  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error(`updateMediaItem error`, error);
    throw new Error(`Falha ao atualizar mídia: ${error.message}`);
  }
  return data as MediaItem;
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('media_items').delete().eq('id', id);
  if (error) {
    log.error(`deleteMediaItem error`, error);
    throw new Error(`Falha ao excluir mídia: ${error.message}`);
  }
  return true;
}

// -------------------------------------------------------
// UPLOAD FLOW (Forma A)
// 1. Upload file to storage
// 2. Create song record
// 3. Create sync job
// -------------------------------------------------------

export interface UploadSongInput {
  title: string;
  artist?: string;
  duration_seconds?: number;
  youtube_url?: string;
  tags?: string[];
  notes?: string;
  file: File;
  organization_id?: string;
}

export interface UploadSongResult {
  ok: boolean;
  song?: Song;
  job?: MediaSyncJob;
  error?: string;
  step?: string;
}

export async function uploadSong(
  input: UploadSongInput,
  onProgress?: (step: string, percent: number) => void
): Promise<UploadSongResult> {
  const orgId = input.organization_id ?? DEFAULT_ORG;
  const bucket = 'media-audio';

  // Sanitize filename
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `org_${orgId}/songs/${Date.now()}_${safeName}`;

  try {
    // Step 1: Upload file to storage
    onProgress?.('uploading', 10);
    console.log(`Uploading ${safeName} to ${bucket}/${storagePath}`);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, input.file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      log.error(`Upload failed`, uploadError);
      return { ok: false, error: uploadError.message, step: 'uploading' };
    }

    onProgress?.('registering', 50);

    // Step 2: Create song record
    const song = await createSong({
      organization_id: orgId,
      title: input.title,
      artist: input.artist,
      duration_seconds: input.duration_seconds,
      storage_bucket: bucket,
      storage_path: storagePath,
      youtube_url: input.youtube_url,
      tags: input.tags,
      notes: input.notes,
      upload_status: 'uploaded' as UploadStatus,
      uploaded_by: 'web',
    });

    onProgress?.('creating_job', 70);

    // Step 3: Create sync job for executor
    const { data: jobData, error: jobError } = await supabase
      .from('media_sync_jobs')
      .insert({
        organization_id: orgId,
        media_type: 'audio' as MediaType,
        song_id: song.id,
        job_type: 'download_to_local',
        status: 'pending' as SyncJobStatus,
        payload_json: {
          storage_bucket: bucket,
          storage_path: storagePath,
          file_name: safeName,
          file_size: input.file.size,
        },
      })
      .select()
      .single();

    if (jobError) {
      log.warn(`Sync job creation failed (song still registered)`, jobError);
    }

    onProgress?.('available', 100);

    console.log(`Upload complete: ${song.title} (${song.id})`);

    return {
      ok: true,
      song,
      job: jobData as MediaSyncJob | undefined,
    };
  } catch (err) {
    log.error(`Upload unexpected error`, err);
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error', step: 'uploading' };
  }
}

// -------------------------------------------------------
// UPLOAD MEDIA ITEM (generic: video, slides, images)
// -------------------------------------------------------

export interface UploadMediaInput {
  title: string;
  type: MediaType;
  artist?: string;
  duration_seconds?: number;
  tags?: string[];
  notes?: string;
  file: File;
  organization_id?: string;
}

export async function uploadMediaItem(
  input: UploadMediaInput,
  onProgress?: (step: string, percent: number) => void
): Promise<{ ok: boolean; item?: MediaItem; error?: string }> {
  const orgId = input.organization_id ?? DEFAULT_ORG;

  const bucketMap: Record<MediaType, string> = {
    audio: 'media-audio',
    video: 'media-video',
    slides: 'media-slides',
    image: 'media-images',
  };

  const pathMap: Record<MediaType, string> = {
    audio: 'songs',
    video: 'videos',
    slides: 'slides',
    image: 'images',
  };

  const bucket = bucketMap[input.type];
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `org_${orgId}/${pathMap[input.type]}/${Date.now()}_${safeName}`;

  try {
    onProgress?.('uploading', 10);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, input.file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      return { ok: false, error: uploadError.message };
    }

    onProgress?.('registering', 60);

    const item = await createMediaItem({
      organization_id: orgId,
      title: input.title,
      type: input.type,
      artist: input.artist,
      duration_seconds: input.duration_seconds,
      storage_bucket: bucket,
      storage_path: storagePath,
      tags: input.tags,
      notes: input.notes,
      availability_status: 'remote' as AvailabilityStatus,
      file_size_bytes: input.file.size,
      mime_type: input.file.type,
    });

    // Create sync job
    onProgress?.('creating_job', 80);

    await supabase.from('media_sync_jobs').insert({
      organization_id: orgId,
      media_type: input.type,
      media_item_id: item.id,
      job_type: 'download_to_local',
      status: 'pending',
      payload_json: {
        storage_bucket: bucket,
        storage_path: storagePath,
        file_name: safeName,
        file_size: input.file.size,
      },
    });

    onProgress?.('available', 100);

    return { ok: true, item };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// -------------------------------------------------------
// MEDIA SYNC JOBS
// -------------------------------------------------------

export async function listPendingJobs(organization_id = DEFAULT_ORG): Promise<MediaSyncJob[]> {
  const { data, error } = await supabase
    .from('media_sync_jobs')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as MediaSyncJob[];
}

// -------------------------------------------------------
// STORAGE URL HELPERS
// -------------------------------------------------------

export function getStorageUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
