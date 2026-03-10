import { useCulto } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { useRef, useCallback, useEffect, memo } from 'react';
import { motion } from 'framer-motion';

const Cronometro = memo(() => {
  const { momentos, currentIndex, momentElapsedSeconds, culto } = useCulto();
  const { isBlinking, message, showMessage, orangeThreshold, redThreshold } = useCronometro();
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const baseDurationSec = currentMoment ? currentMoment.duracao * 60 : 0;
  const remainingSeconds = Math.max(0, baseDurationSec - momentElapsedSeconds);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const minStr = String(minutes).padStart(2, '0');
  const secStr = String(seconds).padStart(2, '0');

  const isRed = remainingSeconds <= redThreshold && !!currentMoment;
  const isOrange = !isRed && remainingSeconds <= orangeThreshold && !!currentMoment;

  // Use CSS custom properties to avoid re-renders for color changes
  const timerColor = isRed ? '#ef4444' : isOrange ? '#f59e0b' : '#ffffff';

  // Progress as CSS transform for GPU-accelerated animation
  const progressPercent = baseDurationSec > 0 ? (baseDurationSec - remainingSeconds) / baseDurationSec * 100 : 0;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const isNotStarted = culto.status === 'planejado';
  const isFinished = culto.status === 'finalizado';

  // Progress bar color
  const orangeEnd = baseDurationSec > 0 ? 100 - redThreshold / baseDurationSec * 100 : 100;
  const greenEnd = baseDurationSec > 0 ? 100 - orangeThreshold / baseDurationSec * 100 : 100;

  const progressColor = progressPercent > orangeEnd
    ? '#ef4444'
    : progressPercent > greenEnd
    ? '#f59e0b'
    : '#22c55e';

  const progressGlow = progressPercent > orangeEnd
    ? '0 0 30px rgba(239,68,68,0.5)'
    : progressPercent > greenEnd
    ? '0 0 30px rgba(245,158,11,0.4)'
    : '0 0 30px rgba(34,197,94,0.4)';

  // Background
  const bgStyle = isRed
    ? { background: 'linear-gradient(180deg, #1a0505 0%, #2d0a0a 50%, #1a0505 100%)' }
    : isOrange
    ? { background: 'linear-gradient(180deg, #1a1305 0%, #2d2008 50%, #1a1305 100%)' }
    : { background: '#000000' };

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen flex flex-col items-center justify-center select-none cursor-pointer relative overflow-hidden"
      onClick={toggleFullscreen}
      style={{
        ...bgStyle,
        transition: 'background 1s ease',
        willChange: 'background',
      }}
    >
      {/* Ambient glow - GPU accelerated */}
      {(isRed || isOrange) && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isRed
              ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.12) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 60%)',
            opacity: 1,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            willChange: 'opacity',
          }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
        {/* Activity name */}
        {currentMoment && !showMessage && (
          <p
            className="tracking-[0.2em] uppercase text-center mb-2 px-4 font-extrabold font-sans"
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Inter', 'Roboto', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 4rem)',
            }}
          >
            {currentMoment.atividade}
          </p>
        )}

        {/* Message overlay */}
        {showMessage && message ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-extrabold text-center px-8"
            style={{
              color: '#ffffff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(5rem, 16vw, 20rem)',
              letterSpacing: '-0.02em',
            }}
          >
            {message}
          </motion.div>
        ) : (
          <>
            {/* Timer - use will-change for smooth updates */}
            {(currentMoment || isNotStarted || isFinished) && !showMessage && (
              <div
                className={`flex items-center justify-center font-mono font-extrabold ${isBlinking ? 'animate-pulse' : ''}`}
                style={{
                  color: timerColor,
                  fontSize: 'clamp(10rem, 35vw, 55rem)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  transition: 'color 0.5s ease',
                  willChange: 'contents',
                }}
              >
                {isNotStarted || isFinished ? (
                  <>
                    <span>00</span>
                    <span style={{ opacity: 0.4, width: '0.25em', fontSize: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>:</span>
                    <span>00</span>
                  </>
                ) : (
                  <>
                    <span>{minStr[0]}</span>
                    <span>{minStr[1]}</span>
                    <span style={{ opacity: 0.4, width: '0.25em', fontSize: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>:</span>
                    <span>{secStr[0]}</span>
                    <span>{secStr[1]}</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress bar - GPU-accelerated with transform */}
      <div className="w-[90%] relative z-10 mb-[3vh]">
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            height: 'clamp(40px, 6vh, 80px)',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="h-full rounded-xl"
            style={{
              width: '100%',
              transform: `scaleX(${progressPercent / 100})`,
              transformOrigin: 'left',
              transition: 'transform 1s linear, background 0.5s ease',
              background: progressColor,
              boxShadow: progressGlow,
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  );
});

Cronometro.displayName = 'Cronometro';
export default Cronometro;
