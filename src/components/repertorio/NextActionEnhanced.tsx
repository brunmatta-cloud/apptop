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
      <div className="rounded-2xl p-4 sm:p-5 text-center bg-gradient-to-br from-slate-500/20 to-slate-600/20 border border-slate-400/20">
        <p className="text-sm text-slate-300">Nenhuma próxima ação programada</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-2xl p-4 sm:p-5 transition-all duration-300 border-2',
      isUrgent 
        ? 'bg-gradient-to-br from-red-600/40 via-orange-500/35 to-red-700/40 border-red-400/70 shadow-lg shadow-red-600/30' 
        : 'bg-gradient-to-br from-cyan-600/35 via-blue-600/30 to-indigo-700/35 border-cyan-400/60 shadow-lg shadow-cyan-600/25'
    )}>
      {/* HEADER COMPACTO */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {showAlert && <AlertCircle className="h-4 w-4 text-yellow-300 animate-pulse shrink-0" />}
            <span className={cn('text-xs font-bold uppercase tracking-wider', isUrgent ? 'text-yellow-200' : 'text-cyan-100')}>
              {isUrgent ? '⚠️ ATENÇÃO!' : '▶ Próxima Ação'}
            </span>
          </div>
          <h3 className="font-display font-black text-base sm:text-lg truncate text-white">{nextSoundAction.atividade}</h3>
          <p className="text-xs text-slate-100 mt-0.5">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER DESTAQUE */}
        <div className={cn(
          'text-center px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shrink-0 font-mono flex flex-col items-center justify-center min-w-fit',
          isUrgent 
            ? 'bg-yellow-300/90 text-red-900 shadow-lg shadow-yellow-500/40' 
            : 'bg-white/90 text-blue-900 shadow-lg shadow-white/30'
        )}>
          <p className={cn('font-black leading-none', isUrgent ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-80">
            {isUrgent ? 'SECS' : 'ATÉ'}
          </p>
        </div>
      </div>

      {/* AÇÃO + INFO NA MESMA LINHA */}
      <div className="flex flex-col gap-1.5 mb-2">
        {nextSoundAction.acaoSonoplastia && (
          <div className="rounded-lg bg-white/10 backdrop-blur-sm p-2">
            <p className="text-[9px] uppercase tracking-wider text-yellow-200 font-bold mb-0.5">Ação</p>
            <p className="text-xs sm:text-sm font-semibold text-white">{nextSoundAction.acaoSonoplastia}</p>
          </div>
        )}

        {/* HORÁRIO + TIPO NA MESMA LINHA */}
        <div className="flex gap-2 text-xs text-slate-100 font-medium">
          <span className="bg-white/15 px-2 py-1 rounded-lg">🕐 {nextSoundAction.horarioInicio}</span>
          <span className="bg-white/15 px-2 py-1 rounded-lg">{nextSoundAction.tipoMidia === 'nenhum' ? '📄 Sem mídia' : `${getMediaIcon(nextSoundAction.tipoMidia)}`}</span>
        </div>
      </div>

      {/* MÚSICAS - GRID COMPACTO */}
      {visibleSongs.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider font-black text-yellow-200 mb-1.5 flex items-center gap-1.5">
            <Music4 className="h-3.5 w-3.5" />
            {visibleSongs.length} {visibleSongs.length === 1 ? 'Música' : 'Músicas'}
          </p>

          <div className="grid gap-1">
            {visibleSongs.map((song, idx) => (
              <div 
                key={song.id} 
                className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 group hover:bg-white/25 transition-all"
              >
                {/* Número */}
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-white/30 text-xs font-black shrink-0 text-white">
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">{song.title || 'Sem título'}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {song.has_media && (
                      <span className="text-[8px] sm:text-[9px] bg-white/20 px-1 py-0.5 rounded text-white font-semibold">{getSongMediaLabel(true)}</span>
                    )}
                    {song.has_playback && (
                      <span className="text-[8px] sm:text-[9px] bg-white/20 px-1 py-0.5 rounded text-white font-semibold">{getSongPlaybackLabel(true)}</span>
                    )}
                    {song.duration_seconds && (
                      <span className="text-[8px] sm:text-[9px] bg-white/20 px-1 py-0.5 rounded text-white font-semibold">
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
                    <Youtube className="h-3.5 w-3.5 text-yellow-300" />
                  </a>
                )}
              </div>
            ))}
          </div>

          {nextActionSongs.length > 8 && (
            <p className="text-xs text-slate-100 text-center pt-1 font-semibold">+{nextActionSongs.length - 8} mais</p>
          )}
        </div>
      )}
    </div>
  );
});

export default NextActionEnhanced;
