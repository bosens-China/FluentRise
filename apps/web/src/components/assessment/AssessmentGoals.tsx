import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Col, Input, Row, Tag, Typography } from 'antd';
import type { LearningGoal } from '@/api/user';

const { Title, Text } = Typography;

interface AssessmentGoalsProps {
  goals: LearningGoal[];
  selectedGoals: string[];
  selectedInterests: string[];
  customGoal: string;
  onSelectGoals: (goals: string[]) => void;
  onSelectInterests: (interests: string[]) => void;
  onCustomGoalChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function AssessmentGoals({
  goals,
  selectedGoals,
  selectedInterests,
  customGoal,
  onSelectGoals,
  onSelectInterests,
  onCustomGoalChange,
  onBack,
  onNext,
}: AssessmentGoalsProps) {
  const toggleGoal = (goalId: string) => {
    onSelectGoals(
      selectedGoals.includes(goalId)
        ? selectedGoals.filter((item) => item !== goalId)
        : [...selectedGoals, goalId],
    );
  };

  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="mb-8 text-center">
        <Title level={3} className="!mb-2 !font-black !text-gray-800">
          你的学习目标是什么？
        </Title>
        <Text className="text-base text-gray-500">
          可多选。我们会优先推荐更贴近你目标的内容和训练方式。
        </Text>
      </div>

      <div className="custom-scrollbar max-h-[400px] flex-1 overflow-y-auto px-1 py-1">
        <Row gutter={[16, 16]} className="!mx-0">
          {goals.map((goal) => {
            const isSelected = selectedGoals.includes(goal.id);
            return (
              <Col span={12} key={goal.id}>
                <button
                  type="button"
                  onClick={() => toggleGoal(goal.id)}
                  className={`flex h-full w-full cursor-pointer flex-col items-center rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
                    isSelected
                      ? 'scale-[1.02] border-[var(--primary)] bg-lime-50 shadow-md'
                      : 'border-gray-100 bg-white hover:border-lime-200 hover:shadow-sm'
                  }`}
                >
                  <div className="mb-2 text-3xl">{goal.icon}</div>
                  <Text className={`mb-1 block text-base font-bold ${isSelected ? 'text-lime-700' : 'text-gray-700'}`}>
                    {goal.label}
                  </Text>
                  <Text className="block text-xs text-gray-400">{goal.description}</Text>
                </button>
              </Col>
            );
          })}
        </Row>

        <div className="mb-4 mt-8">
          <Text className="mb-3 block text-sm font-bold text-gray-600">个人兴趣（选填，让生成的文章更有趣）</Text>
          <div className="flex flex-wrap gap-2">
            {['科技', '体育', '电影', '游戏', '文学', '历史', '音乐', '二次元', '商业'].map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <Tag
                  key={interest}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'border-[var(--primary)] bg-lime-50 text-lime-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-lime-300'
                  }`}
                  onClick={() => {
                    onSelectInterests(
                      selectedInterests.includes(interest)
                        ? selectedInterests.filter((i) => i !== interest)
                        : [...selectedInterests, interest],
                    );
                  }}
                >
                  {interest}
                </Tag>
              );
            })}
          </div>
        </div>

        <div className="mb-4 mt-8">
          <Text className="mb-3 block text-sm font-bold text-gray-600">其他补充诉求（选填）</Text>
          <Input.TextArea
            value={customGoal}
            rows={3}
            maxLength={200}
            showCount
            placeholder="比如：准备面试、想能看懂英文内容、想陪孩子一起学英语"
            className="rounded-xl border-transparent bg-gray-50 p-4 text-base hover:border-lime-300 focus:border-lime-500 focus:bg-white"
            onChange={(event) => onCustomGoalChange(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <Button type="text" icon={<ArrowLeftOutlined />} className="font-medium text-gray-500" onClick={onBack}>
          返回
        </Button>
        <Button
          type="primary"
          size="large"
          shape="round"
          className="px-8 font-bold shadow-md shadow-lime-200"
          disabled={selectedGoals.length === 0 && customGoal.trim().length === 0}
          onClick={onNext}
        >
          下一步
        </Button>
      </div>
    </div>
  );
}
