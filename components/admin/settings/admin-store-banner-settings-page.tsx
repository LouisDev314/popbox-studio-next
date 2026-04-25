'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MutationConfigs from '@/configs/api/mutation-config';
import QueryConfigs from '@/configs/api/query-config';
import { getActiveStoreBannerItems, StoreBannerRow } from '@/components/layout/store-banner';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
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
const LINK_HREF_MAX_LENGTH = 300;
const MAX_BANNER_ITEMS = 5;

let nextLocalBannerItemId = 0;

type StoreBannerFormItem = {
  clientKey: string;
  id?: string;
  message: string;
  linkHref: string;
  isActive: boolean;
};

type StoreBannerFormState = {
  enabled: boolean;
  items: StoreBannerFormItem[];
};

type StoreBannerItemFormErrors = Partial<Record<'message' | 'linkHref', string>>;

type StoreBannerFormErrors = {
  form?: string;
  items: Record<string, StoreBannerItemFormErrors>;
};

function createClientKey(prefix: string): string {
  nextLocalBannerItemId += 1;
  return `${prefix}-${nextLocalBannerItemId}`;
}

function createEmptyItem(): StoreBannerFormItem {
  return {
    clientKey: createClientKey('new-banner-item'),
    message: '',
    linkHref: '',
    isActive: true,
  };
}

function emptyErrors(): StoreBannerFormErrors {
  return {
    items: {},
  };
}

function settingsToForm(settings: IStoreBannerSettings): StoreBannerFormState {
  return {
    enabled: settings.enabled,
    items: [...settings.items]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => ({
        clientKey: item.id ? `saved-banner-item-${item.id}` : createClientKey('saved-banner-item'),
        id: item.id || undefined,
        message: item.message,
        linkHref: item.linkHref ?? '',
        isActive: item.isActive,
      })),
  };
}

function validateForm(form: StoreBannerFormState): StoreBannerFormErrors {
  const errors = emptyErrors();

  form.items.forEach((item) => {
    const itemErrors: StoreBannerItemFormErrors = {};
    const message = item.message.trim();
    const linkHref = item.linkHref.trim();

    if (!message) {
      itemErrors.message = 'Message is required.';
    } else if (message.length > MESSAGE_MAX_LENGTH) {
      itemErrors.message = `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`;
    }

    if (linkHref.length > LINK_HREF_MAX_LENGTH) {
      itemErrors.linkHref = `Link href must be ${LINK_HREF_MAX_LENGTH} characters or fewer.`;
    } else if (linkHref && !linkHref.startsWith('/') && !linkHref.startsWith('https://')) {
      itemErrors.linkHref = 'Link href must start with / or https://.';
    }

    if (Object.values(itemErrors).some(Boolean)) {
      errors.items[item.clientKey] = itemErrors;
    }
  });

  return errors;
}

function hasErrors(errors: StoreBannerFormErrors): boolean {
  return Boolean(errors.form) || Object.values(errors.items).some((itemErrors) => (
    Object.values(itemErrors).some(Boolean)
  ));
}

function buildPayload(form: StoreBannerFormState): IUpdateStoreBannerSettingsPayload {
  return {
    enabled: form.enabled,
    items: form.items.map((item, index) => {
      const linkHref = item.linkHref.trim();

      return {
        ...(item.id ? { id: item.id } : {}),
        message: item.message.trim(),
        linkLabel: null,
        linkHref: linkHref || null,
        sortOrder: index,
        isActive: item.isActive,
      };
    }),
  };
}

function buildPreviewSettings(form: StoreBannerFormState): IStoreBannerSettings {
  const payload = buildPayload(form);

  return {
    enabled: payload.enabled,
    items: payload.items.map((item, index) => ({
      id: item.id ?? form.items[index]?.clientKey ?? `preview-${index}`,
      message: item.message,
      linkLabel: item.linkLabel ?? null,
      linkHref: item.linkHref ?? null,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    })),
  };
}

function getFirstError(errors: StoreBannerFormErrors): string | null {
  if (errors.form) {
    return errors.form;
  }

  for (const itemErrors of Object.values(errors.items)) {
    const firstError = Object.values(itemErrors).find(Boolean);

    if (firstError) {
      return firstError;
    }
  }

  return null;
}

