import React, { memo } from 'react';
import type { MomentoProgramacao } from '@/types/culto';

interface ProgressBarProps {
  momento: MomentoProgramacao;
  elapsedSeconds: number;
}

export const ProgressBar = memo(({ momento, elapsedSeconds }: ProgressBarProps) => {
  const totalSeconds = momento.duracao * 60;
  const percent = Math.min(100, (elapsedSeconds / totalSeconds) * 100);
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const remainMin = Math.floor(remainingSeconds / 60);
  const remainSec = remainingSeconds % 60;

  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{Math.round(percent)}%</span>
        <span>{remainMin}:{String(remainSec).padStart(2, '0')} restantes</span>
      </div>
      <div className="progress-bar h-2">
        <div
          className="progress-bar-fill"
          style={{
            transform: `scaleX(${percent / 100})`,
            transformOrigin: 'left',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';
