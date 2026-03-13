import { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Focus, List, Play, Radio, Timer, TrendingUp, Users, Volume2, Zap } from 'lucide-react';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { useClock } from '@/hooks/useClock';
import { formatElapsedLabel } from '@/utils/time';

const DashboardHeaderDate = memo(function DashboardHeaderDate() {
  const { currentTime } = useClock();

  return (
    <p className="text-sm text-muted-foreground">
      {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
    </p>
  );
});

const DashboardHeaderTime = memo(function DashboardHeaderTime() {
  const { currentTime, formatTime } = useClock();
  return <span className="font-mono text-2xl font-bold text-primary sm:text-3xl">{formatTime(currentTime)}</span>;
});

const DashboardLiveSummary = memo(function DashboardLiveSummary({
  cultoStatus,
  momentos,
}: {
  cultoStatus: string;
  momentos: ReturnType<typeof useLiveCultoView>['momentos'];
}) {
  const liveSnapshot = useCultoTimer();
  const safeElapsedMs = Number.isFinite(liveSnapshot.elapsedMs) ? liveSnapshot.elapsedMs : 0;
  const totalMinutes = useMemo(() => momentos.reduce((sum, momento) => sum + momento.duracao, 0), [momentos]);
  const totalMs = totalMinutes * 60 * 1000;
  const normalizedProgressPercent = totalMs > 0
    ? Math.min(100, Math.max(0, (safeElapsedMs / totalMs) * 100))
    : 0;
  const progressScale = normalizedProgressPercent / 100;
  const displayProgressPercent = normalizedProgressPercent >= 100 ? '100.0' : normalizedProgressPercent.toFixed(1);
  const statusLabel = cultoStatus === 'planejado' ? 'Sem horario' : cultoStatus === 'em_andamento' ? 'Em andamento' : 'Finalizado';

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-card p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Progresso</span>
          </div>
          <p className="font-display text-xl font-bold text-primary sm:text-2xl">{displayProgressPercent} %</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Decorrido</span>
          </div>
          <p className="font-display text-xl font-bold sm:text-2xl">{formatElapsedLabel(safeElapsedMs)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Duracao total</span>
          </div>
          <p className="font-display text-xl font-bold sm:text-2xl">{totalMinutes} min</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</span>
          </div>
          <p className={`font-display text-xl font-bold sm:text-2xl ${
            cultoStatus === 'em_andamento'
              ? 'text-status-executing'
              : cultoStatus === 'finalizado'
                ? 'text-status-completed'
                : 'text-status-alert'
          }`}>
            {statusLabel}
          </p>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progresso do culto</h3>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {cultoStatus === 'planejado' ? 'Planejado' : cultoStatus === 'em_andamento' ? 'Em andamento' : 'Finalizado'}
          </span>
        </div>
        <div className="progress-bar h-2.5 rounded-full">
          <div
            className="progress-bar-fill rounded-full"
            style={{ transform: `scaleX(${progressScale})`, transformOrigin: 'left', width: '100%' }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-muted-foreground">{displayProgressPercent} %</p>
      </div>
    </>
  );
});

const Dashboard = () => {
  const { iniciarCulto, pendingAction, isSubmitting, connectionStatus } = useCultoControls();
  const { culto, momentos, getMomentStatus } = useLiveCultoView();
  const navigate = useNavigate();

  const connectionLabel = connectionStatus === 'online'
    ? 'Sincronizado'
    : connectionStatus === 'degraded'
      ? 'Sincronizacao parcial'
      : connectionStatus === 'offline'
        ? 'Offline'
        : 'Conectando';
  const connectionClass = connectionStatus === 'online'
    ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
    : connectionStatus === 'degraded'
      ? 'border-amber-500/30 text-amber-300 bg-amber-500/10'
      : 'border-border text-muted-foreground bg-muted/40';

  const quickLinks = useMemo(() => [
    { label: 'Cerimonialista', icon: Radio, to: '/cerimonialista', color: 'bg-[hsl(142_71%_45%/0.2)] text-[hsl(142_71%_45%)]' },
    { label: 'Sonoplastia', icon: Volume2, to: '/sonoplastia', color: 'bg-[hsl(30_90%_50%/0.2)] text-[hsl(30_90%_50%)]' },
    { label: 'Programacao', icon: List, to: '/programacao', color: 'bg-[hsl(217_91%_60%/0.2)] text-[hsl(217_91%_60%)]' },
    { label: 'Chamada', icon: Users, to: '/chamada', color: 'bg-[hsl(330_70%_60%/0.2)] text-[hsl(330_70%_60%)]' },
    { label: 'Modo Foco', icon: Focus, to: '/foco', color: 'bg-muted text-muted-foreground' },
    { label: 'Linha do Tempo', icon: Clock, to: '/linha-do-tempo', color: 'bg-[hsl(0_72%_51%/0.2)] text-[hsl(0_72%_51%)]' },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Painel</h1>
          <DashboardHeaderDate />
        </div>

        <div className="flex items-center gap-4">
          <span className={`rounded-full border px-2.5 py-1 text-xs ${connectionClass}`}>
            {connectionLabel}
          </span>
          <DashboardHeaderTime />
          {culto.status === 'planejado' && (
            <button
              onClick={() => iniciarCulto()}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:px-5"
            >
              <Play className="h-4 w-4" />
              {pendingAction === 'start' ? 'Iniciando...' : 'Iniciar Culto'}
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <div>
            <p className="font-display font-semibold">{culto.nome}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(`${culto.data}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} - {culto.horarioInicial}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <DashboardLiveSummary cultoStatus={culto.status} momentos={momentos} />

          <div className="glass-card p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Programacao</h3>
            <div className="space-y-1">
              {momentos.map((momento, index) => {
                const status = getMomentStatus(index);
                return (
                  <div
                    key={momento.id}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors sm:gap-4 sm:p-3 ${
                      status === 'executando' ? 'bg-status-executing/10' : 'hover:bg-muted/30'
                    }`}
                  >
                    <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground sm:w-12 sm:text-sm">{momento.horarioInicio}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${status === 'concluido' ? 'text-muted-foreground line-through' : ''}`}>
                        {momento.atividade}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{momento.responsavel}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso rapido</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="flex flex-col items-center gap-2 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50 sm:p-4"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.color}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
