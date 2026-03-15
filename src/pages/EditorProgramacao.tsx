import { useState } from 'react';
import { useCulto } from '@/contexts/CultoContext';
import type { MomentoProgramacao, TipoMomento, TipoMidia } from '@/types/culto';
import { calcularHorarioTermino } from '@/types/culto';
import { Plus, Trash2, Edit2, Save, X, Settings } from 'lucide-react';
import ResponsavelSelector from '@/components/ResponsavelSelector';

const TIPOS_MOMENTO: TipoMomento[] = ['musica_ao_vivo', 'playback', 'video', 'vinheta', 'oracao', 'fala', 'aviso', 'fundo_musical', 'nenhum'];
const TIPOS_MIDIA: TipoMidia[] = ['audio', 'video', 'nenhum'];

const emptyMomento = (cultoId: string, ordem: number): MomentoProgramacao => ({
  id: crypto.randomUUID(), cultoId, ordem, bloco: '', horarioInicio: '09:00', duracao: 5,
  atividade: '', responsavel: '', ministerio: '', funcao: '', fotoUrl: '',
  tipoMomento: 'nenhum', tipoMidia: 'nenhum', acaoSonoplastia: '', observacao: '',
  antecedenciaChamada: 10, chamado: false,
});

const EditorProgramacao = () => {
  const { culto, setCulto, momentos, addMomento, updateMomento, removeMomento } = useCulto();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MomentoProgramacao | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newBlocoMode, setNewBlocoMode] = useState(false);

  // Get unique existing blocks
  const blocosExistentes = [...new Set(momentos.map(m => m.bloco).filter(Boolean))];

  const startEdit = (m: MomentoProgramacao) => {
    setEditingId(m.id);
    setFormData({ ...m });
    setShowAdd(false);
  };

  const startAdd = (bloco?: string) => {
    setShowAdd(true);
    setEditingId(null);
    setNewBlocoMode(false);
    const novo = emptyMomento(culto.id, momentos.length);
    if (bloco) {
      const blocoMomentos = momentos.filter(m => m.bloco === bloco);
      const last = blocoMomentos[blocoMomentos.length - 1];
      if (last) {
        novo.horarioInicio = calcularHorarioTermino(last.horarioInicio, last.duracao);
        novo.ordem = last.ordem + 0.5;
      }
      novo.bloco = bloco;
    }
    setFormData(novo);
  };

  const save = () => {
    if (!formData) return;
    if (showAdd) {
      addMomento(formData);
      setShowAdd(false);
    } else {
      updateMomento(formData);
      setEditingId(null);
    }
    setFormData(null);
  };

  const cancel = () => {
    setEditingId(null);
    setShowAdd(false);
    setFormData(null);
  };

  const inputClass = "w-full bg-muted border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  const labelClass = "text-xs text-muted-foreground font-medium mb-1 block";

  const renderForm = () => {
    if (!formData) return null;
    return (
      <div className="glass-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className={labelClass}>Atividade</label><input className={inputClass} value={formData.atividade} onChange={e => setFormData({ ...formData, atividade: e.target.value })} /></div>
          <div>
            <label className={labelClass}>Bloco</label>
            <select 
              className={inputClass} 
              value={newBlocoMode ? '__novo__' : (formData.bloco === '' ? '__sem_bloco__' : formData.bloco)}
              onChange={e => {
                const val = e.target.value;
                if (val === '__sem_bloco__') {
                  setNewBlocoMode(false);
                  setFormData({ ...formData, bloco: '' });
                } else if (val === '__novo__') {
                  setNewBlocoMode(true);
                  setFormData({ ...formData, bloco: '' });
                } else {
                  setNewBlocoMode(false);
                  setFormData({ ...formData, bloco: val });
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
                value={formData.bloco}
                onChange={e => setFormData({ ...formData, bloco: e.target.value })} 
              />
            )}
          </div>
          <ResponsavelSelector 
            value={formData.responsavel}
            onChange={(value) => setFormData({ ...formData, responsavel: value })}
          />
          <div><label className={labelClass}>Ministério</label><input className={inputClass} value={formData.ministerio} onChange={e => setFormData({ ...formData, ministerio: e.target.value })} /></div>
          <div><label className={labelClass}>Função</label><input className={inputClass} value={formData.funcao} onChange={e => setFormData({ ...formData, funcao: e.target.value })} /></div>
          <div><label className={labelClass}>Horário Início</label><input type="time" className={inputClass} value={formData.horarioInicio} onChange={e => setFormData({ ...formData, horarioInicio: e.target.value })} /></div>
          <div><label className={labelClass}>Duração (min)</label><input type="number" className={inputClass} value={formData.duracao} onChange={e => setFormData({ ...formData, duracao: Number(e.target.value) })} /></div>
          <div><label className={labelClass}>Tipo Momento</label>
            <select className={inputClass} value={formData.tipoMomento} onChange={e => setFormData({ ...formData, tipoMomento: e.target.value as TipoMomento })}>
              {TIPOS_MOMENTO.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Tipo Mídia</label>
            <select className={inputClass} value={formData.tipoMidia} onChange={e => setFormData({ ...formData, tipoMidia: e.target.value as TipoMidia })}>
              {TIPOS_MIDIA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Ação Sonoplastia</label><input className={inputClass} value={formData.acaoSonoplastia} onChange={e => setFormData({ ...formData, acaoSonoplastia: e.target.value })} /></div>
          <div><label className={labelClass}>Antecedência Chamada (min)</label><input type="number" className={inputClass} value={formData.antecedenciaChamada} onChange={e => setFormData({ ...formData, antecedenciaChamada: Number(e.target.value) })} /></div>
          <div><label className={labelClass}>Observação</label><input className={inputClass} value={formData.observacao} onChange={e => setFormData({ ...formData, observacao: e.target.value })} /></div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={cancel} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
          <button onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Editor da Programação
          </h1>
        </div>
        <button onClick={() => startAdd()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar Momento
        </button>
      </div>

      {showAdd && renderForm()}

      {/* Culto Info */}
      <div className="glass-card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div><label className={labelClass}>Nome do Culto</label><input className={inputClass} value={culto.nome} onChange={e => setCulto({ ...culto, nome: e.target.value })} /></div>
        <div><label className={labelClass}>Data</label><input type="date" className={inputClass} value={culto.data} onChange={e => setCulto({ ...culto, data: e.target.value })} /></div>
        <div><label className={labelClass}>Horário Inicial</label><input type="time" className={inputClass} value={culto.horarioInicial} onChange={e => setCulto({ ...culto, horarioInicial: e.target.value })} /></div>
        <div><label className={labelClass}>Duração Prevista (min)</label><input type="number" className={inputClass} value={culto.duracaoPrevista} onChange={e => setCulto({ ...culto, duracaoPrevista: Number(e.target.value) })} /></div>
      </div>


      {/* List */}
      <div className="space-y-2">
        {momentos.map(m => (
          <div key={m.id}>
            {editingId === m.id ? renderForm() : (
              <div className="glass-card p-4 flex items-center gap-4">
                <div className="text-center w-16 shrink-0">
                  <p className="text-sm font-mono font-semibold">{m.horarioInicio}</p>
                  <p className="text-xs text-muted-foreground">{calcularHorarioTermino(m.horarioInicio, m.duracao)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.atividade}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.responsavel} • {m.ministerio} • {m.bloco}</p>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:block">{m.duracao}min</span>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(m)} className="p-2 rounded-lg hover:bg-muted transition-colors"><Edit2 className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => removeMomento(m.id)} className="p-2 rounded-lg hover:bg-destructive/20 transition-colors"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorProgramacao;
