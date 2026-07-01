import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { useCheckoutRestoreGuard } from '@/hooks/use-checkout-restore-guard';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { resetStores } from '../test-utils';

function mockNavigationType(type: PerformanceNavigationTiming['type']) {
  vi.spyOn(performance, 'getEntriesByType').mockImplementation((entryType) => (
    entryType === 'navigation'
      ? [{ type }] as PerformanceEntryList
      : []
  ));
}

function dispatchPageShow(persisted: boolean) {
  const event = new Event('pageshow') as PageTransitionEvent;

  Object.defineProperty(event, 'persisted', {
    configurable: true,
    value: persisted,
  });

  window.dispatchEvent(event);
}

describe('useCheckoutRestoreGuard', () => {
  beforeEach(() => {
    resetStores();
    mockNavigationType('navigate');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears stale checkout pending state on bfcache pageshow restore', () => {
    useCheckoutUiStore.getState().beginCheckout();

    renderHook(() => useCheckoutRestoreGuard());

    act(() => {
      dispatchPageShow(true);
    });

    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(false);
  });

  it('clears stale checkout pending state on back-forward navigation restore', () => {
    vi.restoreAllMocks();
    mockNavigationType('back_forward');
    useCheckoutUiStore.getState().beginCheckout();

    renderHook(() => useCheckoutRestoreGuard());

    act(() => {
      dispatchPageShow(false);
    });

    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(false);
  });

  it('does not clear an active same-page checkout request on normal pageshow', () => {
    useCheckoutUiStore.getState().beginCheckout();

    renderHook(() => useCheckoutRestoreGuard());

    act(() => {
      dispatchPageShow(false);
    });

    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(true);
  });

  it('does not clear an active same-page checkout request on visibility changes', () => {
    useCheckoutUiStore.getState().beginCheckout();

    renderHook(() => useCheckoutRestoreGuard());

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(useCheckoutUiStore.getState().isCheckingOut).toBe(true);
  });
});
