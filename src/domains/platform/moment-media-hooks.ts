// =============================================================================
// 7Flow Moment-Media Hooks
// React Query hooks for linking moments to songs/media.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMomentSongs,
  listMomentSongsBatch,
  addSongToMoment,
  removeSongFromMoment,
  reorderMomentSongs,
  listMomentMedia,
  listMomentMediaBatch,
  addMediaToMoment,
  removeMediaFromMoment,
  type MomentSongWithDetails,
  type MomentMediaWithDetails,
} from './moment-media-service';
import { toast } from '@/hooks/use-toast';

// -------------------------------------------------------
// MOMENT SONGS
// -------------------------------------------------------

export function useMomentSongs(momentId: string | null) {
  return useQuery({
    queryKey: ['moment-songs', momentId],
    queryFn: () => listMomentSongs(momentId!),
    enabled: !!momentId,
    staleTime: 30_000,
  });
}

export function useMomentSongsBatch(momentIds: string[]) {
  const stableKey = momentIds.sort().join(',');
  return useQuery({
    queryKey: ['moment-songs-batch', stableKey],
    queryFn: () => listMomentSongsBatch(momentIds),
    enabled: momentIds.length > 0,
    staleTime: 30_000,
  });
}

export function useAddSongToMoment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ momentId, songId, sortOrder }: { momentId: string; songId: string; sortOrder?: number }) =>
      addSongToMoment(momentId, songId, sortOrder),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moment-songs', variables.momentId] });
      queryClient.invalidateQueries({ queryKey: ['moment-songs-batch'] });
      toast({ title: 'Música vinculada ao momento' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao vincular música', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveSongFromMoment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ momentId, songId }: { momentId: string; songId: string }) =>
      removeSongFromMoment(momentId, songId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moment-songs', variables.momentId] });
      queryClient.invalidateQueries({ queryKey: ['moment-songs-batch'] });
      toast({ title: 'Música desvinculada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desvincular música', description: error.message, variant: 'destructive' });
    },
  });
}

export function useReorderMomentSongs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ momentId, songIds }: { momentId: string; songIds: string[] }) =>
      reorderMomentSongs(momentId, songIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moment-songs', variables.momentId] });
      queryClient.invalidateQueries({ queryKey: ['moment-songs-batch'] });
    },
  });
}

// -------------------------------------------------------
// MOMENT MEDIA
// -------------------------------------------------------

export function useMomentMedia(momentId: string | null) {
  return useQuery({
    queryKey: ['moment-media', momentId],
    queryFn: () => listMomentMedia(momentId!),
    enabled: !!momentId,
    staleTime: 30_000,
  });
}

export function useMomentMediaBatch(momentIds: string[]) {
  const stableKey = momentIds.sort().join(',');
  return useQuery({
    queryKey: ['moment-media-batch', stableKey],
    queryFn: () => listMomentMediaBatch(momentIds),
    enabled: momentIds.length > 0,
    staleTime: 30_000,
  });
}

export function useAddMediaToMoment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ momentId, mediaItemId, options }: {
      momentId: string;
      mediaItemId: string;
      options?: { autoplay?: boolean; auto_advance?: boolean; sort_order?: number };
    }) => addMediaToMoment(momentId, mediaItemId, options),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moment-media', variables.momentId] });
      queryClient.invalidateQueries({ queryKey: ['moment-media-batch'] });
      toast({ title: 'Mídia vinculada ao momento' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao vincular mídia', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveMediaFromMoment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ momentId, mediaItemId }: { momentId: string; mediaItemId: string }) =>
      removeMediaFromMoment(momentId, mediaItemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['moment-media', variables.momentId] });
      queryClient.invalidateQueries({ queryKey: ['moment-media-batch'] });
      toast({ title: 'Mídia desvinculada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desvincular mídia', description: error.message, variant: 'destructive' });
    },
  });
}

// Re-export types for convenience
export type { MomentSongWithDetails, MomentMediaWithDetails };
