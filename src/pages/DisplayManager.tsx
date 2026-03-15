// =============================================================================
// DisplayManager — Control panel for display outputs.
// Route: /displays
// Operators can control what's displayed on main, stage, audio, moderator screens.
// Connected to real display_state via Supabase + realtime hooks.
// =============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Monitor, MonitorPlay, Tv, Radio, Eye, EyeOff,
  Type, Image, Film, List, Clock, Loader2, Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useDisplayOutputs, useDisplayState } from '@/domains/platform/hooks';
import { setDisplayMode, ensureDefaultDisplays } from '@/domains/platform/display-service';
import type { DisplayType, DisplayMode, DisplayOutput } from '@/domains/platform/types';
import { useLiveCultoView } from '@/contexts/CultoContext';

const DISPLAY_TYPE_CONFIG: Record<DisplayType, { label: string; icon: typeof Monitor; desc: string }> = {
  main: { label: 'Principal', icon: MonitorPlay, desc: 'Projeção principal para a plateia' },
  stage: { label: 'Palco', icon: Tv, desc: 'Retorno visual para quem está no palco' },
  audio: { label: 'Sonoplastia', icon: Radio, desc: 'Monitor da equipe de som' },
  moderator: { label: 'Moderador', icon: Monitor, desc: 'Monitor do moderador/apresentador' },
  custom: { label: 'Personalizado', icon: Monitor, desc: 'Display customizado' },
};

const MODE_ACTIONS: { mode: DisplayMode; label: string; icon: typeof Monitor; color: string }[] = [
  { mode: 'logo', label: 'Logo', icon: Image, color: 'text-blue-500' },
  { mode: 'message', label: 'Mensagem', icon: Type, color: 'text-green-500' },
  { mode: 'timeline', label: 'Linha do Tempo', icon: List, color: 'text-purple-500' },
  { mode: 'countdown', label: 'Relógio', icon: Clock, color: 'text-amber-500' },
  { mode: 'video', label: 'Vídeo', icon: Film, color: 'text-cyan-500' },
  { mode: 'slides', label: 'Slides', icon: Clapperboard, color: 'text-teal-500' },
  { mode: 'blackout', label: 'Blackout', icon: EyeOff, color: 'text-red-500' },
];

