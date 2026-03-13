import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { calcularHorarioTermino, type ExecutionMode, type MomentoProgramacao } from '@/types/culto';
import {
  Play, Pause, SkipForward, SkipBack, FastForward, Users, Radio, Check,
  Plus, Minus, Zap, ZapOff, Send, EyeOff, Timer, ExternalLink
} from 'lucide-react';
import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useClock } from '@/hooks/useClock';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimerMs } from '@/utils/time';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

const emptyCultoFallback = {
  nome: 'Culto carregando...',
  status: 'planejado' as const,
};

const normalizeMomento = (momento: Partial<MomentoProgramacao> | null | undefined, index: number): MomentoProgramacao => {
  const moderadorStatusValue = String(momento?.moderadorStatus ?? '');
  const confirmacaoStatusValue = String(momento?.confirmacaoStatus ?? '');

  return {
    id: momento?.id || `momento-${index}`,
    cultoId: momento?.cultoId || '',
    ordem: Number.isFinite(momento?.ordem) ? Number(momento?.ordem) : index,
    bloco: momento?.bloco || '',
    horarioInicio: typeof momento?.horarioInicio === 'string' && momento.horarioInicio.includes(':') ? momento.horarioInicio : '00:00',
    duracao: Number.isFinite(momento?.duracao) ? Math.max(0, Number(momento?.duracao)) : 0,
    atividade: momento?.atividade || 'Momento sem nome',
    responsavel: momento?.responsavel || 'Nao informado',
    ministerio: momento?.ministerio || 'Nao informado',
    funcao: momento?.funcao || 'Nao informado',
    fotoUrl: momento?.fotoUrl || '',
    tipoMomento: momento?.tipoMomento || 'nenhum',
    tipoMidia: momento?.tipoMidia || 'nenhum',
    acaoSonoplastia: momento?.acaoSonoplastia || '',
    observacao: momento?.observacao || '',
    antecedenciaChamada: Number.isFinite(momento?.antecedenciaChamada) ? Math.max(0, Number(momento?.antecedenciaChamada)) : 0,
    chamado: Boolean(momento?.chamado),
    moderadorStatus: moderadorStatusValue === 'chamado' || moderadorStatusValue === 'pronto'
      ? moderadorStatusValue
      : moderadorStatusValue === 'confirmado'
        ? 'pronto'
      : 'pendente',
    confirmacaoStatus: confirmacaoStatusValue === 'confirmado' || confirmacaoStatusValue === 'ausente'
      ? confirmacaoStatusValue
      : moderadorStatusValue === 'confirmado' || moderadorStatusValue === 'ausente'
        ? (moderadorStatusValue as 'confirmado' | 'ausente')
      : 'pendente',
    responsavelOriginal: typeof momento?.responsavelOriginal === 'string' ? momento.responsavelOriginal : undefined,
    duracaoOriginal: Number.isFinite(momento?.duracaoOriginal) ? Number(momento?.duracaoOriginal) : undefined,
  };
};

const isExecutionMode = (value: string): value is ExecutionMode => value === 'manual' || value === 'automatico';

const getAdjustmentLabel = (momento: MomentoProgramacao | null) => {
  if (!momento || momento.duracaoOriginal == null) return 0;
  return Math.round((momento.duracao - momento.duracaoOriginal) * 60);
};

const connectionBadge = (status: string, isLight: boolean) => {
  if (status === 'online') return isLight ? 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
  if (status === 'degraded') return isLight ? 'border-amber-500/30 text-amber-700 bg-amber-500/10' : 'border-amber-500/30 text-amber-300 bg-amber-500/10';
  return 'border-border text-muted-foreground bg-muted/40';
};

const connectionLabel = (status: string) => {
  if (status === 'online') return 'Sincronizado';
  if (status === 'degraded') return 'Sincronizacao parcial';
  if (status === 'offline') return 'Offline';
  return 'Conectando';
};

const CerimonialistaHeaderClock = React.memo(function CerimonialistaHeaderClock() {
  const { currentTime, formatTime } = useClock();
  return <span className="text-xl font-mono font-bold text-primary sm:text-2xl">{formatTime(currentTime)}</span>;
});

