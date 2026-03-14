import { CheckCircle2, Clock, Music4 } from 'lucide-react';
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

const getMomentStatusColor = (status: 'completed' | 'upcoming' | 'next'): string => {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'next':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    default:
      return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }
};

export function UpcomingMomentsPreview({
  momentos,
  currentIndex,
  completedMoments,
  songsByMomentId,
}: Props) {
  // Mostrar próximos 5 momentos
  const upcomingMoments = momentos.slice(currentIndex + 1, currentIndex + 6);

  if (upcomingMoments.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs text-muted-foreground">Sem mais momentos programados</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/60">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Próximos Momentos
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40">
        {upcomingMoments.map((momento, idx) => {
          const isNext = idx === 0;
          const isCompleted = completedMoments.has(momento.id);
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []);
          const status = isCompleted ? 'completed' : isNext ? 'next' : 'upcoming';

          return (
            <div
              key={momento.id}
              className={cn(
                'rounded-lg border p-2.5 text-sm transition-all hover:brightness-110',
                getMomentStatusColor(status),
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{momento.atividade}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] opacity-75">
                    <Clock className="h-3 w-3" />
                    {momento.horarioInicio}
                  </div>
                </div>

                {isNext && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/30 shrink-0">
                    PRÓXIMA
                  </span>
                )}
              </div>

              {/* Info compacta */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="opacity-70">{momento.responsavel || 'Equipe'}</span>
                {songs.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/20 rounded">
                    <Music4 className="h-3 w-3" />
                    {songs.length}
                  </span>
                )}
              </div>

              {/* Ação se houver */}
              {momento.acaoSonoplastia && (
                <p className="mt-1.5 text-[11px] leading-tight opacity-80 line-clamp-1 bg-black/20 rounded px-1.5 py-1">
                  {momento.acaoSonoplastia}
                </p>
              )}

              {/* Músicas (até 2) */}
              {songs.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {songs.slice(0, 2).map((song, sIdx) => (
                    <div key={song.id} className="flex items-center gap-1.5 text-[10px] bg-black/20 rounded px-1.5 py-1">
                      <span className="font-bold w-4">{sIdx + 1}</span>
                      <span className="truncate flex-1">{song.title || 'Sem título'}</span>
                    </div>
                  ))}
                  {songs.length > 2 && <p className="text-[10px] opacity-60 px-1">+{songs.length - 2} músicas</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
