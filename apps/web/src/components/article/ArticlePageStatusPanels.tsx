import { Button, Card, Space } from 'antd';

import { ReviewProgressBar } from '@/components/review/ReviewProgressBar';

interface ArticlePageStatusPanelsProps {
  isReviewMode: boolean;
  reviewStage: number | null;
  nextReviewDate: string | null;
  reviewCompleted: boolean;
  showWakeupPrompt: boolean;
  reviewAudioLoading: boolean;
  reviewAudioPlaying: boolean;
  onPlayReviewAudio: () => void;
  onOpenPreviewAssessment: () => void;
}

export function ArticlePageStatusPanels({
  isReviewMode,
  reviewStage,
  nextReviewDate,
  reviewCompleted,
  showWakeupPrompt,
  reviewAudioLoading,
  reviewAudioPlaying,
  onPlayReviewAudio,
  onOpenPreviewAssessment,
}: ArticlePageStatusPanelsProps) {
  if (!isReviewMode) {
    return null;
  }

  return (
    <>
      {reviewStage ? (
        <ReviewProgressBar
          currentStage={reviewStage}
          nextReviewDate={nextReviewDate}
          completed={reviewCompleted}
        />
      ) : null}

      {!reviewCompleted && showWakeupPrompt ? (
        <Card className="mb-6 rounded-[28px] border-0 bg-[linear-gradient(135deg,_rgba(255,247,237,0.95),_rgba(255,255,255,0.98))] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-500">
                Review Wake Up
              </div>
              <div className="mt-2 text-xl font-semibold text-gray-800">
                先做内容唤醒，再开始记忆自评
              </div>
              <div className="mt-3 text-sm leading-7 text-gray-600">
                建议先听一遍整篇音频，或者先快速浏览标题和正文，不用逐句精读。完成这一步后，再判断自己是“记得清楚
                / 有点模糊 / 基本忘了”。
              </div>
            </div>
            <Space wrap>
              <Button
                shape="round"
                loading={reviewAudioLoading || reviewAudioPlaying}
                onClick={onPlayReviewAudio}
              >
                播放整篇音频
              </Button>
              <Button
                type="primary"
                shape="round"
                className="border-0 bg-gradient-to-r from-amber-500 to-orange-500"
                onClick={onOpenPreviewAssessment}
              >
                我已完成唤醒，开始记忆自评
              </Button>
            </Space>
          </div>
        </Card>
      ) : null}
    </>
  );
}
