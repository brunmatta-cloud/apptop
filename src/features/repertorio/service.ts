import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { MomentSong, MomentSongForm, RepertoireBundle } from '@/features/repertorio/model';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return String((error as { message: string }).message);
  }

  return fallback;
};

const ensureArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const ensureRecord = <T,>(value: unknown): T | null => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as T
    : null
);

const parseBundle = (value: unknown): RepertoireBundle => {
  const payload = ensureRecord<{ form?: unknown; songs?: unknown }>(value);
  const form = ensureRecord<MomentSongForm>(payload?.form);

  if (!form) {
    throw new Error('Resposta invalida do repertorio.');
  }

  return {
    form,
    songs: ensureArray<MomentSong>(payload?.songs),
  };
};

export const listMomentSongForms = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('moment_song_forms')
    .select('*')
    .eq('session_id', sessionId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao carregar links do repertorio.'));
  }

  return data ?? [];
};

export const listMomentSongs = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('moment_songs')
    .select('*')
    .eq('session_id', sessionId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao carregar musicas da programacao.'));
  }

  return data ?? [];
};

export const ensureMomentSongForm = async ({
  sessionId,
  cultoId,
  momentoId,
}: {
  sessionId: string;
  cultoId: string;
  momentoId: string;
}) => {
  const { data, error } = await supabase.rpc('ensure_moment_song_form', {
    p_session_id: sessionId,
    p_culto_id: cultoId,
    p_momento_id: momentoId,
  });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao preparar o link do repertorio.'));
  }

  return data as MomentSongForm;
};

export const saveMomentRepertoire = async ({
  sessionId,
  cultoId,
  momentoId,
  songs,
  createdBy,
}: {
  sessionId: string;
  cultoId: string;
  momentoId: string;
  songs: Json;
  createdBy?: string | null;
}) => {
  const { data, error } = await supabase.rpc('save_moment_repertoire', {
    p_session_id: sessionId,
    p_culto_id: cultoId,
    p_momento_id: momentoId,
    p_songs: songs,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao salvar repertorio.'));
  }

  return parseBundle(data);
};

export const getMomentSongBundleByToken = async (token: string) => {
  const { data, error } = await supabase.rpc('get_moment_song_bundle_by_token', {
    p_token: token,
  });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao carregar o link do repertorio.'));
  }

  if (!data) {
    throw new Error('Este link de repertorio nao existe ou foi desativado.');
  }

  return parseBundle(data);
};

export const saveMomentRepertoireByToken = async ({
  token,
  songs,
  createdBy,
}: {
  token: string;
  songs: Json;
  createdBy?: string | null;
}) => {
  const { data, error } = await supabase.rpc('save_moment_repertoire_by_token', {
    p_token: token,
    p_songs: songs,
    p_created_by: createdBy ?? null,
  });

  if (error) {
    throw new Error(getErrorMessage(error, 'Falha ao salvar repertorio pelo link.'));
  }

  return parseBundle(data);
};
