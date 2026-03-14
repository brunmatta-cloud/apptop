import { Music4, Youtube } from 'lucide-react';
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
    'from-sky-500/20 to-sky-600/10 border-sky-500/30',
    'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    'from-rose-500/20 to-rose-600/10 border-rose-500/30',
  ];
  return colors[index % colors.length];
};

const getMomentColorBg = (index: number): string => {
  const colors = ['bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
  return colors[index % colors.length];
};

export function SonoplastiaMusicCompact({ momentos, songsByMomentId }: Props) {
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
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Music4 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Músicas</span>
        </div>
        <span className="inline-flex rounded-full bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">{totalSongs}</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40">
        {momentsWithSongs.map((momento, momentIdx) => {
          const colorClass = getMomentColor(momentIdx);
          const colorBg = getMomentColorBg(momentIdx);
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []).slice(0, 3); // Max 3 visíveis

          return (
            <div
              key={momento.id}
              className={cn(
                'rounded-lg border bg-gradient-to-r p-2.5 space-y-1.5 text-sm',
                colorClass,
              )}
            >
              {/* Cabeçalho do momento */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('h-2 w-2 rounded-full shrink-0', colorBg)} />
                  <p className="text-xs font-bold truncate">{momento.atividade}</p>
                </div>
                <span className="text-[10px] font-semibold opacity-70">{songsByMomentId[momento.id]?.length ?? 0}</span>
              </div>

              {/* Músicas */}
              {songs.map((song, idx) => (
                <div key={song.id} className="flex items-center gap-2 bg-black/20 rounded p-1 group">
                  <span className="text-[10px] font-bold opacity-70 shrink-0 w-4">{idx + 1}</span>
                  <p className="text-[11px] truncate flex-1 leading-tight">{song.title || 'Sem título'}</p>
                  {song.youtube_url && (
                    <a
                      href={song.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Youtube className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}

              {/* Mais músicas */}
              {(songsByMomentId[momento.id]?.length ?? 0) > 3 && (
                <p className="text-[10px] opacity-60 px-1">+{(songsByMomentId[momento.id]?.length ?? 0) - 3} mais</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
