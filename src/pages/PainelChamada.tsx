import { useCultoControls, useCultoTimer, useLiveCultoView } from '@/contexts/CultoContext';
import { Users, Play, Phone, Clock, Check, User, ArrowRight, BellRing } from 'lucide-react';
import { useMemo, memo } from 'react';
import { useClock } from '@/hooks/useClock';
import type { MomentoProgramacao } from '@/types/culto';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const getModeradorStatus = (momento: MomentoProgramacao) => {
  if (momento.moderadorStatus === 'chamado' || momento.moderadorStatus === 'pronto') {
    return momento.moderadorStatus;
  }
  return momento.chamado ? 'chamado' : 'pendente';
};

const formatLeadTime = (minutes: number) => {
  if (minutes <= 0) return 'Chamar agora';
  if (minutes === 1) return 'Falta 1 min';
  return `Faltam ${minutes} min`;
};

const PersonChip = ({ label }: { label: string }) => (
  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/60">
    <User className="h-5 w-5 text-muted-foreground" />
    <span className="sr-only">{label}</span>
  </div>
);

const QueueRow = ({
  momento,
  tone = 'default',
  leadLabel,
  action,
  isLight,
}: {
  momento: MomentoProgramacao;
  tone?: 'default' | 'alert' | 'live';
  leadLabel?: string;
  action?: React.ReactNode;
  isLight: boolean;
}) => {
  const toneClass = tone === 'alert'
    ? isLight
      ? 'border-status-alert/35 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.86)_100%)]'
      : 'border-status-alert/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.12)_0%,rgba(245,158,11,0.04)_100%)]'
    : tone === 'live'
      ? isLight
        ? 'border-status-executing/30 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(235,245,255,0.88)_100%)]'
        : 'border-status-executing/25 bg-[linear-gradient(180deg,rgba(59,130,246,0.12)_0%,rgba(59,130,246,0.04)_100%)]'
      : isLight
        ? 'border-border/80 bg-card/84'
        : 'border-border/60 bg-background/35';

  return (
    <div className={`flex flex-col gap-3 rounded-[1.35rem] border p-3 sm:flex-row sm:items-center sm:gap-4 ${toneClass}`}>
      <PersonChip label={momento.responsavel} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{momento.responsavel}</p>
          <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {momento.funcao}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{momento.ministerio}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted/60 px-2.5 py-1">{momento.atividade}</span>
          <span className="rounded-full bg-muted/60 px-2.5 py-1">{momento.horarioInicio}</span>
          {leadLabel ? <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">{leadLabel}</span> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
};

const EmptyState = ({ message, accent = 'default', isLight }: { message: string; accent?: 'default' | 'alert' | 'live'; isLight: boolean }) => {
  const accentClass = accent === 'alert'
    ? isLight ? 'border-status-alert/25 bg-status-alert/5 text-[hsl(var(--status-alert))]' : 'border-status-alert/20 text-status-alert/80'
    : accent === 'live'
      ? isLight ? 'border-status-executing/25 bg-status-executing/5 text-[hsl(var(--status-executing))]' : 'border-status-executing/20 text-status-executing/80'
      : 'border-border/60 text-muted-foreground';

  return (
    <div className={`rounded-[1.4rem] border border-dashed p-6 text-center text-sm ${accentClass}`}>
      {message}
    </div>
  );
};

const PainelChamada = memo(() => {
  const { resolvedTheme = 'dark' } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { marcarChamado, isSubmitting } = useCultoControls();
  const { culto, momentos, currentIndex } = useLiveCultoView();
  const { momentElapsedSeconds } = useCultoTimer();
  const { currentTime, formatTime } = useClock();

  const executing = currentIndex >= 0 ? [momentos[currentIndex]] : [];

  const chamadaItems = useMemo(() => momentos.flatMap((m, i) => {
    if (i <= currentIndex) return [];
    const minutesUntil = momentos.slice(currentIndex >= 0 ? currentIndex : 0, i).reduce((s, x) => s + x.duracao, 0);
    const adjustedMinutes = Math.max(0, minutesUntil - Math.floor(momentElapsedSeconds / 60));
    const threshold = Math.max(m.antecedenciaChamada, 10);
    if (adjustedMinutes <= threshold && getModeradorStatus(m) === 'pendente') {
      return [{ momento: m, adjustedMinutes }];
    }
    return [];
  }), [momentos, currentIndex, momentElapsedSeconds]);

  const proximosChamar = useMemo(() => momentos.flatMap((m, i) => {
    if (i <= currentIndex) return [];
    const minutesUntil = momentos.slice(currentIndex >= 0 ? currentIndex : 0, i).reduce((s, x) => s + x.duracao, 0);
    const adjustedMinutes = Math.max(0, minutesUntil - Math.floor(momentElapsedSeconds / 60));
    const threshold = Math.max(m.antecedenciaChamada, 10);
    if (adjustedMinutes > threshold && adjustedMinutes <= threshold + 15) {
      return [{ momento: m, adjustedMinutes }];
    }
    return [];
  }), [momentos, currentIndex, momentElapsedSeconds]);

  const chamadosMarcados = useMemo(() => momentos.filter((momento, index) => {
    const status = getModeradorStatus(momento);
    if (status === 'pendente') return false;
    return index !== currentIndex;
  }), [momentos, currentIndex]);

  const primaryCall = chamadaItems[0] ?? null;
  const remainingCalls = primaryCall ? chamadaItems.slice(1) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[hsl(330_70%_60%/0.18)]">
            <Users className="h-5 w-5 text-[hsl(330_70%_60%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold font-display sm:text-3xl">Painel de Chamada</h1>
            <p className="truncate text-sm text-muted-foreground">{culto.nome}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto">
          <div className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Agora</p>
            <p className="mt-1 font-mono text-xl font-bold text-primary">{formatTime(currentTime)}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Ao vivo</p>
            <p className="mt-1 text-xl font-bold font-display text-status-executing">{executing.length}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Chamar</p>
            <p className="mt-1 text-xl font-bold font-display text-status-alert">{chamadaItems.length}</p>
          </div>
          <div className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Em seguida</p>
            <p className="mt-1 text-xl font-bold font-display text-foreground">{proximosChamar.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="space-y-6">
          <div className={cn(
            "glass-card border p-4 sm:p-5 lg:p-6",
            isLight
              ? 'border-status-alert/30 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,247,237,0.84)_100%)]'
              : 'border-status-alert/25 bg-[linear-gradient(180deg,rgba(245,158,11,0.14)_0%,rgba(245,158,11,0.05)_100%)]'
          )}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-status-alert" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-status-alert">Chamar Agora</span>
                </div>
                <h2 className="mt-2 text-2xl font-black font-display sm:text-3xl">Prioridade de chamada</h2>
                <p className="mt-1 text-sm text-muted-foreground">Destaque principal para quem precisa ser chamado neste momento.</p>
              </div>
              <div className="rounded-full border border-status-alert/30 bg-status-alert/10 px-3 py-1.5 text-sm font-semibold text-status-alert">
                {chamadaItems.length} na fila
              </div>
            </div>

            {primaryCall ? (
              <div className={cn(
                "mt-5 rounded-[1.7rem] border p-4 sm:p-5",
                isLight
                  ? 'border-status-alert/25 bg-white/88 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.25)]'
                  : 'border-status-alert/30 bg-[rgba(15,23,42,0.52)]'
              )}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-status-alert/10">
                      <Phone className="h-6 w-6 text-status-alert" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-status-alert">Pessoa para chamar</p>
                      <h3 className="mt-2 truncate text-2xl font-black font-display text-foreground">{primaryCall.momento.responsavel}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted/60 px-2.5 py-1">{primaryCall.momento.ministerio}</span>
                        <span className="rounded-full bg-muted/60 px-2.5 py-1">{primaryCall.momento.funcao}</span>
                        <span className="rounded-full bg-muted/60 px-2.5 py-1">{primaryCall.momento.atividade}</span>
                        <span className="rounded-full bg-muted/60 px-2.5 py-1">{primaryCall.momento.horarioInicio}</span>
                        <span className="rounded-full bg-status-alert/15 px-2.5 py-1 font-semibold text-status-alert">{formatLeadTime(primaryCall.adjustedMinutes)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={isSubmitting}
                    onClick={() => marcarChamado(primaryCall.momento.id)}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-status-completed px-5 py-3 text-sm font-semibold text-[hsl(var(--status-completed-foreground))] transition-colors hover:bg-status-completed/90 disabled:pointer-events-none disabled:opacity-50 lg:min-w-[220px]"
                  >
                    <Check className="h-4 w-4" />
                    {isSubmitting ? 'Confirmando...' : 'Marcar Chamado'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState message="Ninguem para chamar agora." accent="alert" isLight={isLight} />
              </div>
            )}

            {remainingCalls.length > 0 ? (
              <div className="mt-4 space-y-3">
                {remainingCalls.map((momento) => (
                  <QueueRow
                    key={momento.momento.id}
                    momento={momento.momento}
                    tone="alert"
                    isLight={isLight}
                    leadLabel={formatLeadTime(momento.adjustedMinutes)}
                    action={
                      <button
                        disabled={isSubmitting}
                        onClick={() => marcarChamado(momento.momento.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-status-completed/30 bg-status-completed/10 px-3 py-2 text-xs font-semibold text-status-completed transition-colors hover:bg-status-completed/20 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Chamado
                      </button>
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-status-executing" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-status-executing">Em Execucao</h2>
              </div>
              <span className="rounded-full border border-status-executing/30 bg-status-executing/10 px-2.5 py-1 text-[11px] font-semibold text-status-executing">
                {executing.length}
              </span>
            </div>
            {executing.length > 0 && executing[0] ? (
              <div className="space-y-3">
                {executing.map((momento) => (
                  <QueueRow
                    key={momento.id}
                    momento={momento}
                    tone="live"
                    isLight={isLight}
                    action={
                      <div className="inline-flex items-center gap-2 rounded-full border border-status-executing/30 bg-status-executing/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-status-executing">
                        <Play className="h-3.5 w-3.5" />
                        Ao vivo
                      </div>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="Ninguem em execucao." accent="live" isLight={isLight} />
            )}
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Proximos a Chamar</h2>
            </div>
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              {proximosChamar.length}
            </span>
          </div>

          {proximosChamar.length > 0 ? (
            <div className="space-y-3">
              {proximosChamar.map((momento) => (
                <QueueRow
                  key={momento.momento.id}
                  momento={momento.momento}
                  isLight={isLight}
                  leadLabel={formatLeadTime(momento.adjustedMinutes)}
                  action={
                    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
                      Em seguida
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhum proximo na fila de chamada." isLight={isLight} />
          )}
        </div>
      </div>

      <div className="glass-card p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-status-completed" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-status-completed">Ja Chamados</h2>
          </div>
          <span className="rounded-full border border-status-completed/30 bg-status-completed/10 px-2.5 py-1 text-[11px] font-semibold text-status-completed">
            {chamadosMarcados.length}
          </span>
        </div>

        {chamadosMarcados.length > 0 ? (
          <div className="space-y-3">
            {chamadosMarcados.map((momento) => (
              <QueueRow
                key={momento.id}
                momento={momento}
                isLight={isLight}
                action={
                  <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                    getModeradorStatus(momento) === 'pronto'
                      ? isLight
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : isLight
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
                        : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                  }`}>
                    <Check className="h-3.5 w-3.5" />
                    {getModeradorStatus(momento) === 'pronto' ? 'Pronto' : 'Chamado'}
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhum chamado registrado ainda." isLight={isLight} />
        )}
      </div>
    </div>
  );
});

PainelChamada.displayName = 'PainelChamada';
export default PainelChamada;
