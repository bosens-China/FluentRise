import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';

interface ArticlePageActionsProps {
  isReviewMode: boolean;
  isToday: boolean;
  onBackHome: () => void;
  onOpenFeedback: () => void;
}

export function ArticlePageActions({
  isReviewMode,
  isToday,
  onBackHome,
  onOpenFeedback,
}: ArticlePageActionsProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBackHome}
        className="rounded-xl border border-amber-100 bg-white px-4 py-2 text-gray-600"
      >
        返回首页
      </Button>

      <Space wrap>
        {!isReviewMode && isToday ? (
          <Button
            icon={<ReloadOutlined />}
            onClick={onOpenFeedback}
            className="rounded-xl border-amber-200 bg-white"
          >
            反馈并重生成
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
