'use client';

import { type ReactNode } from 'react';

interface IStorefrontDrawerEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function StorefrontDrawerEmptyState(props: IStorefrontDrawerEmptyStateProps) {
  const { action, description, icon, title } = props;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center rounded-4xl border border-dashed border-border/70 bg-card/70 px-8 py-14 text-center sm:py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60">
          {icon}
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
