'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Archive, Boxes, MoreHorizontal, Package as PackageIcon, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';
import type { IAdminProduct, ITag, productStatus } from '@/interfaces/product';

function getProductInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function getInventoryDisplay(product: IAdminProduct): string {
  if (product.productType === 'kuji') {
    return 'Managed via prizes';
  }

  if (!product.inventory) {
    return '—';
  }

  const available = product.inventory.available ?? product.inventory.onHand;
  const reserved = product.inventory.reserved ?? 0;

  if (reserved > 0) {
    return `${available} available (${reserved} reserved)`;
  }

  return `${available} available`;
}

function getCollectionDisplayName(
  product: IAdminProduct,
  collectionNameById: Map<string, string>,
): string {
  return product.collection?.name
    ?? (product.collectionId ? collectionNameById.get(product.collectionId) : undefined)
    ?? '—';
}

interface IRowActionsProps {
  isUpdating: boolean;
  onStatusChange: (productId: string, newStatus: productStatus) => void;
  product: IAdminProduct;
}

function RowActions({ isUpdating, onStatusChange, product }: IRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAction =
    product.status === 'archived'
      ? { label: 'Activate', icon: RotateCcw, newStatus: 'active' as productStatus }
      : { label: 'Archive', icon: Archive, newStatus: 'archived' as productStatus };

  return (
    <div className="relative">
      <Button
        type="button"
        aria-label="Product actions"
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md p-0 text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border border-border/40 bg-card py-1 shadow-sm">
            <Link
              href={`/admin/products/${product.id}`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <Button
              type="button"
              variant="ghost"
              disabled={isUpdating}
              className="flex h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onStatusChange(product.id, toggleAction.newStatus);
                setIsOpen(false);
              }}
            >
              <toggleAction.icon className="h-3.5 w-3.5" />
              {toggleAction.label}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProductThumbnail({ product }: { product: IAdminProduct }) {
  const firstImage = product.images?.[0];

  if (firstImage?.url) {
    return (
      <Image
        src={firstImage.url}
        alt={firstImage.altText ?? product.name}
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
      {getProductInitials(product.name)}
    </div>
  );
}

function ProductTagsCell({ tags }: { tags?: ITag[] }) {
  const sortedTags = useMemo(
    () => [...(tags ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  );

  if (sortedTags.length === 0) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  const visibleTags = sortedTags.slice(0, 2);
  const remainingCount = sortedTags.length - visibleTags.length;

  return (
    <div className="flex max-w-[220px] flex-wrap items-center gap-1.5">
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center rounded-full border border-border/40 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="inline-flex items-center rounded-full border border-dashed border-border/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground/80">
          +{remainingCount} more
        </span>
      ) : null}
    </div>
  );
}

interface IAdminProductsEmptyStateProps {
  hasActiveRefinements: boolean;
  onClearRefinements: () => void;
  statusFilter?: productStatus;
}

function AdminProductsEmptyState(props: IAdminProductsEmptyStateProps) {
  const message = props.hasActiveRefinements
    ? 'No products match the current filters.'
    : props.statusFilter
      ? `No ${props.statusFilter} products found.`
      : 'No products yet. Create your first product to get started.';

  return (
    <div className="rounded-xl border border-dashed border-border/40 bg-card py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <PackageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {props.hasActiveRefinements ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2 rounded-lg"
          onClick={props.onClearRefinements}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      ) : null}
      {!props.statusFilter && !props.hasActiveRefinements ? (
        <Button asChild className="mt-4 gap-2 rounded-lg bg-gradient-to-br from-[#8A486F] to-[#F9A8D4] text-sm text-white hover:opacity-90">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Create your first product
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

export function AdminProductsLoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/20 bg-card">
      <div className="px-4 py-3">
        <div className="h-3 w-full rounded bg-muted" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-[180px] flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-muted" />
          </div>
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-5 w-14 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-5 w-28 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

interface IAdminProductsTableProps {
  collectionNameById: Map<string, string>;
  hasActiveRefinements: boolean;
  isPatching: boolean;
  onClearRefinements: () => void;
  onRowClick: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: productStatus) => void;
  products: IAdminProduct[];
  statusFilter?: productStatus;
}

export function AdminProductsTable(props: IAdminProductsTableProps) {
  if (props.products.length === 0) {
    return (
      <AdminProductsEmptyState
        hasActiveRefinements={props.hasActiveRefinements}
        onClearRefinements={props.onClearRefinements}
        statusFilter={props.statusFilter}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/20 bg-card">
      <table className="min-w-[1220px] w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Collection</th>
            <th className="px-4 py-3">Tags</th>
            <th className="px-4 py-3">Inventory</th>
            <th className="px-4 py-3">Updated</th>
            <th className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {props.products.map((product) => (
            <tr
              key={product.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => props.onRowClick(product.id)}
            >
              <td className="px-4 py-3">
                <div className="flex min-w-[220px] items-center gap-3">
                  <ProductThumbnail product={product} />
                  <span className="line-clamp-1 font-medium text-foreground">
                    {product.name}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  {product.productType === 'kuji' ? (
                    <Boxes className="h-3.5 w-3.5 text-secondary" />
                  ) : (
                    <PackageIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                  {product.productType === 'kuji' ? 'Kuji' : 'Standard'}
                </span>
              </td>

              <td className="px-4 py-3">
                <AdminProductStatusBadge status={product.status} />
              </td>

              <td className="px-4 py-3 tabular-nums text-foreground">
                {formatPrice(product.priceCents, product.currency)}
              </td>

              <td className="px-4 py-3 text-muted-foreground">
                <span className="line-clamp-1">
                  {getCollectionDisplayName(product, props.collectionNameById)}
                </span>
              </td>

              <td className="px-4 py-3">
                <ProductTagsCell tags={product.tags} />
              </td>

              <td className="px-4 py-3 text-muted-foreground">
                <span className={cn(product.productType === 'kuji' && 'italic text-muted-foreground/70')}>
                  {getInventoryDisplay(product)}
                </span>
              </td>

              <td className="px-4 py-3 text-muted-foreground">
                {formatRelativeDate(product.updatedAt)}
              </td>

              <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                <RowActions
                  product={product}
                  onStatusChange={props.onStatusChange}
                  isUpdating={props.isPatching}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
