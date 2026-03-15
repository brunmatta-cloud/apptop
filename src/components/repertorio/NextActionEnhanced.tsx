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
      'rounded-2xl transition-all duration-300 border-2 p-3 h-full flex flex-col overflow-hidden backdrop-blur-sm',
      isUrgent 
        ? 'bg-gradient-to-br from-red-600/50 via-orange-500/45 to-red-700/50 border-red-400/80 shadow-2xl shadow-red-600/40' 
        : 'bg-gradient-to-br from-cyan-600/45 via-blue-600/40 to-indigo-700/45 border-cyan-400/70 shadow-2xl shadow-cyan-600/35'
    )}>
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b-2 border-white/30">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            {showAlert && <AlertCircle className="h-5 w-5 text-yellow-300 animate-pulse shrink-0" />}
            <span className={cn('text-xs font-black uppercase tracking-wider', isUrgent ? 'text-yellow-100 drop-shadow-lg' : 'text-cyan-50 drop-shadow-lg')}>
              {isUrgent ? '🚨 EM BREVE!' : '▶▶ PRÓXIMO A EXECUTAR'}
            </span>
          </div>
          <h3 className="font-display font-black text-base line-clamp-2 text-white leading-tight drop-shadow-md">{nextSoundAction.atividade}</h3>
          <p className="text-xs text-white/90 line-clamp-1 font-bold mt-0.5">{nextSoundAction.responsavel}</p>
        </div>

        {/* TIMER GRANDE E DESTACADO */}
        <div className={cn(
          'text-center px-3.5 py-2.5 rounded-2xl shrink-0 font-mono flex flex-col items-center justify-center min-w-fit border-2',
          isUrgent 
            ? 'bg-gradient-to-b from-yellow-300 to-amber-300 text-red-900 shadow-2xl shadow-yellow-500/50 border-yellow-200' 
            : 'bg-gradient-to-b from-white to-slate-100 text-blue-900 shadow-2xl shadow-white/40 border-white/50'
        )}>
          <p className={cn('font-black leading-none tracking-tight', isUrgent ? 'text-3xl' : 'text-2xl')}>
            {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
          </p>
          <p className="text-[10px] font-black uppercase mt-1 opacity-80">
            {isUrgent ? 'SECS' : 'ATÉ'}
          </p>
        </div>
      </div>

      {/* AÇÃO + HORÁRIO + TIPO */}
      <div className="flex-1 overflow-y-auto space-y-1 mb-1.5">
        {nextSoundAction.acaoSonoplastia && (
          <div className="rounded-lg bg-white/10 backdrop-blur-sm p-1.5 border border-white/20">
            <p className="text-[9px] uppercase font-black text-yellow-200 leading-tight mb-0.5">Ação Necessária</p>
            <p className="text-[11px] font-semibold text-white line-clamp-2">{nextSoundAction.acaoSonoplastia}</p>
          </div>
        )}

        {/* HORÁRIO + TIPO */}
        <div className="flex gap-1 text-[9px] text-slate-100 font-bold">
          <span className="bg-white/15 px-2 py-1 rounded-lg whitespace-nowrap border border-white/20">🕐 {nextSoundAction.horarioInicio}</span>
          <span className="bg-white/15 px-2 py-1 rounded-lg flex-grow text-center border border-white/20">{nextSoundAction.tipoMidia === 'nenhum' ? '📄 Sem mídia' : getMediaIcon(nextSoundAction.tipoMidia)}</span>
        </div>

        {/* MÚSICAS */}
        {visibleSongs.length > 0 && (
          <div className="pt-1">
            <p className="text-[10px] uppercase font-black text-yellow-200 mb-1 flex items-center gap-1 tracking-wide">
              <Music4 className="h-3.5 w-3.5" />
              {visibleSongs.length} {visibleSongs.length === 1 ? 'Música' : 'Músicas'}
            </p>

            <div className="space-y-1">
              {visibleSongs.map((song, idx) => (
                <div 
                  key={song.id} 
                  className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg p-1.5 group hover:bg-white/20 transition-all border border-white/[0.15]"
                >
                  {/* Número */}
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-white/30 text-[10px] font-black shrink-0 text-white">
                    {idx + 1}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-white truncate">{song.title || 'Sem título'}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {song.has_media && (
                        <span className="text-[8px] bg-white/20 px-1 rounded text-white font-bold">MÍDIA</span>
                      )}
                      {song.has_playback && (
                        <span className="text-[8px] bg-white/20 px-1 rounded text-white font-bold">PLAY</span>
                      )}
                      {song.duration_seconds && (
                        <span className="text-[8px] bg-white/20 px-1 rounded text-white font-bold">
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
                      <Youtube className="h-4 w-4 text-yellow-300" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            {nextActionSongs.length > 8 && (
              <p className="text-[9px] text-slate-100 text-center pt-1 font-bold">+{nextActionSongs.length - 8} mais</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default NextActionEnhanced;