// Individual display card with its own realtime state
function DisplayCard({
  output,
  onOpenMessage,
  onOpenDisplay,
}: {
  output: DisplayOutput;
  onOpenMessage: (output: DisplayOutput) => void;
  onOpenDisplay: (type: DisplayType) => void;
}) {
  const { data: displayState, isLoading } = useDisplayState(output.id);
  const [updating, setUpdating] = useState(false);

  const config = DISPLAY_TYPE_CONFIG[output.display_type] ?? DISPLAY_TYPE_CONFIG.custom;
  const Icon = config.icon;
  const currentMode: DisplayMode = displayState?.mode ?? 'idle';

  const handleSetMode = useCallback(async (mode: DisplayMode) => {
    setUpdating(true);
    await setDisplayMode(output.id, mode);
    setUpdating(false);
  }, [output.id]);

  return (
    <Card className={!output.is_active ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{output.name || config.label}</CardTitle>
              <CardDescription className="text-xs">{config.desc}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading || updating ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={currentMode === 'idle' ? 'outline' : currentMode === 'blackout' ? 'destructive' : 'default'}>
                {currentMode === 'idle' ? 'Inativo' : currentMode}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Preview area */}
        <div className="aspect-video rounded-lg bg-black/80 border flex items-center justify-center overflow-hidden">
          {currentMode === 'idle' && (
            <div className="text-white/20 text-center">
              <Monitor className="h-8 w-8 mx-auto mb-2" />
              <p className="text-xs">Sem conteúdo</p>
            </div>
          )}
          {currentMode === 'logo' && (
            <div className="text-white/50 text-center">
              <Radio className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-bold">7Flow</p>
            </div>
          )}
          {currentMode === 'blackout' && <div className="w-full h-full bg-black" />}
          {currentMode === 'message' && (
            <p className="text-white text-sm font-medium px-4 text-center">
              {displayState?.custom_message || 'Mensagem'}
            </p>
          )}
          {currentMode === 'countdown' && (
            <p className="text-white font-mono text-2xl tabular-nums">
              {new Date().toLocaleTimeString('pt-BR')}
            </p>
          )}
          {currentMode === 'timeline' && (
            <p className="text-white/50 text-xs">Linha do Tempo</p>
          )}
          {currentMode === 'video' && (
            <div className="text-white/50 text-center">
              <Film className="h-8 w-8 mx-auto mb-1" />
              <p className="text-xs">Vídeo ativo</p>
            </div>
          )}
          {currentMode === 'slides' && (
            <div className="text-white/50 text-center">
              <Clapperboard className="h-8 w-8 mx-auto mb-1" />
              <p className="text-xs">Slides: {(displayState?.current_slide_index ?? 0) + 1}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {MODE_ACTIONS.map((action) => (
            <Button
              key={action.mode}
              variant={currentMode === action.mode ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={updating}
              onClick={() => {
                if (action.mode === 'message') {
                  onOpenMessage(output);
                } else {
                  handleSetMode(action.mode);
                }
              }}
            >
              <action.icon className="h-3 w-3" /> {action.label}
            </Button>
          ))}
        </div>

        {/* Open window */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onOpenDisplay(output.display_type)}
        >
          <Eye className="mr-1.5 h-3 w-3" /> Abrir janela do display
        </Button>
      </CardContent>
    </Card>
  );
}

export default function DisplayManager() {
  // Get session_id from CultoContext (sync_session_id or activeCultoId)
  const cultoView = useLiveCultoView();
  const sessionId = cultoView?.culto?.id ?? null;

  const { data: outputs, isLoading } = useDisplayOutputs(sessionId);

  const [messageDialog, setMessageDialog] = useState<{ output: DisplayOutput | null; open: boolean }>({
    output: null,
    open: false,
  });
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Ensure default displays exist on first load
  useEffect(() => {
    if (sessionId && outputs && outputs.length === 0) {
      ensureDefaultDisplays(sessionId);
    }
  }, [sessionId, outputs]);

  const openMessageDialog = useCallback((output: DisplayOutput) => {
    setMessageDialog({ output, open: true });
    setMessageText('');
  }, []);

  const sendMessage = useCallback(async () => {
    if (!messageDialog.output || !messageText.trim()) return;
    setSendingMessage(true);
    await setDisplayMode(messageDialog.output.id, 'message', { message: messageText });
    setSendingMessage(false);
    setMessageDialog({ output: null, open: false });
  }, [messageDialog.output, messageText]);

  const setAllMode = useCallback(async (mode: DisplayMode) => {
    if (!outputs) return;
    await Promise.all(outputs.map((o) => setDisplayMode(o.id, mode)));
  }, [outputs]);

  const openDisplay = useCallback((type: DisplayType) => {
    const params = sessionId ? `?session=${sessionId}` : '';
    window.open(`/display/${type}${params}`, `display-${type}`, 'toolbar=no,menubar=no,location=no');
  }, [sessionId]);

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MonitorPlay className="h-6 w-6" /> Gerenciar Displays
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle o conteúdo exibido em cada tela
            {!sessionId && (
              <span className="text-amber-500 ml-2">(nenhuma sessão ativa)</span>
            )}
          </p>
        </div>
        {/* Global actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAllMode('logo')} disabled={!outputs?.length}>
            <Image className="mr-2 h-4 w-4" /> Logo em todos
          </Button>
          <Button variant="destructive" onClick={() => setAllMode('blackout')} disabled={!outputs?.length}>
            <EyeOff className="mr-2 h-4 w-4" /> Blackout geral
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* No session */}
      {!isLoading && !sessionId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Monitor className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhuma sessão ativa. Inicie um culto para gerenciar os displays.</p>
          </CardContent>
        </Card>
      )}

      {/* Displays Grid */}
      {!isLoading && outputs && outputs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outputs.map((output) => (
            <DisplayCard
              key={output.id}
              output={output}
              onOpenMessage={openMessageDialog}
              onOpenDisplay={openDisplay}
            />
          ))}
        </div>
      )}

      {/* Message Dialog */}
      <Dialog open={messageDialog.open} onOpenChange={(open) => setMessageDialog((s) => ({ ...s, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exibir Mensagem</DialogTitle>
            <DialogDescription>
              Digite a mensagem para exibir no display {messageDialog.output?.name ?? ''}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Digite a mensagem..."
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialog((s) => ({ ...s, open: false }))}>
              Cancelar
            </Button>
            <Button onClick={sendMessage} disabled={!messageText.trim() || sendingMessage}>
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Exibir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
