'use client';

import { captureMessage } from '@sentry/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import getPublicEnvConfig from '@/configs/public-env';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { type ShippingAddress } from '@/interfaces/checkout';
import {
  normalizeGooglePlaceToShippingAddress,
  type GoogleAddressComponent,
} from '@/utils/google-address';

type NormalizedGoogleShippingAddress = Partial<Pick<
  ShippingAddress,
  'city' | 'countryCode' | 'line1' | 'postalCode' | 'province'
>> & {
  line2?: string;
};

type GoogleAutocompleteStatus = 'error' | 'idle' | 'ready';

interface IGooglePlace {
  addressComponents?: GoogleAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<void>;
}

interface IGooglePlacePrediction {
  placeId?: string;
  text?: {
    toString: () => string;
  };
  toPlace: () => IGooglePlace;
}

interface IGoogleAutocompleteSuggestion {
  placePrediction?: IGooglePlacePrediction;
}

interface IGoogleAutocompleteRequest {
  includedRegionCodes: string[];
  input: string;
  language: 'en-CA';
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

interface IGoogleMapsNamespace {
  __ib__?: () => void;
  importLibrary?: (libraryName: 'places') => Promise<IGooglePlacesLibrary>;
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
    google?: {
      maps?: IGoogleMapsNamespace;
    };
  }
}

export interface GoogleAddressAutocompleteOption {
  description: string;
  id: string;
  placePrediction: IGooglePlacePrediction;
}

const MIN_AUTOCOMPLETE_INPUT_LENGTH = 4;
const AUTOCOMPLETE_DEBOUNCE_MS = 250;

function installGoogleMapsImportLibrary(apiKey: string): void {
  if (window.google?.maps?.importLibrary) {
    return;
  }

  const googleContainer = window.google ?? (window.google = {});
  const mapsContainer = googleContainer.maps ?? (googleContainer.maps = {});
  const requestedLibraries = new Set<'places'>();
  const searchParams = new URLSearchParams();
  let scriptLoadPromise: Promise<void> | null = null;

  const loadScript = () => {
    if (scriptLoadPromise) {
      return scriptLoadPromise;
    }

    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');

      searchParams.set('key', apiKey);
      searchParams.set('v', 'weekly');
      searchParams.set('loading', 'async');
      searchParams.set('libraries', Array.from(requestedLibraries).join(','));
      searchParams.set('callback', 'google.maps.__ib__');

      mapsContainer.__ib__ = resolve;
      script.async = true;
      script.dataset.popboxGooglePlaces = 'true';
      script.src = `https://maps.googleapis.com/maps/api/js?${searchParams.toString()}`;
      script.addEventListener('error', () => {
        scriptLoadPromise = null;
        reject(new Error('Google Maps JavaScript API failed to load.'));
      }, { once: true });

      document.head.appendChild(script);
    });

    return scriptLoadPromise;
  };

  const bootstrapImportLibrary: IGoogleMapsNamespace['importLibrary'] = (libraryName) => {
    requestedLibraries.add(libraryName);

    return loadScript().then(() => {
      const importLibrary = window.google?.maps?.importLibrary;

      if (!importLibrary || importLibrary === bootstrapImportLibrary) {
        throw new Error('Google Maps JavaScript API loaded without importLibrary.');
      }

      return importLibrary(libraryName);
    });
  };

  mapsContainer.importLibrary = bootstrapImportLibrary;
}

async function loadGooglePlacesLibrary(apiKey: string): Promise<IGooglePlacesLibrary> {
  installGoogleMapsImportLibrary(apiKey);

  const importLibrary = window.google?.maps?.importLibrary;

  if (!importLibrary) {
    throw new Error('Google Maps importLibrary is unavailable.');
  }

  const placesLibrary = await importLibrary('places');

  if (
    typeof placesLibrary.AutocompleteSessionToken !== 'function'
    || typeof placesLibrary.AutocompleteSuggestion?.fetchAutocompleteSuggestions !== 'function'
  ) {
    throw new Error('Google Places Autocomplete Data API is unavailable.');
  }

  return placesLibrary;
}

function getPredictionDescription(placePrediction: IGooglePlacePrediction): string {
  return placePrediction.text?.toString().trim() ?? '';
}

