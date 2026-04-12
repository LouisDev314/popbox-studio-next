'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Archive, MoreHorizontal, Package as PackageIcon, Pencil, Plus, RotateCcw, X } from 'lucide-react';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';
import { cn, formatPrice } from '@/lib/utils';
import { resolveAdminImageSrc } from '@/utils/admin';
import type {
  IAdminProductListItem,
  IAdminProductListPrimaryImage,
  ITag,
  productStatus,
} from '@/interfaces/product';

const hasOwn = <Key extends PropertyKey>(
  value: object,
  key: Key,
): value is Record<Key, unknown> => Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

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

type ContractState<T> = (
  | { kind: 'ready'; value: T }
  | { kind: 'empty' }
  | { kind: 'violation'; message: string }
);

function ContractNotice({ message }: { message: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#f0d2a6] bg-[#fff7ea] px-2 py-0.5 text-[11px] font-medium text-[#b06707]">
      {message}
    </span>
  );
}

function getCollectionState(
  product: IAdminProductListItem,
): ContractState<NonNullable<IAdminProductListItem['collection']>> {
  const productRecord = product as unknown as Record<string, unknown>;

  if (!hasOwn(productRecord, 'collection')) {
    return { kind: 'violation', message: 'Missing collection field' };
  }

  if (product.collection === null) {
    return { kind: 'empty' };
  }

  if (!isRecord(product.collection)) {
    return { kind: 'violation', message: 'Invalid collection field' };
  }

  return { kind: 'ready', value: product.collection };
}

function getTagsState(product: IAdminProductListItem): ContractState<ITag[]> {
  const productRecord = product as unknown as Record<string, unknown>;

  if (!hasOwn(productRecord, 'tags')) {
    return { kind: 'violation', message: 'Missing tags field' };
  }

  if (!Array.isArray(productRecord.tags)) {
    return { kind: 'violation', message: 'Invalid tags field' };
  }

  if (product.tags.length === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'ready', value: product.tags };
}

function getPrimaryImageState(
  product: IAdminProductListItem,
): ContractState<{ image: IAdminProductListPrimaryImage; src: string }> {
  const productRecord = product as unknown as Record<string, unknown>;

  if (!hasOwn(productRecord, 'primaryImage')) {
    return { kind: 'violation', message: 'Missing primaryImage field' };
  }

  if (product.primaryImage === null) {
    return { kind: 'empty' };
  }

  if (!isRecord(product.primaryImage)) {
    return { kind: 'violation', message: 'Invalid primaryImage field' };
  }

  const src = resolveAdminImageSrc(product.primaryImage.url, product.primaryImage.storageKey);

  if (!src) {
    return { kind: 'violation', message: 'Invalid primaryImage field' };
  }

  return {
    kind: 'ready',
    value: {
      image: product.primaryImage,
      src,
    },
  };
}

function getInventoryDisplayState(product: IAdminProductListItem): ContractState<string> {
  const productRecord = product as unknown as Record<string, unknown>;

  if (!hasOwn(productRecord, 'inventory')) {
    return { kind: 'violation', message: 'Missing inventory.available' };
  }

  if (product.inventory === null) {
    return product.productType === 'kuji'
      ? { kind: 'ready', value: 'Managed via prizes' }
      : { kind: 'empty' };
  }

  if (
    !isRecord(product.inventory)
    || !hasOwn(product.inventory, 'available')
  ) {
    return { kind: 'violation', message: 'Missing inventory.available' };
  }

  if (product.productType === 'kuji') {
    return { kind: 'ready', value: 'Managed via prizes' };
  }

  const reserved = product.inventory.reserved ?? 0;

  if (reserved > 0) {
    return { kind: 'ready', value: `${product.inventory.available} available (${reserved} reserved)` };
  }

  return { kind: 'ready', value: `${product.inventory.available} available` };
}

