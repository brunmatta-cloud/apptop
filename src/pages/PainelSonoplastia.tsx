import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Maximize, Mic, Minimize, Video, Volume2 } from 'lucide-react';
import { useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { useClock } from '@/hooks/useClock';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { toast } from '@/hooks/use-toast';
import { formatTimerMs } from '@/utils/time';
import { calcularHorarioTermino, tipoMomentoLabel, type MomentoProgramacao } from '@/types/culto';
import { useSessionRepertoire } from '@/features/repertorio/hooks';
import { NextActionEnhanced } from '@/components/repertorio/NextActionEnhanced';
import { sortMomentSongs, type MomentSong } from '@/features/repertorio/model';

const SonoplastiaHeaderClock = memo(function SonoplastiaHeaderClock() {
  const { currentTime, formatTime } = useClock();
  return <span className="font-mono text-xl font-bold text-primary sm:text-2xl">{formatTime(currentTime)}</span>;
});

type SonoplastiaAlert = {
  id: string;
  message: string;
  time: Date;
};

const getMediaIcon = (tipo: string): ReactNode => {
  switch (tipo) {
    case 'audio':
      return <Mic className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    default:
      return <Volume2 className="w-4 h-4" />;
  }
};

const SonoplastiaAlertWatcher = memo(function SonoplastiaAlertWatcher({
  currentMoment,
  nextSoundAction,
  momentos,
  currentIndex,
  onAlert,
}: {
  currentMoment: MomentoProgramacao | null;
  nextSoundAction: MomentoProgramacao | null;
  momentos: MomentoProgramacao[];
  currentIndex: number;
  onAlert: (message: string) => void;
}) {
  const { momentElapsedMs } = useCultoTimer();
  const alertedRef = useRef<Set<string>>(new Set());
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;

  const remainingMsUntilNext = useMemo(() => {
    if (!currentMoment || !nextSoundAction) return Infinity;

    const nextIdx = momentos.findIndex((item) => item.id === nextSoundAction.id);
    if (nextIdx <= currentIndex) return Infinity;

    const currentRemaining = Math.max(0, currentMoment.duracao * 60 * 1000 - safeMomentElapsedMs);
    const betweenMs = momentos
      .slice(currentIndex + 1, nextIdx)
      .reduce((sum, momento) => sum + momento.duracao * 60 * 1000, 0);

    return currentRemaining + betweenMs;
  }, [currentIndex, currentMoment, momentos, nextSoundAction, safeMomentElapsedMs]);

  useEffect(() => {
    if (!nextSoundAction) return;

    const alertKey = `alert-10s-${nextSoundAction.id}`;
    if (remainingMsUntilNext <= 10000 && remainingMsUntilNext > 8000 && !alertedRef.current.has(alertKey)) {
      alertedRef.current.add(alertKey);
      onAlert(`10 segundos para: ${nextSoundAction.atividade} - ${nextSoundAction.acaoSonoplastia || 'Preparar'}`);
      toast({
        title: 'Atencao Sonoplastia',
        description: `10 segundos para: ${nextSoundAction.atividade}`,
        variant: 'destructive',
      });
    }
  }, [nextSoundAction, onAlert, remainingMsUntilNext]);

  useEffect(() => {
    alertedRef.current.clear();
  }, [currentIndex]);

  return null;
});

const PainelSonoplastia = memo(function PainelSonoplastia() {
  const { culto, momentos, currentIndex, currentMoment } = useLiveCultoView();
  const { momentElapsedMs } = useCultoTimer();
  const { songsByMomentId } = useSessionRepertoire();
  const isMobile = useIsMobile();
  const [alerts, setAlerts] = useState<SonoplastiaAlert[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;

  const soundMoments = useMemo(
    () => momentos.filter((momento) => momento.tipoMidia !== 'nenhum' || momento.acaoSonoplastia),
    [momentos],
  );

  const nextSoundAction = useMemo(
    () => soundMoments.find((momento) => momentos.findIndex((item) => item.id === momento.id) > currentIndex) ?? null,
    [currentIndex, momentos, soundMoments],
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === pageRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const pushAlert = useCallback((message: string) => {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextAlert: SonoplastiaAlert = {
      id: alertId,
      message,
      time: new Date(),
    };

    setAlerts((current) => [nextAlert, ...current].slice(0, 15));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!pageRef.current) return;

    if (document.fullscreenElement === pageRef.current) {
      await document.exitFullscreen();
      return;
    }

    await pageRef.current.requestFullscreen();
  }, []);

  return (
    <div ref={pageRef} className={`flex flex-col h-screen ${isFullscreen ? 'bg-background' : ''}`}>
      <SonoplastiaAlertWatcher
        currentMoment={currentMoment}
        nextSoundAction={nextSoundAction}
        momentos={momentos}
        currentIndex={currentIndex}
        onAlert={pushAlert}
      />

      {/* HEADER COMPACTO */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-card/50 backdrop-blur-sm px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(30_90%_50%/0.2)] shrink-0">
            <Volume2 className="h-4 w-4 text-[hsl(30_90%_50%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold font-display truncate">Sonoplastia</h1>
            <p className="text-xs text-muted-foreground truncate">{culto.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isMobile && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card/60 transition-colors hover:bg-muted/60"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          )}
          <div className="font-mono text-lg font-bold text-primary">
            <SonoplastiaHeaderClock />
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL - GRID 4 COLUNAS */}
      <div className="flex-1 overflow-hidden p-3">
        <div className="grid gap-3 h-full auto-rows-max" style={{ gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(280px, 0.9fr) minmax(280px, 1fr) minmax(240px, 0.8fr)' }}>
          
          {/* COLUNA 1: PRÓXIMA AÇÃO */}
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden flex flex-col">
            <NextActionEnhanced
              currentMoment={currentMoment}
              nextSoundAction={nextSoundAction}
              momentos={momentos}
              currentIndex={currentIndex}
              songsByMomentId={songsByMomentId}
            />
          </div>

          {/* COLUNA 2: AÇÃO ATUAL COMPACTA */}
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            {!currentMoment ? (
              <div className="flex flex-col items-center justify-center p-3 h-full text-center">
                <Volume2 className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-2 w-2 rounded-full bg-status-executing animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-status-executing">Executando</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm">
                    {getMediaIcon(currentMoment.tipoMidia)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{currentMoment.atividade}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{currentMoment.responsavel}</p>
                  </div>
                </div>

                {currentMoment.acaoSonoplastia && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
                    <p className="text-[9px] font-bold text-primary uppercase mb-0.5">Ação</p>
                    <p className="text-xs font-semibold line-clamp-2">{currentMoment.acaoSonoplastia}</p>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-2">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="font-mono">{currentMoment.horarioInicio}</span>
                    <span className="font-bold">{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</span>
                  </div>
                  <div className="progress-bar h-1.5 rounded-full mb-1">
                    <div
                      className="progress-bar-fill rounded-full"
                      style={{
                        transform: `scaleX(${useMomentProgress(currentMoment, Number.isFinite(safeMomentElapsedMs) ? safeMomentElapsedMs : 0).percent / 100})`,
                        transformOrigin: 'left',
                        width: '100%',
                      }}
                    />
                  </div>
                </div>

                {/* Músicas compactas */}
                {useMemo(() => currentMoment ? sortMomentSongs(songsByMomentId[currentMoment.id] ?? []) : [], [currentMoment, songsByMomentId]).length > 0 && (
                  <div className="border-t border-border/30 pt-2 mt-2">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Músicas</p>
                    <div className="space-y-0.5 max-h-20 overflow-y-auto">
                      {useMemo(() => currentMoment ? sortMomentSongs(songsByMomentId[currentMoment.id] ?? []) : [], [currentMoment, songsByMomentId]).map((song, idx) => (
                        <div key={song.id} className="text-[9px] flex gap-1 items-center">
                          <span className="font-bold text-muted-foreground min-w-4">{idx + 1}.</span>
                          <span className="truncate flex-1">{song.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COLUNA 3: LISTA DE TAREFAS */}
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            <div className="p-3 h-full flex flex-col">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 shrink-0">Próximos Momentos</p>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-2 [scrollbar-width:thin]">
                {momentos.slice(currentIndex + 1, currentIndex + 6).map((momento, idx) => (
                  <div key={momento.id} className="bg-muted/30 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-[10px] font-bold bg-primary/20 text-primary rounded px-1.5 min-w-fit shrink-0">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{momento.atividade}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{momento.responsavel}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 text-[9px] text-muted-foreground flex-wrap">
                      <span className="bg-black/20 px-1.5 py-0.5 rounded">{momento.horarioInicio}</span>
                      {momento.tipoMidia !== 'nenhum' && (
                        <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">{getMediaIcon(momento.tipoMidia)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA 4: ALERTAS */}
          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            <div className="p-3 h-full flex flex-col">
              <div className="flex items-center gap-1.5 mb-2 shrink-0">
                <Bell className="h-3.5 w-3.5 text-status-alert" />
                <p className="text-[10px] font-bold uppercase text-status-alert">Alertas</p>
              </div>
              <div className="space-y-1 overflow-y-auto flex-1 pr-2 [scrollbar-width:thin]">
                {alerts.length === 0 ? (
                  <p className="text-[9px] text-muted-foreground text-center py-3">Sem alertas</p>
                ) : (
                  <AnimatePresence>
                    {alerts.slice(0, 8).map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-lg border border-status-alert/30 bg-status-alert/15 p-1.5 text-[9px]"
                      >
                        <p className="font-semibold line-clamp-2">{alert.message}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">{alert.time.toLocaleTimeString('pt-BR')}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default PainelSonoplastia;
