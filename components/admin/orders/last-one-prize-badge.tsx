import { cn } from '@/lib/utils';

interface ILastOnePrizeBadgeProps {
  className?: string;
}

export default function LastOnePrizeBadge({ className }: ILastOnePrizeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-rose-700',
        className,
      )}
    >
      LO
    </span>
  );
}
