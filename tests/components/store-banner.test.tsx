import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QueryConfigs from '@/configs/api/query-config';
import { StorefrontBanner } from '@/components/layout/store-banner';
import type { IStoreBannerSettings } from '@/interfaces/settings';
import { renderWithProviders } from '../test-utils';

function createStoreBannerSettings(overrides: Partial<IStoreBannerSettings> = {}): IStoreBannerSettings {
  return {
    enabled: true,
    message: 'New Kuji releases are live.',
    linkLabel: 'Shop Kuji',
    linkHref: '/products?type=kuji',
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

  it('renders the backend message', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({ message: 'Backend managed banner.' })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByText('Backend managed banner.')).toBeInTheDocument();
  });

  it('renders an internal link with Next link semantics', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        linkLabel: 'Shop all',
        linkHref: '/products',
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    expect(await screen.findByRole('link', { name: 'Shop all' })).toHaveAttribute('href', '/products');
  });

  it('renders an external link safely', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        linkLabel: 'Follow us',
        linkHref: 'https://example.com/popbox',
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
