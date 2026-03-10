import { useCulto } from '@/contexts/CultoContext';
import { useCronometro } from '@/contexts/CronometroContext';
import { ProgressBar } from '@/components/culto/ProgressBar';
import { StatusBadge } from '@/components/culto/StatusBadge';
import { calcularHorarioTermino } from '@/types/culto';
import {
  Play, Pause, SkipForward, SkipBack, FastForward, Clock, Users, Radio, Check,
  Plus, Minus, Zap, ZapOff, Send, EyeOff, Timer, ExternalLink
} from 'lucide-react';
import { useMemo, useState, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useClock } from '@/hooks/useClock';

const PainelCerimonialista = memo(() => {
  const {
    culto, momentos, currentIndex, elapsedSeconds, momentElapsedSeconds,
    executionMode, setExecutionMode, isPaused,
    avancar, voltar, pausar, retomar, pular, iniciarCulto, finalizarCulto,
    getMomentStatus, marcarChamado, adjustCurrentMomentDuration,
  } = useCulto();

  const {
    isBlinking, toggleBlink,
    message, setMessage, showMessage, setShowMessage,
  } = useCronometro();

  const [msgDraft, setMsgDraft] = useState('');
  const { currentTime, formatTime } = useClock();

  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;

  const { totalMinutes, progressPercent, remainMin, remainSec } = useMemo(() => {
    const total = momentos.reduce((sum, m) => sum + m.duracao, 0);
    const completed = momentos.slice(0, Math.max(0, currentIndex)).reduce((sum, m) => sum + m.duracao, 0);
    const progress = total > 0 ? (completed / total) * 100 : 0;
    const remaining = total * 60 - elapsedSeconds;
    return {
      totalMinutes: total,
      progressPercent: progress,
      remainMin: Math.floor(Math.max(0, remaining) / 60),
      remainSec: Math.max(0, remaining) % 60,
    };
  }, [momentos, currentIndex, elapsedSeconds]);

  const chamadaItems = useMemo(() => momentos.filter((m, i) => {
    if (i <= currentIndex) return false;
    const minutesUntil = momentos.slice(currentIndex >= 0 ? currentIndex : 0, i).reduce((s, x) => s + x.duracao, 0);
    const adjustedMinutes = minutesUntil - Math.floor(momentElapsedSeconds / 60);
    return adjustedMinutes <= m.antecedenciaChamada && !m.chamado;
  }), [momentos, currentIndex, momentElapsedSeconds]);

  const momentPercent = currentMoment ? Math.min(100, (momentElapsedSeconds / (currentMoment.duracao * 60)) * 100) : 0;
  const momentRemaining = currentMoment ? Math.max(0, currentMoment.duracao * 60 - momentElapsedSeconds) : 0;
  const nextMoments = useMemo(() => momentos.slice(Math.max(0, currentIndex + 1), currentIndex + 5), [momentos, currentIndex]);

  const handleSendMessage = useCallback(() => {
    try {
      if (msgDraft.trim()) {
        setMessage(msgDraft.trim());
        setShowMessage(true);
        setMsgDraft('');
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  }, [msgDraft, setMessage, setShowMessage]);

  // Safe handlers with error protection
  const safeAdjustDuration = useCallback((delta: number) => {
    try {
      adjustCurrentMomentDuration(delta);
    } catch (err) {
      console.error('Erro ao ajustar duração:', err);
    }
  }, [adjustCurrentMomentDuration]);

  const safeToggleBlink = useCallback(() => {
    try {
      toggleBlink();
    } catch (err) {
      console.error('Erro ao alternar piscar:', err);
    }
  }, [toggleBlink]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(142_71%_45%/0.2)] flex items-center justify-center">
            <Radio className="w-5 h-5 text-[hsl(142_71%_45%)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Painel do Cerimonialista</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xl sm:text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
          {culto.status === 'planejado' && (
            <button onClick={iniciarCulto} className="px-4 sm:px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm">
              <Play className="w-4 h-4" /> Iniciar Culto
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Progresso</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{Math.round(progressPercent)} %</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Decorrido</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{elapsedSeconds}s</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Restante</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1">{remainMin}min {remainSec}s</p>
        </div>
        <div className="glass-card p-3 sm:p-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Status</span>
          <p className="text-xl sm:text-2xl font-bold font-display mt-1 text-status-completed">
            {culto.status === 'em_andamento' ? (isPaused ? '⏸ Pausado' : '✓') : culto.status === 'finalizado' ? '✓ Fim' : '—'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass-card p-4">
        <div className="progress-bar h-2.5 rounded-full">
          <div className="progress-bar-fill rounded-full" style={{ transform: `scaleX(${progressPercent / 100})`, transformOrigin: 'left', width: '100%' }} />
        </div>
        <p className="text-right text-xs text-muted-foreground mt-1.5">{Math.round(progressPercent)} %</p>
      </div>

      {/* Momento em execução */}
      {currentMoment && (
        <div className="glass-card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-status-executing animate-pulse" />
            <span className="text-xs font-semibold text-status-executing uppercase tracking-wider">Momento em Execução</span>
          </div>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Users className="w-5 sm:w-6 h-5 sm:h-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold truncate">{currentMoment.atividade}</h2>
              <p className="text-muted-foreground text-sm truncate">{currentMoment.responsavel} • {currentMoment.ministerio} • {currentMoment.funcao}</p>
              <div className="mt-3">
                <div className="progress-bar h-2 rounded-full">
                  <div className="progress-bar-fill rounded-full" style={{ transform: `scaleX(${momentPercent / 100})`, transformOrigin: 'left', width: '100%' }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{currentMoment.horarioInicio}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {Math.floor(momentRemaining / 60)}:{String(momentRemaining % 60).padStart(2, '0')} restantes
                  </span>
                  <span>{calcularHorarioTermino(currentMoment.horarioInicio, currentMoment.duracao)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {culto.status === 'em_andamento' && (
        <div className="glass-card p-4 sm:p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Controles</h3>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button onClick={voltar} className="px-3 sm:px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-2 text-sm">
              <SkipBack className="w-4 h-4" /> <span className="hidden sm:inline">Voltar</span>
            </button>
            {isPaused ? (
              <button onClick={retomar} className="px-4 sm:px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-semibold">
                <Play className="w-4 h-4" /> Retomar
              </button>
            ) : (
              <button onClick={pausar} className="px-4 sm:px-6 py-2.5 rounded-lg bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))] hover:bg-[hsl(var(--status-alert))]/90 transition-colors flex items-center gap-2 text-sm font-semibold">
                <Pause className="w-4 h-4" /> Pausar
              </button>
            )}
            <button onClick={avancar} className="px-3 sm:px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-semibold">
              <span className="hidden sm:inline">Avançar</span> <SkipForward className="w-4 h-4" />
            </button>
            <button onClick={pular} className="px-3 sm:px-5 py-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center gap-2 text-sm">
              <FastForward className="w-4 h-4" /> <span className="hidden sm:inline">Pular</span>
            </button>
            <button onClick={finalizarCulto} className="px-3 sm:px-5 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-2 text-sm font-semibold">
              <Check className="w-4 h-4" /> <span className="hidden sm:inline">Finalizar</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Timer Controls */}
      {culto.status === 'em_andamento' && (
        <div className="glass-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4" /> Controle Rápido
            </h3>
            <Link to="/cronometro-controle" className="text-xs text-primary hover:underline flex items-center gap-1">
              Completo <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={() => safeAdjustDuration(-60)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-sm font-semibold">
              <Minus className="w-3 h-3" /> 1min
            </button>
            <button onClick={() => safeAdjustDuration(60)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[hsl(var(--status-completed)/0.2)] text-[hsl(var(--status-completed))] hover:bg-[hsl(var(--status-completed)/0.3)] transition-colors text-sm font-semibold">
              <Plus className="w-3 h-3" /> 1min
            </button>
            <button
              onClick={safeToggleBlink}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isBlinking ? 'bg-[hsl(var(--status-alert))] text-[hsl(var(--status-alert-foreground))]' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {isBlinking ? <ZapOff className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {isBlinking ? 'Parar' : 'Piscar'}
            </button>
            {showMessage ? (
              <button onClick={() => { setShowMessage(false); setMessage(''); }} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors text-sm">
                <EyeOff className="w-3 h-3" /> Tirar Msg
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={msgDraft}
                  onChange={e => setMsgDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                  placeholder="Mensagem..."
                  className="bg-muted border border-border rounded-lg px-3 py-2 text-sm w-28 sm:w-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!msgDraft.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
            {(() => {
              const excess = currentMoment && currentMoment.duracaoOriginal != null
                ? Math.round((currentMoment.duracao - currentMoment.duracaoOriginal) * 60)
                : 0;
              return excess !== 0 ? (
                <span className={`text-xs font-semibold ${excess > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
                  Ajuste: {excess > 0 ? '+' : ''}{excess}s
                </span>
              ) : null;
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          {/* Programação completa */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Programação Completa</h3>
            <div className="space-y-1">
              {momentos.map((m, i) => {
                const status = getMomentStatus(i);
                const excess = m.duracaoOriginal != null ? Math.round((m.duracao - m.duracaoOriginal) * 60) : 0;
                return (
                  <div key={m.id} className={`flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg transition-colors ${status === 'executando' ? 'bg-status-executing/10' : 'hover:bg-muted/20'}`}>
                    <span className="text-xs sm:text-sm font-mono text-muted-foreground w-10 sm:w-12">{m.horarioInicio}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${status === 'concluido' ? 'text-muted-foreground line-through' : ''} truncate`}>
                        {m.atividade}
                        {excess !== 0 && (
                          <span className={`ml-2 text-xs font-semibold ${excess > 0 ? 'text-[hsl(var(--status-alert))]' : 'text-[hsl(var(--status-completed))]'}`}>
                            ({excess > 0 ? '+' : ''}{excess}s)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{m.responsavel}</p>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Chamada */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-status-alert" />
              <span className="text-status-alert">Painel de Chamada</span>
            </h3>
            {chamadaItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ninguém para ligar no momento</p>
            ) : (
              <div className="space-y-3">
                {chamadaItems.map(m => (
                  <div key={m.id} className="p-3 rounded-lg bg-status-alert/10 border border-status-alert/20">
                    <p className="font-semibold text-sm">{m.responsavel}</p>
                    <p className="text-xs text-muted-foreground">{m.ministerio} • {m.funcao}</p>
                    <p className="text-xs text-muted-foreground">{m.atividade} às {m.horarioInicio}</p>
                    <button onClick={() => marcarChamado(m.id)} className="mt-2 text-xs px-3 py-1 rounded bg-status-completed/20 text-status-completed hover:bg-status-completed/30 transition-colors flex items-center gap-1">
                      <Check className="w-3 h-3" /> Marcar como chamado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Próximos Momentos</h3>
            {nextMoments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum próximo momento</p>
            ) : (
              <div className="space-y-2">
                {nextMoments.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
                    <span className="text-xs font-mono text-muted-foreground">{m.horarioInicio}</span>
                    <span className="text-sm flex-1 truncate">{m.atividade}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modo de execução */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modo de Execução</h3>
            <select
              value={executionMode}
              onChange={e => setExecutionMode(e.target.value as any)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="manual">Manual</option>
              <option value="automatico">Automático</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

PainelCerimonialista.displayName = 'PainelCerimonialista';
export default PainelCerimonialista;
