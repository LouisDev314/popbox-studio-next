import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProductInventoryStatus } from '@/components/product/product-inventory-status';
import { KujiPrizesView } from '@/components/product/kuji-prizes-view';
import { ProductActions } from '@/components/product/product-actions';
import { ProductGallery } from '@/components/product/product-gallery';
import {
  ProductRecommendations,
  ProductRecommendationsFallback,
} from '@/components/product/product-recommendations';
import { type IProduct } from '@/interfaces/product';
import { getPublicProductBySlug, isPublicApiNotFoundError } from '@/lib/api/public-storefront';
import { formatPrice } from '@/lib/utils';
import {
  buildAbsoluteUrl,
  createPageMetadata,
  truncateMetaDescription,
} from '@/lib/seo';
import { getProductInventoryState } from '@/utils/product-stock';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function getProductMetadataDescription(product: IProduct) {
  if (product.description?.trim()) {
    return truncateMetaDescription(product.description, 165);
  }

  const collectionText = product.collection ? `${product.collection.name} ` : '';

  if (product.productType === 'kuji') {
    return truncateMetaDescription(
      `Shop ${product.name} from the ${collectionText}Ichiban Kuji lineup at PopBox Studio. Browse collector-focused ticket releases and anime prizes online.`,
      165,
    );
  }

  return truncateMetaDescription(
    `Shop ${product.name} from the ${collectionText}collection at PopBox Studio. Browse anime figures, gifts, and collectible merchandise online.`,
    165,
  );
}

function getProductOfferAvailability(product: IProduct) {
  const inventoryState = getProductInventoryState(product);

  if (!inventoryState.hasInventoryData) {
    return undefined;
  }

  if (inventoryState.status === 'sold_out') {
    return 'https://schema.org/OutOfStock';
  }

  if (inventoryState.status === 'low_stock') {
    return 'https://schema.org/LimitedAvailability';
  }

  return 'https://schema.org/InStock';
}

export async function generateMetadata(
  props: ProductDetailPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const path = `/products/${encodeURIComponent(params.slug)}`;

  try {
    const product = await getPublicProductBySlug(params.slug);
    const primaryImage = product.images[0]?.url;

    return createPageMetadata({
      title: product.name,
      description: getProductMetadataDescription(product),
      path,
      openGraphImages: primaryImage
        ? [
          {
            url: primaryImage,
            alt: product.images[0]?.altText || product.name,
          },
        ]
        : undefined,
    });
  } catch {
    return createPageMetadata({
      title: 'Product unavailable',
      description: 'The requested product is temporarily unavailable.',
      path,
      noIndex: true,
    });
  }
}

function ProductUnavailableState() {
  return (
    <div className="container mx-auto px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border/70 bg-card px-8 py-14 shadow-sm">
        <h1 className="text-3xl font-bold text-destructive">Failed to load product</h1>
        <p className="mt-3 text-base text-muted-foreground">
          The requested product is temporarily unavailable. Please try again shortly.
        </p>
        <Button asChild className="mt-8 rounded-full px-6">
          <Link href="/products">Back to products</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function ProductDetailPage(props: ProductDetailPageProps) {
  const params = await props.params;
  let product: IProduct;

  try {
    product = await getPublicProductBySlug(params.slug);
  } catch (error) {
    if (isPublicApiNotFoundError(error)) {
      notFound();
    }

    return (
      <ProductUnavailableState />
    );
  }

  const productPath = `/products/${product.slug}`;
  const productDescription = product.description?.trim() || 'No description available.';
  const productCategory = product.productType === 'kuji' ? 'Ichiban Kuji' : 'Anime merchandise';
  const productOfferAvailability = getProductOfferAvailability(product);
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productDescription,
    url: buildAbsoluteUrl(productPath),
    image: product.images.map((image) => image.url).filter(Boolean),
    category: productCategory,
    ...(product.sku
      ? {
        sku: product.sku,
      }
      : {}),
    offers: {
      '@type': 'Offer',
      url: buildAbsoluteUrl(productPath),
      price: (product.priceCents / 100).toFixed(2),
      priceCurrency: product.currency,
      ...(productOfferAvailability
        ? {
          availability: productOfferAvailability,
        }
        : {}),
    },
  };

  const accordionItems = [
    {
      value: 'details',
      trigger: 'Product Details',
      content: productDescription,
    },
  ]

  if (product.productType === 'kuji') {
    accordionItems.unshift({
      value: 'kuji-instructions',
      trigger: 'How Ichiban Kuji Works',
      content: 'Each ticket guarantees a prize from this lineup. Purchase the quantity of tickets you want, check out, and reveal your prizes after payment.',
    })
  }

  return (
    <div className="container mx-auto px-4 pt-8 pb-12 sm:px-6 md:pb-16 md:pt-12 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="relative z-10 flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            {product.collection ? (
              <Link
                href={`/collections/${encodeURIComponent(product.collection.slug)}`}
                className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary transition-colors hover:bg-primary/18"
              >
                {product.collection.name}
              </Link>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-end gap-2">
            <span className="text-2xl font-semibold text-primary">
              {formatPrice(product.priceCents, product.currency)}
            </span>
            {product.productType === 'kuji' ? (
              <span className="text-sm text-muted-foreground">per ticket</span>
            ) : null}
          </div>

          <ProductInventoryStatus product={product} variant="detail" />

          <ProductActions product={product} />
        </div>
      </div>

      {product.productType === 'kuji' && product.kujiPrizes ? (
        <KujiPrizesView prizes={product.kujiPrizes} />
      ) : null}

      <Accordion
        className="max-w-lg border mt-8"
      >
        {accordionItems.map((item) => (
          <AccordionItem
            key={item.value}
            value={item.value}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger>{item.trigger}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Suspense fallback={<ProductRecommendationsFallback />}>
        <ProductRecommendations product={product} />
      </Suspense>
    </div>
  );
}
