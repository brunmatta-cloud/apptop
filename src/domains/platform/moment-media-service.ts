// =============================================================================
// 7Flow Moment-Media Service
// Links moments to songs and media items via junction tables.
// Bridges the legacy MomentoProgramacao IDs with platform tables.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { MomentSongV2, MomentMedia, Song, MediaItem } from './types';
import { logger } from '@/lib/logger';

const log = logger.scoped('MomentMedia');


// -------------------------------------------------------
// MOMENT SONGS (moment_songs_v2)
// -------------------------------------------------------

export interface MomentSongWithDetails extends MomentSongV2 {
  song: Song;
}

export async function listMomentSongs(momentId: string): Promise<MomentSongWithDetails[]> {
  const { data, error } = await supabase
    .from('moment_songs_v2')
    .select('*, song:songs(*)')
    .eq('moment_id', momentId)
    .order('sort_order', { ascending: true });

  if (error) {
    log.error(`listMomentSongs error`, error);
    return [];
  }
  return (data ?? []) as unknown as MomentSongWithDetails[];
}

export async function listMomentSongsBatch(momentIds: string[]): Promise<Record<string, MomentSongWithDetails[]>> {
  if (momentIds.length === 0) return {};

  const { data, error } = await supabase
    .from('moment_songs_v2')
    .select('*, song:songs(*)')
    .in('moment_id', momentIds)
    .order('sort_order', { ascending: true });

  if (error) {
    log.error(`listMomentSongsBatch error`, error);
    return {};
  }

  const result: Record<string, MomentSongWithDetails[]> = {};
  for (const row of (data ?? []) as unknown as MomentSongWithDetails[]) {
    if (!result[row.moment_id]) result[row.moment_id] = [];
    result[row.moment_id].push(row);
  }
  return result;
}

export async function addSongToMoment(momentId: string, songId: string, sortOrder?: number): Promise<MomentSongV2> {
  const order = sortOrder ?? await getNextSortOrder('moment_songs_v2', momentId);

  const { data, error } = await supabase
    .from('moment_songs_v2')
    .upsert({
      moment_id: momentId,
      song_id: songId,
      sort_order: order,
    }, { onConflict: 'moment_id,song_id' })
    .select()
    .single();

  if (error) {
    log.error(`addSongToMoment error`, error);
    throw new Error(`Falha ao vincular música ao momento: ${error.message}`);
  }
  return data as MomentSongV2;
}

export async function removeSongFromMoment(momentId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('moment_songs_v2')
    .delete()
    .eq('moment_id', momentId)
    .eq('song_id', songId);

  if (error) {
    log.error(`removeSongFromMoment error`, error);
    throw new Error(`Falha ao desvincular música: ${error.message}`);
  }
}

export async function reorderMomentSongs(momentId: string, songIds: string[]): Promise<void> {
  const updates = songIds.map((songId, index) => ({
    moment_id: momentId,
    song_id: songId,
    sort_order: index,
  }));

  for (const update of updates) {
    await supabase
      .from('moment_songs_v2')
      .update({ sort_order: update.sort_order })
      .eq('moment_id', update.moment_id)
      .eq('song_id', update.song_id);
  }
}

// -------------------------------------------------------
// MOMENT MEDIA (moment_media)
// -------------------------------------------------------

export interface MomentMediaWithDetails extends MomentMedia {
  media_item: MediaItem;
}

export async function listMomentMedia(momentId: string): Promise<MomentMediaWithDetails[]> {
  const { data, error } = await supabase
    .from('moment_media')
    .select('*, media_item:media_items(*)')
    .eq('moment_id', momentId)
    .order('sort_order', { ascending: true });

  if (error) {
    log.error(`listMomentMedia error`, error);
    return [];
  }
  return (data ?? []) as unknown as MomentMediaWithDetails[];
}

export async function listMomentMediaBatch(momentIds: string[]): Promise<Record<string, MomentMediaWithDetails[]>> {
  if (momentIds.length === 0) return {};

  const { data, error } = await supabase
    .from('moment_media')
    .select('*, media_item:media_items(*)')
    .in('moment_id', momentIds)
    .order('sort_order', { ascending: true });

  if (error) {
    log.error(`listMomentMediaBatch error`, error);
    return {};
  }

  const result: Record<string, MomentMediaWithDetails[]> = {};
  for (const row of (data ?? []) as unknown as MomentMediaWithDetails[]) {
    if (!result[row.moment_id]) result[row.moment_id] = [];
    result[row.moment_id].push(row);
  }
  return result;
}

export async function addMediaToMoment(
  momentId: string,
  mediaItemId: string,
  options?: { autoplay?: boolean; auto_advance?: boolean; sort_order?: number }
): Promise<MomentMedia> {
  const order = options?.sort_order ?? await getNextSortOrder('moment_media', momentId);

  const { data, error } = await supabase
    .from('moment_media')
    .upsert({
      moment_id: momentId,
      media_item_id: mediaItemId,
      sort_order: order,
      autoplay: options?.autoplay ?? false,
      auto_advance: options?.auto_advance ?? false,
    }, { onConflict: 'moment_id,media_item_id' })
    .select()
    .single();

  if (error) {
    log.error(`addMediaToMoment error`, error);
    throw new Error(`Falha ao vincular mídia ao momento: ${error.message}`);
  }
  return data as MomentMedia;
}

export async function removeMediaFromMoment(momentId: string, mediaItemId: string): Promise<void> {
  const { error } = await supabase
    .from('moment_media')
    .delete()
    .eq('moment_id', momentId)
    .eq('media_item_id', mediaItemId);

  if (error) {
    log.error(`removeMediaFromMoment error`, error);
    throw new Error(`Falha ao desvincular mídia: ${error.message}`);
  }
}

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

async function getNextSortOrder(table: 'moment_songs_v2' | 'moment_media', momentId: string): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('sort_order')
    .eq('moment_id', momentId)
    .order('sort_order', { ascending: false })
    .limit(1);

  return ((data?.[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;
}
