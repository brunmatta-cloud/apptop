import { useCulto } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { useRef, useCallback, memo } from 'react';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { formatTimerMs } from '@/utils/time';

const blend = (base: string, overlay: string, alpha: number) => {
  const toRgb = (hex: string) => {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  };

  const a = toRgb(base);
  const b = toRgb(overlay);
  return `rgb(${Math.round(a.r + (b.r - a.r) * alpha)}, ${Math.round(a.g + (b.g - a.g) * alpha)}, ${Math.round(a.b + (b.b - a.b) * alpha)})`;
};

const Cronometro = memo(() => {
  const { momentos, currentIndex, culto, momentElapsedMs } = useCulto();
  const {
    isBlinking,
    message,
    showMessage,
    orangeThreshold,
    redThreshold,
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
    connectionStatus,
  } = useCronometro();
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  if (!culto || typeof culto.status !== 'string') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Carregando cronometro...</p>
        </div>
      </div>
    );
  }

  const safeElapsedMs = typeof momentElapsedMs === 'number' ? momentElapsedMs : 0;
  const safeCurrentIndex = typeof currentIndex === 'number' ? currentIndex : -1;
  const safeMomentos = Array.isArray(momentos) ? momentos : [];
  const currentMoment = safeCurrentIndex >= 0 ? safeMomentos[safeCurrentIndex] : null;
  const nextMoment = safeCurrentIndex >= 0 ? safeMomentos[safeCurrentIndex + 1] : null;
  const { remainingSeconds, remainingMs, percent: progressPercent, formattedRemaining, remainingLabel } = useMomentProgress(currentMoment, safeElapsedMs);
  const isRed = remainingSeconds <= redThreshold && !!currentMoment;
  const isOrange = !isRed && remainingSeconds <= orangeThreshold && !!currentMoment;
  const accentColor = isRed ? dangerColor : isOrange ? warningColor : timerTextColor;
  const effectiveBackground = isRed ? blend(backgroundColor, dangerColor, 0.22) : isOrange ? blend(backgroundColor, warningColor, 0.16) : backgroundColor;
  const isNotStarted = culto.status === 'planejado';
  const isFinished = culto.status === 'finalizado';
  const connectionLabel = connectionStatus === 'online' ? 'Sincronizado' : connectionStatus === 'degraded' ? 'Sincronizacao parcial' : connectionStatus === 'offline' ? 'Offline' : 'Conectando';

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen flex flex-col items-center justify-center select-none cursor-pointer relative overflow-hidden"
      onClick={toggleFullscreen}
      style={{
        background: effectiveBackground,
        transition: 'background 0.5s ease',
      }}
    >
      {(isRed || isOrange) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isRed
              ? `radial-gradient(ellipse at center, ${dangerColor}33 0%, transparent 60%)`
              : `radial-gradient(ellipse at center, ${warningColor}22 0%, transparent 60%)`,
          }}
        />
      )}

      <div className="flex-1 flex flex-col items-center justify-between relative z-10 w-full px-4 py-[5vh] text-center">
        <div className="w-full flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/55">
          <span>{connectionLabel}</span>
          <span className="max-w-[38vw] truncate">{nextMoment ? `Proximo: ${nextMoment.atividade}` : 'Sem proximo comando'}</span>
        </div>
        <div className="w-full flex-1 flex flex-col items-center justify-center">
        {currentMoment && !showMessage && (
          <p
            className="uppercase mb-3"
            style={{
              color: isRed || isOrange ? '#f8fafc' : topTextColor,
              fontSize: `clamp(1.5rem, 5vw, ${topFontSize}rem)`,
              letterSpacing: '0.12em',
            }}
          >
            {currentMoment.atividade}
          </p>
        )}

        {showMessage && message ? (
          <p
            className={`font-display font-bold break-words max-w-[92vw] ${isBlinking ? 'cronometro-blink' : ''}`}
            style={{
              color: isRed || isOrange ? '#ffffff' : messageTextColor,
              fontSize: `clamp(2rem, 12vw, ${messageFontSize}rem)`,
            }}
          >
            {message}
          </p>
        ) : (
          <div
            className={`font-mono font-extrabold leading-none ${isBlinking ? 'cronometro-blink' : ''}`}
            style={{
              color: accentColor,
              fontSize: `clamp(7rem, 30vw, ${timerFontSize}rem)`,
              textShadow: `0 0 40px ${accentColor}55`,
            }}
          >
            {isNotStarted || isFinished ? formatTimerMs(0) : formattedRemaining}
          </div>
        )}

        {currentMoment && !showMessage && (
          <p
            className="mt-4 max-w-[80vw]"
            style={{
              color: isRed || isOrange ? '#e2e8f0' : bottomTextColor,
              fontSize: `clamp(1.2rem, 4vw, ${bottomFontSize}rem)`,
            }}
          >
            {currentMoment.responsavel}
          </p>
        )}
        </div>
      </div>

      <div className="w-[90%] relative z-10 mb-[4vh]">
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            height: 'clamp(28px, 4.5vh, 54px)',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div
            className="h-full rounded-2xl"
            style={{
              width: '100%',
              transform: `scaleX(${(isNotStarted || isFinished || remainingMs <= 0) ? 0 : Math.max(0, Math.min(1, progressPercent / 100))})`,
              transformOrigin: 'left',
              background: `linear-gradient(90deg, ${blend(accentColor, '#ffffff', 0.15)} 0%, ${accentColor} 100%)`,
              boxShadow: `0 0 30px ${accentColor}66`,
            }}
          />
        </div>
      </div>
    </div>
  );
});

Cronometro.displayName = 'Cronometro';
export default Cronometro;
