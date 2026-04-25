import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductCollectionsField } from '@/components/admin/product/product-collections-field';
import type { ICollection } from '@/interfaces/product';

const collections: ICollection[] = [
  {
    id: 'collection-1',
    name: 'Featured',
    slug: 'featured',
    description: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'collection-2',
    name: 'Ichiban Kuji',
    slug: 'ichiban-kuji',
    description: null,
    sortOrder: 2,
    isActive: true,
  },
];

describe('ProductCollectionsField', () => {
  it('selects multiple collections and can clear them', async () => {
    const onSelectedCollectionIdsChange = vi.fn();

    const { rerender } = render(
      <ProductCollectionsField
        collections={collections}
        selectedCollectionIds={[]}
        onSelectedCollectionIdsChange={onSelectedCollectionIdsChange}
      />,
    );

    await userEvent.click(screen.getByText('Featured'));

    expect(onSelectedCollectionIdsChange).toHaveBeenLastCalledWith(['collection-1']);

    rerender(
      <ProductCollectionsField
        collections={collections}
        selectedCollectionIds={['collection-1', 'collection-2']}
        onSelectedCollectionIdsChange={onSelectedCollectionIdsChange}
      />,
    );

    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Clear all/i }));

    expect(onSelectedCollectionIdsChange).toHaveBeenLastCalledWith([]);
  });

  it('shows an empty state when no collections exist', () => {
    render(
      <ProductCollectionsField
        collections={[]}
        selectedCollectionIds={[]}
        onSelectedCollectionIdsChange={() => {}}
      />,
    );

    expect(screen.getByText('No collections available.')).toBeInTheDocument();
  });
});
