// =============================================================================
// MediaControl — Unified media control panel.
// Route: /media-control
// Connected to session runtime: current moment, repertoire, player state,
// display state, audio/video/slides controls, and base status.
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, Search, Plus, Headphones, Upload, Film,
  ListMusic, Loader2, Play, Pause, Square, SkipForward,
  SkipBack, Clapperboard, ChevronRight, ChevronLeft,
  Monitor, Radio, Wifi, WifiOff, Clock, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioPlayerEngine } from '@/components/media/AudioPlayerEngine';
import { useSongs, usePlayerStates, useDisplayOutputs, useActiveBase } from '@/domains/platform/hooks';
import { getSignedUrl } from '@/domains/platform/media-service';
import { VideoCommands, SlidesCommands, AudioCommands } from '@/domains/platform/command-service';
import { useLiveCultoView } from '@/contexts/CultoContext';
import { useSessionRepertoire } from '@/features/repertorio/hooks';
import type { Song, SongQueueItem, PlayerState } from '@/domains/platform/types';

function formatDuration(s: number | null): string {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function PlayerStateCard({ label, state, icon: Icon }: { label: string; state: PlayerState | null; icon: typeof Music }) {
  if (!state) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground capitalize">{state.status}</p>
      </div>
      {state.duration_seconds > 0 && (
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {formatDuration(state.current_time_seconds)} / {formatDuration(state.duration_seconds)}
        </span>
      )}
      <Badge variant={state.status === 'playing' ? 'default' : state.status === 'error' ? 'destructive' : 'outline'} className="text-xs">
        {state.status}
      </Badge>
    </div>
  );
}

