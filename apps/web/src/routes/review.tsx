import { useMemo, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock3,
  Flame,
  History,
  RotateCcw,
} from 'lucide-react';

import { getArticleHistory } from '@/api/article';
import {
  formatReviewDueText,
  getReviewProgress,
  getReviewStats,
  getTodayReviews,
  type ReviewItem,
} from '@/api/review';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/providers';
import { ReviewLogDrawer } from '@/components/review/ReviewLogDrawer';
import {
  Badge,
  Button,
  Card,
  CircularProgress,
  Empty,
  LoadingSpinner,
  Tabs,
} from '@/components/ui';
import { useQuery } from '@/hooks/useData';
import { formatDate } from '@/lib/utils';

export const Route = createFileRoute('/review')({
  component: ReviewPage,
});

const stageBadgeToneMap: Record<number, 'default' | 'secondary' | 'accent' | 'success'> = {
  1: 'default',
  2: 'secondary',
  3: 'secondary',
  4: 'accent',
  5: 'accent',
  6: 'success',
  7: 'success',
};

const stageProgressToneMap: Record<number, 'primary' | 'secondary' | 'accent' | 'success'> = {
  1: 'primary',
  2: 'secondary',
  3: 'secondary',
  4: 'accent',
  5: 'accent',
  6: 'success',
  7: 'success',
};

function ReviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);

  const { data: todayData, loading: todayLoading } = useQuery(getTodayReviews);
  const { data: stats } = useQuery(getReviewStats);
  const { data: historyData, loading: historyLoading } = useQuery(
    () => getArticleHistory(historyPage, 12),
    { ready: activeTab === 'history' },
  );

  const statCards = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      {
        key: 'pending',
        label: '今日待复习',
        value: stats.today_pending,
        suffix: '项',
        icon: Clock3,
        variant: 'accent' as const,
      },
      {
        key: 'streak',
        label: '连续复习',
        value: stats.streak_days,
        suffix: '天',
        icon: Flame,
        variant: 'secondary' as const,
      },
      {
        key: 'weekly',
        label: '本周完成',
        value: `${stats.weekly_completed}/${stats.weekly_total}`,
        suffix: '',
        icon: CheckCircle,
        variant: 'success' as const,
      },
      {
        key: 'completed',
        label: '总完成率',
        value:
          stats.total_schedules > 0
            ? Math.round((stats.completed_schedules / stats.total_schedules) * 100)
            : 0,
        suffix: '%',
        icon: RotateCcw,
        variant: 'primary' as const,
      },
    ];
  }, [stats]);

  const startReview = (item: ReviewItem) => {
    navigate({
      to: '/article/$articleId',
      params: { articleId: String(item.article_id) },
      search: { review: item.schedule_id },
    });
  };

  const renderTodayReviews = () => {
    if (todayLoading) {
      return (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const items = todayData?.items ?? [];
    if (items.length === 0) {
      return (
        <Empty
          title="今天没有到期复习"
          description="完成新课后，系统会按节奏自动安排下一轮复习。"
          icon={<History className="h-10 w-10" />}
          action={{
            label: '回到学习中心',
            onClick: () => navigate({ to: '/' }),
          }}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const progress = getReviewProgress(item.stage);
          const badgeTone = stageBadgeToneMap[item.stage] || 'default';
          const progressTone = stageProgressToneMap[item.stage] || 'primary';

          return (
            <Card key={item.schedule_id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <Badge variant={badgeTone}>第 {item.stage}/7 轮</Badge>
                <CircularProgress
                  value={progress}
                  size={52}
                  strokeWidth={5}
                  variant={progressTone}
                />
              </div>

              <h3 className="mb-3 line-clamp-2 text-lg font-black text-[var(--text-primary)]">
                {item.title}
              </h3>

              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatReviewDueText(item.days_until_next)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>{item.stage_label}</span>
                </div>
                {item.last_reviewed_at ? (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    上次复习：{formatDate(item.last_reviewed_at)}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <Badge variant="outline">Level {item.level}</Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedReview(item)}>
                    查看记录
                  </Button>
                  <Button size="sm" onClick={() => startReview(item)}>
                    开始复习
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const items = historyData?.items ?? [];
    if (items.length === 0) {
      return (
        <Empty
          title="暂时还没有学习历史"
          description="完成主课后，这里会逐步沉淀你的历史课文。"
          icon={<BookOpen className="h-10 w-10" />}
        />
      );
    }

    const hasNextPage = historyData ? historyPage * 12 < historyData.total : false;

    return (
      <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="interactive"
              className="p-5"
              onClick={() =>
                navigate({
                  to: '/article/$articleId',
                  params: { articleId: String(item.id) },
                  search: {},
                })
              }
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant={item.is_completed ? 'success' : 'outline'}>
                  {item.is_completed ? '已完成' : '进行中'}
                </Badge>
                <span className="text-sm text-[var(--text-tertiary)]">
                  {formatDate(item.publish_date)}
                </span>
              </div>

              <h3 className="mb-4 line-clamp-2 text-lg font-bold text-[var(--text-primary)]">
                {item.title}
              </h3>

              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                <Badge variant="secondary">Level {item.level}</Badge>
                <Button variant="ghost" size="sm">
                  查看
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {historyData && historyData.total > 12 ? (
          <div className="mt-8 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={historyPage === 1}
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
            >
              上一页
            </Button>
            <div className="flex items-center px-3 text-sm font-medium text-[var(--text-secondary)]">
              第 {historyPage} 页
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage}
              onClick={() => setHistoryPage((page) => page + 1)}
            >
              下一页
            </Button>
          </div>
        ) : null}
      </>
    );
  };

  const tabs = [
    {
      id: 'today',
      label: (
        <span className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          今日复习
        </span>
      ),
      badge: stats?.today_pending || 0,
      content: renderTodayReviews(),
    },
    {
      id: 'history',
      label: (
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          学习历史
        </span>
      ),
      content: renderHistory(),
    },
  ];

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[var(--shadow-button)]">
            <RotateCcw className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">复习中心</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              按节奏稳步回顾，让已经学过的内容真正留下来。
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((item) => (
            <Card key={item.key} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `var(--${item.variant}-light)`,
                    color: `var(--${item.variant})`,
                  }}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">{item.label}</div>
                  <div className="text-xl font-black text-[var(--text-primary)]">
                    {item.value}
                    {item.suffix}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        <ReviewLogDrawer
          open={selectedReview != null}
          scheduleId={selectedReview?.schedule_id ?? null}
          title={selectedReview?.title ?? '复习记录'}
          onClose={() => setSelectedReview(null)}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}

export default ReviewPage;
