import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import {
  getPublicProductBySlug,
  isPublicApiNotFoundError,
} from '@/lib/api/public-storefront';

type ProductDetailLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailLayout(props: ProductDetailLayoutProps) {
  const { slug } = await props.params;
  let productIsMissing = false;

  try {
    await getPublicProductBySlug(slug);
  } catch (error) {
    if (isPublicApiNotFoundError(error)) {
      productIsMissing = true;
    } else {
      return props.children;
    }
  }

  if (productIsMissing) {
    notFound();
  }

  return props.children;
}
