import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateMetadata } from '@/app/(store)/legal/[slug]/page';
import {
  getPublicLegalDocument,
  getPublicShippingSettings,
} from '@/lib/api/public-storefront';

vi.mock('@/lib/api/public-storefront', () => ({
  getPublicLegalDocument: vi.fn(),
  getPublicShippingSettings: vi.fn(),
  isPublicApiNotFoundError: vi.fn(() => false),
}));

const shippingDocument = {
  id: 'legal-shipping',
  type: 'shipping_returns' as const,
  title: 'Shipping & Returns',
  content: 'Shipping policy content.',
  version: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('shipping policy metadata', () => {
  beforeEach(() => {
    vi.mocked(getPublicLegalDocument).mockResolvedValue(shippingDocument);
    vi.mocked(getPublicShippingSettings).mockResolvedValue({
      flatShippingCents: 1599,
      calgaryFreeShippingThresholdCents: 7700,
      albertaFreeShippingThresholdCents: 8800,
      freeShippingThresholdCents: 14900,
      currency: 'CAD',
    });
  });

  it('describes all settings-derived regional thresholds', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'shipping-returns' }),
    });

    expect(metadata.description).toBe(
      'Canada shipping: $15.99 CAD flat rate, with free shipping from $77.00 in Calgary, $88.00 in Alberta, and $149.00 nationwide.',
    );
  });

  it('uses value-free Canada shipping copy when settings are unavailable', async () => {
    vi.mocked(getPublicShippingSettings).mockRejectedValueOnce(new Error('Settings unavailable'));

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'shipping-returns' }),
    });

    expect(metadata.description).toBe(
      'Review PopBox Studio shipping rates, free-shipping eligibility, and returns information for orders shipped within Canada.',
    );
  });
});
