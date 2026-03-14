import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSyncCommands, useSyncStore } from '@/contexts/SyncStoreContext';
import {
  buildRepertoireSummary,
  type EditableSongDraft,
  type MomentSong,
  type MomentSongForm,
  sanitizeSongDraftsForSave,
} from '@/features/repertorio/model';
import {
  ensureMomentSongForm,
  getMomentSongBundleByToken,
  listMomentSongForms,
  listMomentSongs,
  saveMomentRepertoire,
  saveMomentRepertoireByToken,
} from '@/features/repertorio/service';

export const repertoireKeys = {
  all: ['repertorio'] as const,
  session: (sessionId: string) => [...repertoireKeys.all, 'session', sessionId] as const,
  forms: (sessionId: string) => [...repertoireKeys.session(sessionId), 'forms'] as const,
  songs: (sessionId: string) => [...repertoireKeys.session(sessionId), 'songs'] as const,
  token: (token: string) => [...repertoireKeys.all, 'token', token] as const,
};

const invalidateSessionRepertoire = async (queryClient: ReturnType<typeof useQueryClient>, sessionId: string) => {
  await queryClient.invalidateQueries({ queryKey: repertoireKeys.session(sessionId) });
};

const useSessionRepertoireRealtime = (sessionId: string | null | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const channel = supabase
      .channel(`repertorio-session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moment_song_forms',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        void invalidateSessionRepertoire(queryClient, sessionId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moment_songs',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        void invalidateSessionRepertoire(queryClient, sessionId);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, sessionId]);
};

export const useSessionRepertoire = () => {
  const { remoteState } = useSyncStore();
  const sessionId = remoteState.sessionId;
  useSessionRepertoireRealtime(sessionId);

  const formsQuery = useQuery({
    queryKey: repertoireKeys.forms(sessionId),
    queryFn: () => listMomentSongForms(sessionId),
    enabled: Boolean(sessionId),
  });

  const songsQuery = useQuery({
    queryKey: repertoireKeys.songs(sessionId),
    queryFn: () => listMomentSongs(sessionId),
    enabled: Boolean(sessionId),
  });

  const forms = formsQuery.data ?? [];
  const songs = songsQuery.data ?? [];

  const formByMomentId = useMemo<Record<string, MomentSongForm>>(() => {
    return forms.reduce<Record<string, MomentSongForm>>((accumulator, form) => {
      accumulator[form.momento_id] = form;
      return accumulator;
    }, {});
  }, [forms]);

  const songsByMomentId = useMemo<Record<string, MomentSong[]>>(() => {
    return songs.reduce<Record<string, MomentSong[]>>((accumulator, song) => {
      const existing = accumulator[song.momento_id] ?? [];
      existing.push(song);
      accumulator[song.momento_id] = existing;
      return accumulator;
    }, {});
  }, [songs]);

  return {
    sessionId,
    forms,
    songs,
    formByMomentId,
    songsByMomentId,
    isLoading: formsQuery.isLoading || songsQuery.isLoading,
    isFetching: formsQuery.isFetching || songsQuery.isFetching,
    error: formsQuery.error ?? songsQuery.error ?? null,
    getSummaryForMoment: (momento: Parameters<typeof buildRepertoireSummary>[0]['momento']) => (
      buildRepertoireSummary({
        momento,
        songs: momento ? songsByMomentId[momento.id] ?? [] : [],
        form: momento ? formByMomentId[momento.id] ?? null : null,
      })
    ),
  };
};

export const useEnsureMomentSongFormMutation = () => {
  const { remoteState } = useSyncStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cultoId, momentoId }: { cultoId: string; momentoId: string }) => ensureMomentSongForm({
      sessionId: remoteState.sessionId,
      cultoId,
      momentoId,
    }),
    onSuccess: async () => {
      await invalidateSessionRepertoire(queryClient, remoteState.sessionId);
    },
  });
};

export const useSaveMomentRepertoireMutation = () => {
  const { remoteState } = useSyncStore();
  const { actorId } = useSyncCommands();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cultoId,
      momentoId,
      songs,
    }: {
      cultoId: string;
      momentoId: string;
      songs: ReturnType<typeof sanitizeSongDraftsForSave>;
    }) => saveMomentRepertoire({
      sessionId: remoteState.sessionId,
      cultoId,
      momentoId,
      songs,
      createdBy: actorId,
    }),
    onSuccess: async () => {
      await invalidateSessionRepertoire(queryClient, remoteState.sessionId);
    },
  });
};

export const useMomentSongBundleByToken = (token: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: repertoireKeys.token(token ?? ''),
    queryFn: () => getMomentSongBundleByToken(token ?? ''),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!token || !query.data?.form) {
      return;
    }

    const { form } = query.data;
    const channel = supabase
      .channel(`repertorio-token-${token}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moment_song_forms',
        filter: `id=eq.${form.id}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey: repertoireKeys.token(token) });
        void invalidateSessionRepertoire(queryClient, form.session_id);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'moment_songs',
        filter: `momento_id=eq.${form.momento_id}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey: repertoireKeys.token(token) });
        void invalidateSessionRepertoire(queryClient, form.session_id);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [query.data?.form, queryClient, token]);

  return query;
};

export const useSaveMomentRepertoireByTokenMutation = (token: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (songs: ReturnType<typeof sanitizeSongDraftsForSave>) => {
      if (!token) {
        throw new Error('Token do repertorio nao informado.');
      }

      return saveMomentRepertoireByToken({
        token,
        songs,
      });
    },
    onSuccess: async (bundle) => {
      if (!token) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: repertoireKeys.token(token) });
      await invalidateSessionRepertoire(queryClient, bundle.form.session_id);
    },
  });
};

export const useRepertoireDraftStats = (songs: EditableSongDraft[]) => useMemo(() => {
  const filledSongs = songs.filter((song) => song.title.trim().length > 0 || song.durationSeconds.trim().length > 0 || song.youtubeUrl.trim().length > 0 || song.notes.trim().length > 0);
  const totalDurationSeconds = filledSongs.reduce((sum, song) => {
    const next = Number(song.durationSeconds);
    return Number.isFinite(next) ? sum + Math.max(0, next) : sum;
  }, 0);

  return {
    songsCount: filledSongs.length,
    totalDurationSeconds,
  };
}, [songs]);
