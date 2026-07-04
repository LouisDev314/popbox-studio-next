import { describe, expect, it } from 'vitest';
import { normalizeGooglePlaceToShippingAddress } from '@/utils/google-address';

describe('normalizeGooglePlaceToShippingAddress', () => {
  it('maps Canadian address components to the checkout shipping address contract', () => {
    expect(normalizeGooglePlaceToShippingAddress({
      addressComponents: [
        { long_name: '123', short_name: '123', types: ['street_number'] },
        { long_name: 'Maple Street', short_name: 'Maple St', types: ['route'] },
        { long_name: 'Vancouver', short_name: 'Vancouver', types: ['locality'] },
        { long_name: 'British Columbia', short_name: 'BC', types: ['administrative_area_level_1'] },
        { long_name: 'V6B 1A1', short_name: 'V6B 1A1', types: ['postal_code'] },
        { long_name: 'Canada', short_name: 'CA', types: ['country'] },
      ],
      fallbackDescription: '123 Maple Street, Vancouver, BC, Canada',
    })).toEqual({
      city: 'Vancouver',
      countryCode: 'CA',
      line1: '123 Maple Street',
      postalCode: 'V6B 1A1',
      province: 'BC',
    });
  });

  it('falls back to postal town or administrative area level 3 when locality is missing', () => {
    expect(normalizeGooglePlaceToShippingAddress({
      addressComponents: [
        { long_name: '456', short_name: '456', types: ['street_number'] },
        { long_name: 'Queen Street West', short_name: 'Queen St W', types: ['route'] },
        { long_name: 'Toronto', short_name: 'Toronto', types: ['postal_town'] },
        { long_name: 'Ontario', short_name: 'ON', types: ['administrative_area_level_1'] },
        { long_name: 'Canada', short_name: 'CA', types: ['country'] },
      ],
      fallbackDescription: '456 Queen Street West',
    }).city).toBe('Toronto');

    expect(normalizeGooglePlaceToShippingAddress({
      addressComponents: [
        { long_name: '789', short_name: '789', types: ['street_number'] },
        { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
        { long_name: 'Calgary', short_name: 'Calgary', types: ['administrative_area_level_3'] },
        { long_name: 'Alberta', short_name: 'AB', types: ['administrative_area_level_1'] },
        { long_name: 'Canada', short_name: 'CA', types: ['country'] },
      ],
      fallbackDescription: '789 Main Street',
    }).city).toBe('Calgary');
  });

  it('omits non-Canadian country and invalid province values', () => {
    expect(normalizeGooglePlaceToShippingAddress({
      addressComponents: [
        { long_name: '123', short_name: '123', types: ['street_number'] },
        { long_name: 'Pine Street', short_name: 'Pine St', types: ['route'] },
        { long_name: 'Seattle', short_name: 'Seattle', types: ['locality'] },
        { long_name: 'Washington', short_name: 'WA', types: ['administrative_area_level_1'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] },
      ],
      fallbackDescription: '123 Pine Street, Seattle, WA, USA',
    })).toEqual({
      city: 'Seattle',
      line1: '123 Pine Street',
    });
  });

  it('uses the fallback description for line1 when street components are missing', () => {
    expect(normalizeGooglePlaceToShippingAddress({
      addressComponents: [
        { long_name: 'Montreal', short_name: 'Montreal', types: ['locality'] },
        { long_name: 'Quebec', short_name: 'QC', types: ['administrative_area_level_1'] },
        { long_name: 'Canada', short_name: 'CA', types: ['country'] },
      ],
      fallbackDescription: 'Complex Place, Montreal, QC, Canada',
    }).line1).toBe('Complex Place, Montreal, QC, Canada');
  });
});
