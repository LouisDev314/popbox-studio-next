'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import MutationConfigs from '@/configs/api/mutation-config';
import getPublicEnvConfig from '@/configs/public-env';
import { CheckoutButton } from '@/components/cart/checkout-button';
import { CartSummary } from '@/components/cart/cart-summary';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorAlert } from '@/components/ui/error-alert';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useStartCheckout } from '@/hooks/use-start-checkout';
import { type ICartSummary } from '@/interfaces/cart';
import {
  type CheckoutQuoteData,
  type CheckoutQuoteRequest,
  type CheckoutSessionRequest,
  type SuggestedShippingAddress,
} from '@/interfaces/checkout';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { cn } from '@/lib/utils';
import {
  getApiErrorDetails,
  getCheckoutAddressError,
} from '@/utils/api-errors';
import {
  areShippingAddressesEquivalent,
  buildCheckoutRequest,
  CANADIAN_PROVINCES,
  shouldConfirmSuggestedAddress,
} from '@/utils/checkout';
import {
  normalizeGooglePlaceToShippingAddress,
  type GoogleAddressComponent,
} from '@/utils/google-address';

interface IGooglePlace {
  addressComponents?: GoogleAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<void>;
}

interface IGooglePlacePrediction {
  text?: {
    toString: () => string;
  };
  toPlace: () => IGooglePlace;
}

interface IGoogleAutocompleteSuggestion {
  placePrediction?: IGooglePlacePrediction;
}

interface IGoogleAutocompleteRequest {
  includedRegionCodes?: string[];
  input: string;
  language: 'en-CA';
  locationRestriction?: {
    east: number;
    north: number;
    south: number;
    west: number;
  };
  region: 'ca';
  sessionToken: unknown;
}

interface IGooglePlacesLibrary {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: IGoogleAutocompleteRequest) => Promise<{
      suggestions?: IGoogleAutocompleteSuggestion[];
    }>;
  };
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (libraryName: 'places') => Promise<IGooglePlacesLibrary>;
      };
    };
  }
}

const invalidControlClassName =
  '!border-destructive/80 focus-visible:!border-destructive focus-visible:!ring-destructive/20';
const CANADA_LOCATION_RESTRICTION = {
  east: -52,
  north: 84,
  south: 41,
  west: -141,
};
let googlePlacesScriptPromise: Promise<void> | null = null;

const checkoutFormSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
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

type TAddressConfirmationState = {
  source: 'quote' | 'session';
  suggestedAddress: SuggestedShippingAddress;
} | null;

function createCheckoutRequestKey(data: CheckoutQuoteRequest): string {
  return JSON.stringify(data);
}

