import * as React from 'react';
import { Award, BookOpen, Brain, Clock, Flame, Star, Target, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * AchievementBadge - 成就徽章组件
 * 
 * 显示用户获得的成就，带有解锁动画
 */

type AchievementType = 
  | 'streak'      // 连续学习
  | 'reader'      // 阅读成就
  | 'scholar'     // 学霸
  | 'champion'    // 冠军
  | 'explorer'    // 探索者
  | 'master'      // 大师
  | 'dedicated'   // 坚持者
  | 'quick'       // 快速学习者
  | 'custom';

interface AchievementBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 成就类型 */
  type: AchievementType;
  /** 成就名称 */
  name: string;
  /** 成就描述 */
  description?: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁日期 */
  unlockedAt?: string;
  /** 等级（铜/银/金） */
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** 大小变体 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 自定义图标 */
  customIcon?: React.ReactNode;
}

const achievementIcons: Record<AchievementType, typeof Award> = {
  streak: Flame,
  reader: BookOpen,
  scholar: Brain,
  champion: Trophy,
  explorer: Star,
  master: Target,
  dedicated: Clock,
  quick: Zap,
  custom: Award,
};

const tierColors = {
  bronze: {
    bg: 'bg-amber-700/20',
    text: 'text-amber-700',
    border: 'border-amber-700/30',
    glow: 'shadow-amber-700/20',
  },
  silver: {
    bg: 'bg-slate-400/20',
    text: 'text-slate-500',
    border: 'border-slate-400/30',
    glow: 'shadow-slate-400/20',
  },
  gold: {
    bg: 'bg-yellow-400/20',
    text: 'text-yellow-600',
    border: 'border-yellow-400/30',
    glow: 'shadow-yellow-400/30',
  },
  platinum: {
    bg: 'bg-cyan-400/20',
    text: 'text-cyan-600',
    border: 'border-cyan-400/30',
    glow: 'shadow-cyan-400/30',
  },
};

const AchievementBadge = React.forwardRef<HTMLDivElement, AchievementBadgeProps>(
  (
    {
      className,
      type,
      name,
      description,
      unlocked,
      unlockedAt,
      tier = 'bronze',
      size = 'md',
      showLabel = true,
      customIcon,
      ...props
    },
    ref
  ) => {
    const Icon = achievementIcons[type];
    const colors = tierColors[tier];

    const sizeClasses = {
      sm: {
        wrapper: 'h-14 w-14',
        icon: 'h-6 w-6',
        label: 'text-xs mt-1.5',
      },
      md: {
        wrapper: 'h-20 w-20',
        icon: 'h-9 w-9',
        label: 'text-sm mt-2',
      },
      lg: {
        wrapper: 'h-28 w-28',
        icon: 'h-12 w-12',
        label: 'text-base mt-3',
      },
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center', className)}
        {...props}
      >
        <div
          className={cn(
            'relative flex items-center justify-center rounded-2xl',
            'border-2 transition-all duration-300',
            sizeClasses[size].wrapper,
            unlocked
              ? cn(colors.bg, colors.text, colors.border, 'shadow-lg', colors.glow)
              : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border-[var(--border)] grayscale'
          )}
        >
          {customIcon || (
            <Icon className={cn(sizeClasses[size].icon)} strokeWidth={1.5} />
          )}
          {/* 解锁动画效果 */}
          {unlocked && (
            <div className="absolute inset-0 rounded-2xl animate-pulse-soft bg-white/10" />
          )}
        </div>
        {showLabel && (
          <span
            className={cn(
              'font-semibold text-center max-w-[100px]',
              sizeClasses[size].label,
              unlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
            )}
          >
            {name}
          </span>
        )}
      </div>
    );
  }
);

AchievementBadge.displayName = 'AchievementBadge';

export { AchievementBadge };
export type { AchievementType, AchievementBadgeProps };
