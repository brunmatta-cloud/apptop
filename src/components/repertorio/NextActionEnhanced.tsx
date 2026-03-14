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
  const visibleSongs = nextActionSongs.slice(0, 8);

  if (!nextSoundAction) {
    return (
      <div className="rounded-xl p-2 text-center bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-400/20 h-full flex items-center justify-center">
        <p className="text-xs text-slate-300">Nenhuma próxima ação</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-lg transition-all duration-300 border-2 p-2 h-full flex flex-col overflow-hidden',
      isUrgent 
        ? 'bg-gradient-to-br from-red-600/40 via-orange-500/35 to-red-700/40 border-red-400/70 shadow-lg shadow-red-600/30' 
        : 'bg-gradient-to-br from-cyan-600/35 via-blue-600/30 to-indigo-700/35 border-cyan-400/60 shadow-lg shadow-cyan-600/25'
    )}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2 mb-1 pb-1 border-b border-white/20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {showAlert && <AlertCircle className="h-3.5 w-3.5 text-yellow-300 animate-pulse shrink-0" />}
            <span className={cn('text-[10px] font-bold uppercase tracking-tight', isUrgent ? 'text-yellow-200' : 'text-cyan-100')}>
              {isUrgent ? '⚠ ATENÇÃO!' : '▶ Próxima'}
            </span>
          </div>
          <h3 className="font-display font-black text-xs line-clamp-2 text-white leading-tight">{nextSoundAction.atividade}</h3>
          <p className="text-[9px] text-slate-100 line-clamp-1">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER */}
        <div className={cn(
          'text-center px-2 py-1.5 rounded-lg shrink-0 font-mono flex flex-col items-center justify-center min-w-fit',
          isUrgent 
            ? 'bg-yellow-300/90 text-red-900 shadow-lg shadow-yellow-500/40' 
            : 'bg-white/90 text-blue-900 shadow-lg shadow-white/30'
        )}>
          <p className={cn('font-black leading-none', isUrgent ? 'text-lg' : 'text-base')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
          <p className="text-[8px] font-bold uppercase mt-0.5 opacity-80">
            {isUrgent ? 'SECS' : 'ATÉ'}
          </p>
        </div>
      </div>

      {/* AÇÃO + HORÁRIO + TIPO */}
      <div className="flex-1 overflow-y-auto space-y-0.5 mb-1">
        {nextSoundAction.acaoSonoplastia && (
          <div className="rounded-md bg-white/10 backdrop-blur-sm p-1">
            <p className="text-[8px] uppercase font-bold text-yellow-200 leading-tight">Ação</p>
            <p className="text-[9px] font-semibold text-white line-clamp-1">{nextSoundAction.acaoSonoplastia}</p>
          </div>
        )}

        {/* HORÁRIO + TIPO */}
        <div className="flex gap-1 text-[8px] text-slate-100">
          <span className="bg-white/15 px-1.5 py-0.5 rounded whitespace-nowrap">🕐 {nextSoundAction.horarioInicio}</span>
          <span className="bg-white/15 px-1.5 py-0.5 rounded truncate">{nextSoundAction.tipoMidia === 'nenhum' ? '📄' : getMediaIcon(nextSoundAction.tipoMidia)}</span>
        </div>

        {/* MÚSICAS */}
        {visibleSongs.length > 0 && (
          <div className="pt-0.5">
            <p className="text-[8px] uppercase font-bold text-yellow-200 mb-0.5 flex items-center gap-1">
              <Music4 className="h-2.5 w-2.5" />
              {visibleSongs.length} {visibleSongs.length === 1 ? 'Música' : 'Músicas'}
            </p>

            <div className="space-y-0.5">
              {visibleSongs.map((song, idx) => (
                <div 
                  key={song.id} 
                  className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-md p-1 group hover:bg-white/20 transition-all"
                >
                  {/* Número */}
                  <div className="flex items-center justify-center h-5 w-5 rounded-sm bg-white/30 text-[7px] font-black shrink-0 text-white leading-none">
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-bold text-white truncate">{song.title || 'S/título'}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {song.has_media && (
                        <span className="text-[6px] bg-white/20 px-0.5 rounded text-white font-bold">M</span>
                      )}
                      {song.has_playback && (
                        <span className="text-[6px] bg-white/20 px-0.5 rounded text-white font-bold">P</span>
                      )}
                      {song.duration_seconds && (
                        <span className="text-[6px] bg-white/20 px-0.5 rounded text-white font-bold">
                          {Math.floor(song.duration_seconds / 60)}:{String(song.duration_seconds % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* YouTube */}
                  {song.youtube_url && (
                    <a 
                      href={song.youtube_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Youtube className="h-3 w-3 text-yellow-300" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {nextActionSongs.length > 8 && (
              <p className="text-[7px] text-slate-100 text-center pt-0.5">+{nextActionSongs.length - 8}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default NextActionEnhanced;
