import { describe, expect, it } from 'vitest';
import {
  calculateFreeShippingProgress,
  DEFAULT_SHIPPING_SETTINGS,
  isValidShippingSettings,
  normalizePublicShippingSettings,
} from '@/utils/shipping';

const settings = {
  flatShippingCents: 1299,
  calgaryFreeShippingThresholdCents: 7500,
  albertaFreeShippingThresholdCents: 8500,
  freeShippingThresholdCents: 14000,
  currency: 'CAD',
} as const;

describe('normalizePublicShippingSettings', () => {
  it('accepts a complete, ordered CAD policy', () => {
    expect(normalizePublicShippingSettings(settings)).toEqual(settings);
  });

  it.each([
    null,
    {},
    { flatShippingCents: 1599, freeShippingThresholdCents: 14900, currency: 'CAD' },
    { ...settings, currency: 'USD' },
    { ...settings, flatShippingCents: -1 },
    { ...settings, calgaryFreeShippingThresholdCents: 8500.5 },
    { ...settings, calgaryFreeShippingThresholdCents: 9000 },
    { ...settings, albertaFreeShippingThresholdCents: 15000 },
  ])('falls back atomically for an invalid or legacy policy', (value) => {
    expect(normalizePublicShippingSettings(value)).toEqual(DEFAULT_SHIPPING_SETTINGS);
  });

  it('exposes strict validation for editable admin settings', () => {
    expect(isValidShippingSettings(settings)).toBe(true);
    expect(isValidShippingSettings({ ...settings, albertaFreeShippingThresholdCents: 15000 })).toBe(false);
  });
});

describe('calculateFreeShippingProgress', () => {
  it.each([
    ['calgary', 7699, 7700, 1, false],
    ['calgary', 7700, 7700, 0, true],
    ['alberta', 8799, 8800, 1, false],
    ['alberta', 8800, 8800, 0, true],
    ['canada', 14899, 14900, 1, false],
    ['canada', 14900, 14900, 0, true],
    ['calgary', 14900, 7700, 0, true],
    ['alberta', 14900, 8800, 0, true],
  ] as const)(
    'calculates %s progress from the backend subtotal and applied threshold',
    (region, eligibleSubtotalCents, thresholdCents, remainingCents, qualified) => {
      expect(calculateFreeShippingProgress({
        eligibleSubtotalCents,
        region,
        thresholdCents,
      })).toEqual({
        thresholdCents,
        remainingCents,
        qualified,
        region,
      });
    },
  );

  it('rejects malformed or unknown quote context', () => {
    expect(calculateFreeShippingProgress({
      eligibleSubtotalCents: 5000,
      region: 'Calgary',
      thresholdCents: 7700,
    })).toBeNull();
    expect(calculateFreeShippingProgress({
      eligibleSubtotalCents: 5000,
      region: 'calgary',
      thresholdCents: -1,
    })).toBeNull();
  });
});
