'use client';

import type { ITag, productType } from '@/interfaces/product';
import { FilterPanelContent } from '@/components/product/filter-panel-content';

interface IProductFilterSidebarProps {
  availableTags: ITag[];
  selectedTags: string[];
  selectedType?: productType;
  onClearAll: () => void;
  onTagToggle: (tagSlug: string) => void;
  onTypeChange: (value: string) => void;
}

export function ProductFilterSidebar(props: IProductFilterSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-24">
      <FilterPanelContent {...props} />
    </aside>
  );
}
