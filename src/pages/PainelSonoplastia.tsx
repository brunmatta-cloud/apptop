import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Maximize, Mic, Minimize, PlayCircle, Video, Volume2 } from 'lucide-react';
import { useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { useClock } from '@/hooks/useClock';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMomentProgress } from '@/hooks/useMomentProgress';
import { toast } from '@/hooks/use-toast';
import { formatTimerMs } from '@/utils/time';
import { calcularHorarioTermino, tipoMomentoLabel, type MomentoProgramacao } from '@/types/culto';
import { useSessionRepertoire } from '@/features/repertorio/hooks';
import { NextActionEnhanced } from '@/components/repertorio/NextActionEnhanced';
import { SonoplastiaTaskList } from '@/components/repertorio/SonoplastiaTaskList';
import { SonoplastiaMusicCompact } from '@/components/repertorio/SonoplastiaMusicCompact';
import { UpcomingMomentsPreview } from '@/components/repertorio/UpcomingMomentsPreview';
import { getSongMediaLabel, getSongPlaybackLabel, sortMomentSongs, type MomentSong } from '@/features/repertorio/model';

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
      return <Mic className="w-5 h-5" />;
    case 'video':
      return <Video className="w-5 h-5" />;
    default:
      return <Volume2 className="w-5 h-5" />;
  }
};

