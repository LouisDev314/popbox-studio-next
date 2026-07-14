'use client';

import { type ReactNode } from 'react';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { RouteScrollManager } from '@/components/navigation/route-scroll-manager';

interface IAppProvidersProps {
  children: ReactNode;
}

export function AppProviders(props: IAppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ReactQueryProvider>
        <RouteScrollManager />
        {props.children}
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
