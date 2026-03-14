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
      <div className="glass-card p-4 text-center text-muted-foreground">
        <Volume2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">Aguardando inicio do culto</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-muted-foreground/10 bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-status-executing animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-status-executing">Executando agora</span>
      </div>

      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {getMediaIcon(currentMoment.tipoMidia)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-display font-bold">{currentMoment.atividade}</h2>
          <p className="truncate text-xs text-muted-foreground">{currentMoment.responsavel}</p>
        </div>
      </div>

      {currentMoment.acaoSonoplastia && (
        <div className="mt-2 rounded-lg border border-primary/20 bg-primary/10 p-2">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Acao</p>
          <p className="text-xs font-medium">{currentMoment.acaoSonoplastia}</p>
        </div>
      )}

      {/* Músicas do momento */}
      {songs.length > 0 && (
        <div className="mt-2 space-y-1 px-2 py-2 rounded-lg border border-border/50 bg-background/50">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Músicas</p>
          <div className="space-y-0.5">
            {songs.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-1 text-[11px]">
                <span className="font-bold text-muted-foreground min-w-4">{idx + 1}</span>
                <span className="truncate flex-1">{song.title || 'Sem título'}</span>
                {song.has_media && <span className="px-1 py-0.5 rounded text-[9px] bg-primary/20 text-primary shrink-0">MIDIA</span>}
                {song.has_playback && <span className="px-1 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 shrink-0">PLAY</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Tipo: {tipoMomentoLabel(currentMoment.tipoMomento)}</span>
          <span>
            Midia:{' '}
            {currentMoment.tipoMidia === 'nenhum'
              ? 'Nenhuma'
              : currentMoment.tipoMidia === 'audio'
                ? 'Musica'
                : 'Video'}
          </span>
        </div>
        <div className="progress-bar h-2 rounded-full">
          <div
            className="progress-bar-fill rounded-full"
            style={{
              transform: `scaleX(${currentProgress / 100})`,
              transformOrigin: 'left',
              width: '100%',
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{currentMoment.horarioInicio}</span>
          <span className="font-mono font-semibold text-foreground">
            {formattedRemaining} restantes
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

      {/* HEADER COMPACTO */}
      <div className="flex flex-col justify-between gap-2 border-b border-border/40 bg-card/50 backdrop-blur-sm px-3 py-2 shrink-0 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(30_90%_50%/0.2)] shrink-0">
            <Volume2 className="h-4 w-4 text-[hsl(30_90%_50%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold font-display truncate">Painel da Sonoplastia</h1>
            <p className="text-xs text-muted-foreground truncate">{culto.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
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

      {/* CONTEÚDO PRINCIPAL COMPACTO */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {/* Próxima Ação */}
        <NextActionEnhanced
          currentMoment={currentMoment}
          nextSoundAction={nextSoundAction}
          momentos={momentos}
          currentIndex={currentIndex}
          songsByMomentId={songsByMomentId}
        />

        {/* Ação Atual */}
        <CurrentSoundMomentCard currentMoment={currentMoment} songsByMomentId={songsByMomentId} />

        {/* Grid com 3 colunas */}
        <div className="grid gap-2 lg:grid-cols-3">
          {/* Tarefas - 2 colunas */}
          <div className="lg:col-span-2">
            <SonoplastiaTaskList
              momentos={momentos}
              currentIndex={currentIndex}
              songsByMomentId={songsByMomentId}
            />
          </div>

          {/* Coluna lateral - 1 coluna */}
          <div className="space-y-2">
            <SonoplastiaMusicCompact
              momentos={momentos}
              currentIndex={currentIndex}
              songsByMomentId={songsByMomentId}
            />
            <UpcomingMomentsPreview
              momentos={momentos}
              currentIndex={currentIndex}
              completedMoments={new Set()}
              songsByMomentId={songsByMomentId}
            />
          </div>
        </div>

        {/* Alertas */}
        <div className="glass-card p-3">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <Bell className="h-4 w-4 text-status-alert" />
            <span className="text-status-alert">Alertas</span>
          </h3>

          {alerts.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">Nenhum alerta</p>
          ) : (
            <div className="max-h-32 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-lg border border-status-alert/20 bg-status-alert/10 p-2 text-sm"
                  >
                    <p className="text-sm">{alert.message}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{alert.time.toLocaleTimeString('pt-BR')}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default PainelSonoplastia;
