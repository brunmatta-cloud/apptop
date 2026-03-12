import { useMemo, useState } from 'react';
import { useCulto, useCultoTimer } from '@/contexts/CultoContext';
import { calcularHorarioTermino } from '@/types/culto';
import { Plus, Edit2, Copy, Trash2, Calendar, Clock, ChevronRight, FileSpreadsheet, ImageDown } from 'lucide-react';
import type { Culto, MomentoProgramacao, TipoMomento, TipoMidia } from '@/types/culto';
import { exportarProgramacao } from '@/utils/exportProgramacao';
import { exportarProgramacaoImagem } from '@/utils/exportProgramacaoImagem';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { useIsMobile } from '@/hooks/use-mobile';

const TIPOS_MOMENTO: TipoMomento[] = ['musica_ao_vivo', 'playback', 'video', 'vinheta', 'oracao', 'fala', 'aviso', 'fundo_musical', 'nenhum'];

const emptyMomento = (cultoId: string, ordem: number): MomentoProgramacao => ({
  id: crypto.randomUUID(),
  cultoId,
  ordem,
  bloco: '',
  horarioInicio: '19:00',
  duracao: 5,
  atividade: '',
  responsavel: '',
  ministerio: '',
  funcao: '',
  fotoUrl: '',
  tipoMomento: 'nenhum',
  tipoMidia: 'nenhum',
  acaoSonoplastia: '',
  observacao: '',
  antecedenciaChamada: 10,
  chamado: false,
});

const emptyCulto = (): Culto => ({
  id: crypto.randomUUID(),
  nome: '',
  data: new Date().toISOString().split('T')[0],
  horarioInicial: '19:00',
  duracaoPrevista: 90,
  status: 'planejado',
});