const PLACES_TIMEOUT_MS = 3000;
const SUGGESTIONS_UNAVAILABLE = 'Address suggestions are unavailable. You can enter your address manually.';
type PlacesOperation = 'places_autocomplete' | 'place_details';
type PlacesFailure = 'quota' | 'billing' | 'authentication' | 'timeout' | 'unavailable';
const cooldowns = new Map<PlacesOperation, number>();

function classifyFailure(error: unknown): PlacesFailure {
  const code = typeof error === 'object' && error && 'code' in error ? error.code : null;
  if (code === 'TIMEOUT' || code === 'DEADLINE_EXCEEDED') return 'timeout';
  if (code === 'BILLING_DISABLED' || code === 'BillingNotEnabledMapError') return 'billing';
  if (code === 'RESOURCE_EXHAUSTED' || code === 'OVER_QUERY_LIMIT' || code === 'OverQuotaMapError') return 'quota';
  if (['REQUEST_DENIED', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'AUTH_FAILURE'].some((value) => value === code)) return 'authentication';
  return 'unavailable';
}

function blockPlaces(operation: PlacesOperation, error: unknown) {
  const failure = classifyFailure(error);
  const duration = failure === 'quota' || failure === 'billing' || failure === 'authentication'
    ? 24 * 60 * 60 * 1000 : 30_000;
  const expiresAt = Date.now() + duration;
  try {
    window.sessionStorage.setItem(`popbox-google:${operation}`, String(expiresAt));
  } catch {
    cooldowns.set(operation, expiresAt);
  }
  captureMessage('Google Places unavailable', { level: 'warning', tags: { operation, failure }, fingerprint: [operation, failure] });
}

function placesBlocked(operation: PlacesOperation) {
  if ((cooldowns.get(operation) ?? 0) > Date.now()) return true;
  try { return Number(window.sessionStorage.getItem(`popbox-google:${operation}`)) > Date.now(); } catch { return false; }
}

async function withPlacesDeadline<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject({ code: 'TIMEOUT' }), PLACES_TIMEOUT_MS);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

