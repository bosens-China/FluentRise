/**
 * Empty 组件 - FluentRise 设计系统
 */

import * as React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  (
    {
      title = '暂无数据',
      description = '这里还没有内容',
      icon,
      action,
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center',
          className
        )}
      >
        <div className="h-20 w-20 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-6">
          {icon || <Inbox className="h-10 w-10 text-[var(--text-tertiary)]" />}
        </div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          {title}
        </h3>
        <p className="text-[var(--text-secondary)] max-w-md mb-6">
          {description}
        </p>
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
      </div>
    );
  }
);

Empty.displayName = 'Empty';

export { Empty };
