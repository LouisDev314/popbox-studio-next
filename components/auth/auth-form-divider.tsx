import { Separator } from '@/components/ui/separator';

export function AuthFormDivider() {
  return (
    <div className="relative flex items-center py-1" aria-hidden="true">
      <Separator />
      <span className="absolute left-1/2 -translate-x-1/2 bg-background px-3 text-xs uppercase tracking-wider text-muted-foreground">
        or
      </span>
    </div>
  );
}