export default function MediaControl() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [queue, setQueue] = useState<SongQueueItem[]>([]);

  // Session runtime
  const cultoView = useLiveCultoView();
  const sessionId = cultoView?.culto?.id ?? null;
  const currentMoment = cultoView?.currentMoment ?? null;
  const nextMoment = cultoView?.nextMoment ?? null;
  const isLive = cultoView?.isLive ?? false;

  // Repertoire for current moment
  const repertoire = useSessionRepertoire();
  const currentMomentSongs = useMemo(
    () => (currentMoment ? repertoire.songsByMomentId[currentMoment.id] ?? [] : []),
    [currentMoment, repertoire.songsByMomentId],
  );
  const nextMomentSongs = useMemo(
    () => (nextMoment ? repertoire.songsByMomentId[nextMoment.id] ?? [] : []),
    [nextMoment, repertoire.songsByMomentId],
  );

  // Player states (realtime)
  const { data: playerStates } = usePlayerStates(sessionId);
  const audioState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'audio') ?? null,
    [playerStates],
  );
  const videoState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'video') ?? null,
    [playerStates],
  );
  const slidesState = useMemo(
    () => playerStates?.find((p) => p.player_type === 'slides') ?? null,
    [playerStates],
  );

  // Active base
  const { data: activeBase } = useActiveBase(sessionId);

  // Songs search
  const { data: result, isLoading } = useSongs({
    search: searchTerm || undefined,
    orderBy: 'usage_count',
    limit: 50,
  });
  const songs = result?.data ?? [];

  const getAudioUrl = useCallback(async (songId: string) => {
    return getSignedUrl('media-audio', songId);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    const item: SongQueueItem = {
      song_id: song.id,
      title: song.title,
      artist: song.artist ?? undefined,
      duration_seconds: song.duration_seconds ?? undefined,
      source: 'library',
    };
    setQueue((q) => [...q, item]);
  }, []);

  const playNow = useCallback((song: Song) => {
    const item: SongQueueItem = {
      song_id: song.id,
      title: song.title,
      artist: song.artist ?? undefined,
      duration_seconds: song.duration_seconds ?? undefined,
      source: 'library',
    };
    setQueue([item]);
    // Also send command if session active
    if (sessionId) {
      AudioCommands.play(sessionId, song.id);
    }
  }, [sessionId]);

  // Video controls
  const onVideoPlay = useCallback(() => { if (sessionId) VideoCommands.play(sessionId); }, [sessionId]);
  const onVideoPause = useCallback(() => { if (sessionId) VideoCommands.pause(sessionId); }, [sessionId]);
  const onVideoStop = useCallback(() => { if (sessionId) VideoCommands.stop(sessionId); }, [sessionId]);
  const onVideoRestart = useCallback(() => { if (sessionId) VideoCommands.restart(sessionId); }, [sessionId]);

  // Slides controls
  const onSlidesNext = useCallback(() => { if (sessionId) SlidesCommands.next(sessionId); }, [sessionId]);
  const onSlidesPrev = useCallback(() => { if (sessionId) SlidesCommands.prev(sessionId); }, [sessionId]);
  const onSlidesFirst = useCallback(() => { if (sessionId) SlidesCommands.first(sessionId); }, [sessionId]);
  const onSlidesLast = useCallback(() => { if (sessionId) SlidesCommands.last(sessionId); }, [sessionId]);

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6" /> Controle de Mídia
          </h1>
          <p className="text-sm text-muted-foreground">
            Player de áudio, vídeo, slides e integração ao vivo
            {isLive && <Badge variant="default" className="ml-2 text-xs">AO VIVO</Badge>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/media/audio')}>
            <ListMusic className="mr-2 h-4 w-4" /> Biblioteca
          </Button>
          <Button onClick={() => navigate('/media/upload')}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Runtime Status Bar */}
      {sessionId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Current Moment */}
          <Card className="border-primary/30">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Momento Atual</p>
              {currentMoment ? (
                <>
                  <p className="text-sm font-medium truncate">{currentMoment.atividade}</p>
                  <p className="text-xs text-muted-foreground">{currentMoment.responsavel}</p>
                  {currentMomentSongs.length > 0 && (
                    <p className="text-xs text-primary mt-1">{currentMomentSongs.length} música(s)</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* Next Moment */}
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Próximo</p>
              {nextMoment ? (
                <>
                  <p className="text-sm font-medium truncate">{nextMoment.atividade}</p>
                  <p className="text-xs text-muted-foreground">{nextMoment.responsavel}</p>
                  {nextMomentSongs.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{nextMomentSongs.length} música(s)</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* Base Status */}
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Base Ativa</p>
              {activeBase?.base ? (
                <div className="flex items-center gap-2">
                  {activeBase.executor?.is_online ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <p className="text-sm font-medium truncate">{activeBase.base.name}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma</p>
              )}
            </CardContent>
          </Card>

          {/* Session Status */}
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Sessão</p>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{isLive ? 'Ao Vivo' : 'Inativa'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player States (realtime) */}
      {sessionId && (audioState || videoState || slidesState) && (
        <div className="space-y-2">
          <PlayerStateCard label="Áudio" state={audioState} icon={Music} />
          <PlayerStateCard label="Vídeo" state={videoState} icon={Film} />
          <PlayerStateCard label="Slides" state={slidesState} icon={Clapperboard} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Audio Player */}
        <div className="lg:col-span-1 space-y-4">
          <AudioPlayerEngine
            initialQueue={queue}
            getAudioUrl={getAudioUrl}
          />

          {/* Video Controls */}
          {sessionId && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Film className="h-4 w-4" /> Controle de Vídeo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={onVideoPlay} className="gap-1">
                    <Play className="h-3 w-3" /> Play
                  </Button>
                  <Button size="sm" variant="outline" onClick={onVideoPause} className="gap-1">
                    <Pause className="h-3 w-3" /> Pause
                  </Button>
                  <Button size="sm" variant="outline" onClick={onVideoStop} className="gap-1">
                    <Square className="h-3 w-3" /> Stop
                  </Button>
                  <Button size="sm" variant="outline" onClick={onVideoRestart} className="gap-1">
                    <SkipBack className="h-3 w-3" /> Reiniciar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slides Controls */}
          {sessionId && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clapperboard className="h-4 w-4" /> Controle de Slides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={onSlidesFirst} className="gap-1">
                    Primeiro
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSlidesPrev} className="gap-1">
                    <ChevronLeft className="h-3 w-3" /> Anterior
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSlidesNext} className="gap-1">
                    Próximo <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={onSlidesLast} className="gap-1">
                    Último
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Search & Browse */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="search">
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1 gap-1.5">
                <Search className="h-4 w-4" /> Buscar
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex-1 gap-1.5">
                <Music className="h-4 w-4" /> Mais Usadas
              </TabsTrigger>
              {currentMomentSongs.length > 0 && (
                <TabsTrigger value="moment" className="flex-1 gap-1.5">
                  <Clock className="h-4 w-4" /> Momento
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="search" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar música por título ou artista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <SongList
                songs={songs}
                isLoading={isLoading}
                onPlayNow={playNow}
                onAddToQueue={addToQueue}
                emptyMessage={searchTerm ? 'Nenhuma música encontrada' : 'Digite para buscar'}
              />
            </TabsContent>

            <TabsContent value="recent" className="mt-4">
              <SongList
                songs={songs}
                isLoading={isLoading}
                onPlayNow={playNow}
                onAddToQueue={addToQueue}
                emptyMessage="Nenhuma música na biblioteca"
              />
            </TabsContent>

            {currentMomentSongs.length > 0 && (
              <TabsContent value="moment" className="mt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground mb-3">
                    Músicas do momento: <b>{currentMoment?.atividade}</b>
                  </p>
                  {currentMomentSongs.map((ms) => (
                    <div
                      key={ms.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                        <Music className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ms.title}</p>
                        {ms.notes && <p className="text-xs text-muted-foreground truncate">{ms.notes}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs">#{ms.position + 1}</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SongList({
  songs,
  isLoading,
  onPlayNow,
  onAddToQueue,
  emptyMessage,
}: {
  songs: Song[];
  isLoading: boolean;
  onPlayNow: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-1">
        {songs.map((song) => (
          <div
            key={song.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Music className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{song.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {song.artist && <span className="truncate">{song.artist}</span>}
                {song.duration_seconds && (
                  <span>{formatDuration(song.duration_seconds)}</span>
                )}
              </div>
            </div>
            {song.tags?.length > 0 && (
              <div className="hidden sm:flex gap-1">
                {song.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onPlayNow(song)}>
                Tocar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onAddToQueue(song)}>
                <Plus className="h-3 w-3 mr-1" /> Fila
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
