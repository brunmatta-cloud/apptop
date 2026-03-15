import { CheckCircle2, Clock, Music4 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { MomentoProgramacao } from '@/types/culto';
import type { MomentSong } from '@/features/repertorio/model';
import { sortMomentSongs } from '@/features/repertorio/model';

type Props = {
  momentos: MomentoProgramacao[];
  currentIndex: number;
  completedMoments: Set<string>;
  songsByMomentId: Record<string, MomentSong[]>;
};

export function UpcomingMomentsPreview({
  momentos,
  currentIndex,
  completedMoments,
  songsByMomentId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextItemRef = useRef<HTMLDivElement>(null);

  // Mostrar próximos 6 momentos para melhor visualização
  const upcomingMoments = momentos.slice(currentIndex + 1, currentIndex + 7);

  // Auto-scroll para manter o próximo item visível
  useEffect(() => {
    if (nextItemRef.current && containerRef.current) {
      setTimeout(() => {
        nextItemRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [currentIndex]);

  if (upcomingMoments.length === 0) {
    return (
      <div className="glass-card p-3 sm:p-4 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs text-muted-foreground">Sem mais momentos programados</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-3.5 h-full flex flex-col rounded-2xl border-2 border-purple-400/50 bg-gradient-to-br from-purple-900/20 via-indigo-900/15 to-slate-900/10 shadow-2xl shadow-purple-600/20 backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b-2 border-purple-400/40 shrink-0">
        <Clock className="h-4 w-4 text-purple-300 drop-shadow-lg" />
        <span className="text-xs font-black uppercase tracking-wider text-purple-200 drop-shadow-lg">⏱ Próximos</span>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1.5 space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {upcomingMoments.map((momento, idx) => {
          const isNext = idx === 0;
          const isCompleted = completedMoments.has(momento.id);
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []);
          const status = isCompleted ? 'completed' : isNext ? 'next' : 'upcoming';

          return (
            <div
              ref={isNext ? nextItemRef : undefined}
              key={momento.id}
              className={cn(
                'rounded-lg border p-2.5 transition-all',
                isNext && 'ring-2 ring-purple-400/50 shadow-lg shadow-purple-400/20 bg-purple-500/10 border-purple-400/60',
                status === 'completed' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
                status === 'next' && 'border-purple-500/40 bg-purple-500/15 text-purple-100',
                status === 'upcoming' && 'border-sky-500/30 bg-sky-500/10 text-sky-200'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate leading-tight drop-shadow">{momento.atividade}</p>
                  <div className="flex items-center gap-1 mt-1 text-[9px] opacity-80 font-bold">
                    <Clock className="h-3 w-3" />
                    {momento.horarioInicio}
                  </div>
                </div>

                {isNext && (
                  <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-purple-500/40 shrink-0 text-purple-100 border border-purple-400/50 drop-shadow">
                    ▶ PRÓ
                  </span>
                )}
              </div>

              {/* Responsável + Músicas */}
              <div className="flex flex-wrap gap-1 items-center text-[9px] font-bold mb-1">
                {momento.responsavel && (
                  <span className="bg-white/20 px-2 py-0.5 rounded text-white/90 font-semibold">{momento.responsavel}</span>
                )}
                {songs.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white/20 rounded text-white/90 font-semibold">
                    <Music4 className="h-3 w-3" />
                    {songs.length}
                  </span>
                )}
              </div>

              {/* Ação se houver */}
              {momento.acaoSonoplastia && (
                <p className="mb-1.5 text-[9px] leading-tight bg-white/15 rounded px-2 py-1.5 font-bold">
                  ⚡ {momento.acaoSonoplastia}
                </p>
              )}

              {/* Músicas (até 3) */}
              {songs.length > 0 && (
                <div className="pt-1 space-y-1">
                  {songs.slice(0, 3).map((song, sIdx) => (
                    <div key={song.id} className="flex items-center gap-1.5 text-[8px] bg-white/15 rounded px-1.5 py-1 group hover:bg-white/20 transition-all border border-white/10">
                      <span className="font-black w-4 h-4 flex items-center justify-center rounded-sm bg-white/30 text-black font-display">{sIdx + 1}</span>
                      <span className="truncate flex-1 font-bold">{song.title || 'Sem título'}</span>
                      {song.has_playback && <span className="bg-white/20 px-1 rounded text-white/80 font-bold text-[7px]">▶</span>}
                    </div>
                  ))}
                  {songs.length > 3 && (
                    <p className="text-[8px] opacity-70 px-1 font-bold">+{songs.length - 3}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
