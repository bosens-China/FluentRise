/**
 * 今日复习区域 — 内联展示待复习内容。
 */
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckCircleOutlined, DownOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Button, Card, Skeleton, Tag, Typography } from 'antd';

import { type ReviewItem } from '@/api/review';

const { Text } = Typography;

interface ReviewSectionProps {
  reviewItems: ReviewItem[];
  summaryMessage: string;
  loading: boolean;
}

const STAGE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-geekblue-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
];

const INITIAL_VISIBLE_COUNT = 5;

function getStageColor(stage: number) {
  return STAGE_COLORS[(stage - 1) % STAGE_COLORS.length] ?? STAGE_COLORS[0];
}

export function ReviewSection({ reviewItems, summaryMessage, loading }: ReviewSectionProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const startReview = (item: ReviewItem) => {
    navigate({
      to: '/article/$articleId',
      params: { articleId: String(item.article_id) },
      search: { review: item.schedule_id },
    });
  };

  const goToReviewCenter = () => {
    navigate({ to: '/review' });
  };

  if (loading) {
    return (
      <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const hasReviews = reviewItems.length > 0;
  const visibleItems = expanded
    ? reviewItems
    : reviewItems.slice(0, INITIAL_VISIBLE_COUNT);
  const canExpand = reviewItems.length > INITIAL_VISIBLE_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        {/* 头部 */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
            <ReloadOutlined />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800">今日复习</div>
            <div className="text-sm text-gray-400">
              {hasReviews
                ? `共 ${reviewItems.length} 项待复习`
                : '今天没有复习任务'}
            </div>
          </div>
        </div>

        {/* 摘要 */}
        {hasReviews && summaryMessage ? (
          <div className="mb-4 rounded-2xl bg-indigo-50/60 px-4 py-3 text-sm text-indigo-600">
            {summaryMessage}
          </div>
        ) : null}

        {/* 复习列表 */}
        {hasReviews ? (
          <div className="space-y-2">
            {visibleItems.map((item, index) => {
              const color = getStageColor(item.stage);
              return (
                <motion.div
                  key={item.schedule_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                >
                  <button
                    type="button"
                    onClick={() => startReview(item)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className={`h-2.5 w-2.5 rounded-full ${color.dot} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-800">
                        {item.title}
                      </div>
                    </div>
                    <Tag
                      className={`m-0 shrink-0 rounded-full border-0 ${color.bg} ${color.text}`}
                    >
                      {item.stage_label}
                    </Tag>
                    <RightOutlined className="shrink-0 text-xs text-gray-300" />
                  </button>
                </motion.div>
              );
            })}

            {canExpand && !expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-2xl py-2 text-sm text-indigo-500 transition-colors hover:text-indigo-700"
              >
                展开其余 {reviewItems.length - INITIAL_VISIBLE_COUNT} 项
                <DownOutlined className="text-xs" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircleOutlined className="text-3xl text-emerald-400" />
            <Text className="text-gray-500">今天没有复习任务</Text>
            <Text className="text-xs text-gray-400">可以专注学习新课文</Text>
          </div>
        )}

        {/* 底部 */}
        <div className="mt-4">
          <Button
            block
            shape="round"
            size="large"
            onClick={goToReviewCenter}
          >
            查看复习中心
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
