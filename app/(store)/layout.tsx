import { StoreHeader } from '@/components/layout/store-header';
import { StoreFooter } from '@/components/layout/store-footer';
import { Suspense, type ReactNode } from 'react';
import getPublicEnvConfig from '@/configs/public-env';
import { StorefrontAlertProvider } from '@/components/storefront/storefront-alert-provider';
import { Toaster } from '@/components/ui/sonner'
import { GoogleAnalytics } from '@/components/analytics/google-analytics';

interface IStoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout(props: IStoreLayoutProps) {
  const publicEnv = getPublicEnvConfig();
  const storefront = !publicEnv.isSiteOpen ? (
    <main>
      <div className="flex min-h-screen items-center justify-center text-xl">
      🚧 Coming Soon
      </div>
    </main>
  ) : (
    <StorefrontAlertProvider>
      <Suspense fallback={<div aria-hidden="true" className="h-16" />}>
        <StoreHeader />
      </Suspense>
      <Toaster />
      <main className="flex-1 w-full flex flex-col">
        {props.children}
      </main>
      <StoreFooter />
    </StorefrontAlertProvider>
  );

  return (
    <>
      {storefront}
      {publicEnv.isGoogleAnalyticsEnabled ? (
        <GoogleAnalytics
          debugMode={publicEnv.gaDebugMode}
          measurementId={publicEnv.gaMeasurementId}
        />
      ) : null}
    </>
  );
}
