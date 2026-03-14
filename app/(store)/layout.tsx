import { StoreHeader } from '@/components/layout/store-header';
import { StoreFooter } from '@/components/layout/store-footer';
import { type ReactNode } from 'react';

interface IStoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout(props: IStoreLayoutProps) {
  return (
    <>
      <StoreHeader />
      <main className="flex-1 w-full flex flex-col">
        {props.children}
      </main>
      <StoreFooter />
    </>
  );
}
