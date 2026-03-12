/**
 * Input 组件 - FluentRise 设计系统
 * 
 * 统一的输入框组件，支持各种状态和变体
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

const inputVariants = cva(
  'w-full rounded-xl bg-[var(--bg-secondary)] border-2 border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all duration-200 focus:border-[var(--primary)] focus:bg-[var(--bg-primary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        sm: 'h-10 px-3 text-sm',
        md: 'h-14 px-4 text-base',
        lg: 'h-16 px-5 text-lg',
      },
      error: {
        true: 'border-[var(--error)] focus:border-[var(--error)]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      error,
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const hasError = !!error || !!errorText;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ size, error: hasError }),
              leftIcon && 'pl-12',
              rightIcon && 'pr-12',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && !hasError && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{helperText}</p>
        )}
        {errorText && (
          <p className="mt-1.5 text-sm text-[var(--error)] flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
