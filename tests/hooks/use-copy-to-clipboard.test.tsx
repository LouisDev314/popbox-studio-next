import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

const originalNavigatorClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

function mockNavigatorClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: writeText
      ? {
        writeText,
      }
      : undefined,
  });
}

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    mockNavigatorClipboard(originalNavigatorClipboard?.writeText?.bind(originalNavigatorClipboard));
    document.execCommand = originalExecCommand;
  });

  it('copies with the Clipboard API and resets copied state after the timeout', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigatorClipboard(writeText);

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy('pbs-123456')).resolves.toBe(true);
    });

    expect(writeText).toHaveBeenCalledWith('pbs-123456');
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('falls back to execCommand when the Clipboard API is unavailable', async () => {
    mockNavigatorClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy('pbs-fallback')).resolves.toBe(true);
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(result.current.copied).toBe(true);
  });

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('blocked'));
    mockNavigatorClipboard(writeText);
    document.execCommand = vi.fn().mockReturnValue(true);

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy('pbs-rejected')).resolves.toBe(true);
    });

    expect(writeText).toHaveBeenCalledWith('pbs-rejected');
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(result.current.copied).toBe(true);
  });

  it('returns false without throwing when copy fails completely', async () => {
    mockNavigatorClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await expect(result.current.copy('pbs-failed')).resolves.toBe(false);
    });

    expect(result.current.copied).toBe(false);
  });
});
