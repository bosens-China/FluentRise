import * as React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  GraduationCap,
  Home,
  Library,
  LogOut,
  NotebookPen,
  Sparkles,
  User,
} from 'lucide-react';
import { StreakIndicator } from '@/components/gamification';
import { Tooltip } from '@/components/ui/Tooltip';
import { useQuery } from '@/hooks/useData';
import { getTodayReviews } from '@/api/review';

/**
 * Sidebar - 侧边导航栏
 * 
 * 多邻国风格的侧边栏，包含导航链接和游戏化元素
 */

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  tooltip?: string;
}

const mainNavItems: NavItem[] = [
  { to: '/', label: '学习', icon: Home, tooltip: '查看今日任务' },
  { to: '/article', label: '文章', icon: BookOpen, tooltip: '阅读文章' },
  { to: '/review', label: '复习', icon: GraduationCap, tooltip: '艾宾浩斯复习' },
  { to: '/vocabulary', label: '词汇', icon: Library, tooltip: '我的生词本' },
  { to: '/notes', label: '笔记', icon: NotebookPen, tooltip: '学习笔记' },
];

const bottomNavItems: NavItem[] = [
  { to: '/playground', label: '学习广场', icon: Sparkles, tooltip: '发现更多' },
  { to: '/profile', label: '个人中心', icon: User, tooltip: '个人设置' },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  streakDays?: number;
  onLogout?: () => void;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, streakDays = 0, onLogout, ...props }, ref) => {
    const router = useRouterState();
    const currentPath = router.location.pathname;

    // 获取真实的复习数量
    const { data: todayReviews } = useQuery(getTodayReviews);
    const reviewCount = todayReviews?.items?.length || 0;

    const isActive = (path: string) => {
      if (path === '/') {
        return currentPath === '/';
      }
      return currentPath.startsWith(path);
    };

    // 更新导航项的 badge
    const navItemsWithBadge = mainNavItems.map(item => ({
      ...item,
      badge: item.to === '/review' ? reviewCount : undefined,
    }));

    return (
      <aside
        ref={ref}
        className={cn(
          'flex flex-col h-full w-64 bg-[var(--bg-secondary)] border-r border-[var(--border)]',
          className
        )}
        {...props}
      >
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-[var(--primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              FluentRise
            </span>
          </Link>
        </div>

        {/* Streak Indicator */}
        <div className="px-6 pb-4">
          <Tooltip content="连续学习天数，保持连胜！">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] cursor-help hover:border-[var(--accent)]/30 transition-colors">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                连续学习
              </span>
              <StreakIndicator days={streakDays} size="sm" />
            </div>
          </Tooltip>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItemsWithBadge.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);

            return (
              <Tooltip key={item.to} content={item.tooltip || item.label}>
                <Link
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group',
                    active
                      ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 transition-transform',
                    !active && 'group-hover:scale-110'
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="h-5 min-w-5 px-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center animate-pulse-soft">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-[var(--border)] space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);

            return (
              <Tooltip key={item.to} content={item.tooltip || item.label}>
                <Link
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                    active
                      ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </Tooltip>
            );
          })}

          {/* Logout */}
          <Tooltip content="退出登录">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--error-light)] hover:text-[var(--error)] transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>退出登录</span>
            </button>
          </Tooltip>
        </div>
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar };
