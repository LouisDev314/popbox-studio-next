import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import { AdminShippingSettingsPage } from '@/components/admin/settings/admin-shipping-settings-page';
import type { IShippingSettings } from '@/interfaces/shipping';
import { renderWithProviders } from '../test-utils';

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function createShippingSettings(overrides: Partial<IShippingSettings> = {}): IShippingSettings {
  return {
    flatShippingCents: 1599,
    freeShippingThresholdCents: 14900,
    currency: 'CAD',
    ...overrides,
  };
}

function createApiResponse(data: IShippingSettings) {
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
    config: { headers: new AxiosHeaders() },
  });
}

function getCurrentPolicyCard() {
  return screen.getByText('Current policy').closest('aside') as HTMLElement;
}

function expectPolicySummary({
  flatShipping,
  freeShippingThreshold,
}: {
  flatShipping: string;
  freeShippingThreshold: string;
}) {
  const currentPolicy = within(getCurrentPolicyCard());

  expect(currentPolicy.getByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && element.textContent?.replace(/\s+/g, ' ').trim() === `Free shipping ${freeShippingThreshold} CAD or more.`
  ))).toBeInTheDocument();
  expect(currentPolicy.getByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && element.textContent?.replace(/\s+/g, ' ').trim() === `Flat shipping ${flatShipping} CAD across Canada.`
  ))).toBeInTheDocument();
}

describe('AdminShippingSettingsPage', () => {
  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
    vi.spyOn(QueryConfigs, 'fetchAdminShippingSettings').mockResolvedValue(
      createApiResponse(createShippingSettings()),
    );
    vi.spyOn(MutationConfigs, 'updateAdminShippingSettings').mockResolvedValue(
      createApiResponse(createShippingSettings()),
    );
  });

  it('populates the form and policy summary from fetched settings', async () => {
    renderWithProviders(<AdminShippingSettingsPage />);

    expect(await screen.findByLabelText('Flat shipping rate')).toHaveValue('15.99');
    expect(screen.getByLabelText('Free shipping threshold')).toHaveValue('149.00');
    expect(screen.getByLabelText('Currency')).toHaveValue('CAD');
    expectPolicySummary({
      flatShipping: '$15.99',
      freeShippingThreshold: '$149.00',
    });
  });

  it('submits dollar inputs as cents and shows a success toast', async () => {
    const savedSettings = createShippingSettings({
      flatShippingCents: 1599,
      freeShippingThresholdCents: 14900,
    });

    vi.mocked(MutationConfigs.updateAdminShippingSettings).mockResolvedValueOnce(
      createApiResponse(savedSettings),
    );

    renderWithProviders(<AdminShippingSettingsPage />);

    const flatShippingInput = await screen.findByLabelText('Flat shipping rate');
    const thresholdInput = screen.getByLabelText('Free shipping threshold');

    await userEvent.clear(flatShippingInput);
    await userEvent.type(flatShippingInput, '15.99');
    await userEvent.clear(thresholdInput);
    await userEvent.type(thresholdInput, '149.00');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminShippingSettings).toHaveBeenCalledWith(
        {
          flatShippingCents: 1599,
          freeShippingThresholdCents: 14900,
          currency: 'CAD',
        },
        expect.anything(),
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith('Shipping settings saved.');
  });

  it('blocks invalid money inputs before mutation', async () => {
    renderWithProviders(<AdminShippingSettingsPage />);

    const flatShippingInput = await screen.findByLabelText('Flat shipping rate');

    await userEvent.clear(flatShippingInput);
    await userEvent.type(flatShippingInput, '15.999');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    expect(await screen.findByText('Enter a valid amount with up to 2 decimal places.')).toBeInTheDocument();
    expect(MutationConfigs.updateAdminShippingSettings).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps the policy summary synced with saved backend values', async () => {
    vi.mocked(QueryConfigs.fetchAdminShippingSettings)
      .mockResolvedValueOnce(createApiResponse(createShippingSettings()))
      .mockResolvedValue(createApiResponse(createShippingSettings({
        flatShippingCents: 1200,
        freeShippingThresholdCents: 10000,
      })));
    vi.mocked(MutationConfigs.updateAdminShippingSettings).mockResolvedValueOnce(
      createApiResponse(createShippingSettings({
        flatShippingCents: 1200,
        freeShippingThresholdCents: 10000,
      })),
    );

    renderWithProviders(<AdminShippingSettingsPage />);

    const flatShippingInput = await screen.findByLabelText('Flat shipping rate');
    const thresholdInput = screen.getByLabelText('Free shipping threshold');

    await userEvent.clear(flatShippingInput);
    await userEvent.type(flatShippingInput, '12.00');
    await userEvent.clear(thresholdInput);
    await userEvent.type(thresholdInput, '100.00');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    await waitFor(() => {
      expectPolicySummary({
        flatShipping: '$12.00',
        freeShippingThreshold: '$100.00',
      });
    });
  });

  it('renders a destructive alert on save request error', async () => {
    vi.mocked(MutationConfigs.updateAdminShippingSettings).mockRejectedValueOnce(createApiError());

    renderWithProviders(<AdminShippingSettingsPage />);

    await userEvent.click(await screen.findByRole('button', { name: /Save shipping settings/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });
});
