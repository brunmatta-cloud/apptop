import { useCulto } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { calcularHorarioTermino, type ExecutionMode, type MomentoProgramacao } from '@/types/culto';
import {
  Play, Pause, SkipForward, SkipBack, FastForward, Users, Radio, Check,
  Plus, Minus, Zap, ZapOff, Send, EyeOff, Timer, ExternalLink
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useClock } from '@/hooks/useClock';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { formatTimerMs } from '@/utils/time';

const emptyCultoFallback = {
  nome: 'Culto carregando...',
  status: 'planejado' as const,
};

const normalizeMomento = (momento: Partial<MomentoProgramacao> | null | undefined, index: number): MomentoProgramacao => ({
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
  moderadorStatus: momento?.moderadorStatus === 'chamado' || momento?.moderadorStatus === 'pronto'
    ? momento.moderadorStatus
    : momento?.moderadorStatus === 'confirmado'
      ? 'pronto'
    : 'pendente',
  confirmacaoStatus: momento?.confirmacaoStatus === 'confirmado' || momento?.confirmacaoStatus === 'ausente'
    ? momento.confirmacaoStatus
    : momento?.moderadorStatus === 'confirmado' || momento?.moderadorStatus === 'ausente'
      ? momento.moderadorStatus
      : 'pendente',
  responsavelOriginal: typeof momento?.responsavelOriginal === 'string' ? momento.responsavelOriginal : undefined,
  duracaoOriginal: Number.isFinite(momento?.duracaoOriginal) ? Number(momento?.duracaoOriginal) : undefined,
});

const isExecutionMode = (value: string): value is ExecutionMode => value === 'manual' || value === 'automatico';

const getAdjustmentLabel = (momento: MomentoProgramacao | null) => {
  if (!momento || momento.duracaoOriginal == null) return 0;
  return Math.round((momento.duracao - momento.duracaoOriginal) * 60);
};

const connectionBadge = (status: string) => {
  if (status === 'online') return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';
  if (status === 'degraded') return 'border-amber-500/30 text-amber-300 bg-amber-500/10';
  return 'border-border text-muted-foreground bg-muted/40';
};

const connectionLabel = (status: string) => {
  if (status === 'online') return 'Sincronizado';
  if (status === 'degraded') return 'Sincronizacao parcial';
  if (status === 'offline') return 'Offline';
  return 'Conectando';
};

