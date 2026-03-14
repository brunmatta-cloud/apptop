import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, HeartHandshake, Loader2, Music4, Plus, Save, Sparkles } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RepertorioEditor } from '@/components/repertorio/RepertorioEditor';
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [didInitStep, setDidInitStep] = useState(false);

  useEffect(() => {
    if (!bundleQuery.data) {
      return;
    }

    setDraftSongs(sortMomentSongs(bundleQuery.data.songs).map((song) => buildEditableSongDraft(song)));
  }, [bundleQuery.data]);

  useEffect(() => {
    if (!bundleQuery.data || didInitStep) {
      return;
    }

    setCurrentStep(bundleQuery.data.songs.length > 0 ? 2 : 1);
    setDidInitStep(true);
  }, [bundleQuery.data, didInitStep]);

  useEffect(() => {
    setDidInitStep(false);
    setCurrentStep(1);
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);

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
  const cultoStatus = culto?.status ?? 'planejado';
  const hasMomentPassed = Boolean(
    form
    && remoteState.activeCultoId === form.culto_id
    && (
      cultoStatus === 'finalizado'
      || (
        cultoStatus === 'em_andamento'
        && momentoIndex >= 0
        && remoteState.currentIndex > momentoIndex
      )
    ),
  );
  const summary = buildRepertoireSummary({
    momento,
    songs,
    form,
  });
  const { songsCount, songsWithMediaCount, songsWithPlaybackCount } = useRepertoireDraftStats(draftSongs);
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

  useEffect(() => {
    if (!showSavedState || typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showSavedState]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync(sanitizeSongDraftsForSave(draftSongs));
      setShowSavedState(true);
      setCurrentStep(3);
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

  const steps = [
    { id: 1 as const, label: 'Comecar' },
    { id: 2 as const, label: 'Adicionar musicas' },
    { id: 3 as const, label: 'Concluir' },
  ];

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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),hsl(var(--background))] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                IASD da Serraria
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Ministerio OC
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <Music4 className="h-3.5 w-3.5" />
              Repertorio do momento
            </div>
            <h1 className="mt-3 break-words text-2xl font-display font-black sm:text-3xl">
              {momento?.atividade || 'Momento musical'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Plataforma criada pela <span className="font-semibold text-foreground">IASD da Serraria</span>, pelo
              <span className="font-semibold text-foreground"> Ministerio OC</span>, para organizar programacao, culto e repertorio com clareza entre todas as equipes.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {culto?.nome && <span className="rounded-full bg-muted/50 px-3 py-1">{culto.nome}</span>}
              {culto?.data && <span className="rounded-full bg-muted/50 px-3 py-1">{new Date(`${culto.data}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>}
              {momento?.horarioInicio && <span className="rounded-full bg-muted/50 px-3 py-1">{momento.horarioInicio}</span>}
              <span className="rounded-full bg-muted/50 px-3 py-1">{hasMomentPassed ? 'Somente leitura' : 'Edicao liberada'}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  currentStep === step.id
                    ? 'border-primary/35 bg-primary/10 text-primary'
                    : 'border-border/70 bg-muted/20 text-muted-foreground hover:text-foreground'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.22em]">Passo {step.id}</p>
                <p className="mt-1 text-sm font-semibold">{step.label}</p>
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Fluxo simples: entre, adicione as musicas, avance e aperte <span className="font-semibold text-foreground">Salvar repertorio</span> para concluir de verdade.
          </p>
        </div>

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
          {showSavedState ? (
            <>
              <div className="rounded-[2rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.03))] p-6 shadow-[0_18px_50px_-35px_rgba(16,185,129,0.45)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-black">Repertorio salvo com sucesso</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        O repertorio foi concluido e salvo. Abaixo voce ve a revisao do que foi adicionado neste momento.
                      </p>
                      <p className="mt-3 text-sm font-semibold text-emerald-300">{worshipVerse}</p>
                    </div>
                  </div>
                  {!hasMomentPassed && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        setShowSavedState(false);
                        setCurrentStep(2);
                      }}
                    >
                      Voltar a editar
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Revisao do repertorio salvo</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Musicas</p>
                    <p className="mt-1 text-lg font-black text-foreground">{songsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Com midia</p>
                    <p className="mt-1 text-lg font-black text-foreground">{songsWithMediaCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Playback</p>
                    <p className="mt-1 text-lg font-black text-foreground">{songsWithPlaybackCount}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {draftSongs.length > 0 ? draftSongs.map((song, index) => (
                    <div key={song.clientId} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">#{index + 1} {song.title.trim() || 'Musica sem titulo'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {song.hasMedia ? 'Com midia' : 'Sem midia'} • {song.hasPlayback ? 'Com playback' : 'Sem playback'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Nenhuma musica foi adicionada ainda.</p>
                  )}
                </div>
              </div>
            </>
          ) : currentStep === 1 ? (
            <div className="rounded-[2.25rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Passo 1 de 3</p>
              <h2 className="mt-2 text-2xl font-display font-black">Comece por aqui</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Adicione as musicas deste momento como se estivesse navegando em um pequeno app. Quando terminar, avance para a ultima etapa e toque em <span className="font-semibold text-foreground">Salvar repertorio</span> para concluir.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Musicas</p>
                  <p className="mt-1 text-xl font-black">{songsCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Com midia</p>
                  <p className="mt-1 text-xl font-black">{songsWithMediaCount}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/25 px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Playback</p>
                  <p className="mt-1 text-xl font-black">{songsWithPlaybackCount}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={hasMomentPassed}
                  className="h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Comecar a preencher
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="h-12 rounded-2xl"
                >
                  Ir para conclusao
                </Button>
              </div>
            </div>
          ) : null}

          {!showSavedState && currentStep === 2 && (
            <>
              <div className="sticky top-3 z-20 rounded-[1.75rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Passo 2 de 3</p>
                <h2 className="mt-2 text-xl font-display font-black">Adicionar musicas</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Toque em <span className="font-semibold text-foreground">Adicionar musica</span>, preencha os cards e depois avance para a ultima etapa para concluir no botao <span className="font-semibold text-foreground">Salvar repertorio</span>.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    className="h-12 flex-1 rounded-2xl"
                  >
                    Avancar para concluir
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-[2.25rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
                <RepertorioEditor
                  songs={draftSongs}
                  onChange={setDraftSongs}
                  disabled={hasMomentPassed || saveMutation.isPending}
                  helperText="Preencha o titulo, marque se a musica usa midia ou playback e siga para concluir. O envio so acontece quando voce apertar em Salvar repertorio."
                  emptyDescription="Comece adicionando a primeira musica deste momento. A interface foi pensada para ser simples no celular e clara para a equipe."
                  showBottomAddButton={false}
                />

                <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="rounded-2xl"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                  >
                    Ir para conclusao
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {!showSavedState && currentStep === 3 && (
            <>
              <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Resumo de tudo</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Veja primeiro o status geral do repertorio antes de concluir.
                </p>
                <div className="mt-4 rounded-[1.75rem] border border-border/70 bg-card/80 p-4 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.45)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Visao geral</p>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <p>{songsCount} {songsCount === 1 ? 'musica pronta' : 'musicas prontas'}</p>
                    <p>{songsWithMediaCount} com midia</p>
                    <p>{songsWithPlaybackCount} com playback</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border/70 bg-card/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ultima revisao</p>
                <div className="mt-3 space-y-2">
                  {draftSongs.length > 0 ? draftSongs.map((song, index) => (
                    <div key={song.clientId} className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                      <p className="font-semibold text-foreground">#{index + 1} {song.title.trim() || 'Musica sem titulo'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {song.hasMedia ? 'Com midia' : 'Sem midia'} • {song.hasPlayback ? 'Com playback' : 'Sem playback'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">Nenhuma musica foi adicionada ainda.</p>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="rounded-2xl"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para editar
                  </Button>
                  <p className="text-sm text-muted-foreground">{worshipVerse}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0.03))] p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-primary">Passo 3 de 3</p>
                <h2 className="mt-2 text-xl font-display font-black">Concluir repertorio</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Agora finalize. Para concluir de verdade e enviar tudo para a programacao, sonoplastia e cerimonialista, aperte em <span className="font-semibold text-foreground">Salvar repertorio</span>.
                </p>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={hasMomentPassed || saveMutation.isPending || !hasChanges}
                  className="mt-4 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Salvar repertorio
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Se voce sair antes de salvar, as alteracoes nao serao concluidas.
                </p>
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
            </>
          ) : null}

          <div className="rounded-[1.75rem] border border-border/70 bg-card/70 px-4 py-4 text-center text-xs leading-relaxed text-muted-foreground shadow-[0_16px_40px_-34px_rgba(15,23,42,0.45)] sm:px-5">
            <span className="font-semibold text-foreground">App liturgico IASD da Serraria</span>
            {' '}• desenvolvido para uso ministerial pelo <span className="font-semibold text-foreground">Ministerio OC</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicaMomento;
