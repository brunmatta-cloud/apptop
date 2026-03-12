import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { Clock, Play, TrendingUp, Timer, Zap, Radio, Volume2, List, Users, Focus } from 'lucide-react';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClock } from '@/hooks/useClock';
import { formatElapsedLabel } from '@/utils/time';

const Dashboard = () => {
  const { iniciarCulto, pendingAction, isSubmitting, connectionStatus } = useCultoControls();
  const { culto, momentos, getMomentStatus } = useLiveCultoView();
  const liveSnapshot = useCultoTimer();
  const navigate = useNavigate();
  const { currentTime, formatTime } = useClock();
  const safeElapsedMs = Number.isFinite(liveSnapshot.elapsedMs) ? liveSnapshot.elapsedMs : 0;
  const totalMinutes = momentos.reduce((sum, momento) => sum + momento.duracao, 0);
  const totalMs = totalMinutes * 60 * 1000;
  const normalizedProgressPercent = totalMs > 0
    ? Math.min(100, Math.max(0, (safeElapsedMs / totalMs) * 100))
    : 0;
  const progressScale = normalizedProgressPercent / 100;
  const displayProgressPercent = normalizedProgressPercent >= 100 ? '100.0' : normalizedProgressPercent.toFixed(1);

  const statusLabel = culto.status === 'planejado' ? 'Sem horario' : culto.status === 'em_andamento' ? 'Em andamento' : 'Finalizado';
  const connectionLabel = connectionStatus === 'online' ? 'Sincronizado' : connectionStatus === 'degraded' ? 'Sincronizacao parcial' : connectionStatus === 'offline' ? 'Offline' : 'Conectando';
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Painel</h1>
          <p className="text-muted-foreground text-sm">
            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${connectionClass}`}>
            {connectionLabel}
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
          {culto.status === 'planejado' && (
            <button
              onClick={() => {
                try { iniciarCulto(); } catch (error) { console.error('Erro ao iniciar culto:', error); }
              }}
              disabled={isSubmitting}
              className="px-4 sm:px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <Play className="w-4 h-4" /> {pendingAction === 'start' ? 'Iniciando...' : 'Iniciar Culto'}
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <div>
            <p className="font-display font-semibold">{culto.nome}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(`${culto.data}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {culto.horarioInicial}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Progresso</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-display text-primary">{displayProgressPercent} %</p>
            </div>
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Decorrido</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-display">{formatElapsedLabel(safeElapsedMs)}</p>
            </div>
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Duracao Total</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-display">{totalMinutes} min</p>
            </div>
            <div className="glass-card p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold font-display ${culto.status === 'em_andamento' ? 'text-status-executing' : culto.status === 'finalizado' ? 'text-status-completed' : 'text-status-alert'}`}>
                {statusLabel}
              </p>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progresso do Culto</h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {culto.status === 'planejado' ? 'Planejado' : culto.status === 'em_andamento' ? 'Em Andamento' : 'Finalizado'}
              </span>
            </div>
            <div className="progress-bar h-2.5 rounded-full">
              <div className="progress-bar-fill rounded-full" style={{ transform: `scaleX(${progressScale})`, transformOrigin: 'left', width: '100%' }} />
            </div>
            <p className="text-right text-xs text-muted-foreground mt-1.5">{displayProgressPercent} %</p>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Programacao</h3>
            <div className="space-y-1">
              {momentos.map((momento, index) => {
                const status = getMomentStatus(index);
                return (
                  <div key={momento.id} className={`flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg transition-colors ${status === 'executando' ? 'bg-status-executing/10' : 'hover:bg-muted/30'}`}>
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground w-10 sm:w-12">{momento.horarioInicio}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${status === 'concluido' ? 'text-muted-foreground line-through' : ''} truncate`}>{momento.atividade}</p>
                      <p className="text-xs text-muted-foreground truncate">{momento.responsavel}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Acesso Rapido</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center`}>
                  <link.icon className="w-5 h-5" />
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
