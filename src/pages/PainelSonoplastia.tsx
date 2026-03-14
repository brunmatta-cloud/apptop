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
import { SonoplastiaMusicQueue } from '@/components/repertorio/SonoplastiaMusicQueue';
import { SonoplastiaQueuePlaylist } from '@/components/repertorio/SonoplastiaQueuePlaylist';
import { SonoplastiaFullMusicList } from '@/components/repertorio/SonoplastiaFullMusicList';
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

const NextSoundActionCard = memo(function NextSoundActionCard({
  currentMoment,
  nextSoundAction,
  momentos,
  currentIndex,
  songsByMomentId,
}: {
  currentMoment: MomentoProgramacao | null;
  nextSoundAction: MomentoProgramacao | null;
  momentos: MomentoProgramacao[];
  currentIndex: number;
  songsByMomentId: Record<string, MomentSong[]>;
}) {
  const { momentElapsedMs } = useCultoTimer();
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;
  const nextActionSongs = useMemo(
    () => nextSoundAction ? sortMomentSongs(songsByMomentId[nextSoundAction.id] ?? []) : [],
    [nextSoundAction, songsByMomentId],
  );
  const featuredSong = nextActionSongs[0] ?? null;
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

  const isUrgent = remainingMsUntilNext <= 10000;

  return (
    <div className={`glass-card p-4 sm:p-5 transition-all ${isUrgent ? 'ring-2 ring-status-alert border-status-alert/50' : ''}`}>
      <div className="mb-4 flex items-center gap-2">
        <PlayCircle className={`w-4 h-4 ${isUrgent ? 'text-status-alert' : 'text-status-next'}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${isUrgent ? 'text-status-alert' : 'text-status-next'}`}>
          Proxima acao
        </span>
      </div>

      {nextSoundAction ? (
        <div className="grid gap-3 xl:grid-cols-[auto_minmax(0,1fr)_minmax(260px,0.85fr)] xl:items-center">
          <div className={`flex shrink-0 flex-col items-center justify-center rounded-[1.35rem] border border-border/50 bg-card/55 px-3 py-3 ${isUrgent ? 'animate-pulse' : ''}`}>
            <span className={`font-mono font-black leading-none ${isUrgent ? 'text-status-alert' : 'text-primary'} ${remainingMsUntilNext < 60000 ? 'text-5xl sm:text-7xl' : 'text-4xl sm:text-5xl'}`}>
              {Number.isFinite(remainingMsUntilNext) ? formatTimerMs(remainingMsUntilNext) : '--:--'}
            </span>
            <span className={`mt-1 text-xs ${isUrgent ? 'font-bold text-status-alert' : 'text-muted-foreground'}`}>
              {isUrgent ? 'ATENCAO!' : 'ate a proxima acao'}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${isUrgent ? 'bg-status-alert/20' : 'bg-muted'}`}>
                {getMediaIcon(nextSoundAction.tipoMidia)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-display font-bold sm:text-lg">{nextSoundAction.atividade}</p>
                <p className="truncate text-sm text-muted-foreground">{nextSoundAction.responsavel}</p>
              </div>
            </div>

            {nextSoundAction.acaoSonoplastia && (
              <div className={`mt-3 rounded-lg border p-3 ${isUrgent ? 'border-status-alert/30 bg-status-alert/10' : 'border-primary/20 bg-primary/10'}`}>
                <p className={`mb-0.5 text-[11px] font-semibold uppercase tracking-wider ${isUrgent ? 'text-status-alert' : 'text-primary'}`}>Acao</p>
                <p className="text-sm font-semibold">{nextSoundAction.acaoSonoplastia}</p>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{nextSoundAction.horarioInicio}</span>
              <span>-</span>
              <span>
                {nextSoundAction.tipoMidia === 'nenhum'
                  ? 'Sem midia'
                  : nextSoundAction.tipoMidia === 'audio'
                    ? 'Musica'
                    : 'Video'}
              </span>
            </div>
          </div>

          {featuredSong ? (
            <div className="rounded-[1.35rem] border border-border/60 bg-card/75 p-3 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Musica ligada a esta acao</p>
              <div className="mt-2 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="font-mono text-xs font-black">#{featuredSong.position + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{featuredSong.title || 'Musica sem titulo'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted/50 px-2 py-1">{getSongMediaLabel(featuredSong.has_media)}</span>
                    <span className="rounded-full bg-muted/50 px-2 py-1">{getSongPlaybackLabel(featuredSong.has_playback)}</span>
                  </div>
                  {featuredSong.youtube_url ? (
                    <a
                      href={featuredSong.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Abrir YouTube
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="py-2 text-center text-sm text-muted-foreground">Nenhuma proxima acao</p>
      )}
    </div>
  );
});

const CurrentSoundMomentCard = memo(function CurrentSoundMomentCard({
  currentMoment,
  isPaused,
  songsByMomentId,
}: {
  currentMoment: MomentoProgramacao | null;
  isPaused: boolean;
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
      <div className="glass-card p-8 text-center text-muted-foreground">
        <Volume2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>Aguardando inicio do culto</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-muted-foreground/10 bg-muted/40 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-status-executing animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-status-executing">Executando agora</span>
      </div>

      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted sm:h-12 sm:w-12">
          {getMediaIcon(currentMoment.tipoMidia)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-display font-bold sm:text-xl">{currentMoment.atividade}</h2>
          <p className="truncate text-sm text-muted-foreground">{currentMoment.responsavel}</p>
        </div>
      </div>

      {currentMoment.acaoSonoplastia && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">Acao</p>
          <p className="text-sm font-medium">{currentMoment.acaoSonoplastia}</p>
        </div>
      )}

      {/* Músicas do momento */}
      {songs.length > 0 && (
        <div className="mt-4 space-y-2 px-3 py-3 rounded-lg border border-border/50 bg-background/50">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Músicas deste momento</p>
          <div className="space-y-1.5">
            {songs.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-muted-foreground min-w-4">{idx + 1}</span>
                <span className="truncate flex-1">{song.title || 'Sem título'}</span>
                {song.has_media && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary shrink-0">MIDIA</span>}
                {song.has_playback && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 shrink-0">PLAY</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
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
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{currentMoment.horarioInicio}</span>
          <span className="font-mono font-semibold text-foreground">
            {isPaused ? `${formattedRemaining} pausado` : `${formattedRemaining} restantes`}
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
  const { culto, momentos, currentIndex, currentMoment, getMomentStatus, isPaused } = useLiveCultoView();
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
    <div ref={pageRef} className={`space-y-4 ${isFullscreen ? 'min-h-screen bg-background p-4 sm:p-5' : ''}`}>
      <SonoplastiaAlertWatcher
        currentMoment={currentMoment}
        nextSoundAction={nextSoundAction}
        momentos={momentos}
        currentIndex={currentIndex}
        onAlert={pushAlert}
      />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(30_90%_50%/0.2)]">
            <Volume2 className="h-5 w-5 text-[hsl(30_90%_50%)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display sm:text-2xl">Painel da Sonoplastia</h1>
            <p className="text-sm text-muted-foreground">{culto.nome}</p>
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
          <SonoplastiaHeaderClock />
        </div>
      </div>

      <NextActionEnhanced
        nextSoundAction={nextSoundAction}
        momentos={momentos}
        currentIndex={currentIndex}
        songsByMomentId={songsByMomentId}
      />

      <CurrentSoundMomentCard currentMoment={currentMoment} isPaused={isPaused} songsByMomentId={songsByMomentId} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Tarefas e lista de músicas */}
        <div className="lg:col-span-2 space-y-3">
          <SonoplastiaTaskList
            momentos={momentos}
            currentIndex={currentIndex}
            songsByMomentId={songsByMomentId}
          />
        </div>

        {/* Coluna lateral - tarefas compactas */}
        <div className="space-y-3">
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
      <div className="glass-card p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <Bell className="h-4 w-4 text-status-alert" />
          <span className="text-status-alert">Alertas</span>
        </h3>

        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhum alerta</p>
        ) : (
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-status-alert/20 bg-status-alert/10 p-3 text-sm"
                >
                  <p>{alert.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{alert.time.toLocaleTimeString('pt-BR')}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
});

export default PainelSonoplastia;
