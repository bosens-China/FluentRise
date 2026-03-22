import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, Card, Skeleton, Space, Tag, Typography } from 'antd';

const { Paragraph, Title } = Typography;

interface TaskItem {
  key: string;
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
  status: 'done' | 'todo' | 'ready';
}

interface TaskPlannerCardProps {
  loading: boolean;
  hasCompletedAssessment: boolean;
  taskItems: readonly TaskItem[];
  onStartAssessment: () => void;
}

export function TaskPlannerCard({
  loading,
  hasCompletedAssessment,
  taskItems,
  onStartAssessment,
}: TaskPlannerCardProps) {
  if (loading) {
    return <Skeleton active paragraph={{ rows: 7 }} />;
  }

  if (!hasCompletedAssessment) {
    return (
      <Card className="rounded-[32px] border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_12px_36px_rgba(251,146,60,0.28)]">
        <Title level={2} className="!text-white">
          先完成一次起点评测
        </Title>
        <Paragraph className="text-base text-amber-50">
          我们会根据你的起点和目标，生成更容易坚持、也更有成就感的课文节奏。
        </Paragraph>
        <Button
          size="large"
          shape="round"
          className="border-0 bg-white px-8 font-bold text-amber-700"
          onClick={onStartAssessment}
        >
          开始评测
        </Button>
      </Card>
    );
  }

  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <CheckCircleOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">今日任务编排</div>
          <div className="text-sm text-gray-500">先复习，再学新课，最后做一轮巩固练习</div>
        </div>
      </div>

      <div className="space-y-4">
        {taskItems.map((item, index) => (
          <div key={item.key} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Space>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-amber-600 shadow-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-800">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </div>
              </Space>
              <Tag
                className={`m-0 rounded-full border-0 px-3 py-1 ${
                  item.status === 'done'
                    ? 'bg-emerald-100 text-emerald-700'
                    : item.status === 'todo'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {item.status === 'done' ? '已完成' : item.status === 'todo' ? '优先处理' : '准备好了'}
              </Tag>
            </div>
            <Button shape="round" onClick={item.action}>
              {item.actionLabel}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
