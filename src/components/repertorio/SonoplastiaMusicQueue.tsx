import { ExternalLink, Music4, PlayCircle, TimerReset, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MomentSong } from '@/features/repertorio/model';
import { formatSongDuration, formatSongDurationShort, isMusicMoment, sortMomentSongs } from '@/features/repertorio/model';
import type { MomentoProgramacao } from '@/types/culto';
import { formatTimerMs } from '@/utils/time';

type Props = {
  momentos: MomentoProgramacao[];
  currentMoment: MomentoProgramacao | null;
  currentIndex: number;
  momentElapsedMs: number;
  songsByMomentId: Record<string, MomentSong[]>;
  isPaused: boolean;
};

type QueueItem = {
  song: MomentSong;
  state: 'agora' | 'proxima' | 'depois' | 'aguardando';
  etaMs: number | null;
};

const buildUpcomingMomentEta = ({
  currentMoment,
  currentIndex,
  targetIndex,
  momentElapsedMs,
  momentos,
}: {
  currentMoment: MomentoProgramacao | null;
  currentIndex: number;
  targetIndex: number;
  momentElapsedMs: number;
  momentos: MomentoProgramacao[];
}) => {
  if (targetIndex < 0) {
    return null;
  }

  if (currentIndex < 0 || !currentMoment) {
    return 0;
  }

  const currentRemainingMs = Math.max(0, currentMoment.duracao * 60 * 1000 - momentElapsedMs);
  const betweenMs = momentos
    .slice(currentIndex + 1, targetIndex)
    .reduce((sum, momento) => sum + momento.duracao * 60 * 1000, 0);

  return currentRemainingMs + betweenMs;
};

const getQueueItemTone = (state: QueueItem['state']) => {
  switch (state) {
    case 'agora':
      return {
        container: 'border-sky-500/25 bg-sky-500/10',
        pill: 'bg-sky-500/15 text-sky-300',
        label: 'Agora',
      };
    case 'proxima':
      return {
        container: 'border-amber-500/25 bg-amber-500/10',
        pill: 'bg-amber-500/15 text-amber-300',
        label: 'Proxima',
      };
    case 'depois':
      return {
        container: 'border-border/60 bg-muted/20',
        pill: 'bg-muted text-muted-foreground',
        label: 'Depois',
      };
    default:
      return {
        container: 'border-border/60 bg-muted/20',
        pill: 'bg-muted text-muted-foreground',
        label: 'Aguardando',
      };
  }
};

