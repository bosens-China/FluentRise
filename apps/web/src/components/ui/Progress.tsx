import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progress 组件 - FluentRise 设计系统
 * 
 * 特点：
 * - 多邻国风格的进度条
 * - 支持条纹动画
 * - 可自定义颜色和高度
 */

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 当前值 (0-100) */
  value: number;
  /** 最大值 */
  max?: number;
  /** 进度条高度 */
  size?: 'sm' | 'md' | 'lg';
  /** 颜色变体 */
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
  /** 是否显示动画条纹 */
  animated?: boolean;
  /** 是否显示百分比标签 */
  showLabel?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 'md',
      variant = 'primary',
      animated = false,
      showLabel = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const sizeClasses = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    };

    const variantClasses = {
      primary: 'bg-[var(--primary)]',
      secondary: 'bg-[var(--secondary)]',
      accent: 'bg-[var(--accent)]',
      success: 'bg-[var(--success)]',
    };

    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        <div
          className={cn(
            'w-full rounded-full bg-[var(--bg-tertiary)] overflow-hidden',
            sizeClasses[size]
          )}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant],
              animated && 'progress-striped animate-progress'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showLabel && (
          <div className="mt-1.5 text-right text-xs font-medium text-[var(--text-secondary)]">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

/**
 * CircularProgress - 圆形进度条
 */
export interface CircularProgressProps extends React.HTMLAttributes<SVGSVGElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
  showLabel?: boolean;
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 48,
      strokeWidth = 4,
      variant = 'primary',
      showLabel = true,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    const variantClasses = {
      primary: 'text-[var(--primary)]',
      secondary: 'text-[var(--secondary)]',
      accent: 'text-[var(--accent)]',
      success: 'text-[var(--success)]',
    };

    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <svg
          ref={ref}
          width={size}
          height={size}
          className="-rotate-90"
          {...props}
        >
          {/* 背景圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-[var(--bg-tertiary)]"
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={cn('transition-all duration-500 ease-out', variantClasses[variant])}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-bold text-[var(--text-primary)]">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

export { Progress, CircularProgress };
