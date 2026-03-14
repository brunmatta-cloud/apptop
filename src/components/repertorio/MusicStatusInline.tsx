import { motion } from 'framer-motion';
import { Music4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RepertoireSummary } from '@/features/repertorio/model';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ok':
      return 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/30 text-emerald-300';
    case 'incompleto':
      return 'from-amber-500/20 to-amber-500/10 border-amber-500/30 text-amber-300';
    case 'aguardando':
      return 'from-sky-500/20 to-sky-500/10 border-sky-500/30 text-sky-300';
    case 'vazio':
      return 'from-rose-500/20 to-rose-500/10 border-rose-500/30 text-rose-300';
    default:
      return 'from-muted/20 to-muted/10 border-border/30 text-muted-foreground';
  }
};

export function MusicStatusInline({ summary }: { summary: RepertoireSummary }) {
  if (!summary.isMusicMoment) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
        getStatusColor(summary.status)
      )}
    >
      <Music4 className="h-3 w-3 shrink-0" />
      <span>{summary.songsCount}</span>
      {summary.songsWithMediaCount > 0 && (
        <>
          <span className="opacity-60">·</span>
          <span>{summary.songsWithMediaCount}m</span>
        </>
      )}
      {summary.songsWithPlaybackCount > 0 && (
        <>
          <span className="opacity-60">·</span>
          <span>{summary.songsWithPlaybackCount}p</span>
        </>
      )}
      <span className="opacity-60">·</span>
      <span className="inline-flex items-center rounded-full px-1 py-0.5 text-[9px]" style={{
        backgroundColor: 'currentColor',
        opacity: 0.15,
        color: 'inherit',
      }}>
        {summary.status === 'ok' ? '✓' : summary.status === 'aguardando' ? '◐' : '!'}
      </span>
    </motion.div>
  );
}
