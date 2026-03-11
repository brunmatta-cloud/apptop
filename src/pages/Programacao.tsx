import { useMemo, useState } from 'react';
import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino } from '@/types/culto';
import { Plus, Edit2, Copy, Trash2, Calendar, Clock, ChevronRight, FileSpreadsheet, ImageDown } from 'lucide-react';
import type { Culto, MomentoProgramacao, TipoMomento, TipoMidia } from '@/types/culto';
import { exportarProgramacao } from '@/utils/exportProgramacao';
import { exportarProgramacaoImagem } from '@/utils/exportProgramacaoImagem';
import { useMomentProgress } from '@/hooks/useMomentProgress';

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
  const { currentIndex, momentos, momentElapsedMs, isPaused } = useCulto();
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

  const inputClass = 'w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground';
  const labelClass = 'text-xs text-muted-foreground font-medium mb-1.5 block';
  const statusLabel = (s: string) => s === 'planejado' ? 'Planejado' : s === 'em_andamento' ? 'Em andamento' : 'Finalizado';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold italic">Programacao</h1>
          <p className="text-sm text-muted-foreground">Selecione um culto e gerencie a ordem completa dele.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => setShowCultoSelector(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:min-w-[300px]"
          >
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Culto selecionado</p>
              <p className="truncate font-semibold">{selectedCultoLabel}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          <button onClick={openAddCulto} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
            <Plus className="w-4 h-4" /> Novo Culto
          </button>
        </div>
      </div>

      {lastError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {lastError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="glass-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Culto</p>
              <h2 className="mt-1 break-words text-2xl font-display font-bold">{selectedCultoLabel}</h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {viewingCulto?.data ? new Date(viewingCulto.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '--/--/----'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                  <Clock className="w-3.5 h-3.5" />
                  {viewingCulto?.horarioInicial || '--:--'}
                </span>
                <span className="inline-flex rounded-full bg-muted px-3 py-1">{statusLabel(viewingCulto?.status || 'planejado')}</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
              <button onClick={() => viewingCulto && openEditCulto(viewingCulto)} disabled={!viewingCulto} className="flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-50">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
              <button onClick={() => viewingCultoId && duplicateCulto(viewingCultoId)} disabled={!viewingCultoId} className="flex items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-50">
                <Copy className="w-3 h-3" /> Duplicar
              </button>
              <button onClick={() => viewingCultoId && handleDeleteCulto(viewingCultoId)} disabled={!viewingCultoId} className="flex items-center justify-center gap-1 rounded-lg bg-destructive/15 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-50">
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Momento do culto</p>
          {currentMoment ? (
            <div className="mt-3 space-y-3">
              <div>
                <p className="break-words text-xl font-display font-bold">{currentMoment.atividade}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {currentMoment.responsavel}
                  {currentMoment.ministerio ? ` - ${currentMoment.ministerio}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
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
              <p className="mt-1 text-lg font-bold">{viewingCulto?.duracaoPrevista || 0}m</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-display font-semibold">Momentos</h3>
            <p className="text-sm text-muted-foreground">A lista abaixo mostra apenas o culto escolhido.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {momentos.length > 0 && (
              <>
                <button
                  onClick={() => exportarProgramacaoImagem(viewingCulto, momentos)}
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                >
                  <ImageDown className="w-4 h-4" /> Imagem
                </button>
                <button
                  onClick={() => exportarProgramacao(viewingCulto, momentos)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Planilha
                </button>
              </>
            )}
            <button onClick={openAddMomento} disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              <Plus className="w-4 h-4" /> Momento
            </button>
          </div>
        </div>

        {momentos.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
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

                  return (
                    <div key={m.id} className={`glass-card p-4 transition-colors ${isExecuting ? 'border-l-4 border-l-status-executing' : ''}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="shrink-0 rounded-xl bg-muted/40 p-3 text-left sm:min-w-[110px] sm:text-center">
                          <p className="text-sm font-mono font-bold text-primary">{m.horarioInicio}</p>
                          <p className="text-[11px] text-muted-foreground">{m.duracao} minutos</p>
                          <p className="text-[11px] text-muted-foreground">{calcularHorarioTermino(m.horarioInicio, m.duracao)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`break-words font-semibold ${status === 'concluido' ? 'text-muted-foreground line-through' : ''}`}>{m.atividade}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">{m.responsavel}</span>
                            {m.ministerio && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{m.ministerio}</span>}
                          </div>
                          {m.acaoSonoplastia && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Sonoplastia: {m.acaoSonoplastia}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
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
          <div className="absolute inset-y-0 right-0 w-full max-w-md border-l border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Selecionar culto</p>
                <h2 className="text-lg font-display font-bold">Programas cadastrados</h2>
              </div>
              <button onClick={() => setShowCultoSelector(false)} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80">
                Fechar
              </button>
            </div>
            <div className="max-h-[calc(100vh-88px)] overflow-y-auto p-4">
              <div className="space-y-3">
                {cultos.map((c) => {
                  const isSelected = c.id === viewingCultoId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        selectCulto(c.id);
                        setShowCultoSelector(false);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
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
                        {isSelected && <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
