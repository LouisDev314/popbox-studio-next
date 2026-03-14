import { redirect } from 'next/navigation';

interface ICollectionSlugPageProps {
  params: {
    slug: string;
  };
}

export default function CollectionSlugPage(props: ICollectionSlugPageProps) {
  // Simple store doesn't have a dedicated collection page yet, so we redirect to products filtered
  redirect(`/products?collection=${props.params.slug}`);
}
