import { useCulto } from '@/contexts/CultoContext';
import { calcularHorarioTermino } from '@/types/culto';
import type { MomentoProgramacao } from '@/types/culto';
import { Clock, User } from 'lucide-react';
import { useMemo } from 'react';
import { useClock } from '@/hooks/useClock';

const normalizeMomento = (momento: Partial<MomentoProgramacao> | null | undefined, index: number): MomentoProgramacao => ({
  id: momento?.id || `momento-${index}`,
  cultoId: momento?.cultoId || '',
  ordem: Number.isFinite(momento?.ordem) ? Number(momento.ordem) : index,
  bloco: momento?.bloco || '',
  horarioInicio: typeof momento?.horarioInicio === 'string' && momento.horarioInicio.includes(':') ? momento.horarioInicio : '00:00',
  duracao: Number.isFinite(momento?.duracao) ? Math.max(0, Number(momento.duracao)) : 0,
  atividade: momento?.atividade || 'Momento sem nome',
  responsavel: momento?.responsavel || 'Nao informado',
  ministerio: momento?.ministerio || 'Nao informado',
  funcao: momento?.funcao || 'Nao informado',
  fotoUrl: momento?.fotoUrl || '',
  tipoMomento: momento?.tipoMomento || 'nenhum',
  tipoMidia: momento?.tipoMidia || 'nenhum',
  acaoSonoplastia: momento?.acaoSonoplastia || '',
  observacao: momento?.observacao || '',
  antecedenciaChamada: Number.isFinite(momento?.antecedenciaChamada) ? Math.max(0, Number(momento.antecedenciaChamada)) : 0,
  chamado: Boolean(momento?.chamado),
  moderadorStatus: momento?.moderadorStatus === 'chamado' || momento?.moderadorStatus === 'pronto'
    ? momento.moderadorStatus
    : momento?.moderadorStatus === 'confirmado'
      ? 'pronto'
    : 'pendente',
  confirmacaoStatus: momento?.confirmacaoStatus === 'confirmado' || momento?.confirmacaoStatus === 'ausente'
    ? momento.confirmacaoStatus
    : momento?.moderadorStatus === 'confirmado' || momento?.moderadorStatus === 'ausente'
      ? momento.moderadorStatus
      : 'pendente',
  responsavelOriginal: typeof momento?.responsavelOriginal === 'string' ? momento.responsavelOriginal : undefined,
  duracaoOriginal: Number.isFinite(momento?.duracaoOriginal) ? Number(momento.duracaoOriginal) : undefined,
});

