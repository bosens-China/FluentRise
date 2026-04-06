/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge 组件 - FluentRise 设计系统
 * 
 * 特点：
 * - 多种颜色变体
 * - 支持圆点和图标
 * - 多种尺寸
 */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary-light)] text-[var(--primary)]',
        secondary: 'bg-[var(--secondary-light)] text-[var(--secondary)]',
        accent: 'bg-[var(--accent-light)] text-[var(--accent)]',
        success: 'bg-[var(--success-light)] text-[var(--success)]',
        warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
        error: 'bg-[var(--error-light)] text-[var(--error)]',
        outline: 'border border-[var(--border)] text-[var(--text-secondary)]',
        solid: 'bg-[var(--primary)] text-white',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, size, dot = false, dotColor, children, ...props },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              dotColor || 'bg-current'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
