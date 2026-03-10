import { useCulto } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import {
  Plus, Minus, Zap, ZapOff, MessageSquare, X, Timer, Settings2, Send, Eye, EyeOff, Type, Link2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CronometroControle = () => {
  const { momentos, currentIndex, momentElapsedSeconds, culto, adjustCurrentMomentDuration } = useCulto();
  const {
    isBlinking, toggleBlink,
    message, setMessage, showMessage, setShowMessage,
    orangeThreshold, redThreshold, setOrangeThreshold, setRedThreshold,
    topFontSize, bottomFontSize, setTopFontSize, setBottomFontSize,
  } = useCronometro();

  const [msgDraft, setMsgDraft] = useState('');

  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const baseDurationSec = currentMoment ? currentMoment.duracao * 60 : 0;
  const remainingSeconds = Math.max(0, baseDurationSec - momentElapsedSeconds);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const excessSeconds = currentMoment && currentMoment.duracaoOriginal != null
    ? Math.round((currentMoment.duracao - currentMoment.duracaoOriginal) * 60)
    : 0;

  const sendMessage = () => {
    if (msgDraft.trim()) {
      const msg = msgDraft.trim();
      setMessage(msg);
      setMsgDraft('');
      // Small delay to ensure message state is set before showing
      setTimeout(() => setShowMessage(true), 50);
    }
  };

  const clearMessage = () => {
    setShowMessage(false);
    setMessage('');
  };

  const copyTimerLink = () => {
    const baseUrl = window.location.origin;
    const timerUrl = `${baseUrl}/cronometro`;
    navigator.clipboard.writeText(timerUrl);
    toast({
      title: "Link copiado!",
      description: "Cole este link para a equipe de sonoplastia abrir em tela cheia.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Controle do Cronômetro</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <button
          onClick={copyTimerLink}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Copiar Link do Cronômetro</span>
          <span className="sm:hidden">Link</span>
        </button>
      </div>

      {/* Current timer preview */}
      <div className="glass-card p-6 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          {currentMoment ? `${currentMoment.bloco} — ${currentMoment.atividade}` : 'Nenhum momento em execução'}
        </p>
        <div className={`font-mono font-bold text-7xl md:text-9xl ${
          remainingSeconds <= redThreshold ? 'text-[hsl(var(--status-delay))]' :
          remainingSeconds <= orangeThreshold ? 'text-[hsl(var(--status-alert))]' : 'text-foreground'
        } ${isBlinking ? 'animate-pulse' : ''}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {currentMoment && (
          <p className="text-lg text-muted-foreground mt-2">{currentMoment.responsavel}</p>
        )}
        {excessSeconds !== 0 && (
          <p className={`text-sm mt-1 font-semibold ${excessSeconds > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
            Ajuste: {excessSeconds > 0 ? '+' : ''}{excessSeconds}s ({excessSeconds > 0 ? '+' : ''}{(excessSeconds / 60).toFixed(1)}min)
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Controls */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4" /> Ajuste de Tempo
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => adjustCurrentMomentDuration(-60)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-semibold">
              <Minus className="w-4 h-4" /> 1 min
            </button>
            <button onClick={() => adjustCurrentMomentDuration(60)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[hsl(var(--status-completed)/0.2)] text-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed)/0.3)] transition-colors font-semibold">
              <Plus className="w-4 h-4" /> 1 min
            </button>
            <button onClick={() => adjustCurrentMomentDuration(-30)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm">
              <Minus className="w-4 h-4" /> 30s
            </button>
            <button onClick={() => adjustCurrentMomentDuration(30)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[hsl(var(--status-completed)/0.1)] text-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed)/0.2)] transition-colors text-sm">
              <Plus className="w-4 h-4" /> 30s
            </button>
          </div>
        </div>

        {/* Visual Controls */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Controles Visuais
          </h3>
          <div className="space-y-3">
            <button
              onClick={toggleBlink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                isBlinking
                  ? 'bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))]'
                  : 'bg-muted hover:bg-muted/80 text-foreground'
              }`}
            >
              {isBlinking ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              {isBlinking ? 'Parar de Piscar' : 'Piscar Cronômetro'}
            </button>
          </div>
        </div>

        {/* Message */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Mensagem no Cronômetro
          </h3>
          {showMessage ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Mensagem exibida:</p>
                <p className="text-lg font-display font-bold">{message}</p>
              </div>
              <button onClick={clearMessage} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors font-semibold">
                <EyeOff className="w-4 h-4" /> Remover Mensagem
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={msgDraft}
                  onChange={e => setMsgDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite a mensagem..."
                  className="flex-1 bg-muted border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgDraft.trim()}
                  className="px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thresholds */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> Limites de Cor
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[hsl(var(--status-alert))]" />
                Laranja (segundos): {orangeThreshold}s
              </label>
              <Slider value={[orangeThreshold]} onValueChange={([v]) => setOrangeThreshold(v)} min={10} max={600} step={10} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[hsl(var(--status-delay))]" />
                Vermelho (segundos): {redThreshold}s
              </label>
              <Slider value={[redThreshold]} onValueChange={([v]) => setRedThreshold(v)} min={5} max={120} step={5} />
            </div>
          </div>
        </div>

        {/* Font Size Controls */}
        <div className="glass-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Type className="w-4 h-4" /> Tamanho dos Textos
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Nome do momento (topo): {topFontSize.toFixed(1)}rem
              </label>
              <Slider value={[topFontSize]} onValueChange={([v]) => setTopFontSize(v)} min={1} max={5} step={0.25} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Responsável (baixo): {bottomFontSize.toFixed(1)}rem
              </label>
              <Slider value={[bottomFontSize]} onValueChange={([v]) => setBottomFontSize(v)} min={1} max={5} step={0.25} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CronometroControle;
