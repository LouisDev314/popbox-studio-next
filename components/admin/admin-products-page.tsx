'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  RotateCcw,
  Package as PackageIcon,
  Boxes,
} from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';
import { formatPrice, cn } from '@/lib/utils';
import type { IAdminProduct, IAdminProductListResponse, productStatus } from '@/interfaces/product';

// --- Constants ---

const STATUS_TABS: { label: string; value: productStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

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
    if (isNaN(date.getTime())) return '—';

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

  const { onHand, reserved } = product.inventory;
  if (reserved > 0) {
    return `${onHand} in stock (${reserved} reserved)`;
  }

  return `${onHand} in stock`;
}

// --- Row Actions Component ---

interface IRowActionsProps {
  product: IAdminProduct;
  onStatusChange: (productId: string, newStatus: productStatus) => void;
  isUpdating: boolean;
}

function RowActions({ product, onStatusChange, isUpdating }: IRowActionsProps) {
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
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
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
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(product.id, toggleAction.newStatus);
                setIsOpen(false);
              }}
            >
              <toggleAction.icon className="h-3.5 w-3.5" />
              {toggleAction.label}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Main Page Component ---

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const rawStatus = searchParams.get('status');
  const statusFilter: productStatus | undefined =
    rawStatus === 'draft' || rawStatus === 'active' || rawStatus === 'archived'
      ? rawStatus
      : undefined;

  const activeTab = statusFilter ?? 'all';

  // Fetch products
  const { data, isPending, isError } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey: ['admin', 'products', statusFilter ?? 'all'],
    queryFn: () => QueryConfigs.fetchAdminProducts(statusFilter),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Status mutation
  const { mutation: patchStatus, isPending: isPatching } = useCustomizeMutation<
    IAdminProduct,
    { productId: string; status: productStatus }
  >({
    mutationFn: MutationConfigs.patchAdminProductStatus,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const products: IAdminProduct[] = data?.data?.data?.items ?? [];

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== 'all') {
      params.set('status', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/products?${qs}` : '/admin/products', { scroll: false });
  };

  const handleStatusChange = (productId: string, newStatus: productStatus) => {
    patchStatus({ productId, status: newStatus });
  };

  const handleRowClick = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Products</h1>
          <p className="mt-1 text-sm text-[#514349]">
            Manage your product catalog, inventory, and pricing.
          </p>
        </div>
        <Button asChild className="h-9 rounded-lg px-4 text-sm shadow-sm">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="mt-6 flex gap-1 border-b border-[#D5C1C9]/20">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant="ghost"
            className={cn(
              'relative h-auto rounded-none px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'text-[#191C1E]'
                : 'text-[#514349]/70 hover:text-[#191C1E]',
            )}
            onClick={() => handleTabChange(tab.value)}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {isPending ? (
          <LoadingSkeleton />
        ) : isError ? (
          <div className="rounded-xl bg-destructive/5 py-16 text-center">
            <p className="font-medium text-destructive">
              Failed to load products. Please try again.
            </p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState statusFilter={statusFilter} />
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-[#514349]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="hidden px-4 py-3 lg:table-cell">SKU</th>
                  <th className="hidden px-4 py-3 md:table-cell">Inventory</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Updated</th>
                  <th className="px-4 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="cursor-pointer transition-colors hover:bg-[#F2F4F6]/50"
                    onClick={() => handleRowClick(product.id)}
                  >
                    {/* Product name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail product={product} />
                        <span className="font-medium text-[#191C1E] line-clamp-1">
                          {product.name}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
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

                    {/* Status */}
                    <td className="px-4 py-3">
                      <AdminProductStatusBadge status={product.status} />
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 tabular-nums text-[#191C1E]">
                      {formatPrice(product.priceCents, product.currency)}
                    </td>

                    {/* SKU */}
                    <td className="hidden px-4 py-3 text-[#514349] lg:table-cell">
                      {product.sku ?? '—'}
                    </td>

                    {/* Inventory */}
                    <td className="hidden px-4 py-3 text-[#514349] md:table-cell">
                      <span
                        className={cn(
                          product.productType === 'kuji' && 'italic text-[#514349]/60',
                        )}
                      >
                        {getInventoryDisplay(product)}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="hidden px-4 py-3 text-[#514349] xl:table-cell">
                      {formatRelativeDate(product.updatedAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        product={product}
                        onStatusChange={handleStatusChange}
                        isUpdating={isPatching}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

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

function EmptyState({ statusFilter }: { statusFilter?: productStatus }) {
  const message = statusFilter
    ? `No ${statusFilter} products found.`
    : 'No products yet. Create your first product to get started.';

  return (
    <div className="rounded-xl border border-dashed border-[#D5C1C9]/40 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <PackageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-[#514349]">{message}</p>
      {!statusFilter && (
        <Button asChild className="mt-4 rounded-lg bg-gradient-to-br from-[#8A486F] to-[#F9A8D4] text-sm text-white hover:opacity-90">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Create your first product
          </Link>
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white">
      <div className="px-4 py-3">
        <div className="h-3 w-full rounded bg-[#E6E8EA]" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#E6E8EA]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-[#E6E8EA]" />
          </div>
          <div className="h-3 w-16 rounded bg-[#E6E8EA]" />
          <div className="h-5 w-14 rounded-full bg-[#E6E8EA]" />
          <div className="hidden h-3 w-20 rounded bg-[#E6E8EA] lg:block" />
          <div className="hidden h-3 w-16 rounded bg-[#E6E8EA] md:block" />
        </div>
      ))}
    </div>
  );
}
