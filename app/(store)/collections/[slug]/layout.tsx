import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getPublicCollections } from '@/lib/api/public-storefront';

type CollectionLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function CollectionLayout(props: CollectionLayoutProps) {
  const { slug } = await props.params;
  let collections: Awaited<ReturnType<typeof getPublicCollections>>;

  try {
    collections = await getPublicCollections();
  } catch {
    return props.children;
  }

  const hasActiveCollection = collections.some(
    (collection) => collection.slug === slug && collection.isActive,
  );

  if (!hasActiveCollection) {
    notFound();
  }

  return props.children;
}
