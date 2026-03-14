import { redirect } from 'next/navigation';

export default function CollectionSlugPage({ params }: { params: { slug: string } }) {
  // Simple store doesn't have a dedicated collection page yet, so we redirect to products filtered
  redirect(`/products?collection=${params.slug}`);
}
