'use client';

import Script from 'next/script';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
  deactivateGoogleAnalytics,
  initializeGoogleAnalytics,
  trackPageView,
} from '@/lib/analytics';

const ANALYTICS_CONSENT_STORAGE_KEY = 'popbox_analytics_consent';
const ANALYTICS_CONSENT_EVENT = 'popbox:analytics-consent';

type TAnalyticsConsent = 'accepted' | 'declined' | null;

interface IGoogleAnalyticsProps {
  debugMode: boolean;
  measurementId: string;
}

function readConsent(): TAnalyticsConsent {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener(ANALYTICS_CONSENT_EVENT, onStoreChange);
  return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onStoreChange);
}

function GoogleAnalyticsPageViews(props: IGoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastRouteKey = useRef<string | null>(null);

  useEffect(() => {
    initializeGoogleAnalytics(props.measurementId, props.debugMode);

    const routeKey = `${pathname}?${searchParams.toString()}`;

    if (lastRouteKey.current === routeKey) {
      return;
    }

    lastRouteKey.current = routeKey;
    trackPageView(pathname);
  }, [pathname, props.debugMode, props.measurementId, searchParams]);

  useEffect(() => () => deactivateGoogleAnalytics(), []);

  return null;
}

function useAnalyticsConsent(): TAnalyticsConsent {
  return useSyncExternalStore(
    subscribeToConsent,
    readConsent,
    () => null,
  );
}

export function OperationalAnalytics() {
  const consent = useAnalyticsConsent();

  return consent === 'accepted' ? (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  ) : null;
}

function AnalyticsConsentBanner(props: { onConsent: (consent: Exclude<TAnalyticsConsent, null>) => void }) {
  return (
    <div
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5"
      role="dialog"
      aria-label="Analytics cookie preferences"
    >
      <p className="text-sm leading-6 text-foreground">
        We use optional analytics to improve our website and shopping experience. No personal information will be collected.
        {' '}
        <Link href="/legal/privacy" className="underline underline-offset-4">
          Privacy policy
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5"
          onClick={() => props.onConsent('declined')}
        >
          Decline
        </Button>
        <Button
          type="button"
          className="h-10 rounded-full px-5"
          onClick={() => props.onConsent('accepted')}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}

export function GoogleAnalytics(props: IGoogleAnalyticsProps) {
  const consent = useAnalyticsConsent();

  const updateConsent = (nextConsent: Exclude<TAnalyticsConsent, null>) => {
    try {
      window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, nextConsent);
    } catch {
      // Consent remains valid for this page even when persistent storage is unavailable.
    }

    window.dispatchEvent(new Event(ANALYTICS_CONSENT_EVENT));
  };

  return (
    <>
      {consent === null ? <AnalyticsConsentBanner onConsent={updateConsent} /> : null}
      {consent === 'accepted' ? (
        <>
          <Script
            id="popbox-google-analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(props.measurementId)}`}
            strategy="afterInteractive"
          />
          <GoogleAnalyticsPageViews {...props} />
        </>
      ) : null}
    </>
  );
}
