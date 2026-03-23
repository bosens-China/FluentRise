import {
  ClockCircleOutlined,
  CloseOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { Button, Progress, Typography } from 'antd';

const { Text, Title } = Typography;

interface PlaygroundPageHeaderProps {
  progress?: number;
  currentIndex?: number;
  total?: number;
  streak: number;
  durationText?: string;
  showProgress?: boolean;
  title?: string;
  onOpenInsights: () => void;
  onClose: () => void;
}

export function PlaygroundPageHeader({
  progress = 0,
  currentIndex = 0,
  total = 0,
  streak,
  durationText,
  showProgress = true,
  title = '今天的训练场',
  onOpenInsights,
  onClose,
}: PlaygroundPageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/85 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-black text-white shadow-[var(--shadow-button)]">
            训
          </div>
          {showProgress ? (
            <span className="font-black text-gray-800">{title}</span>
          ) : (
            <Title level={4} className="!mb-0 !font-black !text-gray-800">
              游乐园
            </Title>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <Button onClick={onOpenInsights}>训练记录</Button>
          {showProgress ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Progress
                percent={progress}
                showInfo={false}
                className="w-36"
                strokeColor="var(--primary)"
              />
              <Text className="text-sm text-gray-500">
                {currentIndex}/{total}
              </Text>
            </div>
          ) : null}
          {streak > 0 ? (
            <div className="flex items-center gap-1 font-bold text-[var(--accent)]">
              <FireOutlined />
              {streak}
            </div>
          ) : null}
          {durationText ? (
            <div className="flex items-center gap-1 text-gray-500">
              <ClockCircleOutlined />
              <span className="font-mono">{durationText}</span>
            </div>
          ) : null}
          <Button icon={<CloseOutlined />} onClick={onClose} />
        </div>
      </div>
    </header>
  );
}
