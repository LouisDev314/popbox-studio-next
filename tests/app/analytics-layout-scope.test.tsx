import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StoreLayout from '@/app/(store)/layout';
import AdminLayout from '@/app/(admin)/admin/layout';

vi.mock('@/configs/public-env', () => ({
  default: () => ({
    gaDebugMode: false,
    gaMeasurementId: 'G-N3TZG44VCT',
    isGoogleAnalyticsEnabled: true,
    isSiteOpen: true,
  }),
}));

vi.mock('@/components/analytics/google-analytics', () => ({
  GoogleAnalytics: () => (
    <div aria-label="Analytics cookie preferences" role="dialog" />
  ),
}));

vi.mock('@/components/layout/store-header', () => ({ StoreHeader: () => null }));
vi.mock('@/components/layout/store-footer', () => ({ StoreFooter: () => null }));
vi.mock('@/components/product/product-page-scroll-reset', () => ({ ProductPageScrollReset: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/storefront/storefront-alert-provider', () => ({
  StorefrontAlertProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/admin/admin-auth-provider', () => ({
  AdminAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('analytics layout scope', () => {
  it('mounts the consent banner on storefront routes', () => {
    render(
      <StoreLayout>
        <div>Storefront page</div>
      </StoreLayout>,
    );

    expect(screen.getByRole('dialog', { name: 'Analytics cookie preferences' })).toBeInTheDocument();
  });

  it.each(['/admin', '/admin/login'])('does not mount the consent banner on %s', (route) => {
    render(
      <AdminLayout>
        <div>{route}</div>
      </AdminLayout>,
    );

    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
  });
});
