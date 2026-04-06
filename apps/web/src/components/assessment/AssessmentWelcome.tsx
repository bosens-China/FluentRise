import { ArrowRightOutlined, RocketOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

interface AssessmentWelcomeProps {
  isUpdateMode: boolean;
  onNext: () => void;
}

export function AssessmentWelcome({ isUpdateMode, onNext }: AssessmentWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 scale-150 rounded-full bg-lime-200 opacity-60 blur-2xl" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] text-5xl text-white shadow-xl shadow-lime-100">
          <RocketOutlined />
        </div>
      </div>

      <Title level={2} className="!mb-4 !font-black !tracking-tight !text-gray-800">
        {isUpdateMode ? '重新校准你的学习档案' : '开启你的专属学习之旅'}
      </Title>
      <Paragraph className="mx-auto mb-10 max-w-md !text-lg !leading-relaxed !text-gray-500">
        {isUpdateMode
          ? '我们会根据新的评测结果，重新调整你的学习节奏、课文难度和目标标签。'
          : '只需要不到 2 分钟，完成几个简单问题，我们就能为你生成更合适的学习计划。'}
      </Paragraph>

      <Button
        type="primary"
        size="large"
        shape="round"
        className="h-14 px-12 text-lg font-bold shadow-lg shadow-lime-200 transition-all hover:scale-105"
        onClick={onNext}
      >
        开始评测
        <ArrowRightOutlined />
      </Button>
    </div>
  );
}
