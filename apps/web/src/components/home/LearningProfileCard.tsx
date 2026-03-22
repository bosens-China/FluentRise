import { CalendarOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Space, Tag } from 'antd';

interface LearningProfileCardProps {
  hasCompletedAssessment: boolean;
  englishLevel: number | null;
  learningGoals: string[];
  customGoal: string | null;
  onEditAssessment: () => void;
}

export function LearningProfileCard({
  hasCompletedAssessment,
  englishLevel,
  learningGoals,
  customGoal,
  onEditAssessment,
}: LearningProfileCardProps) {
  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <CalendarOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">学习档案</div>
          <div className="text-sm text-gray-400">你的当前起点和目标</div>
        </div>
      </div>

      {hasCompletedAssessment ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 text-sm text-gray-500">当前等级</div>
            <Tag className="rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">
              {englishLevel != null ? `等级 ${englishLevel}` : '未评测'}
            </Tag>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 text-sm text-gray-500">学习目标</div>
            <Space wrap>
              {learningGoals.map((goal) => (
                <Tag key={goal} className="rounded-full border-0 bg-white px-3 py-1 text-gray-700">
                  {goal}
                </Tag>
              ))}
              {customGoal ? (
                <Tag className="rounded-full border-0 bg-white px-3 py-1 text-amber-700">{customGoal}</Tag>
              ) : null}
            </Space>
          </div>

          <Button shape="round" onClick={onEditAssessment}>
            重新评测或修改
          </Button>
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="评测后会显示你的学习档案" />
      )}
    </Card>
  );
}
