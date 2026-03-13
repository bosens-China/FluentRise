import * as React from 'react';
import { cn } from '@/lib/utils';
import { Moon, Sun, Bell } from 'lucide-react';
import { Button } from '@/components/ui';
import { XPDisplay, LevelBadge } from '@/components/gamification';
import { getGreeting, getEncouragement } from '@/lib/greeting';
import { useUIStore } from '@/stores';

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
    const { theme, toggleTheme } = useUIStore();
    const [encouragement, setEncouragement] = React.useState('');

    // 初始化鼓励语
    React.useEffect(() => {
      setEncouragement(getEncouragement());
    }, []);

    // 监听系统主题变化
    React.useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme === 'system') {
          document.documentElement.classList.toggle('dark', mediaQuery.matches);
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const isDark = document.documentElement.classList.contains('dark');

    return (
      <header
        ref={ref}
        className={cn(
          'h-16 px-4 md:px-6 flex items-center justify-between bg-[var(--bg-primary)] border-b border-[var(--border)] flex-shrink-0',
          className
        )}
        {...props}
      >
        {/* 左侧 - 欢迎语 */}
        <div className="min-w-0 flex-1 mr-4">
          <h1 className="text-base md:text-lg font-bold text-[var(--text-primary)] truncate">
            {getGreeting(username)}
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] truncate hidden sm:block">
            {encouragement}
          </p>
        </div>

        {/* 右侧 - 操作区 */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* 今日 XP - 平板以上显示 */}
          <div className="hidden sm:block">
            <XPDisplay xp={todayXP} label="今日" size="sm" />
          </div>

          {/* 等级徽章 - 平板以上显示 */}
          <div className="hidden md:block">
            <LevelBadge
              level={level}
              currentXP={currentXP}
              requiredXP={requiredXP}
              size="sm"
            />
          </div>

          {/* 分隔线 - 平板以上显示 */}
          <div className="hidden md:block h-8 w-px bg-[var(--border)]" />

          {/* 主题切换 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            className="h-9 w-9 md:h-10 md:w-10"
          >
            {isDark ? (
              <Sun className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <Moon className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>

          {/* 通知 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 md:h-10 md:w-10"
            aria-label="通知"
          >
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--error)] text-white text-[10px] font-bold flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>

          {/* 用户头像 */}
          <a
            href="/profile"
            className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-[var(--primary)] flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[var(--primary)] transition-all flex-shrink-0"
          >
            {avatar ? (
              <img src={avatar} alt={username} className="h-full w-full object-cover" />
            ) : (
              <span className="text-white font-bold text-sm md:text-base">
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
