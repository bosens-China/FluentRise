import { MessageOutlined } from '@ant-design/icons';
import { Button, Card, Space } from 'antd';

interface QuickEntryCardProps {
  onOpenReview: () => void;
  onOpenMistakes: () => void;
  onOpenPlayground: () => void;
  onOpenAIChat: () => void;
}

export function QuickEntryCard({
  onOpenReview,
  onOpenMistakes,
  onOpenPlayground,
  onOpenAIChat,
}: QuickEntryCardProps) {
  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <MessageOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">快速入口</div>
          <div className="text-sm text-gray-500">需要帮助时可以直接进入</div>
        </div>
      </div>

      <Space direction="vertical" className="w-full">
        <Button block shape="round" size="large" onClick={onOpenReview}>
          进入复习中心
        </Button>
        <Button block shape="round" size="large" onClick={onOpenMistakes}>
          查看错题本
        </Button>
        <Button block shape="round" size="large" onClick={onOpenPlayground}>
          进入游乐园
        </Button>
        <Button
          block
          type="primary"
          shape="round"
          size="large"
          icon={<MessageOutlined />}
          className="border-0 bg-gradient-to-r from-amber-500 to-orange-500"
          onClick={onOpenAIChat}
        >
          打开 AI 对话
        </Button>
      </Space>
    </Card>
  );
}
