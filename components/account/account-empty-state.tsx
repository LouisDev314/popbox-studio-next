import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccountEmptyState({ actionHref, actionLabel, description, icon: Icon, title }: { actionHref: string; actionLabel: string; description: string; icon: LucideIcon; title: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="mx-auto h-11 w-11 stroke-1 text-muted-foreground" />
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild className="mt-6"><Link href={actionHref}>{actionLabel}</Link></Button>
    </div>
  );
}
