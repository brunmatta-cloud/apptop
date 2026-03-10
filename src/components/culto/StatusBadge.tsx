import React, { memo } from 'react';
import type { MomentStatus } from '@/types/culto';
import { statusLabel } from '@/types/culto';
import { Clock, Play, Check, Circle } from 'lucide-react';

export const StatusBadge = memo(({ status }: { status: MomentStatus }) => {
  const classes: Record<MomentStatus, string> = {
    concluido: 'bg-status-completed/15 text-status-completed border-status-completed/20',
    executando: 'bg-status-executing/15 text-status-executing border-status-executing/20',
    proximo: 'bg-status-next/15 text-status-next border-status-next/20',
    futuro: 'bg-muted text-muted-foreground border-border',
  };

  const icons: Record<MomentStatus, React.ReactNode> = {
    concluido: <Check className="w-3 h-3" />,
    executando: <Play className="w-3 h-3" />,
    proximo: <Clock className="w-3 h-3" />,
    futuro: <Circle className="w-3 h-3" />,
  };

  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex items-center gap-1 ${classes[status]}`}>
      {icons[status]}
      {statusLabel(status)}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