export function useGoogleAddressAutocomplete(params: { disabled: boolean; active: boolean; input: string }) {
  const apiKey = getPublicEnvConfig().googleMapsApiKey;
  const placesLibraryRef = useRef<IGooglePlacesLibrary | null>(null);
  const sessionTokenRef = useRef<unknown | null>(null);
  const requestSequenceRef = useRef(0);
  const selectionSequenceRef = useRef(0);
  const selectionPendingRef = useRef<number | null>(null);
  const requestedInputsRef = useRef(new Set<string>());
  const suppressedInputsRef = useRef(new Set<string>());
  const [status, setStatus] = useState<GoogleAutocompleteStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GoogleAddressAutocompleteOption[]>([]);
  const input = params.input.trim().replace(/\s+/g, ' ');
  const debouncedInput = useDebouncedValue(input, AUTOCOMPLETE_DEBOUNCE_MS);
  const eligible = params.active && !params.disabled && input.length >= MIN_AUTOCOMPLETE_INPUT_LENGTH;

  const clearSuggestions = useCallback(() => {
    requestSequenceRef.current += 1;
    selectionSequenceRef.current += 1;
    selectionPendingRef.current = null;
    setSuggestions([]);
  }, []);

  const endSearch = useCallback(() => {
    clearSuggestions();
    sessionTokenRef.current = null;
    requestedInputsRef.current.clear();
  }, [clearSuggestions]);

  const resetSelectionSuppression = useCallback(() => {
    clearSuggestions();
    suppressedInputsRef.current.clear();
  }, [clearSuggestions]);

  useEffect(() => {
    if (!eligible) endSearch();
  }, [eligible, endSearch]);

  useEffect(() => () => {
    requestSequenceRef.current += 1;
    selectionSequenceRef.current += 1;
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const previousAuthFailure = window.gm_authFailure;
    const onAuthFailure = () => {
      previousAuthFailure?.();
      blockPlaces('places_autocomplete', { code: 'AUTH_FAILURE' });
      endSearch();
      setStatus('error');
      setErrorMessage(SUGGESTIONS_UNAVAILABLE);
    };
    window.gm_authFailure = onAuthFailure;
    return () => {
      if (window.gm_authFailure === onAuthFailure) window.gm_authFailure = previousAuthFailure;
    };
  }, [apiKey, endSearch]);

  const shouldLoad = eligible && status === 'idle';
  useEffect(() => {
    if (!shouldLoad) return;
    if (!apiKey || placesBlocked('places_autocomplete')) {
      setStatus('error');
      setErrorMessage(SUGGESTIONS_UNAVAILABLE);
      return;
    }

    let current = true;
    void withPlacesDeadline(loadGooglePlacesLibrary(apiKey)).then((library) => {
      if (!current || placesBlocked('places_autocomplete')) return;
      placesLibraryRef.current = library;
      setStatus('ready');
    }).catch((error: unknown) => {
      if (!current || placesBlocked('places_autocomplete')) return;
      blockPlaces('places_autocomplete', error);
      setStatus('error');
      setErrorMessage(SUGGESTIONS_UNAVAILABLE);
    });
    return () => {
      current = false;
    };
  }, [apiKey, endSearch, shouldLoad]);

  useEffect(() => {
    const library = placesLibraryRef.current;
    if (input !== debouncedInput) requestSequenceRef.current += 1;
    if (!eligible || input !== debouncedInput || status !== 'ready' || !library || selectionPendingRef.current !== null ||
      suppressedInputsRef.current.has(input) || requestedInputsRef.current.has(input.toUpperCase())) return;
    if (placesBlocked('places_autocomplete') || placesBlocked('place_details')) {
      setErrorMessage(SUGGESTIONS_UNAVAILABLE);
      return;
    }

    const id = ++requestSequenceRef.current;
    requestedInputsRef.current.add(input.toUpperCase());
    const sessionToken = sessionTokenRef.current ?? new library.AutocompleteSessionToken();
    sessionTokenRef.current = sessionToken;
    setErrorMessage(null);

    void withPlacesDeadline(Promise.resolve().then(() => library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input, includedRegionCodes: ['ca'], language: 'en-CA', region: 'ca', sessionToken,
    }))).then((response) => {
      if (requestSequenceRef.current !== id) return;
      const seen = new Set<string>();
      setSuggestions((response.suggestions ?? []).flatMap(({ placePrediction }) => {
        const description = placePrediction && getPredictionDescription(placePrediction);
        if (!placePrediction || !description) return [];
        const optionId = placePrediction.placeId ?? description;
        if (seen.has(optionId)) return [];
        seen.add(optionId);
        return [{ id: optionId, description, placePrediction }];
      }));
    }).catch((error: unknown) => {
      if (requestSequenceRef.current !== id) return;
      blockPlaces('places_autocomplete', error);
      endSearch();
      setErrorMessage(SUGGESTIONS_UNAVAILABLE);
    });
  }, [debouncedInput, eligible, endSearch, input, status]);

  const selectSuggestion = useCallback(async (suggestion: GoogleAddressAutocompleteOption): Promise<NormalizedGoogleShippingAddress | null> => {
    if (selectionPendingRef.current !== null || !sessionTokenRef.current || placesBlocked('place_details')) return null;
    endSearch();
    const id = selectionSequenceRef.current;
    selectionPendingRef.current = id;
    try {
      const place = suggestion.placePrediction.toPlace();
      await withPlacesDeadline(place.fetchFields({ fields: ['addressComponents'] }));
      if (selectionSequenceRef.current !== id) return null;
      const address = normalizeGooglePlaceToShippingAddress({ addressComponents: place.addressComponents, fallbackDescription: suggestion.description });
      suppressedInputsRef.current = new Set([suggestion.description, address.line1].flatMap((value) => value ? [value.trim()] : []));
      return address;
    } catch (error) {
      if (selectionSequenceRef.current === id) {
        blockPlaces('place_details', error);
        setErrorMessage(SUGGESTIONS_UNAVAILABLE);
      }
      return null;
    } finally {
      if (selectionPendingRef.current === id) selectionPendingRef.current = null;
    }
  }, [endSearch]);

  return { endSearch, errorMessage, resetSelectionSuppression, selectSuggestion, suggestions };
}
