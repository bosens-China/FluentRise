import {
  FireOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button, Modal, Typography } from 'antd';

import type { PlaygroundSubmitResult } from '@/lib/playground';

const { Paragraph, Text, Title } = Typography;

interface PlaygroundCompleteModalProps {
  open: boolean;
  durationText: string;
  maxStreak: number;
  result: PlaygroundSubmitResult | null;
  onRetry: () => void;
  onBackHome: () => void;
}

export function PlaygroundCompleteModal({
  open,
  durationText,
  maxStreak,
  result,
  onRetry,
  onBackHome,
}: PlaygroundCompleteModalProps) {
  return (
    <Modal open={open} footer={null} closable={false} centered width={500}>
      {result ? (
        <div className="py-4 text-center">
          <div className="mb-4 text-4xl font-black text-amber-500">
            训练完成
          </div>
          <Title level={2} className="!mb-2 !text-gray-800">
            今天的游乐园已完成
          </Title>
          <Paragraph className="!mb-1 text-lg font-medium text-amber-800">
            {result.encouragement_zh}
          </Paragraph>
          <Text className="text-gray-500">{result.encouragement_en}</Text>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-emerald-50 p-4">
              <div className="text-3xl font-black text-emerald-600">
                {result.correct}
              </div>
              <div className="text-sm text-emerald-500">答对</div>
            </div>
            <div className="rounded-3xl bg-amber-50 p-4">
              <div className="text-3xl font-black text-amber-600">
                {result.accuracy}%
              </div>
              <div className="text-sm text-amber-500">正确率</div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">用时</span>
              <span className="font-medium">{durationText}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-gray-500">最高连对</span>
              <span className="flex items-center gap-1 font-medium">
                <FireOutlined className="text-orange-500" />
                {maxStreak}
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-4">
            <Button
              icon={<ReloadOutlined />}
              className="rounded-xl"
              onClick={onRetry}
            >
              再来一轮
            </Button>
            <Button
              type="primary"
              icon={<TrophyOutlined />}
              className="rounded-xl border-0 bg-gradient-to-r from-amber-500 to-orange-500"
              onClick={onBackHome}
            >
              返回首页
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
