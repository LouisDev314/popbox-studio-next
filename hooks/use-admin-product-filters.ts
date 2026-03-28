'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminProductListQueryParams,
  buildAdminProductsQueryKey,
  hasActiveAdminProductRefinements,
  parseAdminCollectionIdParam,
  parseAdminProductSortParam,
  parseAdminProductStatusParam,
  parseAdminProductTypeParam,
  parseAdminTagIdsParam,
  serializeAdminTagIdsParam,
  type IAdminProductListQueryParams,
} from '@/lib/admin-product-filters';
import type { productStatus } from '@/interfaces/product';

export function useAdminProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo<IAdminProductListQueryParams>(() => buildAdminProductListQueryParams({
    status: parseAdminProductStatusParam(searchParams.get('status') ?? undefined),
    type: parseAdminProductTypeParam(searchParams.get('type') ?? undefined),
    collectionId: parseAdminCollectionIdParam(searchParams.get('collectionId') ?? undefined),
    tagIds: parseAdminTagIdsParam(searchParams.getAll('tagIds')),
    sort: parseAdminProductSortParam(searchParams.get('sort') ?? undefined),
  }), [searchParams]);

  const activeTab = filters.status ?? 'all';
  const hasActiveRefinements = hasActiveAdminProductRefinements(filters);
  const queryKey = buildAdminProductsQueryKey(filters);

  const replaceSearchParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/products?${nextQueryString}` : '/admin/products';

    router.replace(nextUrl, { scroll: false });
  };

  const setStatus = (nextTab: productStatus | 'all') => {
    replaceSearchParams((params) => {
      if (nextTab === 'all') {
        params.delete('status');
      } else {
        params.set('status', nextTab);
      }
    });
  };

  const setType = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'all') {
        params.delete('type');
      } else {
        params.set('type', value);
      }
    });
  };

  const setCollectionId = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'all') {
        params.delete('collectionId');
      } else {
        params.set('collectionId', value);
      }
    });
  };

  const setSort = (value: string) => {
    replaceSearchParams((params) => {
      if (value === 'default') {
        params.delete('sort');
      } else {
        params.set('sort', value);
      }
    });
  };

  const toggleTag = (tagId: string) => {
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

  const clearTags = () => {
    replaceSearchParams((params) => {
      params.delete('tagIds');
    });
  };

  const clearRefinements = () => {
    replaceSearchParams((params) => {
      params.delete('type');
      params.delete('collectionId');
      params.delete('tagIds');
      params.delete('sort');
    });
  };

  return {
    activeTab,
    clearRefinements,
    clearTags,
    filters,
    hasActiveRefinements,
    queryKey,
    setCollectionId,
    setSort,
    setStatus,
    setType,
    toggleTag,
  };
}
