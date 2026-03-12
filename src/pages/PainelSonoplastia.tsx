import { useCulto, useCultoTimer } from '@/contexts/CultoContext';
import { calcularHorarioTermino, tipoMomentoLabel } from '@/types/culto';
import { Volume2, Mic, Video, PlayCircle, Bell, Maximize, Minimize } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, useRef, useMemo, memo } from 'react';
import { toast } from '@/hooks/use-toast';
import { useClock } from '@/hooks/useClock';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimerMs } from '@/utils/time';

const PainelSonoplastia = memo(() => {
  const { culto, momentos, currentIndex, getMomentStatus } = useCulto();
  const { momentElapsedMs, isPaused } = useCultoTimer();
  const { currentTime, formatTime } = useClock();
  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState<{ id: string; message: string; time: Date }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const alertedRef = useRef<Set<string>>(new Set());
  const pageRef = useRef<HTMLDivElement | null>(null);

  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const soundMoments = useMemo(() => momentos.filter(m => m.tipoMidia !== 'nenhum' || m.acaoSonoplastia), [momentos]);

  const nextSoundAction = useMemo(() => soundMoments.find(m => {
    const idx = momentos.findIndex(x => x.id === m.id);
    return idx > currentIndex;
  }), [soundMoments, momentos, currentIndex]);

  const remainingMsUntilNext = useMemo(() => {
    if (!currentMoment || !nextSoundAction) return Infinity;
    const nextIdx = momentos.findIndex(x => x.id === nextSoundAction.id);
    if (nextIdx <= currentIndex) return Infinity;
    const currentRemaining = Math.max(0, currentMoment.duracao * 60 * 1000 - safeMomentElapsedMs);
    const betweenMs = momentos.slice(currentIndex + 1, nextIdx).reduce((s, m) => s + m.duracao * 60 * 1000, 0);
    return currentRemaining + betweenMs;
  }, [currentMoment, nextSoundAction, momentos, currentIndex, safeMomentElapsedMs]);

  useEffect(() => {
    if (!nextSoundAction) return;
    const alertKey = `alert-10s-${nextSoundAction.id}`;
    if (remainingMsUntilNext <= 10000 && remainingMsUntilNext > 8000 && !alertedRef.current.has(alertKey)) {
      alertedRef.current.add(alertKey);
      const newAlert = {
        id: alertKey,
        message: `⚠️ 10 segundos para: ${nextSoundAction.atividade} — ${nextSoundAction.acaoSonoplastia || 'Preparar'}`,
        time: new Date(),
      };
      setAlerts(prev => [newAlert, ...prev].slice(0, 15));
      toast({
        title: '🔔 Atenção Sonoplastia!',
        description: `10 segundos para: ${nextSoundAction.atividade}`,
        variant: 'destructive',
      });
    }
  }, [remainingMsUntilNext, nextSoundAction]);

  useEffect(() => {
    alertedRef.current.clear();
  }, [currentIndex]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const mediaIcon = (tipo: string) => {
    switch (tipo) {
      case 'audio': return <Mic className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      default: return <Volume2 className="w-5 h-5" />;
    }
  };

  const { percent: currentProgress, formattedRemaining } = useMomentProgress(currentMoment, safeMomentElapsedMs);
  const isNextUrgent = remainingMsUntilNext <= 10000;

  const toggleFullscreen = async () => {
    if (!pageRef.current) return;

    if (document.fullscreenElement === pageRef.current) {
      await document.exitFullscreen();
      return;
    }

    await pageRef.current.requestFullscreen();
  };

  return (
    <div ref={pageRef} className={`space-y-6 ${isFullscreen ? 'min-h-screen bg-background p-4 sm:p-6' : ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(30_90%_50%/0.2)] flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-[hsl(30_90%_50%)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Painel da Sonoplastia</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {!isMobile && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span>{isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}</span>
            </button>
          )}
          <span className="text-xl sm:text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Próxima ação */}
      <div className={`glass-card p-4 sm:p-6 transition-all ${isNextUrgent ? 'ring-2 ring-status-alert border-status-alert/50' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className={`w-4 h-4 ${isNextUrgent ? 'text-status-alert' : 'text-status-next'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${isNextUrgent ? 'text-status-alert' : 'text-status-next'}`}>Próxima Ação</span>
        </div>
        {nextSoundAction ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className={`flex flex-col items-center justify-center shrink-0 ${isNextUrgent ? 'animate-pulse' : ''}`}>
              <span className={`font-mono font-black leading-none ${isNextUrgent ? 'text-status-alert' : 'text-primary'} ${remainingMsUntilNext < 60000 ? 'text-5xl sm:text-7xl' : 'text-4xl sm:text-5xl'}`}>
                {remainingMsUntilNext < Infinity ? formatTimerMs(remainingMsUntilNext) : '--:--'}
              </span>
              <span className={`text-xs mt-1 ${isNextUrgent ? 'text-status-alert font-bold' : 'text-muted-foreground'}`}>
                {isNextUrgent ? '⚠️ ATENÇÃO!' : 'até próxima ação'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${isNextUrgent ? 'bg-status-alert/20' : 'bg-muted'}`}>
                  {mediaIcon(nextSoundAction.tipoMidia)}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-base sm:text-lg truncate">{nextSoundAction.atividade}</p>
                  <p className="text-sm text-muted-foreground truncate">{nextSoundAction.responsavel}</p>
                </div>
              </div>
              {nextSoundAction.acaoSonoplastia && (
                <div className={`mt-3 p-3 rounded-lg ${isNextUrgent ? 'bg-status-alert/10 border border-status-alert/30' : 'bg-primary/10 border border-primary/20'}`}>
                  <p className={`text-[11px] uppercase tracking-wider font-semibold mb-0.5 ${isNextUrgent ? 'text-status-alert' : 'text-primary'}`}>Ação</p>
                  <p className="text-sm font-semibold">{nextSoundAction.acaoSonoplastia}</p>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{nextSoundAction.horarioInicio}</span>
                <span>•</span>
                <span>{nextSoundAction.tipoMidia === 'nenhum' ? 'Sem mídia' : nextSoundAction.tipoMidia === 'audio' ? 'Música' : 'Vídeo'}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">Nenhuma próxima ação</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          {/* Executando agora */}
          {currentMoment ? (
            <div className="glass-card p-4 sm:p-6 bg-muted/40 border border-muted-foreground/10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-status-executing animate-pulse" />
                <span className="text-xs font-semibold text-status-executing uppercase tracking-wider">Executando Agora</span>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {mediaIcon(currentMoment.tipoMidia)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-display font-bold truncate">{currentMoment.atividade}</h2>
                  <p className="text-muted-foreground text-sm truncate">{currentMoment.responsavel}</p>
                </div>
              </div>

              {currentMoment.acaoSonoplastia && (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-[11px] text-primary uppercase tracking-wider font-semibold mb-0.5">Ação</p>
                  <p className="text-sm font-medium">{currentMoment.acaoSonoplastia}</p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Tipo: {tipoMomentoLabel(currentMoment.tipoMomento)}</span>
                  <span>Mídia: {currentMoment.tipoMidia === 'nenhum' ? 'Nenhuma' : currentMoment.tipoMidia === 'audio' ? 'Música' : 'Vídeo'}</span>
                </div>
                <div className="progress-bar h-2 rounded-full">
                  <div className="progress-bar-fill rounded-full" style={{ transform: `scaleX(${currentProgress / 100})`, transformOrigin: 'left', width: '100%' }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{currentMoment.horarioInicio}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {isPaused ? `${formattedRemaining} pausado` : `${formattedRemaining} restantes`}
                  </span>
                  <span>{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <Volume2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aguardando início do culto</p>
            </div>
          )}

          {/* Fila da sonoplastia */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Fila da Sonoplastia</h3>
            <div className="space-y-2">
              {soundMoments.map(m => {
                const idx = momentos.findIndex(x => x.id === m.id);
                const status = getMomentStatus(idx);
                const isNext = nextSoundAction?.id === m.id;
                return (
                  <div key={m.id} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg transition-colors ${
                    status === 'executando' ? 'bg-status-executing/10 border border-status-executing/30' :
                    isNext ? 'bg-status-alert/5 border border-status-alert/20' :
                    'hover:bg-muted/20'
                  }`}>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {mediaIcon(m.tipoMidia)}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-10 sm:w-12">{m.horarioInicio}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${status === 'concluido' ? 'text-muted-foreground line-through' : ''}`}>{m.atividade}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.acaoSonoplastia}</p>
                    </div>
                    {status === 'executando' ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-status-executing/20 text-status-executing flex items-center gap-1 shrink-0">
                        <PlayCircle className="w-3 h-3" /> Agora
                      </span>
                    ) : status === 'concluido' ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-status-completed/20 text-status-completed shrink-0">✓</span>
                    ) : isNext ? (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-status-alert/20 text-status-alert font-semibold shrink-0">Próximo</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Alertas */}
        <div className="space-y-4">
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-status-alert" />
              <span className="text-status-alert">Alertas</span>
            </h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <AnimatePresence>
                  {alerts.map(a => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg bg-status-alert/10 border border-status-alert/20 text-sm"
                    >
                      <p>{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{a.time.toLocaleTimeString('pt-BR')}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PainelSonoplastia.displayName = 'PainelSonoplastia';
export default PainelSonoplastia;
