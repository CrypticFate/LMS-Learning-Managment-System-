import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function Accordion({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('divide-y divide-[var(--border)]', className)} {...props} />;
}

export function AccordionItem({ className, ...props }: ComponentProps<'details'>) {
  return <details className={cn('group py-4', className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: ComponentProps<'summary'>) {
  return (
    <summary
      className={cn(
        'flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold marker:hidden [&::-webkit-details-marker]:hidden',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] transition-transform duration-200 group-open:rotate-45"
      >
        +
      </span>
    </summary>
  );
}

export function AccordionContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'grid pt-3 text-sm leading-6 text-[var(--muted)] animate-accordion-down',
        className,
      )}
      {...props}
    />
  );
}
