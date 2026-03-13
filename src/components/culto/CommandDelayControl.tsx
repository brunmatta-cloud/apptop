import { Minus, Plus, Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DELAY_PRESETS = [0, 3, 5, 10];
const MAX_DELAY_SECONDS = 30;

interface CommandDelayControlProps {
  delaySeconds: number;
  onDelayChange: (next: number) => void;
  scheduledCommandLabel?: string | null;
  remainingSeconds?: number;
  onCancelScheduled?: () => void;
  className?: string;
  description?: string;
}

export function CommandDelayControl({
  delaySeconds,
  onDelayChange,
  scheduledCommandLabel,
  remainingSeconds = 0,
  onCancelScheduled,
  className,
  description = 'Aplica aos comandos desta central.',
}: CommandDelayControlProps) {
  const adjustDelay = (delta: number) => {
    onDelayChange(Math.max(0, Math.min(MAX_DELAY_SECONDS, delaySeconds + delta)));
  };

  return (
    <div className={cn('rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-3.5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            Delay opcional
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {delaySeconds === 0 ? 'Sem atraso' : `${delaySeconds}s antes de executar`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>

        {scheduledCommandLabel && (
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2 text-xs text-primary">
            <div className="min-w-0">
              <p className="truncate font-semibold">{scheduledCommandLabel}</p>
              <p className="text-[11px] text-primary/80">Executa em {remainingSeconds}s</p>
            </div>
            {onCancelScheduled && (
              <button
                type="button"
                onClick={onCancelScheduled}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background/80 text-primary transition-colors hover:bg-background"
                aria-label="Cancelar comando agendado"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DELAY_PRESETS.map((preset) => {
          const isActive = delaySeconds === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onDelayChange(preset)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-primary/25 bg-primary text-primary-foreground'
                  : 'border-border/70 bg-background/70 text-muted-foreground hover:bg-muted'
              )}
            >
              {preset === 0 ? 'Sem delay' : `${preset}s`}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-1">
          <button
            type="button"
            onClick={() => adjustDelay(-1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Reduzir delay"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold text-foreground">{delaySeconds}s</span>
          <button
            type="button"
            onClick={() => adjustDelay(1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Aumentar delay"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