export function AdminStoreBannerSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoreBannerFormState>({
    enabled: false,
    items: [],
  });
  const [errors, setErrors] = useState<StoreBannerFormErrors>(emptyErrors);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(null);

  const syncSettings = useCallback((settings: IStoreBannerSettings) => {
    setForm(settingsToForm(settings));
    setErrors(emptyErrors());
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

  const updateItem = (clientKey: string, updates: Partial<StoreBannerFormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (
        item.clientKey === clientKey
          ? { ...item, ...updates }
          : item
      )),
    }));
  };

  const moveItem = (clientKey: string, direction: -1 | 1) => {
    setForm((current) => {
      const currentIndex = current.items.findIndex((item) => item.clientKey === clientKey);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.items.length) {
        return current;
      }

      const items = [...current.items];
      const [movedItem] = items.splice(currentIndex, 1);
      items.splice(nextIndex, 0, movedItem);

      return {
        ...current,
        items,
      };
    });
  };

  const removeItem = (clientKey: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.clientKey !== clientKey),
    }));
    setErrors((current) => {
      const nextItemErrors = { ...current.items };
      delete nextItemErrors[clientKey];

      return {
        ...current,
        items: nextItemErrors,
      };
    });
  };

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
  const firstVisibleError = getFirstError(errors);
  const hasReachedItemLimit = form.items.length >= MAX_BANNER_ITEMS;
  const hasActiveItems = getActiveStoreBannerItems(previewSettings).length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#8f7f63]">Settings</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Store Banner</h1>
        <p className="max-w-2xl text-sm text-[#6b7280]">
          Manage up to five announcement rows shown above storefront navigation.
        </p>
      </div>

      {isPending ? (
        <StoreBannerSettingsSkeleton />
      ) : isError ? (
        <ErrorAlert message={getFriendlyErrorMessage(queryError, 'Unable to load store banner settings. Please refresh and try again.')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form
            className="rounded-2xl border border-[#dfd5c5] bg-[#fbfaf7] p-5 shadow-sm sm:p-6"
            onSubmit={handleSubmit}
          >
            {requestErrorMessage || firstVisibleError ? (
              <ErrorAlert
                className="mb-5"
                message={requestErrorMessage ?? firstVisibleError ?? 'Unable to save changes. Please try again.'}
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
                    {form.enabled ? 'Banner is enabled on the storefront' : 'Banner is hidden from the storefront'}
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
                {form.enabled && !hasActiveItems ? (
                  <p className="mt-2 text-xs leading-5 text-[#8a6f43]">
                    No active banner items will be shown.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-[#e4dccf] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">Banner items</p>
                  <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                    Current order controls storefront rotation order.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={hasReachedItemLimit}
                  className="h-10 w-full rounded-xl border-[#d7c9b8] bg-white px-4 text-sm font-semibold text-[#111827] hover:bg-[#fff7ea] sm:w-auto"
                  onClick={() => setForm((current) => ({
                    ...current,
                    items: [...current.items, createEmptyItem()],
                  }))}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add banner item
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d7c9b8] bg-white px-4 py-8 text-sm leading-6 text-[#6b7280]">
                  No banner items yet. Add an item when you want to show a storefront announcement.
                </div>
              ) : (
                <div className="space-y-4">
                  {form.items.map((item, index) => (
                    <BannerItemEditor
                      key={item.clientKey}
                      errors={errors.items[item.clientKey] ?? {}}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === form.items.length - 1}
                      item={item}
                      onMoveDown={() => moveItem(item.clientKey, 1)}
                      onMoveUp={() => moveItem(item.clientKey, -1)}
                      onRemove={() => removeItem(item.clientKey)}
                      onUpdate={(updates) => updateItem(item.clientKey, updates)}
                    />
                  ))}
                </div>
              )}

              {hasReachedItemLimit ? (
                <p className="text-xs leading-5 text-[#6b7280]">
                  Maximum of {MAX_BANNER_ITEMS} banner items reached.
                </p>
              ) : null}
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

function BannerItemEditor(props: {
  errors: StoreBannerItemFormErrors;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  item: StoreBannerFormItem;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<StoreBannerFormItem>) => void;
}) {
  const messageId = `store-banner-message-${props.item.clientKey}`;
  const linkHrefId = `store-banner-link-href-${props.item.clientKey}`;
  const activeId = `store-banner-active-${props.item.clientKey}`;

  return (
    <section className="rounded-xl border border-[#dfd5c5] bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Item {props.index + 1}</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Sort order {props.index}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Move item ${props.index + 1} up`}
            disabled={props.isFirst}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7c9b8] text-[#111827] transition-colors hover:bg-[#fff7ea] disabled:pointer-events-none disabled:opacity-40"
            onClick={props.onMoveUp}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Move item ${props.index + 1} down`}
            disabled={props.isLast}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d7c9b8] text-[#111827] transition-colors hover:bg-[#fff7ea] disabled:pointer-events-none disabled:opacity-40"
            onClick={props.onMoveDown}
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Remove item ${props.index + 1}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 transition-colors hover:bg-red-50"
            onClick={props.onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor={messageId} className="text-sm font-medium text-[#111827]">
            Message
          </Label>
          <Textarea
            id={messageId}
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH + 20}
            value={props.item.message}
            onChange={(event) => props.onUpdate({ message: event.target.value })}
            aria-invalid={!!props.errors.message}
            className={cn(
              'mt-2 rounded-xl border-[#dfd5c5] bg-white text-[#111827]',
              props.errors.message && 'border-red-300 focus-visible:ring-red-200',
            )}
            placeholder="Free shipping across Canada on orders $149+ CAD"
          />
          <FieldHelp error={props.errors.message} text={`${props.item.message.trim().length}/${MESSAGE_MAX_LENGTH} characters`} />
        </div>

        <div>
          <Label htmlFor={linkHrefId} className="text-sm font-medium text-[#111827]">
            Link href
          </Label>
          <Input
            id={linkHrefId}
            value={props.item.linkHref}
            onChange={(event) => props.onUpdate({ linkHref: event.target.value })}
            aria-invalid={!!props.errors.linkHref}
            className={cn(
              'mt-2 h-11 rounded-xl border-[#dfd5c5] bg-white text-[#111827]',
              props.errors.linkHref && 'border-red-300 focus-visible:ring-red-200',
            )}
            placeholder="/products"
          />
          <FieldHelp error={props.errors.linkHref} text="Use an internal path or https:// URL" />
        </div>

        <label
          htmlFor={activeId}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-[#dfd5c5] bg-[#fbfaf7] px-4 py-3"
        >
          <span>
            <span className="block text-sm font-medium text-[#111827]">Active</span>
            <span className="mt-1 block text-xs text-[#6b7280]">Inactive items are saved but hidden from the storefront.</span>
          </span>
          <input
            id={activeId}
            type="checkbox"
            checked={props.item.isActive}
            className="h-4 w-4 accent-[#111827]"
            onChange={(event) => props.onUpdate({ isActive: event.target.checked })}
          />
        </label>
      </div>
    </section>
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

function StoreBannerPreview(props: { settings: IStoreBannerSettings }) {
  const canPreview = getActiveStoreBannerItems(props.settings).length > 0;

  return (
    <aside className="rounded-2xl border border-[#dfd5c5] bg-[#fff9ef] p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#111827]">Preview</p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfd5c5] bg-white">
        {canPreview ? (
          <StoreBannerRow
            autoRotate={false}
            banner={props.settings}
            className="border-b-0"
            showControls={false}
          />
        ) : (
          <div className="px-4 py-6 text-sm leading-6 text-[#6b7280]">
            Enable the banner and add at least one active item to preview the storefront row.
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#6b7280]">
        Preview reflects the first active item in the current order before saving.
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
          <Skeleton className="h-40 rounded-xl bg-[#eee5d8]" />
          <Skeleton className="h-40 rounded-xl bg-[#eee5d8]" />
        </div>
      </div>
      <Skeleton className="h-44 rounded-2xl bg-[#eee5d8]" />
    </div>
  );
}
