import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useRequest } from 'ahooks';
import {
  BookOpen,
  Calendar,
  RefreshCw,
  Bell,
  Target,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { useCurrentUser } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthGuard } from '@/components/providers';
import { Button, Card, Badge } from '@/components/ui';
import { StreakIndicator, DailyGoalRing } from '@/components/gamification';
import { AssessmentModal } from '@/components/assessment';
import { StudyCalendar } from '@/components/studyLog/StudyCalendar';
import { ReviewReminderModal } from '@/components/review/ReviewReminderModal';
import { getTodayArticle, type Article } from '@/api/article';
import {
  getTodayReviewSummary,
  getTodayReviews,
  type ReviewItem,
  type TodayReviewSummary,
} from '@/api/review';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// 等级标签颜色
const getLevelColor = (level: number | null) => {
  if (level === null || level <= 1) return 'default';
  if (level <= 3) return 'secondary';
  if (level <= 5) return 'accent';
  return 'success';
};

// 等级名称
const getLevelLabel = (level: number | null) => {
  if (level === null) return '未评估';
  const labels = ['零基础', '入门', '初级', '初中级', '中级', '中高级', '高级'];
  return labels[level] || '未知';
};

// 学习目标映射
const goalLabels: Record<string, string> = {
  daily: '日常交流',
  work: '工作提升',
  study: '出国留学',
  travel: '旅游出行',
  exam: '考试准备',
  hobby: '兴趣爱好',
  parent: '亲子教育',
};

