import type { Metadata } from 'next';
import CheckoutPageClient from './page-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Checkout',
  description: 'Complete your PopBox Studio order through secure Stripe checkout.',
  path: '/checkout',
  noIndex: true,
});

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
