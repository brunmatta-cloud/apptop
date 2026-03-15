// =============================================================================
// 7Flow Platform Hooks
// React hooks for media library, player state, display state, bases.
// Uses TanStack React Query for caching and realtime subscriptions.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import * as MediaService from './media-service';
import * as BaseService from './base-service';
import * as DisplayService from './display-service';
import type {
  Song, MediaItem, MediaType, Base, Executor, PlayerState,
  DisplayOutput, DisplayState, AvailabilityStatus, UploadStep,
} from './types';

// -------------------------------------------------------
// SONGS HOOKS
// -------------------------------------------------------

export function useSongs(options?: {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'title' | 'usage_count' | 'created_at';
}) {
  return useQuery({
    queryKey: ['songs', options?.search, options?.tags, options?.orderBy, options?.offset, options?.limit],
    queryFn: () => MediaService.listSongs(undefined, {
      search: options?.search,
      tags: options?.tags,
      limit: options?.limit ?? 50,
      offset: options?.offset,
      orderBy: options?.orderBy,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useSong(id: string | null) {
  return useQuery({
    queryKey: ['song', id],
    queryFn: () => MediaService.getSong(id!),
    enabled: !!id,
  });
}

export function useUploadSong() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ step: UploadStep; percent: number; message: string }>({
    step: 'idle',
    percent: 0,
    message: '',
  });

  const mutation = useMutation({
    mutationFn: async (input: MediaService.UploadSongInput) => {
      const result = await MediaService.uploadSong(input, (step, percent) => {
        const messages: Record<string, string> = {
          uploading: 'Enviando arquivo...',
          registering: 'Cadastrando música...',
          creating_job: 'Criando job de sincronização...',
          available: 'Música disponível!',
        };
        setProgress({
          step: step as UploadStep,
          percent,
          message: messages[step] ?? step,
        });
      });
      if (!result.ok) {
        setProgress({ step: 'error', percent: 0, message: result.error ?? 'Falha no upload' });
        throw new Error(result.error ?? 'Falha no upload');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
    onError: () => {
      setProgress({ step: 'error', percent: 0, message: 'Falha no upload' });
    },
  });

  const reset = useCallback(() => {
    setProgress({ step: 'idle', percent: 0, message: '' });
    mutation.reset();
  }, [mutation]);

  return { ...mutation, progress, reset };
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (song: Partial<Song>) => MediaService.createSong(song),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
    onError: (err: Error) => {
      toast({ title: 'Erro ao cadastrar música', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Song> }) =>
      MediaService.updateSong(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar música', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MediaService.deleteSong(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['songs'] }),
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir música', description: err.message, variant: 'destructive' });
    },
  });
}

// -------------------------------------------------------
// MEDIA ITEMS HOOKS
// -------------------------------------------------------

export function useMediaItems(options?: {
  type?: MediaType;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'title' | 'usage_count' | 'created_at';
}) {
  return useQuery({
    queryKey: ['media-items', options?.type, options?.search, options?.tags, options?.orderBy, options?.offset, options?.limit],
    queryFn: () => MediaService.listMediaItems(undefined, {
      type: options?.type,
      search: options?.search,
      tags: options?.tags,
      limit: options?.limit ?? 50,
      offset: options?.offset,
      orderBy: options?.orderBy,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useUploadMedia() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{ step: UploadStep; percent: number; message: string }>({
    step: 'idle',
    percent: 0,
    message: '',
  });

  const mutation = useMutation({
    mutationFn: async (input: MediaService.UploadMediaInput) => {
      const result = await MediaService.uploadMediaItem(input, (step, percent) => {
        const messages: Record<string, string> = {
          uploading: 'Enviando arquivo...',
          registering: 'Registrando mídia...',
          creating_job: 'Criando job de sincronização...',
          available: 'Mídia disponível!',
        };
        setProgress({
          step: step as UploadStep,
          percent,
          message: messages[step] ?? step,
        });
      });
      if (!result.ok) {
        setProgress({ step: 'error', percent: 0, message: result.error ?? 'Falha no upload' });
        throw new Error(result.error ?? 'Falha no upload');
      }
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media-items'] }),
    onError: (err: Error) => {
      toast({ title: 'Erro no upload de mídia', description: err.message, variant: 'destructive' });
    },
  });

  const reset = useCallback(() => {
    setProgress({ step: 'idle', percent: 0, message: '' });
    mutation.reset();
  }, [mutation]);

  return { ...mutation, progress, reset };
}

// -------------------------------------------------------
// BASES HOOKS
// -------------------------------------------------------

export function useBases() {
  return useQuery({
    queryKey: ['bases'],
    queryFn: () => BaseService.listBases(),
    staleTime: 60_000,
  });
}

export function useCreateBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (base: Partial<Base>) => BaseService.createBase(base),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      toast({ title: 'Base criada com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar base', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Base> }) =>
      BaseService.updateBase(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar base', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => BaseService.deleteBase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      toast({ title: 'Base excluída' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir base', description: err.message, variant: 'destructive' });
    },
  });
}

export function useSetActiveBase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ session_id, base_id }: { session_id: string; base_id: string | null }) =>
      BaseService.setActiveBase(session_id, base_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-base'] });
      queryClient.invalidateQueries({ queryKey: ['bases'] });
    },
  });
}

