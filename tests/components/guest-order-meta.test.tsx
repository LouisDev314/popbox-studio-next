import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestOrderMeta } from '@/app/(store)/orders/[publicId]/guest-order-meta';
import { renderWithProviders } from '../test-utils';

const toastSuccess = vi.fn();
const originalNavigatorClipboard = navigator.clipboard;

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

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

describe('GuestOrderMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    toastSuccess.mockReset();
    mockNavigatorClipboard(originalNavigatorClipboard?.writeText?.bind(originalNavigatorClipboard));
  });

  it('renders the boxed order meta with the placed-on row underneath', () => {
    renderWithProviders(
      <GuestOrderMeta publicId="pbs-123456" placedAt="2026-04-20T00:00:00.000Z" />,
    );

    expect(screen.getByText('Order Number')).toBeInTheDocument();
    expect(screen.getByText('pbs-123456')).toBeInTheDocument();
    expect(screen.getByText('Placed on')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-04-20T00:00:00.000Z').toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy order number' })).toBeInTheDocument();
  });

  it('copies the order number, shows the toast, and swaps to the success icon briefly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockNavigatorClipboard(writeText);

    renderWithProviders(
      <GuestOrderMeta publicId="pbs-123456" placedAt="2026-04-20T00:00:00.000Z" />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy order number' }));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('pbs-123456');
    expect(toastSuccess).toHaveBeenCalledWith('Order number copied');
    expect(screen.getByRole('button', { name: 'Copy order number' })).toHaveAttribute('data-state', 'copied');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole('button', { name: 'Copy order number' })).toHaveAttribute('data-state', 'idle');
  });

  it('keeps long order numbers rendered without removing copy access', () => {
    renderWithProviders(
      <GuestOrderMeta
        publicId="pbs-THIS-IS-A-VERY-LONG-ORDER-ID-THAT-SHOULD-STILL-STAY-USABLE-1234567890"
        placedAt={null}
      />,
    );

    expect(screen.getByText('pbs-THIS-IS-A-VERY-LONG-ORDER-ID-THAT-SHOULD-STILL-STAY-USABLE-1234567890')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy order number' })).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
