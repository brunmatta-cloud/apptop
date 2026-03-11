import React from 'react';
import type { MomentoProgramacao } from '@/types/culto';
import { useCulto } from '@/contexts/CultoContext';
import { useMomentProgress } from '@/hooks/useMomentProgress';

interface ProgressBarProps {
  momento: MomentoProgramacao;
  elapsedMs: number;
}

export const ProgressBar = ({ momento, elapsedMs }: ProgressBarProps) => {
  const { momentos, currentIndex, momentElapsedMs: liveMomentElapsedMs } = useCulto();
  const currentMoment = currentIndex >= 0 ? momentos[currentIndex] : null;
  const resolvedElapsedMs = currentMoment?.id === momento.id ? liveMomentElapsedMs : elapsedMs;
  const { percent, progressScale, formattedRemaining } = useMomentProgress(momento, resolvedElapsedMs);

  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{Math.round(percent)}%</span>
        <span>{formattedRemaining} restantes</span>
      </div>
      <div className="progress-bar h-2">
        <div
          className="progress-bar-fill"
          style={{
            transform: `scaleX(${progressScale})`,
            transformOrigin: 'left',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};
