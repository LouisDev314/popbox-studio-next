'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QueryConfigs from '@/configs/api/query-config';
import MutationConfigs from '@/configs/api/mutation-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import useCustomizeMutation from '@/hooks/use-customize-mutation';
import type { 
  LegalDocumentType, 
  IAdminLegalListResponse, 
  IAdminLegalDocument,
  IAdminLegalUpdate,
  IAdminLegalCreate, 
} from '@/interfaces/legal';

const CANONICAL_LABELS: Record<string, string> = {
  faq: 'FAQ',
  shipping_returns: 'Shipping & Returns',
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

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
  const router = useRouter();
  const params = useParams();
  const type = params.type as LegalDocumentType;
  const label = CANONICAL_LABELS[type] || type;

  const queryClient = useQueryClient();

  // Fetch all legal docs
  const { data: listData, isPending: isListPending } = useCustomizeQuery<IAdminLegalListResponse>({
    queryKey: ['admin', 'legal'],
    queryFn: () => QueryConfigs.fetchAdminLegalDocs(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Extract docs for this type
  const allItems = listData?.data?.data?.items ?? [];
  const typeDocs = allItems.filter((i) => i.type === type);
  // Assume flat list is sorted descending by version already contextually, or find active
  const activeDoc = typeDocs.find((i) => i.isActive) ?? typeDocs[0];
  const exists = !!activeDoc;

  // Mutations
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
        key={activeDoc?.id ?? type}
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
