import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * LevelBadge - 等级徽章组件
 * 
 * 显示用户当前等级，带有进度环
 */

export interface LevelBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 当前等级 */
  level: number;
  /** 当前经验值 */
  currentXP: number;
  /** 升级所需经验值 */
  requiredXP: number;
  /** 大小变体 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const LevelBadge = React.forwardRef<HTMLDivElement, LevelBadgeProps>(
  (
    { className, level, currentXP, requiredXP, size = 'md', ...props },
    ref
  ) => {
    const percentage = Math.min(100, (currentXP / requiredXP) * 100);
    
    const sizeClasses = {
      sm: { wrapper: 'h-12 w-12', text: 'text-lg', subText: 'text-[10px]' },
      md: { wrapper: 'h-16 w-16', text: 'text-2xl', subText: 'text-xs' },
      lg: { wrapper: 'h-20 w-20', text: 'text-3xl', subText: 'text-sm' },
      xl: { wrapper: 'h-24 w-24', text: 'text-4xl', subText: 'text-base' },
    };

    const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
    const radius = (parseInt(sizeClasses[size].wrapper) - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex flex-col items-center', className)}
        {...props}
      >
        <div className={cn('relative', sizeClasses[size].wrapper)}>
          {/* 背景圆环 */}
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[var(--bg-tertiary)]"
            />
            {/* 进度圆环 */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="text-[var(--primary)] transition-all duration-500"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          {/* 等级数字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold text-[var(--text-primary)]', sizeClasses[size].text)}>
              {level}
            </span>
          </div>
        </div>
        {/* XP 进度文字 */}
        <span className={cn('mt-1 font-medium text-[var(--text-secondary)]', sizeClasses[size].subText)}>
          {currentXP}/{requiredXP} XP
        </span>
      </div>
    );
  }
);

LevelBadge.displayName = 'LevelBadge';

export { LevelBadge };
