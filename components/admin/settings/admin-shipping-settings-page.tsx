'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatPrice } from '@/lib/utils';
import { getApiErrorDetails } from '@/utils/api-errors';
import type { IShippingSettings, IUpdateShippingSettingsPayload } from '@/interfaces/shipping';

const SHIPPING_SETTINGS_QUERY_KEY = ['admin', 'settings', 'shipping'] as const;
const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

type ShippingFormState = {
  flatShipping: string;
  freeShippingThreshold: string;
  currency: IShippingSettings['currency'];
};

type ShippingFormErrors = Partial<Record<keyof ShippingFormState, string>>;

export function centsToDollarInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function dollarsToCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function isValidMoney(value: string): boolean {
  return MONEY_PATTERN.test(value.trim()) && Number(value) >= 0;
}

function settingsToForm(settings: IShippingSettings): ShippingFormState {
  return {
    flatShipping: centsToDollarInput(settings.flatShippingCents),
    freeShippingThreshold: centsToDollarInput(settings.freeShippingThresholdCents),
    currency: settings.currency,
  };
}

function validateForm(form: ShippingFormState): ShippingFormErrors {
  const errors: ShippingFormErrors = {};

  if (!isValidMoney(form.flatShipping)) {
    errors.flatShipping = 'Enter a valid amount with up to 2 decimal places.';
  }

  if (!isValidMoney(form.freeShippingThreshold)) {
    errors.freeShippingThreshold = 'Enter a valid amount with up to 2 decimal places.';
  }

  if (form.currency !== 'CAD') {
    errors.currency = 'Currency must stay CAD.';
  }

  return errors;
}

function hasErrors(errors: ShippingFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function buildPayload(form: ShippingFormState): IUpdateShippingSettingsPayload {
  return {
    flatShippingCents: dollarsToCents(form.flatShipping),
    freeShippingThresholdCents: dollarsToCents(form.freeShippingThreshold),
    currency: 'CAD',
  };
}

export function AdminShippingSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ShippingFormState>({
    flatShipping: '',
    freeShippingThreshold: '',
    currency: 'CAD',
  });
  const [errors, setErrors] = useState<ShippingFormErrors>({});
  const [currentPolicy, setCurrentPolicy] = useState<IShippingSettings | null>(null);

  const syncSettings = useCallback((nextSettings: IShippingSettings) => {
    setForm(settingsToForm(nextSettings));
    setCurrentPolicy(nextSettings);
    setErrors({});
  }, []);

  const handleQuerySuccess = useCallback((response: { data: { data: IShippingSettings } }) => {
    syncSettings(response.data.data);
  }, [syncSettings]);

  const {
    isError,
    isPending,
  } = useCustomizeQuery<IShippingSettings>({
    queryKey: SHIPPING_SETTINGS_QUERY_KEY,
    queryFn: QueryConfigs.fetchAdminShippingSettings,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    onSuccess: handleQuerySuccess,
  });

  const { mutation: updateSettings, isPending: isSaving } = useCustomizeMutation<
    IShippingSettings,
    IUpdateShippingSettingsPayload
  >({
    mutationFn: MutationConfigs.updateAdminShippingSettings,
    onSuccess: (response) => {
      const savedSettings = response.data.data;

      syncSettings(savedSettings);
      toast.success('Shipping settings saved.');
      void queryClient.invalidateQueries({ queryKey: SHIPPING_SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(getApiErrorDetails(error).message || 'Failed to save shipping settings.');
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    updateSettings(buildPayload(form));
  };

  const activePolicy = currentPolicy ?? (
    !hasErrors(validateForm(form)) && form.flatShipping && form.freeShippingThreshold
      ? buildPayload(form)
      : null
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f7f63]">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Shipping Settings</h1>
        <p className="max-w-2xl text-sm text-[#6b7280]">
          Manage the checkout shipping policy used by backend order and payment flows.
        </p>
      </div>

      {isPending ? (
        <ShippingSettingsSkeleton />
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Failed to load shipping settings. Please refresh and try again.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            className="rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <MoneyField
                error={errors.flatShipping}
                label="Flat shipping rate"
                onChange={(value) => setForm((previous) => ({ ...previous, flatShipping: value }))}
                value={form.flatShipping}
              />
              <MoneyField
                error={errors.freeShippingThreshold}
                label="Free shipping threshold"
                onChange={(value) => setForm((previous) => ({ ...previous, freeShippingThreshold: value }))}
                value={form.freeShippingThreshold}
              />
            </div>

            <div className="mt-5 max-w-xs">
              <Label htmlFor="shipping-currency" className="text-sm font-medium text-[#111827]">
                Currency
              </Label>
              <Input
                id="shipping-currency"
                readOnly
                value={form.currency}
                className="mt-2 h-11 rounded-xl border-[#dfd5c5] bg-[#f3eee6] text-[#6b7280]"
              />
              {errors.currency ? (
                <p className="mt-2 text-sm text-red-700">{errors.currency}</p>
              ) : null}
            </div>

            <div className="mt-6 space-y-2 rounded-xl border border-[#e4dccf] bg-white p-4 text-sm text-[#6b7280]">
              <p>Orders at or above the threshold qualify for free shipping before tax.</p>
              <p>Existing orders are not recalculated.</p>
            </div>

            <div className="mt-6 flex justify-end border-t border-[#e4dccf] pt-5">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 w-full rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 sm:w-auto"
              >
                {isSaving ? 'Saving...' : 'Save shipping settings'}
              </Button>
            </div>
          </form>

          <CurrentPolicyCard settings={activePolicy} />
        </div>
      )}
    </div>
  );
}

function MoneyField({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const inputId = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <Label htmlFor={inputId} className="text-sm font-medium text-[#111827]">
        {label}
      </Label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">
          $
        </span>
        <Input
          id={inputId}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'h-11 rounded-xl border-[#dfd5c5] bg-white pl-7 text-[#111827]',
            error && 'border-red-300 focus-visible:ring-red-200',
          )}
          placeholder="0.00"
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-2 flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CurrentPolicyCard({
  settings,
}: {
  settings: IShippingSettings | IUpdateShippingSettingsPayload | null;
}) {
  return (
    <aside className="rounded-2xl border border-[#dfd5c5] bg-[#fff9ef] p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
        <CheckCircle2 className="h-4 w-4 text-[#11844d]" />
        Current policy
      </div>
      {settings ? (
        <div className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
          <p>
            Free shipping on orders{' '}
            <span className="font-semibold text-[#111827]">
              {formatPrice(settings.freeShippingThresholdCents, settings.currency)} CAD
            </span>{' '}
            or more.
          </p>
          <p>
            Otherwise flat shipping is{' '}
            <span className="font-semibold text-[#111827]">
              {formatPrice(settings.flatShippingCents, settings.currency)} CAD
            </span>{' '}
            across Canada.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#6b7280]">Save valid shipping settings to preview the policy.</p>
      )}
    </aside>
  );
}

function ShippingSettingsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-[#eee5d8]" />
          <div className="h-20 animate-pulse rounded-xl bg-[#eee5d8]" />
        </div>
        <div className="mt-5 h-20 max-w-xs animate-pulse rounded-xl bg-[#eee5d8]" />
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-[#eee5d8]" />
    </div>
  );
}
