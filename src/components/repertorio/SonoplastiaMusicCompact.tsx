import { Music4, Youtube } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { MomentSong } from '@/features/repertorio/model';
import { getSongMediaLabel, getSongPlaybackLabel, sortMomentSongs } from '@/features/repertorio/model';
import type { MomentoProgramacao } from '@/types/culto';

type Props = {
  momentos: MomentoProgramacao[];
  songsByMomentId: Record<string, MomentSong[]>;
};

const getMomentColor = (index: number): string => {
  const colors = [
    'from-cyan-500/25 to-blue-600/10 border-cyan-500/40 text-cyan-100',
    'from-purple-500/25 to-purple-600/10 border-purple-500/40 text-purple-100',
    'from-emerald-500/25 to-emerald-600/10 border-emerald-500/40 text-emerald-100',
    'from-amber-500/25 to-orange-600/10 border-amber-500/40 text-amber-100',
    'from-rose-500/25 to-rose-600/10 border-rose-500/40 text-rose-100',
  ];
  return colors[index % colors.length];
};

export function SonoplastiaMusicCompact({ momentos, songsByMomentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const momentsWithSongs = momentos.filter((m) => (songsByMomentId[m.id]?.length ?? 0) > 0);
  const totalSongs = momentsWithSongs.reduce((sum, m) => sum + (songsByMomentId[m.id]?.length ?? 0), 0);

  if (momentsWithSongs.length === 0) {
    return (
      <div className="glass-card p-3 sm:p-4 text-center">
        <Music4 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs text-muted-foreground">Nenhuma música adicionada</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-2.5 sm:p-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <Music4 className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-wide text-yellow-200">Músicas</span>
        </div>
        <span className="inline-flex rounded-full bg-yellow-500/30 px-2 py-0.5 text-[9px] font-black text-yellow-100 border border-yellow-500/40">{totalSongs}</span>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1.5 space-y-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40"
      >
        {momentsWithSongs.map((momento, momentIdx) => {
          const colorClass = getMomentColor(momentIdx);
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []);

          return (
            <div
              key={momento.id}
              className={cn(
                'rounded-lg border bg-gradient-to-r p-2 space-y-1 transition-all hover:shadow-lg',
                colorClass,
              )}
            >
              {/* Cabeçalho do momento */}
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black truncate leading-tight">{momento.atividade}</p>
                  <p className="text-[8px] opacity-70 font-semibold">{momento.horarioInicio}</p>
                </div>
                <span className="text-[9px] font-black opacity-80 bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
                </span>
              </div>

              {/* Músicas (até 4) */}
              <div className="space-y-0.5 pt-0.5">
                {songs.slice(0, 4).map((song, idx) => (
                  <div key={song.id} className="flex items-center gap-1 bg-black/25 rounded px-1  py-0.5 group hover:bg-black/35 transition-all text-[8px]">
                    <span className="font-black w-3 h-3 flex items-center justify-center bg-white/25 rounded-sm shrink-0">{idx + 1}</span>
                    <p className="truncate flex-1 font-semibold leading-tight text-white/90">{song.title || 'Sem título'}</p>
                    
                    {/* Badges compactos */}
                    <div className="flex gap-0.5 shrink-0">
                      {song.has_playback && (
                        <span className="bg-white/20 px-1 rounded text-white/70 font-bold">▶</span>
                      )}
                      {song.has_media && (
                        <span className="bg-white/20 px-1 rounded text-white/70 font-bold">🎨</span>
                      )}
                    </div>

                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="opacity-50 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Youtube className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Mais músicas */}
              {songs.length > 4 && (
                <p className="text-[8px] opacity-60 px-1 font-bold pt-0.5">+{songs.length - 4} {songs.length - 4 === 1 ? 'música' : 'músicas'}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
