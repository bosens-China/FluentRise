import * as React from 'react';

import { cn } from '@/lib/utils';
import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui';
import { XPDisplay, LevelBadge } from '@/components/gamification';

/**
 * Header - 顶部导航栏
 * 
 * 包含主题切换、通知、用户信息和游戏化数据
 */

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 用户等级 */
  level?: number;
  /** 当前 XP */
  currentXP?: number;
  /** 升级所需 XP */
  requiredXP?: number;
  /** 今日获得 XP */
  todayXP?: number;
  /** 通知数量 */
  notificationCount?: number;
  /** 用户名 */
  username?: string;
  /** 用户头像 */
  avatar?: string;
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      className,
      level = 1,
      currentXP = 0,
      requiredXP = 100,
      todayXP = 0,
      notificationCount = 0,
      username,
      avatar,
      ...props
    },
    ref
  ) => {
    const [isDark, setIsDark] = React.useState(false);

    // 主题切换
    const toggleTheme = () => {
      const newIsDark = !isDark;
      setIsDark(newIsDark);
      document.documentElement.classList.toggle('dark', newIsDark);
    };

    // 初始化主题
    React.useEffect(() => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      
      setIsDark(shouldBeDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    // 保存主题偏好
    React.useEffect(() => {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
      <header
        ref={ref}
        className={cn(
          'h-16 px-6 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)]',
          className
        )}
        {...props}
      >
        {/* 左侧 - 欢迎语 */}
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {username ? `你好，${username}！` : '欢迎回来！'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            继续学习，保持连胜 🔥
          </p>
        </div>

        {/* 右侧 - 操作区 */}
        <div className="flex items-center gap-4">
          {/* 今日 XP */}
          <XPDisplay xp={todayXP} label="今日" size="sm" />

          {/* 等级徽章 */}
          <LevelBadge
            level={level}
            currentXP={currentXP}
            requiredXP={requiredXP}
            size="sm"
          />

          {/* 分隔线 */}
          <div className="h-8 w-px bg-[var(--border)]" />

          {/* 主题切换 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* 通知 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--error)] text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>

          {/* 用户头像 */}
          <a
            href="/profile"
            className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[var(--primary)] transition-all"
          >
            {avatar ? (
              <img src={avatar} alt={username} className="h-full w-full object-cover" />
            ) : (
              <span className="text-white font-bold">
                {username?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </a>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';

export { Header };
