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
  moderadorStatus: momento?.moderadorStatus === 'chamado' || momento?.moderadorStatus === 'confirmado' || momento?.moderadorStatus === 'ausente'
    ? momento.moderadorStatus
    : 'pendente',
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
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[hsl(142_71%_45%/0.2)] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-[hsl(142_71%_45%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display">Painel do Cerimonialista</h1>
            <p className="text-muted-foreground text-sm truncate">{safeCulto.nome}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span className="text-xl sm:text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${connectionBadge(connectionStatus)}`}>
            {connectionLabel(connectionStatus)}
          </span>
          {safeCulto.status === 'planejado' && (
            <button
              type="button"
              onClick={iniciarCulto}
              disabled={!isDataReady || safeMomentos.length === 0 || isCommandLocked}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:px-5"
            >
              <Play className="w-4 h-4" /> {activeCommand === 'start' ? 'Iniciando...' : 'Iniciar Culto'}
            </button>
          )}
        </div>
      </div>

      {(lastError || isCommandLocked) && (
        <div className={`glass-card p-4 border ${lastError ? 'border-destructive/30' : 'border-primary/20'}`}>
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

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Progresso</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{Math.round(summaryProgressPercent)} %</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Decorrido</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{formatTimerMs(safeElapsedMs)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Restante</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{formatTimerMs(summaryRemainingMs)}</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</span>
          <p className="text-base sm:text-lg font-bold font-display mt-1 text-status-completed">
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
        <div className="glass-card border border-status-executing/20 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-status-executing animate-pulse" />
            <span className="text-xs font-semibold text-status-executing uppercase tracking-wider">Momento em execucao</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Users className="w-5 sm:w-6 h-5 sm:h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold break-words">{currentMoment.atividade}</h2>
              <p className="text-muted-foreground text-sm break-words">
                {currentMoment.responsavel} • {currentMoment.ministerio} • {currentMoment.funcao}
              </p>
              <div className="mt-3">
                <div className="progress-bar h-2 rounded-full">
                  <div
                    className="progress-bar-fill rounded-full"
                    style={{ transform: `scaleX(${currentMomentPercent / 100})`, transformOrigin: 'left', width: '100%' }}
                  />
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>{currentMoment.horarioInicio}</span>
                  <span className="text-center font-mono font-semibold text-foreground">
                    {isPaused ? `${formattedRemaining} pausado` : `${formattedRemaining} restantes`}
                  </span>
                  <span className="text-right">{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {safeCulto.status === 'em_andamento' && (
        <div className="glass-card border border-primary/15 p-4 sm:p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Controles</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
              <button type="button" onClick={voltar} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <SkipBack className="w-4 h-4" /> <span>Voltar</span>
              </button>
              {isPaused ? (
                <button type="button" onClick={retomar} disabled={isCommandLocked} className="col-span-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--status-alert))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--status-alert-foreground))] transition-all duration-200 hover:bg-[hsl(var(--status-alert))]/90 disabled:pointer-events-none disabled:opacity-50 sm:col-span-1 sm:px-6">
                  <span className="inline-flex items-center gap-2 transition-all duration-200 ease-out">
                    <Play className="w-4 h-4 transition-transform duration-200 ease-out" />
                    <span className="transition-all duration-200 ease-out">{activeCommand === 'resume' ? 'Retomando...' : 'Retomar'}</span>
                  </span>
                </button>
              ) : (
                <button type="button" onClick={pausar} disabled={isCommandLocked} className="col-span-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:col-span-1 sm:px-6">
                  <span className="inline-flex items-center gap-2 transition-all duration-200 ease-out">
                    <Pause className="w-4 h-4 transition-transform duration-200 ease-out" />
                    <span className="transition-all duration-200 ease-out">{activeCommand === 'pause' ? 'Pausando...' : 'Pausar'}</span>
                  </span>
                </button>
              )}
              <button type="button" onClick={avancar} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <span>{activeCommand === 'advance' ? 'Avancando...' : 'Avancar'}</span> <SkipForward className="w-4 h-4" />
              </button>
              <button type="button" onClick={pular} disabled={isCommandLocked} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 sm:px-5">
                <FastForward className="w-4 h-4" /> <span>{activeCommand === 'skip' ? 'Pulando...' : 'Pular'}</span>
              </button>
              <button type="button" onClick={finalizarCulto} disabled={isCommandLocked} className="col-span-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50 sm:col-span-1 sm:px-5">
                <Check className="w-4 h-4" /> <span>{activeCommand === 'finish' ? 'Finalizando...' : 'Finalizar'}</span>
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => toggleModeradorRelease(!moderadorReleaseActive)}
                disabled={isCommandLocked}
                  className={`w-full sm:w-auto min-w-[220px] min-h-14 px-6 sm:px-10 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-3 text-base font-semibold shadow-sm disabled:opacity-50 disabled:pointer-events-none ${
                  moderadorReleaseActive
                    ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>
                  {activeCommand === 'toggle-moderador-release'
                    ? 'Sincronizando...'
                    : moderadorReleaseActive
                      ? 'Liberacao ativa'
                      : 'Liberar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {safeCulto.status === 'em_andamento' && (
        <div className="glass-card border border-border/60 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4" /> Controle rapido
            </h3>
            <Link to="/cronometro-controle" className="text-xs text-primary hover:underline flex items-center gap-1">
              Completo <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <button type="button" onClick={() => safeAdjustDuration(-60)} disabled={isCommandLocked} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30 disabled:pointer-events-none disabled:opacity-50">
              <Minus className="w-3 h-3" /> 1min
            </button>
            <button type="button" onClick={() => safeAdjustDuration(60)} disabled={isCommandLocked} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[hsl(var(--status-completed)/0.2)] px-3 py-2 text-sm font-semibold text-[hsl(var(--status-completed))] transition-colors hover:bg-[hsl(var(--status-completed)/0.3)] disabled:pointer-events-none disabled:opacity-50">
              <Plus className="w-3 h-3" /> 1min
            </button>
            <button
              type="button"
              onClick={safeToggleBlink}
              disabled={isCommandLocked}
                className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isBlinking ? 'bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))]' : 'bg-muted hover:bg-muted/80'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {isBlinking ? <ZapOff className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {isBlinking ? 'Parar' : 'Piscar'}
            </button>
            {showMessage ? (
               <button type="button" onClick={safeClearMessage} disabled={isCommandLocked} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-destructive/20 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/30 disabled:pointer-events-none disabled:opacity-50">
                <EyeOff className="w-3 h-3" /> Tirar Msg
              </button>
            ) : (
              <div className="col-span-2 flex min-w-0 w-full items-center gap-1 sm:w-auto">
                <input
                  type="text"
                  value={msgDraft}
                  onChange={(event) => setMsgDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') handleSendMessage(); }}
                  placeholder="Mensagem..."
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 sm:w-40"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!msgDraft.trim() || isCommandLocked}
                  className="min-h-11 rounded-xl bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="order-2 space-y-4 min-w-0 xl:order-1">
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Programacao completa</h3>
            {safeMomentos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum momento carregado.</p>
            ) : (
              <div className="space-y-1">
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
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${status === 'concluido' ? 'text-muted-foreground line-through' : ''} break-words`}>
                          {momento.atividade}
                          {adjustment !== 0 && (
                            <span className={`ml-2 text-xs font-semibold ${adjustment > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
                              ({adjustment > 0 ? '+' : ''}{adjustment}s)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{momento.responsavel}</p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 space-y-4 min-w-0 xl:order-2">
          <div className="glass-card border border-status-alert/20 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-status-alert" />
              <span className="text-status-alert">Painel de Chamada</span>
            </h3>
            {chamadaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ninguem para ligar no momento</p>
            ) : (
              <div className="space-y-3">
                {chamadaItems.map((momento) => (
                  <div key={momento.id} className="rounded-xl border border-status-alert/20 bg-status-alert/10 p-3">
                    <p className="font-semibold text-sm">{momento.responsavel}</p>
                    <p className="text-xs text-muted-foreground">{momento.ministerio} • {momento.funcao}</p>
                    <p className="text-xs text-muted-foreground">{momento.atividade} as {momento.horarioInicio}</p>
                    <button
                      type="button"
                      onClick={() => marcarChamado(momento.id)}
                      disabled={isCommandLocked}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-status-completed/20 px-3 py-2 text-xs text-status-completed transition-colors hover:bg-status-completed/30 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Marcar como chamado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card border border-border/60 p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Proximos Momentos</h3>
            {nextMoments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum proximo momento</p>
            ) : (
              <div className="space-y-2">
                {nextMoments.map((momento) => (
                  <div key={momento.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/20">
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">{momento.horarioInicio}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm break-words">{momento.atividade}</span>
                      <span className="block text-xs text-muted-foreground truncate">{momento.responsavel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card border border-border/60 p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modo de execucao</h3>
            <select
              value={executionMode}
              onChange={(event) => handleExecutionModeChange(event.target.value)}
              disabled={isCommandLocked}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none"
            >
              <option value="manual">Manual</option>
              <option value="automatico">Automatico</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PainelCerimonialista;
