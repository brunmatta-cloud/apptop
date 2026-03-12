import { useSyncTimerSnapshot } from '@/contexts/SyncStoreContext';

export const useLiveTimerSnapshot = () => {
  return useSyncTimerSnapshot();
};
