import type { Metadata } from 'next';
import ContactPageClient from './contact-page-client';

export const metadata: Metadata = {
  title: 'Contact - PopBox Studio',
  description: 'Contact PopBox Studio for order support, product requests, and general inquiries.',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
