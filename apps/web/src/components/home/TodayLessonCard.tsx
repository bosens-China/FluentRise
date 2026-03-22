import { MessageOutlined, ReadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Space, Tag, Typography } from 'antd';

import type { Article } from '@/api/article';

const { Paragraph, Title } = Typography;

interface TodayLessonCardProps {
  loading: boolean;
  hasCompletedAssessment: boolean;
  todayArticle: Article | null;
  onOpenTodayLesson: () => void;
  onOpenLessonChat: () => void;
}

export function TodayLessonCard({
  loading,
  hasCompletedAssessment,
  todayArticle,
  onOpenTodayLesson,
  onOpenLessonChat,
}: TodayLessonCardProps) {
  if (loading || !hasCompletedAssessment) {
    return null;
  }

  if (!todayArticle) {
    return (
      <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <Empty description="今天的课文还没生成" image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button type="primary" shape="round" size="large" onClick={onOpenTodayLesson}>
            开始今天的学习
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <Space wrap className="mb-4">
            <Tag className="rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">今日主课</Tag>
            <Tag className="rounded-full border-0 bg-slate-100 px-3 py-1 text-slate-600">
              进度 {todayArticle.is_read}%
            </Tag>
            {todayArticle.is_completed ? (
              <Tag className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-emerald-700">已完成</Tag>
            ) : null}
          </Space>
          <Title level={2} className="!mb-3 !text-gray-800">
            {todayArticle.title}
          </Title>
          <Paragraph className="!mb-4 text-base text-gray-600">{todayArticle.content[0]?.en}</Paragraph>
          <Space wrap>
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={<ReadOutlined />}
              className="border-0 bg-gradient-to-r from-amber-500 to-orange-500"
              onClick={onOpenTodayLesson}
            >
              {todayArticle.is_completed ? '回看课文' : '进入学习'}
            </Button>
            <Button shape="round" size="large" icon={<MessageOutlined />} onClick={onOpenLessonChat}>
              AI 课文对话
            </Button>
          </Space>
        </div>

        <div className="rounded-[28px] bg-gradient-to-br from-amber-50 to-orange-50 p-6 lg:w-[280px]">
          <div className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-amber-500">难度保护</div>
          <Paragraph className="!mb-3 text-gray-700">
            如果你反馈“太难”或“太简单”，系统会在同级内自动微调句长和新词密度，而不是直接跳级。
          </Paragraph>
          <Button icon={<ReloadOutlined />} className="rounded-xl border-amber-200 bg-white" onClick={onOpenTodayLesson}>
            查看今天课文
          </Button>
        </div>
      </div>
    </Card>
  );
}
