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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Collections</h1>
        <button
          onClick={openCreateDialog}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 active:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Collection
        </button>
      </div>

      <div className="rounded-xl border border-border/30 bg-card">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading collections...</div>
        ) : sortedCollections.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No collections found. Create your first collection to organize products.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 sm:hidden" data-testid="admin-collections-mobile-list">
              {sortedCollections.map((collection) => (
                <article key={collection.id} className="rounded-2xl border border-border/30 bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{collection.name}</p>
                      <code className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{collection.slug}</code>
                    </div>
                    <button
                      onClick={() => openEditDialog(collection)}
                      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </button>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Sort order</dt>
                      <dd className="mt-1 text-foreground">{collection.sortOrder}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${collection.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {collection.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedCollections.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{c.sortOrder}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.slug}</code></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${c.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {c.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditDialog(c)}
                          className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border-border/50 bg-card p-4 sm:max-w-md sm:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl text-foreground font-semibold">
              {formData.id ? 'Edit Collection' : 'Create Collection'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Slug <span className="text-muted-foreground font-normal">(Optional)</span></label>
              <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated if empty" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Sort Order</label>
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
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
            <DialogFooter className="mt-6 flex-col-reverse gap-2 border-t border-border/20 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
                disabled={isCreating || isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isUpdating}
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 sm:w-auto"
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
