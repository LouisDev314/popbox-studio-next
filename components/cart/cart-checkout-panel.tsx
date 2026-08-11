'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Control, Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import MutationConfigs from '@/configs/api/mutation-config';
import { CheckoutHandoffOverlay } from '@/components/cart/checkout-handoff-overlay';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/components/auth/customer-auth-provider';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { useCartStore } from '@/hooks/use-cart';
import { useCheckoutUiStore } from '@/hooks/use-checkout-ui';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  type GoogleAddressAutocompleteOption,
  useGoogleAddressAutocomplete,
} from '@/hooks/use-google-address-autocomplete';
import { useStartCheckout } from '@/hooks/use-start-checkout';
import { type ICartSummary } from '@/interfaces/cart';
import {
  type CheckoutQuoteData,
  type CheckoutCustomerInput,
  type CheckoutQuoteRequest,
  type CheckoutSessionRequest,
  type SuggestedShippingAddress,
} from '@/interfaces/checkout';
import { type IBaseApiResponse } from '@/interfaces/api-response';
import { cn } from '@/lib/utils';
import {
  getCheckoutAddressError,
  getApiErrorCode,
  getCheckoutQuoteErrorMessage,
} from '@/utils/api-errors';
import {
  areShippingAddressesEquivalent,
  buildCheckoutRequest,
  CANADIAN_PROVINCES,
  shouldConfirmSuggestedAddress,
} from '@/utils/checkout';

const invalidControlClassName =
  '!border-destructive/80 focus-visible:!border-destructive focus-visible:!ring-destructive/20';

const checkoutFormSchema = z.object({
  customerNote: z.string().trim().max(200, 'Order note must be 200 characters or fewer.').optional(),
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

type WatchedCheckoutFormValues = Partial<Omit<CheckoutFormValues, 'shippingAddress'>> & {
  shippingAddress?: Partial<CheckoutFormValues['shippingAddress']>;
};

type TQuoteState =
  | { data: CheckoutQuoteData; errorMessage: null; key: string; status: 'success' }
  | { data: null; errorMessage: string; key: string | null; status: 'error' }
  | { data: null; errorMessage: null; key: string | null; status: 'idle' | 'pending' };

type TAddressConfirmationState = {
  source: 'quote' | 'session';
  suggestedAddress: SuggestedShippingAddress;
} | null;

function createCheckoutRequestKey(data: CheckoutQuoteRequest, authMode: 'customer' | 'guest' = 'guest'): string {
  const { customerNote: _customerNote, ...quoteRelevantData } = data;

  return JSON.stringify({ authMode, request: quoteRelevantData });
}

function createUnconfirmedCheckoutRequestKey(data: CheckoutQuoteRequest, authMode: 'customer' | 'guest' = 'guest'): string {
  const { confirmedAddress: _confirmedAddress, ...unconfirmedData } = data;

  return createCheckoutRequestKey(unconfirmedData, authMode);
}

function createCheckoutCustomerInput(
  values: WatchedCheckoutFormValues,
  account?: { firstName: string | null; lastName: string | null },
): CheckoutCustomerInput {
  return {
    customerNote: values.customerNote ?? '',
    email: values.email ?? '',
    firstName: account?.firstName ?? null,
    lastName: account?.lastName ?? null,
    phone: values.phone ?? '',
    shippingAddress: {
      city: values.shippingAddress?.city ?? '',
      countryCode: 'CA',
      fullName: values.shippingAddress?.fullName ?? '',
      line1: values.shippingAddress?.line1 ?? '',
      line2: values.shippingAddress?.line2 ?? '',
      phone: null,
      postalCode: values.shippingAddress?.postalCode ?? '',
      province: values.shippingAddress?.province ?? '',
    },
  };
}

function createCheckoutQuoteCustomerInput(
  values: WatchedCheckoutFormValues,
  account?: { firstName: string | null; lastName: string | null },
): CheckoutCustomerInput {
  return {
    email: values.email ?? '',
    firstName: account?.firstName ?? null,
    lastName: account?.lastName ?? null,
    phone: values.phone ?? '',
    shippingAddress: {
      city: values.shippingAddress?.city ?? '',
      countryCode: 'CA',
      fullName: values.shippingAddress?.fullName ?? '',
      line1: values.shippingAddress?.line1 ?? '',
      line2: values.shippingAddress?.line2 ?? '',
      phone: null,
      postalCode: values.shippingAddress?.postalCode ?? '',
      province: values.shippingAddress?.province ?? '',
    },
  };
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
  onManualAddressChanged: () => void;
}) {
  const autocomplete = useGoogleAddressAutocomplete({
    disabled: props.disabled,
    input: props.field.value,
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = 'checkout-line1-suggestions';
  const visibleSuggestions = autocomplete.suggestions;
  const activeHighlightedIndex =
    visibleSuggestions.length === 0
      ? -1
      : highlightedIndex >= 0 && highlightedIndex < visibleSuggestions.length
        ? highlightedIndex
        : 0;

  const handleSelectSuggestion = useCallback(async (suggestion: GoogleAddressAutocompleteOption) => {
    props.onManualAddressChanged();

    try {
      const values = await autocomplete.selectSuggestion(suggestion);

      props.onAddressSelected(values);
    } catch {
      autocomplete.clearSuggestions();
    }
  }, [autocomplete, props]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (visibleSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((activeHighlightedIndex + 1) % visibleSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(
        activeHighlightedIndex <= 0
          ? visibleSuggestions.length - 1
          : activeHighlightedIndex - 1,
      );
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      autocomplete.clearSuggestions();
      return;
    }

    if (event.key === 'Enter' && activeHighlightedIndex >= 0) {
      event.preventDefault();
      void handleSelectSuggestion(visibleSuggestions[activeHighlightedIndex]);
    }
  }

  return (
    <div className="relative">
      <Input
        id="checkout-line1"
        name={props.field.name}
        autoComplete="address-line1"
        value={props.field.value}
        disabled={props.disabled}
        aria-invalid={props.invalid}
        aria-autocomplete="list"
        aria-controls={visibleSuggestions.length > 0 ? listboxId : undefined}
        aria-expanded={visibleSuggestions.length > 0}
        className={cn(props.invalid && invalidControlClassName)}
        onBlur={props.field.onBlur}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const nextValue = event.target.value;

          if (nextValue.trim().length < 4) {
            autocomplete.clearSuggestions();
          }

          autocomplete.resetSelectionSuppression();
          props.field.onChange(nextValue);
          props.onManualAddressChanged();
        }}
      />
      {visibleSuggestions.length > 0 ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === activeHighlightedIndex}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                index === activeHighlightedIndex && 'bg-accent',
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                void handleSelectSuggestion(suggestion);
              }}
            >
              {suggestion.description}
            </button>
          ))}
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