export function SonoplastiaMusicQueue({
  momentos,
  currentMoment,
  currentIndex,
  momentElapsedMs,
  songsByMomentId,
  isPaused,
}: Props) {
  const currentMomentSongs = currentMoment ? sortMomentSongs(songsByMomentId[currentMoment.id] ?? []) : [];
  const currentMomentIsMusic = isMusicMoment(currentMoment);
  const nextMusicMoment = momentos.find((momento, index) => index > currentIndex && isMusicMoment(momento) && (songsByMomentId[momento.id]?.length ?? 0) > 0) ?? null;
  const nextMusicMomentIndex = nextMusicMoment ? momentos.findIndex((momento) => momento.id === nextMusicMoment.id) : -1;
  const nextMusicMomentSongs = nextMusicMoment ? sortMomentSongs(songsByMomentId[nextMusicMoment.id] ?? []) : [];

  let activeSong: MomentSong | null = null;
  let nextSong: MomentSong | null = null;
  let remainingMsForCurrentSong: number | null = null;
  const queueMoment = currentMomentIsMusic && currentMomentSongs.length > 0 ? currentMoment : nextMusicMoment;
  let queueItems: QueueItem[] = [];

  if (currentMomentIsMusic && currentMomentSongs.length > 0) {
    let accumulatedMs = 0;
    let activeIndex = 0;
    let foundActive = false;

    for (let index = 0; index < currentMomentSongs.length; index += 1) {
      const song = currentMomentSongs[index];
      if (song.duration_seconds == null) {
        activeSong = currentMomentSongs[Math.min(index, currentMomentSongs.length - 1)];
        nextSong = currentMomentSongs[index + 1] ?? null;
        remainingMsForCurrentSong = null;
        activeIndex = index;
        foundActive = true;
        break;
      }

      const songEndMs = accumulatedMs + song.duration_seconds * 1000;
      if (momentElapsedMs < songEndMs) {
        activeSong = song;
        nextSong = currentMomentSongs[index + 1] ?? null;
        remainingMsForCurrentSong = Math.max(0, songEndMs - momentElapsedMs);
        activeIndex = index;
        foundActive = true;
        break;
      }

      accumulatedMs = songEndMs;
    }

    if (!foundActive) {
      activeSong = currentMomentSongs[currentMomentSongs.length - 1] ?? null;
      nextSong = null;
      remainingMsForCurrentSong = 0;
      activeIndex = Math.max(0, currentMomentSongs.length - 1);
    }

    let runningEtaMs = remainingMsForCurrentSong;
    queueItems = currentMomentSongs.slice(activeIndex).map((song, relativeIndex) => {
      if (relativeIndex === 0) {
        return { song, state: 'agora', etaMs: 0 };
      }

      const etaMs = runningEtaMs;
      if (song.duration_seconds != null && runningEtaMs != null) {
        runningEtaMs += song.duration_seconds * 1000;
      } else {
        runningEtaMs = null;
      }

      return {
        song,
        state: relativeIndex === 1 ? 'proxima' : 'depois',
        etaMs,
      };
    });
  } else if (nextMusicMoment && nextMusicMomentSongs.length > 0) {
    activeSong = nextMusicMomentSongs[0];
    nextSong = nextMusicMomentSongs[1] ?? null;
    remainingMsForCurrentSong = buildUpcomingMomentEta({
      currentMoment,
      currentIndex,
      targetIndex: nextMusicMomentIndex,
      momentElapsedMs,
      momentos,
    });
    queueItems = nextMusicMomentSongs.map((song, index) => ({
      song,
      state: index === 0 ? 'proxima' : 'aguardando',
      etaMs: index === 0 ? remainingMsForCurrentSong : null,
    }));
  }

  const headlineTone = (() => {
    if (remainingMsForCurrentSong == null) {
      return {
        badge: 'border-border bg-muted/40 text-muted-foreground',
        label: currentMomentIsMusic ? 'Duracao livre' : 'Prepare a fila',
      };
    }

    if (remainingMsForCurrentSong <= 0) {
      return {
        badge: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
        label: 'Lancar agora',
      };
    }

    if (remainingMsForCurrentSong <= 30000) {
      return {
        badge: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
        label: `Preparar em ${formatTimerMs(remainingMsForCurrentSong)}`,
      };
    }

    return {
      badge: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
      label: `Proxima em ${formatTimerMs(remainingMsForCurrentSong)}`,
    };
  })();

  if (!queueMoment || !activeSong) {
    return (
      <div className="glass-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Music4 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fila musical</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Nenhum repertorio musical foi preenchido ainda. Quando as musicas forem salvas, esta fila aparecera automaticamente para a operacao ao vivo.
        </p>
      </div>
    );
  }

  const queueSongs = sortMomentSongs(songsByMomentId[queueMoment.id] ?? []);
  const queueTotalDurationSeconds = queueSongs.reduce((sum, song) => sum + (song.duration_seconds ?? 0), 0);

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Music4 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fila musical</span>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]', headlineTone.badge)}>
          {headlineTone.label}
        </span>
      </div>

      <div className="rounded-[1.6rem] border border-border/60 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(15,23,42,0.02))] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              {currentMomentIsMusic ? 'Momento musical atual' : 'Proximo momento musical'}
            </p>
            <h3 className="mt-1 truncate text-xl font-display font-black">{queueMoment.atividade}</h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">{queueMoment.responsavel || 'Equipe de louvor'}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/75 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Musica destaque</p>
            <p className="mt-1 font-semibold text-foreground">{activeSong.title || 'Sem titulo'}</p>
            <p className="text-xs text-muted-foreground">{formatSongDuration(activeSong.duration_seconds)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/75 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fila</p>
            <p className="mt-1 text-sm font-semibold">{queueSongs.length} {queueSongs.length === 1 ? 'musica' : 'musicas'}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/75 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Duracao total</p>
            <p className="mt-1 text-sm font-semibold">{formatSongDurationShort(queueTotalDurationSeconds)}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/75 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Entrada</p>
            <p className="mt-1 text-sm font-semibold">{queueMoment.horarioInicio}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[1.35rem] border border-border/60 bg-card/75 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <PlayCircle className="h-4 w-4" />
              {currentMomentIsMusic ? 'Agora' : 'Proxima entrada'}
            </div>
            <div className="mt-3">
              <p className="text-lg font-display font-black">{activeSong.title || 'Musica sem titulo'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted/50 px-2.5 py-1">#{activeSong.position + 1}</span>
                <span className="rounded-full bg-muted/50 px-2.5 py-1">{formatSongDuration(activeSong.duration_seconds)}</span>
                {isPaused && currentMomentIsMusic ? (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">Cronometro pausado</span>
                ) : null}
              </div>
              {activeSong.notes ? (
                <p className="mt-3 text-sm text-muted-foreground">{activeSong.notes}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-border/60 bg-card/75 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
              <TimerReset className="h-4 w-4" />
              Proxima musica
            </div>
            {nextSong ? (
              <div className="mt-3">
                <p className="text-lg font-display font-black">{nextSong.title || 'Musica sem titulo'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted/50 px-2.5 py-1">#{nextSong.position + 1}</span>
                  <span className="rounded-full bg-muted/50 px-2.5 py-1">{formatSongDuration(nextSong.duration_seconds)}</span>
                  {remainingMsForCurrentSong != null ? (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">
                      em {formatTimerMs(Math.max(0, remainingMsForCurrentSong))}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma outra musica na fila deste momento.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {queueItems.slice(0, 5).map((item) => {
          const tone = getQueueItemTone(item.state);

          return (
            <div
              key={item.song.id}
              className={cn('rounded-2xl border px-3 py-3 text-sm', tone.container)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-black/10 px-2 font-mono text-xs font-black">
                  #{item.song.position + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.song.title || 'Musica sem titulo'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSongDuration(item.song.duration_seconds)}</span>
                        {item.etaMs != null && item.etaMs > 0 ? (
                          <span>em {formatTimerMs(item.etaMs)}</span>
                        ) : null}
                      </div>
                      {item.song.notes ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.song.notes}</p>
                      ) : null}
                    </div>

                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                      tone.pill,
                    )}>
                      {tone.label}
                    </span>
                  </div>
                </div>

                {item.song.youtube_url ? (
                  <a
                    href={item.song.youtube_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Abrir link do YouTube"
                  >
                    <Youtube className="h-3.5 w-3.5 text-rose-400" />
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
