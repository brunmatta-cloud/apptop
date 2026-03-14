import { Music4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRepertoireStatusTone,
  type RepertoireStatus,
  type RepertoireSummary,
} from '@/features/repertorio/model';

const getStatusChipLabel = (status: RepertoireStatus) => {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'incompleto':
      return 'Pendencia';
    case 'aguardando':
      return 'Aguardando';
    case 'vazio':
      return 'Sem repertorio';
    default:
      return 'Informativo';
  }
};

const getStatusChipTone = (status: RepertoireStatus) => {
  switch (status) {
    case 'ok':
      return 'border-emerald-500/20 bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
    case 'incompleto':
      return 'border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300';
    case 'aguardando':
      return 'border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300';
    case 'vazio':
      return 'border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300';
    default:
      return 'border-border/70 bg-muted/50 text-muted-foreground';
  }
};

export function RepertorioStatusBadge({
  summary,
  compact = false,
}: {
  summary: RepertoireSummary;
  compact?: boolean;
}) {
  if (!summary.isMusicMoment) {
    return null;
  }

  return (
    <div className={cn(
      'rounded-[1.5rem] border px-3 py-3',
      compact ? 'space-y-2.5' : 'space-y-3',
      getRepertoireStatusTone(summary.status),
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/10">
            <Music4 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Repertorio</p>
            <p className={cn('font-semibold leading-tight', compact ? 'text-sm' : 'text-base')}>{summary.label}</p>
          </div>
        </div>
        <span className={cn(
          'inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
          getStatusChipTone(summary.status),
        )}>
          {getStatusChipLabel(summary.status)}
        </span>
      </div>

      <div className={cn(
        'grid gap-2 text-xs',
        compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-4',
      )}>
        <span className="inline-flex items-center rounded-full bg-black/10 px-2.5 py-1.5">
          {summary.songsCount} {summary.songsCount === 1 ? 'musica' : 'musicas'}
        </span>
        <span className="inline-flex items-center rounded-full bg-black/10 px-2.5 py-1.5">
          {summary.songsWithMediaCount} com midia
        </span>
        <span className="inline-flex items-center rounded-full bg-black/10 px-2.5 py-1.5">
          {summary.songsWithPlaybackCount} com playback
        </span>
        <span className="inline-flex items-center rounded-full bg-black/10 px-2.5 py-1.5">
          {summary.hasLink ? 'Link ativo' : 'Sem link'}
        </span>
      </div>

      {!compact && (
        <p className="text-xs leading-relaxed opacity-90">
          {summary.description}
        </p>
      )}
    </div>
  );
}
