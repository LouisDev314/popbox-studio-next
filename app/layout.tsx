import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import './globals.css';
import { AppProviders } from '@/components/app-providers';
import { Analytics } from '@vercel/analytics/next';
import getPublicEnvConfig from '@/configs/public-env';
import { SpeedInsights } from '@vercel/speed-insights/next'
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_DESCRIPTION,
  getDefaultRobots,
} from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicEnvConfig().siteUrl),
  title: {
    default: 'PopBox Studio | Anime Merchandise, Collectibles & Ichiban Kuji',
    template: '%s | PopBox Studio',
  },
  description: DEFAULT_SITE_DESCRIPTION,
  applicationName: BRAND_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: BRAND_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    siteName: BRAND_NAME,
    locale: 'en_CA',
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: 'PopBox Studio anime collectibles and Ichiban Kuji',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_PATH],
  },
  robots: getDefaultRobots(),
};

interface IRootLayoutProps {
  children: ReactNode;
}

export default function RootLayout(props: Readonly<IRootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <AppProviders>
          {props.children}
        </AppProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