interface IRowActionsProps {
  isUpdating: boolean;
  onStatusChange: (productId: string, newStatus: productStatus) => void;
  product: IAdminProductListItem;
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
        className="h-7 w-7 rounded-md p-0 text-muted-foreground/60 hover:bg-muted/60 hover:text-foreground"
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
          <div className="absolute right-0 top-7 z-50 w-44 rounded-lg border border-border/40 bg-card py-1 shadow-sm">
            <Link
              href={`/admin/products/${product.id}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <Button
              type="button"
              variant="ghost"
              disabled={isUpdating}
              className="flex h-auto w-full justify-start gap-2 rounded-none px-3 py-2 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-muted-foreground"
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

function ProductThumbnail({
  imageState,
  productName,
}: {
  imageState: ContractState<{ image: IAdminProductListPrimaryImage; src: string }>;
  productName: string;
}) {
  if (imageState.kind === 'ready') {
    const shouldDisableOptimization = imageState.value.src.includes('/storage/v1/object/public/')
      || imageState.value.src.includes('supabase');

    return (
      <Image
        src={imageState.value.src}
        alt={imageState.value.image.altText ?? productName}
        width={44}
        height={44}
        sizes="44px"
        className="h-11 w-11 shrink-0 rounded-[14px] object-cover"
        unoptimized={shouldDisableOptimization || undefined}
      />
    );
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#fff0d9] text-xs font-semibold text-[#b06707]">
      {getProductInitials(productName)}
    </div>
  );
}

function ProductTagsCell({ tags }: { tags: ITag[] }) {
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
          className="inline-flex max-w-full items-center rounded-full border border-[#ece4d8] bg-[#f8f4eb] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]"
        >
          <span className="truncate">{tag.name}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-full border border-dashed border-[#d9cdbb] px-2 py-0.5 text-[11px] font-medium text-[#8f8577]">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}

interface IAdminProductsEmptyStateProps {
  hasActiveView: boolean;
  onClearView: () => void;
  statusFilter?: productStatus;
}

function AdminProductsEmptyState(props: IAdminProductsEmptyStateProps) {
  const message = props.hasActiveView
    ? 'No products match the current search or filter combination.'
    : props.statusFilter
      ? `No ${props.statusFilter} products found.`
      : 'No products yet. Create your first product to get started.';

  return (
    <div className="rounded-[20px] border border-dashed border-border/40 bg-card py-16 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <PackageIcon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      {props.hasActiveView && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2 rounded-lg"
          onClick={props.onClearView}
        >
          <X className="h-4 w-4" />
          Clear view
        </Button>
      )}
      {!props.statusFilter && !props.hasActiveView && (
        <Button asChild className="mt-4 gap-2 rounded-lg bg-gradient-to-br from-[#8A486F] to-[#F9A8D4] text-sm text-white hover:opacity-90">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Create your first product
          </Link>
        </Button>
      )}
    </div>
  );
}

export function AdminProductsLoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-[#ece4d8] bg-white">
      <div className="px-4 py-2.5">
        <div className="h-3 w-full rounded bg-muted" />
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 shrink-0 rounded-[12px] bg-muted" />
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
  hasActiveView: boolean;
  isPatching: boolean;
  onClearView: () => void;
  onRowClick: (productId: string) => void;
  onStatusChange: (productId: string, newStatus: productStatus) => void;
  products: IAdminProductListItem[];
  statusFilter?: productStatus;
}

export function AdminProductsTable(props: IAdminProductsTableProps) {
  if (props.products.length === 0) {
    return (
      <AdminProductsEmptyState
        hasActiveView={props.hasActiveView}
        onClearView={props.onClearView}
        statusFilter={props.statusFilter}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[20px] border border-[#ece4d8] bg-white shadow-[0_18px_44px_-40px_rgba(17,24,39,0.45)]">
      <table className="min-w-[1040px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#f1e8dc] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8577]">
            <th className="px-5 py-3">Product</th>
            <th className="px-3.5 py-3">Type</th>
            <th className="px-3.5 py-3">Status</th>
            <th className="px-3.5 py-3">Price</th>
            <th className="px-3.5 py-3">Collection</th>
            <th className="px-3.5 py-3">Tags</th>
            <th className="px-3.5 py-3">Inventory</th>
            <th className="px-3.5 py-3">Updated</th>
            <th className="px-5 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {props.products.map((product) => {
            const collectionState = getCollectionState(product);
            const tagsState = getTagsState(product);
            const imageState = getPrimaryImageState(product);
            const inventoryState = getInventoryDisplayState(product);

            return (
              <tr
                key={product.id}
                className="cursor-pointer border-b border-[#f5efe5] transition-colors last:border-b-0 hover:bg-[#fcfaf6]"
                onClick={() => props.onRowClick(product.id)}
              >
                <td className="px-5 py-3">
                  <div className="flex min-w-[240px] items-center gap-3">
                    <ProductThumbnail imageState={imageState} productName={product.name} />
                    <div className="min-w-0 space-y-0.5">
                      <p className="line-clamp-1 text-[14px] font-medium text-[#111827]">{product.name}</p>
                      {imageState.kind === 'violation' ? <ContractNotice message={imageState.message} /> : null}
                    </div>
                  </div>
                </td>

                <td className="px-3.5 py-3 text-[#6b7280]">
                  <span className="inline-flex items-center gap-1 text-sm">
                    {product.productType === 'kuji' ? 'Kuji' : 'Standard'}
                  </span>
                </td>

                <td className="px-3.5 py-3">
                  <AdminProductStatusBadge status={product.status} />
                </td>

                <td className="px-3.5 py-3 tabular-nums text-sm text-[#111827]">
                  {formatPrice(product.priceCents, product.currency)}
                </td>

                <td className="px-3.5 py-3 text-sm text-[#6b7280]">
                  {collectionState.kind === 'violation' ? (
                    <ContractNotice message={collectionState.message} />
                  ) : (
                    <span className="line-clamp-1">
                      {collectionState.kind === 'ready' ? collectionState.value.name : '—'}
                    </span>
                  )}
                </td>

                <td className="px-3.5 py-3">
                  {tagsState.kind === 'violation' ? (
                    <ContractNotice message={tagsState.message} />
                  ) : (
                    <ProductTagsCell tags={tagsState.kind === 'ready' ? tagsState.value : []} />
                  )}
                </td>

                <td className="px-3.5 py-3 text-sm text-[#6b7280]">
                  {inventoryState.kind === 'violation' ? (
                    <ContractNotice message={inventoryState.message} />
                  ) : (
                    <span className={cn(product.productType === 'kuji' && 'italic text-[#8f8577]')}>
                      {inventoryState.kind === 'ready' ? inventoryState.value : '—'}
                    </span>
                  )}
                </td>

                <td className="px-3.5 py-3 text-sm text-[#6b7280]">
                  {formatRelativeDate(product.updatedAt)}
                </td>

                <td className="px-5 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                  <RowActions
                    product={product}
                    onStatusChange={props.onStatusChange}
                    isUpdating={props.isPatching}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
