import { useCulto, useCultoTimer } from '@/contexts/CultoContext';

import { BarChart3, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

const Estatisticas = () => {
  const { culto, momentos, currentIndex } = useCulto();
  const { elapsedSeconds } = useCultoTimer();

  const totalMinutes = momentos.reduce((sum, m) => sum + m.duracao, 0);
  const avgDuration = momentos.length > 0 ? Math.round(totalMinutes / momentos.length) : 0;
  const longest = momentos.reduce((max, m) => m.duracao > max.duracao ? m : max, momentos[0]);
  const realDurationMin = Math.floor(elapsedSeconds / 60);

  // Group by bloco
  const blocoStats = momentos.reduce<Record<string, number>>((acc, m) => {
    acc[m.bloco] = (acc[m.bloco] || 0) + m.duracao;
    return acc;
  }, {});

  const maxBlocoDur = Math.max(...Object.values(blocoStats), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" />
        Estatísticas
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <Clock className="w-5 h-5 text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Duração Prevista</p>
          <p className="text-2xl font-bold font-display">{totalMinutes} min</p>
        </div>
        <div className="glass-card p-5">
          <TrendingUp className="w-5 h-5 text-status-executing mb-2" />
          <p className="text-xs text-muted-foreground">Duração Real</p>
          <p className="text-2xl font-bold font-display">{realDurationMin} min</p>
        </div>
        <div className="glass-card p-5">
          <BarChart3 className="w-5 h-5 text-status-completed mb-2" />
          <p className="text-xs text-muted-foreground">Média por Momento</p>
          <p className="text-2xl font-bold font-display">{avgDuration} min</p>
        </div>
        <div className="glass-card p-5">
          <AlertTriangle className="w-5 h-5 text-status-alert mb-2" />
          <p className="text-xs text-muted-foreground">Mais Longo</p>
          <p className="text-2xl font-bold font-display">{longest?.duracao || 0} min</p>
          <p className="text-xs text-muted-foreground truncate">{longest?.atividade}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linha do Tempo por Bloco</h3>
        <div className="space-y-3">
          {Object.entries(blocoStats).map(([bloco, dur]) => (
            <div key={bloco} className="flex items-center gap-4">
              <span className="text-sm w-32 truncate text-muted-foreground">{bloco}</span>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${(dur / maxBlocoDur) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">{dur}min</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline visual */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Linha do Tempo do Culto</h3>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {momentos.map((m, i) => {
            const widthPercent = Math.max(2, (m.duracao / totalMinutes) * 100);
            const colors: Record<string, string> = {
              concluido: 'bg-status-completed',
              executando: 'bg-status-executing animate-pulse-glow',
              proximo: 'bg-status-next',
              futuro: 'bg-muted',
            };
            const status = i < currentIndex ? 'concluido' : i === currentIndex ? 'executando' : i === currentIndex + 1 ? 'proximo' : 'futuro';
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 group" style={{ minWidth: `${widthPercent}%`, flex: `${widthPercent} 0 0` }}>
                <div className={`h-8 w-full rounded ${colors[status]} transition-colors`} title={`${m.atividade} (${m.duracao}min)`} />
                <span className="text-[10px] text-muted-foreground truncate max-w-full opacity-0 group-hover:opacity-100 transition-opacity">{m.atividade}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Estatisticas;
