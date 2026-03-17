import { StoreHeader } from '@/components/layout/store-header';
import { StoreFooter } from '@/components/layout/store-footer';
import { Suspense, type ReactNode } from 'react';

interface IStoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout(props: IStoreLayoutProps) {
  return (
    <>
      <Suspense fallback={<div aria-hidden="true" className="h-16" />}>
        <StoreHeader />
      </Suspense>
      <main className="flex-1 w-full flex flex-col">
        {props.children}
      </main>
      <StoreFooter />
    </>
  );
}
