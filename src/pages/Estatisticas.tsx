import { memo, useMemo } from 'react';
import { AlertTriangle, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';

const EstatisticasLiveCards = memo(function EstatisticasLiveCards({
  totalMinutes,
  avgDuration,
  longestDuration,
  longestActivity,
}: {
  totalMinutes: number;
  avgDuration: number;
  longestDuration: number;
  longestActivity: string;
}) {
  const { elapsedSeconds } = useCultoTimer();
  const realDurationMin = Math.floor((Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0) / 60);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="glass-card p-5">
        <Clock className="mb-2 h-5 w-5 text-primary" />
        <p className="text-xs text-muted-foreground">Duracao Prevista</p>
        <p className="font-display text-2xl font-bold">{totalMinutes} min</p>
      </div>
      <div className="glass-card p-5">
        <TrendingUp className="mb-2 h-5 w-5 text-status-executing" />
        <p className="text-xs text-muted-foreground">Duracao Real</p>
        <p className="font-display text-2xl font-bold">{realDurationMin} min</p>
      </div>
      <div className="glass-card p-5">
        <BarChart3 className="mb-2 h-5 w-5 text-status-completed" />
        <p className="text-xs text-muted-foreground">Media por Momento</p>
        <p className="font-display text-2xl font-bold">{avgDuration} min</p>
      </div>
      <div className="glass-card p-5">
        <AlertTriangle className="mb-2 h-5 w-5 text-status-alert" />
        <p className="text-xs text-muted-foreground">Mais Longo</p>
        <p className="font-display text-2xl font-bold">{longestDuration} min</p>
        <p className="truncate text-xs text-muted-foreground">{longestActivity}</p>
      </div>
    </div>
  );
});

const Estatisticas = () => {
  const { momentos, currentIndex } = useLiveCultoView();

  const totalMinutes = useMemo(() => momentos.reduce((sum, momento) => sum + momento.duracao, 0), [momentos]);
  const avgDuration = momentos.length > 0 ? Math.round(totalMinutes / momentos.length) : 0;
  const longest = momentos.length > 0
    ? momentos.reduce((max, momento) => (momento.duracao > max.duracao ? momento : max), momentos[0])
    : null;

  const blocoStats = useMemo(() => (
    momentos.reduce<Record<string, number>>((acc, momento) => {
      acc[momento.bloco] = (acc[momento.bloco] || 0) + momento.duracao;
      return acc;
    }, {})
  ), [momentos]);

  const maxBlocoDur = Math.max(...Object.values(blocoStats), 1);

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
        <BarChart3 className="h-6 w-6 text-primary" />
        Estatisticas
      </h1>

      <EstatisticasLiveCards
        totalMinutes={totalMinutes}
        avgDuration={avgDuration}
        longestDuration={longest?.duracao ?? 0}
        longestActivity={longest?.atividade ?? ''}
      />

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Linha do Tempo por Bloco</h3>
        <div className="space-y-3">
          {Object.entries(blocoStats).map(([bloco, duracao]) => (
            <div key={bloco} className="flex items-center gap-4">
              <span className="w-32 truncate text-sm text-muted-foreground">{bloco}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${(duracao / maxBlocoDur) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right text-xs text-muted-foreground">{duracao}min</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Linha do Tempo do Culto</h3>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {momentos.map((momento, index) => {
            const widthPercent = totalMinutes > 0 ? Math.max(2, (momento.duracao / totalMinutes) * 100) : 2;
            const colors: Record<string, string> = {
              concluido: 'bg-status-completed',
              executando: 'bg-status-executing animate-pulse-glow',
              proximo: 'bg-status-next',
              futuro: 'bg-muted',
            };
            const status = index < currentIndex
              ? 'concluido'
              : index === currentIndex
                ? 'executando'
                : index === currentIndex + 1
                  ? 'proximo'
                  : 'futuro';

            return (
              <div
                key={momento.id}
                className="group flex flex-col items-center gap-1"
                style={{ minWidth: `${widthPercent}%`, flex: `${widthPercent} 0 0` }}
              >
                <div
                  className={`h-8 w-full rounded transition-colors ${colors[status]}`}
                  title={`${momento.atividade} (${momento.duracao}min)`}
                />
                <span className="max-w-full truncate text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {momento.atividade}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Estatisticas;
