import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useRequest } from 'ahooks';
import {
  Button,
  Card,
  Typography,
  message,
  Space,
  Progress,
  Row,
  Col,
  Skeleton,
  Tag,
  Empty,
} from 'antd';
import {
  ReadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

import { useCurrentUser } from '@/hooks/useAuth';
import { isAuthenticated } from '@/utils/request';
import { AssessmentModal } from '@/components/assessment';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudyCalendar } from '@/components/studyLog/StudyCalendar';
import {
  generateTodayArticle,
  getTodayArticle,
  type Article,
} from '@/api/article';

const { Title, Text, Paragraph } = Typography;

export const Route = createFileRoute('/')({
  component: HomePage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw new Error('UNAUTHORIZED');
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'UNAUTHORIZED') {
      window.location.href = '/login';
      return null;
    }
    return <div>出错了: {error.message}</div>;
  },
});

// 等级标签颜色
const getLevelColor = (level: number | null) => {
  if (level === null) return 'default';
  if (level <= 1) return 'default';
  if (level <= 3) return 'blue';
  if (level <= 5) return 'purple';
  return 'gold';
};

// 等级名称
const getLevelLabel = (level: number | null) => {
  if (level === null) return '未评估';
  const labels = ['零基础', '入门', '初级', '初中级', '中级', '中高级', '高级'];
  return labels[level] || '未知';
};

