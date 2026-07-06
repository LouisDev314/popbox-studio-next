'use client';

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

type GoogleAutocompleteStatus = 'error' | 'idle' | 'loading' | 'ready';

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

export function useGoogleAddressAutocomplete(params: {
  disabled: boolean;
  input: string;
}) {
  const apiKey = getPublicEnvConfig().googleMapsApiKey;
  const placesLibraryRef = useRef<IGooglePlacesLibrary | null>(null);
  const sessionTokenRef = useRef<unknown | null>(null);
  const requestSequenceRef = useRef(0);
  const suppressedInputsRef = useRef<Set<string>>(new Set());
  const isSelectingRef = useRef(false);
  const debouncedInput = useDebouncedValue(params.input, AUTOCOMPLETE_DEBOUNCE_MS);
  const [status, setStatus] = useState<GoogleAutocompleteStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GoogleAddressAutocompleteOption[]>([]);

  const refreshSessionToken = useCallback(() => {
    const placesLibrary = placesLibraryRef.current;

    if (!placesLibrary) {
      sessionTokenRef.current = null;
      return null;
    }

    const sessionToken = new placesLibrary.AutocompleteSessionToken();

    sessionTokenRef.current = sessionToken;
    return sessionToken;
  }, []);

  const clearSuggestions = useCallback(() => {
    requestSequenceRef.current += 1;
    setSuggestions([]);
  }, []);

  const resetSelectionSuppression = useCallback(() => {
    suppressedInputsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setStatus('error');
      setErrorMessage('Google Maps API key is not configured.');
      return;
    }

    let isMounted = true;

    setStatus('loading');
    setErrorMessage(null);

    loadGooglePlacesLibrary(apiKey)
      .then((placesLibrary) => {
        if (!isMounted) {
          return;
        }

        placesLibraryRef.current = placesLibrary;
        refreshSessionToken();
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        placesLibraryRef.current = null;
        sessionTokenRef.current = null;
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Google Places autocomplete is unavailable.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey, refreshSessionToken]);

  useEffect(() => {
    const input = debouncedInput.trim();
    const placesLibrary = placesLibraryRef.current;

    if (input.length < MIN_AUTOCOMPLETE_INPUT_LENGTH) {
      clearSuggestions();
      return;
    }

    if (
      params.disabled
      || status !== 'ready'
      || !placesLibrary
      || isSelectingRef.current
      || suppressedInputsRef.current.has(input)
    ) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;

    requestSequenceRef.current = requestId;
    setErrorMessage(null);

    const sessionToken = sessionTokenRef.current ?? refreshSessionToken();

    if (!sessionToken) {
      setSuggestions([]);
      return;
    }

    placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      includedRegionCodes: ['ca'],
      language: 'en-CA',
      region: 'ca',
      sessionToken,
    })
      .then((response) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }

        setSuggestions(
          response.suggestions
            ?.map((suggestion, index) => {
              const placePrediction = suggestion.placePrediction;

              if (!placePrediction) {
                return null;
              }

              const description = getPredictionDescription(placePrediction);

              if (!description) {
                return null;
              }

              return {
                description,
                id: placePrediction.placeId ?? `${description}-${index}`,
                placePrediction,
              };
            })
            .filter((suggestion): suggestion is GoogleAddressAutocompleteOption => Boolean(suggestion)) ?? [],
        );
      })
      .catch((error: unknown) => {
        if (requestSequenceRef.current !== requestId) {
          return;
        }

        setSuggestions([]);
        setErrorMessage(error instanceof Error ? error.message : 'Google address suggestions are unavailable.');
      });
  }, [clearSuggestions, debouncedInput, params.disabled, refreshSessionToken, status]);

  const selectSuggestion = useCallback(async (
    suggestion: GoogleAddressAutocompleteOption,
  ): Promise<NormalizedGoogleShippingAddress> => {
    const placesLibrary = placesLibraryRef.current;
    const description = suggestion.description;

    isSelectingRef.current = true;
    clearSuggestions();

    try {
      const place = suggestion.placePrediction.toPlace();

      await place.fetchFields({ fields: ['addressComponents'] });

      const normalizedAddress = normalizeGooglePlaceToShippingAddress({
        addressComponents: place.addressComponents,
        fallbackDescription: description,
      });
      const suppressedInputs = [description, normalizedAddress.line1]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length >= MIN_AUTOCOMPLETE_INPUT_LENGTH));

      suppressedInputsRef.current = new Set(suppressedInputs);

      return normalizedAddress;
    } finally {
      isSelectingRef.current = false;

      if (placesLibrary) {
        refreshSessionToken();
      }
    }
  }, [clearSuggestions, refreshSessionToken]);

  return {
    clearSuggestions,
    errorMessage,
    resetSelectionSuppression,
    selectSuggestion,
    status,
    suggestions,
  };
}