function PainelCerimonialista() {
  const cultoData = useCulto();
  const cronometroData = useCronometro();
  const [msgDraft, setMsgDraft] = useState('');
  const clockData = useClock();

  const {
    culto, momentos, currentIndex,
    executionMode, setExecutionMode, isPaused, elapsedMs, momentElapsedSeconds, momentElapsedMs,
    avancar, voltar, pausar, retomar, pular, iniciarCulto, finalizarCulto,
    getMomentStatus, marcarChamado, adjustCurrentMomentDuration,
    pendingAction, isSubmitting, lastError, connectionStatus,
    moderadorReleaseActive, toggleModeradorRelease,
  } = cultoData;

  const {
    isBlinking, toggleBlink,
    setMessage, showMessage, setShowMessage,
  } = cronometroData;

  const { currentTime, formatTime } = clockData;

  const safeCulto = culto ?? emptyCultoFallback;
  const safeMomentos = useMemo(
    () => (Array.isArray(momentos) ? momentos : []).map((momento, index) => normalizeMomento(momento, index)),
    [momentos]
  );
  const safeCurrentIndex = Number.isInteger(currentIndex) ? currentIndex : -1;
  const safeElapsedMs = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const safeMomentElapsedSeconds = Number.isFinite(momentElapsedSeconds) ? momentElapsedSeconds : 0;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const isDataReady = Boolean(culto) && Array.isArray(momentos);

  const currentMoment = safeCurrentIndex < 0 || safeCurrentIndex >= safeMomentos.length
    ? null
    : safeMomentos[safeCurrentIndex] ?? null;

  const totalMinutes = safeMomentos.reduce((sum, momento) => sum + (Number.isFinite(momento.duracao) ? momento.duracao : 0), 0);
  const totalMs = totalMinutes * 60 * 1000;
  const summaryProgressPercent = totalMs > 0 ? Math.min(100, (safeElapsedMs / totalMs) * 100) : 0;
  const summaryRemainingMs = Math.max(0, totalMs - safeElapsedMs);

  const chamadaItems = useMemo(() => {
    return safeMomentos.filter((momento, index) => {
      if (index <= safeCurrentIndex) return false;
      const minutesUntil = safeMomentos
        .slice(safeCurrentIndex >= 0 ? safeCurrentIndex : 0, index)
        .reduce((sum, item) => sum + (Number.isFinite(item.duracao) ? item.duracao : 0), 0);
      const adjustedMinutes = minutesUntil - Math.floor(safeMomentElapsedSeconds / 60);
      return adjustedMinutes <= momento.antecedenciaChamada && !momento.chamado;
    });
  }, [safeMomentos, safeCurrentIndex, safeMomentElapsedSeconds]);

  const nextMoments = useMemo(
    () => safeMomentos.slice(Math.max(0, safeCurrentIndex + 1), safeCurrentIndex + 5),
    [safeMomentos, safeCurrentIndex]
  );

  const { percent: currentMomentPercent, formattedRemaining } = useMomentProgress(currentMoment, safeMomentElapsedMs);
  const currentAdjustment = getAdjustmentLabel(currentMoment);
  const isCommandLocked = isSubmitting;
  const activeCommand = pendingAction ?? '';
  const currentMomentTotalMs = currentMoment ? currentMoment.duracao * 60 * 1000 : 0;
  const currentMomentRemainingMs = currentMoment ? Math.max(0, currentMomentTotalMs - safeMomentElapsedMs) : 0;
  const isCurrentMomentWarning = !!currentMoment && !isPaused && currentMomentRemainingMs <= 60000 && currentMomentRemainingMs > 20000;
  const isCurrentMomentDanger = !!currentMoment && !isPaused && currentMomentRemainingMs <= 20000;

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
            <span className="text-xl font-mono font-bold text-primary sm:text-2xl">{formatTime(currentTime)}</span>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-center sm:text-left ${connectionBadge(connectionStatus)}`}>
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
          <p className="mt-1 text-base font-bold font-display text-status-completed sm:text-lg">
            {safeCulto.status === 'em_andamento' ? (isPaused ? 'Pausado' : 'Em andamento') : safeCulto.status === 'finalizado' ? 'Finalizado' : 'Aguardando'}
          </p>
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
          <div className={`glass-card border p-3 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl sm:p-4 ${
            isCurrentMomentDanger
              ? 'border-red-500/50 bg-[linear-gradient(180deg,rgba(239,68,68,0.24)_0%,rgba(239,68,68,0.1)_100%)]'
              : isCurrentMomentWarning
                ? 'border-amber-500/50 bg-[linear-gradient(180deg,rgba(245,158,11,0.24)_0%,rgba(245,158,11,0.1)_100%)]'
                : 'border-status-executing/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.82)_100%)]'
          }`}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(230px,0.8fr)] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2 w-2 rounded-full animate-pulse ${
                    isCurrentMomentDanger ? 'bg-red-400' : isCurrentMomentWarning ? 'bg-amber-400' : 'bg-status-executing'
                  }`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
                    isCurrentMomentDanger ? 'text-red-200' : isCurrentMomentWarning ? 'text-amber-200' : 'text-status-executing'
                  }`}>Momento em execucao</span>
                  <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {currentMoment.funcao}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {currentMoment.ministerio}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-base font-black font-display text-foreground sm:text-lg lg:text-xl">
                  {currentMoment.atividade}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:max-w-[280px]">
                  <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Entrada</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">{currentMoment.horarioInicio}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Saida</p>
                    <p className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-border/60 bg-background/60 px-4 py-3 text-center lg:px-5">
                <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
                  isCurrentMomentDanger ? 'text-red-200' : isCurrentMomentWarning ? 'text-amber-200' : 'text-muted-foreground'
                }`}>Tempo restante</p>
                <p className={`mt-2 font-mono text-4xl font-black leading-none sm:text-5xl lg:text-[3.5rem] ${
                  isCurrentMomentDanger ? 'text-red-100' : isCurrentMomentWarning ? 'text-amber-100' : 'text-foreground'
                }`}>
                  {formatTimerMs(currentMomentRemainingMs)}
                </p>
                <p className={`mt-2 text-xs sm:text-sm ${
                  isCurrentMomentDanger ? 'text-red-100/90' : isCurrentMomentWarning ? 'text-amber-100/90' : 'text-muted-foreground'
                }`}>
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

      {safeCulto.status === 'em_andamento' && (
        <div className="glass-card border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14)_0%,rgba(16,185,129,0.06)_100%)] p-4 sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">Liberacao do moderador</p>
              <h3 className="mt-2 text-2xl font-display font-bold sm:text-3xl">
                {moderadorReleaseActive ? 'Liberacao ativa' : 'Aguardando liberar a proxima entrada'}
              </h3>
              <p className="mt-2 text-sm text-emerald-50/80 sm:text-base">
                Use este controle separado para sinalizar de forma clara quando o moderador pode liberar a pessoa no palco.
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
              disabled={isCommandLocked}
              className={`flex min-h-16 w-full items-center justify-center gap-3 rounded-[1.6rem] px-6 py-4 text-base font-semibold shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                moderadorReleaseActive
                  ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                  : 'border border-emerald-400/20 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              }`}
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
      )}

      {safeCulto.status === 'em_andamento' && (
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
      )}


{safeCulto.status === 'em_andamento' && (
        <div className="glass-card border border-primary/15 p-4 sm:p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controles</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5 xl:hidden sm:gap-3">
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

            <div className="hidden xl:grid xl:grid-cols-[repeat(6,minmax(0,1fr))] xl:gap-2">
              <button type="button" onClick={voltar} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-3 py-3 text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
                <SkipBack className="h-4.5 w-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>Voltar</span>
              </button>

              <button type="button" onClick={pular} disabled={isCommandLocked} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border/70 bg-muted/50 px-3 py-3 text-sm font-medium text-foreground transition-all hover:border-primary/20 hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
                <FastForward className="h-4.5 w-4.5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span>{activeCommand === 'skip' ? 'Pulando...' : 'Pular'}</span>
              </button>

              <button type="button" onClick={retomar} disabled={isCommandLocked || !isPaused} className="group flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--status-alert)/0.42)] bg-[linear-gradient(180deg,hsl(var(--status-alert)/0.34)_0%,hsl(var(--status-alert)/0.2)_100%)] px-3 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_-24px_hsl(var(--status-alert)/0.85)] transition-all hover:border-[hsl(var(--status-alert)/0.58)] hover:bg-[linear-gradient(180deg,hsl(var(--status-alert)/0.45)_0%,hsl(var(--status-alert)/0.26)_100%)] disabled:pointer-events-none disabled:opacity-50">
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
          </div>
        </div>
      )}

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
                      <p className="text-xs text-muted-foreground">{momento.ministerio} â€¢ {momento.funcao}</p>
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


