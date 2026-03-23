import { useMemo } from 'react';
import { Button, Input, Modal, Space, Typography } from 'antd';
import { Segmented } from 'antd';

import type { Article } from '@/api/article';
import type { SubmitReviewResponse } from '@/api/review';
import type { EncouragementResponse } from '@/api/system';
import { ReviewCompleteModal } from '@/components/review/ReviewCompleteModal';
import { ReviewPreviewModal } from '@/components/review/ReviewPreviewModal';

const { Paragraph, Text, Title } = Typography;

export type FeedbackReason = 'too_hard' | 'too_easy' | 'other';

interface ArticlePageModalsProps {
  article: Article;
  feedbackOpen: boolean;
  feedbackReason: FeedbackReason;
  feedbackComment: string;
  feedbackLoading: boolean;
  encouragementOpen: boolean;
  encouragement: EncouragementResponse | null;
  isReviewMode: boolean;
  showPreviewModal: boolean;
  scheduleId: number | null;
  reviewStage: number | null;
  showCompleteModal: boolean;
  isQuickMode: boolean;
  durationSeconds: number;
  correctCount?: number;
  totalCount?: number;
  previewAssessment?: 'clear' | 'fuzzy' | 'forgot';
  onFeedbackReasonChange: (reason: FeedbackReason) => void;
  onFeedbackCommentChange: (value: string) => void;
  onCloseFeedback: () => void;
  onSubmitFeedback: () => void;
  onCloseEncouragement: () => void;
  onReturnHome: () => void;
  onPreviewConfirm: (assessment: 'clear' | 'fuzzy' | 'forgot') => void;
  onPreviewCancel: () => void;
  onReviewComplete: (result: SubmitReviewResponse) => void;
  onReviewCancel: () => void;
}

export function ArticlePageModals({
  article,
  feedbackOpen,
  feedbackReason,
  feedbackComment,
  feedbackLoading,
  encouragementOpen,
  encouragement,
  isReviewMode,
  showPreviewModal,
  scheduleId,
  reviewStage,
  showCompleteModal,
  isQuickMode,
  durationSeconds,
  correctCount,
  totalCount,
  previewAssessment,
  onFeedbackReasonChange,
  onFeedbackCommentChange,
  onCloseFeedback,
  onSubmitFeedback,
  onCloseEncouragement,
  onReturnHome,
  onPreviewConfirm,
  onPreviewCancel,
  onReviewComplete,
  onReviewCancel,
}: ArticlePageModalsProps) {
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${6 + index * 5}%`,
        delay: `${(index % 6) * 0.12}s`,
        duration: `${3 + (index % 4) * 0.35}s`,
        color: ['#58CC02', '#FF9600', '#1CB0F6', '#FFC800'][index % 4],
        rotate: `${index % 2 === 0 ? 16 : -18}deg`,
      })),
    [],
  );

  return (
    <>
      <ReviewPreviewModal
        open={isReviewMode && showPreviewModal}
        articleTitle={article.title}
        onConfirm={onPreviewConfirm}
        onCancel={onPreviewCancel}
      />

      {scheduleId && reviewStage ? (
        <ReviewCompleteModal
          open={showCompleteModal}
          scheduleId={scheduleId}
          currentStage={reviewStage}
          isQuickMode={isQuickMode}
          durationSeconds={durationSeconds}
          correctCount={correctCount}
          totalCount={totalCount}
          previewAssessment={previewAssessment}
          onComplete={onReviewComplete}
          onCancel={onReviewCancel}
        />
      ) : null}

      <Modal
        open={feedbackOpen}
        onCancel={onCloseFeedback}
        onOk={onSubmitFeedback}
        confirmLoading={feedbackLoading}
        okText="重新生成"
        cancelText="取消"
        title="告诉我们哪里不合适"
      >
        <Space direction="vertical" className="w-full">
          <Segmented<FeedbackReason>
            block
            value={feedbackReason}
            onChange={(value) => onFeedbackReasonChange(value)}
            options={[
              { label: '太难了', value: 'too_hard' },
              { label: '太简单', value: 'too_easy' },
              { label: '其他', value: 'other' },
            ]}
          />
          <Input.TextArea
            rows={4}
            maxLength={200}
            showCount
            value={feedbackComment}
            onChange={(event) => onFeedbackCommentChange(event.target.value)}
            placeholder="可以补充你觉得难在哪里、简单在哪里，或者希望更贴近什么场景。"
          />
        </Space>
      </Modal>

      <Modal
        open={encouragementOpen}
        footer={null}
        onCancel={onCloseEncouragement}
        centered
      >
        <style>{`
          @keyframes lesson-confetti-fall {
            0% { transform: translate3d(0,-16px,0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translate3d(0,320px,0) rotate(280deg); opacity: 0; }
          }
          @keyframes lesson-badge-pop {
            0% { transform: scale(0.82); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-50 via-orange-50 to-white p-7 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="absolute top-0 h-4 w-2 rounded-full"
                style={{
                  left: piece.left,
                  background: piece.color,
                  transform: `rotate(${piece.rotate})`,
                  animation: `lesson-confetti-fall ${piece.duration} ease-out ${piece.delay} infinite`,
                }}
              />
            ))}
          </div>

          <div
            className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_16px_40px_rgba(255,150,0,0.18)]"
            style={{ animation: 'lesson-badge-pop 420ms ease-out both' }}
          >
            <span className="text-5xl">🎉</span>
          </div>

          <Title level={2} className="!mb-2 !mt-6 !text-gray-800">
            本课完成
          </Title>
          <Paragraph className="!mb-2 text-lg font-medium text-amber-800">
            {encouragement?.zh || '做得很好，今天又稳稳向前了一步。'}
          </Paragraph>
          <Text className="text-gray-500">
            {encouragement?.en || `You finished "${article.title}".`}
          </Text>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              size="large"
              className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-8"
              type="primary"
              onClick={onReturnHome}
            >
              返回主页
            </Button>
            <Button size="large" onClick={onCloseEncouragement}>
              继续留在当前页面
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
