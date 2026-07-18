import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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

  it('renders nothing before the persisted consent check can run', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const html = renderToString(
      <GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />,
    );

    expect(html).not.toContain('Analytics cookie preferences');
    expect(html).not.toContain('popbox-google-analytics');
    expect(getItem).not.toHaveBeenCalled();
  });

  it.each(['accepted', 'declined'] as const)('never displays the banner for stored %s consent', (consent) => {
    window.localStorage.setItem('popbox_analytics_consent', consent);
    render(<GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />);

    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
  });

  it.each([null, 'invalid', 'legacy-value'])('displays the banner after hydrating %s stored consent', (consent) => {
    if (consent !== null) {
      window.localStorage.setItem('popbox_analytics_consent', consent);
    }

    render(<GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />);

    expect(screen.getByRole('dialog', { name: 'Analytics cookie preferences' })).toBeInTheDocument();
  });

  it('persists accepted consent, hides the banner immediately, and enables analytics', () => {
    const { container } = render(
      <GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(window.localStorage.getItem('popbox_analytics_consent')).toBe('accepted');
    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-script-id="popbox-google-analytics"]')).toHaveLength(1);
    expect((window.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>))).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(['config', 'G-N3TZG44VCT']),
        expect.arrayContaining(['event', 'page_view']),
      ]),
    );
  });

  it('persists declined consent and hides the banner immediately without enabling analytics', () => {
    const { container } = render(
      <GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(window.localStorage.getItem('popbox_analytics_consent')).toBe('declined');
    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-script-id="popbox-google-analytics"]')).toHaveLength(0);
    expect(window.__popboxGaReady).not.toBe(true);
  });

  it.each(['accepted', 'declined'] as const)('does not flash the banner when remounted with %s consent', (consent) => {
    window.localStorage.setItem('popbox_analytics_consent', consent);

    const firstMount = render(<GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />);
    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
    firstMount.unmount();

    render(<GoogleAnalytics debugMode={false} measurementId="G-N3TZG44VCT" />);
    expect(screen.queryByRole('dialog', { name: 'Analytics cookie preferences' })).not.toBeInTheDocument();
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
