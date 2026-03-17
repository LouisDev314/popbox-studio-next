import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import './globals.css';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'PopBox Studio',
  description: 'Premium Collectibles and Ichiban Kuji',
};

interface IRootLayoutProps {
  children: ReactNode;
}

export default function RootLayout(props: Readonly<IRootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            {props.children}
          </ReactQueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
