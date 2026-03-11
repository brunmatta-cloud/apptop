import { useMemo } from 'react';
import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino, type ModeradorCallStatus, type MomentoProgramacao } from '@/types/culto';
import { ShieldCheck, BellRing, UserRoundCheck, Clock3, ListTodo, User } from 'lucide-react';

const getModeradorStatus = (momento: MomentoProgramacao): ModeradorCallStatus => {
  if (momento.moderadorStatus === 'chamado' || momento.moderadorStatus === 'confirmado' || momento.moderadorStatus === 'ausente') {
    return momento.moderadorStatus;
  }
  return momento.chamado ? 'chamado' : 'pendente';
};

const moderadorStatusLabel = (status: ModeradorCallStatus) => {
  switch (status) {
    case 'chamado':
      return 'Chamado';
    case 'confirmado':
      return 'Confirmado';
    case 'ausente':
      return 'Ausente';
    default:
      return 'Pendente';
  }
};

const moderadorStatusClass = (status: ModeradorCallStatus) => {
  switch (status) {
    case 'confirmado':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    case 'chamado':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
    case 'ausente':
      return 'bg-destructive/15 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const queueBadgeLabel = ({
  releaseActive,
  status,
  isPreparing,
}: {
  releaseActive: boolean;
  status: ModeradorCallStatus;
  isPreparing: boolean;
}) => {
  if (status === 'confirmado') return 'Confirmado';
  if (status === 'ausente') return 'Ausente';
  if (!releaseActive) return 'Aguardando liberacao';
  if (isPreparing) return 'Em preparacao';
  return 'Nao confirmado';
};

const queueBadgeClass = ({
  releaseActive,
  status,
  isPreparing,
}: {
  releaseActive: boolean;
  status: ModeradorCallStatus;
  isPreparing: boolean;
}) => {
  if (status === 'confirmado') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
  if (status === 'ausente') return 'bg-destructive/15 text-destructive border-destructive/20';
  if (!releaseActive) return 'bg-primary/10 text-primary border-primary/20';
  if (isPreparing) return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
  return 'bg-muted text-muted-foreground border-border';
};

