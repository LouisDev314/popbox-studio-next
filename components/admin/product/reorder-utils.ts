import { arrayMove } from '@dnd-kit/sortable';

type SortableEntity = {
  id: string;
  sortOrder: number;
};

export function moveSortableItems<T extends SortableEntity>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const currentIndex = items.findIndex((item) => item.id === activeId);
  const nextIndex = items.findIndex((item) => item.id === overId);

  if (currentIndex < 0 || nextIndex < 0 || currentIndex === nextIndex) {
    return items;
  }

  return arrayMove(items, currentIndex, nextIndex).map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}

export function buildSortOrderUpdates<T extends SortableEntity>(
  previousItems: T[],
  nextItems: T[],
): Array<Pick<SortableEntity, 'id' | 'sortOrder'>> {
  const previousSortMap = new Map(previousItems.map((item) => [item.id, item.sortOrder]));

  return nextItems.reduce<Array<Pick<SortableEntity, 'id' | 'sortOrder'>>>((updates, item) => {
    if (previousSortMap.get(item.id) !== item.sortOrder) {
      updates.push({
        id: item.id,
        sortOrder: item.sortOrder,
      });
    }

    return updates;
  }, []);
}

export function orderSortableItemsByIds<T extends SortableEntity>(
  items: T[],
  orderedIds: string[] | null,
): T[] {
  if (!orderedIds || orderedIds.length !== items.length) {
    return items;
  }

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const orderedItems: T[] = [];

  for (const id of orderedIds) {
    const item = itemMap.get(id);

    if (!item) {
      return items;
    }

    orderedItems.push(item);
  }

  return orderedItems.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}
