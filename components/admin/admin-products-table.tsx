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
        className="h-8 w-8 rounded-md p-0 text-[#514349]/60 hover:bg-[#E6E8EA]/60 hover:text-[#191C1E]"
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
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg bg-white py-1 shadow-[0_20px_25px_-5px_rgba(25,28,30,0.04),0_10px_10px_-5px_rgba(25,28,30,0.02)] ring-1 ring-[#D5C1C9]/20">
            <Link
              href={`/admin/products/${product.id}`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-[#514349] transition-colors hover:bg-[#F2F4F6]"
              onClick={() => setIsOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <Button
              type="button"
              variant="ghost"
              disabled={isUpdating}
              className="flex h-auto w-full justify-start gap-2.5 rounded-none px-3 py-2 text-sm font-normal text-[#514349] hover:bg-[#F2F4F6] hover:text-[#514349]"
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
    return <span className="text-[#514349]/60">—</span>;
  }

  const visibleTags = sortedTags.slice(0, 2);
  const remainingCount = sortedTags.length - visibleTags.length;

  return (
    <div className="flex max-w-[220px] flex-wrap items-center gap-1.5">
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex max-w-full items-center rounded-full border border-[#D5C1C9]/40 bg-[#F7F4F6] px-2.5 py-1 text-[11px] font-medium text-[#514349]"
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="inline-flex items-center rounded-full border border-dashed border-[#D5C1C9]/50 px-2.5 py-1 text-[11px] font-medium text-[#514349]/80">
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
    <div className="rounded-xl border border-dashed border-[#D5C1C9]/40 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <PackageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-[#514349]">{message}</p>
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
    <div className="overflow-hidden rounded-xl border border-[#D5C1C9]/20 bg-white">
      <div className="px-4 py-3">
        <div className="h-3 w-full rounded bg-[#E6E8EA]" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E6E8EA]" />
          <div className="min-w-[180px] flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-[#E6E8EA]" />
          </div>
          <div className="h-3 w-16 rounded bg-[#E6E8EA]" />
          <div className="h-5 w-14 rounded-full bg-[#E6E8EA]" />
          <div className="h-3 w-20 rounded bg-[#E6E8EA]" />
          <div className="h-5 w-28 rounded-full bg-[#E6E8EA]" />
          <div className="h-3 w-20 rounded bg-[#E6E8EA]" />
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
    <div className="overflow-x-auto rounded-xl border border-[#D5C1C9]/20 bg-white">
      <table className="min-w-[1220px] w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-[#514349]">
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
              className="cursor-pointer transition-colors hover:bg-[#F2F4F6]/50"
              onClick={() => props.onRowClick(product.id)}
            >
              <td className="px-4 py-3">
                <div className="flex min-w-[220px] items-center gap-3">
                  <ProductThumbnail product={product} />
                  <span className="line-clamp-1 font-medium text-[#191C1E]">
                    {product.name}
                  </span>
                </div>
              </td>

              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-[#514349]">
                  {product.productType === 'kuji' ? (
                    <Boxes className="h-3.5 w-3.5 text-secondary" />
                  ) : (
                    <PackageIcon className="h-3.5 w-3.5 text-[#514349]/50" />
                  )}
                  {product.productType === 'kuji' ? 'Kuji' : 'Standard'}
                </span>
              </td>

              <td className="px-4 py-3">
                <AdminProductStatusBadge status={product.status} />
              </td>

              <td className="px-4 py-3 tabular-nums text-[#191C1E]">
                {formatPrice(product.priceCents, product.currency)}
              </td>

              <td className="px-4 py-3 text-[#514349]">
                <span className="line-clamp-1">
                  {getCollectionDisplayName(product, props.collectionNameById)}
                </span>
              </td>

              <td className="px-4 py-3">
                <ProductTagsCell tags={product.tags} />
              </td>

              <td className="px-4 py-3 text-[#514349]">
                <span className={cn(product.productType === 'kuji' && 'italic text-[#514349]/70')}>
                  {getInventoryDisplay(product)}
                </span>
              </td>

              <td className="px-4 py-3 text-[#514349]">
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
