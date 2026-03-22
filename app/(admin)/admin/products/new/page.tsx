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
import { ICollection, ITag, productStatus, productType, IAdminProduct } from '@/interfaces/product';
import { handleNumericInputChange } from '@/utils/admin';

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

    const priceCents = Math.round(parseFloat(formData.priceStr || '0') * 100);
    const onHand = parseInt(formData.onHand || '0', 10);
    const lowStockThreshold = parseInt(formData.lowStockThreshold || '0', 10);

    createProduct({
      name: formData.name,
      description: formData.description || null,
      productType: formData.productType,
      status: formData.status,
      priceCents,
      sku: formData.sku || null,
      collectionId: formData.collectionId || null,
      tagIds: formData.tagIds,
      inventory:
        formData.productType === 'standard'
          ? {
            onHand,
            lowStockThreshold,
          }
          : null,
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
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D5C1C9]/50 bg-white text-[#514349] transition-colors hover:bg-[#F2F4F6]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Create Product</h1>
            <p className="mt-1 text-sm text-[#514349]">Add a new product to your catalog.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[#D5C1C9]/50 bg-white px-4 text-sm font-medium text-[#191C1E] transition-colors hover:bg-[#F2F4F6]"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium shadow-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Info */}
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Core Information</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mystery Box Vol. 1"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Description</label>
                <textarea
                  className={inputClasses + ' min-h-[120px] resize-y py-3'}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed product description..."
                />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Pricing & Inventory</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">SKU (Optional)</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. PB-MB-01"
                />
              </div>

              {formData.productType === 'standard' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Stock on Hand</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={formData.onHand}
                      onChange={(e) => handleNumericInputChange('onHand', e.target.value, setFormData)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Low Stock Threshold</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={formData.lowStockThreshold}
                      onChange={(e) => handleNumericInputChange('lowStockThreshold', e.target.value, setFormData)}
                      placeholder="0"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pending Sections */}
          <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-[#191C1E]">Media & Images</h3>
            <p className="mt-1 text-sm text-[#514349]">Save the product first to upload images and set their order.</p>
          </div>

          {formData.productType === 'kuji' && (
            <div className="rounded-xl border border-dashed border-[#D5C1C9] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <Boxes className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-sm font-medium text-[#191C1E]">Kuji Prizes</h3>
              <p className="mt-1 text-sm text-[#514349]">Save the product first to manage Kuji prizes and inventory.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#D5C1C9]/30 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-[#191C1E] uppercase tracking-wider">Organization</h2>
            <div className="space-y-4">
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
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Product Type</label>
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
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Collection (Optional)</label>
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
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Tags (Optional)</label>
                <div className="max-h-48 overflow-y-auto rounded-md border border-input p-2">
                  {tags.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">No tags available.</p>
                  ) : (
                    tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted md:cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.tagIds.includes(tag.id)}
                          onChange={() => toggleTag(tag.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-[#514349]">{tag.name}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">{tag.tagType}</span>
                      </label>
                    ))
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
