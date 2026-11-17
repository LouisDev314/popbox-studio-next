import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StoreError from '@/app/(store)/error';
import StoreRootPage from '@/app/(store)/page';

const mocks = vi.hoisted(() => ({ captureException: vi.fn(), getPublicHomepageData: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureException: mocks.captureException }));
vi.mock('@/lib/api/public-storefront', () => ({ getPublicHomepageData: mocks.getPublicHomepageData }));

describe('storefront origin failure', () => {
  it('rejects failed homepage generation instead of rendering a cacheable error success', async () => {
    const error = new Error('origin unavailable');
    mocks.getPublicHomepageData.mockRejectedValue(error);
    await expect(StoreRootPage()).rejects.toBe(error);
  });

  it('reports cold errors and provides retry and browse actions', () => {
    const error = new Error('origin unavailable');
    const reset = vi.fn();
    render(<StoreError error={error} reset={reset} />);
    expect(mocks.captureException).toHaveBeenCalledWith(error);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute('href', '/products');
  });
});