const ExecutingMomentProgress = ({ momento }: { momento: MomentoProgramacao }) => {
  const { currentIndex, momentos } = useCulto();
  const { momentElapsedMs, isPaused } = useCultoTimer();
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const effectiveElapsedMs = currentMoment?.id === momento.id ? safeMomentElapsedMs : 0;
  const { percent, progressScale, formattedRemaining } = useMomentProgress(momento, effectiveElapsedMs);
  const displayPercent = Math.round(percent);

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{displayPercent}%</span>
        <span>{isPaused ? `${formattedRemaining} pausado` : `${formattedRemaining} restantes`}</span>
      </div>
      <div className="progress-bar h-2">
        <div
          className="progress-bar-fill"
          style={{
            transform: `scaleX(${progressScale})`,
            transformOrigin: 'left',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};

const Programacao = () => {
  const isMobile = useIsMobile();
  const {
    cultos, addCulto, updateCulto, removeCulto, duplicateCulto,
    activeCultoId, setActiveCultoId,
    culto, momentos, addMomento, updateMomento, removeMomento,
    getMomentStatus, isSubmitting, lastError,
  } = useCulto();

  const [showMomentoForm, setShowMomentoForm] = useState(false);
  const [editingMomento, setEditingMomento] = useState<MomentoProgramacao | null>(null);
  const [showCultoForm, setShowCultoForm] = useState(false);
  const [editingCulto, setEditingCulto] = useState<Culto | null>(null);
  const [newBlocoMode, setNewBlocoMode] = useState(false);
  const [newBlocoName, setNewBlocoName] = useState('');
  const [showCultoSelector, setShowCultoSelector] = useState(false);

  const viewingCultoId = activeCultoId;
  const viewingCulto = cultos.find((c) => c.id === viewingCultoId) || culto;
  const selectedCultoLabel = viewingCulto?.nome || 'Selecione um culto';

  const selectCulto = (id: string) => {
    setActiveCultoId(id);
  };

  const blocosExistentes = [...new Set(momentos.map((m) => m.bloco).filter(Boolean))];

  const openAddMomento = () => {
    if (!viewingCultoId || !viewingCulto) return;

    const novoMomento = emptyMomento(viewingCultoId, momentos.length);

    if (momentos.length > 0) {
      const ultimoMomento = momentos[momentos.length - 1];
      novoMomento.ordem = ultimoMomento.ordem + 1;
      novoMomento.horarioInicio = calcularHorarioTermino(ultimoMomento.horarioInicio, ultimoMomento.duracao);
    } else {
      novoMomento.horarioInicio = viewingCulto.horarioInicial;
    }

    setEditingMomento(novoMomento);
    setNewBlocoMode(false);
    setNewBlocoName('');
    setShowMomentoForm(true);
  };

  const openEditMomento = (m: MomentoProgramacao) => {
    setEditingMomento({ ...m });
    setShowMomentoForm(true);
  };

  const saveMomento = () => {
    if (!editingMomento) return;
    if (momentos.find((m) => m.id === editingMomento.id)) {
      updateMomento(editingMomento);
    } else {
      addMomento(editingMomento);
    }
    setShowMomentoForm(false);
    setEditingMomento(null);
  };

  const openAddCulto = () => {
    setEditingCulto(emptyCulto());
    setShowCultoForm(true);
  };

  const openEditCulto = (c: Culto) => {
    setEditingCulto({ ...c });
    setShowCultoForm(true);
  };

  const saveCulto = () => {
    if (!editingCulto) return;
    if (cultos.find((c) => c.id === editingCulto.id)) {
      updateCulto(editingCulto);
    } else {
      addCulto(editingCulto);
    }
    setShowCultoForm(false);
    setEditingCulto(null);
  };

  const handleDeleteCulto = (id: string) => {
    removeCulto(id);
  };

  const blocos = momentos.reduce<Record<string, typeof momentos>>((acc, m) => {
    const key = m.bloco || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const currentMoment = useMemo(() => {
    const found = momentos.find((momento, index) => getMomentStatus(index) === 'executando');
    return found ?? null;
  }, [getMomentStatus, momentos]);

  const totalPrevistoLabel = `${viewingCulto?.duracaoPrevista || 0}m`;
  const cultoDataLonga = viewingCulto?.data
    ? new Date(viewingCulto.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '--/--/----';
  const cultoDataCurta = viewingCulto?.data
    ? new Date(viewingCulto.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '--/--';

  const inputClass = 'w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground';
  const labelClass = 'text-xs text-muted-foreground font-medium mb-1.5 block';
  const statusLabel = (s: string) => s === 'planejado' ? 'Planejado' : s === 'em_andamento' ? 'Em andamento' : 'Finalizado';

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold italic sm:text-3xl">Programacao</h1>
          <p className="max-w-xl text-sm text-muted-foreground">Selecione um culto e gerencie a ordem completa dele.</p>
        </div>
        <div className="grid w-full min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_auto] xl:max-w-[720px]">
          <button
            type="button"
            onClick={() => setShowCultoSelector(true)}
            className="flex min-w-0 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-left transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Culto selecionado</p>
              <p className="truncate font-semibold">{selectedCultoLabel}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <button onClick={openAddCulto} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:w-auto md:min-w-[150px] md:rounded-xl md:py-3">
            <Plus className="w-4 h-4" /> Novo Culto
          </button>
        </div>
      </div>

      {isMobile && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-border/70 bg-card/60 px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Data</p>
            <p className="mt-1 text-sm font-semibold">{cultoDataCurta}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Inicio</p>
            <p className="mt-1 text-sm font-semibold">{viewingCulto?.horarioInicial || '--:--'}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/60 px-3 py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Previsto</p>
            <p className="mt-1 text-sm font-semibold">{totalPrevistoLabel}</p>
          </div>
        </div>
      )}

      {lastError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {lastError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="glass-card p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Culto</p>
              <h2 className="mt-1 break-words text-xl font-display font-bold sm:text-2xl">{selectedCultoLabel}</h2>
              <div className="mt-3 hidden flex-wrap gap-2 text-sm text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {cultoDataLonga}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                  <Clock className="w-3.5 h-3.5" />
                  {viewingCulto?.horarioInicial || '--:--'}
                </span>
                <span className="inline-flex rounded-full bg-muted px-3 py-1">{statusLabel(viewingCulto?.status || 'planejado')}</span>
              </div>
              <div className="mt-3 sm:hidden">
                <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{statusLabel(viewingCulto?.status || 'planejado')}</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 min-[480px]:grid-cols-3 md:grid-cols-3">
              <button
                onClick={() => viewingCulto && openEditCulto(viewingCulto)}
                disabled={!viewingCulto}
                className="group flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted disabled:opacity-50 sm:min-h-0"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => viewingCultoId && duplicateCulto(viewingCultoId)}
                disabled={!viewingCultoId}
                className="group flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-muted disabled:opacity-50 sm:min-h-0"
              >
                <Copy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>Duplicar</span>
              </button>
              <button
                onClick={() => viewingCultoId && handleDeleteCulto(viewingCultoId)}
                disabled={!viewingCultoId}
                className="group flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-all hover:border-destructive/40 hover:bg-destructive/15 disabled:opacity-50 sm:min-h-0"
              >
                <Trash2 className="h-4 w-4 text-destructive transition-transform group-hover:scale-105" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Momento do culto</p>
          {currentMoment ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="break-words text-lg font-display font-bold sm:text-xl">{currentMoment.atividade}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {currentMoment.responsavel}
                  {currentMoment.ministerio ? ` - ${currentMoment.ministerio}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground min-[420px]:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="uppercase tracking-wide">Inicio</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{currentMoment.horarioInicio}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="uppercase tracking-wide">Duracao</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{currentMoment.duracao} min</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="uppercase tracking-wide">Fim</p>
                  <p className="mt-1 font-mono text-sm text-foreground">{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</p>
                </div>
              </div>
              <ExecutingMomentProgress momento={currentMoment} />
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum momento em execucao agora.
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Momentos</p>
              <p className="mt-1 text-lg font-bold">{momentos.length}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Inicio</p>
              <p className="mt-1 text-lg font-bold">{viewingCulto?.horarioInicial || '--:--'}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Previsto</p>
              <p className="mt-1 text-lg font-bold">{totalPrevistoLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-display font-semibold">Momentos</h3>
            <p className="text-sm text-muted-foreground">A lista abaixo mostra apenas o culto escolhido.</p>
          </div>
          {!isMobile && (
            <div className="flex flex-wrap items-center gap-2">
              {momentos.length > 0 && (
                <>
                  <button
                    onClick={() => exportarProgramacaoImagem(viewingCulto, momentos)}
                    className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                  >
                    <ImageDown className="w-4 h-4" /> Imagem
                  </button>
                  <button
                    onClick={() => exportarProgramacao(viewingCulto, momentos)}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Planilha
                  </button>
                </>
              )}
              <button onClick={openAddMomento} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
                <Plus className="w-4 h-4" /> Momento
              </button>
            </div>
          )}
        </div>

        {isMobile && momentos.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => exportarProgramacaoImagem(viewingCulto, momentos)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-3 py-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
            >
              <ImageDown className="h-4 w-4" /> Imagem
            </button>
            <button
              onClick={() => exportarProgramacao(viewingCulto, momentos)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-muted px-3 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
            >
              <FileSpreadsheet className="h-4 w-4" /> Planilha
            </button>
            <button
              onClick={openAddMomento}
              disabled={isSubmitting}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Momento
            </button>
          </div>
        )}

        {momentos.length === 0 ? (
          <div className="glass-card p-6 text-center text-muted-foreground sm:p-8">
            <p>Nenhum momento cadastrado.</p>
            <button onClick={openAddMomento} className="mt-3 text-sm text-primary hover:underline">+ Adicionar primeiro momento</button>
          </div>
        ) : (
          Object.entries(blocos).map(([bloco, items]) => (
            <div key={bloco} className="mb-6">
              {bloco && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-border" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{bloco}</span>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
              )}
              <div className="space-y-2">
                {items.map((m) => {
                  const idx = momentos.findIndex((x) => x.id === m.id);
                  const status = getMomentStatus(idx);
                  const isExecuting = status === 'executando';
                  const isDone = status === 'concluido';

                  return (
                    <div key={m.id} className={`glass-card p-3.5 transition-colors sm:p-4 ${isExecuting ? 'border-l-4 border-l-status-executing' : ''}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex items-start justify-between gap-3 sm:block sm:shrink-0">
                          <div className="rounded-2xl bg-muted/40 p-3 text-left sm:min-w-[110px] sm:rounded-xl sm:text-center">
                            <p className="text-sm font-mono font-bold text-primary">{m.horarioInicio}</p>
                            <p className="text-[11px] text-muted-foreground">{m.duracao} minutos</p>
                            <p className="text-[11px] text-muted-foreground">{calcularHorarioTermino(m.horarioInicio, m.duracao)}</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2 sm:hidden">
                            <button onClick={() => openEditMomento(m)} className="rounded-xl bg-muted px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80">
                              Editar
                            </button>
                            <button onClick={() => removeMomento(m.id)} className="rounded-xl bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25">
                              Excluir
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start gap-2">
                            <p className={`min-w-0 flex-1 break-words font-semibold ${isDone ? 'text-muted-foreground line-through' : ''}`}>{m.atividade}</p>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                              isExecuting ? 'status-executing' : isDone ? 'status-completed' : 'bg-muted text-muted-foreground'
                            }`}>
                              {isExecuting ? 'Ao vivo' : isDone ? 'Concluido' : 'Planejado'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">{m.responsavel}</span>
                            {m.ministerio && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{m.ministerio}</span>}
                          </div>
                          {m.acaoSonoplastia && (
                            <p className="mt-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">Sonoplastia: {m.acaoSonoplastia}</p>
                          )}
                        </div>
                        <div className="hidden items-center gap-2 self-end sm:flex sm:self-auto">
                          <button onClick={() => openEditMomento(m)} className="rounded-lg p-1.5 transition-colors hover:bg-muted">
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => removeMomento(m.id)} className="rounded-lg p-1.5 transition-colors hover:bg-destructive/20">
                            <Trash2 className="w-4 h-4 text-destructive/70" />
                          </button>
                        </div>
                      </div>
                      {isExecuting && <ExecutingMomentProgress momento={m} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {showCultoSelector && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="absolute inset-x-0 bottom-0 top-20 flex w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Selecionar culto</p>
                <h2 className="text-lg font-display font-bold">Programas cadastrados</h2>
              </div>
              <button onClick={() => setShowCultoSelector(false)} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80">
                Fechar
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-8 sm:pb-4">
              <div className="space-y-3">
                {cultos.map((c) => {
                  const isSelected = c.id === viewingCultoId;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl border p-3 transition-all ${
                        isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            selectCulto(c.id);
                            setShowCultoSelector(false);
                          }}
                          className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-xl p-1 text-left transition-colors hover:bg-muted/20"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-display font-semibold">{c.nome || 'Sem nome'}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                <Clock className="h-3 w-3" />
                                {c.horarioInicial}
                              </span>
                              <span className="inline-flex rounded-full bg-muted px-2.5 py-1">{statusLabel(c.status)}</span>
                            </div>
                          </div>
                          {isSelected && <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
                        </button>
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCultoSelector(false);
                              openEditCulto(c);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Editar ${c.nome || 'culto'}`}
                            title="Editar culto"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCultoSelector(false);
                              handleDeleteCulto(c.id);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
                            aria-label={`Excluir ${c.nome || 'culto'}`}
                            title="Excluir culto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCultoForm && editingCulto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-2xl rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Culto</p>
                <h2 className="text-2xl font-display font-bold">
                  {cultos.some((c) => c.id === editingCulto.id) ? 'Editar culto' : 'Novo culto'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCultoForm(false);
                  setEditingCulto(null);
                }}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Nome do culto</label>
                <input
                  value={editingCulto.nome}
                  onChange={(e) => setEditingCulto({ ...editingCulto, nome: e.target.value })}
                  className={inputClass}
                  placeholder="Ex.: Culto Jovem"
                />
              </div>
              <div>
                <label className={labelClass}>Data</label>
                <input
                  type="date"
                  value={editingCulto.data}
                  onChange={(e) => setEditingCulto({ ...editingCulto, data: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horario inicial</label>
                <input
                  type="time"
                  value={editingCulto.horarioInicial}
                  onChange={(e) => setEditingCulto({ ...editingCulto, horarioInicial: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Duracao prevista</label>
                <input
                  type="number"
                  min="0"
                  value={editingCulto.duracaoPrevista}
                  onChange={(e) => setEditingCulto({ ...editingCulto, duracaoPrevista: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={editingCulto.status}
                  onChange={(e) => setEditingCulto({ ...editingCulto, status: e.target.value as Culto['status'] })}
                  className={inputClass}
                >
                  <option value="planejado">Planejado</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCultoForm(false);
                  setEditingCulto(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveCulto}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Salvar culto
              </button>
            </div>
          </div>
        </div>
      )}

      {showMomentoForm && editingMomento && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:p-4">
          <div className="mx-auto mt-12 w-full max-w-4xl rounded-t-3xl border border-border bg-card p-5 shadow-2xl sm:mt-0 sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Momento</p>
                <h2 className="text-2xl font-display font-bold">
                  {momentos.some((m) => m.id === editingMomento.id) ? 'Editar momento' : 'Novo momento'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMomentoForm(false);
                  setEditingMomento(null);
                  setNewBlocoMode(false);
                  setNewBlocoName('');
                }}
                className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className={labelClass}>Atividade</label>
                <input
                  value={editingMomento.atividade}
                  onChange={(e) => setEditingMomento({ ...editingMomento, atividade: e.target.value })}
                  className={inputClass}
                  placeholder="Ex.: Louvor congregacional"
                />
              </div>
              <div>
                <label className={labelClass}>Responsavel</label>
                <input
                  value={editingMomento.responsavel}
                  onChange={(e) => setEditingMomento({ ...editingMomento, responsavel: e.target.value })}
                  className={inputClass}
                  placeholder="Nome do participante"
                />
              </div>
              <div>
                <label className={labelClass}>Ministerio</label>
                <input
                  value={editingMomento.ministerio}
                  onChange={(e) => setEditingMomento({ ...editingMomento, ministerio: e.target.value })}
                  className={inputClass}
                  placeholder="Ex.: Louvor"
                />
              </div>
              <div>
                <label className={labelClass}>Bloco</label>
                {newBlocoMode ? (
                  <div className="space-y-2">
                    <input
                      value={newBlocoName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewBlocoName(value);
                        setEditingMomento({ ...editingMomento, bloco: value });
                      }}
                      className={inputClass}
                      placeholder="Nome do novo bloco"
                    />
                    <button
                      type="button"
                      onClick={() => setNewBlocoMode(false)}
                      className="text-xs text-primary hover:underline"
                    >
                      Usar bloco existente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={editingMomento.bloco}
                      onChange={(e) => setEditingMomento({ ...editingMomento, bloco: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Sem bloco</option>
                      {blocosExistentes.map((bloco) => (
                        <option key={bloco} value={bloco}>
                          {bloco}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBlocoMode(true);
                        setNewBlocoName(editingMomento.bloco || '');
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Criar novo bloco
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Horario inicial</label>
                <input
                  type="time"
                  value={editingMomento.horarioInicio}
                  onChange={(e) => setEditingMomento({ ...editingMomento, horarioInicio: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Duracao (min)</label>
                <input
                  type="number"
                  min="0"
                  value={editingMomento.duracao}
                  onChange={(e) => setEditingMomento({ ...editingMomento, duracao: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tipo de momento</label>
                <select
                  value={editingMomento.tipoMomento}
                  onChange={(e) => setEditingMomento({ ...editingMomento, tipoMomento: e.target.value as TipoMomento })}
                  className={inputClass}
                >
                  {TIPOS_MOMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de midia</label>
                <select
                  value={editingMomento.tipoMidia}
                  onChange={(e) => setEditingMomento({ ...editingMomento, tipoMidia: e.target.value as TipoMidia })}
                  className={inputClass}
                >
                  <option value="nenhum">Nenhum</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Acao sonoplastia</label>
                <input
                  value={editingMomento.acaoSonoplastia}
                  onChange={(e) => setEditingMomento({ ...editingMomento, acaoSonoplastia: e.target.value })}
                  className={inputClass}
                  placeholder="Ex.: Abrir microfone 2"
                />
              </div>
              <div>
                <label className={labelClass}>Antecedencia da chamada (min)</label>
                <input
                  type="number"
                  min="0"
                  value={editingMomento.antecedenciaChamada}
                  onChange={(e) => setEditingMomento({ ...editingMomento, antecedenciaChamada: Number(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Observacao</label>
                <textarea
                  value={editingMomento.observacao}
                  onChange={(e) => setEditingMomento({ ...editingMomento, observacao: e.target.value })}
                  className={`${inputClass} min-h-28 resize-y`}
                  placeholder="Detalhes adicionais para a equipe"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMomentoForm(false);
                  setEditingMomento(null);
                  setNewBlocoMode(false);
                  setNewBlocoName('');
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMomento}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Salvar momento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Programacao;
