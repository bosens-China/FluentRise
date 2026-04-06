import { ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';
import type { EnglishLevelInfo } from '@/api/user';

const { Title, Text } = Typography;

interface AssessmentCompleteProps {
  isUpdateMode: boolean;
  selectedLevel: number | null;
  levels: EnglishLevelInfo[];
  onComplete: () => void;
}

export function AssessmentComplete({
  isUpdateMode,
  selectedLevel,
  levels,
  onComplete,
}: AssessmentCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 scale-150 rounded-full bg-emerald-200 opacity-40 blur-2xl" />
        <CheckCircleFilled className="relative z-10 text-7xl text-emerald-500 drop-shadow-sm" />
      </div>

      <Title level={2} className="!mb-3 !font-black !text-gray-800">
        {isUpdateMode ? '学习档案已更新' : '全部就绪'}
      </Title>
      <Text className="mb-8 block text-lg text-gray-500">
        {isUpdateMode ? '新的学习档案已经生效' : '你的专属英语学习档案已建立'}
      </Text>

      {selectedLevel !== null && levels ? (
        <div className="relative mb-8 w-full max-w-sm overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-lime-50 to-sky-50 p-6 text-left shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/4 -translate-y-1/2 rounded-full bg-lime-100 opacity-60 blur-2xl" />

          <Text className="mb-1 block text-sm font-bold uppercase tracking-wider text-lime-500">
            当前评测等级
          </Text>
          <div className="mb-4 flex items-end gap-3">
            <Title level={2} className="!m-0 !font-black !text-lime-900">
              {levels[selectedLevel]?.label}
            </Title>
            <Tag color="green" className="mb-1.5 rounded-md border-0 font-bold">
              CEFR {levels[selectedLevel]?.cefr}
            </Tag>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white/60 p-3 backdrop-blur-sm">
            <span className="font-medium text-gray-600">预估词汇量</span>
            <span className="text-lg font-bold text-lime-600">
              {levels[selectedLevel]?.vocabulary} 词
            </span>
          </div>
        </div>
      ) : null}

      <Button
        type="primary"
        size="large"
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-lime-200 transition-all hover:scale-105"
        onClick={onComplete}
      >
        进入学习中心
        <ArrowRightOutlined />
      </Button>
    </div>
  );
}
