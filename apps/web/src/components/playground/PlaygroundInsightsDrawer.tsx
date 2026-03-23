import { Drawer } from 'antd';
import {
  Award,
  Clock3,
  ListChecks,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

import type { PracticeSession, PracticeStats } from '@/api/playground';
import { Button, Card, Empty, LoadingSpinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface PlaygroundInsightsDrawerProps {
  open: boolean;
  stats: PracticeStats | null;
  history: PracticeSession[];
  statsLoading: boolean;
  historyLoading: boolean;
  hasMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
}

const statItems = [
  {
    key: 'sessions',
    label: '训练场次',
    icon: ListChecks,
    getValue: (stats: PracticeStats) => stats.total_sessions,
    suffix: '次',
  },
  {
    key: 'accuracy',
    label: '整体正确率',
    icon: Target,
    getValue: (stats: PracticeStats) =>
      `${Math.round(stats.overall_accuracy)}%`,
    suffix: '',
  },
  {
    key: 'duration',
    label: '累计时长',
    icon: Clock3,
    getValue: (stats: PracticeStats) => stats.total_duration_minutes,
    suffix: '分钟',
  },
  {
    key: 'streak',
    label: '最佳连对',
    icon: Trophy,
    getValue: (stats: PracticeStats) => stats.best_streak,
    suffix: '题',
  },
] satisfies Array<{
  key: string;
  label: string;
  icon: typeof ListChecks;
  getValue: (stats: PracticeStats) => number | string;
  suffix: string;
}>;

export function PlaygroundInsightsDrawer({
  open,
  stats,
  history,
  statsLoading,
  historyLoading,
  hasMore,
  onClose,
  onLoadMore,
}: PlaygroundInsightsDrawerProps) {
  return (
    <Drawer
      open={open}
      width={460}
      title="训练记录"
      onClose={onClose}
      styles={{ body: { paddingBottom: 24 } }}
    >
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <TrendingUp className="h-4 w-4 text-[var(--secondary)]" />
            统计概览
          </div>
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3">
              {statItems.map((item) => {
                const value = item.getValue(stats);
                return (
                  <Card key={item.key} padding="sm" className="min-h-[112px]">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--secondary-light)] text-[var(--secondary)]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-xl font-black text-[var(--text-primary)]">
                      {value}
                      {typeof value === 'number' ? (
                        <span className="ml-1 text-sm font-medium text-[var(--text-secondary)]">
                          {item.suffix}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty
              title="还没有训练统计"
              description="完成一轮游乐园练习后，这里会自动累计你的表现。"
              icon={<Award className="h-10 w-10" />}
            />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Clock3 className="h-4 w-4 text-[var(--accent)]" />
            最近训练
          </div>
          {historyLoading && history.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((session) => (
                <Card key={session.id} padding="sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        第 {session.id} 次训练
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        {formatDate(session.created_at)}
                      </div>
                    </div>
                    <div className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-sm font-bold text-[var(--primary)]">
                      {Math.round(session.accuracy)}%
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2">
                      正确 {session.correct_count}/{session.total_questions}
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2">
                      连对峰值 {session.max_streak}
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2">
                      跳过 {session.skipped_count} 题
                    </div>
                    <div className="rounded-2xl bg-[var(--bg-secondary)] px-3 py-2">
                      用时{' '}
                      {Math.max(1, Math.round(session.duration_seconds / 60))}{' '}
                      分钟
                    </div>
                  </div>
                </Card>
              ))}
              {hasMore ? (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    loading={historyLoading}
                    onClick={onLoadMore}
                  >
                    加载更多
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Empty
              title="还没有训练记录"
              description="今天先完成一轮训练，晚点我们就能在这里看到你的累计表现。"
              icon={<Clock3 className="h-10 w-10" />}
            />
          )}
        </section>
      </div>
    </Drawer>
  );
}
