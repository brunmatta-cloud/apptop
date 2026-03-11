import { useCulto } from '@/contexts/CultoContext';
import { Users, Play, Phone, Clock, Check, User } from 'lucide-react';
import { useMemo, memo } from 'react';
import { useClock } from '@/hooks/useClock';

const PainelChamada = memo(() => {
  const { culto, momentos, currentIndex, momentElapsedSeconds, getMomentStatus, marcarChamado, isSubmitting } = useCulto();
  const { currentTime, formatTime } = useClock();

  const executing = currentIndex >= 0 ? [momentos[currentIndex]] : [];

  const chamadaItems = useMemo(() => momentos.filter((m, i) => {
    if (i <= currentIndex) return false;
    const minutesUntil = momentos.slice(currentIndex >= 0 ? currentIndex : 0, i).reduce((s, x) => s + x.duracao, 0);
    const adjustedMinutes = minutesUntil - Math.floor(momentElapsedSeconds / 60);
    const threshold = Math.max(m.antecedenciaChamada, 10);
    return adjustedMinutes <= threshold && !m.chamado;
  }), [momentos, currentIndex, momentElapsedSeconds]);

  const proximosChamar = useMemo(() => momentos.filter((m, i) => {
    if (i <= currentIndex) return false;
    const minutesUntil = momentos.slice(currentIndex >= 0 ? currentIndex : 0, i).reduce((s, x) => s + x.duracao, 0);
    const adjustedMinutes = minutesUntil - Math.floor(momentElapsedSeconds / 60);
    const threshold = Math.max(m.antecedenciaChamada, 10);
    return adjustedMinutes > threshold && adjustedMinutes <= threshold + 15;
  }), [momentos, currentIndex, momentElapsedSeconds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(330_70%_60%/0.2)] flex items-center justify-center">
            <Users className="w-5 h-5 text-[hsl(330_70%_60%)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Painel de Chamada</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <span className="text-xl sm:text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
      </div>

      {/* Em Execução */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-status-executing" />
          <h2 className="text-xs font-semibold text-status-executing uppercase tracking-wider">Em Execução</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-status-executing/20 text-status-executing">{executing.length > 0 && executing[0] ? 1 : 0}</span>
        </div>
        {executing.length > 0 && executing[0] ? (
          <div className="glass-card p-4">
            {executing.map(m => (
              <div key={m.id} className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.responsavel}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.ministerio} • {m.funcao}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.atividade} • {m.horarioInicio}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full border border-status-executing/30 text-status-executing flex items-center gap-1 shrink-0">
                  <Play className="w-3 h-3" /> Ao Vivo
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-muted-foreground text-sm">
            Ninguém em execução
          </div>
        )}
      </div>

      {/* Chamar Agora */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-status-alert" />
          <h2 className="text-xs font-semibold text-status-alert uppercase tracking-wider">Chamar Agora</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-status-alert/20 text-status-alert">{chamadaItems.length}</span>
        </div>
        {chamadaItems.length > 0 ? (
          <div className="glass-card p-4 space-y-3">
            {chamadaItems.map(m => (
              <div key={m.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-status-alert/5 border border-status-alert/20">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.responsavel}</p>
                  <p className="text-sm text-muted-foreground truncate">{m.ministerio} • {m.funcao}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.atividade} • {m.horarioInicio}</p>
                </div>
                <button disabled={isSubmitting} onClick={() => marcarChamado(m.id)} className="px-3 py-1.5 rounded-lg bg-status-completed/20 text-status-completed hover:bg-status-completed/30 text-xs font-medium flex items-center gap-1 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none">
                  <Check className="w-3 h-3" /> Chamado
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-muted-foreground text-sm">
            Ninguém para chamar
          </div>
        )}
      </div>

      {/* Próximos a chamar */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximos a Chamar</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{proximosChamar.length}</span>
        </div>
        {proximosChamar.length > 0 ? (
          <div className="glass-card p-4 space-y-2">
            {proximosChamar.map(m => (
              <div key={m.id} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.responsavel}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.ministerio} • {m.funcao}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.atividade} • {m.horarioInicio}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-6 text-center text-muted-foreground text-sm">
            Nenhum próximo
          </div>
        )}
      </div>
    </div>
  );
});

PainelChamada.displayName = 'PainelChamada';
export default PainelChamada;
