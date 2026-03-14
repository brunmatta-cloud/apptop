import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Link2, Loader2, Plus, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RepertorioEditor } from '@/components/repertorio/RepertorioEditor';
import { RepertorioStatusBadge } from '@/components/repertorio/RepertorioStatusBadge';
import {
  buildEditableSongDraft,
  sanitizeSongDraftsForSave,
  sortMomentSongs,
  type EditableSongDraft,
  type MomentSong,
  type MomentSongForm,
  type RepertoireSummary,
} from '@/features/repertorio/model';
import {
  useEnsureMomentSongFormMutation,
  useRepertoireDraftStats,
  useSaveMomentRepertoireMutation,
} from '@/features/repertorio/hooks';
import type { MomentoProgramacao } from '@/types/culto';

type RepertorioManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  momento: MomentoProgramacao | null;
  songs: MomentSong[];
  form?: MomentSongForm | null;
  summary: RepertoireSummary | null;
};

const createMomentLink = (token: string) => {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/musica/${token}`;
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const tempInput = document.createElement('input');
  tempInput.value = value;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
};

export function RepertorioManagerDialog({
  open,
  onOpenChange,
  momento,
  songs,
  form,
  summary,
}: RepertorioManagerDialogProps) {
  const [draftSongs, setDraftSongs] = useState<EditableSongDraft[]>([]);
  const ensureFormMutation = useEnsureMomentSongFormMutation();
  const saveMutation = useSaveMomentRepertoireMutation();
  const { songsCount, songsWithMediaCount, songsWithPlaybackCount } = useRepertoireDraftStats(draftSongs);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraftSongs(sortMomentSongs(songs).map((song) => buildEditableSongDraft(song)));
  }, [open, songs]);

  const resolvedForm = form ?? ensureFormMutation.data ?? null;
  const linkUrl = resolvedForm?.token ? createMomentLink(resolvedForm.token) : '';
  const hasChanges = useMemo(() => {
    const current = JSON.stringify(sanitizeSongDraftsForSave(draftSongs));
    const existing = JSON.stringify(sanitizeSongDraftsForSave(sortMomentSongs(songs).map((song) => buildEditableSongDraft(song))));
    return current !== existing;
  }, [draftSongs, songs]);

  if (!momento || !summary) {
    return null;
  }

  const addSong = () => {
    setDraftSongs((current) => [...current, buildEditableSongDraft()]);
  };

  const copyLink = async () => {
    try {
      const ensured = resolvedForm ?? await ensureFormMutation.mutateAsync({
        cultoId: momento.cultoId,
        momentoId: momento.id,
      });
      const url = createMomentLink(ensured.token);
      await copyText(url);
      toast({
        title: 'Link do repertorio copiado',
        description: 'Envie este link para a equipe de louvor preencher as musicas deste momento.',
      });
    } catch (error) {
      toast({
        title: 'Nao foi possivel copiar o link',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        cultoId: momento.cultoId,
        momentoId: momento.id,
        songs: sanitizeSongDraftsForSave(draftSongs),
      });

      toast({
        title: 'Repertorio salvo',
        description: 'Programacao, sonoplastia e cerimonialista ja receberam a atualizacao.',
      });
    } catch (error) {
      toast({
        title: 'Nao foi possivel salvar o repertorio',
        description: error instanceof Error ? error.message : 'Revise os dados e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="left-0 right-0 top-auto bottom-0 h-dvh max-h-[95dvh] w-full translate-x-0 translate-y-0 overflow-hidden rounded-t-[2rem] rounded-b-none border-border/70 p-0 sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[2rem] sm:max-w-[min(98vw,80rem)]"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="flex h-full w-full flex-col overflow-hidden sm:h-auto sm:max-h-[90vh]">
          <div className="relative shrink-0 border-b border-border/60 bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0.02))] px-4 py-4 sm:px-6 sm:py-5">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Playlist do momento
                </div>
                {resolvedForm?.token && (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Link externo pronto
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div>
                <DialogTitle className="pr-10 text-2xl font-display font-black sm:text-3xl">
                  {momento.atividade}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  Adicione e salve as musicas deste momento sem sair da programacao.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Responsavel</p>
                  <p className="mt-1 truncate text-sm font-semibold">{momento.responsavel || 'Nao informado'}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Minis.</p>
                  <p className="mt-1 truncate text-sm font-semibold">{momento.ministerio || 'Louvor'}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Musicas</p>
                  <p className="mt-1 text-sm font-semibold">{songsCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Com midia</p>
                  <p className="mt-1 text-sm font-semibold">{songsWithMediaCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Playback</p>
                  <p className="mt-1 text-sm font-semibold">{songsWithPlaybackCount}</p>
                </div>
              </div>
              <RepertorioStatusBadge summary={summary} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={addSong}
                disabled={saveMutation.isPending}
                className="h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar musica
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending || !hasChanges}
                className="h-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar repertorio
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin] [-ms-overflow-style:auto] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:hover:bg-border/60 sm:px-6 sm:py-5">
            <RepertorioEditor
              songs={draftSongs}
              onChange={setDraftSongs}
              disabled={saveMutation.isPending}
              helperText="Preencha o titulo, marque se a musica usa midia ou playback e salve. Link do YouTube e observacoes seguem opcionais."
              showBottomAddButton={false}
            />
          </div>

          <DialogFooter className="relative shrink-0 border-t border-border/60 bg-card/95 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex w-full flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Mudancas sincronizadas em tempo real
                </span>
                {resolvedForm?.token && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5">
                    <Link2 className="h-4 w-4 text-primary" />
                    Link pronto para o louvor
                  </span>
                )}
              </div>

              <div className="grid gap-2 sm:flex sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyLink}
                  disabled={ensureFormMutation.isPending || saveMutation.isPending}
                  className="rounded-2xl"
                >
                  {ensureFormMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                  Copiar link do louvor
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !hasChanges}
                  className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar repertorio
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
