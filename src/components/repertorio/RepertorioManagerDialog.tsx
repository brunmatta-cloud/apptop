import { useEffect, useMemo, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
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

  const generateLink = async () => {
    try {
      const ensured = resolvedForm ?? await ensureFormMutation.mutateAsync({
        cultoId: momento.cultoId,
        momentoId: momento.id,
      });
      toast({
        title: 'Link gerado com sucesso',
        description: 'Agora voce pode copiar e compartilhar o link com a equipe.',
      });
    } catch (error) {
      toast({
        title: 'Nao foi possivel gerar o link',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
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
        className="left-0 right-0 top-auto bottom-0 h-[95dvh] w-full translate-x-0 translate-y-0 overflow-hidden rounded-t-2xl rounded-b-none border-border/70 p-0 sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:max-w-2xl lg:max-w-4xl"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {/* Main scrollable container */}
        <div 
          ref={containerRef}
          className="flex h-full w-full flex-col overflow-y-auto sm:h-auto sm:max-h-[90vh] [scrollbar-width:thin] [-ms-overflow-style:auto] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb]:hover:bg-border/60"
        >
          {/* Header - inside scrollable container */}
          <div className="sticky top-0 z-10 border-b border-border/60 bg-gradient-to-b from-background via-background to-background/95 px-4 py-4 sm:px-6 sm:py-5 backdrop-blur-sm">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Playlist
                </div>
                {resolvedForm?.token && (
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Link2 className="h-3 w-3" />
                    Link pronto
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div>
                <DialogTitle className="max-w-2xl text-xl font-display font-bold sm:text-2xl">
                  {momento.atividade}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Gerencie o repertorio sem sair da programacao.
                </DialogDescription>
              </div>
            </DialogHeader>

            {/* Info Cards */}
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsavel</p>
                  <p className="mt-0.5 truncate text-xs font-semibold">{momento.responsavel || 'Nao'}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ministerio</p>
                  <p className="mt-0.5 truncate text-xs font-semibold">{momento.ministerio || 'Louvor'}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Musicas</p>
                  <p className="mt-0.5 text-xs font-semibold">{songsCount}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Com midia</p>
                  <p className="mt-0.5 text-xs font-semibold">{songsWithMediaCount}</p>
                </div>
              </div>

              {/* Status Badge and Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <RepertorioStatusBadge summary={summary} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={addSong}
                    disabled={saveMutation.isPending}
                    className="flex-1 h-9 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:flex-none sm:px-3"
                    size="sm"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !hasChanges}
                    className="flex-1 h-9 rounded-lg bg-foreground text-xs font-semibold text-background hover:bg-foreground/90 sm:flex-none sm:px-3"
                    size="sm"
                  >
                    {saveMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Content - scrolls with everything */}
          <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5">
            <RepertorioEditor
              songs={draftSongs}
              onChange={setDraftSongs}
              disabled={saveMutation.isPending}
              helperText="Edite as musicas, marque midia e playback. YouTube e observacoes sao opcionais."
              showBottomAddButton={false}
            />
          </div>

          {/* Footer - inside scrollable container, sticky at bottom */}
          <div className="sticky bottom-0 z-10 border-t border-border/60 bg-gradient-to-t from-background via-background to-background/95 px-4 py-3 sm:px-6 sm:py-3 backdrop-blur-sm">
            <div className="flex w-full flex-col gap-2 text-xs sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="hidden sm:inline">Sync real</span>
                </span>
                {!resolvedForm?.token && (
                  <button
                    type="button"
                    onClick={generateLink}
                    disabled={ensureFormMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {ensureFormMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                    <span className="hidden sm:inline">Gerar link</span>
                  </button>
                )}
                {resolvedForm?.token && (
                  <button
                    type="button"
                    onClick={copyLink}
                    disabled={!resolvedForm.token}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <Copy className="h-3 w-3" />
                    <span className="hidden sm:inline">Copiar link</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
