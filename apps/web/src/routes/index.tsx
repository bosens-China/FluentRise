import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useRequest } from 'ahooks';
import { App, Col, Row, Typography } from 'antd';
import dayjs from 'dayjs';

import { getLearningPath, realizeProposal, type ArticleProposal } from '@/api/article';
import { getTodayReviewSummary, getTodayReviews } from '@/api/review';
import {
  getDashboardOverview,
  getMembershipStatus,
  type MembershipStatus,
} from '@/api/user';
import { AssessmentModal } from '@/components/assessment';
import { AchievementPanel } from '@/components/home/AchievementPanel';
import { LearningPath } from '@/components/home/LearningPath';
import { LearningProfileCard } from '@/components/home/LearningProfileCard';
import { MembershipGuideCard } from '@/components/home/MembershipGuideCard';
import { QuickEntryCard } from '@/components/home/QuickEntryCard';
import { ReviewSection } from '@/components/home/ReviewSection';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudyCalendar } from '@/components/studyLog/StudyCalendar';
import { useCurrentUser } from '@/hooks/useAuth';
import { isAuthenticated } from '@/lib/auth-storage';

const { Text, Title } = Typography;

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
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

function HomePage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user, isLoading, refresh } = useCurrentUser();
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
      const [pathData, reviewSummary, reviewList, dashboard] =
        await Promise.all([
          getLearningPath(),
          getTodayReviewSummary(),
          getTodayReviews(),
          getDashboardOverview(),
        ]);

      return {
        pathData,
        reviewSummaryMessage: reviewSummary.message,
        reviewItems: reviewList.items,
        dashboard,
      };
    },
    {
      ready: hasCompletedAssessment,
      onError: () => {
        message.error('首页数据加载失败，请稍后重试');
      },
    },
  );

  const { loading: isRealizing, run: startLesson } = useRequest(
    async (proposal: ArticleProposal) => {
      if (proposal.status === 'realized' && proposal.article_id) {
        return { id: proposal.article_id };
      }
      return realizeProposal(proposal.id);
    },
    {
      manual: true,
      onSuccess: (article) => {
        navigate({
          to: '/article/$articleId',
          params: { articleId: String(article.id) },
        });
      },
      onError: (err: Error) => {
        message.error(err.message || '课程开启失败，请稍后重试');
      },
    },
  );

  const learningGoals = useMemo(() => {
    return (user?.learning_goals || []).map(
      (goal: string) => GOAL_LABELS[goal] || goal,
    );
  }, [user?.learning_goals]);

  const dashboard = homeRequest.data?.dashboard ?? null;
  const pathData = homeRequest.data?.pathData ?? null;
  const reviewItems = homeRequest.data?.reviewItems ?? [];

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
            {dayjs().format('M月D日 dddd')}
          </div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={16}>
          <div className="space-y-8">
            <ReviewSection
              reviewItems={reviewItems}
              summaryMessage={homeRequest.data?.reviewSummaryMessage ?? ''}
              loading={homeRequest.loading && hasCompletedAssessment}
            />

            <div id="learning-path-section" className="rounded-[40px] border border-slate-100/50 bg-slate-50/50 p-4 pt-10 min-h-[900px]">
              <div className="mb-10 text-center">
                <Title level={3} className="!mb-2 !font-black !text-slate-800">
                  学习小径
                </Title>
                <Text className="text-slate-400">
                  点击当前关卡开始你的英语冒险
                </Text>
              </div>
              {pathData ? (
                <LearningPath
                  completedArticles={pathData.completed_articles}
                  proposals={pathData.proposals}
                  onNodeClick={startLesson}
                  isRealizing={isRealizing}
                />
              ) : (
                <div className="flex h-[600px] items-center justify-center">
                  <Typography.Text className="text-slate-300">
                    正在铺路...
                  </Typography.Text>
                </div>
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} xl={8}>
          <div className="space-y-6">
            <StudyCalendar />
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
        mode={hasCompletedAssessment ? 'update' : 'create'}
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
    </DashboardLayout>
  );
}

export default HomePage;
