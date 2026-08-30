import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--primary)] text-[var(--primary-foreground)]',
  secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
  outline: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
