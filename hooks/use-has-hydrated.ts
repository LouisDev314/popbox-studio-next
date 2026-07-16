'use client';

import { useSyncExternalStore } from 'react';

function subscribeToHydration() {
  return () => undefined;
}

export function useHasHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}