function CheckoutHandoffOverlayMount(props: { isActive: boolean }) {
  if (!props.isActive) {
    return null;
  }

  return <CheckoutHandoffOverlay />;
}

function CheckoutCustomerNoteField(props: {
  control: Control<CheckoutFormValues>;
  disabled: boolean;
  noteLength: number;
}) {
  return (
    <Controller
      name="customerNote"
      control={props.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="checkout-customer-note">Order Note (Optional)</FieldLabel>
            <span className="shrink-0 text-xs text-muted-foreground" aria-live="polite">
              {props.noteLength}
              {' / 200'}
            </span>
          </div>
          <Textarea
            {...field}
            id="checkout-customer-note"
            placeholder="Add preferred prize variant. Subject to availability."
            maxLength={200}
            disabled={props.disabled}
            aria-invalid={fieldState.invalid}
            className={cn(
              'min-h-24 resize-y',
              fieldState.invalid && invalidControlClassName,
            )}
          />
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  );
}

function AddressConfirmationPrompt(props: {
  confirmation: TAddressConfirmationState;
  onAccept: () => void;
  onEdit: () => void;
}) {
  if (!props.confirmation) {
    return null;
  }

  const { suggestedAddress } = props.confirmation;

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4" role="status" aria-live="polite">
      <div className="space-y-2">
        <h4 className="text-base font-semibold text-foreground">Confirm your shipping address</h4>
        <div className="rounded-xl bg-background px-3 py-2 text-sm text-foreground">
          <p className="font-medium">{suggestedAddress.line1}</p>
          {suggestedAddress.line2 ? (
            <p>{suggestedAddress.line2}</p>
          ) : null}
          <p>
            {suggestedAddress.city}
            {', '}
            {suggestedAddress.province}
            {' '}
            {suggestedAddress.postalCode}
          </p>
          <p>Canada</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={props.onAccept}>
          Use suggested address
        </Button>
        <Button type="button" variant="outline" onClick={props.onEdit}>
          Edit address
        </Button>
      </div>
    </div>
  );
}

