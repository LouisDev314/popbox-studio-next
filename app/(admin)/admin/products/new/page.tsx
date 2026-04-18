'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Image as ImageIcon, Boxes } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { ICollection, ITag, productStatus, productType, IAdminProduct } from '@/interfaces/product';
import { normalizeTagId, parsePriceToCents, parseWholeNumber, toNullableText } from '@/utils/admin';

const DEFAULT_CURRENCY = 'CAD';

export default function NewProductPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    productType: 'standard' as productType,
    status: 'draft' as productStatus,
    priceStr: '',
    sku: '',
    collectionId: '',
    tagIds: [] as string[],
    onHand: '',
    lowStockThreshold: '',
  });

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

  const { mutation: createProduct, isPending } = useCustomizeMutation<
    IAdminProduct,
    Parameters<typeof MutationConfigs.createAdminProduct>[0]
  >({
    mutationFn: MutationConfigs.createAdminProduct,
    onSuccess: (res) => {
      if (res?.data?.data?.id) {
        router.push(`/admin/products/${res.data.data.id}`);
      } else {
        router.push('/admin/products');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceCents = parsePriceToCents(formData.priceStr);
    const onHand = formData.productType === 'standard' ? parseWholeNumber(formData.onHand) : 0;
    const lowStockThreshold = formData.productType === 'standard' ? parseWholeNumber(formData.lowStockThreshold) : 0;

    createProduct({
      collectionId: formData.collectionId || null,
      name: formData.name,
      description: toNullableText(formData.description),
      productType: formData.productType,
      status: formData.status,
      priceCents,
      currency: DEFAULT_CURRENCY,
      sku: toNullableText(formData.sku),
      tagIds: formData.tagIds,
      lowStockThreshold,
      onHand,
    });
  };

  const toggleTag = (tagId: string) => {
    const normalizedTagId = normalizeTagId(tagId);

    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(normalizedTagId)
        ? prev.tagIds.filter((id) => id !== normalizedTagId)
        : [...prev.tagIds, normalizedTagId],
    }));
  };

  const inputClasses = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <Button asChild type="button" variant="outline" size="icon" className="h-9 w-9 rounded-lg border-border/50 text-muted-foreground">
            <Link href="/admin/products" aria-label="Back to products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create Product</h1>
            <p className="mt-1 text-sm text-muted-foreground">Add a new product to your catalog.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild type="button" variant="outline" className="h-9 w-full rounded-lg border-border/50 text-foreground sm:w-auto">
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-medium shadow-sm transition-colors sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">Core Information</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mystery Box Vol. 1"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  className={inputClasses + ' min-h-[120px] resize-y py-3'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed product description..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">Pricing & Inventory</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Price (CAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">SKU (Optional)</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. PB-MB-01"
                />
              </div>

              {formData.productType === 'standard' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Stock on Hand</label>
                    <NumericInput
                      required
                      value={formData.onHand}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, onHand: value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Low Stock Threshold</label>
                    <NumericInput
                      required
                      value={formData.lowStockThreshold}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, lowStockThreshold: value }))}
                      placeholder="0"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Media & Images</h3>
            <p className="mt-1 text-sm text-muted-foreground">Save the product first to upload images and set their order.</p>
          </div>

          {formData.productType === 'kuji' && (
            <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Boxes className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-sm font-medium text-foreground">Kuji Prizes</h3>
              <p className="mt-1 text-sm text-muted-foreground">Save the product first to manage Kuji prizes and inventory.</p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border border-border/30 bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">Product Type</label>
                <select
                  className={inputClasses}
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value as productType })}
                >
                  <option value="standard">Standard</option>
                  <option value="kuji">Kuji</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Collection (Optional)</label>
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

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tags (Optional)</label>
                <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-input bg-background p-3">
                  {tags.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">No tags available.</p>
                  ) : (
                    tags.map((tag) => {
                      const normalizedTagId = normalizeTagId(tag.id);
                      const isSelected = formData.tagIds.includes(normalizedTagId);

                      return (
                        <label
                          key={tag.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:cursor-pointer ${
                            isSelected
                              ? 'border-primary/30 bg-primary/10 text-primary shadow-sm'
                              : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:bg-[#F7F4F6]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTag(normalizedTagId)}
                            className="hidden"
                          />
                          <span>{tag.name}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground/70'}`}>
                            {tag.tagType}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
