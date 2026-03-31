import type { Metadata } from 'next';
import ContactPageClient from './contact-page-client';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Contact',
  description:
    'Contact PopBox Studio for order support, shipping questions, product requests, and general inquiries about our anime collectibles store.',
  path: '/contact',
});

export default function ContactPage() {
  return <ContactPageClient />;
}
