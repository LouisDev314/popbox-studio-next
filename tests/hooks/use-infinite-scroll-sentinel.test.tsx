import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScrollSentinel } from '@/hooks/use-infinite-scroll-sentinel';
import {
  installMockIntersectionObserver,
  mockIntersectionObservers,
} from '../mock-intersection-observer';

describe('useInfiniteScrollSentinel', () => {
  beforeEach(() => {
    installMockIntersectionObserver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches once for repeated intersecting callbacks and uses the requested root', async () => {
    let resolveFetch: (() => void) | undefined;
    const fetchNextPage = vi.fn(() => new Promise<void>((resolve) => {
      resolveFetch = resolve;
    }));
    const root = document.createElement('div');
    const sentinel = document.createElement('div');
    const { result } = renderHook(() => useInfiniteScrollSentinel({
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      root,
    }));

    act(() => result.current(sentinel));
    await waitFor(() => expect(mockIntersectionObservers).toHaveLength(1));
    expect(mockIntersectionObservers[0].root).toBe(root);
    expect(mockIntersectionObservers[0].rootMargin).toBe('200px 0px');

    act(() => {
      mockIntersectionObservers[0].trigger();
      mockIntersectionObservers[0].trigger();
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    resolveFetch?.();
  });

  it.each([
    { enabled: false, hasNextPage: true, isError: false, isFetchingNextPage: false },
    { enabled: true, hasNextPage: false, isError: false, isFetchingNextPage: false },
    { enabled: true, hasNextPage: true, isError: true, isFetchingNextPage: false },
    { enabled: true, hasNextPage: true, isError: false, isFetchingNextPage: true },
  ])('does not observe or fetch when pagination is gated: %o', async (options) => {
    const fetchNextPage = vi.fn().mockResolvedValue(undefined);
    const sentinel = document.createElement('div');
    const { result } = renderHook(() => useInfiniteScrollSentinel({
      ...options,
      fetchNextPage,
    }));

    act(() => result.current(sentinel));
    await act(async () => Promise.resolve());

    expect(mockIntersectionObservers).toHaveLength(0);
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', async () => {
    const sentinel = document.createElement('div');
    const { result, unmount } = renderHook(() => useInfiniteScrollSentinel({
      fetchNextPage: vi.fn().mockResolvedValue(undefined),
      hasNextPage: true,
      isFetchingNextPage: false,
    }));

    act(() => result.current(sentinel));
    await waitFor(() => expect(mockIntersectionObservers).toHaveLength(1));
    const observer = mockIntersectionObservers[0];

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('uses the latest fetch callback without rebuilding the observer', async () => {
    const firstFetch = vi.fn().mockResolvedValue(undefined);
    const secondFetch = vi.fn().mockResolvedValue(undefined);
    const sentinel = document.createElement('div');
    const { result, rerender } = renderHook(
      ({ fetchNextPage }) => useInfiniteScrollSentinel({
        fetchNextPage,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
      { initialProps: { fetchNextPage: firstFetch } },
    );

    act(() => result.current(sentinel));
    await waitFor(() => expect(mockIntersectionObservers).toHaveLength(1));
    rerender({ fetchNextPage: secondFetch });

    act(() => mockIntersectionObservers[0].trigger());
    await waitFor(() => expect(secondFetch).toHaveBeenCalledTimes(1));
    expect(firstFetch).not.toHaveBeenCalled();
    expect(mockIntersectionObservers).toHaveLength(1);
  });
});
