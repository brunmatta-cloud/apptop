import type { Tables } from '@/integrations/supabase/types';
import type { MomentoProgramacao, TipoMomento } from '@/types/culto';

export type MomentSong = Tables<'moment_songs'>;
export type MomentSongForm = Tables<'moment_song_forms'>;

export type RepertoireStatus = 'ok' | 'incompleto' | 'vazio' | 'aguardando' | 'na';

export interface RepertoireBundle {
  form: MomentSongForm;
  songs: MomentSong[];
}

export interface RepertoireSummary {
  status: RepertoireStatus;
  label: string;
  description: string;
  songsCount: number;
  totalDurationSeconds: number;
  hasLink: boolean;
  isMusicMoment: boolean;
}

export interface EditableSongDraft {
  id?: string;
  clientId: string;
  title: string;
  durationSeconds: string;
  youtubeUrl: string;
  notes: string;
}

const MUSIC_MOMENT_TYPES: TipoMomento[] = ['musica_ao_vivo', 'playback'];

export const isMusicMomentType = (tipo: TipoMomento) => MUSIC_MOMENT_TYPES.includes(tipo);

export const isMusicMoment = (momento: Pick<MomentoProgramacao, 'tipoMomento'> | null | undefined) =>
  Boolean(momento && isMusicMomentType(momento.tipoMomento));

export const sortMomentSongs = <TSong extends Pick<MomentSong, 'position' | 'created_at' | 'id'>>(songs: TSong[]) => (
  [...songs].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }

    if (left.created_at !== right.created_at) {
      return left.created_at.localeCompare(right.created_at);
    }

    return left.id.localeCompare(right.id);
  })
);

export const formatSongDuration = (seconds?: number | null) => {
  if (!Number.isFinite(seconds) || seconds == null || seconds < 0) {
    return '--:--';
  }

  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const formatSongDurationShort = (seconds?: number | null) => {
  if (!Number.isFinite(seconds) || seconds == null || seconds <= 0) {
    return 'Duracao livre';
  }

  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')} min`;
};

export const buildEditableSongDraft = (song?: Partial<MomentSong>): EditableSongDraft => ({
  id: song?.id,
  clientId: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `song-${Math.random().toString(36).slice(2, 10)}`,
  title: song?.title ?? '',
  durationSeconds: Number.isFinite(song?.duration_seconds) && song?.duration_seconds != null ? String(song.duration_seconds) : '',
  youtubeUrl: song?.youtube_url ?? '',
  notes: song?.notes ?? '',
});

export const sanitizeSongDraftsForSave = (songs: EditableSongDraft[]) => (
  songs
    .map((song) => ({
      id: song.id,
      title: song.title.trim(),
      duration_seconds: song.durationSeconds.trim() === '' ? null : Math.max(0, Number(song.durationSeconds)),
      youtube_url: song.youtubeUrl.trim() || null,
      notes: song.notes.trim() || null,
    }))
    .filter((song) => song.title.length > 0 || song.duration_seconds != null || song.youtube_url || song.notes)
);

export const buildRepertoireSummary = ({
  momento,
  songs,
  form,
}: {
  momento: MomentoProgramacao | null | undefined;
  songs: MomentSong[];
  form?: MomentSongForm | null;
}): RepertoireSummary => {
  if (!isMusicMoment(momento)) {
    return {
      status: 'na',
      label: 'Nao se aplica',
      description: 'Este momento nao usa repertorio musical.',
      songsCount: 0,
      totalDurationSeconds: 0,
      hasLink: false,
      isMusicMoment: false,
    };
  }

  const sortedSongs = sortMomentSongs(songs);
  const songsCount = sortedSongs.length;
  const totalDurationSeconds = sortedSongs.reduce((sum, song) => sum + (song.duration_seconds ?? 0), 0);
  const hasLink = Boolean(form?.token);

  if (songsCount === 0) {
    return {
      status: hasLink ? 'aguardando' : 'vazio',
      label: hasLink ? 'Aguardando louvor' : 'Sem musicas',
      description: hasLink ? 'O link ja foi gerado, mas a equipe ainda nao preencheu o repertorio.' : 'Nenhuma musica foi cadastrada para este momento.',
      songsCount,
      totalDurationSeconds,
      hasLink,
      isMusicMoment: true,
    };
  }

  const titlesOk = sortedSongs.every((song) => song.title.trim().length > 0);
  const positionsOk = sortedSongs.every((song, index) => song.position === index);

  if (titlesOk && positionsOk) {
    return {
      status: 'ok',
      label: 'Repertorio completo',
      description: 'Musicas organizadas e prontas para uso nas telas operacionais.',
      songsCount,
      totalDurationSeconds,
      hasLink,
      isMusicMoment: true,
    };
  }

  return {
    status: 'incompleto',
    label: 'Repertorio incompleto',
    description: 'Existe repertorio salvo, mas faltam titulos ou a ordem precisa ser revisada.',
    songsCount,
    totalDurationSeconds,
    hasLink,
    isMusicMoment: true,
  };
};

export const getRepertoireStatusTone = (status: RepertoireStatus) => {
  switch (status) {
    case 'ok':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400';
    case 'incompleto':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    case 'aguardando':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
    case 'vazio':
      return 'border-rose-500/25 bg-rose-500/10 text-rose-300';
    default:
      return 'border-border bg-muted/40 text-muted-foreground';
  }
};
