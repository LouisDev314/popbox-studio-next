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
    <div className="flex min-h-full items-center justify-center py-1">
      <div className="flex w-full flex-col items-center justify-center rounded-4xl border border-dashed border-border/70 bg-card/70 px-8 py-12 text-center">
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
