import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import type { AssessmentQuestion } from '@/api/user';

const { Title, Text } = Typography;

interface AssessmentTestProps {
  questions: AssessmentQuestion[];
  selectedLevel: number | null;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  isUpdateMode: boolean;
}

export function AssessmentTest({
  questions,
  selectedLevel,
  onSelectLevel,
  onBack,
  onSubmit,
  submitting,
  isUpdateMode,
}: AssessmentTestProps) {
  return (
    <div className="flex h-full flex-col animate-fade-in">
      <div className="mb-8 text-center">
        <Title level={3} className="!mb-2 !font-black !text-gray-800">
          你能轻松理解以下哪句话？
        </Title>
        <Text className="text-base text-gray-500">
          请选择你能完全看懂的最长、最难的一句。
        </Text>
      </div>

      <div className="custom-scrollbar max-h-[400px] flex-1 space-y-3 overflow-y-auto pb-4 pr-2">
        {questions.map((question) => {
          const isSelected = selectedLevel === question.level;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelectLevel(question.level)}
              className={`group relative w-full cursor-pointer rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                isSelected
                  ? 'border-[var(--primary)] bg-lime-50 shadow-md'
                  : 'border-transparent bg-gray-50 hover:border-lime-200 hover:bg-white hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                      : 'border-gray-300 bg-white group-hover:border-lime-300'
                  }`}
                >
                  {isSelected ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                </div>
                <div>
                  <Text className={`block text-lg font-medium transition-colors ${isSelected ? 'text-lime-900' : 'text-gray-700'}`}>
                    {question.sentence}
                  </Text>
                  <Text className="mt-1 block text-sm text-gray-400">{question.translation}</Text>
                </div>
              </div>
            </button>
          );
        })}
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
          disabled={selectedLevel === null}
          loading={submitting}
          onClick={onSubmit}
        >
          {isUpdateMode ? '更新我的档案' : '生成我的计划'}
        </Button>
      </div>
    </div>
  );
}
