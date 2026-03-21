'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { ITag } from '@/interfaces/product';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  tagType: string;
};

const DEFAULT_FORM: FormState = { name: '', slug: '', tagType: '' };

export default function AdminTagsPageClient() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  const { data: fetchRes, isPending } = useCustomizeQuery<ITag[]>({
    queryKey: ['admin', 'tags'],
    queryFn: QueryConfigs.fetchAdminTags,
  });

  const tags = fetchRes?.data?.data || [];
  const sortedTags = [...tags].sort((a, b) => a.tagType.localeCompare(b.tagType) || a.name.localeCompare(b.name));

  const { mutation: createTag, isPending: isCreating } = useCustomizeMutation({
    mutationFn: MutationConfigs.createAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      setIsDialogOpen(false);
    },
  });

  const { mutation: updateTag, isPending: isUpdating } = useCustomizeMutation({
    mutationFn: MutationConfigs.updateAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] });
      setIsDialogOpen(false);
    },
  });

  const openCreateDialog = () => {
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: ITag) => {
    setFormData({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      tagType: tag.tagType,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, ''),
      tagType: formData.tagType.toLowerCase().trim(),
    };

    if (formData.id) {
      updateTag({ id: formData.id, data: payload });
    } else {
      createTag(payload);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Tags</h1>
          <p className="mt-1 text-sm text-[#514349]">Manage free-form tags to categorize your products.</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-br from-[#8A486F] to-[#F9A8D4] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Tag
        </button>
      </div>

      <div className="rounded-xl border border-[#D5C1C9]/30 bg-white">
        {isPending ? (
          <div className="p-8 text-center text-sm text-[#514349]">Loading tags...</div>
        ) : sortedTags.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-[#514349]">No tags found. Create tags to organize products.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#D5C1C9]/30 bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-wider text-[#514349]">
                  <th className="px-4 py-3">Tag Type</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5C1C9]/30">
                {sortedTags.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-secondary">{t.tagType}</td>
                    <td className="px-4 py-3 font-medium text-[#191C1E]">{t.name}</td>
                    <td className="px-4 py-3 text-[#514349]"><code className="rounded bg-[#E6E8EA] px-1.5 py-0.5 text-xs">{t.slug}</code></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditDialog(t)}
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
              {formData.id ? 'Edit Tag' : 'Create Tag'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Tag Type</label>
              <Input required value={formData.tagType} onChange={e => setFormData(p => ({ ...p, tagType: e.target.value }))} placeholder="e.g. format, series, theme" />
              <p className="mt-1 text-xs text-[#514349]">A free-form category grouping for your tags.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Name</label>
                <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Holographic" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#191C1E]">Slug <span className="text-[#514349] font-normal">(Optional)</span></label>
                <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated" />
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
                {isCreating || isUpdating ? 'Saving...' : 'Save Tag'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
