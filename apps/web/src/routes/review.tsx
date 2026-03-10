import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useRequest } from 'ahooks';
import {
  Typography,
  Card,
  Empty,
  Tag,
  Button,
  Spin,
  message,
  Progress,
  Tabs,
  Statistic,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  ReadOutlined,
  FireOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  getTodayReviews,
  getReviewStats,
  getStageInterval,
  getReviewProgress,
  type ReviewItem,
} from '@/api/review';
import { getArticleHistory } from '@/api/article';

const { Title, Text } = Typography;

type TabKey = 'today' | 'history';

export const Route = createFileRoute('/review')({
  component: ReviewPage,
});

function ReviewPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('today');

  // 获取今日复习列表
  const {
    data: todayData,
    loading: todayLoading,
  } = useRequest(getTodayReviews, {
    onError: (error) => {
      message.error(error.message || '获取今日复习失败');
    },
  });

  // 获取复习统计
  const { data: stats } = useRequest(getReviewStats, {
    onError: (error) => {
      message.error(error.message || '获取统计失败');
    },
  });

  // 获取历史文章
  const {
    data: historyData,
    loading: historyLoading,
    run: fetchHistory,
  } = useRequest(
    (page = 1, pageSize = 12) => getArticleHistory(page, pageSize),
    {
      manual: true,
      defaultParams: [1, 12],
    }
  );

  // 切换标签页时加载对应数据
  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    if (key === 'history' && !historyData) {
      fetchHistory();
    }
  };

  // 开始复习
  const startReview = (item: ReviewItem) => {
    navigate({
      to: '/article/$articleId',
      params: { articleId: String(item.article_id) },
      search: { review: item.schedule_id },
    });
  };

  // 获取阶段颜色
  const getStageColor = (stage: number): string => {
    const colors = ['blue', 'cyan', 'geekblue', 'purple', 'magenta', 'red', 'volcano'];
    return colors[stage - 1] || 'default';
  };

  // 获取阶段名称
  const getStageName = (stage: number): string => {
    const names = ['第1轮', '第2轮', '第3轮', '第4轮', '第5轮', '第6轮', '第7轮'];
    return names[stage - 1] || '已完成';
  };

  // 渲染统计卡片
  const renderStats = () => {
    if (!stats) return null;

    return (
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
            <Statistic
              title={<span className="text-orange-600/70">今日待复习</span>}
              value={stats.today_pending}
              suffix="个"
              valueStyle={{ color: '#f97316', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
            <Statistic
              title={<span className="text-red-600/70">连续打卡</span>}
              value={stats.streak_days}
              suffix="天"
              valueStyle={{ color: '#ef4444', fontWeight: 'bold' }}
              prefix={<FireOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <Statistic
              title={<span className="text-blue-600/70">本周完成</span>}
              value={stats.weekly_completed}
              suffix={`/${stats.weekly_total}`}
              valueStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
            <Statistic
              title={<span className="text-emerald-600/70">总完成率</span>}
              value={
                stats.total_schedules > 0
                  ? Math.round((stats.completed_schedules / stats.total_schedules) * 100)
                  : 0
              }
              suffix="%"
              valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染今日复习列表
  const renderTodayReviews = () => {
    if (todayLoading) {
      return (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      );
    }

    const items = todayData?.items || [];

    if (items.length === 0) {
      return (
        <Empty
          description={
            <div className="text-center">
              <div className="text-lg font-medium text-gray-700 mb-2">今天没有复习任务</div>
              <div className="text-gray-400">完成新课程学习后，系统会自动为你安排复习计划</div>
            </div>
          }
          className="py-20"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {items.map((item) => (
          <Card
            key={item.schedule_id}
            className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden"
            bodyStyle={{ padding: '20px' }}
            onClick={() => startReview(item)}
          >
            {/* 顶部：阶段和进度 */}
            <div className="flex items-center justify-between mb-4">
              <Tag
                color={getStageColor(item.stage)}
                className="rounded-full border-0 font-bold px-3 py-1"
              >
                {getStageName(item.stage)}
              </Tag>
              <Tooltip title="艾宾浩斯复习进度">
                <Progress
                  type="circle"
                  percent={getReviewProgress(item.stage)}
                  size={40}
                  strokeWidth={8}
                  showInfo={false}
                  strokeColor="#6366f1"
                  trailColor="#e0e7ff"
                />
              </Tooltip>
            </div>

            {/* 标题 */}
            <h3 className="font-bold text-lg text-gray-800 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {item.title}
            </h3>

            {/* 信息 */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <CalendarOutlined />
              <span>下次复习：{getStageInterval(item.stage)}</span>
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
              开始复习
            </Button>
          </Card>
        ))}
      </div>
    );
  };

  // 渲染历史文章
  const renderHistory = () => {
    if (historyLoading) {
      return (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      );
    }

    const items = historyData?.items || [];

    if (items.length === 0) {
      return (
        <Empty
          description="暂无学习记录"
          className="py-20"
        />
      );
    }

    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((item) => (
          <Card
            key={item.id}
            className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            bodyStyle={{ padding: '20px' }}
            onClick={() =>
              navigate({
                to: '/article/$articleId',
                params: { articleId: String(item.id) },
                search: {},
              })
            }
          >
            <div className="flex items-start justify-between mb-3">
              <Tag
                color={item.is_completed ? 'success' : 'processing'}
                className="rounded-full border-0 font-medium"
              >
                {item.is_completed ? '已完成' : '进行中'}
              </Tag>
              <div className="text-gray-400 text-sm flex items-center gap-1">
                <CalendarOutlined />{' '}
                {new Date(item.publish_date).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            </div>

            <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {item.title}
            </h3>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <Tag className="m-0 bg-indigo-50 text-indigo-600 border-0 rounded-md">
                Level {item.level}
              </Tag>
              <Button
                type="text"
                className="text-indigo-500 font-medium hover:bg-indigo-50"
                icon={<ReadOutlined />}
              >
                查看
              </Button>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: 'today',
      label: (
        <span className="flex items-center gap-2">
          <ThunderboltOutlined />
          今日复习
          {stats && stats.today_pending > 0 && (
            <Tag color="error" className="rounded-full ml-1">
              {stats.today_pending}
            </Tag>
          )}
        </span>
      ),
      children: renderTodayReviews(),
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-2">
          <CalendarOutlined />
          学习历史
        </span>
      ),
      children: renderHistory(),
    },
  ];

  return (
    <DashboardLayout>
      {/* 标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <FireOutlined className="text-xl" />
          </div>
          <Title level={2} className="!mb-0 !font-black !text-gray-800 tracking-tight">
            复习中心
          </Title>
        </div>
        <Text className="text-gray-500 text-base ml-1">
          艾宾浩斯遗忘曲线助力，科学复习，记忆更牢固
        </Text>
      </div>

      {/* 统计卡片 */}
      {renderStats()}

      {/* 标签页 */}
      <Card className="rounded-3xl border-0 shadow-sm" bodyStyle={{ padding: '24px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          className="[&_.ant-tabs-nav]:mb-6"
        />
      </Card>
    </DashboardLayout>
  );
}