export function useActiveBase(session_id: string | null) {
  return useQuery({
    queryKey: ['active-base', session_id],
    queryFn: () => BaseService.getActiveBase(session_id!),
    enabled: !!session_id,
    staleTime: 10_000,
  });
}

// -------------------------------------------------------
// EXECUTORS HOOKS
// -------------------------------------------------------

export function useExecutors(base_id?: string) {
  return useQuery({
    queryKey: ['executors', base_id],
    queryFn: () => BaseService.listExecutors(base_id),
    staleTime: 15_000,
  });
}

// -------------------------------------------------------
// PLAYER STATE HOOKS
// -------------------------------------------------------

export function usePlayerStates(session_id: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['player-states', session_id],
    queryFn: () => DisplayService.getAllPlayerStates(session_id!),
    enabled: !!session_id,
    staleTime: 5_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!session_id) return;

    const unsubscribe = DisplayService.subscribeToPlayerState(
      session_id,
      (state: PlayerState) => {
        queryClient.setQueryData<PlayerState[]>(
          ['player-states', session_id],
          (old) => {
            if (!old) return [state];
            const idx = old.findIndex(
              (s) => s.session_id === state.session_id && s.player_type === state.player_type
            );
            if (idx >= 0) {
              const next = [...old];
              next[idx] = state;
              return next;
            }
            return [...old, state];
          }
        );
      }
    );

    return unsubscribe;
  }, [session_id, queryClient]);

  return query;
}

// -------------------------------------------------------
// DISPLAY STATE HOOKS
// -------------------------------------------------------

export function useDisplayOutputs(session_id: string | null) {
  return useQuery({
    queryKey: ['display-outputs', session_id],
    queryFn: () => DisplayService.listDisplayOutputs(session_id!),
    enabled: !!session_id,
    staleTime: 30_000,
  });
}

export function useDisplayState(display_output_id: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['display-state', display_output_id],
    queryFn: () => DisplayService.getDisplayState(display_output_id!),
    enabled: !!display_output_id,
    staleTime: 5_000,
  });

  // Realtime subscription for passive displays
  useEffect(() => {
    if (!display_output_id) return;

    const unsubscribe = DisplayService.subscribeToDisplayState(
      display_output_id,
      (state: DisplayState) => {
        queryClient.setQueryData(['display-state', display_output_id], state);
      }
    );

    return unsubscribe;
  }, [display_output_id, queryClient]);

  return query;
}

// -------------------------------------------------------
// SONG SEARCH (fast, for live use)
// -------------------------------------------------------

export function useSongSearch(searchTerm: string) {
  const debouncedRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    clearTimeout(debouncedRef.current);
    debouncedRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 200); // 200ms debounce for live use

    return () => clearTimeout(debouncedRef.current);
  }, [searchTerm]);

  return useQuery({
    queryKey: ['song-search', debouncedTerm],
    queryFn: () => MediaService.listSongs(undefined, {
      search: debouncedTerm,
      limit: 20,
      orderBy: 'usage_count',
    }),
    enabled: debouncedTerm.length >= 2,
    staleTime: 10_000,
  });
}
