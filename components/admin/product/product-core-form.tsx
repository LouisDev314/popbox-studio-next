'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IAdminProduct, ICollection, ITag, productStatus } from '@/interfaces/product';

function createInitialFormData(product: IAdminProduct) {
  return {
    name: product.name,
    description: product.description || '',
    status: product.status,
    priceStr: (product.priceCents / 100).toFixed(2),
    sku: product.sku || '',
    collectionId: product.collectionId || product.collection?.id || '',
    tagIds: product.tags?.map((tag) => String(tag.id) || []),
  };
}

export function ProductCoreForm({ product }: { product: IAdminProduct }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => createInitialFormData(product));

  const { data: collectionsRes } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
  });

  const { data: tagsRes } = useCustomizeQuery<ITag[]>({
    queryKey: ['admin', 'tags'],
    queryFn: QueryConfigs.fetchAdminTags,
  });

  const collections = collectionsRes?.data?.data || [];
  const tags = tagsRes?.data?.data || [];

  const { mutation: updateProduct, isPending } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminProduct,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(formData.priceStr || '0') * 100);

    updateProduct({
      productId: product.id,
      data: {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        priceCents,
        sku: formData.sku || null,
        collectionId: formData.collectionId || null,
        tagIds: formData.tagIds as string[],
      },
    });
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const inputClasses = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Core Information</h2>
        <Button
          type="submit"
          disabled={isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save Info'}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Name</label>
          <Input
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Description</label>
          <textarea
            className={inputClasses + ' min-h-25 resize-y py-3'}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Status</label>
          <select
            className={inputClasses}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as productStatus })}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Price (CAD)</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-sm text-[#514349]">$</span>
            <Input
              type="text"
              inputMode="decimal"
              required
              className="pl-7"
              value={formData.priceStr}
              onChange={(e) => {
                const value = e.target.value;

                // allow numbers + optional decimal
                if (!/^\d*\.?\d*$/.test(value)) return;

                setFormData((prev) => ({
                  ...prev,
                  priceStr: value,
                }));
              }}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">SKU</label>
          <Input
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Collection</label>
          <select
            className={inputClasses}
            value={formData.collectionId}
            onChange={(e) => setFormData({ ...formData, collectionId: e.target.value })}
          >
            <option value="">None</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Tags</label>
          <div className="max-h-40 overflow-y-auto rounded-md border border-input p-2 flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No tags available.</p>
            ) : (
              tags.map((tag) => (
                <label key={tag.id} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium md:cursor-pointer transition-colors ${formData.tagIds.includes(tag.id) ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-[#E6E8EA] text-[#514349] border border-transparent hover:bg-[#D5C1C9]'}`}>
                  <input
                    type="checkbox"
                    checked={formData.tagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="hidden"
                  />
                  {tag.name}
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
