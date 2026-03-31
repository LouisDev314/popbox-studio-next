import type { Metadata } from 'next';
import CartPageClient from './page-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Cart',
  description: 'Review the items in your PopBox Studio cart before checkout.',
  path: '/cart',
  noIndex: true,
});

export default function CartPage() {
  return <CartPageClient />;
}
