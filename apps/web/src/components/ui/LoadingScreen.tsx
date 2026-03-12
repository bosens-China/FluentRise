/**
 * LoadingScreen - 统一的加载状态组件
 */

import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({ 
  message = '加载中...', 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? 'fixed inset-0 z-50 bg-[var(--bg-primary)]' 
    : 'w-full h-full min-h-[200px]';

  return (
    <div className={`${containerClass} flex flex-col items-center justify-center`}>
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-[var(--primary-light)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin" />
        </div>
      </div>
      <p className="mt-4 text-[var(--text-secondary)] font-medium">{message}</p>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin ${className || ''}`} />
  );
}
