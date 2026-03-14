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
    <div className="glass-card p-2.5 sm:p-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/60 shrink-0">
        <Clock className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-wide text-yellow-200">
          Próximos Momentos
        </span>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1.5 space-y-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40"
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
                'rounded-lg border p-2 transition-all',
                isNext && 'ring-2 ring-amber-400/50 shadow-lg shadow-amber-400/20 bg-amber-500/5',
                status === 'completed' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
                status === 'next' && 'border-amber-500/40 bg-amber-500/15 text-amber-100',
                status === 'upcoming' && 'border-sky-500/30 bg-sky-500/10 text-sky-200'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold truncate leading-tight">{momento.atividade}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-[9px] opacity-80 font-semibold">
                    <Clock className="h-3 w-3" />
                    {momento.horarioInicio}
                  </div>
                </div>

                {isNext && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/30 shrink-0 text-amber-100 border border-amber-500/50">
                    ▶ PRÓX
                  </span>
                )}
              </div>

              {/* Responsável + Músicas */}
              <div className="flex flex-wrap gap-1 items-center text-[9px] font-semibold mb-1">
                {momento.responsavel && (
                  <span className="bg-white/15 px-1.5 py-0.5 rounded text-white/80">{momento.responsavel}</span>
                )}
                {songs.length > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/15 rounded text-white/80">
                    <Music4 className="h-3 w-3" />
                    {songs.length}
                  </span>
                )}
              </div>

              {/* Ação se houver */}
              {momento.acaoSonoplastia && (
                <p className="mb-1 text-[9px] leading-tight bg-white/10 rounded px-1.5 py-1 font-semibold">
                  ⚡ {momento.acaoSonoplastia}
                </p>
              )}

              {/* Músicas (até 3) */}
              {songs.length > 0 && (
                <div className="pt-0.5 space-y-0.5">
                  {songs.slice(0, 3).map((song, sIdx) => (
                    <div key={song.id} className="flex items-center gap-1 text-[8px] bg-white/10 rounded px-1 py-0.5 group hover:bg-white/15 transition-all">
                      <span className="font-black w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-white/20">{sIdx + 1}</span>
                      <span className="truncate flex-1 font-semibold">{song.title || 'Sem título'}</span>
                      {song.has_playback && <span className="bg-white/20 px-1 rounded text-white/70 font-bold">PLAY</span>}
                    </div>
                  ))}
                  {songs.length > 3 && (
                    <p className="text-[8px] opacity-60 px-1 font-bold">+{songs.length - 3} músicas</p>
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