function createUnconfirmedCheckoutRequestKey(data: CheckoutQuoteRequest): string {
  const { confirmedAddress: _confirmedAddress, ...unconfirmedData } = data;

  return createCheckoutRequestKey(unconfirmedData);
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

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (googlePlacesScriptPromise) {
    return googlePlacesScriptPromise;
  }

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-popbox-google-places="true"]');

  if (existingScript) {
    if (existingScript.dataset.popboxGooglePlacesLoaded === 'true') {
      return Promise.resolve();
    }

    googlePlacesScriptPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Places failed to load.')), { once: true });
    });

    return googlePlacesScriptPromise;
  }

  const script = document.createElement('script');
  const searchParams = new URLSearchParams({
    key: apiKey,
    loading: 'async',
    v: 'weekly',
  });

  script.async = true;
  script.defer = true;
  script.dataset.popboxGooglePlaces = 'true';
  script.src = `https://maps.googleapis.com/maps/api/js?${searchParams.toString()}`;

  googlePlacesScriptPromise = new Promise((resolve, reject) => {
    script.addEventListener('load', () => {
      script.dataset.popboxGooglePlacesLoaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Places failed to load.')), { once: true });
    document.head.appendChild(script);
  });

  return googlePlacesScriptPromise;
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
  onManualEdit: () => void;
}) {
  const apiKey = getPublicEnvConfig().googleMapsApiKey;
  const placesLibraryRef = useRef<IGooglePlacesLibrary | null>(null);
  const sessionTokenRef = useRef<unknown | null>(null);
  const [isAutocompleteReady, setIsAutocompleteReady] = useState(false);
  const [predictions, setPredictions] = useState<IGooglePlacePrediction[]>([]);
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
      .then(async () => {
        const importLibrary = window.google?.maps?.importLibrary;

        if (!importLibrary) {
          return;
        }

        const placesLibrary = await importLibrary('places');

        if (!isMounted) {
          return;
        }

        placesLibraryRef.current = placesLibrary;
        sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
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
    const placesLibrary = placesLibraryRef.current;

    if (!isAutocompleteReady || !placesLibrary || input.length < 4) {
      return;
    }

    let isCancelled = false;
    const sessionToken = sessionTokenRef.current ?? new placesLibrary.AutocompleteSessionToken();

    sessionTokenRef.current = sessionToken;

    const request: IGoogleAutocompleteRequest = {
      includedRegionCodes: ['ca'],
      input,
      language: 'en-CA',
      region: 'ca',
      sessionToken,
    };

    placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      .catch(() => placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        language: 'en-CA',
        locationRestriction: CANADA_LOCATION_RESTRICTION,
        region: 'ca',
        sessionToken,
      }))
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setPredictions(
          response.suggestions
            ?.map((suggestion) => suggestion.placePrediction)
            .filter((placePrediction): placePrediction is IGooglePlacePrediction => Boolean(placePrediction)) ?? [],
        );
      })
      .catch(() => {
        if (!isCancelled) {
          setPredictions([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedInput, isAutocompleteReady]);

  const handleSelectPrediction = useCallback((prediction: IGooglePlacePrediction) => {
    const placesLibrary = placesLibraryRef.current;
    const description = prediction.text?.toString() ?? '';

    props.field.onChange(description);
    setPredictions([]);

    const place = prediction.toPlace();

    place.fetchFields({ fields: ['addressComponents'] })
      .then(() => {
        props.onAddressSelected(normalizeGooglePlaceToShippingAddress({
          addressComponents: place.addressComponents,
          fallbackDescription: description,
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (placesLibrary) {
          sessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
        }
      });
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
        onChange={(event) => {
          props.onManualEdit();
          props.field.onChange(event.target.value);
        }}
      />
      {visiblePredictions.length > 0 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-30 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {visiblePredictions.map((prediction, index) => {
            const description = prediction.text?.toString() ?? '';

            return (
              <button
                key={`${description}-${index}`}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => handleSelectPrediction(prediction)}
              >
                {description}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface ICartCheckoutPanelProps {
  children?: ReactNode;
  summary?: ICartSummary;
  summaryNote?: ReactNode;
}

export function CartCheckoutPanel(props: ICartCheckoutPanelProps = {}) {
  const invalidItems = useCartStore((state) => state.invalidItems);
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const getCartSummary = useCartStore((state) => state.getCartSummary);
  const clearCheckoutDialog = useCheckoutUiStore((state) => state.clearCheckoutDialog);
  const { checkoutDialog, checkoutErrorMessage, isCheckingOut, startCheckout } = useStartCheckout();
  const [addressConfirmation, setAddressConfirmation] = useState<TAddressConfirmationState>(null);
  const [acceptedSuggestedAddress, setAcceptedSuggestedAddress] = useState<SuggestedShippingAddress | null>(null);
  const [confirmedAddressRequestKey, setConfirmedAddressRequestKey] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [pendingConfirmedCheckoutKey, setPendingConfirmedCheckoutKey] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<TQuoteState>({
    data: null,
    errorMessage: null,
    key: null,
    status: 'idle',
  });

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      email: '',
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
  const checkoutCustomerInput = useMemo(() => ({
    email: watchedValues.email ?? '',
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
  }), [watchedValues]);
  const baseRequestResult = useMemo(
    () => buildCheckoutRequest(items, checkoutCustomerInput),
    [checkoutCustomerInput, items],
  );
  const baseRequestKey = baseRequestResult.success ? createCheckoutRequestKey(baseRequestResult.data) : null;
  const requestResult = useMemo(
    () => buildCheckoutRequest(items, checkoutCustomerInput, {
      confirmedAddress: Boolean(baseRequestKey && confirmedAddressRequestKey === baseRequestKey),
    }),
    [baseRequestKey, checkoutCustomerInput, confirmedAddressRequestKey, items],
  );
  const currentRequestKey = requestResult.success ? createCheckoutRequestKey(requestResult.data) : null;
  const debouncedRequestKey = useDebouncedValue(currentRequestKey, 400);
  const isQuoteCurrent = quoteState.key === currentRequestKey;
  const handleAddressConfirmationRequired = useCallback((
    source: 'quote' | 'session',
    suggestedAddress: SuggestedShippingAddress,
    request: CheckoutQuoteRequest,
  ) => {
    const requestMatchesSuggestion = !shouldConfirmSuggestedAddress(request.shippingAddress, suggestedAddress);
    const acceptedMatchesSuggestion = Boolean(
      acceptedSuggestedAddress
      && areShippingAddressesEquivalent(acceptedSuggestedAddress, suggestedAddress),
    );
    const currentAcceptedRequest = (
      acceptedSuggestedAddress
      && baseRequestResult.success
      && areShippingAddressesEquivalent(baseRequestResult.data.shippingAddress, acceptedSuggestedAddress)
    )
      ? baseRequestResult.data
      : null;
    const requestToConfirm = requestMatchesSuggestion
      ? request
      : acceptedMatchesSuggestion && currentAcceptedRequest
        ? currentAcceptedRequest
        : null;

    if (requestToConfirm) {
      const confirmedRequest = {
        ...requestToConfirm,
        confirmedAddress: true,
      };

      setConfirmedAddressRequestKey(createUnconfirmedCheckoutRequestKey(requestToConfirm));
      setPendingConfirmedCheckoutKey(
        source === 'session'
          ? createCheckoutRequestKey(confirmedRequest)
          : null,
      );
      setAddressConfirmation(null);
      setFormErrorMessage(null);
      return;
    }

    if (acceptedMatchesSuggestion) {
      setAddressConfirmation(null);
      setFormErrorMessage(null);
      return;
    }

    setAddressConfirmation({
      source,
      suggestedAddress,
    });
    setFormErrorMessage(null);
  }, [acceptedSuggestedAddress, baseRequestResult]);

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

          if (
            pendingConfirmedCheckoutKey === debouncedRequestKey
            && request.confirmedAddress === true
          ) {
            setPendingConfirmedCheckoutKey(null);
            startCheckout(request as CheckoutSessionRequest, {
              onAddressConfirmationRequired: (suggestedAddress, sessionRequest) => {
                handleAddressConfirmationRequired('session', suggestedAddress, sessionRequest);
              },
            });
          }
        },
        onError: (error) => {
          const checkoutAddressError = getCheckoutAddressError(error as AxiosError<IBaseApiResponse<unknown>>);

          if (checkoutAddressError) {
            if (
              checkoutAddressError.code === 'ADDRESS_NEEDS_CONFIRMATION'
              && checkoutAddressError.suggestedAddress
            ) {
              handleAddressConfirmationRequired('quote', checkoutAddressError.suggestedAddress, request);
              return;
            }

            setQuoteState({
              data: null,
              errorMessage: checkoutAddressError.message,
              key: debouncedRequestKey,
              status: 'error',
            });
            return;
          }

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
  }, [
    createCheckoutQuote,
    debouncedRequestKey,
    handleAddressConfirmationRequired,
    pendingConfirmedCheckoutKey,
    startCheckout,
  ]);

  const canCheckout = !addressConfirmation && isCheckoutReady({
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

  function clearAddressConfirmationForManualEdit() {
    setAddressConfirmation(null);
    setAcceptedSuggestedAddress(null);
    setConfirmedAddressRequestKey(null);
    setPendingConfirmedCheckoutKey(null);
  }

  function handleAcceptSuggestedAddress() {
    if (!addressConfirmation) {
      return;
    }

    const currentValues = form.getValues();
    const suggestedAddress = addressConfirmation.suggestedAddress;
    const nextCustomerInput = {
      email: currentValues.email ?? '',
      phone: currentValues.phone ?? '',
      shippingAddress: {
        city: suggestedAddress.city,
        countryCode: suggestedAddress.countryCode,
        fullName: currentValues.shippingAddress.fullName ?? '',
        line1: suggestedAddress.line1,
        line2: suggestedAddress.line2 ?? '',
        phone: null,
        postalCode: suggestedAddress.postalCode,
        province: suggestedAddress.province,
      },
    };
    const nextBaseRequest = buildCheckoutRequest(items, nextCustomerInput);
    const nextConfirmedRequest = buildCheckoutRequest(items, nextCustomerInput, {
      confirmedAddress: true,
    });

    if (!nextBaseRequest.success || !nextConfirmedRequest.success) {
      setFormErrorMessage('Enter a valid Canadian shipping address and wait for the latest checkout quote.');
      return;
    }

    setConfirmedAddressRequestKey(createCheckoutRequestKey(nextBaseRequest.data));
    setAcceptedSuggestedAddress(suggestedAddress);
    setPendingConfirmedCheckoutKey(
      addressConfirmation.source === 'session'
        ? createCheckoutRequestKey(nextConfirmedRequest.data)
        : null,
    );
    setAddressConfirmation(null);
    setFormErrorMessage(null);

    form.setValue('shippingAddress.line1', suggestedAddress.line1, { shouldDirty: true, shouldValidate: true });
    form.setValue('shippingAddress.line2', suggestedAddress.line2 ?? '', { shouldDirty: true, shouldValidate: true });
    form.setValue('shippingAddress.city', suggestedAddress.city, { shouldDirty: true, shouldValidate: true });
    form.setValue('shippingAddress.province', suggestedAddress.province, { shouldDirty: true, shouldValidate: true });
    form.setValue('shippingAddress.postalCode', suggestedAddress.postalCode, { shouldDirty: true, shouldValidate: true });
    form.setValue('shippingAddress.countryCode', suggestedAddress.countryCode, { shouldDirty: true, shouldValidate: true });
  }

  function handleEditSuggestedAddress() {
    clearAddressConfirmationForManualEdit();
    setFormErrorMessage(null);
    form.setFocus('shippingAddress.line1');
  }

  function handleSubmitCheckout() {
    if (!requestResult.success) {
      setFormErrorMessage(requestResult.message);
      return;
    }

    if (!canCheckout) {
      setFormErrorMessage('Enter a valid Canadian shipping address and wait for the latest checkout quote.');
      return;
    }

    startCheckout(requestResult.data as CheckoutSessionRequest, {
      onAddressConfirmationRequired: (suggestedAddress, request) => {
        handleAddressConfirmationRequired('session', suggestedAddress, request);
      },
    });
  }

  const quote = quoteState.status === 'success' && isQuoteCurrent ? quoteState.data : null;
  const summary = props.summary ?? getCartSummary();
  const isQuotePending = quoteState.status === 'pending' && isQuoteCurrent;

  return (
    <>
      <form
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,40rem)_22rem] lg:items-start xl:grid-cols-[minmax(0,42rem)_23rem]"
        data-testid="cart-checkout-layout"
        noValidate
        onSubmit={form.handleSubmit(handleSubmitCheckout)}
      >
        <div className="space-y-6">
          {props.children}

          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm" aria-label="Checkout details">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Checkout details</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                We ship within Canada only.
              </p>
            </div>

            <div className="mt-6 space-y-6">
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
              
              <h3 className="text-base font-semibold text-foreground">Shipping address</h3>

              {addressConfirmation ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-4" role="status" aria-live="polite">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-foreground">Confirm your shipping address</h4>
                    <div className="rounded-xl bg-background px-3 py-2 text-sm text-foreground">
                      <p className="font-medium">{addressConfirmation.suggestedAddress.line1}</p>
                      {addressConfirmation.suggestedAddress.line2 ? (
                        <p>{addressConfirmation.suggestedAddress.line2}</p>
                      ) : null}
                      <p>
                        {addressConfirmation.suggestedAddress.city}
                        {', '}
                        {addressConfirmation.suggestedAddress.province}
                        {' '}
                        {addressConfirmation.suggestedAddress.postalCode}
                      </p>
                      <p>Canada</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={handleAcceptSuggestedAddress}>
                      Use suggested address
                    </Button>
                    <Button type="button" variant="outline" onClick={handleEditSuggestedAddress}>
                      Edit address
                    </Button>
                  </div>
                </div>
              ) : null}

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
                        onManualEdit={clearAddressConfirmationForManualEdit}
                        onAddressSelected={(values) => {
                          if (values.countryCode !== 'CA') {
                            setFormErrorMessage('PopBox Studio currently only ships within Canada.');
                            return;
                          }

                          clearAddressConfirmationForManualEdit();
                          setFormErrorMessage(null);

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
                          form.setValue('shippingAddress.countryCode', values.countryCode, { shouldDirty: true, shouldValidate: true });
                        }}
                      />
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
                        onChange={(event) => {
                          clearAddressConfirmationForManualEdit();
                          field.onChange(event.target.value);
                        }}
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
                          onChange={(event) => {
                            clearAddressConfirmationForManualEdit();
                            field.onChange(event.target.value);
                          }}
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
                          onChange={(event) => {
                            clearAddressConfirmationForManualEdit();
                            field.onChange(event.target.value);
                          }}
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
                          onChange={(event) => {
                            clearAddressConfirmationForManualEdit();
                            field.onChange(event.target.value);
                          }}
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
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24" data-testid="cart-summary-column">
          <CartSummary
            summary={summary}
            note={props.summaryNote}
            quote={quote}
            isQuotePending={isQuotePending}
          />

          <ErrorAlert message={blockingMessage} />

          <CheckoutButton
            size="lg"
            className="h-12 w-full rounded-full text-base font-semibold"
            data-testid="cart-checkout-submit"
            disabled={!canCheckout}
            isPending={isCheckingOut}
          />
        </div>
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
    </>
  );
}
