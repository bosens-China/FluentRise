import { Input, Modal, Space, Typography } from 'antd';
import { Segmented } from 'antd';

import type { SubmitReviewResponse } from '@/api/review';
import type { EncouragementResponse } from '@/api/system';
import { ReviewCompleteModal } from '@/components/review/ReviewCompleteModal';
import { ReviewPreviewModal } from '@/components/review/ReviewPreviewModal';

const { Paragraph, Text, Title } = Typography;

export type FeedbackReason = 'too_hard' | 'too_easy' | 'other';

interface ArticlePageModalsProps {
  articleTitle: string;
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
  onPreviewConfirm: (assessment: 'clear' | 'fuzzy' | 'forgot') => void;
  onPreviewCancel: () => void;
  onReviewComplete: (result: SubmitReviewResponse) => void;
  onReviewCancel: () => void;
}

export function ArticlePageModals({
  articleTitle,
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
  onPreviewConfirm,
  onPreviewCancel,
  onReviewComplete,
  onReviewCancel,
}: ArticlePageModalsProps) {
  return (
    <>
      <ReviewPreviewModal
        open={isReviewMode && showPreviewModal}
        articleTitle={articleTitle}
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
            placeholder="可以补充你觉得难在哪、简单在哪，或者希望更贴近什么场景。"
          />
        </Space>
      </Modal>

      <Modal open={encouragementOpen} footer={null} onCancel={onCloseEncouragement} centered>
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center">
          <div className="mb-3 text-5xl">完成了</div>
          <Title level={3} className="!mb-2 !text-gray-800">
            今天这节课已经完成
          </Title>
          <Paragraph className="!mb-2 text-lg font-medium text-amber-800">{encouragement?.zh}</Paragraph>
          <Text className="text-gray-500">{encouragement?.en}</Text>
        </div>
      </Modal>
    </>
  );
}
