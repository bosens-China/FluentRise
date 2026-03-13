/**
 * Skeleton 骨架屏组件
 * 
 * 用于加载状态的占位显示
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-[var(--bg-tertiary)]';
  
  const variantStyles = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={style}
    />
  );
}

// 预设的骨架屏布局
export function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
      <Skeleton variant="rounded" height={160} className="mb-4" />
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="80%" className="mb-2" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width={60} className="mb-1" />
          <Skeleton variant="text" width={40} />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <Skeleton variant="text" className="mb-2" />
          <Skeleton variant="text" width="60%" />
        </div>
      ))}
    </div>
  );
}
