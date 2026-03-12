import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Avatar 组件 - FluentRise 设计系统
 * 
 * 特点：
 * - 支持图片和文字头像
 * - 多邻国风格的边框装饰
 * - 支持状态指示器
 */

const avatarVariants = cva(
  'relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0',
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-20 w-20 text-xl',
      },
      variant: {
        default: 'bg-[var(--bg-tertiary)]',
        primary: 'bg-[var(--primary-light)] text-[var(--primary)]',
        secondary: 'bg-[var(--secondary-light)] text-[var(--secondary)]',
        accent: 'bg-[var(--accent-light)] text-[var(--accent)]',
      },
      bordered: {
        true: 'ring-2 ring-[var(--bg-primary)] ring-offset-2 ring-offset-[var(--primary)]',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      bordered: false,
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      size,
      variant,
      bordered,
      src,
      alt,
      fallback,
      status,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    const statusColors = {
      online: 'bg-[var(--success)]',
      offline: 'bg-[var(--text-tertiary)]',
      away: 'bg-[var(--warning)]',
      busy: 'bg-[var(--error)]',
    };

    const statusSizes = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4',
    };

    return (
      <div className="relative inline-block">
        <div
          ref={ref}
          className={cn(avatarVariants({ size, variant, bordered, className }))}
          {...props}
        >
          {src && !imageError ? (
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : fallback ? (
            <span className="font-semibold">{getInitials(fallback)}</span>
          ) : (
            <svg
              className="h-full w-full text-[var(--text-tertiary)]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg-primary)]',
              statusColors[status],
              statusSizes[size || 'md']
            )}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export { Avatar, avatarVariants };
