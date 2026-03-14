import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Link2, MessageSquareText, Music4, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  buildEditableSongDraft,
  type EditableSongDraft,
} from '@/features/repertorio/model';

type RepertorioEditorProps = {
  songs: EditableSongDraft[];
  onChange: (songs: EditableSongDraft[]) => void;
  disabled?: boolean;
  helperText?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  showBottomAddButton?: boolean;
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, removed);
  return next;
};

export function RepertorioEditor({
  songs,
  onChange,
  disabled = false,
  helperText,
  emptyTitle = 'Nenhuma musica adicionada ainda',
  emptyDescription = 'Monte a ordem do repertorio, marque se cada musica usa midia ou playback e inclua links do YouTube se quiser ajudar a sonoplastia.',
  showBottomAddButton = true,
}: RepertorioEditorProps) {
  const [draggingClientId, setDraggingClientId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const canDrag = !disabled && !isMobile;

  const orderedSongs = useMemo(() => songs.map((song, index) => ({ ...song, order: index })), [songs]);

  const updateSong = (clientId: string, patch: Partial<EditableSongDraft>) => {
    onChange(songs.map((song) => song.clientId === clientId ? { ...song, ...patch } : song));
  };

  const addSong = () => {
    onChange([...songs, buildEditableSongDraft()]);
  };

  const removeSong = (clientId: string) => {
    onChange(songs.filter((song) => song.clientId !== clientId));
  };

  const reorderSongs = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= songs.length) {
      return;
    }

    onChange(moveItem(songs, fromIndex, toIndex));
  };

  return (
    <div className="space-y-4">
      {helperText && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {helperText}
        </div>
      )}

      {orderedSongs.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-border/70 bg-muted/20 px-5 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Music4 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-display font-bold">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedSongs.map((song, index) => (
            <div key={song.clientId} className="space-y-3">
              <article
                draggable={canDrag}
                onDragStart={() => {
                  if (!canDrag) {
                    return;
                  }
                  setDraggingClientId(song.clientId);
                }}
                onDragEnd={() => setDraggingClientId(null)}
                onDragOver={(event) => {
                  if (canDrag) {
                    event.preventDefault();
                  }
                }}
                onDrop={() => {
                  if (!canDrag || !draggingClientId) {
                    return;
                  }

                  const fromIndex = songs.findIndex((item) => item.clientId === draggingClientId);
                  reorderSongs(fromIndex, index);
                  setDraggingClientId(null);
                }}
                className={cn(
                  'rounded-[1.75rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(248,250,252,0.72)_100%)] p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.55)] transition-colors dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.82)_100%)]',
                  draggingClientId === song.clientId && 'border-primary/40 bg-primary/5',
                )}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <span className="font-mono text-sm font-black">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Musica</p>
                        <p className="text-sm font-semibold text-foreground">
                          {song.title.trim() || `Item ${index + 1}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      <button
                        type="button"
                        disabled={disabled || index === 0}
                        onClick={() => reorderSongs(index, index - 1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Mover musica para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || index === songs.length - 1}
                        onClick={() => reorderSongs(index, index + 1)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Mover musica para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <span className="hidden items-center gap-1 rounded-xl border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground lg:inline-flex">
                        <GripVertical className="h-3.5 w-3.5" />
                        Arraste
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeSong(song.clientId)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-colors hover:bg-rose-500/20 disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Remover musica"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Titulo</span>
                      <Input
                        value={song.title}
                        disabled={disabled}
                        onChange={(event) => updateSong(song.clientId, { title: event.target.value })}
                        placeholder="Ex.: Porque Ele Vive"
                        className="h-12 rounded-2xl border-border/70 bg-muted/30"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Midia</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={song.hasMedia}
                            onClick={() => updateSong(song.clientId, { hasMedia: true })}
                            className={cn(
                              'h-12 rounded-2xl border px-3 text-sm font-semibold transition-colors',
                              song.hasMedia
                                ? 'border-primary/40 bg-primary/12 text-primary'
                                : 'border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Com midia
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={!song.hasMedia}
                            onClick={() => updateSong(song.clientId, { hasMedia: false })}
                            className={cn(
                              'h-12 rounded-2xl border px-3 text-sm font-semibold transition-colors',
                              !song.hasMedia
                                ? 'border-primary/40 bg-primary/12 text-primary'
                                : 'border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Sem midia
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Playback</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={song.hasPlayback}
                            onClick={() => updateSong(song.clientId, { hasPlayback: true })}
                            className={cn(
                              'h-12 rounded-2xl border px-3 text-sm font-semibold transition-colors',
                              song.hasPlayback
                                ? 'border-primary/40 bg-primary/12 text-primary'
                                : 'border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Com playback
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-pressed={!song.hasPlayback}
                            onClick={() => updateSong(song.clientId, { hasPlayback: false })}
                            className={cn(
                              'h-12 rounded-2xl border px-3 text-sm font-semibold transition-colors',
                              !song.hasPlayback
                                ? 'border-primary/40 bg-primary/12 text-primary'
                                : 'border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Sem playback
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        Link do YouTube
                      </span>
                      <Input
                        value={song.youtubeUrl}
                        disabled={disabled}
                        onChange={(event) => updateSong(song.clientId, { youtubeUrl: event.target.value })}
                        placeholder="https://youtube.com/..."
                        className="h-12 rounded-2xl border-border/70 bg-muted/30"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        <MessageSquareText className="h-3.5 w-3.5" />
                        Observacoes
                      </span>
                      <Textarea
                        value={song.notes}
                        disabled={disabled}
                        onChange={(event) => updateSong(song.clientId, { notes: event.target.value })}
                        placeholder="Tonalidade, introducao, playback, referencia..."
                        className="min-h-[90px] rounded-2xl border-border/70 bg-muted/30"
                      />
                    </label>
                  </div>
                </div>
              </article>

              {index === orderedSongs.length - 1 && !disabled ? (
                <Button
                  type="button"
                  onClick={addSong}
                  variant="outline"
                  className="h-12 w-full rounded-2xl border-dashed border-primary/35 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar mais musica
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {showBottomAddButton && orderedSongs.length === 0 && (
        <Button
          type="button"
          disabled={disabled}
          onClick={addSong}
          className="h-12 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar musica
        </Button>
      )}
    </div>
  );
}
