import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { AdminStoreBannerSettingsPage } from '@/components/admin/settings/admin-store-banner-settings-page';
import type { IStoreBannerSettings } from '@/interfaces/settings';
import { renderWithProviders } from '../test-utils';

const toastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
  },
}));

function createStoreBannerSettings(overrides: Partial<IStoreBannerSettings> = {}): IStoreBannerSettings {
  return {
    enabled: true,
    message: 'Free shipping across Canada this weekend.',
    linkLabel: 'Shop now',
    linkHref: '/products',
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

function createApiError(message = 'Request failed with status code 500') {
  return new AxiosError(message, undefined, undefined, undefined, {
    data: {
      status: 'error',
      code: 500,
      success: false,
      message,
      data: null,
    },
    status: 500,
    statusText: 'Server Error',
    headers: {},
    config: {},
  });
}

describe('AdminStoreBannerSettingsPage', () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    vi.spyOn(QueryConfigs, 'fetchAdminStoreBannerSettings').mockResolvedValue(
      createApiResponse(createStoreBannerSettings()),
    );
    vi.spyOn(MutationConfigs, 'updateAdminStoreBannerSettings').mockResolvedValue(
      createApiResponse(createStoreBannerSettings()),
    );
  });

  it('populates the form from fetched settings', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    expect(await screen.findByLabelText('Message')).toHaveValue('Free shipping across Canada this weekend.');
    expect(screen.getByLabelText('Link label')).toHaveValue('Shop now');
    expect(screen.getByLabelText('Link href')).toHaveValue('/products');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the disabled state from fetched settings', async () => {
    vi.mocked(QueryConfigs.fetchAdminStoreBannerSettings).mockResolvedValueOnce(
      createApiResponse(createStoreBannerSettings({ enabled: false })),
    );

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    expect(await screen.findByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/Enable the banner and add a message/i)).toBeInTheDocument();
  });

  it('submits a normalized payload for a valid save', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const messageInput = await screen.findByLabelText('Message');
    const linkLabelInput = screen.getByLabelText('Link label');
    const linkHrefInput = screen.getByLabelText('Link href');

    await userEvent.clear(messageInput);
    await userEvent.type(messageInput, '  New arrivals are live.  ');
    await userEvent.clear(linkLabelInput);
    await userEvent.type(linkLabelInput, '  View drops  ');
    await userEvent.clear(linkHrefInput);
    await userEvent.type(linkHrefInput, '  /products?sort=newest  ');
    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminStoreBannerSettings).toHaveBeenCalledWith({
        enabled: true,
        message: 'New arrivals are live.',
        linkLabel: 'View drops',
        linkHref: '/products?sort=newest',
      }, expect.anything());
    });
    expect(toastSuccess).toHaveBeenCalledWith('Store banner settings saved.');
  });

  it('submits null for empty optional link fields', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    await userEvent.clear(await screen.findByLabelText('Link label'));
    await userEvent.clear(screen.getByLabelText('Link href'));
    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminStoreBannerSettings).toHaveBeenCalledWith({
        enabled: true,
        message: 'Free shipping across Canada this weekend.',
        linkLabel: null,
        linkHref: null,
      }, expect.anything());
    });
  });

  it('blocks a link label without href', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const linkHrefInput = await screen.findByLabelText('Link href');

    await userEvent.clear(linkHrefInput);
    await waitFor(() => {
      expect(linkHrefInput).toHaveValue('');
    });
    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    expect(await screen.findAllByText('Link href is required when a link label is provided.')).not.toHaveLength(0);
    expect(MutationConfigs.updateAdminStoreBannerSettings).not.toHaveBeenCalled();
  });

  it('blocks invalid link hrefs', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const linkHrefInput = await screen.findByLabelText('Link href');
    await userEvent.clear(linkHrefInput);
    await userEvent.type(linkHrefInput, 'http://example.com');
    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    expect(await screen.findAllByText('Link href must start with / or https://.')).not.toHaveLength(0);
    expect(MutationConfigs.updateAdminStoreBannerSettings).not.toHaveBeenCalled();
  });

  it('renders a destructive alert on request error', async () => {
    vi.mocked(MutationConfigs.updateAdminStoreBannerSettings).mockRejectedValueOnce(createApiError());

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Save store banner/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save changes. Please try again.');
  });

  it('updates the preview from current form values', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const messageInput = await screen.findByLabelText('Message');
    await userEvent.clear(messageInput);
    await userEvent.type(messageInput, 'Preview this message.');

    expect(screen.getByLabelText('Store announcement')).toHaveTextContent('Preview this message.');
  });
});
