import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, HeartHandshake, Loader2, Music4, Plus, Save, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RepertorioEditor } from '@/components/repertorio/RepertorioEditor';
import { RepertorioStatusBadge } from '@/components/repertorio/RepertorioStatusBadge';
import {
  buildEditableSongDraft,
  buildRepertoireSummary,
  sanitizeSongDraftsForSave,
  sortMomentSongs,
  type EditableSongDraft,
} from '@/features/repertorio/model';
import {
  useMomentSongBundleByToken,
  useRepertoireDraftStats,
  useSaveMomentRepertoireByTokenMutation,
} from '@/features/repertorio/hooks';

const worshipVerse = '"Servi ao Senhor com alegria." - Salmos 100:2';

const MusicaMomento = () => {
  const { token = '' } = useParams();
  const { remoteState } = useSyncStore();
  const bundleQuery = useMomentSongBundleByToken(token);
  const saveMutation = useSaveMomentRepertoireByTokenMutation(token);
  const [draftSongs, setDraftSongs] = useState<EditableSongDraft[]>([]);
  const [showSavedState, setShowSavedState] = useState(false);

  useEffect(() => {
    if (!bundleQuery.data) {
      return;
    }

    setDraftSongs(sortMomentSongs(bundleQuery.data.songs).map((song) => buildEditableSongDraft(song)));
  }, [bundleQuery.data]);

  const form = bundleQuery.data?.form ?? null;
  const songs = bundleQuery.data?.songs ?? [];
  const culto = useMemo(
    () => form ? remoteState.cultos.find((item) => item.id === form.culto_id) ?? null : null,
    [form, remoteState.cultos],
  );
  const momentosDoCulto = useMemo(
    () => form ? remoteState.allMomentos[form.culto_id] ?? [] : [],
    [form, remoteState.allMomentos],
  );
  const momento = useMemo(
    () => form ? momentosDoCulto.find((item) => item.id === form.momento_id) ?? null : null,
    [form, momentosDoCulto],
  );
  const momentoIndex = useMemo(
    () => momento ? momentosDoCulto.findIndex((item) => item.id === momento.id) : -1,
    [momento, momentosDoCulto],
  );
  const hasMomentPassed = Boolean(
    form
    && remoteState.activeCultoId === form.culto_id
    && (
      remoteState.status === 'finished'
      || remoteState.timerStatus === 'finished'
      || (momentoIndex >= 0 && remoteState.currentIndex > momentoIndex)
    ),
  );
  const summary = buildRepertoireSummary({
    momento,
    songs,
    form,
  });
  const { songsCount, totalDurationSeconds } = useRepertoireDraftStats(draftSongs);
  const hasChanges = useMemo(() => {
    const current = JSON.stringify(sanitizeSongDraftsForSave(draftSongs));
    const existing = JSON.stringify(sanitizeSongDraftsForSave(sortMomentSongs(songs).map((song) => buildEditableSongDraft(song))));
    return current !== existing;
  }, [draftSongs, songs]);

  useEffect(() => {
    if (hasChanges) {
      setShowSavedState(false);
    }
  }, [hasChanges]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(sanitizeSongDraftsForSave(draftSongs));
      setShowSavedState(true);
      toast({
        title: 'Repertorio salvo com sucesso',
        description: 'Obrigado por contribuir com a organizacao deste momento do culto.',
      });
    } catch {
      setShowSavedState(false);
      toast({
        title: 'Nao foi possivel salvar agora',
        description: 'Revise os dados e tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const addSong = () => {
    setDraftSongs((current) => [...current, buildEditableSongDraft()]);
  };

  if (bundleQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_32%),hsl(var(--background))] px-4 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-center rounded-[2rem] border border-border/70 bg-card/70 p-10 shadow-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Carregando repertorio...</span>
        </div>
      </div>
    );
  }

  if (bundleQuery.error || !form) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.1),transparent_30%),hsl(var(--background))] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-500/20 bg-card/90 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Music4 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-display font-black">Link de repertorio indisponivel</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {bundleQuery.error instanceof Error
              ? bundleQuery.error.message
              : 'Este link nao esta mais disponivel ou ainda nao foi preparado na programacao.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),hsl(var(--background))] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                <Music4 className="h-3.5 w-3.5" />
                Repertorio do momento
              </div>
              <h1 className="mt-3 break-words text-2xl font-display font-black sm:text-3xl">
                {momento?.atividade || 'Momento musical'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                {culto?.nome && <span className="rounded-full bg-muted/50 px-3 py-1">{culto.nome}</span>}
                {culto?.data && <span className="rounded-full bg-muted/50 px-3 py-1">{new Date(`${culto.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>}
                {momento?.horarioInicio && <span className="rounded-full bg-muted/50 px-3 py-1">{momento.horarioInicio}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Musicas</p>
                <p className="mt-1 text-lg font-black sm:text-xl">{songsCount}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Duracao</p>
                <p className="mt-1 text-lg font-black sm:text-xl">{Math.floor(totalDurationSeconds / 60)} min</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Respons.</p>
                <p className="mt-1 truncate text-sm font-semibold">{momento?.responsavel || 'Equipe'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-semibold">{hasMomentPassed ? 'Somente leitura' : 'Edicao liberada'}</p>
              </div>
            </div>
          </div>
        </div>

        {showSavedState && (
          <div className="rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.03))] p-6 shadow-[0_18px_50px_-35px_rgba(16,185,129,0.45)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black">Repertorio salvo com sucesso</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Muito obrigado por contribuir com a organizacao deste culto. Sua colaboracao ajuda a equipe a servir com ordem, clareza e excelencia.
                  </p>
                  <p className="mt-3 text-sm font-semibold text-emerald-300">{worshipVerse}</p>
                </div>
              </div>
              {!hasMomentPassed && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setShowSavedState(false)}
                >
                  Continuar editando
                </Button>
              )}
            </div>
          </div>
        )}

        {hasMomentPassed && (
          <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3">
              <HeartHandshake className="mt-0.5 h-5 w-5 text-amber-300" />
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Momento concluido</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Este momento musical ja passou na execucao do culto. O repertorio segue visivel, mas nao pode mais ser alterado por este link.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="sticky top-3 z-20 rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={addSong}
                disabled={hasMomentPassed || saveMutation.isPending}
                className="h-12 flex-1 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar musica
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={hasMomentPassed || saveMutation.isPending || !hasChanges}
                className="h-12 flex-1 rounded-2xl bg-foreground text-background hover:bg-foreground/90"
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar repertorio
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>O principal aqui e simples: adicionar as musicas e salvar.</span>
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Edicao guiada</p>
                <h2 className="mt-1 text-xl font-display font-black sm:text-2xl">Lista de musicas</h2>
              </div>
              <div className="hidden rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Edicao leve e rapida
              </div>
            </div>

            <RepertorioEditor
              songs={draftSongs}
              onChange={setDraftSongs}
              disabled={hasMomentPassed || saveMutation.isPending}
              helperText="Preencha primeiro o titulo. Duracao, YouTube e observacoes ajudam a equipe, mas sao opcionais."
              emptyDescription="Comece adicionando a primeira musica deste momento. A interface foi pensada para ser simples no celular e clara para a equipe."
              showBottomAddButton={false}
            />

            <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <p>{songsCount} {songsCount === 1 ? 'musica pronta' : 'musicas prontas'} para este momento.</p>
                <p className="mt-1">{worshipVerse}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.9fr)]">
            <RepertorioStatusBadge summary={summary} />
            <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Ajuda rapida</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>1. Toque em adicionar musica.</p>
                <p>2. Preencha pelo menos o titulo.</p>
                <p>3. Salve para atualizar o restante do sistema.</p>
              </div>
              {form.token && (
                <a
                  href={window.location.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Este link pode ser reutilizado ate o momento acontecer
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicaMomento;
