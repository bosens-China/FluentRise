import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * ProgressRing - 进度环组件（带多邻国风格）
 * 
 * 用于显示课程进度、每日目标等
 */

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 进度值 (0-100) */
  progress: number;
  /** 环的大小 */
  size?: number;
  /** 环的粗细 */
  strokeWidth?: number;
  /** 颜色变体 */
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
  /** 中间显示的内容 */
  children?: React.ReactNode;
  /** 是否显示动画 */
  animated?: boolean;
}

const ProgressRing = React.forwardRef<HTMLDivElement, ProgressRingProps>(
  (
    {
      className,
      progress,
      size = 80,
      strokeWidth = 6,
      variant = 'primary',
      children,
      animated = true,
      ...props
    },
    ref
  ) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const variantColors = {
      primary: 'text-[var(--primary)]',
      secondary: 'text-[var(--secondary)]',
      accent: 'text-[var(--accent)]',
      success: 'text-[var(--success)]',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <svg
          width={size}
          height={size}
          className="-rotate-90"
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
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={variantColors[variant]}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
            transition={{ duration: animated ? 0.8 : 0, ease: 'easeOut' }}
          />
        </svg>
        {/* 中心内容 */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      </div>
    );
  }
);

ProgressRing.displayName = 'ProgressRing';

/**
 * DailyGoalRing - 每日目标进度环
 */
export interface DailyGoalRingProps extends Omit<ProgressRingProps, 'children' | 'progress'> {
  current: number;
  target: number;
  unit?: string;
}

const DailyGoalRing = React.forwardRef<HTMLDivElement, DailyGoalRingProps>(
  (
    { current, target, unit = 'XP', size = 100, ...props },
    ref
  ) => {
    const progress = Math.min(100, (current / target) * 100);
    const completed = current >= target;

    return (
      <ProgressRing
        ref={ref}
        progress={progress}
        size={size}
        {...props}
      >
        <div className="flex flex-col items-center">
          <span className={cn(
            'text-xl font-bold',
            completed ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'
          )}>
            {current}
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            /{target} {unit}
          </span>
        </div>
      </ProgressRing>
    );
  }
);

DailyGoalRing.displayName = 'DailyGoalRing';

export { ProgressRing, DailyGoalRing };
