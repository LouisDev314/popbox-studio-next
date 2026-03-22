'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { ICollection } from '@/interfaces/product';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NumericInput } from '@/components/ui/numeric-input';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const DEFAULT_FORM: FormState = { name: '', slug: '', description: '', sortOrder: '0', isActive: true };

export default function AdminCollectionsPageClient() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  const { data: fetchRes, isPending } = useCustomizeQuery<ICollection[]>({
    queryKey: ['admin', 'collections'],
    queryFn: QueryConfigs.fetchAdminCollections,
  });

  const collections = fetchRes?.data?.data || [];
  const sortedCollections = [...collections].sort((a, b) => a.sortOrder - b.sortOrder);

  const { mutation: createCollection, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      setIsDialogOpen(false);
    },
  });

  const { mutation: updateCollection, isPending: isUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'collections'] });
      setIsDialogOpen(false);
    },
  });

  const openCreateDialog = () => {
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (collection: ICollection) => {
    setFormData({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description || '',
      sortOrder: String(collection.sortOrder),
      isActive: collection.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, ''),
      description: formData.description || null,
      sortOrder: parseInt(formData.sortOrder || '0', 10),
      isActive: formData.isActive,
    };

    if (formData.id) {
      updateCollection({ id: formData.id, data: payload });
    } else {
      createCollection(payload);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Collections</h1>
          <p className="mt-1 text-sm text-[#514349]">Manage product collections and display order.</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary/60 active:bg-[#6A3553]"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      <div className="rounded-xl border border-[#D5C1C9]/30 bg-white">
        {isPending ? (
          <div className="p-8 text-center text-sm text-[#514349]">Loading collections...</div>
        ) : sortedCollections.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#514349]">No collections found. Create your first collection to organize products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#D5C1C9]/30 bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wider text-[#514349]">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5C1C9]/30">
                {sortedCollections.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 text-[#514349] tabular-nums">{c.sortOrder}</td>
                    <td className="px-4 py-3 font-medium text-[#191C1E]">{c.name}</td>
                    <td className="px-4 py-3 text-[#514349]"><code className="rounded bg-[#E6E8EA] px-1.5 py-0.5 text-xs">{c.slug}</code></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-[#E6E8EA] text-[#514349]'}`}>
                        {c.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditDialog(c)}
                        className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-[#514349] hover:bg-[#E6E8EA] hover:text-[#191C1E] transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white border-[#D5C1C9]/50 rounded-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl text-[#191C1E] font-semibold">
              {formData.id ? 'Edit Collection' : 'Create Collection'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Name</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Slug <span className="text-[#514349] font-normal">(Optional)</span></label>
              <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Sort Order</label>
                <NumericInput
                  required
                  value={formData.sortOrder}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      sortOrder: value,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Status</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={e => setFormData(p => ({ ...p, isActive: e.target.value === 'true' }))}
                >
                  <option value="true">Active</option>
                  <option value="false">Hidden</option>
                </select>
              </div>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-[#D5C1C9]/20 gap-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#514349] hover:bg-[#E6E8EA] transition-colors"
                disabled={isCreating || isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="rounded-lg bg-[#191C1E] px-4 py-2 text-sm font-medium text-white hover:bg-black transition-colors disabled:opacity-50"
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save Collection'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
