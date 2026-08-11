import type {
  IFreeShippingProgress,
  IShippingSettings,
  ShippingRegion,
} from '@/interfaces/shipping';

// Public storefront fallbacks are atomic: never combine a partial remote policy
// with local values because that can produce an invalid threshold order.
export const DEFAULT_SHIPPING_SETTINGS: Readonly<IShippingSettings> = Object.freeze({
  flatShippingCents: 1599,
  calgaryFreeShippingThresholdCents: 7700,
  albertaFreeShippingThresholdCents: 8800,
  freeShippingThresholdCents: 14900,
  currency: 'CAD',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function isShippingRegion(value: unknown): value is ShippingRegion {
  return value === 'calgary' || value === 'alberta' || value === 'canada';
}

export function isValidShippingSettings(value: unknown): value is IShippingSettings {
  if (!isRecord(value)) {
    return false;
  }

  const flatShippingCents = value.flatShippingCents;
  const calgaryFreeShippingThresholdCents = value.calgaryFreeShippingThresholdCents;
  const albertaFreeShippingThresholdCents = value.albertaFreeShippingThresholdCents;
  const freeShippingThresholdCents = value.freeShippingThresholdCents;

  if (
    !isNonNegativeInteger(flatShippingCents)
    || !isNonNegativeInteger(calgaryFreeShippingThresholdCents)
    || !isNonNegativeInteger(albertaFreeShippingThresholdCents)
    || !isNonNegativeInteger(freeShippingThresholdCents)
    || value.currency !== 'CAD'
    || calgaryFreeShippingThresholdCents > albertaFreeShippingThresholdCents
    || albertaFreeShippingThresholdCents > freeShippingThresholdCents
  ) {
    return false;
  }

  return true;
}

export function normalizePublicShippingSettings(value: unknown): IShippingSettings {
  if (!isValidShippingSettings(value)) {
    return { ...DEFAULT_SHIPPING_SETTINGS };
  }

  return {
    flatShippingCents: value.flatShippingCents,
    calgaryFreeShippingThresholdCents: value.calgaryFreeShippingThresholdCents,
    albertaFreeShippingThresholdCents: value.albertaFreeShippingThresholdCents,
    freeShippingThresholdCents: value.freeShippingThresholdCents,
    currency: 'CAD',
  };
}

export function calculateFreeShippingProgress(params: {
  eligibleSubtotalCents: number;
  region: unknown;
  thresholdCents: unknown;
}): IFreeShippingProgress | null {
  if (
    !isNonNegativeInteger(params.eligibleSubtotalCents)
    || !isNonNegativeInteger(params.thresholdCents)
    || !isShippingRegion(params.region)
  ) {
    return null;
  }

  const remainingCents = Math.max(
    params.thresholdCents - params.eligibleSubtotalCents,
    0,
  );

  return {
    thresholdCents: params.thresholdCents,
    remainingCents,
    qualified: remainingCents === 0,
    region: params.region,
  };
}
