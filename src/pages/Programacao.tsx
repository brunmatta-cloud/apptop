import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino } from '@/types/culto';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { Plus, Edit2, Copy, Trash2, Calendar, Clock, ChevronRight, FileSpreadsheet, ImageDown } from 'lucide-react';
import { useState } from 'react';
import type { Culto, MomentoProgramacao, TipoMomento, TipoMidia } from '@/types/culto';
import { exportarProgramacao } from '@/utils/exportProgramacao';
import { exportarProgramacaoImagem } from '@/utils/exportProgramacaoImagem';
import { useMomentProgress } from '@/hooks/useMomentProgress';

const TIPOS_MOMENTO: TipoMomento[] = ['musica_ao_vivo', 'playback', 'video', 'vinheta', 'oracao', 'fala', 'aviso', 'fundo_musical', 'nenhum'];

const emptyMomento = (cultoId: string, ordem: number): MomentoProgramacao => ({
  id: crypto.randomUUID(), cultoId, ordem, bloco: '', horarioInicio: '19:00', duracao: 5,
  atividade: '', responsavel: '', ministerio: '', funcao: '', fotoUrl: '',
  tipoMomento: 'nenhum', tipoMidia: 'nenhum', acaoSonoplastia: '', observacao: '',
  antecedenciaChamada: 10, chamado: false,
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
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
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

  const viewingCultoId = activeCultoId;
  const viewingCulto = cultos.find(c => c.id === viewingCultoId) || culto;

  const selectCulto = (id: string) => {
    setActiveCultoId(id);
  };

  const blocosExistentes = [...new Set(momentos.map(m => m.bloco).filter(Boolean))];

  const openAddMomento = () => {
    if (!viewingCultoId || !viewingCulto) return;

    const novoMomento = emptyMomento(viewingCultoId, momentos.length);
    
    // Se houver momentos, calcular horário e ordem baseado no último
    if (momentos.length > 0) {
      const ultimoMomento = momentos[momentos.length - 1];
      novoMomento.ordem = ultimoMomento.ordem + 1;
      novoMomento.horarioInicio = calcularHorarioTermino(ultimoMomento.horarioInicio, ultimoMomento.duracao);
    } else {
      // Se não houver momentos, usar o horário inicial do culto
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
    if (momentos.find(m => m.id === editingMomento.id)) {
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
    if (cultos.find(c => c.id === editingCulto.id)) {
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

  const inputClass = "w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground";
  const labelClass = "text-xs text-muted-foreground font-medium mb-1.5 block";

  const statusLabel = (s: string) => s === 'planejado' ? 'Planejado' : s === 'em_andamento' ? 'Em Andamento' : 'Finalizado';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold italic">Programação</h1>
          <p className="text-muted-foreground text-sm">Gerencie os cultos e suas programações</p>
        </div>
        <button onClick={openAddCulto} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
          <Plus className="w-4 h-4" /> Novo Culto
        </button>
      </div>

      {/* Cultos list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cultos.map(c => {
          const isSelected = c.id === viewingCultoId;
          return (
            <div
              key={c.id}
              onClick={() => selectCulto(c.id)}
              className={`glass-card cursor-pointer p-4 sm:p-5 transition-all ${isSelected ? 'ring-2 ring-primary border-primary/30' : 'hover:bg-muted/20'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-display font-semibold">{c.nome || 'Sem nome'}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {statusLabel(c.status)}
                  </span>
                </div>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-3">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {c.horarioInicial}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEditCulto(c)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Edit2 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => duplicateCulto(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <Copy className="w-3 h-3" /> Duplicar
                </button>
                <button onClick={() => handleDeleteCulto(c.id)} className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors">
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {lastError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {lastError}
        </div>
      )}

      {/* Momentos do culto selecionado */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-display font-semibold">
            Itens da Programação — {viewingCulto.nome || 'Selecione um culto'}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {momentos.length > 0 && (
              <>
                <button
                  onClick={() => exportarProgramacaoImagem(viewingCulto, momentos)}
                  className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/80"
                >
                  <ImageDown className="w-4 h-4" /> Exportar Imagem
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-[1px] flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bloco}</span>
                  <div className="h-[1px] flex-1 bg-border" />
                </div>
              )}
              <div className="space-y-2">
                {items.map(m => {
                  const idx = momentos.findIndex(x => x.id === m.id);
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
                            {m.ministerio && <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.ministerio}</span>}
                          </div>
                          {m.acaoSonoplastia && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">🎧 {m.acaoSonoplastia}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button onClick={() => openEditMomento(m)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => removeMomento(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors">
                            <Trash2 className="w-4 h-4 text-destructive/70" />
                          </button>
                        </div>
                      </div>
                      {isExecuting && (
                        <ExecutingMomentProgress momento={m} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Momento Form Modal */}
      {showMomentoForm && editingMomento && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">
                {momentos.find(m => m.id === editingMomento.id) ? 'Editar Momento' : 'Novo Momento'}
              </h2>
              <button onClick={() => { setShowMomentoForm(false); setEditingMomento(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div><label className={labelClass}>Ordem</label><input type="number" className={inputClass} value={editingMomento.ordem} onChange={e => setEditingMomento({ ...editingMomento, ordem: Number(e.target.value) })} /></div>
              <div>
                <label className={labelClass}>Bloco</label>
                <select 
                  className={inputClass} 
                  value={newBlocoMode ? '__novo__' : (editingMomento.bloco === '' ? '__sem_bloco__' : editingMomento.bloco)}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__sem_bloco__') {
                      setNewBlocoMode(false);
                      setNewBlocoName('');
                      setEditingMomento({ ...editingMomento, bloco: '' });
                    } else if (val === '__novo__') {
                      setNewBlocoMode(true);
                      setNewBlocoName('');
                      setEditingMomento({ ...editingMomento, bloco: '' });
                    } else {
                      setNewBlocoMode(false);
                      setNewBlocoName('');
                      setEditingMomento({ ...editingMomento, bloco: val });
                    }
                  }}
                >
                  <option value="__sem_bloco__">Sem bloco</option>
                  {blocosExistentes.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__novo__">+ Novo bloco...</option>
                </select>
                {newBlocoMode && (
                  <input 
                    className={`${inputClass} mt-2`} 
                    placeholder="Nome do novo bloco"
                    value={newBlocoName}
                    onChange={e => {
                      setNewBlocoName(e.target.value);
                      setEditingMomento({ ...editingMomento, bloco: e.target.value });
                    }} 
                  />
                )}
              </div>
              <div><label className={labelClass}>Horário!!!</label><input type="time" className={inputClass} value={editingMomento.horarioInicio} onChange={e => setEditingMomento({ ...editingMomento, horarioInicio: e.target.value })} /></div>
              <div><label className={labelClass}>Duração (min)</label><input type="number" className={inputClass} value={editingMomento.duracao} onChange={e => setEditingMomento({ ...editingMomento, duracao: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div><label className={labelClass}>Atividade</label><input className={inputClass} placeholder="Ex: Louvor Especial" value={editingMomento.atividade} onChange={e => setEditingMomento({ ...editingMomento, atividade: e.target.value })} /></div>
              <div><label className={labelClass}>Responsável</label><input className={inputClass} placeholder="Nome" value={editingMomento.responsavel} onChange={e => setEditingMomento({ ...editingMomento, responsavel: e.target.value })} /></div>
              <div><label className={labelClass}>Ministério</label><input className={inputClass} placeholder="Ex: Louvor" value={editingMomento.ministerio} onChange={e => setEditingMomento({ ...editingMomento, ministerio: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div><label className={labelClass}>Função</label><input className={inputClass} placeholder="Ex: Cantor(a)" value={editingMomento.funcao} onChange={e => setEditingMomento({ ...editingMomento, funcao: e.target.value })} /></div>
              <div>
                <label className={labelClass}>Tipo de Momento</label>
                <select className={inputClass} value={editingMomento.tipoMomento} onChange={e => setEditingMomento({ ...editingMomento, tipoMomento: e.target.value as TipoMomento })}>
                  {TIPOS_MOMENTO.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Tipo de Mídia</label><input className={inputClass} placeholder="Ex: MP4, MP3" value={editingMomento.tipoMidia} onChange={e => setEditingMomento({ ...editingMomento, tipoMidia: e.target.value as TipoMidia })} /></div>
              <div><label className={labelClass}>Antecedência (min)</label><input type="number" className={inputClass} value={editingMomento.antecedenciaChamada} onChange={e => setEditingMomento({ ...editingMomento, antecedenciaChamada: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div><label className={labelClass}>Ação da Sonoplastia</label><input className={inputClass} placeholder="Ex: Iniciar reprodução" value={editingMomento.acaoSonoplastia} onChange={e => setEditingMomento({ ...editingMomento, acaoSonoplastia: e.target.value })} /></div>
              <div><label className={labelClass}>Observação</label><textarea className={inputClass + " min-h-[80px] resize-none"} placeholder="Notas adicionais..." value={editingMomento.observacao} onChange={e => setEditingMomento({ ...editingMomento, observacao: e.target.value })} /></div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Horário previsto: <span className="font-mono font-bold text-primary">{calcularHorarioTermino(editingMomento.horarioInicio, editingMomento.duracao)}</span></p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowMomentoForm(false); setEditingMomento(null); }} className="px-5 py-2.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm">Cancelar</button>
              <button onClick={saveMomento} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">💾 Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Culto Form Modal */}
      {showCultoForm && editingCulto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">
                {cultos.find(c => c.id === editingCulto.id) ? 'Editar Culto' : 'Novo Culto'}
              </h2>
              <button onClick={() => { setShowCultoForm(false); setEditingCulto(null); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4">
              <div><label className={labelClass}>Nome do Culto</label><input className={inputClass} placeholder="Ex: Culto de Domingo" value={editingCulto.nome} onChange={e => setEditingCulto({ ...editingCulto, nome: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Data</label><input type="date" className={inputClass} value={editingCulto.data} onChange={e => setEditingCulto({ ...editingCulto, data: e.target.value })} /></div>
                <div><label className={labelClass}>Horário Inicial</label><input type="time" className={inputClass} value={editingCulto.horarioInicial} onChange={e => setEditingCulto({ ...editingCulto, horarioInicial: e.target.value })} /></div>
              </div>
              <div><label className={labelClass}>Duração Prevista (min)</label><input type="number" className={inputClass} value={editingCulto.duracaoPrevista} onChange={e => setEditingCulto({ ...editingCulto, duracaoPrevista: Number(e.target.value) })} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowCultoForm(false); setEditingCulto(null); }} className="px-5 py-2.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm">Cancelar</button>
              <button onClick={saveCulto} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">💾 Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Programacao;