const LinhaDoTempo = () => {
  const { culto, momentos, currentIndex, momentElapsedMs, isPaused, getMomentStatus } = useCulto();
  const { currentTime, formatTime } = useClock();
  const safeMomentos = useMemo(
    () => (Array.isArray(momentos) ? momentos : []).map((momento, index) => normalizeMomento(momento, index)),
    [momentos]
  );
  const safeCurrentIndex = Number.isInteger(currentIndex) ? currentIndex : -1;
  const safeMomentElapsedMs = Number.isFinite(momentElapsedMs) ? momentElapsedMs : 0;

  const totalMinutes = useMemo(() => safeMomentos.reduce((sum, m) => sum + m.duracao, 0), [safeMomentos]);
  const firstTime = safeMomentos[0]?.horarioInicio || '00:00';
  const lastEnd = safeMomentos.length > 0 ? calcularHorarioTermino(safeMomentos[safeMomentos.length - 1].horarioInicio, safeMomentos[safeMomentos.length - 1].duracao) : '00:00';

  const blockColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const colorPool = ['bg-[hsl(217_91%_60%)]', 'bg-[hsl(270_60%_55%)]', 'bg-[hsl(142_71%_45%)]', 'bg-[hsl(30_90%_50%)]', 'bg-[hsl(330_70%_60%)]', 'bg-[hsl(190_80%_50%)]', 'bg-[hsl(45_90%_55%)]'];
    let idx = 0;
    safeMomentos.forEach(m => {
      if (!colors[m.bloco]) {
        colors[m.bloco] = colorPool[idx % colorPool.length];
        idx++;
      }
    });
    return colors;
  }, [safeMomentos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(0_72%_51%/0.2)] flex items-center justify-center">
            <Clock className="w-5 h-5 text-[hsl(0_72%_51%)]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Linha do Tempo</h1>
            <p className="text-muted-foreground text-sm">{culto.nome}</p>
          </div>
        </div>
        <span className="text-xl sm:text-2xl font-mono font-bold text-primary">{formatTime(currentTime)}</span>
      </div>

      {/* Visual timeline bar */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex gap-0.5 h-10 sm:h-12 rounded-xl overflow-hidden">
          {safeMomentos.map((m, i) => {
            const widthPercent = totalMinutes > 0 ? (m.duracao / totalMinutes) * 100 : 0;
            const status = getMomentStatus(i);
            const color = status === 'concluido' ? 'bg-status-completed' :
                         status === 'executando' ? 'bg-status-executing' :
                         blockColors[m.bloco] || 'bg-muted';
            return (
              <div
                key={m.id}
                className={`${color} ${status === 'executando' ? 'animate-pulse' : ''} transition-all relative group`}
                style={{ width: `${widthPercent}%`, minWidth: '2px' }}
                title={`${m.atividade} (${m.duracao}min)`}
              >
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-3 py-1.5 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                  {m.atividade}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
          <span>{firstTime}</span>
          <span>{lastEnd}</span>
        </div>
      </div>

      {/* Timeline items */}
      <div className="space-y-4 relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        {safeMomentos.map((m, i) => {
          const status = getMomentStatus(i);
          const isExecuting = status === 'executando';
          const horarioFim = calcularHorarioTermino(m.horarioInicio, m.duracao);
          const itemElapsedMs = isExecuting ? safeMomentElapsedMs : 0;
          const itemTotalMs = m.duracao * 60 * 1000;
          const itemPercent = itemTotalMs > 0
            ? Math.min(100, (itemElapsedMs / itemTotalMs) * 100)
            : 0;
          const itemProgressScale = itemPercent / 100;
          const itemRemainingMs = Math.max(0, itemTotalMs - itemElapsedMs);
          const itemRemainingSeconds = Math.ceil(itemRemainingMs / 1000);
          const itemRemaining = `${String(Math.floor(itemRemainingSeconds / 60)).padStart(2, '0')}:${String(itemRemainingSeconds % 60).padStart(2, '0')}`;
          const itemDisplayPercent = Math.min(100, Math.max(0, Math.round(itemPercent)));
          return (
            <div key={m.id} className="relative pl-12">
              <div className={`absolute left-[14px] top-5 w-3 h-3 rounded-full border-2 ${
                status === 'concluido' ? 'bg-status-completed border-status-completed' :
                isExecuting ? 'bg-status-executing border-status-executing animate-pulse' :
                'bg-muted border-border'
              }`} />
              <div className={`glass-card p-3 sm:p-4 ${isExecuting ? 'border-l-4 border-l-status-executing' : ''}`}>
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-1 flex-wrap">
                      <span className="font-mono font-bold text-primary">{m.horarioInicio}</span>
                      <span>—</span>
                      <span className="font-mono">{horarioFim}</span>
                      <span>({m.duracao} min)</span>
                    </div>
                    <h3 className={`font-display font-semibold text-base sm:text-lg ${status === 'concluido' ? 'text-muted-foreground line-through' : ''} truncate`}>{m.atividade}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <User className="w-3.5 h-3.5 shrink-0" /> {m.responsavel} • {m.ministerio}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider shrink-0 ${
                    blockColors[m.bloco] || 'bg-muted'
                  } text-white`}>
                    {m.bloco}
                  </span>
                </div>
                {isExecuting && (
                  <div className="mt-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{itemDisplayPercent}%</span>
                        <span>{isPaused ? `${itemRemaining} pausado` : `${itemRemaining} restantes`}</span>
                      </div>
                      <div className="progress-bar h-2">
                        <div
                          className="progress-bar-fill"
                          style={{
                            transform: `scaleX(${itemProgressScale})`,
                            transformOrigin: 'left',
                            width: '100%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default LinhaDoTempo;
