'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

interface IThemeProviderProps extends Omit<ComponentProps<typeof NextThemesProvider>, 'children'> {
  children: ReactNode;
}

export function ThemeProvider(props: IThemeProviderProps) {
  const { children, ...themeProviderProps } = props;

  return <NextThemesProvider {...themeProviderProps}>{children}</NextThemesProvider>;
}
