'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { StoreBannerRow } from '@/components/layout/store-banner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import type { IStoreBannerSettings, IUpdateStoreBannerSettingsPayload } from '@/interfaces/settings';
import { cn } from '@/lib/utils';
import { getFriendlyErrorMessage } from '@/utils/api-errors';

const STORE_BANNER_SETTINGS_QUERY_KEY = ['admin', 'settings', 'store-banner'] as const;
const MESSAGE_MAX_LENGTH = 160;
const LINK_LABEL_MAX_LENGTH = 40;
const LINK_HREF_MAX_LENGTH = 300;

type StoreBannerFormState = {
  enabled: boolean;
  message: string;
  linkLabel: string;
  linkHref: string;
};

type StoreBannerFormErrors = Partial<Record<keyof StoreBannerFormState | 'form', string>>;

function settingsToForm(settings: IStoreBannerSettings): StoreBannerFormState {
  return {
    enabled: settings.enabled,
    message: settings.message,
    linkLabel: settings.linkLabel ?? '',
    linkHref: settings.linkHref ?? '',
  };
}

function validateForm(form: StoreBannerFormState): StoreBannerFormErrors {
  const errors: StoreBannerFormErrors = {};
  const message = form.message.trim();
  const linkLabel = form.linkLabel.trim();
  const linkHref = form.linkHref.trim();

  if (form.enabled && !message) {
    errors.message = 'Message is required when the banner is enabled.';
  } else if (message.length > MESSAGE_MAX_LENGTH) {
    errors.message = `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
  }

  if (linkLabel.length > LINK_LABEL_MAX_LENGTH) {
    errors.linkLabel = `Link label must be ${LINK_LABEL_MAX_LENGTH} characters or fewer.`;
  }

  if (linkHref.length > LINK_HREF_MAX_LENGTH) {
    errors.linkHref = `Link href must be ${LINK_HREF_MAX_LENGTH} characters or fewer.`;
  } else if (linkHref && !linkHref.startsWith('/') && !linkHref.startsWith('https://')) {
    errors.linkHref = 'Link href must start with / or https://.';
  }

  if (linkLabel && !linkHref) {
    errors.linkHref = 'Link href is required when a link label is provided.';
  }

  return errors;
}

function hasErrors(errors: StoreBannerFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function buildPayload(form: StoreBannerFormState): IUpdateStoreBannerSettingsPayload {
  const linkLabel = form.linkLabel.trim();
  const linkHref = form.linkHref.trim();

  return {
    enabled: form.enabled,
    message: form.message.trim(),
    linkLabel: linkLabel || null,
    linkHref: linkHref || null,
  };
}

function buildPreviewSettings(form: StoreBannerFormState): IStoreBannerSettings {
  const payload = buildPayload(form);

  return {
    enabled: payload.enabled,
    message: payload.message,
    linkLabel: payload.linkLabel ?? null,
    linkHref: payload.linkHref ?? null,
  };
}

export function AdminStoreBannerSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoreBannerFormState>({
    enabled: false,
    message: '',
    linkLabel: '',
    linkHref: '',
  });
  const [errors, setErrors] = useState<StoreBannerFormErrors>({});
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(null);

  const syncSettings = useCallback((settings: IStoreBannerSettings) => {
    setForm(settingsToForm(settings));
    setErrors({});
    setRequestErrorMessage(null);
  }, []);

  const handleQuerySuccess = useCallback((response: { data: { data: IStoreBannerSettings } }) => {
    syncSettings(response.data.data);
  }, [syncSettings]);

  const {
    error: queryError,
    isError,
    isPending,
  } = useCustomizeQuery<IStoreBannerSettings>({
    queryKey: STORE_BANNER_SETTINGS_QUERY_KEY,
    queryFn: QueryConfigs.fetchAdminStoreBannerSettings,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    onSuccess: handleQuerySuccess,
  });

  const { mutation: updateSettings, isPending: isSaving } = useCustomizeMutation<
    IStoreBannerSettings,
    IUpdateStoreBannerSettingsPayload
  >({
    mutationFn: MutationConfigs.updateAdminStoreBannerSettings,
    onSuccess: (response) => {
      syncSettings(response.data.data);
      toast.success('Store banner settings saved.');
      void queryClient.invalidateQueries({ queryKey: STORE_BANNER_SETTINGS_QUERY_KEY });
    },
    onError: (error) => {
      setRequestErrorMessage(getFriendlyErrorMessage(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestErrorMessage(null);

    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      return;
    }

    updateSettings(buildPayload(form));
  };

  const previewSettings = buildPreviewSettings(form);
  const visibleErrors = Object.values(errors).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f7f63]">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Store Banner</h1>
        <p className="max-w-2xl text-sm text-[#6b7280]">
          Manage the announcement row shown above storefront navigation.
        </p>
      </div>

      {isPending ? (
        <StoreBannerSettingsSkeleton />
      ) : isError ? (
        <SettingsErrorAlert message={getFriendlyErrorMessage(queryError, 'Unable to load store banner settings. Please refresh and try again.')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form
            className="rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"
            onSubmit={handleSubmit}
          >
            {requestErrorMessage || visibleErrors.length > 0 ? (
              <SettingsErrorAlert
                className="mb-5"
                message={requestErrorMessage ?? visibleErrors[0] ?? 'Unable to save changes. Please try again.'}
              />
            ) : null}

            <div className="space-y-5">
              <div>
                <Label htmlFor="store-banner-enabled" className="text-sm font-medium text-[#111827]">
                  Enabled
                </Label>
                <button
                  id="store-banner-enabled"
                  type="button"
                  role="switch"
                  aria-checked={form.enabled}
                  className={cn(
                    'mt-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                    form.enabled
                      ? 'border-[#f4c57d] bg-[#fff7ea] text-[#111827]'
                      : 'border-[#dfd5c5] bg-white text-[#6b7280]',
                  )}
                  onClick={() => setForm((current) => ({ ...current, enabled: !current.enabled }))}
                >
                  <span className="text-sm font-medium">
                    {form.enabled ? 'Banner is visible on the storefront' : 'Banner is hidden from the storefront'}
                  </span>
                  <span
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      form.enabled ? 'bg-[#111827]' : 'bg-[#d1d5db]',
                    )}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                        form.enabled ? 'translate-x-6' : 'translate-x-1',
                      )}
                    />
                  </span>
                </button>
              </div>

              <div>
                <Label htmlFor="store-banner-message" className="text-sm font-medium text-[#111827]">
                  Message
                </Label>
                <Textarea
                  id="store-banner-message"
                  rows={4}
                  maxLength={MESSAGE_MAX_LENGTH + 20}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  aria-invalid={!!errors.message}
                  className={cn(
                    'mt-2 rounded-xl border-[#dfd5c5] bg-white text-[#111827]',
                    errors.message && 'border-red-300 focus-visible:ring-red-200',
                  )}
                  placeholder="Free shipping across Canada on orders $149+ CAD"
                />
                <FieldHelp error={errors.message} text={`${form.message.trim().length}/${MESSAGE_MAX_LENGTH} characters`} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="store-banner-link-label" className="text-sm font-medium text-[#111827]">
                    Link label
                  </Label>
                  <Input
                    id="store-banner-link-label"
                    value={form.linkLabel}
                    onChange={(event) => setForm((current) => ({ ...current, linkLabel: event.target.value }))}
                    aria-invalid={!!errors.linkLabel}
                    className={cn(
                      'mt-2 h-11 rounded-xl border-[#dfd5c5] bg-white text-[#111827]',
                      errors.linkLabel && 'border-red-300 focus-visible:ring-red-200',
                    )}
                    placeholder="Shop now"
                  />
                  <FieldHelp error={errors.linkLabel} text="Optional" />
                </div>

                <div>
                  <Label htmlFor="store-banner-link-href" className="text-sm font-medium text-[#111827]">
                    Link href
                  </Label>
                  <Input
                    id="store-banner-link-href"
                    value={form.linkHref}
                    onChange={(event) => setForm((current) => ({ ...current, linkHref: event.target.value }))}
                    aria-invalid={!!errors.linkHref}
                    className={cn(
                      'mt-2 h-11 rounded-xl border-[#dfd5c5] bg-white text-[#111827]',
                      errors.linkHref && 'border-red-300 focus-visible:ring-red-200',
                    )}
                    placeholder="/products"
                  />
                  <FieldHelp error={errors.linkHref} text="Use an internal path or https:// URL" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-[#e4dccf] pt-5">
              <Button
                type="submit"
                disabled={isSaving}
                className="h-11 w-full rounded-xl bg-[#111827] px-5 text-sm font-semibold text-white hover:bg-[#1f2937] disabled:opacity-60 sm:w-auto"
              >
                {isSaving ? 'Saving...' : 'Save store banner'}
              </Button>
            </div>
          </form>

          <StoreBannerPreview settings={previewSettings} />
        </div>
      )}
    </div>
  );
}

function FieldHelp(props: { error?: string; text: string }) {
  if (props.error) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {props.error}
      </p>
    );
  }

  return <p className="mt-2 text-xs text-[#6b7280]">{props.text}</p>;
}

function SettingsErrorAlert(props: { className?: string; message: string }) {
  return (
    <Alert variant="destructive" className={props.className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{props.message}</AlertDescription>
    </Alert>
  );
}

function StoreBannerPreview(props: { settings: IStoreBannerSettings }) {
  const canPreview = props.settings.enabled && props.settings.message;

  return (
    <aside className="rounded-2xl border border-[#dfd5c5] bg-[#fff9ef] p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#111827]">Preview</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfd5c5] bg-white">
        {canPreview ? (
          <StoreBannerRow banner={props.settings} className="border-b-0" />
        ) : (
          <div className="px-4 py-6 text-sm leading-6 text-[#6b7280]">
            Enable the banner and add a message to preview the storefront row.
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#6b7280]">
        Preview reflects the current form values before saving.
      </p>
    </aside>
  );
}

function StoreBannerSettingsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] p-6">
        <div className="space-y-5">
          <Skeleton className="h-20 rounded-xl bg-[#eee5d8]" />
          <Skeleton className="h-28 rounded-xl bg-[#eee5d8]" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-xl bg-[#eee5d8]" />
            <Skeleton className="h-20 rounded-xl bg-[#eee5d8]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-44 rounded-2xl bg-[#eee5d8]" />
    </div>
  );
}
