import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useEmblaCarousel from 'embla-carousel-react';
import QueryConfigs from '@/configs/api/query-config';
import { StorefrontBanner } from '@/components/layout/store-banner';
import type { IStoreBannerItem, IStoreBannerSettings } from '@/interfaces/settings';
import { renderWithProviders } from '../test-utils';

const emblaRef = vi.fn();
const emblaApi = {
  scrollNext: vi.fn(),
  scrollPrev: vi.fn(),
};

vi.mock('embla-carousel-react', () => ({
  default: vi.fn(() => [emblaRef, emblaApi]),
}));

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
    config: { headers: new AxiosHeaders() },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('StorefrontBanner', () => {
  beforeEach(() => {
    emblaRef.mockClear();
    emblaApi.scrollNext.mockClear();
    emblaApi.scrollPrev.mockClear();
    vi.mocked(useEmblaCarousel).mockClear();
  });

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
    expect(useEmblaCarousel).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Next announcement/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Previous announcement/i })).not.toBeInTheDocument();
  });

  it('renders multiple active items as Embla slides with prev and next controls', async () => {
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
    expect(screen.getByText('Second announcement.')).toBeInTheDocument();
    expect(useEmblaCarousel).toHaveBeenCalledWith({
      align: 'start',
      loop: true,
      slidesToScroll: 1,
    });
    expect(screen.getByRole('button', { name: /Previous announcement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next announcement/i })).toBeInTheDocument();
  });

  it('clicking next and previous scrolls Embla', async () => {
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
    await userEvent.click(screen.getByRole('button', { name: /Previous announcement/i }));
    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(1);
    expect(emblaApi.scrollPrev).toHaveBeenCalledTimes(1);
  });

  it('auto-rotates every 5 seconds', async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(window, 'setInterval').mockImplementation((callback: TimerHandler, timeout?: number) => {
      if (timeout === 5000 && typeof callback === 'function') {
        intervalCallbacks.push(() => callback());
      }

      return intervalCallbacks.length as unknown as ReturnType<typeof window.setInterval>;
    });
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
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
    expect(intervalCallbacks).toHaveLength(1);
    expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);

    act(() => {
      intervalCallbacks[0]?.();
    });

    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('resets auto-rotation after manual navigation', async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(window, 'setInterval').mockImplementation((callback: TimerHandler, timeout?: number) => {
      if (timeout === 5000 && typeof callback === 'function') {
        intervalCallbacks.push(() => callback());
      }

      return intervalCallbacks.length as unknown as ReturnType<typeof window.setInterval>;
    });
    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
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
    expect(intervalCallbacks).toHaveLength(1);
    emblaApi.scrollNext.mockClear();
    vi.mocked(window.clearInterval).mockClear();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Next announcement/i }));
    });

    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    expect(intervalCallbacks).toHaveLength(2);

    act(() => {
      intervalCallbacks[1]?.();
    });

    expect(emblaApi.scrollNext).toHaveBeenCalledTimes(2);
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
            message: 'Shop all releases.',
            linkLabel: 'Do not render this label',
            linkHref: '/products',
          }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    const banner = await screen.findByLabelText('Store announcement');
    expect(within(banner).getByRole('link', { name: 'Shop all releases.' })).toHaveAttribute('href', '/products');
    expect(within(banner).queryByText('Do not render this label')).not.toBeInTheDocument();
  });

  it('renders an external link safely', async () => {
    vi.spyOn(QueryConfigs, 'fetchPublicStoreBanner').mockResolvedValue(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            message: 'Follow PopBox Studio.',
            linkLabel: 'Do not render this label',
            linkHref: 'https://example.com/popbox',
          }),
        ],
      })),
    );

    renderWithProviders(<StorefrontBanner />);

    const link = await screen.findByRole('link', { name: 'Follow PopBox Studio.' });
    expect(link).toHaveAttribute('href', 'https://example.com/popbox');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(screen.queryByText('Do not render this label')).not.toBeInTheDocument();
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
