'use client';

import { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, History, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import type {
  AdminLegalType,
  IAdminFaqCreate,
  IAdminFaqItem,
  IAdminFaqListResponse,
  IAdminFaqUpdate,
  IAdminLegalListResponse,
  IAdminLegalDocument,
  IAdminLegalCreate,
  IAdminLegalUpdate,
  LegalDocumentType,
} from '@/interfaces/legal';
import { cn } from '@/lib/utils';

const CANONICAL_LABELS: Record<AdminLegalType, string> = {
  faq: 'FAQ',
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

const DEFAULT_FAQ_FORM = {
  question: '',
  answer: '',
  category: 'General',
  sortOrder: '0',
  isPublished: true,
};

function createDefaultFaqFormState() {
  return {
    ...DEFAULT_FAQ_FORM,
  };
}

function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function AdminLegalEditorPage() {
  const params = useParams();
  const type = String(params.type ?? '') as AdminLegalType;

  if (type === 'faq') {
    return <AdminFaqEditor />;
  }

  return <AdminLegalDocumentEditor type={type as LegalDocumentType} />;
}

function AdminLegalDocumentEditor({ type }: { type: LegalDocumentType }) {
  const router = useRouter();
  const label = CANONICAL_LABELS[type];
  const queryClient = useQueryClient();

  const { data: listData, isPending: isListPending } = useCustomizeQuery<IAdminLegalListResponse>({
    queryKey: ['admin', 'legal'],
    queryFn: () => QueryConfigs.fetchAdminLegalDocs(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const allItems = listData?.data?.data?.items ?? [];
  const typeDocs = allItems.filter((i) => i.type === type);
  const activeDoc = typeDocs.find((i) => i.isActive) ?? typeDocs[0];
  const exists = !!activeDoc;

  const { mutation: createDoc, isPending: isCreating } = useCustomizeMutation<
    IAdminLegalDocument,
    IAdminLegalCreate
  >({
    mutationFn: MutationConfigs.createAdminLegalDoc,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
      router.push('/admin/legal');
    },
  });

  const { mutation: updateDoc, isPending: isUpdating } = useCustomizeMutation<
    IAdminLegalDocument,
    { id: string; data: IAdminLegalUpdate }
  >({
    mutationFn: MutationConfigs.updateAdminLegalDoc,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
      router.push('/admin/legal');
    },
  });

  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = (submittedContent: string, currentDoc?: IAdminLegalDocument) => {
    if (exists && currentDoc) {
      updateDoc({
        id: currentDoc.id,
        data: {
          content: submittedContent,
        },
      });
    } else {
      createDoc({
        type,
        content: submittedContent,
      });
    }
  };

  if (isListPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#191C1E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8 shrink-0 text-[#514349]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">
            {exists ? `Edit ${label}` : `Create ${label}`}
          </h1>
          <p className="mt-1 text-sm text-[#514349]">
            {exists 
              ? `Currently editing version ${activeDoc.version}. Saving will publish a new version.`
              : 'Create the first version of this document.'}
          </p>
        </div>
      </div>

      <LegalDocumentForm
        key={activeDoc?.id ?? type ?? 'legal-document'}
        exists={exists}
        activeDoc={activeDoc}
        isSubmitting={isSubmitting}
        onCancel={() => router.back()}
        onSubmit={(content) => {
          handleSubmit(content, activeDoc);
        }}
      />

      {/* Version History */}
      {typeDocs.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#191C1E]">
            <History className="h-5 w-5 text-[#514349]" />
            Version History
          </h2>
          <div className="overflow-hidden rounded-xl border border-[#D5C1C9]/40 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#D5C1C9]/20 bg-[#F9FAFB] text-[#514349]">
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5C1C9]/20">
                {typeDocs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium text-[#191C1E]">v{doc.version}</td>
                    <td className="px-4 py-3">
                      {doc.isActive ? (
                        <span className="inline-flex rounded-full bg-[#E7F0E7] px-2 py-0.5 text-xs font-medium text-[#116211]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#F2F4F6] px-2 py-0.5 text-xs font-medium text-[#514349]">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#514349]">
                      {formatRelativeDate(doc.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminFaqEditor() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState(createDefaultFaqFormState);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const questionInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isPending, isError } = useCustomizeQuery<IAdminFaqListResponse>({
    queryKey: ['admin', 'legal', 'faq'],
    queryFn: () => QueryConfigs.fetchAdminFaqItems(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const faqItems = [...(data?.data?.data?.items ?? [])].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.question.localeCompare(right.question);
  });

  const { mutation: createFaqItem, isPending: isCreating } = useCustomizeMutation<
    IAdminFaqItem,
    IAdminFaqCreate
  >({
    mutationFn: MutationConfigs.createAdminFaqItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal', 'faq'] });
      startCreatingNewItem();
    },
  });

  const { mutation: updateFaqItem, isPending: isUpdating } = useCustomizeMutation<
    IAdminFaqItem,
    { id: string; data: IAdminFaqUpdate }
  >({
    mutationFn: MutationConfigs.updateAdminFaqItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'legal', 'faq'] });
    },
  });

  const isSubmitting = isCreating || isUpdating;
  const isCreatingNewItem = editingItemId === null;
  const selectedItem = faqItems.find((item) => item.id === editingItemId);

  function focusFaqForm() {
    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      questionInputRef.current?.focus();
    });
  }

  function startCreatingNewItem() {
    setEditingItemId(null);
    setFormState(createDefaultFaqFormState());
    focusFaqForm();
  }

  function startEditingItem(item: IAdminFaqItem) {
    setEditingItemId(item.id);
    setFormState({
      question: item.question,
      answer: item.answer,
      category: item.category,
      sortOrder: String(item.sortOrder),
      isPublished: item.isPublished,
    });
    focusFaqForm();
  }

  function handleSubmit() {
    const sortOrder = Number.parseInt(formState.sortOrder, 10);

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return;
    }

    const payload = {
      question: formState.question.trim(),
      answer: formState.answer.trim(),
      category: formState.category.trim(),
      sortOrder,
      isPublished: formState.isPublished,
    };

    if (editingItemId) {
      updateFaqItem({
        id: editingItemId,
        data: payload,
      });

      return;
    }

    createFaqItem(payload);
  }

  function handleTogglePublished(item: IAdminFaqItem) {
    updateFaqItem({
      id: item.id,
      data: {
        question: item.question,
        answer: item.answer,
        category: item.category,
        sortOrder: item.sortOrder,
        isPublished: !item.isPublished,
      },
    });
  }

  if (isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#191C1E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8 shrink-0 text-[#514349]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191C1E]">Manage FAQ</h1>
          <p className="mt-1 text-sm text-[#514349]">
            Create, edit, and publish FAQ items from the same legal admin area.
          </p>
        </div>
      </div>

      {isError ? (
        <div className="mt-8 rounded-xl bg-destructive/5 py-16 text-center">
          <p className="font-medium text-destructive">
            Failed to load FAQ items. Please try again.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-xl border border-[#D5C1C9]/40 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#191C1E]">FAQ Items</h2>
                <p className="mt-1 text-sm text-[#514349]">
                  Published items appear on the storefront FAQ page in sort order.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={startCreatingNewItem}>
                <Plus className="mr-2 h-4 w-4" />
                New FAQ Item
              </Button>
            </div>

            {faqItems.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-[#D5C1C9]/60 bg-[#FBFAFB] px-6 py-10 text-center">
                <p className="text-sm font-medium text-[#191C1E]">No FAQ items yet.</p>
                <p className="mt-1 text-sm text-[#514349]">
                  Create the first FAQ item below. Leave it unpublished until it is ready.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {faqItems.map((item) => {
                  const isEditingThisItem = item.id === editingItemId;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-xl border px-4 py-4 transition-colors',
                        isEditingThisItem
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-[#D5C1C9]/40 bg-[#FBFAFB]',
                      )}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-[#191C1E]">{item.question}</h3>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                item.isPublished
                                  ? 'bg-[#E7F0E7] text-[#116211]'
                                  : 'bg-[#F2F4F6] text-[#514349]',
                              )}
                            >
                              {item.isPublished ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#514349]">
                            <span>Category: {item.category}</span>
                            <span>Sort Order: {item.sortOrder}</span>
                            <span>Updated: {formatRelativeDate(item.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => startEditingItem(item)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant={item.isPublished ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleTogglePublished(item)}
                            disabled={isSubmitting}
                          >
                            {item.isPublished ? 'Unpublish' : 'Publish'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            className="mt-8 space-y-8"
          >
            <div ref={formSectionRef} className="rounded-xl border border-[#D5C1C9]/40 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#191C1E]">
                    {isCreatingNewItem ? 'Create FAQ Item' : 'Edit FAQ Item'}
                  </h2>
                  <p className="mt-1 text-sm text-[#514349]">
                    {selectedItem
                      ? `Editing ${selectedItem.question}.`
                      : 'Add a new FAQ item to the storefront list.'}
                  </p>
                </div>
                {!isCreatingNewItem ? (
                  <Button type="button" variant="outline" onClick={startCreatingNewItem}>
                    Create New Instead
                  </Button>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="faq-question" className="mb-1.5 block text-sm font-medium text-[#191C1E]">
                    Question
                  </label>
                  <Input
                    id="faq-question"
                    ref={questionInputRef}
                    value={formState.question}
                    onChange={(event) => setFormState((current) => ({
                      ...current,
                      question: event.target.value,
                    }))}
                    placeholder="When will my order ship?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="faq-category" className="mb-1.5 block text-sm font-medium text-[#191C1E]">
                    Category
                  </label>
                  <Input
                    id="faq-category"
                    value={formState.category}
                    onChange={(event) => setFormState((current) => ({
                      ...current,
                      category: event.target.value,
                    }))}
                    placeholder="Shipping"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="faq-sort-order" className="mb-1.5 block text-sm font-medium text-[#191C1E]">
                    Sort Order
                  </label>
                  <Input
                    id="faq-sort-order"
                    type="number"
                    min="0"
                    value={formState.sortOrder}
                    onChange={(event) => setFormState((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))}
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="faq-answer" className="mb-1.5 block text-sm font-medium text-[#191C1E]">
                    Answer
                  </label>
                  <Textarea
                    id="faq-answer"
                    rows={8}
                    value={formState.answer}
                    onChange={(event) => setFormState((current) => ({
                      ...current,
                      answer: event.target.value,
                    }))}
                    placeholder="Orders usually ship within 2 to 5 business days."
                    required
                  />
                </div>
              </div>

              <label className="mt-5 flex items-center gap-3 text-sm text-[#191C1E]">
                <input
                  type="checkbox"
                  checked={formState.isPublished}
                  onChange={(event) => setFormState((current) => ({
                    ...current,
                    isPublished: event.target.checked,
                  }))}
                  className="h-4 w-4 rounded border border-input"
                />
                Publish this FAQ item on save
              </label>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-[#D5C1C9]/20 pt-6">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting
                  || !formState.question.trim()
                  || !formState.answer.trim()
                  || !formState.category.trim()
                  || !Number.isInteger(Number.parseInt(formState.sortOrder, 10))
                  || Number.parseInt(formState.sortOrder, 10) < 0
                }
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </span>
                ) : isCreatingNewItem ? (
                  'Create FAQ Item'
                ) : (
                  'Save FAQ Item'
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function LegalDocumentForm({
  exists,
  activeDoc,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  exists: boolean;
  activeDoc?: IAdminLegalDocument;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (content: string, activeDoc?: IAdminLegalDocument) => void;
}) {
  const [content, setContent] = useState(activeDoc?.content ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(content.trim(), activeDoc);
      }}
      className="mt-8 space-y-8"
    >
      <div className="rounded-xl border border-[#D5C1C9]/40 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#191C1E]">Document Content</h2>
        <div className="mt-4">
          <label htmlFor="content" className="sr-only">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter document text here..."
            rows={25}
            required
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-[#D5C1C9]/20 pt-6">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Saving...
            </span>
          ) : exists ? (
            'Publish New Version'
          ) : (
            'Create and Publish'
          )}
        </Button>
      </div>
    </form>
  );
}
