/**
 * MobileNav - 移动端底部导航栏
 */

import { Link, useRouterState } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  GraduationCap,
  Library,
  User,
} from 'lucide-react';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/article', label: '文章', icon: BookOpen },
  { to: '/review', label: '复习', icon: GraduationCap },
  { to: '/vocabulary', label: '词汇', icon: Library },
  { to: '/profile', label: '我的', icon: User },
];

export function MobileNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-elevated)] border-t border-[var(--border)] flex items-center justify-around px-2 z-50 safe-area-pb">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);

        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-colors',
              active
                ? 'text-[var(--primary)]'
                : 'text-[var(--text-secondary)]'
            )}
          >
            <div className={cn(
              'p-1.5 rounded-xl transition-colors',
              active && 'bg-[var(--primary-light)]'
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
