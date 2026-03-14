import { PlayCircle, TimerReset, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MomentSong } from '@/features/repertorio/model';
import { getSongMediaLabel, getSongPlaybackLabel, isMusicMoment, sortMomentSongs } from '@/features/repertorio/model';
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

export function SonoplastiaQueuePlaylist({
  momentos,
  currentMoment,
  currentIndex,
  momentElapsedMs,
  songsByMomentId,
  isPaused,
}: Props) {
  const currentMomentSongs = currentMoment ? sortMomentSongs(songsByMomentId[currentMoment.id] ?? []) : [];
  const currentMomentIsMusic = isMusicMoment(currentMoment);
  const nextMusicMoment = momentos.find(
    (momento, index) =>
      index > currentIndex && isMusicMoment(momento) && (songsByMomentId[momento.id]?.length ?? 0) > 0,
  ) ?? null;
  const nextMusicMomentIndex = nextMusicMoment ? momentos.findIndex((momento) => momento.id === nextMusicMoment.id) : -1;
  const nextMusicMomentSongs = nextMusicMoment ? sortMomentSongs(songsByMomentId[nextMusicMoment.id] ?? []) : [];

  const displayMoment = currentMomentIsMusic && currentMomentSongs.length > 0 ? currentMoment : nextMusicMoment;
  const displaySongs = currentMomentIsMusic && currentMomentSongs.length > 0 ? currentMomentSongs : nextMusicMomentSongs;

  if (!displayMoment || displaySongs.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-5">
        <p className="text-center text-sm text-muted-foreground">Nenhuma música na fila</p>
      </div>
    );
  }

  // Mostrar até 5 músicas no máximo
  const visibleSongs = displaySongs.slice(0, 5);

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {currentMomentIsMusic ? 'Fila atual' : 'Proxima fila'}
          </p>
          <h3 className="mt-1 text-lg font-display font-bold">{displayMoment.atividade}</h3>
        </div>
        <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fila</p>
          <p className="text-sm font-semibold">
            {visibleSongs.length}/{displaySongs.length}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {visibleSongs.map((song, index) => {
          const isActive = index === 0 && currentMomentIsMusic;
          const isNext = index === 1 && currentMomentIsMusic;

          return (
            <div
              key={song.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-sm transition-all',
                isActive
                  ? 'border-primary/50 bg-primary/10'
                  : isNext
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-border/60 bg-card/60 hover:bg-card/80',
              )}
            >
              {/* Número */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-semibold',
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : isNext
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isActive && <PlayCircle className="h-4 w-4" />}
                {isNext && <TimerReset className="h-4 w-4" />}
                {!isActive && !isNext && <span>{index + 1}</span>}
              </div>

              {/* Informações */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">
                  {song.title || 'Música sem título'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                    #{song.position + 1}
                  </span>
                  {song.has_media && (
                    <span className="inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {getSongMediaLabel(true)}
                    </span>
                  )}
                  {song.has_playback && (
                    <span className="inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {getSongPlaybackLabel(true)}
                    </span>
                  )}
                  {song.duration_seconds && (
                    <span className="inline-flex rounded-full bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {Math.floor(song.duration_seconds / 60)}:{String(song.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>
              </div>

              {/* YouTube Link */}
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg bg-black/10 p-2 transition-colors hover:bg-black/20"
                  aria-label="Abrir YouTube"
                >
                  <Youtube className="h-4 w-4 text-rose-400" />
                </a>
              )}
            </div>
          );
        })}

        {displaySongs.length > 5 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
            +{displaySongs.length - 5} mais {displaySongs.length - 5 === 1 ? 'música' : 'músicas'} na fila
          </div>
        )}
      </div>
    </div>
  );
}
