import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { AdminStoreBannerSettingsPage } from '@/components/admin/settings/admin-store-banner-settings-page';
import type { IStoreBannerItem, IStoreBannerSettings } from '@/interfaces/settings';
import { renderWithProviders } from '../test-utils';

const toastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
  },
}));

function createStoreBannerItem(overrides: Partial<IStoreBannerItem> = {}): IStoreBannerItem {
  return {
    id: 'banner-item-1',
    message: 'Free shipping across Canada this weekend.',
    linkLabel: 'Shop now',
    linkHref: '/products',
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

  it('populates the form from fetched multiple-item settings', async () => {
    vi.mocked(QueryConfigs.fetchAdminStoreBannerSettings).mockResolvedValueOnce(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            id: 'banner-item-2',
            message: 'Second in backend, first visually.',
            linkLabel: 'Second link',
            linkHref: '/second',
            sortOrder: 1,
          }),
          createStoreBannerItem({
            id: 'banner-item-1',
            message: 'First visually.',
            linkLabel: 'First link',
            linkHref: '/first',
            sortOrder: 0,
          }),
        ],
      })),
    );

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const messages = await screen.findAllByLabelText('Message');
    expect(messages).toHaveLength(2);
    expect(messages[0]).toHaveValue('First visually.');
    expect(messages[1]).toHaveValue('Second in backend, first visually.');
    expect(screen.getAllByLabelText('Link label')[0]).toHaveValue('First link');
    expect(screen.getAllByLabelText('Link href')[0]).toHaveValue('/first');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('adds a new banner item', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    await screen.findByLabelText('Message');
    await userEvent.click(screen.getByRole('button', { name: /Add banner item/i }));

    expect(screen.getAllByLabelText('Message')).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
  });

  it('removes a banner item', async () => {
    renderWithProviders(<AdminStoreBannerSettingsPage />);

    expect(await screen.findByDisplayValue('Free shipping across Canada this weekend.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remove item 1/i }));

    expect(screen.queryByDisplayValue('Free shipping across Canada this weekend.')).not.toBeInTheDocument();
    expect(screen.getByText(/No banner items yet/i)).toBeInTheDocument();
  });

  it('moves items up and down and submits normalized sortOrder', async () => {
    vi.mocked(QueryConfigs.fetchAdminStoreBannerSettings).mockResolvedValueOnce(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            id: 'first-item',
            message: 'First item',
            linkLabel: null,
            linkHref: null,
            sortOrder: 0,
          }),
          createStoreBannerItem({
            id: 'second-item',
            message: 'Second item',
            linkLabel: null,
            linkHref: null,
            sortOrder: 1,
          }),
        ],
      })),
    );

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    expect((await screen.findAllByLabelText('Message'))[0]).toHaveValue('First item');
    await userEvent.click(screen.getByRole('button', { name: /Move item 2 up/i }));

    expect(screen.getAllByLabelText('Message')[0]).toHaveValue('Second item');

    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminStoreBannerSettings).toHaveBeenCalledWith({
        enabled: true,
        items: [
          {
            id: 'second-item',
            message: 'Second item',
            linkLabel: null,
            linkHref: null,
            sortOrder: 0,
            isActive: true,
          },
          {
            id: 'first-item',
            message: 'First item',
            linkLabel: null,
            linkHref: null,
            sortOrder: 1,
            isActive: true,
          },
        ],
      }, expect.anything());
    });
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
        items: [
          {
            id: 'banner-item-1',
            message: 'New arrivals are live.',
            linkLabel: 'View drops',
            linkHref: '/products?sort=newest',
            sortOrder: 0,
            isActive: true,
          },
        ],
      }, expect.anything());
    });
    expect(toastSuccess).toHaveBeenCalledWith('Store banner settings saved.');
  });

  it('enforces the max 5 item limit', async () => {
    vi.mocked(QueryConfigs.fetchAdminStoreBannerSettings).mockResolvedValueOnce(
      createApiResponse(createStoreBannerSettings({
        items: Array.from({ length: 5 }, (_, index) => createStoreBannerItem({
          id: `banner-item-${index}`,
          message: `Banner item ${index + 1}`,
          sortOrder: index,
        })),
      })),
    );

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    expect(await screen.findAllByLabelText('Message')).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Add banner item/i })).toBeDisabled();
    expect(screen.getByText(/Maximum of 5 banner items reached/i)).toBeInTheDocument();
  });

  it('preserves inactive items but keeps them out of the storefront preview', async () => {
    vi.mocked(QueryConfigs.fetchAdminStoreBannerSettings).mockResolvedValueOnce(
      createApiResponse(createStoreBannerSettings({
        items: [
          createStoreBannerItem({
            id: 'inactive-item',
            message: 'Hidden announcement.',
            sortOrder: 0,
            isActive: false,
          }),
          createStoreBannerItem({
            id: 'active-item',
            message: 'Visible announcement.',
            sortOrder: 1,
            isActive: true,
          }),
        ],
      })),
    );

    renderWithProviders(<AdminStoreBannerSettingsPage />);

    const preview = await screen.findByLabelText('Store announcement');
    expect(within(preview).queryByText('Hidden announcement.')).not.toBeInTheDocument();
    expect(within(preview).getByText('Visible announcement.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Save store banner/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminStoreBannerSettings).toHaveBeenCalledWith(expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'inactive-item',
            isActive: false,
          }),
        ]),
      }), expect.anything());
    });
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
});