function HomePage() {
  const { user, isLoading, refresh } = useCurrentUser();
  const navigate = useNavigate();
  const [showAssessment, setShowAssessment] = useState(false);
  const [todayArticle, setTodayArticle] = useState<Article | null>(null);

  const needsAssessment = !isLoading && user && !user.has_completed_assessment;

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    refresh();
    message.success('评估完成！已为你定制学习计划');
    handleGenerateArticle();
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

  const { loading: generatingArticle, run: handleGenerateArticle } = useRequest(
    generateTodayArticle,
    {
      manual: true,
      onSuccess: (article) => {
        setTodayArticle(article);
        message.success('今日学习文章已生成！');
        navigate({ to: '/article/$articleId', params: { articleId: String(article.id) } });
      },
      onError: (error) => {
        message.error('文章生成失败，请稍后重试');
        console.error(error);
      },
    }
  );

  useEffect(() => {
    if (user?.has_completed_assessment) {
      fetchTodayArticle();
    }
  }, [user?.has_completed_assessment, fetchTodayArticle]);

  // 渲染欢迎头部
  const renderWelcome = () => (
    <div className="mb-10 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="mb-2! font-black! text-gray-800 tracking-tight">
            早安，{user?.nickname || '学习者'} <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
          </Title>
          <Text className="text-gray-500 text-lg">准备好开始今天的学习了吗？</Text>
        </div>
        <div className="hidden text-right sm:block bg-white px-6 py-3 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <Text className="block text-2xl font-black text-indigo-600 tracking-tight">
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}
          </Text>
          <Text className="text-gray-400 font-medium">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
          </Text>
        </div>
      </div>
    </div>
  );

  // 渲染今日任务卡片
  const renderTodayTask = () => {
    if (isLoading) return <Skeleton active />;

    if (!user?.has_completed_assessment) {
      return (
        <Card className="border-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] text-white shadow-xl shadow-indigo-200/50 hover:shadow-2xl hover:shadow-indigo-300/50 transition-all duration-500 rounded-3xl overflow-hidden relative group">
          <div className="absolute inset-0 opacity-10 mix-blend-overlay"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div className="flex flex-col items-center py-10 text-center relative z-10">
            <Title level={3} className="text-white! font-black tracking-wide mb-4">
              开启你的英语之旅 🚀
            </Title>
            <Paragraph className="mb-8 max-w-md text-indigo-50 text-lg leading-relaxed">
              只需几分钟，完成英语水平评估，我们将为你量身定制专属学习计划。
            </Paragraph>
            <Button
              size="large"
              shape="round"
              className="border-0 bg-white text-indigo-600 hover:bg-indigo-50! hover:scale-105 transition-transform h-14 px-10 text-lg font-bold shadow-lg shadow-indigo-900/20"
              onClick={() => setShowAssessment(true)}
            >
              开始评估
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card
        title={
          <Space className="py-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <CalendarOutlined className="text-lg" />
            </div>
            <span className="font-bold text-lg text-gray-800">今日任务</span>
          </Space>
        }
        className="overflow-hidden border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 rounded-3xl"
        headStyle={{ borderBottom: 'none', padding: '24px 32px 0' }}
        bodyStyle={{ padding: '32px' }}
        extra={
          todayArticle && (
            <Tag 
              color={todayArticle.is_read >= 100 ? 'success' : 'processing'}
              className="rounded-full px-4 py-1.5 font-medium border-0 mt-3"
            >
              {todayArticle.is_read >= 100 ? '✅ 已完成' : '⏳ 进行中'}
            </Tag>
          )
        }
      >
        {todayArticle ? (
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Title level={3} className="mb-4! font-black text-gray-800 tracking-tight hover:text-indigo-600 transition-colors cursor-pointer"
                onClick={() => navigate({ to: '/article/$articleId', params: { articleId: String(todayArticle.id) } })}
              >
                {todayArticle.title}
              </Title>
              <Space className="mb-5 flex-wrap">
                <Tag className="rounded-md border-0 bg-indigo-50 text-indigo-600 font-medium px-3 py-1">
                  {getLevelLabel(todayArticle.level)}
                </Tag>
                <Tag className="rounded-md border-0 bg-amber-50 text-amber-600 font-medium px-3 py-1">
                  新概念 {todayArticle.source_book}-{todayArticle.source_lesson}
                </Tag>
              </Space>
              <Paragraph
                className="mb-8! text-gray-500 text-lg leading-relaxed"
                ellipsis={{ rows: 2 }}
              >
                {todayArticle.content[0]?.en}
              </Paragraph>
              <Button
                type="primary"
                size="large"
                shape="round"
                className="h-12 px-8 font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all"
                icon={<ReadOutlined />}
                onClick={() =>
                  navigate({
                    to: '/article/$articleId',
                    params: { articleId: String(todayArticle.id) },
                  })
                }
              >
                {todayArticle.is_read >= 100 ? '复习文章' : '开始学习'}
              </Button>
            </div>
            <div className="flex justify-center sm:px-8">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-50 rounded-full scale-110 -z-10"></div>
                <Progress
                  type="circle"
                  percent={todayArticle.is_read}
                  size={140}
                  strokeWidth={8}
                  strokeColor={{
                    '0%': '#6366f1',
                    '100%': '#a855f7',
                  }}
                  trailColor="transparent"
                  format={(percent) => (
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        {percent}%
                      </span>
                      <span className="text-sm font-medium text-gray-400 mt-1">进度</span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center bg-gray-50/50 rounded-2xl">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <Title level={4} className="mb-2! text-gray-700">还没有今天的学习内容</Title>
            <Text className="text-gray-400 mb-6 block">生成一篇适合你的英语短文，开始今天的学习吧！</Text>
            <Button
              type="primary"
              size="large"
              shape="round"
              loading={generatingArticle || loadingArticle}
              onClick={() => handleGenerateArticle()}
              className="h-12 px-8 font-bold shadow-md shadow-indigo-200"
            >
              生成今日文章
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <DashboardLayout>
      {renderWelcome()}

      <Row gutter={[24, 24]}>
        {/* 左侧主栏：今日任务 & 打卡日历 */}
        <Col xs={24} lg={16}>
          <div className="flex flex-col space-y-8">
            <section>{renderTodayTask()}</section>
            <section><StudyCalendar /></section>
          </div>
        </Col>

        {/* 右侧边栏：概览信息 */}
        <Col xs={24} xl={8}>
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* 学习档案卡片 */}
            <Card
              title={<span className="font-bold text-gray-800 text-lg">学习档案</span>}
              className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl"
              headStyle={{ borderBottom: 'none', paddingTop: '24px', paddingBottom: '12px' }}
              bodyStyle={{ padding: '24px' }}
              extra={
                <Button type="text" className="text-indigo-600 hover:bg-indigo-50 font-medium" shape="round" onClick={() => setShowAssessment(true)}>
                  重新评估
                </Button>
              }
            >
              {user?.has_completed_assessment ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-2xl">
                    <Text className="mb-2 block text-sm font-medium text-gray-500">
                      当前水平
                    </Text>
                    <div className="flex items-center gap-3">
                      <Tag color={getLevelColor(user.english_level)} className="text-base px-4 py-1.5 rounded-full border-0 font-bold m-0">
                        {getLevelLabel(user.english_level)}
                      </Tag>
                      <Text className="text-xs text-gray-400">基于评估结果</Text>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-2xl">
                    <Text className="mb-3 block text-sm font-medium text-gray-500">
                      学习目标
                    </Text>
                    <div className="flex flex-wrap gap-2">
                      {user.learning_goals?.map((goalId) => (
                        <Tag key={goalId} className="m-0 px-3 py-1.5 rounded-full border-0 bg-white text-gray-700 shadow-sm font-medium text-xs">
                          {goalId === 'daily' && '💬 日常交流'}
                          {goalId === 'work' && '💼 工作提升'}
                          {goalId === 'study' && '🎓 出国留学'}
                          {goalId === 'travel' && '✈️ 旅游出行'}
                          {goalId === 'exam' && '📝 考试准备'}
                          {goalId === 'hobby' && '🎬 兴趣爱好'}
                          {goalId === 'parent' && '👶 亲子教育'}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Empty description="暂无档案" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>

            {/* 学习贴士 (静态占位，未来可动态化) */}
            <div 
              style={{ marginTop: '24px' }}
              className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group"
            >
              <div className="absolute -right-4 -top-4 text-6xl opacity-10 group-hover:scale-110 transition-transform duration-500">💡</div>
              <div className="flex gap-4 relative z-10">
                <div className="text-3xl mt-1">💡</div>
                <div>
                  <Text className="block text-indigo-900 font-bold text-lg mb-3">每日贴士</Text>
                  <Text className="text-indigo-700 leading-relaxed block text-base">
                    坚持每天阅读一篇短文，比周末突击学习更有效哦！保持节奏，每天进步一点点。
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <AssessmentModal
        open={showAssessment || !!needsAssessment}
        onClose={() => {
          if (user?.has_completed_assessment) {
            setShowAssessment(false);
          }
        }}
        onComplete={handleAssessmentComplete}
      />
    </DashboardLayout>
  );
}
