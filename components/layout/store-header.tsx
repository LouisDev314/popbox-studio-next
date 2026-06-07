import { getPublicCollections, getPublicStoreBannerSettings } from '@/lib/api/public-storefront';
import { mapCollectionToNavItem } from '@/components/layout/store-navigation';
import { StoreHeaderClient } from '@/components/layout/store-header-client';
import type { IStoreBannerSettings } from '@/interfaces/settings';

async function getActiveCollectionNavItems() {
  try {
    const collections = await getPublicCollections();

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

async function getInitialStoreBanner(): Promise<IStoreBannerSettings | null> {
  try {
    return await getPublicStoreBannerSettings();
  } catch {
    return null;
  }
}

export async function StoreHeader() {
  const [collectionNavItems, initialStoreBanner] = await Promise.all([
    getActiveCollectionNavItems(),
    getInitialStoreBanner(),
  ]);

  return (
    <StoreHeaderClient
      collectionNavItems={collectionNavItems}
      initialStoreBanner={initialStoreBanner}
    />
  );
}
