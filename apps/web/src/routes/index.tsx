import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useRequest } from 'ahooks';
import { Alert, App, Button, Col, Row, Typography } from 'antd';

import { getTodayArticle } from '@/api/article';
import { getTodayReviewSummary, getTodayReviews } from '@/api/review';
import {
  getDashboardOverview,
  getMembershipStatus,
  type MembershipStatus,
} from '@/api/user';
import { AssessmentModal } from '@/components/assessment';
import { AchievementPanel } from '@/components/home/AchievementPanel';
import { LearningProfileCard } from '@/components/home/LearningProfileCard';
import { MembershipGuideCard } from '@/components/home/MembershipGuideCard';
import { QuickEntryCard } from '@/components/home/QuickEntryCard';
import { TaskPlannerCard } from '@/components/home/TaskPlannerCard';
import { TodayLessonCard } from '@/components/home/TodayLessonCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ReviewReminderModal } from '@/components/review/ReviewReminderModal';
import { StudyCalendar } from '@/components/studyLog/StudyCalendar';
import { useCurrentUser } from '@/hooks/useAuth';
import { isAuthenticated } from '@/utils/request';

const { Text, Title } = Typography;

export const Route = createFileRoute('/')({
  component: HomePage,
});

const GOAL_LABELS: Record<string, string> = {
  daily: '日常交流',
  travel: '旅游出行',
  work: '办公需求',
  study: '学习提升',
  exam: '考试准备',
  parent: '亲子陪伴',
  hobby: '兴趣拓展',
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
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, isLoading, refresh } = useCurrentUser();
  const [reviewSummaryOpen, setReviewSummaryOpen] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);

  const hasCompletedAssessment = Boolean(user?.has_completed_assessment);
  const needsAssessment = !isLoading && user && !user.has_completed_assessment;

  useRequest(getMembershipStatus, {
    ready: Boolean(user),
    onSuccess: (data) => setMembership(data),
  });

  const homeRequest = useRequest(
    async () => {
      const [todayArticleResponse, reviewSummary, reviewList, dashboard] =
        await Promise.all([
          getTodayArticle(),
          getTodayReviewSummary(),
          getTodayReviews(),
          getDashboardOverview(),
        ]);

      return {
        todayArticle: todayArticleResponse.has_article
          ? todayArticleResponse.article
          : null,
        reviewSummaryMessage: reviewSummary.message,
        reviewItems: reviewList.items,
        dashboard,
      };
    },
    {
      ready: hasCompletedAssessment,
      onSuccess: (data) => {
        if (data.reviewItems.length > 0) {
          window.setTimeout(() => setReviewSummaryOpen(true), 1000);
        }
      },
      onError: () => {
        message.error('首页数据加载失败，请稍后重试');
      },
    },
  );

  const learningGoals = useMemo(() => {
    return (user?.learning_goals || []).map(
      (goal) => GOAL_LABELS[goal] || goal,
    );
  }, [user?.learning_goals]);

  const dashboard = homeRequest.data?.dashboard ?? null;
  const todayArticle = homeRequest.data?.todayArticle ?? null;
  const reviewItems = homeRequest.data?.reviewItems ?? [];

  const openTodayLesson = () =>
    navigate({
      to: '/article/$articleId',
      params: { articleId: todayArticle ? String(todayArticle.id) : 'today' },
      search: {},
    });

  const openLessonChat = () => {
    if (!todayArticle) {
      openTodayLesson();
      return;
    }
    navigate({
      to: '/ai-chat',
      search: { articleId: todayArticle.id, mode: 'lesson' } as never,
    });
  };

  const taskItems = [
    {
      key: 'review',
      title: '先复习',
      description:
        reviewItems.length > 0
          ? `今天有 ${reviewItems.length} 个内容该复习，建议先完成这一轮唤醒。`
          : '今天没有到期复习，可以直接进入新课。',
      actionLabel: reviewItems.length > 0 ? '去复习' : '查看复习中心',
      action: () => setReviewSummaryOpen(true),
      status: reviewItems.length > 0 ? 'todo' : 'done',
    },
    {
      key: 'lesson',
      title: '再学今日课文',
      description: todayArticle
        ? todayArticle.is_completed
          ? '今天的课文已经完成，可以回看或继续问 AI。'
          : `今天的主课已经准备好：${todayArticle.title}`
        : '今天的主课还没打开，进入后会自动为你生成。',
      actionLabel: todayArticle
        ? todayArticle.is_completed
          ? '回看课文'
          : '进入课文'
        : '开始今天的学习',
      action: openTodayLesson,
      status: todayArticle?.is_completed ? 'done' : 'ready',
    },
    {
      key: 'playground',
      title: '最后做游乐园练习',
      description: '游乐园会优先抽取今日课文、历史课文和错题本内容做巩固。',
      actionLabel: '打开游乐园',
      action: () => navigate({ to: '/playground' }),
      status: 'ready',
    },
  ] as const;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Title level={2} className="!mb-2 !font-black !text-gray-800">
            今天也按自己的节奏往前走
          </Title>
          <Text className="text-base text-gray-500">
            先复习，再做今天的新课文。慢一点也没关系，稳定最重要。
          </Text>
        </div>
        <div className="rounded-3xl bg-white px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <div className="text-sm font-medium text-gray-400">今天日期</div>
          <div className="text-xl font-black text-amber-700">
            {new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </div>
      </div>

      {reviewItems.length > 0 ? (
        <Alert
          showIcon
          className="mb-6 rounded-3xl border-indigo-200 bg-indigo-50"
          message={`今天有 ${reviewItems.length} 项复习任务`}
          description={
            homeRequest.data?.reviewSummaryMessage ||
            '建议先完成复习，再开始今天的新课文。'
          }
          action={
            <Button
              type="primary"
              shape="round"
              size="middle"
              onClick={() => setReviewSummaryOpen(true)}
            >
              查看复习
            </Button>
          }
        />
      ) : null}

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <div className="space-y-6">
            <TaskPlannerCard
              loading={isLoading || homeRequest.loading}
              hasCompletedAssessment={hasCompletedAssessment}
              taskItems={taskItems}
              onStartAssessment={() => setShowAssessment(true)}
            />
            <TodayLessonCard
              loading={isLoading || homeRequest.loading}
              hasCompletedAssessment={hasCompletedAssessment}
              todayArticle={todayArticle}
              onOpenTodayLesson={openTodayLesson}
              onOpenLessonChat={openLessonChat}
            />
            <StudyCalendar />
          </div>
        </Col>

        <Col xs={24} xl={8}>
          <div className="space-y-6">
            <AchievementPanel
              loading={homeRequest.loading && hasCompletedAssessment}
              dashboard={dashboard}
            />
            <LearningProfileCard
              hasCompletedAssessment={hasCompletedAssessment}
              englishLevel={user?.english_level ?? null}
              learningGoals={learningGoals}
              customGoal={user?.custom_goal ?? null}
              onEditAssessment={() => setShowAssessment(true)}
            />
            <MembershipGuideCard membership={membership} />
            <QuickEntryCard
              onOpenReview={() => navigate({ to: '/review' })}
              onOpenMistakes={() => navigate({ to: '/mistakes' })}
              onOpenPlayground={() => navigate({ to: '/playground' })}
              onOpenAIChat={() => navigate({ to: '/ai-chat' })}
            />
          </div>
        </Col>
      </Row>

      <AssessmentModal
        open={showAssessment || Boolean(needsAssessment)}
        onClose={() => {
          if (hasCompletedAssessment) {
            setShowAssessment(false);
          }
        }}
        onComplete={() => {
          setShowAssessment(false);
          refresh();
          void homeRequest.refresh();
          message.success('学习档案已经更新');
        }}
      />

      <ReviewReminderModal
        open={reviewSummaryOpen}
        onClose={() => setReviewSummaryOpen(false)}
      />
    </DashboardLayout>
  );
}

export default HomePage;
