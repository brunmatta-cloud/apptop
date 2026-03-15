import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Maximize, Mic, Minimize, Pause, Play, PlayCircle, SkipForward, Square, Video, Volume2 } from 'lucide-react';
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
import { usePlayerStates } from '@/domains/platform/hooks';
import { AudioCommands } from '@/domains/platform/command-service';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import type { PlayerState } from '@/domains/platform/types';

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
    <div className="glass-card border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-900/30 via-blue-900/25 to-slate-900/20 p-4 h-full flex flex-col shadow-2xl shadow-cyan-600/20 rounded-2xl backdrop-blur-sm">
      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b-2 border-cyan-400/30">
        <span className="h-4 w-4 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/60" />
        <span className="text-sm font-black uppercase text-cyan-300 tracking-wider drop-shadow-lg">▶ Executando Agora</span>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/40 to-blue-500/40 text-lg font-bold border border-cyan-400/50 shadow-lg">
          {getMediaIcon(currentMoment.tipoMidia)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-black leading-tight text-white drop-shadow-lg">{currentMoment.atividade}</h2>
          <p className="truncate text-xs text-cyan-300/80 font-bold mt-1">{currentMoment.responsavel}</p>
        </div>
      </div>

      {currentMoment.acaoSonoplastia && (
        <div className="mb-3 rounded-xl border-2 border-cyan-400/40 bg-cyan-500/20 backdrop-blur-sm p-2.5 shadow-lg">
          <p className="text-[10px] font-black uppercase text-cyan-200 mb-1 tracking-wide drop-shadow">Ação</p>
          <p className="text-sm font-bold text-white line-clamp-2">{currentMoment.acaoSonoplastia}</p>
        </div>
      )}

      {/* Músicas do momento */}
      {songs.length > 0 && (
        <div className="mb-3 space-y-1.5 px-3 py-2.5 rounded-xl border-2 border-blue-400/30 bg-blue-500/15 backdrop-blur-sm">
          <p className="text-xs font-black uppercase text-blue-200 tracking-wider mb-2 drop-shadow">♪ Músicas ({songs.length})</p>
          <div className="space-y-1.5">
            {songs.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-2 text-xs group">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-bold text-white shadow-md transition-all ${
                  playedSongIndices.has(idx)
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-green-600/40'
                    : 'bg-gradient-to-br from-blue-500 to-blue-600 group-hover:shadow-lg shadow-blue-600/40'
                }`}>
                  {playedSongIndices.has(idx) ? '✓' : idx + 1}
                </div>
                <span className={`truncate flex-1 font-semibold transition-all ${
                  playedSongIndices.has(idx)
                    ? 'text-slate-400 line-through opacity-60'
                    : 'text-white'
                }`}>
                  {song.title || 'Sem título'}
                </span>
                {song.has_media && <span className="px-2 py-1 rounded-lg text-[8px] bg-purple-500/40 text-purple-200 shrink-0 font-bold border border-purple-400/50">🎨</span>}
                {song.has_playback && <span className="px-2 py-1 rounded-lg text-[8px] bg-emerald-500/40 text-emerald-200 shrink-0 font-bold border border-emerald-400/50">▶</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-3 border-t-2 border-cyan-400/30">
        <div className="mb-2 flex items-center justify-between text-xs text-white/80 gap-1 font-bold">
          <span>{tipoMomentoLabel(currentMoment.tipoMomento)}</span>
          <span>{currentMoment.tipoMidia === 'nenhum' ? 'Nenhuma' : currentMoment.tipoMidia === 'audio' ? 'Música' : 'Vídeo'}</span>
        </div>
        <div className="progress-bar h-2.5 rounded-full mb-2 bg-slate-700/60 border border-cyan-400/30 overflow-hidden shadow-inner">
          <div
            className="progress-bar-fill h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50"
            style={{
              transform: `scaleX(${currentProgress / 100})`,
              transformOrigin: 'left',
              width: '100%',
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-white/80 font-bold">
          <span>{currentMoment.horarioInicio}</span>
          <span className="font-mono text-base font-black text-cyan-300 drop-shadow-lg">
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

// Mini audio player strip showing current playback from Platform
const AudioPlaybackStrip = memo(function AudioPlaybackStrip({ sessionId }: { sessionId: string }) {
  const { data: playerStates } = usePlayerStates(sessionId);
  const audioState = useMemo(() => playerStates?.find((p: PlayerState) => p.player_type === 'audio') ?? null, [playerStates]);

  if (!audioState || audioState.status === 'idle' || audioState.status === 'stopped') return null;

  const currentSong = audioState.queue_json?.[0];
  const progressPercent = audioState.duration_seconds > 0
    ? Math.min(100, (audioState.current_time_seconds / audioState.duration_seconds) * 100)
    : 0;

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 border-t border-green-400/30 bg-gradient-to-r from-green-900/30 to-emerald-900/20 px-3 py-1.5 shrink-0">
      <div className={`h-2 w-2 rounded-full shrink-0 ${audioState.status === 'playing' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
      <span className="text-xs font-bold text-green-200 truncate flex-1">
        {currentSong?.title ?? 'Reproduzindo...'}
      </span>
      <span className="text-[10px] font-mono text-green-300/80 shrink-0">
        {formatTime(audioState.current_time_seconds)} / {formatTime(audioState.duration_seconds)}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {audioState.status === 'playing' ? (
          <button
            type="button"
            onClick={() => AudioCommands.pause(sessionId)}
            className="h-6 w-6 flex items-center justify-center rounded bg-green-500/30 hover:bg-green-500/50 transition-colors"
            title="Pausar"
          >
            <Pause className="h-3 w-3 text-green-200" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => AudioCommands.pause(sessionId)}
            className="h-6 w-6 flex items-center justify-center rounded bg-green-500/30 hover:bg-green-500/50 transition-colors"
            title="Continuar"
          >
            <Play className="h-3 w-3 text-green-200" />
          </button>
        )}
        <button
          type="button"
          onClick={() => AudioCommands.next(sessionId)}
          className="h-6 w-6 flex items-center justify-center rounded bg-blue-500/30 hover:bg-blue-500/50 transition-colors"
          title="Próxima"
        >
          <SkipForward className="h-3 w-3 text-blue-200" />
        </button>
        <button
          type="button"
          onClick={() => AudioCommands.stop(sessionId)}
          className="h-6 w-6 flex items-center justify-center rounded bg-red-500/30 hover:bg-red-500/50 transition-colors"
          title="Parar"
        >
          <Square className="h-3 w-3 text-red-200" />
        </button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-900/50">
        <div className="h-full bg-green-400 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
});

const PainelSonoplastia = memo(function PainelSonoplastia() {
  const { culto, momentos, currentIndex, currentMoment } = useLiveCultoView();
  const { momentElapsedMs } = useCultoTimer();
  const { songsByMomentId } = useSessionRepertoire();
  const { remoteState } = useSyncStore();
  const sessionId = remoteState.sessionId;
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

        {/* COLUNA DIREITA - Músicas e Próximos Momentos em Modo Vertical */}
        <div className="flex flex-col gap-1.5 overflow-hidden flex-1">
          {/* Músicas da Programação (55%) */}
          <div className="overflow-hidden rounded-lg" style={{ flex: '1.1' }}>
            <SonoplastiaMusicCompact
              momentos={momentos}
              songsByMomentId={songsByMomentId}
            />
          </div>
          
          {/* Próximos Momentos (45%) */}
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

      {/* AUDIO PLAYER STRIP */}
      <AudioPlaybackStrip sessionId={sessionId} />
    </div>
  );
});

export default PainelSonoplastia;
