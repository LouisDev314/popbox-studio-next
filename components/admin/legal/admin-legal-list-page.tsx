'use client';

import { Plus, Pencil, FileText } from 'lucide-react';
import QueryConfigs from '@/configs/api/query-config';
import useCustomizeQuery from '@/hooks/use-customize-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  AdminLegalType,
  IAdminFaqItem,
  IAdminFaqListResponse,
  IAdminLegalListResponse,
  LegalDocumentType,
  IAdminLegalDocument,
} from '@/interfaces/legal';
import { useRouter } from 'next/navigation';

const CANONICAL_TYPES: { type: LegalDocumentType; label: string; description: string }[] = [
  { type: 'shipping_returns', label: 'Shipping & Returns', description: 'Policies on shipping and returns.' },
  { type: 'terms', label: 'Terms of Service', description: 'Legal terms for using the platform.' },
  { type: 'privacy', label: 'Privacy Policy', description: 'How user data is handled and protected.' },
];

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function AdminLegalListPage() {
  const { data: legalData, isPending: isLegalPending, isError: isLegalError } = useCustomizeQuery<IAdminLegalListResponse>({
    queryKey: ['admin', 'legal'],
    queryFn: () => QueryConfigs.fetchAdminLegalDocs(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: faqData, isPending: isFaqPending, isError: isFaqError } = useCustomizeQuery<IAdminFaqListResponse>({
    queryKey: ['admin', 'legal', 'faq'],
    queryFn: () => QueryConfigs.fetchAdminFaqItems(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const legalItems = legalData?.data?.data?.items ?? [];
  const faqItems = faqData?.data?.data?.items ?? [];
  const isPending = isLegalPending || isFaqPending;
  const isError = isLegalError || isFaqError;

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Legal Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your store policies, terms, and FAQs.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {isPending ? (
          <LoadingSkeleton />
        ) : isError ? (
          <div className="rounded-xl bg-destructive/5 py-16 text-center">
            <p className="font-medium text-destructive">
              Failed to load legal documents. Please try again.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CANONICAL_TYPES.map(({ type, label, description }) => {
              // Find the active version for this type
              const docsForType = legalItems.filter((i) => i.type === type);
              const activeDoc = docsForType.find((i) => i.isActive) ?? docsForType[0]; // fallback to latest if none active

              return (
                <DocumentCard 
                  key={type} 
                  type={type} 
                  label={label} 
                  description={description} 
                  activeDoc={activeDoc} 
                />
              );
            })}
            <FaqCard faqItems={faqItems} />
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  type,
  label,
  description,
  activeDoc,
}: {
  type: AdminLegalType;
  label: string;
  description: string;
  activeDoc?: IAdminLegalDocument;
}) {
  const router = useRouter();
  const exists = !!activeDoc;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              exists
                ? 'bg-[#E7F0E7] text-[#116211]' // Published
                : 'bg-muted text-muted-foreground', // Not created
            )}
          >
            {exists ? 'Published' : 'Not created'}
          </span>
        </div>
        <h3 className="mt-4 font-semibold text-foreground">{label}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>

        <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span className="font-medium">Active Version</span>
            <span>{exists ? `v${activeDoc.version}` : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Last Updated</span>
            <span>{exists ? formatRelativeDate(activeDoc.updatedAt) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          onClick={() => router.push(`/admin/legal/${type}`)}
          className={cn(
            'w-full rounded-lg shadow-none',
            !exists && 'bg-primary text-white hover:opacity-90',
            exists && 'border border-border bg-card text-foreground hover:bg-muted',
          )}
          variant={exists ? 'outline' : 'default'}
        >
          {exists ? (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FaqCard({ faqItems }: { faqItems: IAdminFaqItem[] }) {
  const router = useRouter();
  const publishedCount = faqItems.filter((item) => item.isPublished).length;
  const latestUpdatedAt = faqItems.reduce<string | null>((latest, item) => {
    if (!latest || new Date(item.updatedAt) > new Date(latest)) {
      return item.updatedAt;
    }

    return latest;
  }, null);
  const exists = faqItems.length > 0;
  const statusClassName = !exists
    ? 'bg-muted text-muted-foreground'
    : publishedCount > 0
      ? 'bg-[#E7F0E7] text-[#116211]'
      : 'bg-[#FFF7E6] text-[#8A6116]';
  const statusLabel = !exists
    ? 'Not created'
    : publishedCount > 0
      ? 'Published'
      : 'Draft only';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusClassName)}>
            {statusLabel}
          </span>
        </div>
        <h3 className="mt-4 font-semibold text-foreground">FAQ</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          Manage published FAQ items for the storefront accordion.
        </p>

        <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span className="font-medium">FAQ Items</span>
            <span>{faqItems.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Published</span>
            <span>{publishedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Last Updated</span>
            <span>{formatRelativeDate(latestUpdatedAt ?? undefined)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          onClick={() => router.push('/admin/legal/faq')}
          className={cn(
            'w-full rounded-lg shadow-none',
            !exists && 'bg-primary text-white hover:opacity-90',
            exists && 'border border-border bg-card text-foreground hover:bg-muted',
          )}
          variant={exists ? 'outline' : 'default'}
        >
          {exists ? (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col justify-between rounded-xl border border-border/40 bg-card p-5 shadow-sm">
          <div>
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="mt-4 h-5 w-1/2 rounded bg-muted" />
            <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
            
            <div className="mt-4 gap-2 flex flex-col">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
            </div>
          </div>
          <div className="mt-6 h-9 w-full rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}