const Moderador = () => {
  const {
    culto,
    momentos,
    currentIndex,
    momentElapsedSeconds,
    momentElapsedMs,
    isPaused,
    getMomentStatus,
    moderadorReleaseActive,
    moderadorReleaseUpdatedAt,
    moderadorReleaseBy,
    toggleModeradorRelease,
    updateModeradorStatus,
    isSubmitting,
    pendingAction,
  } = useCulto();

  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const nextMoment = currentIndex >= 0 ? momentos[currentIndex + 1] : momentos[0] ?? null;

  const callItems = useMemo(() => (
    momentos.filter((momento, index) => {
      if (index <= currentIndex) {
        return false;
      }

      const minutesUntil = momentos
        .slice(currentIndex >= 0 ? currentIndex : 0, index)
        .reduce((sum, item) => sum + item.duracao, 0);
      const adjustedMinutes = minutesUntil - Math.floor(safeMomentElapsedSeconds / 60);
      const status = getModeradorStatus(momento);

      return adjustedMinutes <= momento.antecedenciaChamada || status !== 'pendente';
    })
  ), [currentIndex, momentos, safeMomentElapsedSeconds]);

  const queueItems = useMemo(() => (
    momentos
      .filter((_, index) => index > currentIndex)
      .slice(0, 6)
  ), [currentIndex, momentos]);

  const totalMinutes = useMemo(() => momentos.reduce((sum, momento) => sum + momento.duracao, 0), [momentos]);
  const firstTime = momentos[0]?.horarioInicio || '00:00';
  const lastEnd = momentos.length > 0
    ? calcularHorarioTermino(momentos[momentos.length - 1].horarioInicio, momentos[momentos.length - 1].duracao)
    : '00:00';
  const blockColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorPool = ['bg-[hsl(217_91%_60%)]', 'bg-[hsl(270_60%_55%)]', 'bg-[hsl(142_71%_45%)]', 'bg-[hsl(30_90%_50%)]', 'bg-[hsl(330_70%_60%)]', 'bg-[hsl(190_80%_50%)]', 'bg-[hsl(45_90%_55%)]'];
    let idx = 0;
    momentos.forEach((momento) => {
      if (!colors[momento.bloco]) {
        colors[momento.bloco] = colorPool[idx % colorPool.length];
        idx += 1;
      }
    });
    return colors;
  }, [momentos]);

  const releaseLabel = moderadorReleaseActive ? 'Liberacao ativa' : 'Aguardando comando do cerimonialista';
  const releaseMeta = moderadorReleaseUpdatedAt
    ? `${new Date(moderadorReleaseUpdatedAt).toLocaleTimeString('pt-BR')} • ${moderadorReleaseBy ?? 'sistema'}`
    : 'Sem liberacao recente';

  return (
    <div className={`-m-4 md:-m-6 lg:-m-8 min-h-screen px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 transition-colors duration-300 ${
      moderadorReleaseActive
        ? 'bg-[linear-gradient(180deg,rgba(16,185,129,0.22)_0%,rgba(16,185,129,0.14)_30%,rgba(16,185,129,0.08)_60%,rgba(16,185,129,0.12)_100%)]'
        : ''
    }`}>
      <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Moderador</h1>
            <p className="text-sm text-muted-foreground">{culto.nome}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Momento atual</p>
            <p className="font-semibold truncate">{currentMoment?.atividade ?? 'Aguardando inicio'}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Proximo</p>
            <p className="font-semibold truncate">{nextMoment?.atividade ?? 'Nenhum'}</p>
          </div>
          <div className="glass-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fila</p>
            <p className="font-semibold">{queueItems.length} pessoas</p>
          </div>
        </div>
      </div>

      <div className={`glass-card p-6 sm:p-8 border transition-all duration-300 ${
        moderadorReleaseActive
          ? 'border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <BellRing className={`w-5 h-5 ${moderadorReleaseActive ? 'text-emerald-300' : 'text-muted-foreground'}`} />
              <span className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Liberacao do Moderador</span>
            </div>
            <h2 className={`text-4xl sm:text-5xl font-black tracking-[0.18em] ${moderadorReleaseActive ? 'text-emerald-300 animate-pulse' : 'text-muted-foreground/60'}`}>
              LIBERAR
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">{releaseLabel}</p>
            <p className="text-xs text-muted-foreground">{releaseMeta}</p>
          </div>

          <button
            type="button"
            onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
            disabled={isSubmitting}
            className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
              moderadorReleaseActive
                ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                : 'bg-muted text-foreground hover:bg-muted/80'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {pendingAction === 'toggle-moderador-release'
              ? 'Sincronizando...'
              : moderadorReleaseActive
                ? 'Normalizar alerta'
                : 'Ativar alerta'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserRoundCheck className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lista de Chamada</h3>
          </div>
          <div className="space-y-3">
            {callItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma chamada pendente agora.</p>
            ) : callItems.map((momento) => {
              const status = getModeradorStatus(momento);
              return (
                <div key={momento.id} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{momento.responsavel || 'Sem responsavel'}</p>
                      <p className="text-sm text-muted-foreground">{momento.funcao || 'Sem funcao'} • {momento.atividade}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${moderadorStatusClass(status)}`}>
                      {moderadorStatusLabel(status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Horario: {momento.horarioInicio}</span>
                    <span>Termino: {calcularHorarioTermino(momento.horarioInicio, momento.duracao)}</span>
                    <span>Momento: {momento.atividade}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateModeradorStatus(momento.id, 'chamado')}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      Chamar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateModeradorStatus(momento.id, 'confirmado')}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => updateModeradorStatus(momento.id, 'ausente')}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-lg bg-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/30 disabled:opacity-50"
                    >
                      Ausente
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fila de Espera</h3>
          </div>
          <div className="space-y-3">
            {queueItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem fila no momento.</p>
            ) : queueItems.map((momento, index) => {
              const status = getModeradorStatus(momento);
              const isPreparing = index === 0 || status === 'chamado';
              return (
                <div key={momento.id} className="rounded-xl border border-border bg-muted/20 p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{momento.responsavel || 'Sem responsavel'}</p>
                    <p className="text-sm text-muted-foreground">{momento.funcao || 'Sem funcao'} • {momento.atividade}</p>
                    <p className="text-xs text-muted-foreground mt-1">{momento.horarioInicio}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${queueBadgeClass({ releaseActive: moderadorReleaseActive, status, isPreparing })}`}>
                    {queueBadgeLabel({ releaseActive: moderadorReleaseActive, status, isPreparing })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linha do Tempo Completa</h3>
        </div>

        <div className="flex gap-0.5 h-10 sm:h-12 rounded-xl overflow-hidden">
          {momentos.map((momento, index) => {
            const widthPercent = totalMinutes > 0 ? (momento.duracao / totalMinutes) * 100 : 0;
            const status = getMomentStatus(index);
            const color = status === 'concluido'
              ? 'bg-status-completed'
              : status === 'executando'
                ? 'bg-status-executing'
                : blockColors[momento.bloco] || 'bg-muted';

            return (
              <div
                key={momento.id}
                className={`${color} ${status === 'executando' ? 'animate-pulse' : ''} transition-all relative group`}
                style={{ width: `${widthPercent}%`, minWidth: '2px' }}
                title={`${momento.atividade} (${momento.duracao}min)`}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {momento.atividade}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{firstTime}</span>
          <span>{lastEnd}</span>
        </div>

        <div className="space-y-4 relative mt-5">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          {momentos.map((momento, index) => {
            const status = getMomentStatus(index);
            const isExecuting = status === 'executando';
            const horarioFim = calcularHorarioTermino(momento.horarioInicio, momento.duracao);
            const itemElapsedMs = isExecuting ? safeMomentElapsedMs : 0;
            const itemTotalMs = momento.duracao * 60 * 1000;
            const itemPercent = itemTotalMs > 0 ? Math.min(100, (itemElapsedMs / itemTotalMs) * 100) : 0;
            const itemProgressScale = itemPercent / 100;
            const itemRemainingMs = Math.max(0, itemTotalMs - itemElapsedMs);
            const itemRemainingSeconds = Math.ceil(itemRemainingMs / 1000);
            const itemRemaining = `${String(Math.floor(itemRemainingSeconds / 60)).padStart(2, '0')}:${String(itemRemainingSeconds % 60).padStart(2, '0')}`;
            const moderadorStatus = getModeradorStatus(momento);

            return (
              <div key={momento.id} className="relative pl-12">
                <div className={`absolute left-[14px] top-5 w-3 h-3 rounded-full border-2 ${
                  status === 'concluido' ? 'bg-status-completed border-status-completed' :
                  isExecuting ? 'bg-status-executing border-status-executing animate-pulse' :
                  'bg-muted border-border'
                }`} />
                <div className={`glass-card p-3 sm:p-4 ${isExecuting ? 'border-l-4 border-l-status-executing' : ''}`}>
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1 flex-wrap">
                        <span className="font-mono font-bold text-primary">{momento.horarioInicio}</span>
                        <span>—</span>
                        <span className="font-mono">{horarioFim}</span>
                        <span>({momento.duracao} min)</span>
                      </div>
                      <h3 className={`font-display font-semibold text-base sm:text-lg ${status === 'concluido' ? 'text-muted-foreground line-through' : ''} truncate`}>
                        {momento.atividade}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0" /> {momento.responsavel} • {momento.ministerio}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${moderadorStatusClass(moderadorStatus)}`}>
                        {moderadorStatusLabel(moderadorStatus)}
                      </span>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider shrink-0 ${
                        blockColors[momento.bloco] || 'bg-muted'
                      } text-white`}>
                        {momento.bloco}
                      </span>
                    </div>
                  </div>
                  {isExecuting && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{Math.min(100, Math.max(0, Math.round(itemPercent)))}%</span>
                        <span>{isPaused ? `${itemRemaining} pausado` : `${itemRemaining} restantes`}</span>
                      </div>
                      <div className="progress-bar h-2">
                        <div
                          className="progress-bar-fill"
                          style={{
                            transform: `scaleX(${itemProgressScale})`,
                            transformOrigin: 'left',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Moderador;
