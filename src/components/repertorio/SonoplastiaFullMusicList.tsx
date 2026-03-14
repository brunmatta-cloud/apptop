import { Music4, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MomentSong } from '@/features/repertorio/model';
import { getSongMediaLabel, getSongPlaybackLabel, sortMomentSongs } from '@/features/repertorio/model';
import type { MomentoProgramacao } from '@/types/culto';

type Props = {
  momentos: MomentoProgramacao[];
  songsByMomentId: Record<string, MomentSong[]>;
};

// Cores para diferentes momentos (em sequência visual)
const getMomentColor = (index: number): string => {
  const colors = [
    'border-sky-500/30 bg-sky-500/10 text-sky-300',
    'border-purple-500/30 bg-purple-500/10 text-purple-300',
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    'border-amber-500/30 bg-amber-500/10 text-amber-300',
    'border-rose-500/30 bg-rose-500/10 text-rose-300',
    'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    'border-pink-500/30 bg-pink-500/10 text-pink-300',
    'border-lime-500/30 bg-lime-500/10 text-lime-300',
  ];
  return colors[index % colors.length];
};

const getMomentColorDot = (index: number): string => {
  const colors = [
    'bg-sky-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-lime-500',
  ];
  return colors[index % colors.length];
};

export function SonoplastiaFullMusicList({ momentos, songsByMomentId }: Props) {
  // Filtrar apenas momentos que têm músicas
  const momentsWithSongs = momentos.filter((m) => (songsByMomentId[m.id]?.length ?? 0) > 0);

  if (momentsWithSongs.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Music4 className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm text-muted-foreground">Nenhuma música adicionada ainda</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Music4 className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lista completa de músicas ({momentsWithSongs.reduce((sum, m) => sum + (songsByMomentId[m.id]?.length ?? 0), 0)})
        </span>
      </div>

      <div className="space-y-4">
        {momentsWithSongs.map((momento, momentIndex) => {
          const songs = sortMomentSongs(songsByMomentId[momento.id] ?? []);
          const colorClass = getMomentColor(momentIndex);
          const colorDot = getMomentColorDot(momentIndex);

          return (
            <div key={momento.id} className={cn('rounded-xl border p-3 sm:p-4', colorClass)}>
              {/* Cabeçalho do Momento */}
              <div className="mb-3 flex items-start justify-between gap-2 border-b border-current/20 pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', colorDot)} />
                    <p className="truncate font-semibold">{momento.atividade}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-black/20 px-2 py-0.5">{momento.horarioInicio}</span>
                    <span className="rounded-full bg-black/20 px-2 py-0.5">{momento.responsavel || 'Equipe'}</span>
                  </div>
                </div>
                <div className="shrink-0 rounded-lg bg-black/20 px-2 py-1 text-right text-xs font-semibold">
                  {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
                </div>
              </div>

              {/* Lista de Músicas */}
              <div className="space-y-2">
                {songs.map((song, songIndex) => (
                  <div
                    key={song.id}
                    className="flex items-start gap-3 rounded-lg bg-black/10 p-2 text-sm transition-colors hover:bg-black/20"
                  >
                    {/* Números da sequência */}
                    <div className="flex shrink-0 items-center justify-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-black/30 text-xs font-bold">
                        {songIndex + 1}
                      </span>
                    </div>

                    {/* Informações da música */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold leading-tight">
                        {song.title || 'Música sem título'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span className="inline-flex rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                          #{song.position + 1}
                        </span>
                        {song.has_media && (
                          <span className="inline-flex rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                            {getSongMediaLabel(true)}
                          </span>
                        )}
                        {song.has_playback && (
                          <span className="inline-flex rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                            {getSongPlaybackLabel(true)}
                          </span>
                        )}
                        {song.duration_seconds && (
                          <span className="inline-flex rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                            {Math.floor(song.duration_seconds / 60)}:{String(song.duration_seconds % 60).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      {song.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-current/70">{song.notes}</p>
                      )}
                    </div>

                    {/* Link do YouTube */}
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-lg bg-black/30 p-2 transition-colors hover:bg-black/50"
                        aria-label="Abrir YouTube"
                        title="Abrir no YouTube"
                      >
                        <Youtube className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
