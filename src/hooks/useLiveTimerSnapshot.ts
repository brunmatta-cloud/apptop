import { useMemo } from 'react';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { getTimerSnapshot } from '@/features/culto-sync/domain';
import { useAlignedNow } from '@/hooks/useAlignedNow';

export const useLiveTimerSnapshot = () => {
  const { remoteState } = useSyncStore();
  const nowMs = useAlignedNow(remoteState.timerStatus === 'running');

  return useMemo(() => getTimerSnapshot(remoteState, nowMs), [nowMs, remoteState]);
};
