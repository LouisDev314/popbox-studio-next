'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import { ITag } from '@/interfaces/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getTagTypeLabel, isTagType, TAG_TYPE_OPTIONS, TagType } from '@/lib/tag-types';

type FormState = {
  id?: string;
  name: string;
  slug: string;
  tagType: TagType | '';
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
      tagType: isTagType(tag.tagType) ? tag.tagType : '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isTagType(formData.tagType)) {
      return;
    }

    const payload = {
      name: formData.name,
      slug: formData.slug || formData.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, ''),
      tagType: formData.tagType,
    };

    if (formData.id) {
      updateTag({ id: formData.id, data: payload });
    } else {
      createTag(payload);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tags</h1>
        <Button
          type="button"
          onClick={openCreateDialog}
          className="h-9 w-full justify-center gap-1.5 rounded-lg px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New Tag
        </Button>
      </div>

      <div className="rounded-xl border border-border/30 bg-card">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading tags...</div>
        ) : sortedTags.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No tags found. Create tags to organize products.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 sm:hidden" data-testid="admin-tags-mobile-list">
              {sortedTags.map((tag) => (
                <article key={tag.id} className="rounded-2xl border border-border/30 bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{tag.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{getTagTypeLabel(tag.tagType)}</p>
                      <code className="mt-2 inline-flex rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag.slug}</code>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(tag)}
                      className="h-8 w-8 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Tag Type</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedTags.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium text-foreground">{getTagTypeLabel(t.tagType)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{t.slug}</code></td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(t)}
                          className="h-8 w-8 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
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
              {formData.id ? 'Edit Tag' : 'Create Tag'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Tag Type</label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.tagType}
                onChange={(e) => setFormData((prev) => ({ ...prev, tagType: e.target.value as TagType | '' }))}
              >
                <option value="" disabled>Select tag type</option>
                {TAG_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Only supported storefront tag groups can be assigned here.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                <Input required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Holographic" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Slug <span className="text-muted-foreground font-normal">(Optional)</span></label>
                <Input value={formData.slug} onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))} placeholder="Auto-generated" />
              </div>
            </div>
            <DialogFooter className="mt-6 flex-col-reverse gap-2 border-t border-border/20 pt-4 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="w-full rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 sm:w-auto"
              >
                {isCreating || isUpdating ? 'Saving...' : 'Save Tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
