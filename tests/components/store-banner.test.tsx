import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QueryConfigs from '@/configs/api/query-config';
import { StorefrontBanner } from '@/components/layout/store-banner';
import type { IStoreBannerItem, IStoreBannerSettings } from '@/interfaces/settings';
import { renderWithProviders } from '../test-utils';

function createStoreBannerItem(overrides: Partial<IStoreBannerItem> = {}): IStoreBannerItem {
  return {
    id: 'banner-item-1',
    message: 'New Kuji releases are live.',
    linkLabel: 'Shop Kuji',
    linkHref: '/products?type=kuji',
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

function createStoreBannerSettings(overrides: Partial<IStoreBannerSettings> = {}): IStoreBannerSettings {
  return {
    enabled: true,
    items: [
      createStoreBannerItem(),
    ],
    ...overrides,
  };
}

function createApiResponse(data: IStoreBannerSettings) {
  return {
    data: {
      status: 'success',
      code: 200,
      success: true,
      message: 'OK',
      data,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('StorefrontBanner', () => {
  it('is hidden when disabled', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({ enabled: false })),
    );

    renderWithProviders(<StorefrontBanner />);

    await waitFor(() => {
      expect(QueryConfigs.fetchPublicStoreBanner).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText('Store announcement')).not.toBeInTheDocument();
  });

  it('is hidden when no active items exist', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({ isActive: false }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    await waitFor(() => {
      expect(QueryConfigs.fetchPublicStoreBanner).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText('Store announcement')).not.toBeInTheDocument();
  });

  it('renders one active item without controls', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({ message: 'Backend managed banner.' }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByText('Backend managed banner.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next announcement/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Previous announcement/i })).not.toBeInTheDocument();
  });

  it('renders multiple active items with prev and next controls', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({ id: 'first', message: 'First announcement.', sortOrder: 0 }),
          createStoreBannerItem({ id: 'second', message: 'Second announcement.', sortOrder: 1 }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByText('First announcement.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous announcement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next announcement/i })).toBeInTheDocument();
  });

  it('clicking next and previous changes content', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({ id: 'first', message: 'First announcement.', sortOrder: 0 }),
          createStoreBannerItem({ id: 'second', message: 'Second announcement.', sortOrder: 1 }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByText('First announcement.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Next announcement/i }));
    expect(screen.getByText('Second announcement.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Previous announcement/i }));
    expect(screen.getByText('First announcement.')).toBeInTheDocument();
  });

  it('auto-rotates every 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({ id: 'first', message: 'First announcement.', sortOrder: 0 }),
          createStoreBannerItem({ id: 'second', message: 'Second announcement.', sortOrder: 1 }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByText('First announcement.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(await screen.findByText('Second announcement.')).toBeInTheDocument();
  });

  it('wraps banner text instead of using horizontal scrolling', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            message: 'This is a very long storefront announcement that should wrap naturally instead of requiring horizontal scrolling across the page.',
          }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    const banner = await screen.findByLabelText('Store announcement');
    expect(banner.innerHTML).toContain('whitespace-normal');
    expect(banner.innerHTML).toContain('break-words');
    expect(banner.innerHTML).not.toContain('overflow-x-auto');
    expect(banner.innerHTML).not.toContain('whitespace-nowrap');
  });

  it('renders an internal link with Next link semantics', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            linkLabel: 'Shop all',
            linkHref: '/products',
          }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    const banner = await screen.findByLabelText('Store announcement');
    expect(within(banner).getByRole('link', { name: 'Shop all' })).toHaveAttribute('href', '/products');
  });

  it('renders an external link safely', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            linkLabel: 'Follow us',
            linkHref: 'https://example.com/popbox',
          }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    const link = await screen.findByRole('link', { name: 'Follow us' });
    expect(link).toHaveAttribute('href', 'https://example.com/popbox');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('fails quietly when the public banner request fails', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockRejectedValue(new Error('network failed'));

    renderWithProviders(<StorefrontBanner />);

    await waitFor(() => {
      expect(QueryConfigs.fetchPublicStoreBanner).toHaveBeenCalled();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Store announcement')).not.toBeInTheDocument();
  });
});
