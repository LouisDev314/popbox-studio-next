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
    calgaryFreeShippingThresholdCents: 7700,
    albertaFreeShippingThresholdCents: 8800,
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
  calgaryThreshold,
  albertaThreshold,
  canadaThreshold,
}: {
  flatShipping: string;
  calgaryThreshold: string;
  albertaThreshold: string;
  canadaThreshold: string;
}) {
  const currentPolicy = within(getCurrentPolicyCard());

  expect(currentPolicy.getByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && element.textContent?.replace(/\s+/g, ' ').trim() === `Calgary free shipping ${calgaryThreshold} CAD or more.`
  ))).toBeInTheDocument();
  expect(currentPolicy.getByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && element.textContent?.replace(/\s+/g, ' ').trim() === `Alberta free shipping ${albertaThreshold} CAD or more.`
  ))).toBeInTheDocument();
  expect(currentPolicy.getByText((_, element) => (
    element?.tagName.toLowerCase() === 'p'
    && element.textContent?.replace(/\s+/g, ' ').trim() === `Canada free shipping ${canadaThreshold} CAD or more.`
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
    expect(screen.getByLabelText('Calgary free shipping threshold')).toHaveValue('77.00');
    expect(screen.getByLabelText('Alberta free shipping threshold')).toHaveValue('88.00');
    expect(screen.getByLabelText('Canada free shipping threshold')).toHaveValue('149.00');
    expect(screen.getByLabelText('Currency')).toHaveValue('CAD');
    expectPolicySummary({
      flatShipping: '$15.99',
      calgaryThreshold: '$77.00',
      albertaThreshold: '$88.00',
      canadaThreshold: '$149.00',
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
    const calgaryInput = screen.getByLabelText('Calgary free shipping threshold');
    const albertaInput = screen.getByLabelText('Alberta free shipping threshold');
    const canadaInput = screen.getByLabelText('Canada free shipping threshold');

    await userEvent.clear(flatShippingInput);
    await userEvent.type(flatShippingInput, '15.99');
    await userEvent.clear(calgaryInput);
    await userEvent.type(calgaryInput, '77.00');
    await userEvent.clear(albertaInput);
    await userEvent.type(albertaInput, '88.00');
    await userEvent.clear(canadaInput);
    await userEvent.type(canadaInput, '149.00');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminShippingSettings).toHaveBeenCalledWith(
        {
          flatShippingCents: 1599,
          calgaryFreeShippingThresholdCents: 7700,
          albertaFreeShippingThresholdCents: 8800,
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
        calgaryFreeShippingThresholdCents: 8000,
        albertaFreeShippingThresholdCents: 9000,
        freeShippingThresholdCents: 10000,
      })));
    vi.mocked(MutationConfigs.updateAdminShippingSettings).mockResolvedValueOnce(
      createApiResponse(createShippingSettings({
        flatShippingCents: 1200,
        calgaryFreeShippingThresholdCents: 8000,
        albertaFreeShippingThresholdCents: 9000,
        freeShippingThresholdCents: 10000,
      })),
    );

    renderWithProviders(<AdminShippingSettingsPage />);

    const flatShippingInput = await screen.findByLabelText('Flat shipping rate');
    const calgaryInput = screen.getByLabelText('Calgary free shipping threshold');
    const albertaInput = screen.getByLabelText('Alberta free shipping threshold');
    const canadaInput = screen.getByLabelText('Canada free shipping threshold');

    await userEvent.clear(flatShippingInput);
    await userEvent.type(flatShippingInput, '12.00');
    await userEvent.clear(calgaryInput);
    await userEvent.type(calgaryInput, '80.00');
    await userEvent.clear(albertaInput);
    await userEvent.type(albertaInput, '90.00');
    await userEvent.clear(canadaInput);
    await userEvent.type(canadaInput, '100.00');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    await waitFor(() => {
      expectPolicySummary({
        flatShipping: '$12.00',
        calgaryThreshold: '$80.00',
        albertaThreshold: '$90.00',
        canadaThreshold: '$100.00',
      });
    });
  });

  it('blocks thresholds that are not ordered Calgary, Alberta, Canada', async () => {
    renderWithProviders(<AdminShippingSettingsPage />);

    const calgaryInput = await screen.findByLabelText('Calgary free shipping threshold');
    const albertaInput = screen.getByLabelText('Alberta free shipping threshold');

    await userEvent.clear(calgaryInput);
    await userEvent.type(calgaryInput, '90.00');
    await userEvent.clear(albertaInput);
    await userEvent.type(albertaInput, '80.00');
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    expect(await screen.findByText('Calgary threshold must be less than or equal to Alberta.')).toBeInTheDocument();
    expect(MutationConfigs.updateAdminShippingSettings).not.toHaveBeenCalled();
  });

  it('accepts equal regional thresholds', async () => {
    renderWithProviders(<AdminShippingSettingsPage />);

    const calgaryInput = await screen.findByLabelText('Calgary free shipping threshold');
    const albertaInput = screen.getByLabelText('Alberta free shipping threshold');
    const canadaInput = screen.getByLabelText('Canada free shipping threshold');

    for (const input of [calgaryInput, albertaInput, canadaInput]) {
      await userEvent.clear(input);
      await userEvent.type(input, '100.00');
    }
    await userEvent.click(screen.getByRole('button', { name: /Save shipping settings/i }));

    await waitFor(() => {
      expect(MutationConfigs.updateAdminShippingSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          calgaryFreeShippingThresholdCents: 10000,
          albertaFreeShippingThresholdCents: 10000,
          freeShippingThresholdCents: 10000,
        }),
        expect.anything(),
      );
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
