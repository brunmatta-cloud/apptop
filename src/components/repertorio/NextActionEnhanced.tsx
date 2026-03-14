import { memo, useMemo, type ReactNode } from 'react';
import { AlertCircle, Music4, PlayCircle, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCultoTimer } from '@/contexts/CultoContext';
import { formatTimerMs } from '@/utils/time';
import { getSongMediaLabel, getSongPlaybackLabel, sortMomentSongs, type MomentSong } from '@/features/repertorio/model';
import type { MomentoProgramacao } from '@/types/culto';

type Props = {
  currentMoment: MomentoProgramacao | null;
  nextSoundAction: MomentoProgramacao | null;
  momentos: MomentoProgramacao[];
  currentIndex: number;
  songsByMomentId: Record<string, MomentSong[]>;
};

const getMediaIcon = (tipo: string): ReactNode => {
  switch (tipo) {
    case 'audio':
      return '🎵';
    case 'video':
      return '🎬';
    default:
      return '🔊';
  }
};

export const NextActionEnhanced = memo(function NextActionEnhanced({
  currentMoment,
  nextSoundAction,
  momentos,
  currentIndex,
  songsByMomentId,
}: Props) {
  const { momentElapsedMs } = useCultoTimer();
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;

  const nextActionSongs = useMemo(
    () => (nextSoundAction ? sortMomentSongs(songsByMomentId[nextSoundAction.id] ?? []) : []),
    [nextSoundAction, songsByMomentId],
  );

  const remainingMsUntilNext = useMemo(() => {
    if (!currentMoment || !nextSoundAction) return Infinity;

    const nextIdx = momentos.findIndex((item) => item.id === nextSoundAction.id);
    if (nextIdx <= currentIndex) return Infinity;

    const currentRemaining = Math.max(0, currentMoment.duracao * 60 * 1000 - safeMomentElapsedMs);
    const betweenMs = momentos
      .slice(currentIndex + 1, nextIdx)
      .reduce((sum, momento) => sum + momento.duracao * 60 * 1000, 0);

    return currentRemaining + betweenMs;
  }, [currentIndex, currentMoment, momentos, nextSoundAction, safeMomentElapsedMs]);

  const isUrgent = remainingMsUntilNext <= 10000;
  const showAlert = isUrgent && remainingMsUntilNext > 0;
  const visibleSongs = nextActionSongs.slice(0, 5);

  if (!nextSoundAction) {
    return (
      <div className="glass-card p-4 sm:p-5 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma próxima ação programada</p>
      </div>
    );
  }

  return (
    <div className={cn('glass-card p-4 sm:p-5 transition-all duration-300', isUrgent && 'ring-2 ring-status-alert border-status-alert/50')}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-border/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {showAlert && <AlertCircle className="h-4 w-4 text-status-alert animate-pulse shrink-0" />}
            <span className={cn('text-xs font-bold uppercase tracking-wider', isUrgent ? 'text-status-alert' : 'text-status-next')}>
              {isUrgent ? 'ATENÇÃO!' : 'Próxima Ação'}
            </span>
          </div>
          <h3 className="font-display font-black text-lg sm:text-xl truncate">{nextSoundAction.atividade}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER */}
        <div className={cn('text-center px-4 py-3 rounded-xl border-2 shrink-0', isUrgent ? 'border-status-alert bg-status-alert/10' : 'border-primary/20 bg-primary/10')}>
          <p className={cn('font-mono font-black', isUrgent ? 'text-status-alert text-2xl sm:text-3xl' : 'text-primary text-xl sm:text-2xl')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1">
            {isUrgent ? 'SEGUNDOS' : 'ATÉ AÇÃO'}
          </p>
        </div>
      </div>

      {/* INFORMAÇÕES DA AÇÃO */}
      {nextSoundAction.acaoSonoplastia && (
        <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Ação Necessária</p>
          <p className="text-sm font-medium text-foreground">{nextSoundAction.acaoSonoplastia}</p>
        </div>
      )}

      {/* MÚSICAS (SE HOUVER) */}
      {visibleSongs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
            <Music4 className="h-3.5 w-3.5" />
            {visibleSongs.length} {visibleSongs.length === 1 ? 'Música' : 'Músicas'}
          </p>

          <div className="grid gap-2">
            {visibleSongs.map((song, idx) => (
              <div key={song.id} className="flex items-start gap-2 bg-black/20 rounded-lg p-2 group hover:bg-black/30 transition-colors">
                {/* Número */}
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-black/40 text-xs font-bold shrink-0 flex-col">
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{song.title || 'Sem título'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {song.has_media && (
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded">{getSongMediaLabel(true)}</span>
                    )}
                    {song.has_playback && (
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded">{getSongPlaybackLabel(true)}</span>
                    )}
                    {song.duration_seconds && (
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                        {Math.floor(song.duration_seconds / 60)}:{String(song.duration_seconds % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>

                {/* YouTube */}
                {song.youtube_url && (
                  <a href={song.youtube_url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Youtube className="h-4 w-4 text-rose-400 shrink-0" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {nextActionSongs.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+{nextActionSongs.length - 5} mais músicas</p>
          )}
        </div>
      )}

      {/* HORÁRIO */}
      <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
        <span>{nextSoundAction.horarioInicio}</span>
        <span>{nextSoundAction.tipoMidia === 'nenhum' ? '📄' : getMediaIcon(nextSoundAction.tipoMidia)}</span>
      </div>
    </div>
  );
});

export default NextActionEnhanced;
