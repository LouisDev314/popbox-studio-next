import { Separator } from '@/components/ui/separator';

export function AuthFormDivider() {
  return (
    <div
      className="flex w-full items-center gap-3 py-1"
      aria-hidden="true"
    >
      <Separator
        orientation="horizontal"
        className="h-px flex-1 bg-border"
      />

      <span className="shrink-0 text-sm text-muted-foreground">
        or
      </span>

      <Separator
        orientation="horizontal"
        className="h-px flex-1 bg-border"
      />
    </div>
  );
}