const CurrentSoundMomentCard = memo(function CurrentSoundMomentCard({
  currentMoment,
  songsByMomentId,
}: {
  currentMoment: MomentoProgramacao | null;
  songsByMomentId: Record<string, MomentSong[]>;
}) {
  const { momentElapsedMs } = useCultoTimer();
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const { percent: currentProgress, formattedRemaining } = useMomentProgress(currentMoment, safeMomentElapsedMs);
  const songs = useMemo(
    () => currentMoment ? sortMomentSongs(songsByMomentId[currentMoment.id] ?? []) : [],
    [currentMoment, songsByMomentId],
  );

  if (!currentMoment) {
    return (
      <div className="glass-card p-2 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
        <Volume2 className="h-6 w-6 opacity-30 mb-1" />
        <p className="text-xs">Aguardando</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-muted-foreground/10 bg-muted/40 p-2 h-full flex flex-col">
      <div className="flex items-center gap-1 mb-1">
        <span className="h-2 w-2 rounded-full bg-status-executing animate-pulse" />
        <span className="text-[9px] font-bold uppercase text-status-executing">Executando</span>
      </div>

      <div className="flex items-start gap-1.5 mb-1">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs">
          {getMediaIcon(currentMoment.tipoMidia)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xs font-bold leading-tight">{currentMoment.atividade}</h2>
          <p className="truncate text-[9px] text-muted-foreground">{currentMoment.responsavel}</p>
        </div>
      </div>

      {currentMoment.acaoSonoplastia && (
        <div className="mb-1 rounded-md border border-primary/20 bg-primary/10 p-1">
          <p className="text-[8px] font-bold uppercase text-primary mb-0.5 leading-tight">Ação</p>
          <p className="text-[9px] font-medium line-clamp-1">{currentMoment.acaoSonoplastia}</p>
        </div>
      )}

      {/* Músicas do momento */}
      {songs.length > 0 && (
        <div className="mb-1 space-y-0.5 px-1.5 py-1 rounded-md border border-border/50 bg-background/50">
          <p className="text-[8px] font-bold uppercase text-muted-foreground leading-tight">Músicas</p>
          <div className="space-y-0">
            {songs.slice(0, 3).map((song, idx) => (
              <div key={song.id} className="flex items-center gap-1 text-[8px]">
                <span className="font-bold text-muted-foreground min-w-3">{idx + 1}</span>
                <span className="truncate flex-1">{song.title || 'Sem título'}</span>
                {song.has_media && <span className="px-0.5 rounded text-[7px] bg-primary/20 text-primary shrink-0 whitespace-nowrap">M</span>}
                {song.has_playback && <span className="px-0.5 rounded text-[7px] bg-emerald-500/20 text-emerald-400 shrink-0 whitespace-nowrap">P</span>}
              </div>
            ))}
            {songs.length > 3 && <p className="text-[7px] text-muted-foreground">+{songs.length - 3}</p>}
          </div>
        </div>
      )}

      <div className="mt-auto pt-1">
        <div className="mb-0.5 flex items-center justify-between text-[8px] text-muted-foreground gap-1">
          <span className="truncate">{tipoMomentoLabel(currentMoment.tipoMomento)}</span>
          <span className="truncate">{currentMoment.tipoMidia === 'nenhum' ? 'Nenhuma' : currentMoment.tipoMidia === 'audio' ? 'Música' : 'Vídeo'}</span>
        </div>
        <div className="progress-bar h-1 rounded-full mb-0.5">
          <div
            className="progress-bar-fill rounded-full"
            style={{
              transform: `scaleX(${currentProgress / 100})`,
              transformOrigin: 'left',
              width: '100%',
            }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground">
          <span>{currentMoment.horarioInicio}</span>
          <span className="font-mono font-bold text-foreground">
            {formattedRemaining}
          </span>
          <span>{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</span>
        </div>
      </div>
    </div>
  );
});

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

      {/* HEADER SUPER COMPACTO */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-card/50 backdrop-blur-sm px-2 py-1.5 shrink-0 rounded-b-lg">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(30_90%_50%/0.2)] shrink-0">
            <Volume2 className="h-3.5 w-3.5 text-[hsl(30_90%_50%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold font-display truncate leading-tight">Sonoplastia</h1>
            <p className="text-[10px] text-muted-foreground truncate">{culto.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isMobile && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-card/60 transition-colors hover:bg-muted/60"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            </button>
          )}
          <div className="font-mono text-base font-bold text-primary tabular-nums">
            <SonoplastiaHeaderClock />
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL - LAYOUT OTIMIZADO */}
      <div className="flex-1 overflow-hidden flex gap-1 p-1.5">
        {/* COLUNA ESQUERDA - Próxima Ação e Ação Atual */}
        <div className="flex flex-col gap-1.5 overflow-hidden" style={{ width: '35%' }}>
          {/* Próxima Ação */}
          <div className="overflow-hidden flex-1 rounded-lg">
            <NextActionEnhanced
              currentMoment={currentMoment}
              nextSoundAction={nextSoundAction}
              momentos={momentos}
              currentIndex={currentIndex}
              songsByMomentId={songsByMomentId}
            />
          </div>

          {/* Ação Atual */}
          <div className="overflow-hidden flex-1 rounded-lg">
            <CurrentSoundMomentCard currentMoment={currentMoment} songsByMomentId={songsByMomentId} />
          </div>
        </div>

        {/* COLUNA DIREITA - Tarefas e Alertas */}
        <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
          {/* Tarefas */}
          <div className="overflow-hidden flex-1 rounded-lg">
            <SonoplastiaTaskList
              momentos={momentos}
              currentIndex={currentIndex}
              songsByMomentId={songsByMomentId}
            />
          </div>

          {/* Músicas Compactas + Preview */}
          <div className="flex gap-1.5 overflow-hidden flex-1">
            <div className="overflow-hidden flex-1 rounded-lg">
              <SonoplastiaMusicCompact
                momentos={momentos}
                currentIndex={currentIndex}
                songsByMomentId={songsByMomentId}
              />
            </div>
            <div className="overflow-hidden flex-1 rounded-lg">
              <UpcomingMomentsPreview
                momentos={momentos}
                currentIndex={currentIndex}
                completedMoments={new Set()}
                songsByMomentId={songsByMomentId}
              />
            </div>
          </div>

          {/* Alertas */}
          <div className="overflow-hidden flex-1 rounded-lg">
            <div className="glass-card p-1.5 h-full flex flex-col">
              <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1 shrink-0">
                <Bell className="h-3 w-3 text-status-alert" />
                <span className="text-status-alert">Alertas</span>
              </h3>

              {alerts.length === 0 ? (
                <p className="py-1 text-center text-[10px] text-muted-foreground">Nenhum alerta</p>
              ) : (
                <div className="space-y-0.5 overflow-y-auto flex-1 pr-1 [scrollbar-width:thin]">
                  <AnimatePresence>
                    {alerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-md border border-status-alert/20 bg-status-alert/10 p-1 text-[9px]"
                      >
                        <p>{alert.message}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5">{alert.time.toLocaleTimeString('pt-BR')}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PainelSonoplastia;
