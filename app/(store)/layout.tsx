import { StoreHeader } from '@/components/layout/store-header';
import { StoreFooter } from '@/components/layout/store-footer';
import { Suspense, type ReactNode } from 'react';
import getPublicEnvConfig from '@/configs/public-env';
import { Toaster } from '@/components/ui/sonner'

interface IStoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout(props: IStoreLayoutProps) {
  if (!getPublicEnvConfig().isSiteOpen) {
    return (
      <main>
        <div className="flex min-h-screen items-center justify-center text-xl">
        🚧 Coming Soon
        </div>
      </main>
    );
  }

  return (
    <>
      <Suspense fallback={<div aria-hidden="true" className="h-16" />}>
        <StoreHeader />
      </Suspense>
      <Toaster />
      <main className="flex-1 w-full flex flex-col">
        {props.children}
      </main>
      <StoreFooter />
    </>
  );
}
