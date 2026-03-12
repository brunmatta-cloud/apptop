import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { calcularHorarioTermino, type ModeradorCallStatus, type MomentStatus, type MomentoProgramacao } from '@/types/culto';
import { ShieldCheck, BellRing, UserRoundCheck, Clock3, ListTodo, User, Timer, X, ClipboardCheck, CheckCheck } from 'lucide-react';
import { formatTimerMs } from '@/utils/time';

type ModeradorNotice = {
  id: string;
  title: string;
  description: string;
  tone: 'alert' | 'warning';
};

const getModeradorStatus = (momento: MomentoProgramacao): ModeradorCallStatus => {
  if (momento.moderadorStatus === 'chamado' || momento.moderadorStatus === 'pronto') {
    return momento.moderadorStatus;
  }
  return momento.chamado ? 'chamado' : 'pendente';
};

const moderadorStatusLabel = (status: ModeradorCallStatus) => {
  if (status === 'chamado') return 'Chamado';
  if (status === 'pronto') return 'Pronto';
  return 'Pendente';
};

const moderadorStatusHint = (status: ModeradorCallStatus) => {
  if (status === 'pronto') return 'Pessoa posicionada e pronta para entrar.';
  if (status === 'chamado') return 'Pessoa avisada. Falta confirmar que ja esta no local.';
  return 'Ainda precisa receber a chamada.';
};

const moderadorStatusClass = (status: ModeradorCallStatus) => {
  if (status === 'chamado') return 'border-sky-500/25 bg-sky-500/15 text-sky-300';
  if (status === 'pronto') return 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300';
  return 'border-border bg-muted text-muted-foreground';
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
  if (status === 'pronto') return 'Pronto para entrar';
  if (status === 'chamado') return 'Chamado';
  if (!releaseActive) return 'Aguardando liberacao';
  if (isPreparing) return 'Em preparacao';
  return 'Na fila';
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
  if (status === 'pronto') return 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300';
  if (status === 'chamado') return 'border-sky-500/25 bg-sky-500/15 text-sky-300';
  if (!releaseActive) return 'border-primary/20 bg-primary/10 text-primary';
  if (isPreparing) return 'border-amber-500/25 bg-amber-500/15 text-amber-300';
  return 'border-border bg-muted text-muted-foreground';
};

