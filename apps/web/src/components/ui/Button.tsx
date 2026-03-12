import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button 组件 - FluentRise 设计系统
 * 
 * 特点：
 * - 多邻国风格的立体感按钮（带底部阴影）
 * - 多种变体：primary, secondary, accent, outline, ghost
 * - 多种尺寸：sm, md, lg
 * - 支持加载状态和禁用状态
 */

const buttonVariants = cva(
  // 基础样式
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        // 主按钮 - 品牌绿色，带立体感
        primary: [
          'bg-[var(--primary)] text-white',
          'shadow-[0_4px_0_rgb(76,176,2)]', // 底部阴影创造立体感
          'hover:bg-[var(--primary-hover)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgb(76,176,2)]',
          'active:translate-y-[2px] active:shadow-[0_2px_0_rgb(76,176,2)]',
          'focus-visible:ring-[var(--primary)]',
        ],
        // 次要按钮 - 蓝色
        secondary: [
          'bg-[var(--secondary)] text-white',
          'shadow-[0_4px_0_rgb(24,153,214)]',
          'hover:bg-[var(--secondary-hover)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgb(24,153,214)]',
          'active:translate-y-[2px] active:shadow-[0_2px_0_rgb(24,153,214)]',
          'focus-visible:ring-[var(--secondary)]',
        ],
        // 强调按钮 - 橙色
        accent: [
          'bg-[var(--accent)] text-white',
          'shadow-[0_4px_0_rgb(230,134,0)]',
          'hover:bg-[var(--accent-hover)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgb(230,134,0)]',
          'active:translate-y-[2px] active:shadow-[0_2px_0_rgb(230,134,0)]',
          'focus-visible:ring-[var(--accent)]',
        ],
        // 轮廓按钮
        outline: [
          'border-2 border-[var(--border)] bg-transparent text-[var(--text-primary)]',
          'shadow-[0_4px_0_var(--border)]',
          'hover:bg-[var(--bg-secondary)] hover:translate-y-[1px] hover:shadow-[0_3px_0_var(--border)]',
          'active:translate-y-[2px] active:shadow-[0_2px_0_var(--border)]',
          'focus-visible:ring-[var(--primary)]',
        ],
        // 幽灵按钮
        ghost: [
          'bg-transparent text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]',
          'active:bg-[var(--bg-tertiary)]',
          'focus-visible:ring-[var(--primary)]',
        ],
        // 成功按钮
        success: [
          'bg-[var(--success)] text-white',
          'shadow-[0_4px_0_rgb(76,176,2)]',
          'hover:bg-[var(--success)]/90 hover:translate-y-[1px] hover:shadow-[0_3px_0_rgb(76,176,2)]',
          'active:translate-y-[2px] active:shadow-[0_2px_0_rgb(76,176,2)]',
          'focus-visible:ring-[var(--success)]',
        ],
      },
      size: {
        sm: 'h-9 px-4 text-sm rounded-lg',
        md: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
