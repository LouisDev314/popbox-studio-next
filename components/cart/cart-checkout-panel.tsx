'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import MutationConfigs from '@/configs/api/mutation-config';
import getPublicEnvConfig from '@/configs/public-env';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/ui/error-alert';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useStartCheckout } from '@/hooks/use-start-checkout';
import {
  type CheckoutQuoteData,
  type CheckoutQuoteRequest,
  type CheckoutSessionRequest,
} from '@/interfaces/checkout';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { cn, formatPrice } from '@/lib/utils';
import { getApiErrorDetails } from '@/utils/api-errors';
import {
  buildCheckoutRequest,
  CANADIAN_PROVINCES,
  isCanadianProvinceCode,
} from '@/utils/checkout';

type TGooglePlacesStatus = 'OK' | 'ZERO_RESULTS' | string;

interface IGoogleAutocompletePrediction {
  description: string;
  place_id: string;
}

interface IGoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface IGooglePlaceResult {
  address_components?: IGoogleAddressComponent[];
}

interface IGoogleAutocompleteService {
  getPlacePredictions: (
    request: {
      componentRestrictions: { country: 'ca' };
      input: string;
      types: string[];
    },
    callback: (
      predictions: IGoogleAutocompletePrediction[] | null,
      status: TGooglePlacesStatus,
    ) => void,
  ) => void;
}

interface IGooglePlacesService {
  getDetails: (
    request: { fields: string[]; placeId: string },
    callback: (place: IGooglePlaceResult | null, status: TGooglePlacesStatus) => void,
  ) => void;
}

interface IGooglePlacesNamespace {
  AutocompleteService: new () => IGoogleAutocompleteService;
  PlacesService: new (node: HTMLDivElement) => IGooglePlacesService;
  PlacesServiceStatus: { OK: 'OK' };
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: IGooglePlacesNamespace;
      };
    };
  }
}

const invalidControlClassName =
  '!border-destructive/80 focus-visible:!border-destructive focus-visible:!ring-destructive/20';

const checkoutFormSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  firstName: z.string().trim().max(120, 'First name must be 120 characters or fewer.').optional(),
  lastName: z.string().trim().max(120, 'Last name must be 120 characters or fewer.').optional(),
  phone: z.string().trim().max(40, 'Phone must be 40 characters or fewer.').optional(),
  shippingAddress: z.object({
    fullName: z.string().trim().min(1, 'Full name is required.').max(240, 'Full name must be 240 characters or fewer.'),
    line1: z.string().trim().min(1, 'Street address is required.').max(240, 'Street address must be 240 characters or fewer.'),
    line2: z.string().trim().max(240, 'Address line 2 must be 240 characters or fewer.').optional(),
    city: z.string().trim().min(1, 'City is required.').max(120, 'City must be 120 characters or fewer.'),
    province: z.enum(CANADIAN_PROVINCES.map((province) => province.code), {
      message: 'Choose a Canadian province or territory.',
    }),
    postalCode: z.string().trim().min(1, 'Postal code is required.').max(20, 'Postal code must be 20 characters or fewer.'),
    countryCode: z.literal('CA'),
  }),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

type TQuoteState =
  | { data: CheckoutQuoteData; errorMessage: null; key: string; status: 'success' }
  | { data: null; errorMessage: string; key: string | null; status: 'error' }
  | { data: null; errorMessage: null; key: string | null; status: 'idle' | 'pending' };

function createCheckoutRequestKey(data: CheckoutQuoteRequest): string {
  return JSON.stringify(data);
}

function isCheckoutReady(params: {
  currentRequestKey: string | null;
  hasHydrated: boolean;
  invalidItemCount: number;
  isCheckingOut: boolean;
  itemCount: number;
  requestIsValid: boolean;
  quoteState: TQuoteState;
}): boolean {
  return Boolean(
    params.hasHydrated
    && params.itemCount > 0
    && params.invalidItemCount === 0
    && params.requestIsValid
    && params.quoteState.status === 'success'
    && params.quoteState.key === params.currentRequestKey
    && !params.isCheckingOut,
  );
}

