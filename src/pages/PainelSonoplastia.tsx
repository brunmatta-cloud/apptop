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
  const [playedSongIndices, setPlayedSongIndices] = useState<Set<number>>(new Set());

  // Atualizar índices tocados baseado no progresso
  useEffect(() => {
    if (!currentMoment) return;
    const progressPercent = currentProgress;
    // Marcar músicas tocadas com base no tempo decorrido
    const numSongsPlayed = Math.floor((progressPercent / 100) * songs.length);
    setPlayedSongIndices(new Set(Array.from({ length: numSongsPlayed }, (_, i) => i)));
  }, [currentProgress, songs.length, currentMoment]);

  if (!currentMoment) {
    return (
      <div className="glass-card p-3 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
        <Volume2 className="h-8 w-8 opacity-30 mb-2" />
        <p className="text-sm">Aguardando</p>
      </div>
    );
  }

  return (
    <div className="glass-card border border-status-executing/40 bg-status-executing/15 p-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-status-executing/30">
        <span className="h-3 w-3 rounded-full bg-status-executing animate-pulse" />
        <span className="text-xs font-black uppercase text-status-executing tracking-wide">Executando Agora</span>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-status-executing/20 text-sm font-bold">
          {getMediaIcon(currentMoment.tipoMidia)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-black leading-tight text-white">{currentMoment.atividade}</h2>
          <p className="truncate text-xs text-status-executing/80 font-semibold">{currentMoment.responsavel}</p>
        </div>
      </div>

      {currentMoment.acaoSonoplastia && (
        <div className="mb-2 rounded-lg border border-primary/30 bg-primary/15 p-2">
          <p className="text-[10px] font-bold uppercase text-primary mb-0.5 tracking-wide">Ação</p>
          <p className="text-sm font-semibold text-white line-clamp-2">{currentMoment.acaoSonoplastia}</p>
        </div>
      )}

      {/* Músicas do momento */}
      {songs.length > 0 && (
        <div className="mb-2 space-y-1 px-2 py-2 rounded-lg border border-border/50 bg-background/50">
          <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide mb-1">Músicas ({songs.length})</p>
          <div className="space-y-1">
            {songs.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-1.5 text-xs group">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold text-white transition-all ${
                  playedSongIndices.has(idx)
                    ? 'bg-green-500/70 text-white'
                    : 'bg-primary/60 group-hover:bg-primary/80'
                }`}>
                  {playedSongIndices.has(idx) ? '✓' : idx + 1}
                </div>
                <span className={`truncate flex-1 font-semibold transition-all ${
                  playedSongIndices.has(idx)
                    ? 'text-muted-foreground line-through opacity-60'
                    : 'text-foreground'
                }`}>
                  {song.title || 'Sem título'}
                </span>
                {song.has_media && <span className="px-1.5 py-0.5 rounded text-[9px] bg-primary/30 text-primary shrink-0 font-bold">M</span>}
                {song.has_playback && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/30 text-emerald-300 shrink-0 font-bold">P</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-2 border-t border-status-executing/30">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground gap-1 font-semibold">
          <span>{tipoMomentoLabel(currentMoment.tipoMomento)}</span>
          <span>{currentMoment.tipoMidia === 'nenhum' ? 'Nenhuma' : currentMoment.tipoMidia === 'audio' ? 'Música' : 'Vídeo'}</span>
        </div>
        <div className="progress-bar h-2 rounded-full mb-1.5 bg-muted/30">
          <div
            className="progress-bar-fill rounded-full bg-status-executing"
            style={{
              transform: `scaleX(${currentProgress / 100})`,
              transformOrigin: 'left',
              width: '100%',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground font-bold">
          <span>{currentMoment.horarioInicio}</span>
          <span className="font-mono text-status-executing text-sm">
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
    // Alertas removidos - apenas mantém o hook para compatibilidade
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
      <div className="flex-1 overflow-hidden flex gap-1.5 p-2">
        {/* COLUNA ESQUERDA - Próxima Ação e Ação Atual */}
        <div className="flex flex-col gap-1.5 overflow-hidden" style={{ width: '32%' }}>
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

        {/* COLUNA DIREITA - Músicas com Destaque + Próximos Momentos */}
        <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
          {/* Músicas com Destaque (70%) */}
          <div className="overflow-hidden rounded-lg" style={{ flex: '1.2' }}>
            <SonoplastiaMusicCompact
              momentos={momentos}
              songsByMomentId={songsByMomentId}
            />
          </div>
          
          {/* Próximos Momentos (30%) */}
          <div className="overflow-hidden rounded-lg flex-1">
            <UpcomingMomentsPreview
              momentos={momentos}
              currentIndex={currentIndex}
              completedMoments={new Set()}
              songsByMomentId={songsByMomentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PainelSonoplastia;
