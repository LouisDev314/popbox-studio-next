import { cn } from '@/lib/utils';
import type { productStatus } from '@/interfaces/product';

const STATUS_STYLES: Record<productStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-[#C1F0A4]/70 text-[#2D5A1B]',
  archived: 'bg-muted/60 text-muted-foreground/70',
};

const STATUS_LABELS: Record<productStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

interface IAdminProductStatusBadgeProps {
  status: productStatus;
  className?: string;
}

export function AdminProductStatusBadge({ status, className }: IAdminProductStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
