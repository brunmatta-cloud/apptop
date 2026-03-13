import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { CommandDelayControl } from '@/components/culto/CommandDelayControl';
import { Slider } from '@/components/ui/slider';
import { useCallback, useState, memo } from 'react';
import { useCommandDelay } from '@/hooks/use-command-delay';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import {
  Plus, Minus, Zap, ZapOff, MessageSquare, Timer, Settings2, Send, EyeOff, Type, Palette, Copy
} from 'lucide-react';

const colorInputClass = 'h-11 w-full rounded-lg border border-border bg-muted px-2 py-1 cursor-pointer';

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-2">
    <label className="text-sm text-muted-foreground block">{label}</label>
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className={colorInputClass} />
      <span className="text-xs font-mono text-muted-foreground uppercase">{value}</span>
    </div>
  </div>
);

const DialControl = ({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  accent,
  onChange,
  formatter,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  accent: string;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
}) => {
  const normalized = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const displayValue = formatter ? formatter(value) : `${value}${suffix}`;

  const adjust = (delta: number) => {
    const nextValue = Math.min(max, Math.max(min, Number((value + delta).toFixed(2))));
    onChange(nextValue);
  };

  return (
    <div className="rounded-[1.2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(15,23,42,0.78)_100%)] p-3 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.88)]">
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${accent} 0% ${normalized}%, rgba(148,163,184,0.14) ${normalized}% 100%)`,
          }}
        >
          <div className="absolute inset-[5px] rounded-full bg-[rgba(15,23,42,0.94)]" />
          <span className="relative font-mono text-xs font-black text-foreground">{Math.round(normalized)}%</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-lg font-black leading-none text-foreground">{displayValue}</p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {suffix || 'nivel'}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjust(-step)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <Slider value={[value]} onValueChange={([next]) => onChange(next)} min={min} max={max} step={step} className="flex-1" />
            <button
              type="button"
              onClick={() => adjust(step)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{formatter ? formatter(min) : `${min}${suffix}`}</span>
            <span>{formatter ? formatter(max) : `${max}${suffix}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const CronometroControlePreview = memo(function CronometroControlePreview({
  currentMoment,
  nextMoment,
  showMessage,
  message,
  topFontSize,
  bottomFontSize,
  timerFontSize,
  messageFontSize,
  backgroundColor,
  timerTextColor,
  topTextColor,
  bottomTextColor,
  messageTextColor,
  warningColor,
  dangerColor,
  orangeThreshold,
  redThreshold,
  isBlinking,
}: {
  currentMoment: ReturnType<typeof useLiveCultoView>['currentMoment'];
  nextMoment: ReturnType<typeof useLiveCultoView>['nextMoment'];
  showMessage: boolean;
  message: string;
  topFontSize: number;
  bottomFontSize: number;
  timerFontSize: number;
  messageFontSize: number;
  backgroundColor: string;
  timerTextColor: string;
  topTextColor: string;
  bottomTextColor: string;
  messageTextColor: string;
  warningColor: string;
  dangerColor: string;
  orangeThreshold: number;
  redThreshold: number;
  isBlinking: boolean;
}) {
  const { momentElapsedMs } = useCultoTimer();
  const { remainingSeconds, progressScale: momentProgress, formattedRemaining, remainingLabel } = useMomentProgress(currentMoment, momentElapsedMs);
  const isDanger = remainingSeconds <= redThreshold && !!currentMoment;
  const isWarning = !isDanger && remainingSeconds <= orangeThreshold && !!currentMoment;
  const previewTimerColor = isDanger ? dangerColor : isWarning ? warningColor : timerTextColor;

  return (
    <div
      className="glass-card min-h-[46vh] overflow-hidden p-6 sm:p-8 lg:min-h-[56vh] lg:p-10"
      style={{ background: `radial-gradient(circle at top, ${warningColor}14 0%, transparent 32%), ${backgroundColor}` }}
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4 text-white/75">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Estado oficial</p>
            <p className="text-sm">{showMessage ? 'Mensagem publicada' : currentMoment ? 'Cronometro sincronizado' : 'Aguardando inicio'}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Proximo comando</p>
            <p className="max-w-[18rem] truncate text-sm">{nextMoment?.atividade ?? 'Nenhum'}</p>
          </div>
        </div>

        <p
          className="truncate text-center uppercase tracking-wider"
          style={{
            color: topTextColor,
            fontSize: `clamp(1rem, 3vw, ${topFontSize}rem)`,
          }}
        >
          {currentMoment ? `${currentMoment.bloco} - ${currentMoment.atividade}` : 'Nenhum momento em execucao'}
        </p>

        {showMessage && message ? (
          <p
            className="flex flex-1 items-center justify-center break-words text-center font-display font-bold"
            style={{
              color: messageTextColor,
              fontSize: `clamp(2.5rem, 8vw, ${messageFontSize}rem)`,
            }}
          >
            {message}
          </p>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div
              className={`font-mono font-bold ${isBlinking ? 'cronometro-blink' : ''}`}
              style={{
                color: previewTimerColor,
                fontSize: `clamp(6rem, 16vw, ${timerFontSize}rem)`,
                lineHeight: 1,
              }}
            >
              {formattedRemaining}
            </div>
            {currentMoment && (
              <p
                className="mt-4 text-center"
                style={{
                  color: bottomTextColor,
                  fontSize: `clamp(1rem, 3vw, ${bottomFontSize}rem)`,
                }}
              >
                {currentMoment.responsavel}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/10">
            <div
              className="h-full rounded-full transition-transform duration-300"
              style={{
                width: '100%',
                transform: `scaleX(${momentProgress})`,
                transformOrigin: 'left',
                background: `linear-gradient(90deg, ${timerTextColor}, ${previewTimerColor})`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 text-sm text-white/75">
            <span>{currentMoment ? `${remainingLabel} restantes` : 'Sem momento ativo'}</span>
            <span>{remainingSeconds}s</span>
          </div>
        </div>
      </div>
    </div>
  );
});

const CronometroControle = () => {
  const { adjustCurrentMomentDuration, pendingAction, isSubmitting, lastError, connectionStatus } = useCultoControls();
  const { currentIndex, currentMoment, nextMoment, culto } = useLiveCultoView();
  const {
    isBlinking,
    toggleBlink,
    message,
    setMessage,
    showMessage,
    setShowMessage,
    commandDelaySeconds,
    setCommandDelaySeconds,
    orangeThreshold,
    redThreshold,
    setOrangeThreshold,
    setRedThreshold,
    topFontSize,
    bottomFontSize,
    timerFontSize,
    messageFontSize,
    setTopFontSize,
    setBottomFontSize,
    setTimerFontSize,
    setMessageFontSize,
    backgroundColor,
    timerTextColor,
    topTextColor,
    bottomTextColor,
    messageTextColor,
    warningColor,
    dangerColor,
    setBackgroundColor,
    setTimerTextColor,
    setTopTextColor,
    setBottomTextColor,
    setMessageTextColor,
    setWarningColor,
    setDangerColor,
  } = useCronometro();

  const [msgDraft, setMsgDraft] = useState('');
  const [copiedCronometroLink, setCopiedCronometroLink] = useState(false);
  const {
    scheduledCommandLabel,
    remainingSeconds,
    scheduleCommand,
    cancelScheduledCommand,
  } = useCommandDelay(commandDelaySeconds);

  if (!culto || typeof currentIndex !== 'number') {
    return (
      <div className="p-6 space-y-4">
        <div className="glass-card p-4">
          <p className="text-muted-foreground">Carregando controle do cronometro...</p>
        </div>
      </div>
    );
  }
  const excessSeconds = currentMoment && currentMoment.duracaoOriginal != null
    ? Math.round((currentMoment.duracao - currentMoment.duracaoOriginal) * 60)
    : 0;
  const isLocked = isSubmitting;
  const connectionLabel = connectionStatus === 'online' ? 'Tempo ao vivo' : connectionStatus === 'degraded' ? 'Sincronizacao parcial' : connectionStatus === 'offline' ? 'Offline' : 'Conectando';
  const connectionClass = connectionStatus === 'online' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : connectionStatus === 'degraded' ? 'border-amber-500/30 text-amber-300 bg-amber-500/10' : 'border-border text-muted-foreground bg-muted/40';
  const runDelayedCommand = useCallback((label: string, action: () => void) => {
    scheduleCommand(label, action);
  }, [scheduleCommand]);

  const sendMessage = () => {
    const nextMessage = msgDraft.trim();
    if (!nextMessage) return;

    runDelayedCommand('Enviar mensagem', () => {
      setMessage(nextMessage);
      setShowMessage(true);
      setMsgDraft('');
    });
  };

  const clearMessage = () => {
    runDelayedCommand('Remover mensagem', () => {
      setShowMessage(false);
      setMessage('');
    });
  };

  const handleCopyCronometroLink = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const cronometroUrl = `${window.location.origin}/cronometro`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cronometroUrl);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = cronometroUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setCopiedCronometroLink(true);
      window.setTimeout(() => setCopiedCronometroLink(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link do cronometro:', error);
      setCopiedCronometroLink(false);
    }
  }, []);

  return (
    <div className="space-y-6 min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Controle do Cronometro</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${connectionClass}`}>
            {connectionLabel}
          </span>
          <button
            type="button"
            onClick={handleCopyCronometroLink}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              copiedCronometroLink
                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedCronometroLink ? 'Link copiado' : 'Copiar link'}
          </button>
          {pendingAction && (
            <span className="text-xs px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
              Processando: {pendingAction}
            </span>
          )}
        </div>
      </div>

      {lastError && (
        <div className="glass-card border border-destructive/30 p-4">
          <p className="text-sm text-destructive">{lastError}</p>
        </div>
      )}

      <CronometroControlePreview
        currentMoment={currentMoment}
        nextMoment={nextMoment}
        showMessage={showMessage}
        message={message}
        topFontSize={topFontSize}
        bottomFontSize={bottomFontSize}
        timerFontSize={timerFontSize}
        messageFontSize={messageFontSize}
        backgroundColor={backgroundColor}
        timerTextColor={timerTextColor}
        topTextColor={topTextColor}
        bottomTextColor={bottomTextColor}
        messageTextColor={messageTextColor}
        warningColor={warningColor}
        dangerColor={dangerColor}
        orangeThreshold={orangeThreshold}
        redThreshold={redThreshold}
        isBlinking={isBlinking}
      />

      <CommandDelayControl
        delaySeconds={commandDelaySeconds}
        onDelayChange={setCommandDelaySeconds}
        scheduledCommandLabel={scheduledCommandLabel}
        remainingSeconds={remainingSeconds}
        onCancelScheduled={cancelScheduledCommand}
        description="Aplica aos comandos ao vivo deste painel. O valor fica sincronizado entre dispositivos."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4" /> Ajuste de Tempo
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={isLocked} onClick={() => runDelayedCommand('Remover 1 minuto', () => adjustCurrentMomentDuration(-60))} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-semibold disabled:opacity-50 disabled:pointer-events-none">
              <Minus className="w-4 h-4" /> 1 min
            </button>
            <button type="button" disabled={isLocked} onClick={() => runDelayedCommand('Adicionar 1 minuto', () => adjustCurrentMomentDuration(60))} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[hsl(var(--status-completed)/0.2)] text-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed)/0.3)] transition-colors font-semibold disabled:opacity-50 disabled:pointer-events-none">
              <Plus className="w-4 h-4" /> 1 min
            </button>
            <button type="button" disabled={isLocked} onClick={() => runDelayedCommand('Remover 30 segundos', () => adjustCurrentMomentDuration(-30))} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none">
              <Minus className="w-4 h-4" /> 30s
            </button>
            <button type="button" disabled={isLocked} onClick={() => runDelayedCommand('Adicionar 30 segundos', () => adjustCurrentMomentDuration(30))} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[hsl(var(--status-completed)/0.1)] text-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed)/0.2)] transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none">
              <Plus className="w-4 h-4" /> 30s
            </button>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Piscar
          </h3>
          <button
            type="button"
            onClick={() => runDelayedCommand(isBlinking ? 'Parar de piscar' : 'Piscar cronometro', toggleBlink)}
            disabled={isLocked}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
              isBlinking
                ? 'bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))]'
                : 'bg-muted hover:bg-muted/80 text-foreground'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isBlinking ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {isBlinking ? 'Parar de Piscar' : 'Piscar Cronometro'}
          </button>
        </div>

        <div className="glass-card p-5 xl:col-span-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Mensagem no Cronometro
          </h3>
          {showMessage ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-primary/20" style={{ background: `${backgroundColor}cc` }}>
                <p className="text-sm text-muted-foreground mb-1">Mensagem exibida:</p>
                <p style={{ color: messageTextColor, fontSize: `${Math.min(messageFontSize, 6)}rem` }} className="font-display font-bold break-words">
                  {message}
                </p>
              </div>
              <button type="button" disabled={isLocked} onClick={clearMessage} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-semibold disabled:opacity-50 disabled:pointer-events-none">
                <EyeOff className="w-4 h-4" /> Remover Mensagem
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={msgDraft}
                  onChange={(event) => setMsgDraft(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                  placeholder="Digite a mensagem..."
                  className="flex-1 bg-muted border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!msgDraft.trim() || isLocked}
                  className="px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Limites de Cor
          </h3>
          <div className="grid gap-2.5">
            <DialControl
              label="Amarelo"
              value={orangeThreshold}
              min={10}
              max={600}
              step={5}
              suffix="s"
              accent={warningColor}
              onChange={setOrangeThreshold}
            />
            <DialControl
              label="Vermelho"
              value={redThreshold}
              min={5}
              max={300}
              step={5}
              suffix="s"
              accent={dangerColor}
              onChange={setRedThreshold}
            />
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Type className="w-4 h-4" /> Tamanho das Fontes
          </h3>
          <div className="grid gap-2.5">
            <DialControl
              label="Momento"
              value={topFontSize}
              min={1.25}
              max={8}
              step={0.25}
              suffix="rem"
              accent={topTextColor}
              onChange={setTopFontSize}
              formatter={(next) => `${next.toFixed(1)}rem`}
            />
            <DialControl
              label="Cronometro"
              value={timerFontSize}
              min={6}
              max={40}
              step={0.5}
              suffix="rem"
              accent={timerTextColor}
              onChange={setTimerFontSize}
              formatter={(next) => `${next.toFixed(1)}rem`}
            />
            <DialControl
              label="Responsavel"
              value={bottomFontSize}
              min={1}
              max={6}
              step={0.25}
              suffix="rem"
              accent={bottomTextColor}
              onChange={setBottomFontSize}
              formatter={(next) => `${next.toFixed(1)}rem`}
            />
            <DialControl
              label="Mensagem"
              value={messageFontSize}
              min={2}
              max={24}
              step={0.5}
              suffix="rem"
              accent={messageTextColor}
              onChange={setMessageFontSize}
              formatter={(next) => `${next.toFixed(1)}rem`}
            />
          </div>
        </div>

        <div className="glass-card p-5 xl:col-span-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Cores
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ColorField label="Cor de fundo" value={backgroundColor} onChange={setBackgroundColor} />
            <ColorField label="Cor do cronometro" value={timerTextColor} onChange={setTimerTextColor} />
            <ColorField label="Cor do momento" value={topTextColor} onChange={setTopTextColor} />
            <ColorField label="Cor do responsavel" value={bottomTextColor} onChange={setBottomTextColor} />
            <ColorField label="Cor da mensagem" value={messageTextColor} onChange={setMessageTextColor} />
            <ColorField label="Cor do amarelo" value={warningColor} onChange={setWarningColor} />
            <ColorField label="Cor do vermelho" value={dangerColor} onChange={setDangerColor} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CronometroControle;