function formatTaxRate(ratePpm: number): string {
  const rate = ratePpm / 10000;

  return `${Number.isInteger(rate) ? rate.toFixed(0) : rate.toFixed(2)}%`;
}

function getAddressComponent(
  components: IGoogleAddressComponent[] | undefined,
  type: string,
  field: 'long_name' | 'short_name' = 'long_name',
): string {
  return components?.find((component) => component.types.includes(type))?.[field] ?? '';
}

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-popbox-google-places="true"]');

  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Places failed to load.')), { once: true });
    });
  }

  const script = document.createElement('script');
  const searchParams = new URLSearchParams({
    key: apiKey,
    libraries: 'places',
  });

  script.async = true;
  script.defer = true;
  script.dataset.popboxGooglePlaces = 'true';
  script.src = `https://maps.googleapis.com/maps/api/js?${searchParams.toString()}`;

  return new Promise((resolve, reject) => {
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Places failed to load.')), { once: true });
    document.head.appendChild(script);
  });
}

function AddressAutocompleteInput(props: {
  disabled: boolean;
  field: {
    name: string;
    onBlur: () => void;
    onChange: (value: string) => void;
    value: string;
  };
  invalid: boolean;
  onAddressSelected: (values: Partial<CheckoutFormValues['shippingAddress']>) => void;
}) {
  const apiKey = getPublicEnvConfig().googleMapsApiKey;
  const autocompleteServiceRef = useRef<IGoogleAutocompleteService | null>(null);
  const placesServiceRef = useRef<IGooglePlacesService | null>(null);
  const placesNodeRef = useRef<HTMLDivElement | null>(null);
  const [isAutocompleteReady, setIsAutocompleteReady] = useState(false);
  const [predictions, setPredictions] = useState<IGoogleAutocompletePrediction[]>([]);
  const debouncedInput = useDebouncedValue(props.field.value, 250);
  const visiblePredictions =
    isAutocompleteReady && props.field.value.trim().length >= 4
      ? predictions
      : [];

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    let isMounted = true;

    loadGooglePlacesScript(apiKey)
      .then(() => {
        const places = window.google?.maps?.places;

        if (!isMounted || !places || !placesNodeRef.current) {
          return;
        }

        autocompleteServiceRef.current = new places.AutocompleteService();
        placesServiceRef.current = new places.PlacesService(placesNodeRef.current);
        setIsAutocompleteReady(true);
      })
      .catch(() => {
        if (isMounted) {
          setIsAutocompleteReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    const input = debouncedInput.trim();
    const autocompleteService = autocompleteServiceRef.current;

    if (!isAutocompleteReady || !autocompleteService || input.length < 4) {
      return;
    }

    autocompleteService.getPlacePredictions(
      {
        componentRestrictions: { country: 'ca' },
        input,
        types: ['address'],
      },
      (nextPredictions, status) => {
        if (status !== 'OK') {
          setPredictions([]);
          return;
        }

        setPredictions(nextPredictions ?? []);
      },
    );
  }, [debouncedInput, isAutocompleteReady]);

  const handleSelectPrediction = useCallback((prediction: IGoogleAutocompletePrediction) => {
    const placesService = placesServiceRef.current;

    props.field.onChange(prediction.description);
    setPredictions([]);

    if (!placesService) {
      return;
    }

    placesService.getDetails(
      {
        fields: ['address_components'],
        placeId: prediction.place_id,
      },
      (place, status) => {
        if (status !== 'OK') {
          return;
        }

        const components = place?.address_components;
        const streetNumber = getAddressComponent(components, 'street_number');
        const route = getAddressComponent(components, 'route');
        const city =
          getAddressComponent(components, 'locality')
          || getAddressComponent(components, 'postal_town')
          || getAddressComponent(components, 'administrative_area_level_3');
        const province = getAddressComponent(components, 'administrative_area_level_1', 'short_name').toUpperCase();
        const postalCode = getAddressComponent(components, 'postal_code');
        const countryCode = getAddressComponent(components, 'country', 'short_name').toUpperCase();

        props.onAddressSelected({
          city,
          countryCode: countryCode === 'CA' ? 'CA' : undefined,
          line1: [streetNumber, route].filter(Boolean).join(' ') || prediction.description,
          postalCode,
          province: isCanadianProvinceCode(province) ? province : undefined,
        });
      },
    );
  }, [props]);

  return (
    <div className="relative">
      <Input
        id="checkout-line1"
        name={props.field.name}
        autoComplete="address-line1"
        value={props.field.value}
        disabled={props.disabled}
        aria-invalid={props.invalid}
        className={cn(props.invalid && invalidControlClassName)}
        onBlur={props.field.onBlur}
        onChange={(event) => props.field.onChange(event.target.value)}
      />
      <div ref={placesNodeRef} className="hidden" />
      {visiblePredictions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {visiblePredictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleSelectPrediction(prediction)}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CartCheckoutPanel() {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const clearCheckoutDialog = useCheckoutUiStore((state) => state.clearCheckoutDialog);
  const { checkoutDialog, checkoutErrorMessage, isCheckingOut, startCheckout } = useStartCheckout();
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<TQuoteState>({
    data: null,
    errorMessage: null,
    key: null,
    status: 'idle',
  });

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      shippingAddress: {
        city: '',
        countryCode: 'CA',
        fullName: '',
        line1: '',
        line2: '',
        postalCode: '',
        province: undefined,
      },
    },
    mode: 'onChange',
    resolver: zodResolver(checkoutFormSchema),
  });

  const watchedValues = useWatch({ control: form.control });
  const requestResult = useMemo(() => buildCheckoutRequest(items, {
    email: watchedValues.email ?? '',
    firstName: watchedValues.firstName ?? '',
    lastName: watchedValues.lastName ?? '',
    phone: watchedValues.phone ?? '',
    shippingAddress: {
      city: watchedValues.shippingAddress?.city ?? '',
      countryCode: 'CA',
      fullName: watchedValues.shippingAddress?.fullName ?? '',
      line1: watchedValues.shippingAddress?.line1 ?? '',
      line2: watchedValues.shippingAddress?.line2 ?? '',
      phone: null,
      postalCode: watchedValues.shippingAddress?.postalCode ?? '',
      province: watchedValues.shippingAddress?.province ?? '',
    },
  }), [items, watchedValues]);
  const currentRequestKey = requestResult.success ? createCheckoutRequestKey(requestResult.data) : null;
  const debouncedRequestKey = useDebouncedValue(currentRequestKey, 400);
  const isQuoteCurrent = quoteState.key === currentRequestKey;

  const { mutation: createCheckoutQuote } = useCustomizeMutation<
    CheckoutQuoteData,
    CheckoutQuoteRequest
  >({
    mutationFn: MutationConfigs.createCheckoutQuote,
  });

  useEffect(() => {
    if (!debouncedRequestKey) {
      return;
    }

    const request = JSON.parse(debouncedRequestKey) as CheckoutQuoteRequest;
    let isCancelled = false;
    const pendingTimeoutId = window.setTimeout(() => {
      if (isCancelled) {
        return;
      }

      setQuoteState({
        data: null,
        errorMessage: null,
        key: debouncedRequestKey,
        status: 'pending',
      });
      setFormErrorMessage(null);

      createCheckoutQuote(request, {
        onSuccess: (response) => {
          const data = response.data.data;

          if (!data) {
            setQuoteState({
              data: null,
              errorMessage: 'We couldn’t calculate checkout totals right now. Please try again.',
              key: debouncedRequestKey,
              status: 'error',
            });
            return;
          }

          setQuoteState({
            data,
            errorMessage: null,
            key: debouncedRequestKey,
            status: 'success',
          });
        },
        onError: (error) => {
          setQuoteState({
            data: null,
            errorMessage: getApiErrorDetails(
              error as AxiosError<IBaseApiResponse<unknown>>,
              'We couldn’t calculate checkout totals right now. Please review your shipping details.',
            ).message,
            key: debouncedRequestKey,
            status: 'error',
          });
        },
      });
    }, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(pendingTimeoutId);
    };
  }, [createCheckoutQuote, debouncedRequestKey]);

  const canCheckout = isCheckoutReady({
    currentRequestKey,
    hasHydrated,
    invalidItemCount: invalidItems.length,
    isCheckingOut,
    itemCount: items.length,
    quoteState,
    requestIsValid: requestResult.success,
  });
  const blockingMessage =
    formErrorMessage
    || (isQuoteCurrent ? quoteState.errorMessage : null)
    || checkoutErrorMessage;

  function handleSubmitCheckout() {
    if (!requestResult.success) {
      setFormErrorMessage(requestResult.message);
      return;
    }

    if (!canCheckout) {
      setFormErrorMessage('Enter a valid Canadian shipping address and wait for the latest checkout quote.');
      return;
    }

    startCheckout(requestResult.data as CheckoutSessionRequest);
  }

  const quote = quoteState.status === 'success' && isQuoteCurrent ? quoteState.data : null;
  const taxBreakdown = quote?.taxBreakdown;
  const taxRows = taxBreakdown
    ? [
      { amountCents: taxBreakdown.gstCents, label: 'GST', ratePpm: taxBreakdown.gstRatePpm },
      { amountCents: taxBreakdown.pstCents, label: 'PST', ratePpm: taxBreakdown.pstRatePpm },
      { amountCents: taxBreakdown.hstCents, label: 'HST', ratePpm: taxBreakdown.hstRatePpm },
      { amountCents: taxBreakdown.qstCents, label: 'QST', ratePpm: taxBreakdown.qstRatePpm },
    ].filter((row) => row.amountCents > 0 || row.ratePpm > 0)
    : [];

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm" aria-label="Checkout details">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Checkout details</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          We ship within Canada only. Stripe will collect payment after these totals are confirmed by PopBox Studio.
        </p>
      </div>

      <form className="mt-6 space-y-6" noValidate onSubmit={form.handleSubmit(handleSubmitCheckout)}>
        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                  <FieldLabel htmlFor="checkout-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="firstName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="checkout-first-name">First name (optional)</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-first-name"
                    autoComplete="given-name"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="lastName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="checkout-last-name">Last name (optional)</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-last-name"
                    autoComplete="family-name"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                  <FieldLabel htmlFor="checkout-phone">Phone (optional)</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-phone"
                    type="tel"
                    autoComplete="tel"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </div>
        </FieldGroup>

        <div className="border-t border-border/60 pt-6">
          <h3 className="text-base font-semibold text-foreground">Shipping address</h3>
          <p className="mt-1 text-sm text-muted-foreground">Country is fixed to Canada for this checkout.</p>
        </div>

        <FieldGroup>
          <Controller
            name="shippingAddress.fullName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="checkout-full-name">Full name</FieldLabel>
                <Input
                  {...field}
                  id="checkout-full-name"
                  autoComplete="name"
                  disabled={isCheckingOut}
                  aria-invalid={fieldState.invalid}
                  className={cn(fieldState.invalid && invalidControlClassName)}
                />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <Controller
            name="shippingAddress.line1"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="checkout-line1">Street address</FieldLabel>
                <AddressAutocompleteInput
                  disabled={isCheckingOut}
                  field={field}
                  invalid={fieldState.invalid}
                  onAddressSelected={(values) => {
                    if (values.line1) {
                      form.setValue('shippingAddress.line1', values.line1, { shouldDirty: true, shouldValidate: true });
                    }
                    if (values.city) {
                      form.setValue('shippingAddress.city', values.city, { shouldDirty: true, shouldValidate: true });
                    }
                    if (values.province) {
                      form.setValue('shippingAddress.province', values.province, { shouldDirty: true, shouldValidate: true });
                    }
                    if (values.postalCode) {
                      form.setValue('shippingAddress.postalCode', values.postalCode, { shouldDirty: true, shouldValidate: true });
                    }
                    form.setValue('shippingAddress.countryCode', 'CA', { shouldDirty: true, shouldValidate: true });
                  }}
                />
                <FieldDescription>Start typing for address suggestions, or enter the address manually.</FieldDescription>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <Controller
            name="shippingAddress.line2"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="checkout-line2">Apartment, suite, etc. (optional)</FieldLabel>
                <Input
                  {...field}
                  id="checkout-line2"
                  autoComplete="address-line2"
                  disabled={isCheckingOut}
                  aria-invalid={fieldState.invalid}
                  className={cn(fieldState.invalid && invalidControlClassName)}
                />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <Controller
              name="shippingAddress.city"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="checkout-city">City</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-city"
                    autoComplete="address-level2"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="shippingAddress.province"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="checkout-province">Province</FieldLabel>
                  <select
                    id="checkout-province"
                    name={field.name}
                    value={field.value ?? ''}
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
                      fieldState.invalid && 'border-destructive/80 focus:border-destructive focus:ring-destructive/20',
                    )}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                  >
                    <option value="">Choose</option>
                    {CANADIAN_PROVINCES.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.code} - {province.label}
                      </option>
                    ))}
                  </select>
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Controller
              name="shippingAddress.postalCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="checkout-postal-code">Postal code</FieldLabel>
                  <Input
                    {...field}
                    id="checkout-postal-code"
                    autoComplete="postal-code"
                    disabled={isCheckingOut}
                    aria-invalid={fieldState.invalid}
                    className={cn(fieldState.invalid && invalidControlClassName)}
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />
          </div>

          <Controller
            name="shippingAddress.countryCode"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="checkout-country">Country</FieldLabel>
                <Input
                  {...field}
                  id="checkout-country"
                  value="Canada"
                  disabled={true}
                />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">Backend quote</h3>
            {quoteState.status === 'pending' && isQuoteCurrent ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Spinner className="size-3.5" />
                Updating
              </span>
            ) : null}
          </div>

          {quote ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(quote.subtotalCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-foreground">{formatPrice(quote.shippingCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium text-foreground">{formatPrice(quote.taxCents)}</span>
              </div>
              {taxRows.length > 0 ? (
                <div className="space-y-2 rounded-xl bg-muted/35 px-3 py-2">
                  {taxRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        <span>{row.label}</span>
                        <span className="ml-1">{formatTaxRate(row.ratePpm)}</span>
                      </span>
                      <span className="font-medium text-foreground">{formatPrice(row.amountCents)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="border-t border-border/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-foreground">{formatPrice(quote.totalCents)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter a valid Canadian shipping address to calculate backend-owned shipping and tax.
            </p>
          )}
        </div>

        <ErrorAlert message={blockingMessage} />

        <CheckoutButton
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          disabled={!canCheckout}
          isPending={isCheckingOut}
        />
      </form>

      <Dialog
        open={checkoutDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            clearCheckoutDialog();
          }
        }}
      >
        <DialogContent
          title={checkoutDialog?.title ?? 'Checkout message'}
          showCloseButton={false}
          className="max-w-md rounded-2xl border-border/50 bg-card p-6 sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle>{checkoutDialog?.title}</DialogTitle>
            <DialogDescription className="text-base leading-7">
              {checkoutDialog?.message}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 border-t border-border/20 pt-4">
            <Button type="button" className="w-full sm:w-auto" onClick={clearCheckoutDialog}>
              {checkoutDialog?.actionLabel ?? 'Okay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
