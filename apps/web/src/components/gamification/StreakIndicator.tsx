import * as React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StreakIndicator - 连续学习天数指示器
 * 
 * 多邻国风格的火焰图标，显示用户连续学习天数
 */

export interface StreakIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 连续天数 */
  days: number;
  /** 是否冻结中（保持连胜） */
  frozen?: boolean;
  /** 大小变体 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示标签 */
  showLabel?: boolean;
}

const StreakIndicator = React.forwardRef<HTMLDivElement, StreakIndicatorProps>(
  (
    { className, days, frozen = false, size = 'md', showLabel = true, ...props },
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
          'bg-[var(--accent-light)] text-[var(--accent)]',
          'transition-transform duration-200 hover:scale-105',
          sizeClasses[size].wrapper,
          className
        )}
        {...props}
      >
        <Flame
          className={cn(
            sizeClasses[size].icon,
            frozen && 'text-blue-400',
            !frozen && days > 0 && 'animate-pulse-soft'
          )}
          fill={frozen ? '#60A5FA' : days > 0 ? 'currentColor' : 'none'}
        />
        {showLabel && (
          <span className={sizeClasses[size].text}>
            {frozen ? '已冻结' : days}
          </span>
        )}
      </div>
    );
  }
);

StreakIndicator.displayName = 'StreakIndicator';

export { StreakIndicator };
