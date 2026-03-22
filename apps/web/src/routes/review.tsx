import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { 
  BookOpen, 
  Flame, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Trophy,
  Zap,
  ChevronRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/providers';
import { Card, Button, Badge, Tabs, Empty, LoadingSpinner } from '@/components/ui';
import { CircularProgress } from '@/components/ui/Progress';
import { useQuery } from '@/hooks/useData';
import {
  getTodayReviews,
  getReviewStats,
  formatReviewDueText,
  getReviewProgress,
  type ReviewItem,
} from '@/api/review';
import { getArticleHistory } from '@/api/article';
import { formatDate } from '@/lib/utils';

export const Route = createFileRoute('/review')({
  component: ReviewPage,
});

// 阶段颜色映射
const stageColors: Record<number, { bg: string; text: string }> = {
  1: { bg: 'bg-blue-100', text: 'text-blue-700' },
  2: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  3: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  4: { bg: 'bg-purple-100', text: 'text-purple-700' },
  5: { bg: 'bg-pink-100', text: 'text-pink-700' },
  6: { bg: 'bg-rose-100', text: 'text-rose-700' },
  7: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

function ReviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [historyPage, setHistoryPage] = useState(1);

  // 获取今日复习列表
  const { data: todayData, loading: todayLoading } = useQuery(getTodayReviews);

  // 获取复习统计
  const { data: stats } = useQuery(getReviewStats);

  // 获取历史文章
  const { data: historyData, loading: historyLoading } = useQuery(
    () => getArticleHistory(historyPage, 12),
    { ready: activeTab === 'history' }
  );

  // 开始复习
  const startReview = (item: ReviewItem) => {
    navigate({
      to: '/article/$articleId',
      params: { articleId: String(item.article_id) },
      search: { review: item.schedule_id },
    });
  };

  // 统计卡片数据
  const statCards = stats ? [
    {
      icon: Clock,
      label: '今日待复习',
      value: stats.today_pending,
      suffix: '个',
      color: 'var(--accent)',
      bgColor: 'var(--accent-light)',
    },
    {
      icon: Flame,
      label: '连续打卡',
      value: stats.streak_days,
      suffix: '天',
      color: 'var(--error)',
      bgColor: 'var(--error-light)',
    },
    {
      icon: CheckCircle,
      label: '本周完成',
      value: `${stats.weekly_completed}/${stats.weekly_total}`,
      suffix: '',
      color: 'var(--secondary)',
      bgColor: 'var(--secondary-light)',
    },
    {
      icon: Trophy,
      label: '总完成率',
      value: stats.total_schedules > 0 
        ? Math.round((stats.completed_schedules / stats.total_schedules) * 100)
        : 0,
      suffix: '%',
      color: 'var(--success)',
      bgColor: 'var(--success-light)',
    },
  ] : [];

  // 渲染今日复习列表
  const renderTodayReviews = () => {
    if (todayLoading) {
      return (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const items = todayData?.items || [];

    if (items.length === 0) {
      return (
        <Empty
          title="今天没有复习任务"
          description="完成新课程学习后，系统会自动为你安排复习计划"
          icon={<Zap className="h-10 w-10" />}
        />
      );
    }

    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const stageColor = stageColors[item.stage] || stageColors[1];
          const progress = getReviewProgress(item.stage);

            {/* 标题 */}
            <h3 className="font-bold text-lg text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {item.title}
            </h3>

            {/* 信息 */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <CalendarOutlined />
              <span>复习状态：{formatReviewDueText(item.days_until_next)}</span>
              {item.last_reviewed_at && (
                <>
                  <span className="mx-1">·</span>
                  <span>已复习 {item.stage - 1} 次</span>
                </>
              )}
            </div>

            {/* 按钮 */}
            <Button
              type="primary"
              block
              size="large"
              className="rounded-xl font-bold"
              icon={<ReadOutlined />}
            >
              {/* 顶部：阶段和进度 */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full font-bold text-sm ${stageColor.bg} ${stageColor.text}`}>
                  第{item.stage}轮
                </span>
                <div className="relative">
                  <CircularProgress
                    value={progress}
                    size={48}
                    strokeWidth={4}
                    variant="primary"
                  />
                </div>
              </div>

              {/* 标题 */}
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-3 line-clamp-2">
                {item.title}
              </h3>

              {/* 信息 */}
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
                <Calendar className="h-4 w-4" />
                <span>下次复习：{getStageInterval(item.stage)}</span>
              </div>

              {/* 按钮 */}
              <Button fullWidth>
                <BookOpen className="h-5 w-5" />
                开始复习
              </Button>
            </Card>
          );
        })}
      </div>
    );
  };

  // 渲染历史文章
  const renderHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const items = historyData?.items || [];

    if (items.length === 0) {
      return <Empty title="暂无学习记录" />;
    }

    return (
      <>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="flex items-start justify-between mb-3">
                <Badge variant={item.is_completed ? 'success' : 'default'}>
                  {item.is_completed ? '已完成' : '进行中'}
                </Badge>
                <span className="text-[var(--text-tertiary)] text-sm">
                  {formatDate(item.publish_date)}
                </span>
              </div>

              <h3 className="font-bold text-[var(--text-primary)] line-clamp-2 mb-4">
                {item.title}
              </h3>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <Badge variant="outline">Level {item.level}</Badge>
                <Button variant="ghost" size="sm">
                  查看
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {historyData && historyData.total > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
              disabled={historyPage === 1}
            >
              上一页
            </Button>
            <span className="px-4 py-2 font-medium text-[var(--text-secondary)]">
              第 {historyPage} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryPage((p) => p + 1)}
              disabled={items.length < 12}
            >
              下一页
            </Button>
          </div>
        )}
      </>
    );
  };

  const tabs = [
    {
      id: 'today',
      label: (
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          今日复习
          {stats && stats.today_pending > 0 && (
            <Badge variant="error" size="sm">{stats.today_pending}</Badge>
          )}
        </span>
      ),
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-orange-500 flex items-center justify-center text-white shadow-lg">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)]">
                复习中心
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                艾宾浩斯遗忘曲线助力，科学复习
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: stat.bgColor, color: stat.color }}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
                  <p className="text-xl font-black text-[var(--text-primary)]">
                    {stat.value}{stat.suffix}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Card>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="default"
          />
        </Card>
      </DashboardLayout>
    </AuthGuard>
  );
}

export default ReviewPage;
