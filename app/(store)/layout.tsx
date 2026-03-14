import { StoreHeader } from '@/components/layout/store-header';
import { StoreFooter } from '@/components/layout/store-footer';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHeader />
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
      <StoreFooter />
    </>
  );
}
