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

  const isWarning = remainingMsUntilNext <= 20000;
  const isDanger = remainingMsUntilNext <= 10000;
  const showAlert = isDanger && remainingMsUntilNext > 0;
  const visibleSongs = nextActionSongs.slice(0, 8);

  if (!nextSoundAction) {
    return (
      <div className="glass-card px-3 py-2.5 sm:px-4 sm:py-3 text-center">
        <p className="text-xs text-muted-foreground">Nenhuma próxima ação</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'glass-card transition-all duration-300',
      isDanger && 'ring-2 ring-red-500 border-red-500/50 bg-red-500/5',
      isWarning && !isDanger && 'ring-2 ring-amber-500 border-amber-500/50 bg-amber-500/5'
    )}>
      {/* HEADER COMPACTO COM ALERTA */}
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3', isDanger && 'border-b border-red-500/30', isWarning && !isDanger && 'border-b border-amber-500/30')}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {showAlert && <AlertCircle className="h-3.5 w-3.5 text-red-500 animate-pulse shrink-0" />}
            {isWarning && !isDanger && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-status-next')}>
              {isDanger ? 'CRÍTICO!' : isWarning ? 'ATENÇÃO!' : 'Próxima'}
            </span>
          </div>
          <h3 className="font-semibold text-sm truncate">{nextSoundAction.atividade}</h3>
          <p className="text-xs text-muted-foreground truncate">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER COMPACTO */}
        <div className={cn('text-center px-3 py-2 rounded-lg border shrink-0 min-w-fit', isDanger ? 'border-red-500 bg-red-500/20' : isWarning ? 'border-amber-500 bg-amber-500/15' : 'border-primary/20 bg-primary/10')}>
          <p className={cn('font-mono font-bold text-sm sm:text-base', isDanger ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-primary')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
        </div>
      </div>

      {/* CONTEÚDO COMPACTO */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 space-y-1.5">
        {/* AÇÃO */}
        {nextSoundAction.acaoSonoplastia && (
          <div className={cn('text-xs rounded px-2 py-1', isDanger ? 'bg-red-500/20 text-red-600' : isWarning ? 'bg-amber-500/20 text-amber-700' : 'bg-primary/15 text-primary')}>
            <span className="font-semibold">Ação:</span> {nextSoundAction.acaoSonoplastia}
          </div>
        )}

        {/* MÚSICAS - FORMATO COMPACTO (ATÉ 8) */}
        {visibleSongs.length > 0 && (
          <div className="text-xs">
            <p className="font-semibold text-muted-foreground mb-1">♪ {visibleSongs.length} música{visibleSongs.length > 1 ? 's' : ''}</p>
            <div className="grid gap-0.5 grid-cols-1 sm:grid-cols-2">
              {visibleSongs.map((song, idx) => (
                <div key={song.id} className="flex items-center gap-1 bg-black/15 rounded px-1.5 py-0.5 group hover:bg-black/25 transition-colors">
                  <span className="font-bold text-primary shrink-0 min-w-4">#{idx + 1}</span>
                  <span className="truncate text-xs flex-1">{song.title || 'Sem título'}</span>
                  <div className="flex gap-0.5 shrink-0">
                    {song.has_media && <span className="px-1 py-0 rounded text-[8px] bg-black/30">M</span>}
                    {song.has_playback && <span className="px-1 py-0 rounded text-[8px] bg-emerald-500/40 text-emerald-300">P</span>}
                  </div>
                  {song.youtube_url && (
                    <a href={song.youtube_url} target="_blank" rel="noreferrer" className="opacity-50 hover:opacity-100 transition-opacity">
                      <Youtube className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            {nextActionSongs.length > 8 && (
              <p className="text-muted-foreground text-[9px] mt-0.5">+{nextActionSongs.length - 8} músicas</p>
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
