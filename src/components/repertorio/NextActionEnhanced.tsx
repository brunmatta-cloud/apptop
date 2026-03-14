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
    <div className={cn('glass-card transition-all duration-300', isUrgent && 'ring-2 ring-status-alert border-status-alert/50')}>
      {/* HEADER COMPACTO */}
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3', isUrgent && 'border-b border-status-alert/30')}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {showAlert && <AlertCircle className="h-3.5 w-3.5 text-status-alert animate-pulse shrink-0" />}
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', isUrgent ? 'text-status-alert' : 'text-status-next')}>
              {isUrgent ? 'ATENÇÃO!' : 'Próxima'}
            </span>
          </div>
          <h3 className="font-semibold text-sm truncate">{nextSoundAction.atividade}</h3>
          <p className="text-xs text-muted-foreground truncate">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER COMPACTO */}
        <div className={cn('text-center px-3 py-2 rounded-lg border shrink-0 min-w-fit', isUrgent ? 'border-status-alert bg-status-alert/15' : 'border-primary/20 bg-primary/10')}>
          <p className={cn('font-mono font-bold text-sm sm:text-base', isUrgent ? 'text-status-alert' : 'text-primary')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
        </div>
      </div>

      {/* CONTEÚDO COMPACTO */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 space-y-1.5">
        {/* AÇÃO */}
        {nextSoundAction.acaoSonoplastia && (
          <div className={cn('text-xs rounded px-2 py-1', isUrgent ? 'bg-status-alert/20 text-status-alert' : 'bg-primary/15 text-primary')}>
            <span className="font-semibold">Ação:</span> {nextSoundAction.acaoSonoplastia}
          </div>
        )}

        {/* MÚSICAS - FORMATO COMPACTO */}
        {visibleSongs.length > 0 && (
          <div className="text-xs">
            <p className="font-semibold text-muted-foreground mb-1">♪ {visibleSongs.length} música{visibleSongs.length > 1 ? 's' : ''}</p>
            <div className="space-y-0.5">
              {visibleSongs.slice(0, 3).map((song, idx) => (
                <div key={song.id} className="flex items-center gap-1.5 bg-black/15 rounded px-2 py-1 group hover:bg-black/25 transition-colors">
                  <span className="font-bold text-primary shrink-0">#{idx + 1}</span>
                  <span className="truncate text-xs flex-1">{song.title || 'Sem título'}</span>
                  <div className="flex gap-0.5 shrink-0">
                    {song.has_media && <span className="px-1 py-0 rounded text-[9px] bg-black/30">MIDIA</span>}
                    {song.has_playback && <span className="px-1 py-0 rounded text-[9px] bg-emerald-500/40 text-emerald-300">PB</span>}
                  </div>
                  {song.youtube_url && (
                    <a href={song.youtube_url} target="_blank" rel="noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                      <Youtube className="h-3 w-3 text-rose-400 shrink-0" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            {nextActionSongs.length > 3 && (
              <p className="text-muted-foreground text-[9px] mt-1">+{nextActionSongs.length - 3} músicas</p>
            )}
          </div>
        )}

        {/* RODAPÉ */}
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
          <span>{nextSoundAction.horarioInicio}</span>
          <span>{nextSoundAction.tipoMidia === 'nenhum' ? '📄' : getMediaIcon(nextSoundAction.tipoMidia)}</span>
        </div>
      </div>
    </div>
  );
});

export default NextActionEnhanced;
