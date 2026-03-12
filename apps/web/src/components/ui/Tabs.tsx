/**
 * Tabs 组件 - FluentRise 设计系统
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: React.ReactNode;
  badge?: number;
  content?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
  className?: string;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ tabs, activeTab, onChange, variant = 'default', className }, ref) => {
    return (
      <div ref={ref} className={cn('w-full', className)}>
        <div
          className={cn(
            'flex items-center gap-1',
            variant === 'default' && 'border-b border-[var(--border)]'
          )}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative px-4 py-3 font-semibold text-sm transition-all duration-200 flex items-center gap-2',
                variant === 'default' && [
                  'rounded-t-xl',
                  activeTab === tab.id
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                ],
                variant === 'pills' && [
                  'rounded-xl',
                  activeTab === tab.id
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]',
                ]
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--error)] text-white text-xs font-bold min-w-[18px] text-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
              {variant === 'default' && activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-6">
          {tabs.find((t) => t.id === activeTab)?.content}
        </div>
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';

export { Tabs };
export type { Tab, TabsProps };
