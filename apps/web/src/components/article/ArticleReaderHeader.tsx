import { CheckCircleOutlined, PartitionOutlined } from '@ant-design/icons';
import { Button, Progress, Space, Tag, Typography } from 'antd';

import type { Article } from '@/api/article';

import { LEVEL_LABELS } from './articleReader.shared';

const { Text, Title } = Typography;

interface ArticleReaderHeaderProps {
  article: Article;
  readProgress: number;
  isReviewMode: boolean;
  onComplete?: () => void;
  onMarkComplete: () => void;
}

export function ArticleReaderHeader({
  article,
  readProgress,
  isReviewMode,
  onComplete,
  onMarkComplete,
}: ArticleReaderHeaderProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-[28px] border border-amber-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] md:p-8">
      <div className="absolute right-0 top-0 h-56 w-56 -translate-y-1/3 translate-x-1/4 rounded-full bg-amber-100/60 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-4xl">
          <Title level={2} className="!mb-3 !font-black !text-gray-800">
            {article.title}
          </Title>
          <Space wrap>
            <Text className="rounded-full bg-slate-50 px-3 py-1 text-gray-500">
              {article.publish_date}
            </Text>
            <Tag className="m-0 rounded-full border-0 bg-amber-100 px-3 py-1 text-amber-700">
              {LEVEL_LABELS[article.level] || `等级 ${article.level}`}
            </Tag>
          </Space>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <PartitionOutlined />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-800">
                看不懂时先拆句，再继续往下读
              </div>
              <div className="mt-1 text-sm leading-6 text-amber-900/75">
                遇到卡住的句子时，点正文右侧的“拆句”按钮，系统会帮你先理清句意、结构和可替换表达。
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-slate-50/90 p-3 pr-4">
          <Progress
            type="circle"
            percent={readProgress}
            size={56}
            strokeWidth={8}
            trailColor="rgba(0,0,0,0.06)"
            strokeColor={readProgress >= 100 ? '#10b981' : '#f59e0b'}
            format={(value) => (
              <span className="font-bold text-gray-700">{value}%</span>
            )}
          />
          {isReviewMode ? (
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={<CheckCircleOutlined />}
              className="border-0 bg-gradient-to-r from-emerald-500 to-teal-500"
              onClick={() => onComplete?.()}
            >
              完成复习
            </Button>
          ) : readProgress < 100 ? (
            <Button
              type="primary"
              shape="round"
              size="large"
              icon={<CheckCircleOutlined />}
              className="border-0 bg-gradient-to-r from-amber-500 to-orange-500"
              onClick={onMarkComplete}
            >
              标记完成
            </Button>
          ) : (
            <div className="flex items-center gap-2 font-bold text-emerald-600">
              <CheckCircleOutlined />
              已完成
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
