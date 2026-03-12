import * as React from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * XPDisplay - 经验值显示组件
 * 
 * 显示用户当前经验值或今日获得的经验值
 */

export interface XPDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 经验值 */
  xp: number;
  /** 标签文本 */
  label?: string;
  /** 大小变体 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示标签 */
  showLabel?: boolean;
}

const XPDisplay = React.forwardRef<HTMLDivElement, XPDisplayProps>(
  (
    { className, xp, label, size = 'md', showLabel = true, ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        wrapper: 'h-8 px-2 gap-1',
        icon: 'h-4 w-4',
        text: 'text-sm',
      },
      md: {
        wrapper: 'h-10 px-3 gap-1.5',
        icon: 'h-5 w-5',
        text: 'text-base',
      },
      lg: {
        wrapper: 'h-12 px-4 gap-2',
        icon: 'h-6 w-6',
        text: 'text-lg',
      },
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-xl font-bold',
          'bg-[var(--warning-light)] text-[var(--warning)]',
          'transition-transform duration-200 hover:scale-105',
          sizeClasses[size].wrapper,
          className
        )}
        {...props}
      >
        <Zap
          className={cn(sizeClasses[size].icon)}
          fill="currentColor"
        />
        {showLabel && (
          <span className={sizeClasses[size].text}>
            {label ? `${label}: ${xp}` : xp}
          </span>
        )}
      </div>
    );
  }
);

XPDisplay.displayName = 'XPDisplay';

export { XPDisplay };
