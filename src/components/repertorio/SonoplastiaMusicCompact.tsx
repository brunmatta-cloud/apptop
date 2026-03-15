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
      <div className="glass-card p-4 sm:p-5 text-center">
        <Music4 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs text-muted-foreground">Nenhuma música adicionada</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 h-full flex flex-col rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-br from-amber-900/20 via-yellow-900/15 to-orange-900/10 shadow-2xl shadow-yellow-600/20 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-3 border-b-2 border-yellow-400/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <Music4 className="h-5 w-5 text-yellow-300 drop-shadow-lg" />
          <span className="text-sm font-black uppercase tracking-widest text-yellow-200 drop-shadow-lg">♪ Músicas</span>
        </div>
        <span className="inline-flex rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 px-3 py-1.5 text-sm font-black text-yellow-950 border-2 border-yellow-300/60 shadow-lg shadow-yellow-500/40 drop-shadow">{totalSongs}</span>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 space-y-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {momentsWithSongs.map((momento, momentIdx) => {
          const colorClass = getMomentColor(momentIdx);
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []);

          return (
            <div
              key={momento.id}
              className={cn(
                'rounded-xl border-2 bg-gradient-to-r p-3.5 space-y-2.5 transition-all hover:shadow-xl hover:scale-[1.01]',
                colorClass,
              )}
            >
              {/* Cabeçalho do momento */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black truncate leading-tight text-white drop-shadow-lg">{momento.atividade}</p>
                  <p className="text-xs opacity-85 font-bold mt-0.5 text-white/90">🕐 {momento.horarioInicio}</p>
                </div>
                <span className="text-lg font-black opacity-95 bg-white/40 px-3.5 py-1.5 rounded-lg whitespace-nowrap text-white border-2 border-white/50 shadow-lg drop-shadow">
                  {songs.length}
                </span>
              </div>

              {/* Músicas - Tamanho Grande e Legível */}
              <div className="space-y-2 pt-1.5 border-t-2 border-white/30">
                {songs.map((song, idx) => (
                  <div key={song.id} className="flex items-center gap-2.5 bg-black/35 rounded-lg px-3 py-2.5 group hover:bg-black/45 transition-all border border-white/20">
                    <span className="font-black text-base w-8 h-8 flex items-center justify-center bg-gradient-to-br from-white/50 to-white/40 rounded-lg shrink-0 text-black font-display drop-shadow shadow-lg">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-tight text-white truncate drop-shadow">{song.title || 'Sem título'}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {song.has_playback && (
                          <span className="bg-emerald-500/50 border-2 border-emerald-400/70 px-2.5 py-1 rounded-lg text-[10px] text-emerald-100 font-bold drop-shadow shadow">▶ PLAY</span>
                        )}
                        {song.has_media && (
                          <span className="bg-blue-500/50 border-2 border-blue-400/70 px-2.5 py-1 rounded-lg text-[10px] text-blue-100 font-bold drop-shadow shadow">🎨 ARTE</span>
                        )}
                      </div>
                    </div>

                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0 hover:scale-110"
                      >
                        <Youtube className="h-5 w-5 text-yellow-300 drop-shadow-lg" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Contador de mais músicas */}
              {songs.length > 5 && (
                <p className="text-xs opacity-80 px-2 font-bold pt-1 text-white/85">↓ Deslize para ver +{songs.length - 5}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
