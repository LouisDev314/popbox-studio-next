'use client';

import { type ReactNode } from 'react';
import { ReactQueryProvider } from '@/components/react-query-provider';
import { ThemeProvider } from '@/components/theme-provider';

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
        {props.children}
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
