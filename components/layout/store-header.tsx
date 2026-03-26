import { getPublicCollections } from '@/lib/api/public-storefront';
import { mapCollectionToNavItem } from '@/components/layout/store-navigation';
import { StoreHeaderClient } from '@/components/layout/store-header-client';

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

export async function StoreHeader() {
  const collectionNavItems = await getActiveCollectionNavItems();

  return <StoreHeaderClient collectionNavItems={collectionNavItems} />;
}