const CallListSection = memo(function CallListSection({
  callItems,
  isSubmitting,
  onUpdateStatus,
}: {
  callItems: MomentoProgramacao[];
  isSubmitting: boolean;
  onUpdateStatus: (id: string, status: ModeradorCallStatus) => void;
}) {
  return (
    <div className="glass-card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserRoundCheck className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lista de Chamada</h3>
        </div>
        <Link
          to="/confirmacao"
          className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Ver confirmacao
        </Link>
      </div>
      <div className="space-y-3">
        {callItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chamada pendente agora.</p>
        ) : callItems.map((momento) => {
          const status = getModeradorStatus(momento);
          const isCalled = status === 'chamado' || status === 'pronto';
          const isReady = status === 'pronto';
          return (
            <div key={momento.id} className={`space-y-4 rounded-[1.2rem] border p-4 transition-colors ${
              isReady
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : isCalled
                  ? 'border-sky-500/25 bg-sky-500/10'
                  : 'border-border bg-muted/20'
            }`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{momento.responsavel || 'Sem responsavel'}</p>
                  <p className="truncate text-sm text-muted-foreground">{momento.funcao || 'Sem funcao'} | {momento.atividade}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${moderadorStatusClass(status)}`}>
                  {moderadorStatusLabel(status)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-4">
                <span>Horario: {momento.horarioInicio}</span>
                <span>Termino: {calcularHorarioTermino(momento.horarioInicio, momento.duracao)}</span>
                <span>Momento: {momento.atividade}</span>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/35 p-1.5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(momento.id, 'chamado')}
                    disabled={isSubmitting}
                    className={`w-full rounded-[0.9rem] px-4 py-3 text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 ${
                      isCalled
                        ? 'bg-sky-500 text-white shadow-[0_12px_30px_-22px_rgba(14,165,233,0.95)]'
                        : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isCalled ? <CheckCheck className="h-4 w-4" /> : null}
                      {isCalled ? 'Chamado confirmado' : 'Marcar chamado'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(momento.id, 'pronto')}
                    disabled={isSubmitting}
                    className={`w-full rounded-[0.9rem] px-4 py-3 text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 ${
                      isReady
                        ? 'bg-emerald-500 text-white shadow-[0_12px_30px_-22px_rgba(16,185,129,0.95)]'
                        : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isReady ? <CheckCheck className="h-4 w-4" /> : null}
                      {isReady ? 'Pronto confirmado' : 'Marcar pronto'}
                    </span>
                  </button>
                </div>
              </div>
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                isReady
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                  : isCalled
                    ? 'border-sky-500/25 bg-sky-500/10 text-sky-300'
                    : 'border-border bg-background/35 text-muted-foreground'
              }`}>
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{moderadorStatusHint(status)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const QueueSection = memo(function QueueSection({
  queueItems,
  moderadorReleaseActive,
}: {
  queueItems: MomentoProgramacao[];
  moderadorReleaseActive: boolean;
}) {
  return (
    <div className="glass-card min-w-0 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fila de Espera</h3>
      </div>
      <div className="space-y-3">
        {queueItems.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem fila no momento.</p>
        ) : queueItems.map((momento, index) => {
          const status = getModeradorStatus(momento);
          const isPreparing = index === 0 || status === 'chamado' || status === 'pronto';
          return (
            <div key={momento.id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{momento.responsavel || 'Sem responsavel'}</p>
                <p className="truncate text-sm text-muted-foreground">{momento.funcao || 'Sem funcao'} | {momento.atividade}</p>
                <p className="mt-1 text-xs text-muted-foreground">{momento.horarioInicio}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs ${queueBadgeClass({ releaseActive: moderadorReleaseActive, status, isPreparing })}`}>
                {queueBadgeLabel({ releaseActive: moderadorReleaseActive, status, isPreparing })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

const TimelineSection = memo(function TimelineSection({
  momentos,
  totalMinutes,
  firstTime,
  lastEnd,
  blockColors,
  getMomentStatusForIndex,
  safeMomentElapsedMs,
  isPaused,
}: {
  momentos: MomentoProgramacao[];
  totalMinutes: number;
  firstTime: string;
  lastEnd: string;
  blockColors: Record<string, string>;
  getMomentStatusForIndex: (index: number) => MomentStatus;
  safeMomentElapsedMs: number;
  isPaused: boolean;
}) {
  return (
    <div className="glass-card min-w-0 overflow-hidden p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linha do Tempo Completa</h3>
      </div>

      <div className="flex h-10 gap-0.5 overflow-hidden rounded-xl sm:h-12">
        {momentos.map((momento, index) => {
          const widthPercent = totalMinutes > 0 ? (momento.duracao / totalMinutes) * 100 : 0;
          const status = getMomentStatusForIndex(index);
          const color = status === 'concluido'
            ? 'bg-status-completed'
            : status === 'executando'
              ? 'bg-status-executing'
              : blockColors[momento.bloco] || 'bg-muted';

          return (
            <div
              key={momento.id}
              className={`${color} relative transition-all ${status === 'executando' ? 'animate-pulse' : ''}`}
              style={{ width: `${widthPercent}%`, minWidth: '2px' }}
              title={`${momento.atividade} (${momento.duracao}min)`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
        <span>{firstTime}</span>
        <span>{lastEnd}</span>
      </div>

      <div className="relative mt-5 space-y-4">
        <div className="absolute bottom-0 left-5 top-0 w-px bg-border" />
        {momentos.map((momento, index) => {
          const status = getMomentStatusForIndex(index);
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
              <div className={`absolute left-[14px] top-5 h-3 w-3 rounded-full border-2 ${
                status === 'concluido' ? 'border-status-completed bg-status-completed' :
                isExecuting ? 'animate-pulse border-status-executing bg-status-executing' :
                'border-border bg-muted'
              }`} />
              <div className={`glass-card min-w-0 p-3 sm:p-4 ${isExecuting ? 'border-l-4 border-l-status-executing' : ''}`}>
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                      <span className="font-mono font-bold text-primary">{momento.horarioInicio}</span>
                      <span>-</span>
                      <span className="font-mono">{horarioFim}</span>
                      <span>({momento.duracao} min)</span>
                    </div>
                    <h3 className={`truncate font-display text-base font-semibold sm:text-lg ${status === 'concluido' ? 'text-muted-foreground line-through' : ''}`}>
                      {momento.atividade}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5 shrink-0" /> {momento.responsavel} | {momento.ministerio}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${moderadorStatusClass(moderadorStatus)}`}>
                      {moderadorStatusLabel(moderadorStatus)}
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ${
                      blockColors[momento.bloco] || 'bg-muted'
                    }`}>
                      {momento.bloco}
                    </span>
                  </div>
                </div>
                {isExecuting && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
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
  );
});

const Moderador = () => {
  const {
    toggleModeradorRelease,
    updateModeradorStatus,
    isSubmitting,
    pendingAction,
  } = useCultoControls();
  const {
    culto,
    momentos,
    currentIndex,
    getMomentStatus,
    moderadorReleaseActive,
    moderadorReleaseUpdatedAt,
    moderadorReleaseBy,
    moderadorReleasePendingMomentId,
  } = useLiveCultoView();
  const { momentElapsedSeconds, momentElapsedMs, isPaused } = useCultoTimer();
  const alertedRef = useRef<Set<string>>(new Set());
  const releasePendingAlertedRef = useRef<Set<string>>(new Set());
  const noticeIdRef = useRef(0);

  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const nextMoment = currentIndex >= 0 ? momentos[currentIndex + 1] : momentos[0] ?? null;
  const [notices, setNotices] = useState<ModeradorNotice[]>([]);
  const currentMomentEnd = currentMoment ? calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao) : '--:--';
  const currentRemainingMs = currentMoment ? Math.max(0, currentMoment.duracao * 60 * 1000 - safeMomentElapsedMs) : 0;
  const isCurrentAlertWindow = !!currentMoment && !isPaused && currentRemainingMs <= 10000 && currentRemainingMs > 0;
  const isReleasePending = !!currentMoment && moderadorReleasePendingMomentId === currentMoment.id;
  const displayedNextMoment = isReleasePending ? currentMoment : nextMoment;
  const displayedNextMomentEnd = displayedNextMoment ? calcularHorarioTermino(displayedNextMoment.horarioInicio, displayedNextMoment.duracao) : '--:--';
  const pendingReleaseElapsedMs = isReleasePending ? safeMomentElapsedMs : 0;

  const callItems = useMemo(() => (
    momentos.filter((momento, index) => {
      if (index <= currentIndex) return false;

      const minutesUntil = momentos
        .slice(currentIndex >= 0 ? currentIndex : 0, index)
        .reduce((sum, item) => sum + item.duracao, 0);
      const adjustedMinutes = minutesUntil - Math.floor(safeMomentElapsedSeconds / 60);
      const status = getModeradorStatus(momento);

      return adjustedMinutes <= momento.antecedenciaChamada || status !== 'pendente';
    })
  ), [currentIndex, momentos, safeMomentElapsedSeconds]);

  const queueItems = useMemo(() => (
    momentos.filter((_, index) => index > currentIndex).slice(0, 6)
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
    ? `${new Date(moderadorReleaseUpdatedAt).toLocaleTimeString('pt-BR')} | ${moderadorReleaseBy ?? 'sistema'}`
    : 'Sem liberacao recente';

  const dismissNotice = (id: string) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  const pushNotice = (title: string, description: string, tone: ModeradorNotice['tone']) => {
    noticeIdRef.current += 1;
    const id = `moderador-notice-${noticeIdRef.current}`;
    setNotices((current) => [{ id, title, description, tone }, ...current].slice(0, 3));
    window.setTimeout(() => {
      setNotices((current) => current.filter((notice) => notice.id !== id));
    }, 8000);
  };

  useEffect(() => {
    if (!currentMoment || isPaused) return;

    const alertKey = `moderador-10s-${currentMoment.id}`;
    if (currentRemainingMs <= 10000 && currentRemainingMs > 8000 && !alertedRef.current.has(alertKey)) {
      alertedRef.current.add(alertKey);
      pushNotice(
        'Atencao moderador',
        `Faltam 10 segundos para encerrar: ${currentMoment.responsavel || currentMoment.atividade}`,
        'alert'
      );
    }
  }, [currentMoment, currentRemainingMs, isPaused]);

  useEffect(() => {
    alertedRef.current.clear();
  }, [currentIndex]);

  useEffect(() => {
    if (!currentMoment || !isReleasePending) return;

    const pendingKey = `pending-release-${currentMoment.id}`;
    if (!releasePendingAlertedRef.current.has(pendingKey)) {
      releasePendingAlertedRef.current.add(pendingKey);
      pushNotice(
        'Liberacao pendente',
        `${currentMoment.responsavel || currentMoment.atividade} iniciou sem receber liberacao.`,
        'warning'
      );
    }
  }, [currentMoment, isReleasePending]);

  const handleUpdateModeradorStatus = (id: string, status: ModeradorCallStatus) => {
    updateModeradorStatus(id, status);
  };

  return (
    <div className={`min-h-full overflow-x-hidden px-3 pb-28 pt-3 transition-colors duration-300 sm:-m-4 sm:px-4 sm:py-4 sm:pb-24 md:-m-6 md:px-6 md:py-6 lg:-m-8 lg:px-8 lg:py-8 ${
      moderadorReleaseActive
        ? 'bg-[linear-gradient(180deg,rgba(16,185,129,0.22)_0%,rgba(16,185,129,0.14)_30%,rgba(16,185,129,0.08)_60%,rgba(16,185,129,0.12)_100%)]'
        : ''
    }`}>
      {notices.length > 0 && (
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 flex max-h-[40vh] w-[min(calc(100vw-1.5rem),380px)] flex-col gap-3 overflow-y-auto pr-1 sm:bottom-4 sm:right-4 sm:max-h-[45vh] sm:w-[min(92vw,380px)]">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`pointer-events-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                notice.tone === 'alert'
                  ? 'border-destructive/40 bg-[rgba(127,29,29,0.92)] text-destructive-foreground'
                  : 'border-amber-500/35 bg-[rgba(120,53,15,0.92)] text-amber-50'
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="pr-2 text-sm font-semibold">{notice.title}</p>
                  <p className="mt-1 text-sm opacity-90">{notice.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissNotice(notice.id)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-black/10 text-white transition-colors hover:bg-black/20"
                  aria-label="Fechar notificacao"
                  title="Fechar notificacao"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Moderador</h1>
              <p className="text-sm text-muted-foreground">{culto.nome}</p>
            </div>
          </div>

          <Link
            to="/confirmacao"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <ClipboardCheck className="h-4 w-4" />
            Abrir confirmacao
          </Link>
        </div>

        <div className={`glass-card border p-6 sm:p-8 ${
          isCurrentAlertWindow ? 'border-status-alert/60 ring-2 ring-status-alert/40' : 'border-border bg-card'
        }`}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Timer className={`h-5 w-5 ${isCurrentAlertWindow ? 'text-status-alert' : 'text-primary'}`} />
              <span className={`text-xs uppercase tracking-[0.28em] ${isCurrentAlertWindow ? 'text-status-alert' : 'text-muted-foreground'}`}>
                Pessoa em andamento
              </span>
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <h2 className="break-words text-4xl font-black leading-none tracking-tight sm:text-6xl">
                  {currentMoment?.responsavel || 'Aguardando inicio'}
                </h2>
                <p className="text-lg text-muted-foreground sm:text-2xl">
                  {currentMoment?.ministerio || currentMoment?.funcao || 'Sem ministerio informado'}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground sm:text-base">
                  <span>Entrada: <span className="font-mono text-foreground">{currentMoment?.horarioInicio ?? '--:--'}</span></span>
                  <span>Saida: <span className="font-mono text-foreground">{currentMomentEnd}</span></span>
                  <span>Momento: <span className="text-foreground">{currentMoment?.atividade ?? 'Nenhum'}</span></span>
                </div>
              </div>
              <div className={`flex flex-col justify-center rounded-2xl border p-5 sm:p-6 ${
                isCurrentAlertWindow ? 'border-status-alert/50 bg-status-alert/10' : 'border-border bg-muted/20'
              }`}>
                <span className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">Tempo restante</span>
                <span className={`font-mono text-4xl font-black leading-none sm:text-5xl ${isCurrentAlertWindow ? 'text-status-alert' : 'text-primary'}`}>
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

        <div className={`glass-card border p-6 sm:p-8 ${
          isReleasePending
            ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]'
            : moderadorReleaseActive
              ? 'border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
              : 'border-border bg-card'
        }`}>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BellRing className={`h-5 w-5 ${
                  isReleasePending ? 'text-amber-300' : moderadorReleaseActive ? 'text-emerald-300' : 'text-muted-foreground'
                }`} />
                <span className={`text-xs uppercase tracking-[0.28em] ${isReleasePending ? 'text-amber-300' : 'text-muted-foreground'}`}>
                  {isReleasePending ? 'Liberacao pendente' : 'Proxima pessoa'}
                </span>
              </div>
              <div className="space-y-2">
                <h2 className={`text-3xl font-black leading-none tracking-tight sm:text-5xl ${
                  isReleasePending ? 'text-amber-300' : moderadorReleaseActive ? 'text-emerald-200' : 'text-foreground'
                }`}>
                  {displayedNextMoment?.responsavel || 'Nenhuma pessoa na fila'}
                </h2>
                <p className="text-base text-muted-foreground sm:text-xl">
                  {displayedNextMoment?.ministerio || displayedNextMoment?.funcao || 'Sem ministerio informado'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4 sm:text-base">
                <span>Entrada: <span className="font-mono text-foreground">{displayedNextMoment?.horarioInicio ?? '--:--'}</span></span>
                <span>Saida: <span className="font-mono text-foreground">{displayedNextMomentEnd}</span></span>
                <span>Momento: <span className="text-foreground">{displayedNextMoment?.atividade ?? 'Nenhum'}</span></span>
              </div>
              {isReleasePending ? (
                <>
                  <p className="text-sm text-amber-300 sm:text-base">Essa pessoa ja iniciou sem receber a liberacao.</p>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-amber-300/80">Tempo excedente sem liberacao</p>
                    <p className="font-mono text-5xl font-black leading-none text-amber-300 sm:text-7xl">
                      {formatTimerMs(pendingReleaseElapsedMs)}
                    </p>
                  </div>
                  <p className="text-xs text-amber-300">O card so vai avancar depois que a liberacao verde sair.</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground sm:text-base">{releaseLabel}</p>
                  <p className="text-xs text-muted-foreground">{releaseMeta}</p>
                </>
              )}
            </div>

            <div className="flex flex-col items-start gap-4 xl:items-end">
              <div className={`text-xs font-semibold uppercase tracking-[0.28em] ${
                isReleasePending ? 'text-amber-300' : moderadorReleaseActive ? 'text-emerald-300' : 'text-muted-foreground'
              }`}>
                {isReleasePending ? 'Liberacao pendente' : moderadorReleaseActive ? 'Liberacao ativa' : 'Aguardando liberacao'}
              </div>
              <button
                type="button"
                onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
                disabled={isSubmitting}
                className={`rounded-2xl px-8 py-4 text-base font-semibold transition-colors sm:px-10 sm:text-lg ${
                  isReleasePending
                    ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                    : moderadorReleaseActive
                      ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                } disabled:pointer-events-none disabled:opacity-50`}
              >
                {pendingAction === 'toggle-moderador-release'
                  ? 'Sincronizando...'
                  : moderadorReleaseActive
                    ? 'Liberacao Feita'
                    : 'Liberar'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <CallListSection
            callItems={callItems}
            isSubmitting={isSubmitting}
            onUpdateStatus={handleUpdateModeradorStatus}
          />
          <QueueSection
            queueItems={queueItems}
            moderadorReleaseActive={moderadorReleaseActive}
          />
        </div>

        <TimelineSection
          momentos={momentos}
          totalMinutes={totalMinutes}
          firstTime={firstTime}
          lastEnd={lastEnd}
          blockColors={blockColors}
          getMomentStatusForIndex={getMomentStatus}
          safeMomentElapsedMs={safeMomentElapsedMs}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
};

export default Moderador;
