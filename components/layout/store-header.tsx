import axios from 'axios';
import getEnvConfig from '@/configs/env';
import { IBaseApiResponse } from '@/interfaces/api-response';
import { ICollection } from '@/interfaces/product';
import { mapCollectionToNavItem } from '@/components/layout/store-navigation';
import { StoreHeaderClient } from '@/components/layout/store-header-client';

async function getActiveCollectionNavItems() {
  const apiBaseUrl = getEnvConfig().apiBaseUrl.replace(/\/$/, '');

  try {
    const response = await axios.get<IBaseApiResponse<ICollection[]>>(
      `${apiBaseUrl}/api/v1/collections`,
    );

    const collections = Array.isArray(response.data?.data) ? response.data.data : [];

    return collections
      .filter((collection) => collection.isActive)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.name.localeCompare(right.name);
      })
      .map(mapCollectionToNavItem);
  } catch {
    return [];
  }
}

export async function StoreHeader() {
  const collectionNavItems = await getActiveCollectionNavItems();

  return <StoreHeaderClient collectionNavItems={collectionNavItems} />;
}