function HomePage() {
  const { user, isLoading, refresh } = useCurrentUser();
  const navigate = useNavigate();
  const [showAssessment, setShowAssessment] = useState(false);
  const [todayArticle, setTodayArticle] = useState<Article | null>(null);
  const [showReviewReminder, setShowReviewReminder] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<TodayReviewSummary | null>(null);
  const [todayReviews, setTodayReviews] = useState<ReviewItem[]>([]);

  const needsAssessment = !isLoading && user && !user.has_completed_assessment;

  // 获取今日复习摘要
  const { run: fetchReviewSummary } = useRequest(getTodayReviewSummary, {
    manual: true,
    onSuccess: (data) => {
      setReviewSummary(data);
      if (data.has_reviews) {
        setTimeout(() => setShowReviewReminder(true), 1500);
      }
    },
  });

  // 获取今日复习列表
  const { run: fetchTodayReviews } = useRequest(getTodayReviews, {
    manual: true,
    onSuccess: (data) => {
      setTodayReviews(data.items);
    },
  });

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    refresh();
    navigate({
      to: '/article/$articleId',
      params: { articleId: 'today' },
      search: {},
    });
  };

  const { loading: loadingArticle, run: fetchTodayArticle } = useRequest(
    getTodayArticle,
    {
      manual: true,
      onSuccess: (data) => {
        if (data.has_article && data.article) {
          setTodayArticle(data.article);
        }
      },
    }
  );

  useEffect(() => {
    if (user?.has_completed_assessment) {
      fetchTodayArticle();
      fetchReviewSummary();
      fetchTodayReviews();
    }
  }, [user?.has_completed_assessment, fetchTodayArticle, fetchReviewSummary, fetchTodayReviews]);

  // 渲染今日复习提醒
  const renderReviewReminder = () => {
    if (!reviewSummary?.has_reviews) return null;

    return (
      <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--accent)] to-orange-500 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Bell className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">今日复习任务</h3>
                <p className="text-white/90 text-sm">{reviewSummary.message}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowReviewReminder(true)}
              className="bg-white text-[var(--accent)] border-white hover:bg-white/90 shadow-[0_4px_0_rgba(0,0,0,0.1)]"
            >
              <RefreshCw className="h-4 w-4" />
              开始复习
            </Button>
          </div>

          {/* 快速预览 */}
          {todayReviews.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex flex-wrap gap-2">
                {todayReviews.slice(0, 3).map((item) => (
                  <button
                    key={item.schedule_id}
                    onClick={() =>
                      navigate({
                        to: '/article/$articleId',
                        params: { articleId: String(item.article_id) },
                        search: { review: item.schedule_id },
                      })
                    }
                    className="px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    {item.title.length > 8
                      ? item.title.slice(0, 8) + '...'
                      : item.title}
                  </button>
                ))}
                {todayReviews.length > 3 && (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                    +{todayReviews.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染今日任务
  const renderTodayTask = () => {
    if (isLoading) {
      return (
        <Card className="h-96 animate-pulse">
          <div className="h-full bg-[var(--bg-tertiary)] rounded-xl" />
        </Card>
      );
    }

    // 未评估状态
    if (!user?.has_completed_assessment) {
      return (
        <Card
          variant="elevated"
          className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)] to-emerald-600 text-white"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative py-12 px-8 text-center">
            <div className="w-20 mx-auto mb-6 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black mb-4">
              开启你的英语之旅 🚀
            </h2>
            <p className="mb-8 max-w-md mx-auto text-white/90 text-lg leading-relaxed">
              只需几分钟，完成英语水平评估，我们将为你量身定制专属学习计划。
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAssessment(true)}
              className="bg-white text-[var(--primary)] border-white hover:bg-white/90 shadow-[0_4px_0_rgba(0,0,0,0.15)]"
            >
              开始评估
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </Card>
      );
    }

    // 已有今日文章
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
                <Calendar className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                今日任务
              </h2>
              {todayArticle && (
                <Badge
                  variant={todayArticle.is_read >= 100 ? 'success' : 'default'}
                >
                  {todayArticle.is_read >= 100 ? '已完成' : '进行中'}
                </Badge>
              )}
            </div>

            {todayArticle ? (
              <>
                <h3
                  className="text-2xl font-black text-[var(--text-primary)] mb-4 hover:text-[var(--primary)] transition-colors cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: '/article/$articleId',
                      params: { articleId: String(todayArticle.id) },
                      search: {},
                    })
                  }
                >
                  {todayArticle.title}
                </h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={getLevelColor(todayArticle.level)}>
                    {getLevelLabel(todayArticle.level)}
                  </Badge>
                  <Badge variant="outline">
                    新概念 {todayArticle.source_book}-{todayArticle.source_lesson}
                  </Badge>
                </div>

                <p className="text-[var(--text-secondary)] mb-6 line-clamp-2">
                  {todayArticle.content[0]?.en}
                </p>

                <Button
                  onClick={() =>
                    navigate({
                      to: '/article/$articleId',
                      params: { articleId: String(todayArticle.id) },
                      search: {},
                    })
                  }
                >
                  <BookOpen className="h-5 w-5" />
                  {todayArticle.is_read >= 100 ? '复习文章' : '继续学习'}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-2xl flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-[var(--text-tertiary)]" />
                </div>
                <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                  还没有今天的学习内容
                </h4>
                <p className="text-[var(--text-secondary)] mb-6">
                  生成一篇适合你的英语短文，开始今天的学习吧！
                </p>
                <Button
                  loading={loadingArticle}
                  onClick={() =>
                    navigate({
                      to: '/article/$articleId',
                      params: { articleId: 'today' },
                      search: {},
                    })
                  }
                >
                  开始今日学习
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* 进度环 */}
          {todayArticle && (
            <div className="flex items-center justify-center lg:pl-8 lg:border-l border-[var(--border)]">
              <div className="relative">
                <DailyGoalRing
                  current={todayArticle.is_read}
                  target={100}
                  unit="%"
                  size={160}
                  variant="primary"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <BookOpen className="h-8 w-8 text-[var(--primary)] mb-1" />
                  <span className="text-xs text-[var(--text-secondary)]">
                    阅读进度
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // 渲染学习档案
  const renderProfile = () => (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--secondary-light)] flex items-center justify-center">
            <Target className="h-5 w-5 text-[var(--secondary)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            学习档案
          </h3>
        </div>
        <button
          onClick={() => setShowAssessment(true)}
          className="text-sm font-semibold text-[var(--secondary)] hover:underline"
        >
          重新评估
        </button>
      </div>

      {user?.has_completed_assessment ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
            <span className="text-sm text-[var(--text-secondary)] block mb-2">
              当前水平
            </span>
            <div className="flex items-center gap-3">
              <Badge variant={getLevelColor(user.english_level)} size="lg">
                {getLevelLabel(user.english_level)}
              </Badge>
              <span className="text-xs text-[var(--text-tertiary)]">
                基于评估结果
              </span>
            </div>
          </div>

          {user.learning_goals && user.learning_goals.length > 0 && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
              <span className="text-sm text-[var(--text-secondary)] block mb-3">
                学习目标
              </span>
              <div className="flex flex-wrap gap-2">
                {user.learning_goals.map((goalId) => (
                  <Badge key={goalId} variant="outline">
                    {goalLabels[goalId] || goalId}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
            <span className="text-sm text-[var(--text-secondary)] block mb-2">
              学习天数
            </span>
            <div className="flex items-center gap-2">
              <StreakIndicator days={user.streak_days || 0} size="sm" />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[var(--text-tertiary)] mb-4">暂无档案</p>
          <Button size="sm" onClick={() => setShowAssessment(true)}>
            开始评估
          </Button>
        </div>
      )}
    </Card>
  );

  // 渲染学习统计
  const renderStats = () => (
    <div className="grid grid-cols-2 gap-4">
      <Card className="text-center">
        <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-[var(--warning-light)] flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-[var(--warning)]" />
        </div>
        <div className="text-2xl font-black text-[var(--text-primary)]">
          {user?.total_xp || 0}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">总经验值</div>
      </Card>
      <Card className="text-center">
        <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
          <Clock className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <div className="text-2xl font-black text-[var(--text-primary)]">
          {user?.study_minutes || 0}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">学习分钟</div>
      </Card>
    </div>
  );

  // 渲染每日贴士
  const renderTip = () => (
    <div className="rounded-2xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--secondary-light)] p-6 border border-[var(--border)] relative overflow-hidden">
      <div className="absolute -right-4 -top-4 text-6xl opacity-20">💡</div>
      <div className="relative">
        <h4 className="font-bold text-[var(--text-primary)] mb-2">每日贴士</h4>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          坚持每天阅读一篇短文，比周末突击学习更有效哦！保持节奏，每天进步一点点。
        </p>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <DashboardLayout
        user={{
          username: user?.nickname ?? undefined,
          avatar: user?.avatar ?? undefined,
          level: user?.level || 1,
          currentXP: (user?.level || 0) * 100 + (user?.total_xp || 0) % 100,
          requiredXP: 100,
          todayXP: user?.today_xp || 0,
          streakDays: user?.streak_days || 0,
        }}
      >
        {/* 欢迎区域 */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] mb-1">
                早安，{user?.nickname || '学习者'}!
              </h1>
              <p className="text-[var(--text-secondary)]">
                准备好开始今天的学习了吗？
              </p>
            </div>
            <div className="hidden sm:block text-right px-6 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <div className="text-2xl font-black text-[var(--primary)]">
                {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {new Date().toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 复习提醒 */}
        {renderReviewReminder()}

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧主栏 */}
          <div className="lg:col-span-2 space-y-6">
            {renderTodayTask()}
            <StudyCalendar />
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {renderStats()}
            {renderProfile()}
            {renderTip()}
          </div>
        </div>

        {/* 模态框 */}
        <AssessmentModal
          open={showAssessment || !!needsAssessment}
          onClose={() => {
            if (user?.has_completed_assessment) {
              setShowAssessment(false);
            }
          }}
          onComplete={handleAssessmentComplete}
        />

        <ReviewReminderModal
          open={showReviewReminder}
          onClose={() => setShowReviewReminder(false)}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}

export default HomePage;
