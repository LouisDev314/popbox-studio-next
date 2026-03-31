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
      <div className="mx-auto max-w-xl rounded-4xl border border-dashed border-border/70 bg-card px-8 py-14 shadow-sm">
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
  const breadcrumbItems = [
    {
      label: 'Home',
      path: '/',
    },
    {
      label: 'Products',
      path: '/products',
    },
    ...(product.collection
      ? [
          {
            label: product.collection.name,
            path: `/collections/${encodeURIComponent(product.collection.slug)}`,
          },
        ]
      : []),
    {
      label: product.name,
      path: productPath,
    },
  ];
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
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: buildAbsoluteUrl(item.path),
    })),
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery product={product} />
        </div>

        <div className="relative z-10 flex flex-col">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbItems.map((item, index) => {
                const isCurrentPage = index === breadcrumbItems.length - 1;

                return (
                  <li key={item.path} className="flex items-center gap-2">
                    {isCurrentPage ? (
                      <span aria-current="page" className="font-medium text-foreground">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.path}
                        className="transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    )}
                    {!isCurrentPage ? <span aria-hidden="true">/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>

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

          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-end gap-2">
            <span className="text-3xl font-bold text-foreground">
              {formatPrice(product.priceCents, product.currency)}
            </span>
            {product.productType === 'kuji' ? (
              <span className="text-sm text-muted-foreground">per ticket</span>
            ) : null}
          </div>

          <ProductInventoryStatus product={product} variant="detail" />

          <ProductActions product={product} />

          {product.productType === 'kuji' ? (
            <div className="mt-12 rounded-[1.75rem] border border-secondary/25 bg-secondary/10 p-5">
              <p className="text-sm font-medium text-secondary-foreground">
                <span className="mb-1 block font-bold uppercase tracking-wider">How Ichiban Kuji Works</span>
                Each ticket guarantees a prize from this lineup. Purchase the quantity of tickets you want, check out,
                and reveal your prizes after payment.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {product.productType === 'kuji' && product.kujiPrizes ? (
        <KujiPrizesView prizes={product.kujiPrizes} />
      ) : null}

      <div className="mt-12 rounded-4xl border border-border/60 bg-card/70 p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Product details</p>
        {product.sku ? (
          <p className="mt-4 text-sm font-medium text-foreground">
            Product code: <span className="font-normal text-muted-foreground">{product.sku}</span>
          </p>
        ) : null}
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          {productDescription}
        </p>
      </div>

      <Suspense fallback={<ProductRecommendationsFallback />}>
        <ProductRecommendations product={product} />
      </Suspense>
    </div>
  );
}
