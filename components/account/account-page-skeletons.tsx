import { Skeleton } from '@/components/ui/skeleton';

export function AccountPageSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-6"><Skeleton className="h-9 w-40" /><div className="space-y-3">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-xl" />)}</div></div>;
}
