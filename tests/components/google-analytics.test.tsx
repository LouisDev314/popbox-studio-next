import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GoogleAnalytics,
  OperationalAnalytics,
} from '@/components/analytics/google-analytics';

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/checkout/success',
  useSearchParams: () => new URLSearchParams('session_id=private-stripe-session'),
}));

vi.mock('next/script', () => ({
  default: ({ id, src }: { id: string; src: string }) => <div data-script-id={id} data-script-src={src} />,
}));

describe('GoogleAnalytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__popboxGaInitialized;
    delete window.__popboxGaReady;
    delete window.__popboxGaStorefrontActive;
    delete window.gtag;
    window.dataLayer = [];
  });

  it('waits for analytics consent and renders the GA script exactly once after acceptance', () => {
    const { container, rerender } = render(
      <GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />,
    );

    expect(screen.getByRole('dialog', { name: 'Analytics cookie preferences' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-script-id="popbox-google-analytics"]')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    rerender(<GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />);

    expect(container.querySelectorAll('[data-script-id="popbox-google-analytics"]')).toHaveLength(1);
  });

  it('keeps private checkout query parameters out of manual page-view payloads', () => {
    window.localStorage.setItem('popbox_analytics_consent', 'accepted');
    render(<GoogleAnalytics debugMode={true} measurementId="G-N3TZG44VCT" />);

    const queuedCommands = (window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));
    const pageView = queuedCommands.find((entry) => entry[0] === 'event' && entry[1] === 'page_view');

    expect(pageView?.[2]).toMatchObject({
      page_location: 'http://localhost:3000/checkout/success',
      page_path: '/checkout/success',
    });
    expect(JSON.stringify(pageView)).not.toContain('private-stripe-session');
  });

  it('deactivates GA4 when the storefront analytics lifecycle unmounts', () => {
    window.localStorage.setItem('popbox_analytics_consent', 'accepted');
    const { unmount } = render(
      <GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />,
    );

    expect(window.__popboxGaStorefrontActive).toBe(true);
    unmount();

    expect(window.__popboxGaStorefrontActive).toBe(false);
    expect(window.__popboxGaReady).toBe(false);
  });

  it('keeps operational monitoring consent-aware without rendering another banner', () => {
    const { rerender } = render(<OperationalAnalytics />);

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('speed-insights')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    window.localStorage.setItem('popbox_analytics_consent', 'accepted');
    fireEvent(window, new Event('popbox:analytics-consent'));
    rerender(<OperationalAnalytics />);

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('speed-insights')).toBeInTheDocument();
  });
});