const CerimonialistaLiveOverview = React.memo(function CerimonialistaLiveOverview({
  cultoStatus,
  safeMomentos,
  currentMoment,
  isLight,
}: {
  cultoStatus: string;
  safeMomentos: MomentoProgramacao[];
  currentMoment: MomentoProgramacao | null;
  isLight: boolean;
}) {
  const { isPaused, elapsedMs, momentElapsedSeconds, momentElapsedMs } = useCultoTimer();
  const safeElapsedMs = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;

  const totalMinutes = useMemo(
    () => safeMomentos.reduce((sum, momento) => sum + (Number.isFinite(momento.duracao) ? momento.duracao : 0), 0),
    [safeMomentos],
  );
  const totalMs = totalMinutes * 60 * 1000;
  const summaryProgressPercent = totalMs > 0 ? Math.min(100, (safeElapsedMs / totalMs) * 100) : 0;
  const summaryRemainingMs = Math.max(0, totalMs - safeElapsedMs);
  const { percent: currentMomentPercent } = useMomentProgress(currentMoment, safeMomentElapsedMs);
  const currentMomentTotalMs = currentMoment ? currentMoment.duracao * 60 * 1000 : 0;
  const currentMomentRemainingMs = currentMoment ? Math.max(0, currentMomentTotalMs - safeMomentElapsedMs) : 0;
  const isCurrentMomentWarning = !!currentMoment && !isPaused && currentMomentRemainingMs <= 60000 && currentMomentRemainingMs > 20000;
  const isCurrentMomentDanger = !!currentMoment && !isPaused && currentMomentRemainingMs <= 20000;
  const currentMomentCardClass = isCurrentMomentDanger
    ? isLight
      ? 'border-red-300/70 bg-[linear-gradient(180deg,rgba(255,245,245,0.98)_0%,rgba(254,226,226,0.7)_100%)] shadow-[0_18px_50px_-30px_rgba(239,68,68,0.28)]'
      : 'border-red-500/50 bg-[linear-gradient(180deg,rgba(239,68,68,0.24)_0%,rgba(239,68,68,0.1)_100%)]'
    : isCurrentMomentWarning
      ? isLight
        ? 'border-amber-300/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.78)_100%)] shadow-[0_18px_50px_-30px_rgba(245,158,11,0.25)]'
        : 'border-amber-500/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.24)_0%,rgba(245,158,11,0.1)_100%)]'
      : isLight
        ? 'border-status-executing/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(239,246,255,0.9)_100%)] shadow-[0_18px_50px_-30px_rgba(37,99,235,0.16)]'
        : 'border-status-executing/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.82)_100%)]';
  const currentMomentAccentClass = isCurrentMomentDanger
    ? isLight ? 'text-red-700' : 'text-red-200'
    : isCurrentMomentWarning
      ? isLight ? 'text-amber-700' : 'text-amber-200'
      : isLight ? 'text-[hsl(var(--status-executing))]' : 'text-status-executing';
  const currentMomentTimeClass = isCurrentMomentDanger
    ? isLight ? 'text-red-900' : 'text-red-100'
    : isCurrentMomentWarning
      ? isLight ? 'text-amber-900' : 'text-amber-100'
      : 'text-foreground';
  const currentMomentHintClass = isCurrentMomentDanger
    ? isLight ? 'text-red-800/90' : 'text-red-100/90'
    : isCurrentMomentWarning
      ? isLight ? 'text-amber-800/90' : 'text-amber-100/90'
      : 'text-muted-foreground';
  const cultoStatusLabel = cultoStatus === 'em_andamento'
    ? (isPaused ? 'Pausado' : 'Em andamento')
    : cultoStatus === 'finalizado'
      ? 'Finalizado'
      : 'Aguardando';

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Progresso</span>
          <p className="mt-1 text-xl font-bold font-display sm:text-2xl">{Math.round(summaryProgressPercent)} %</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Decorrido</span>
          <p className="mt-1 text-xl font-bold font-display sm:text-2xl">{formatTimerMs(safeElapsedMs)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Restante</span>
          <p className="mt-1 text-xl font-bold font-display sm:text-2xl">{formatTimerMs(summaryRemainingMs)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</span>
          <p className="mt-1 text-base font-bold font-display text-status-completed sm:text-lg">{cultoStatusLabel}</p>
        </div>
      </div>

      <div className="glass-card border border-border/60 p-4">
        <div className="progress-bar h-2.5 rounded-full">
          <div
            className="progress-bar-fill rounded-full"
            style={{ transform: `scaleX(${summaryProgressPercent / 100})`, transformOrigin: 'left', width: '100%' }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{totalMinutes} min planejados</span>
          <span>{Math.round(summaryProgressPercent)} %</span>
        </div>
      </div>

      {currentMoment && (
        <div className="sticky top-2 z-20 sm:top-3 lg:top-4">
          <div className={cn("glass-card border p-3 backdrop-blur-xl sm:p-4", currentMomentCardClass)}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(230px,0.8fr)] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2 w-2 rounded-full animate-pulse ${
                    isCurrentMomentDanger ? 'bg-red-400' : isCurrentMomentWarning ? 'bg-amber-400' : 'bg-status-executing'
                  }`} />
                  <span className={cn("text-[10px] font-semibold uppercase tracking-[0.24em]", currentMomentAccentClass)}>Momento em execucao</span>
                  <span className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
                    isLight ? 'border-border/80 bg-white/80' : 'border-border/60 bg-background/60'
                  )}>
                    {currentMoment.funcao}
                  </span>
                  <span className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
                    isLight ? 'border-border/80 bg-white/80' : 'border-border/60 bg-background/60'
                  )}>
                    {currentMoment.ministerio}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-base font-black font-display text-foreground sm:text-lg lg:text-xl">
                  {currentMoment.atividade}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-[280px]">
                  <div className={cn("rounded-2xl border px-3 py-2.5", isLight ? 'border-border/80 bg-white/82' : 'border-border/60 bg-background/55')}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Entrada</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">{currentMoment.horarioInicio}</p>
                  </div>
                  <div className={cn("rounded-2xl border px-3 py-2.5", isLight ? 'border-border/80 bg-white/82' : 'border-border/60 bg-background/55')}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Saida</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</p>
                  </div>
                </div>
              </div>

              <div className={cn(
                "rounded-[1.4rem] border px-4 py-3 text-center lg:px-5",
                isLight ? 'border-border/80 bg-white/84' : 'border-border/60 bg-background/60'
              )}>
                <p className={cn("text-[10px] font-semibold uppercase tracking-[0.24em]", isCurrentMomentDanger || isCurrentMomentWarning ? currentMomentAccentClass : 'text-muted-foreground')}>Tempo restante</p>
                <p className={cn("mt-2 font-mono text-4xl font-black leading-none sm:text-5xl lg:text-[3.5rem]", currentMomentTimeClass)}>
                  {formatTimerMs(currentMomentRemainingMs)}
                </p>
                <p className={cn("mt-2 text-xs sm:text-sm", currentMomentHintClass)}>
                  {isPaused
                    ? 'Cronometro pausado'
                    : isCurrentMomentDanger
                      ? 'Menos de 20 segundos'
                      : isCurrentMomentWarning
                        ? 'Menos de 1 minuto'
                        : 'Acompanhamento ao vivo'}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="progress-bar h-2 rounded-full">
                <div
                  className="progress-bar-fill rounded-full"
                  style={{ transform: `scaleX(${currentMomentPercent / 100})`, transformOrigin: 'left', width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

const CerimonialistaCallPanel = React.memo(function CerimonialistaCallPanel({
  safeMomentos,
  safeCurrentIndex,
  isCommandLocked,
  marcarChamado,
}: {
  safeMomentos: MomentoProgramacao[];
  safeCurrentIndex: number;
  isCommandLocked: boolean;
  marcarChamado: (id: string) => void;
}) {
  const { momentElapsedSeconds } = useCultoTimer();
  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;

  const chamadaItems = useMemo(() => {
    return safeMomentos.filter((momento, index) => {
      if (index <= safeCurrentIndex) return false;
      const minutesUntil = safeMomentos
        .slice(safeCurrentIndex >= 0 ? safeCurrentIndex : 0, index)
        .reduce((sum, item) => sum + (Number.isFinite(item.duracao) ? item.duracao : 0), 0);
      const adjustedMinutes = minutesUntil - Math.floor(safeMomentElapsedSeconds / 60);
      return adjustedMinutes <= momento.antecedenciaChamada && !momento.chamado;
    });
  }, [safeCurrentIndex, safeMomentElapsedSeconds, safeMomentos]);

  return (
    <div className="glass-card border border-status-alert/20 p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <Users className="h-4 w-4 text-status-alert" />
        <span className="text-status-alert">Painel de Chamada</span>
      </h3>
      {chamadaItems.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Ninguem para ligar no momento</p>
      ) : (
        <div className="space-y-3">
          {chamadaItems.map((momento) => (
            <div key={momento.id} className="rounded-xl border border-status-alert/20 bg-status-alert/10 p-3">
              <p className="text-sm font-semibold">{momento.responsavel}</p>
              <p className="text-xs text-muted-foreground">{momento.ministerio} • {momento.funcao}</p>
              <p className="text-xs text-muted-foreground">{momento.atividade} as {momento.horarioInicio}</p>
              <button
                type="button"
                onClick={() => marcarChamado(momento.id)}
                disabled={isCommandLocked}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-status-completed/20 px-3 py-2 text-xs font-semibold text-status-completed transition-colors hover:bg-status-completed/30 disabled:pointer-events-none disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Marcar como chamado
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

function PainelCerimonialista() {
  const cultoData = useCultoControls();
  const liveCultoData = useLiveCultoView();
  const cronometroData = useCronometro();
  const [msgDraft, setMsgDraft] = useState('');
  const isMobile = useIsMobile();
  const { resolvedTheme = 'dark' } = useTheme();
  const isLight = resolvedTheme === 'light';

  const {
    setExecutionMode,
    avancar, voltar, pausar, retomar, pular, iniciarCulto, finalizarCulto,
    marcarChamado, adjustCurrentMomentDuration,
    pendingAction, isSubmitting, lastError, connectionStatus,
    toggleModeradorRelease,
  } = cultoData;
  const {
    culto,
    momentos,
    currentIndex,
    currentMoment: liveCurrentMoment,
    getMomentStatus,
    isLive,
    isPaused,
    executionMode,
    moderadorReleaseActive,
  } = liveCultoData;

  const {
    isBlinking, toggleBlink,
    setMessage, showMessage, setShowMessage,
  } = cronometroData;

  const safeCulto = culto ?? emptyCultoFallback;
  const safeMomentos = useMemo(
    () => (Array.isArray(momentos) ? momentos : []).map((momento, index) => normalizeMomento(momento, index)),
    [momentos]
  );
  const safeCurrentIndex = Number.isInteger(currentIndex) ? currentIndex : -1;
  const isDataReady = Boolean(culto) && Array.isArray(momentos);

  const currentMoment = liveCurrentMoment ? normalizeMomento(liveCurrentMoment, safeCurrentIndex) : null;

  const nextMoments = useMemo(
    () => safeMomentos.slice(Math.max(0, safeCurrentIndex + 1), safeCurrentIndex + 5),
    [safeMomentos, safeCurrentIndex]
  );

  const currentAdjustment = getAdjustmentLabel(currentMoment);
  const isCommandLocked = isSubmitting;
  const activeCommand = pendingAction ?? '';
  const releaseCardClass = isLight
    ? 'border-emerald-300/45 bg-[linear-gradient(180deg,rgba(236,253,245,0.98)_0%,rgba(209,250,229,0.64)_100%)]'
    : 'border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.06)_100%)]';
  const releaseEyebrowClass = isLight ? 'text-emerald-700' : 'text-emerald-300';
  const releaseDescriptionClass = isLight ? 'text-emerald-900/80' : 'text-emerald-50/80';
  const releaseButtonClass = moderadorReleaseActive
    ? isLight
      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
      : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
    : isLight
      ? 'border border-emerald-300/60 bg-white/90 text-emerald-700 hover:bg-emerald-50'
      : 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25';

  const handleSendMessage = useCallback(() => {
    try {
      const message = msgDraft.trim();
      if (!message) return;
      setMessage(message);
      setShowMessage(true);
      setMsgDraft('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }, [msgDraft, setMessage, setShowMessage]);

  const safeAdjustDuration = useCallback((delta: number) => {
    try {
      adjustCurrentMomentDuration(delta);
    } catch (error) {
      console.error('Erro ao ajustar duracao do momento atual:', error);
    }
  }, [adjustCurrentMomentDuration]);

  const safeToggleBlink = useCallback(() => {
    try {
      toggleBlink();
    } catch (error) {
      console.error('Erro ao alternar efeito visual do cronometro:', error);
    }
  }, [toggleBlink]);

  const safeClearMessage = useCallback(() => {
    try {
      setShowMessage(false);
      setMessage('');
    } catch (error) {
      console.error('Erro ao limpar mensagem do cronometro:', error);
    }
  }, [setMessage, setShowMessage]);

  const handleExecutionModeChange = useCallback((mode: string) => {
    if (isExecutionMode(mode)) {
      setExecutionMode(mode);
    }
  }, [setExecutionMode]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 sm:space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(142_71%_45%/0.2)]">
            <Radio className="h-5 w-5 text-[hsl(142_71%_45%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold font-display sm:text-2xl">Painel do Cerimonialista</h1>
            <p className="truncate text-sm text-muted-foreground">{safeCulto.nome}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_auto] xl:flex xl:flex-wrap xl:items-center xl:justify-end">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center sm:text-left">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Agora</p>
            <CerimonialistaHeaderClock />
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-center sm:text-left ${connectionBadge(connectionStatus, isLight)}`}>
            <p className="text-[11px] uppercase tracking-[0.24em]">Conexao</p>
            <span className="mt-1 block text-sm font-semibold">{connectionLabel(connectionStatus)}</span>
          </div>
          {safeCulto.status === 'planejado' && (
            <button
              type="button"
              onClick={iniciarCulto}
              disabled={!isDataReady || safeMomentos.length === 0 || isCommandLocked}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:col-span-2 xl:w-auto xl:px-5"
            >
              <Play className="h-4 w-4" /> {activeCommand === 'start' ? 'Iniciando...' : 'Iniciar Culto'}
            </button>
          )}
        </div>
      </div>

      {(lastError || isCommandLocked) && (
        <div className={`glass-card border p-4 ${lastError ? 'border-destructive/30' : 'border-primary/20'}`}>
          <p className={`text-sm ${lastError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {lastError ?? `Comando em processamento: ${activeCommand}. A interface sera reidratada ao confirmar.`}
          </p>
        </div>
      )}

      {!isDataReady && (
        <div className="glass-card border border-border/60 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Carregando dados do painel. Os comandos ficam bloqueados ate o estado ficar consistente.
          </p>
        </div>
      )}

      <CerimonialistaLiveOverview
        cultoStatus={safeCulto.status}
        safeMomentos={safeMomentos}
        currentMoment={currentMoment}
        isLight={isLight}
      />

      <div
        aria-hidden={!isLive}
        className={`${isLive ? 'block' : 'pointer-events-none max-h-0 overflow-hidden opacity-0'} transition-opacity duration-200`}
      >
        <div className={cn("glass-card border p-4 sm:p-5 lg:p-6", releaseCardClass)}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div className="min-w-0">
              <p className={cn("text-[11px] uppercase tracking-[0.24em]", releaseEyebrowClass)}>Liberacao do moderador</p>
              <h3 className="mt-2 text-2xl font-display font-bold sm:text-3xl">
                {moderadorReleaseActive ? 'Liberacao ativa' : 'Aguardando liberar a proxima entrada'}
              </h3>
              <p className={cn("mt-2 text-sm sm:text-base", releaseDescriptionClass)}>
                Use este controle separado para sinalizar de forma clara quando o moderador pode liberar a pessoa no palco.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
              disabled={isCommandLocked}
              className={cn(
                "flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.6rem] px-6 py-4 text-base font-semibold shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50",
                releaseButtonClass
              )}
            >
              <Users className="h-5 w-5" />
              <span>
                {activeCommand === 'toggle-moderador-release'
                  ? 'Sincronizando...'
                  : moderadorReleaseActive
                    ? 'Liberacao Feita'
                    : 'Liberar Agora'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        aria-hidden={!isLive}
        className={`${isLive ? 'block' : 'pointer-events-none max-h-0 overflow-hidden opacity-0'} transition-opacity duration-200`}
      >
        <div className="glass-card border border-border/60 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Timer className="h-4 w-4" /> Controle rapido
            </h3>
            <Link to="/cronometro-controle" className="flex items-center gap-1 text-xs text-primary hover:underline">
              Completo <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,auto))_minmax(220px,1fr)]">
            <button type="button" onClick={() => safeAdjustDuration(-60)} disabled={isCommandLocked} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30 disabled:pointer-events-none disabled:opacity-50">
              <Minus className="h-3 w-3" /> 1min
            </button>
            <button type="button" onClick={() => safeAdjustDuration(60)} disabled={isCommandLocked} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[hsl(var(--status-completed)/0.2)] px-3 py-2 text-sm font-semibold text-[hsl(var(--status-completed))] transition-colors hover:bg-[hsl(var(--status-completed)/0.3)] disabled:pointer-events-none disabled:opacity-50">
              <Plus className="h-3 w-3" /> 1min
            </button>
            <button
              type="button"
              onClick={safeToggleBlink}
              disabled={isCommandLocked}
              className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isBlinking ? 'bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))]' : 'bg-muted hover:bg-muted/80'
              } disabled:pointer-events-none disabled:opacity-50`}
            >
              {isBlinking ? <ZapOff className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {isBlinking ? 'Parar' : 'Piscar'}
            </button>
            {showMessage ? (
              <button type="button" onClick={safeClearMessage} disabled={isCommandLocked} className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-destructive/20 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/30 disabled:pointer-events-none disabled:opacity-50 md:col-span-1">
                <EyeOff className="h-3 w-3" /> Tirar Msg
              </button>
            ) : (
              <div className="col-span-2 flex min-w-0 w-full items-center gap-1 md:col-span-4 xl:col-span-1">
                <input
                  type="text"
                  value={msgDraft}
                  onChange={(event) => setMsgDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleSendMessage(); }}
                  placeholder="Mensagem..."
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!msgDraft.trim() || isCommandLocked}
                  className="min-h-11 rounded-xl bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            )}
            {currentAdjustment !== 0 && (
              <span className={`col-span-2 text-xs font-semibold ${currentAdjustment > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
                Ajuste: {currentAdjustment > 0 ? '+' : ''}{currentAdjustment}s
              </span>
            )}
          </div>
        </div>
      </div>


      <div
        aria-hidden={!isLive}
        className={`${isLive ? 'block' : 'pointer-events-none max-h-0 overflow-hidden opacity-0'} transition-opacity duration-200`}
      >
        <div className="glass-card border border-primary/15 p-4 sm:p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controles</h3>
          <div className="space-y-3">
            {isMobile ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button type="button" onClick={voltar} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <SkipBack className="h-4 w-4" /> <span>Voltar</span>
              </button>
              <button type="button" onClick={pular} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <FastForward className="h-4 w-4" /> <span>{activeCommand === 'skip' ? 'Pulando...' : 'Pular'}</span>
              </button>
              <button type="button" onClick={retomar} disabled={isCommandLocked || !isPaused} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--status-alert))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--status-alert-foreground))] transition-all duration-200 hover:bg-[hsl(var(--status-alert))]/90 disabled:pointer-events-none disabled:opacity-50 sm:px-6">
                <span className="inline-flex items-center gap-2 transition-all duration-200 ease-out">
                  <Play className="h-4 w-4 transition-transform duration-200 ease-out" />
                  <span className="transition-all duration-200 ease-out">{activeCommand === 'resume' ? 'Retomando...' : 'Retomar'}</span>
                </span>
              </button>
              <button type="button" onClick={pausar} disabled={isCommandLocked || isPaused} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:px-6">
                <span className="inline-flex items-center gap-2 transition-all duration-200 ease-out">
                  <Pause className="h-4 w-4 transition-transform duration-200 ease-out" />
                  <span className="transition-all duration-200 ease-out">{activeCommand === 'pause' ? 'Pausando...' : 'Pausar'}</span>
                </span>
              </button>
              <button type="button" onClick={avancar} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <span>{activeCommand === 'advance' ? 'Avancando...' : 'Avancar'}</span> <SkipForward className="h-4 w-4" />
              </button>
              <button type="button" onClick={finalizarCulto} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <Check className="h-4 w-4" /> <span>{activeCommand === 'finish' ? 'Finalizando...' : 'Finalizar'}</span>
              </button>
            </div>
            ) : (
            <div className="grid xl:grid-cols-[repeat(6,minmax(0,1fr))] xl:gap-2">
              <button type="button" onClick={voltar} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-3 py-3 text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
                <SkipBack className="h-4.5 w-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>Voltar</span>
              </button>

              <button type="button" onClick={pular} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-3 py-3 text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
                <FastForward className="h-4.5 w-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>{activeCommand === 'skip' ? 'Pulando...' : 'Pular'}</span>
              </button>

              <button type="button" onClick={retomar} disabled={isCommandLocked || !isPaused} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--status-alert)/0.42)] bg-[hsl(var(--status-alert))] px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-[hsl(var(--status-alert))]/90 disabled:pointer-events-none disabled:opacity-50">
                <Play className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" />
                <span>{activeCommand === 'resume' ? 'Retomando...' : 'Retomar'}</span>
              </button>

              <button type="button" onClick={pausar} disabled={isCommandLocked || isPaused} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/90 px-3 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary disabled:pointer-events-none disabled:opacity-50">
                <Pause className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" />
                <span>{activeCommand === 'pause' ? 'Pausando...' : 'Pausar'}</span>
              </button>

              <button type="button" onClick={avancar} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                <SkipForward className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                <span>{activeCommand === 'advance' ? 'Avancando...' : 'Avancar'}</span>
              </button>

              <button type="button" onClick={finalizarCulto} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive px-3 py-3 text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50">
                <Check className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105" />
                <span>{activeCommand === 'finish' ? 'Finalizando...' : 'Finalizar'}</span>
              </button>
            </div>
            )}
          </div>
        </div>
      </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="order-2 min-w-0 space-y-4 xl:order-1">
          <div className="glass-card p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Programacao completa</h3>
            {safeMomentos.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum momento carregado.</p>
            ) : (
              <div className="space-y-1 lg:max-h-[780px] lg:overflow-y-auto lg:pr-1">
                {safeMomentos.map((momento, index) => {
                  const status = getMomentStatus(index);
                  const adjustment = getAdjustmentLabel(momento);
                  return (
                    <div
                      key={momento.id}
                      className={`flex flex-col gap-2 rounded-lg p-2 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:p-3 ${
                        status === 'executando' ? 'bg-status-executing/10' : 'hover:bg-muted/20'
                      }`}
                    >
                      <span className="w-full shrink-0 text-xs font-mono text-muted-foreground sm:w-12 sm:text-sm">{momento.horarioInicio}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`break-words text-sm font-medium ${status === 'concluido' ? 'text-muted-foreground line-through' : ''}`}>
                          {momento.atividade}
                          {adjustment !== 0 && (
                            <span className={`ml-2 text-xs font-semibold ${adjustment > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
                              ({adjustment > 0 ? '+' : ''}{adjustment}s)
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{momento.responsavel}</p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 min-w-0 xl:order-2">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <CerimonialistaCallPanel
              safeMomentos={safeMomentos}
              safeCurrentIndex={safeCurrentIndex}
              isCommandLocked={isCommandLocked}
              marcarChamado={marcarChamado}
            />

            <div className="glass-card border border-border/60 p-4 sm:p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proximos Momentos</h3>
              {nextMoments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum proximo momento</p>
              ) : (
                <div className="space-y-2">
                  {nextMoments.map((momento) => (
                    <div key={momento.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/20">
                      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">{momento.horarioInicio}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block break-words text-sm">{momento.atividade}</span>
                        <span className="block truncate text-xs text-muted-foreground">{momento.responsavel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card border border-border/60 p-4 sm:p-5 md:col-span-2 xl:col-span-1">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Modo de execucao</h3>
              <select
                value={executionMode}
                onChange={(event) => handleExecutionModeChange(event.target.value)}
                disabled={isCommandLocked}
                className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <option value="manual">Manual</option>
                <option value="automatico">Automatico</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PainelCerimonialista;