// eslint-disable-next-line complexity -- Checkout coordinates quote, confirmation, and Stripe handoff states in one form boundary.
export function CartCheckoutPanel(props: ICartCheckoutPanelProps = {}) {
  const auth = useCustomerAuth();
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
  const [hasCheckoutSessionSucceeded, setHasCheckoutSessionSucceeded] = useState(false);
  const [pendingConfirmedCheckoutKey, setPendingConfirmedCheckoutKey] = useState<string | null>(null);
  const checkoutSessionSucceededRef = useRef(false);
  const [quoteState, setQuoteState] = useState<TQuoteState>({
    data: null,
    errorMessage: null,
    key: null,
    status: 'idle',
  });
  const authMode = auth.status === 'customer' ? 'customer' : 'guest';
  const isAuthResolved = auth.status === 'signedOut'
    || auth.status === 'customer';
  const authBlockingMessage = auth.status === 'conflict'
    ? 'We could not safely link this sign-in to your customer account. Open Account Help or sign out before checking out.'
    : auth.status === 'unavailable'
      ? 'We could not verify your signed-in account for checkout. Try again or sign out before continuing as a guest.'
      : null;
  const accountNames = useMemo(() => auth.status === 'customer' ? {
    firstName: auth.profile?.firstName ?? null,
    lastName: auth.profile?.lastName ?? null,
  } : undefined, [auth.profile?.firstName, auth.profile?.lastName, auth.status]);

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      customerNote: '',
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
  const watchedShippingAddress = watchedValues.shippingAddress;
  const watchedCustomerNote = watchedValues.customerNote ?? '';
  const watchedEmail = watchedValues.email ?? '';
  const watchedPhone = watchedValues.phone ?? '';
  const watchedShippingCity = watchedShippingAddress?.city ?? '';
  const watchedShippingFullName = watchedShippingAddress?.fullName ?? '';
  const watchedShippingLine1 = watchedShippingAddress?.line1 ?? '';
  const watchedShippingLine2 = watchedShippingAddress?.line2 ?? '';
  const watchedShippingPostalCode = watchedShippingAddress?.postalCode ?? '';
  const watchedShippingProvince = watchedShippingAddress?.province;
  const checkoutCustomerInput = useMemo(
    () => createCheckoutCustomerInput({
      customerNote: watchedCustomerNote,
      email: watchedEmail,
      phone: watchedPhone,
      shippingAddress: {
        city: watchedShippingCity,
        countryCode: 'CA',
        fullName: watchedShippingFullName,
        line1: watchedShippingLine1,
        line2: watchedShippingLine2,
        postalCode: watchedShippingPostalCode,
        province: watchedShippingProvince,
      },
    }, accountNames),
    [
      watchedCustomerNote,
      watchedEmail,
      watchedPhone,
      watchedShippingCity,
      watchedShippingFullName,
      watchedShippingLine1,
      watchedShippingLine2,
      watchedShippingPostalCode,
      watchedShippingProvince,
      accountNames,
    ],
  );
  const quoteCustomerInput = useMemo(
    () => createCheckoutQuoteCustomerInput({
      email: watchedEmail,
      phone: watchedPhone,
      shippingAddress: {
        city: watchedShippingCity,
        countryCode: 'CA',
        fullName: watchedShippingFullName,
        line1: watchedShippingLine1,
        line2: watchedShippingLine2,
        postalCode: watchedShippingPostalCode,
        province: watchedShippingProvince,
      },
    }, accountNames),
    [
      watchedEmail,
      watchedPhone,
      watchedShippingCity,
      watchedShippingFullName,
      watchedShippingLine1,
      watchedShippingLine2,
      watchedShippingPostalCode,
      watchedShippingProvince,
      accountNames,
    ],
  );
  const customerNoteLength = watchedCustomerNote.length;
  const baseRequestResult = useMemo(
    () => buildCheckoutRequest(items, quoteCustomerInput, {
      includeCustomerNote: false,
    }),
    [items, quoteCustomerInput],
  );
  const baseRequestKey = baseRequestResult.success ? createCheckoutRequestKey(baseRequestResult.data, authMode) : null;
  const requestResult = useMemo(
    () => buildCheckoutRequest(items, quoteCustomerInput, {
      confirmedAddress: Boolean(baseRequestKey && confirmedAddressRequestKey === baseRequestKey),
      includeCustomerNote: false,
    }),
    [baseRequestKey, confirmedAddressRequestKey, items, quoteCustomerInput],
  );
  const sessionRequestResult = useMemo(
    () => buildCheckoutRequest(items, checkoutCustomerInput, {
      confirmedAddress: Boolean(baseRequestKey && confirmedAddressRequestKey === baseRequestKey),
    }),
    [baseRequestKey, checkoutCustomerInput, confirmedAddressRequestKey, items],
  );
  const sessionRequestResultRef = useRef(sessionRequestResult);
  const currentRequestKey = requestResult.success ? createCheckoutRequestKey(requestResult.data, authMode) : null;
  const debouncedRequestKey = useDebouncedValue(currentRequestKey, 400);
  const isQuoteCurrent = quoteState.key === currentRequestKey;

  useEffect(() => {
    sessionRequestResultRef.current = sessionRequestResult;
  }, [sessionRequestResult]);

  useEffect(() => {
    if (auth.status !== 'customer' || !auth.email) {
      return;
    }

    form.setValue('email', auth.email, { shouldDirty: false, shouldValidate: true });

    if (!form.getFieldState('phone').isDirty && !form.getValues('phone') && auth.profile?.phone) {
      form.setValue('phone', auth.profile.phone, { shouldDirty: false, shouldValidate: true });
    }

    if (!form.getFieldState('shippingAddress.fullName').isDirty && !form.getValues('shippingAddress.fullName')) {
      const fullName = [auth.profile?.firstName, auth.profile?.lastName].filter(Boolean).join(' ');
      if (fullName) {
        form.setValue('shippingAddress.fullName', fullName, { shouldDirty: false, shouldValidate: true });
      }
    }
  }, [auth.email, auth.profile, auth.status, form]);
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

      setConfirmedAddressRequestKey(createUnconfirmedCheckoutRequestKey(requestToConfirm, authMode));
      setPendingConfirmedCheckoutKey(
        source === 'session'
          ? createCheckoutRequestKey(confirmedRequest, authMode)
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
  }, [acceptedSuggestedAddress, authMode, baseRequestResult]);

  const { mutation: createCheckoutQuote } = useCustomizeMutation<
    CheckoutQuoteData,
    CheckoutQuoteRequest
  >({
    mutationFn: (data) => auth.status === 'customer'
      ? MutationConfigs.createAuthenticatedCheckoutQuote(data)
      : MutationConfigs.createCheckoutQuote(data),
  });

  const handleCheckoutSessionSuccess = useCallback(() => {
    checkoutSessionSucceededRef.current = true;
    setHasCheckoutSessionSucceeded(true);
    setFormErrorMessage(null);
    setAddressConfirmation(null);
    setPendingConfirmedCheckoutKey(null);
  }, []);

  useEffect(() => {
    if (!debouncedRequestKey || !isAuthResolved) {
      return;
    }

    const request = (JSON.parse(debouncedRequestKey) as { request: CheckoutQuoteRequest }).request;
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
          if (isCancelled || checkoutSessionSucceededRef.current) {
            return;
          }

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
            && sessionRequestResultRef.current.success
          ) {
            setPendingConfirmedCheckoutKey(null);
            startCheckout(sessionRequestResultRef.current.data as CheckoutSessionRequest, {
              onAddressConfirmationRequired: (suggestedAddress, sessionRequest) => {
                handleAddressConfirmationRequired('session', suggestedAddress, sessionRequest);
              },
              onSessionSuccess: handleCheckoutSessionSuccess,
              onAuthEmailMismatch: () => {
                setFormErrorMessage('Checkout must use the verified email for this signed-in account. Refresh your session or sign in again.');
                form.setFocus('email');
              },
            });
          }
        },
        onError: (error) => {
          if (isCancelled || checkoutSessionSucceededRef.current) {
            return;
          }

          if (getApiErrorCode(error) === 'AUTH_CHECKOUT_EMAIL_MISMATCH') {
            setQuoteState({
              data: null,
              errorMessage: 'Checkout must use the verified email for this signed-in account. Refresh your session or sign in again.',
              key: debouncedRequestKey,
              status: 'error',
            });
            form.setFocus('email');
            return;
          }

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
            errorMessage: getCheckoutQuoteErrorMessage(
              error as AxiosError<IBaseApiResponse<unknown>>,
            ),
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
    handleCheckoutSessionSuccess,
    isAuthResolved,
    form,
    pendingConfirmedCheckoutKey,
    startCheckout,
  ]);

  const canCheckout = isAuthResolved && !addressConfirmation && isCheckoutReady({
    currentRequestKey,
    hasHydrated,
    invalidItemCount: invalidItems.length,
    isCheckingOut,
    itemCount: items.length,
    quoteState,
    requestIsValid: requestResult.success && sessionRequestResult.success,
  });
  const blockingMessage = hasCheckoutSessionSucceeded
    ? checkoutErrorMessage
    : formErrorMessage
      || (isQuoteCurrent ? quoteState.errorMessage : null)
      || authBlockingMessage
      || checkoutErrorMessage;

  function clearAddressConfirmationForManualEdit() {
    checkoutSessionSucceededRef.current = false;
    setHasCheckoutSessionSucceeded(false);
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
      customerNote: currentValues.customerNote ?? '',
      email: currentValues.email ?? '',
      firstName: accountNames?.firstName ?? null,
      lastName: accountNames?.lastName ?? null,
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
    const nextBaseRequest = buildCheckoutRequest(items, nextCustomerInput, {
      includeCustomerNote: false,
    });
    const nextConfirmedRequest = buildCheckoutRequest(items, nextCustomerInput, {
      confirmedAddress: true,
      includeCustomerNote: false,
    });

    if (!nextBaseRequest.success || !nextConfirmedRequest.success) {
      setFormErrorMessage('Enter a valid Canadian shipping address and wait for the latest checkout quote.');
      return;
    }

    setConfirmedAddressRequestKey(createCheckoutRequestKey(nextBaseRequest.data, authMode));
    setAcceptedSuggestedAddress(suggestedAddress);
    setPendingConfirmedCheckoutKey(
      addressConfirmation.source === 'session'
        ? createCheckoutRequestKey(nextConfirmedRequest.data, authMode)
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
    if (!sessionRequestResult.success) {
      setFormErrorMessage(sessionRequestResult.message);
      return;
    }

    if (!canCheckout) {
      setFormErrorMessage('Enter a valid Canadian shipping address and wait for the latest checkout quote.');
      return;
    }

    checkoutSessionSucceededRef.current = false;
    setHasCheckoutSessionSucceeded(false);

    startCheckout(sessionRequestResult.data as CheckoutSessionRequest, {
      onAddressConfirmationRequired: (suggestedAddress, request) => {
        handleAddressConfirmationRequired('session', suggestedAddress, request);
      },
      onSessionSuccess: handleCheckoutSessionSuccess,
      onAuthEmailMismatch: () => {
        setFormErrorMessage('Checkout must use the verified email for this signed-in account. Refresh your session or sign in again.');
        form.setFocus('email');
      },
    });
  }

  const quote = quoteState.status === 'success' && isQuoteCurrent ? quoteState.data : null;
  const summary = props.summary ?? getCartSummary();
  const isQuotePending = Boolean(
    currentRequestKey
    && (!isQuoteCurrent || quoteState.status === 'pending'),
  );
  const didQuoteRefreshPrices = Boolean(
    quote && quote.subtotalCents !== summary.subtotalCents,
  );

  return (
    <>
      <form
        className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,40rem)_22rem] lg:items-start xl:grid-cols-[minmax(0,42rem)_23rem]"
        data-testid="cart-checkout-layout"
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(handleSubmitCheckout)(event);
        }}
      >
        <div className="space-y-6">
          {props.children}

          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm" aria-label="Checkout details">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Checkout details</h2>
              {auth.status === 'signedOut' ? (
                <p className="text-sm text-muted-foreground">
                  <Link href="/account/sign-in?next=%2Fcart" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                    Sign in for order history
                  </Link>
                </p>
              ) : null}
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
                          disabled={isCheckingOut || auth.status === 'customer'}
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

              <p className="text-sm leading-6 text-muted-foreground">
                We ship within Canada only.
              </p>

              <AddressConfirmationPrompt
                confirmation={addressConfirmation}
                onAccept={handleAcceptSuggestedAddress}
                onEdit={handleEditSuggestedAddress}
              />

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
                        onManualAddressChanged={clearAddressConfirmationForManualEdit}
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
                          if (values.line2) {
                            form.setValue('shippingAddress.line2', values.line2, { shouldDirty: true, shouldValidate: true });
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

              <CheckoutCustomerNoteField
                control={form.control}
                disabled={isCheckingOut}
                noteLength={customerNoteLength}
              />
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

          {didQuoteRefreshPrices ? (
            <p
              className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              role="status"
            >
              Prices were refreshed to the current total.
            </p>
          ) : null}

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

      <CheckoutHandoffOverlayMount isActive={isCheckingOut} />

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
