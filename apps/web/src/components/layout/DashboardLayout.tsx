import * as React from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from '@/components/ui/MobileNav';

/**
 * DashboardLayout - 仪表盘布局
 * 
 * 包含侧边栏、顶部栏和主内容区的响应式布局
 */

interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否隐藏侧边栏（用于登录页等） */
  hideSidebar?: boolean;
  /** 是否隐藏顶部栏 */
  hideHeader?: boolean;
  /** 用户数据 */
  user?: {
    username?: string;
    avatar?: string;
    level?: number;
    currentXP?: number;
    requiredXP?: number;
    todayXP?: number;
    streakDays?: number;
  };
  /** 退出登录回调 */
  onLogout?: () => void;
}

const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  (
    {
      className,
      children,
      hideSidebar = false,
      hideHeader = false,
      user = {},
      onLogout,
      ...props
    },
    ref
  ) => {
    const {
      username,
      avatar,
      level = 1,
      currentXP = 0,
      requiredXP = 100,
      todayXP = 0,
      streakDays = 0,
    } = user;

    return (
      <div
        ref={ref}
        className={cn('flex h-screen bg-[var(--bg-primary)] overflow-hidden', className)}
        {...props}
      >
        {/* 侧边栏 - 平板以上显示 */}
        {!hideSidebar && (
          <div className="hidden lg:block flex-shrink-0">
            <Sidebar streakDays={streakDays} onLogout={onLogout} />
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* 顶部栏 */}
          {!hideHeader && (
            <Header
              username={username}
              avatar={avatar}
              level={level}
              currentXP={currentXP}
              requiredXP={requiredXP}
              todayXP={todayXP}
            />
          )}

          {/* 页面内容 - 移动端添加底部导航空间 */}
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
              {children}
            </div>
          </main>
        </div>

        {/* 移动端底部导航 */}
        {!hideSidebar && <MobileNav />}
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';

export { DashboardLayout };
