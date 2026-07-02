'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ADMIN_PRODUCT_DEFAULT_COLLECTION_ID,
  ADMIN_PRODUCT_DEFAULT_SORT,
  ADMIN_PRODUCT_DEFAULT_STATUS,
  ADMIN_PRODUCT_DEFAULT_TAG_ID,
  ADMIN_PRODUCT_DEFAULT_TYPE,
  buildAdminProductListQueryParams,
  hasActiveAdminProductRefinements,
  parseAdminCollectionIdParam,
  parseAdminProductSortParam,
  parseAdminProductStatusParam,
  parseAdminProductTypeParam,
  parseAdminTagIdParam,
  type IAdminProductListQueryParams,
} from '@/lib/admin-product-filters';
import type { productStatus } from '@/interfaces/product';

export function useAdminProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo<IAdminProductListQueryParams>(() => buildAdminProductListQueryParams({
    search: searchParams.get('search') ?? undefined,
    status: parseAdminProductStatusParam(searchParams.get('status') ?? undefined),
    productType: parseAdminProductTypeParam(searchParams.get('productType') ?? undefined),
    collectionId: parseAdminCollectionIdParam(searchParams.get('collectionId') ?? undefined),
    tagId: parseAdminTagIdParam(searchParams.get('tagId') ?? undefined),
    sort: parseAdminProductSortParam(searchParams.get('sort') ?? undefined),
  }), [searchParams]);

  const activeTab = filters.status;
  const hasActiveRefinements = hasActiveAdminProductRefinements(filters);

  const replaceSearchParams = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);

    const nextQueryString = params.toString();
    const nextUrl = nextQueryString ? `/admin/products?${nextQueryString}` : '/admin/products';

    router.replace(nextUrl, { scroll: false });
  };

  const setStatus = (nextTab: productStatus | 'all') => {
    replaceSearchParams((params) => {
      if (nextTab === ADMIN_PRODUCT_DEFAULT_STATUS) {
        params.delete('status');
      } else {
        params.set('status', nextTab);
      }
    });
  };

  const setType = (value: string) => {
    replaceSearchParams((params) => {
      if (value === ADMIN_PRODUCT_DEFAULT_TYPE) {
        params.delete('productType');
      } else {
        params.set('productType', value);
      }
    });
  };

  const setCollectionId = (value: string) => {
    replaceSearchParams((params) => {
      if (value === ADMIN_PRODUCT_DEFAULT_COLLECTION_ID) {
        params.delete('collectionId');
      } else {
        params.set('collectionId', value);
      }
    });
  };

  const setSort = (value: string) => {
    replaceSearchParams((params) => {
      if (value === ADMIN_PRODUCT_DEFAULT_SORT) {
        params.delete('sort');
      } else {
        params.set('sort', value);
      }
    });
  };

  const setTagId = (tagId: string) => {
    replaceSearchParams((params) => {
      if (tagId === ADMIN_PRODUCT_DEFAULT_TAG_ID) {
        params.delete('tagId');
      } else {
        params.set('tagId', tagId);
      }
    });
  };

  const clearTags = () => {
    replaceSearchParams((params) => {
      params.delete('tagId');
    });
  };

  const clearRefinements = () => {
    replaceSearchParams((params) => {
      params.delete('search');
      params.delete('status');
      params.delete('productType');
      params.delete('collectionId');
      params.delete('tagId');
      params.delete('sort');
    });
  };

  return {
    activeTab,
    clearRefinements,
    clearTags,
    filters,
    hasActiveRefinements,
    setCollectionId,
    setSort,
    setStatus,
    setTagId,
    setType,
  };
}
