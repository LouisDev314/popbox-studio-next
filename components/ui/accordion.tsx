'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        'w-full overflow-hidden rounded-2xl border border-border/60 bg-background',
        className,
      )}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-border/60 last:border-b-0', className)}
      {...props}
    />
  );
}

function AccordionTrigger({
                            className,
                            children,
                            ...props
                          }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex flex-1 items-center justify-between px-6 py-5 text-left text-base font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDownIcon className="pointer-events-none size-5 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon className="pointer-events-none hidden size-5 shrink-0 text-muted-foreground group-aria-expanded/accordion-trigger:block" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
                            className,
                            children,
                            ...props
                          }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          'px-6 pb-6 text-base leading-8 text-muted-foreground',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
