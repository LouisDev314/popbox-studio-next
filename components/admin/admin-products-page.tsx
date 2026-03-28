'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Boxes,
  Check,
  ChevronDown,
  MoreHorizontal,
  Package as PackageIcon,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import useCustomizeQuery from '@/hooks/use-customize-query';
import {
  ADMIN_PRODUCT_SORT_ITEMS,
  ADMIN_PRODUCT_TYPE_ITEMS,
  type IAdminProductListQueryParams,
  parseAdminCollectionIdParam,
  parseAdminProductSortParam,
  parseAdminProductTypeParam,
  parseAdminTagIdsParam,
  serializeAdminTagIdsParam,
} from '@/lib/admin-product-filters';
import { getTagTypeLabel } from '@/lib/tag-types';
import { cn, formatPrice } from '@/lib/utils';
import type {
  IAdminProduct,
  IAdminProductListResponse,
  ICollection,
  ITag,
  productStatus,
} from '@/interfaces/product';
import { AdminProductStatusBadge } from '@/components/admin/admin-product-status-badge';
import { Button } from '@/components/ui/button';

const STATUS_TABS: { label: string; value: productStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

const FILTER_FIELD_CLASSES = 'h-9 w-full rounded-lg border border-[#D5C1C9]/30 bg-white px-3 text-sm text-[#191C1E] outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10';

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

interface ITagFilterDropdownProps {
  availableTags: ITag[];
  isUnavailable: boolean;
  onClearTags: () => void;
  onToggleTag: (tagId: string) => void;
  selectedTagIds: string[];
}

function TagFilterDropdown(props: ITagFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedTagSet = useMemo(() => new Set(props.selectedTagIds), [props.selectedTagIds]);
  const selectedTags = useMemo(
    () => props.availableTags.filter((tag) => selectedTagSet.has(tag.id)),
    [props.availableTags, selectedTagSet],
  );
  const groupedTags = useMemo(() => {
    const groups = new Map<string, ITag[]>();

    for (const tag of props.availableTags) {
      const currentGroup = groups.get(tag.tagType) ?? [];
      currentGroup.push(tag);
      groups.set(tag.tagType, currentGroup);
    }

    return [...groups.entries()].map(([tagType, tags]) => ({
      tagType,
      label: getTagTypeLabel(tagType),
      tags,
    }));
  }, [props.availableTags]);

  const selectedTagCount = props.selectedTagIds.length;
  const triggerLabel = (() => {
    if (selectedTagCount === 0) {
      return 'All tags';
    }

    if (selectedTags.length === 0) {
      return `${selectedTagCount} tag${selectedTagCount === 1 ? '' : 's'} selected`;
    }

    if (selectedTags.length === 1) {
      return selectedTags[0].name;
    }

    return `${selectedTags[0].name} +${selectedTagCount - 1}`;
  })();

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#514349]/70">
        Tags
      </label>
      <button
        type="button"
        className={cn(
          FILTER_FIELD_CLASSES,
          'flex items-center justify-between gap-3 text-left',
          isOpen && 'border-primary/40 ring-2 ring-primary/10',
        )}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedTagCount > 0 ? (
            <span className="rounded-full bg-[#F7F4F6] px-2 py-0.5 text-xs font-medium text-[#514349]">
              {selectedTagCount}
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 text-[#514349]/70 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[280px] rounded-xl border border-[#D5C1C9]/30 bg-white shadow-[0_20px_40px_-24px_rgba(25,28,30,0.2)]">
          <div className="flex items-start justify-between gap-3 border-b border-[#D5C1C9]/20 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-[#191C1E]">Filter by tags</p>
              <p className="mt-1 text-xs text-[#514349]/75">Matches any selected tag.</p>
            </div>
            {selectedTagCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-md px-2.5 text-xs"
                onClick={() => {
                  props.onClearTags();
                  setIsOpen(false);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>

          {props.isUnavailable ? (
            <div className="px-3 py-4 text-sm text-[#514349]">Tag filters are temporarily unavailable.</div>
          ) : groupedTags.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[#514349]">No tags available.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-2">
              {groupedTags.map((group) => (
                <div key={group.tagType} className="pb-2 last:pb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#514349]/65">
                    {group.label}
                  </p>
                  <div className="space-y-1.5">
                    {group.tags.map((tag) => {
                      const isSelected = selectedTagSet.has(tag.id);

                      return (
                        <label
                          key={tag.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                            isSelected
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-transparent text-[#514349] hover:border-[#D5C1C9]/40 hover:bg-[#F7F4F6]',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => props.onToggleTag(tag.id)}
                            className="sr-only"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{tag.name}</p>
                          </div>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#514349]/80">
                            {getTagTypeLabel(tag.tagType)}
                          </span>
                          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface IEmptyStateProps {
  hasActiveRefinements: boolean;
  onClearRefinements: () => void;
  statusFilter?: productStatus;
}

function EmptyState({ hasActiveRefinements, onClearRefinements, statusFilter }: IEmptyStateProps) {
  const message = hasActiveRefinements
    ? 'No products match the current filters.'
    : statusFilter
      ? `No ${statusFilter} products found.`
      : 'No products yet. Create your first product to get started.';

  return (
    <div className="rounded-xl border border-dashed border-[#D5C1C9]/40 bg-white py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <PackageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm text-[#514349]">{message}</p>
      {hasActiveRefinements ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 gap-2 rounded-lg"
          onClick={onClearRefinements}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      ) : null}
      {!statusFilter && !hasActiveRefinements ? (
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

function LoadingSkeleton() {
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
          <div className="h-3 w-16 rounded bg-[#E6E8EA]" />
          <div className="h-3 w-20 rounded bg-[#E6E8EA]" />
          <div className="h-5 w-28 rounded-full bg-[#E6E8EA]" />
          <div className="h-3 w-20 rounded bg-[#E6E8EA]" />
        </div>
      ))}
    </div>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const rawStatus = searchParams.get('status');
  const statusFilter: productStatus | undefined =
    rawStatus === 'draft' || rawStatus === 'active' || rawStatus === 'archived'
      ? rawStatus
      : undefined;
  const typeFilter = parseAdminProductTypeParam(searchParams.get('type') ?? undefined);
  const collectionIdFilter = parseAdminCollectionIdParam(searchParams.get('collectionId') ?? undefined);
  const tagIdFilters = parseAdminTagIdsParam(searchParams.getAll('tagIds'));
  const sortFilter = parseAdminProductSortParam(searchParams.get('sort') ?? undefined);

  const activeTab = statusFilter ?? 'all';
  const serializedTagIdFilters = serializeAdminTagIdsParam(tagIdFilters);

  const listQueryParams = useMemo<IAdminProductListQueryParams>(() => ({
    status: statusFilter,
    type: typeFilter,
    collectionId: collectionIdFilter,
    tagIds: tagIdFilters.length > 0 ? tagIdFilters : undefined,
    sort: sortFilter,
  }), [collectionIdFilter, sortFilter, statusFilter, tagIdFilters, typeFilter]);

  const { data, isPending, isError } = useCustomizeQuery<IAdminProductListResponse>({
    queryKey: [
      'admin',
      'products',
      statusFilter ?? 'all',
      typeFilter ?? 'all',
      collectionIdFilter ?? 'all',
      serializedTagIdFilters ?? 'all',
      sortFilter ?? 'default',
    ],
    queryFn: () => QueryConfigs.fetchAdminProducts(listQueryParams),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: collectionsRes, isError: isCollectionsError } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const { data: tagsRes, isError: isTagsError } = useCustomizeQuery<ITag[]>({
    queryKey: ['admin', 'tags'],
    queryFn: QueryConfigs.fetchAdminTags,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const { mutation: patchStatus, isPending: isPatching } = useCustomizeMutation<
    IAdminProduct,
    { productId: string; status: productStatus }
  >({
    mutationFn: MutationConfigs.patchAdminProductStatus,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const productsFromApi = useMemo(
    () => data?.data?.data?.items ?? [],
    [data],
  );
  const collections = useMemo(
    () => [...(collectionsRes?.data?.data ?? [])].sort((left, right) => (
      left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    )),
    [collectionsRes?.data?.data],
  );
  const tags = useMemo(
    () => [...(tagsRes?.data?.data ?? [])].sort((left, right) => (
      left.tagType.localeCompare(right.tagType) || left.name.localeCompare(right.name)
    )),
    [tagsRes?.data?.data],
  );
  const collectionNameById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  );
  const products = productsFromApi;

  const hasActiveRefinements = Boolean(
    typeFilter
    || collectionIdFilter
    || tagIdFilters.length > 0
    || sortFilter,
  );

  const replaceSearchParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/products?${nextQueryString}` : '/admin/products';

    router.replace(nextUrl, { scroll: false });
  };

  const handleTabChange = (nextTab: productStatus | 'all') => {
    replaceSearchParams((params) => {
      if (nextTab === 'all') {
        params.delete('status');
      } else {
        params.set('status', nextTab);
      }
    });
  };

  const handleTypeChange = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'all') {
        params.delete('type');
      } else {
        params.set('type', value);
      }
    });
  };

  const handleCollectionChange = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'all') {
        params.delete('collectionId');
      } else {
        params.set('collectionId', value);
      }
    });
  };

  const handleSortChange = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'default') {
        params.delete('sort');
      } else {
        params.set('sort', value);
      }
    });
  };

  const handleTagToggle = (tagId: string) => {
    replaceSearchParams((params) => {
      const currentTagIds = parseAdminTagIdsParam(params.getAll('tagIds'));
      const nextTagIds = currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId];
      const serializedTagIds = serializeAdminTagIdsParam(nextTagIds);

      if (serializedTagIds) {
        params.set('tagIds', serializedTagIds);
      } else {
        params.delete('tagIds');
      }
    });
  };

  const handleClearTagFilters = () => {
    replaceSearchParams((params) => {
      params.delete('tagIds');
    });
  };

  const handleClearRefinements = () => {
    replaceSearchParams((params) => {
      params.delete('type');
      params.delete('collectionId');
      params.delete('tagIds');
      params.delete('sort');
    });
  };

  const handleStatusChange = (productId: string, newStatus: productStatus) => {
    patchStatus({ productId, status: newStatus });
  };

  const handleRowClick = (productId: string) => {
    router.push(`/admin/products/${productId}`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Products</h1>
          <p className="mt-1 text-sm text-[#514349]">
            Manage your product catalog, inventory, merchandising, and pricing.
          </p>
        </div>
        <Button asChild className="h-9 rounded-lg px-4 text-sm shadow-sm">
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>

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
            {activeTab === tab.value ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
            ) : null}
          </Button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-[#D5C1C9]/30 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#191C1E]">
                Refine Catalog
              </h2>
              <p className="mt-1 text-sm text-[#514349]">
                Filter by type, collection, and tags, then sort for quicker catalog review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-[#514349]">
            <span>{isPending ? 'Loading products...' : `${products.length} shown`}</span>
            {hasActiveRefinements ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 rounded-md px-2.5"
                onClick={handleClearRefinements}
              >
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#514349]/70">
              Product Type
            </label>
            <select
              className={FILTER_FIELD_CLASSES}
              value={typeFilter ?? 'all'}
              onChange={(event) => handleTypeChange(event.target.value)}
            >
              {ADMIN_PRODUCT_TYPE_ITEMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#514349]/70">
              Collection
            </label>
            <select
              className={FILTER_FIELD_CLASSES}
              value={collectionIdFilter ?? 'all'}
              onChange={(event) => handleCollectionChange(event.target.value)}
            >
              {collectionIdFilter && !collectionNameById.has(collectionIdFilter) ? (
                <option value={collectionIdFilter}>Selected collection</option>
              ) : null}
              <option value="all">All collections</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          <TagFilterDropdown
            availableTags={tags}
            isUnavailable={isTagsError}
            onClearTags={handleClearTagFilters}
            onToggleTag={handleTagToggle}
            selectedTagIds={tagIdFilters}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#514349]/70">
              Sort
            </label>
            <select
              className={FILTER_FIELD_CLASSES}
              value={sortFilter ?? 'default'}
              onChange={(event) => handleSortChange(event.target.value)}
            >
              {ADMIN_PRODUCT_SORT_ITEMS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isCollectionsError || isTagsError ? (
          <p className="mt-3 text-xs text-[#514349]/75">
            Some filter options are temporarily unavailable. The product list will continue to load.
          </p>
        ) : null}
      </div>

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
          <EmptyState
            hasActiveRefinements={hasActiveRefinements}
            onClearRefinements={handleClearRefinements}
            statusFilter={statusFilter}
          />
        ) : (
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
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="cursor-pointer transition-colors hover:bg-[#F2F4F6]/50"
                    onClick={() => handleRowClick(product.id)}
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
                        {getCollectionDisplayName(product, collectionNameById)}
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
