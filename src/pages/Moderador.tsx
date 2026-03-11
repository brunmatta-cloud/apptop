import { useEffect, useMemo, useRef, useState } from 'react';
import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino, type ModeradorCallStatus, type MomentoProgramacao } from '@/types/culto';
import { ShieldCheck, BellRing, UserRoundCheck, Clock3, ListTodo, User, Timer } from 'lucide-react';
import { formatTimerMs } from '@/utils/time';
import { toast } from '@/hooks/use-toast';

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
  const alertedRef = useRef<Set<string>>(new Set());
  const releasePendingAlertedRef = useRef<Set<string>>(new Set());
  const previousCurrentIndexRef = useRef(currentIndex);
  const previousReleaseActiveRef = useRef(moderadorReleaseActive);

  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const nextMoment = currentIndex >= 0 ? momentos[currentIndex + 1] : momentos[0] ?? null;
  const [lockedNextMomentId, setLockedNextMomentId] = useState<string | null>(nextMoment?.id ?? null);
  const [pendingReleaseMomentId, setPendingReleaseMomentId] = useState<string | null>(null);
  const [releasedHoldMomentId, setReleasedHoldMomentId] = useState<string | null>(null);
  const currentMomentEnd = currentMoment ? calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao) : '--:--';
  const nextMomentEnd = nextMoment ? calcularHorarioTermino(nextMoment.horarioInicio, nextMoment.duracao) : '--:--';
  const currentRemainingMs = currentMoment
    ? Math.max(0, currentMoment.duracao * 60 * 1000 - safeMomentElapsedMs)
    : 0;
  const isCurrentAlertWindow = !!currentMoment && !isPaused && currentRemainingMs <= 10000 && currentRemainingMs > 0;
  const pendingReleaseMoment = pendingReleaseMomentId
    ? momentos.find((momento) => momento.id === pendingReleaseMomentId) ?? null
    : null;
  const lockedNextMoment = lockedNextMomentId
    ? momentos.find((momento) => momento.id === lockedNextMomentId) ?? null
    : null;
  const releasedHoldMoment = releasedHoldMomentId
    ? momentos.find((momento) => momento.id === releasedHoldMomentId) ?? null
    : null;
  const displayedNextMoment = pendingReleaseMoment ?? releasedHoldMoment ?? lockedNextMoment ?? nextMoment;
  const displayedNextMomentEnd = displayedNextMoment ? calcularHorarioTermino(displayedNextMoment.horarioInicio, displayedNextMoment.duracao) : '--:--';
  const isReleasePending = !!pendingReleaseMoment;
  const pendingReleaseElapsedMs = isReleasePending && currentMoment?.id === pendingReleaseMoment.id ? safeMomentElapsedMs : 0;

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

  useEffect(() => {
    if (!currentMoment || isPaused) return;

    const alertKey = `moderador-10s-${currentMoment.id}`;
    if (currentRemainingMs <= 10000 && currentRemainingMs > 8000 && !alertedRef.current.has(alertKey)) {
      alertedRef.current.add(alertKey);
      toast({
        title: 'Atencao Moderador',
        description: `Faltam 10 segundos para encerrar: ${currentMoment.responsavel || currentMoment.atividade}`,
        variant: 'destructive',
      });
    }
  }, [currentMoment, currentRemainingMs, isPaused]);

  useEffect(() => {
    alertedRef.current.clear();
  }, [currentIndex]);

  useEffect(() => {
    const currentChanged = currentIndex !== previousCurrentIndexRef.current;
    const releaseActivated = moderadorReleaseActive && !previousReleaseActiveRef.current;
    const releaseDeactivated = !moderadorReleaseActive && previousReleaseActiveRef.current;

    if (releaseActivated) {
      if (pendingReleaseMomentId && currentMoment) {
        setPendingReleaseMomentId(null);
        setReleasedHoldMomentId(currentMoment.id);
      }
    } else if (releaseDeactivated) {
      setReleasedHoldMomentId(null);
      setLockedNextMomentId(nextMoment?.id ?? null);
    } else if (currentChanged && currentMoment) {
      if (moderadorReleaseActive) {
        if (!releasedHoldMomentId) {
          setPendingReleaseMomentId(null);
          setLockedNextMomentId(nextMoment?.id ?? null);
        }
      } else {
        setPendingReleaseMomentId(currentMoment.id);
        setReleasedHoldMomentId(null);
        const pendingKey = `pending-release-${currentMoment.id}`;
        if (!releasePendingAlertedRef.current.has(pendingKey)) {
          releasePendingAlertedRef.current.add(pendingKey);
          toast({
            title: 'Liberacao pendente',
            description: `${currentMoment.responsavel || currentMoment.atividade} iniciou sem receber liberacao.`,
            variant: 'destructive',
          });
        }
      }
    } else if (!pendingReleaseMomentId && lockedNextMomentId == null && nextMoment) {
      setLockedNextMomentId(nextMoment.id);
    }

    previousCurrentIndexRef.current = currentIndex;
    previousReleaseActiveRef.current = moderadorReleaseActive;
  }, [currentIndex, currentMoment, moderadorReleaseActive, nextMoment, pendingReleaseMomentId, lockedNextMomentId, releasedHoldMomentId]);

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
      </div>

      <div className={`glass-card p-6 sm:p-8 border transition-all duration-300 ${
        isCurrentAlertWindow
          ? 'border-status-alert/60 ring-2 ring-status-alert/40'
          : 'border-border bg-card'
      }`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Timer className={`w-5 h-5 ${isCurrentAlertWindow ? 'text-status-alert' : 'text-primary'}`} />
            <span className={`text-xs uppercase tracking-[0.28em] ${isCurrentAlertWindow ? 'text-status-alert' : 'text-muted-foreground'}`}>
              Pessoa em andamento
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-none break-words">
                {currentMoment?.responsavel || 'Aguardando inicio'}
              </h2>
              <p className="text-lg sm:text-2xl text-muted-foreground">
                {currentMoment?.ministerio || currentMoment?.funcao || 'Sem ministerio informado'}
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:text-base text-muted-foreground">
                <span>Entrada: <span className="font-mono text-foreground">{currentMoment?.horarioInicio ?? '--:--'}</span></span>
                <span>Saida: <span className="font-mono text-foreground">{currentMomentEnd}</span></span>
                <span>Momento: <span className="text-foreground">{currentMoment?.atividade ?? 'Nenhum'}</span></span>
              </div>
            </div>
            <div className={`rounded-2xl border p-5 sm:p-6 flex flex-col justify-center ${
              isCurrentAlertWindow
                ? 'border-status-alert/50 bg-status-alert/10'
                : 'border-border bg-muted/20'
            }`}>
              <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-3">Tempo restante</span>
              <span className={`font-mono font-black leading-none ${isCurrentAlertWindow ? 'text-status-alert text-5xl sm:text-6xl' : 'text-primary text-4xl sm:text-5xl'}`}>
                {currentMoment ? formatTimerMs(currentRemainingMs) : '--:--'}
              </span>
              <p className={`mt-3 text-sm ${isCurrentAlertWindow ? 'text-status-alert' : 'text-muted-foreground'}`}>
                {currentMoment
                  ? isPaused
                    ? 'Cronometro pausado'
                    : isCurrentAlertWindow
                      ? 'Alerta: faltam menos de 10 segundos'
                      : 'Contagem ate a saida'
                  : 'Sem pessoa em execucao'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`glass-card p-6 sm:p-8 border transition-all duration-300 ${
        isReleasePending
          ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
          : moderadorReleaseActive
            ? 'border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
            : 'border-border bg-card'
      }`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <BellRing className={`w-5 h-5 ${
                isReleasePending
                  ? 'text-amber-300'
                  : moderadorReleaseActive
                    ? 'text-emerald-300'
                    : 'text-muted-foreground'
              }`} />
              <span className={`text-xs uppercase tracking-[0.28em] ${
                isReleasePending ? 'text-amber-300' : 'text-muted-foreground'
              }`}>
                {isReleasePending ? 'Liberacao pendente' : 'Proxima pessoa'}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className={`text-3xl sm:text-5xl font-black tracking-tight leading-none ${
                isReleasePending
                  ? 'text-amber-300'
                  : moderadorReleaseActive
                    ? 'text-emerald-200'
                    : 'text-foreground'
              }`}>
                {displayedNextMoment?.responsavel || 'Nenhuma pessoa na fila'}
              </h2>
              <p className="text-base sm:text-xl text-muted-foreground">
                {displayedNextMoment?.ministerio || displayedNextMoment?.funcao || 'Sem ministerio informado'}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:text-base text-muted-foreground">
              <span>Entrada: <span className="font-mono text-foreground">{displayedNextMoment?.horarioInicio ?? '--:--'}</span></span>
              <span>Saida: <span className="font-mono text-foreground">{displayedNextMomentEnd}</span></span>
              <span>Momento: <span className="text-foreground">{displayedNextMoment?.atividade ?? 'Nenhum'}</span></span>
            </div>
            {isReleasePending ? (
              <>
                <p className="text-sm sm:text-base text-amber-300">Essa pessoa ja iniciou sem receber a liberacao.</p>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-amber-300/80">Tempo excedente sem liberacao</p>
                  <p className="font-mono font-black text-5xl sm:text-7xl leading-none text-amber-300">
                    {formatTimerMs(pendingReleaseElapsedMs)}
                  </p>
                </div>
                <p className="text-xs text-amber-300">
                  O card so vai avancar depois que a liberacao verde sair.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm sm:text-base text-muted-foreground">{releaseLabel}</p>
                <p className="text-xs text-muted-foreground">{releaseMeta}</p>
              </>
            )}
          </div>

          <div className="flex flex-col items-start xl:items-end gap-4">
            <div className={`text-xs uppercase tracking-[0.28em] font-semibold ${
              isReleasePending
                ? 'text-amber-300'
                : moderadorReleaseActive
                  ? 'text-emerald-300'
                  : 'text-muted-foreground'
            }`}>
              {isReleasePending
                ? 'Liberacao pendente'
                : moderadorReleaseActive
                  ? 'Liberacao ativa'
                  : 'Aguardando liberacao'}
            </div>
            <button
              type="button"
              onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
              disabled={isSubmitting}
              className={`px-8 sm:px-10 py-4 rounded-2xl font-semibold text-base sm:text-lg transition-colors ${
                isReleasePending
                  ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                  : moderadorReleaseActive
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
    </div>
  );
};

export default Moderador;
