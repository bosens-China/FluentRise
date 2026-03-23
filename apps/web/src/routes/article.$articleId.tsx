import { useEffect, useMemo, useState } from 'react';
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { App, Button, Result, Spin, Typography } from 'antd';

import {
  generateArticleAudio,
  generateTodayArticle,
  getArticleDetail,
  type Article,
  type ExerciseResultItem,
  updateArticleProgress,
} from '@/api/article';
import {
  getArticleReviewStatus,
  type SubmitReviewResponse,
} from '@/api/review';
import {
  systemApi,
  type EncouragementResponse,
  type Quote,
} from '@/api/system';
import {
  ArticlePageActions,
  ArticlePageModals,
  ArticlePageStatusPanels,
  ArticleReader,
} from '@/components/article';
import type { FeedbackReason } from '@/components/article/ArticlePageModals';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useMutation, useQuery } from '@/hooks/useData';

const { Paragraph, Text, Title } = Typography;

export const Route = createFileRoute('/article/$articleId')({
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const search = useSearch({ from: '/article/$articleId' }) as {
    review?: number | string;
  };
  const navigate = useNavigate();
  const { message } = App.useApp();
  const isToday = articleId === 'today';
  const scheduleId = search.review ? Number(search.review) : null;
  const isReviewMode = Boolean(scheduleId);
  const {
    play: playReviewAudioFile,
    stop: stopReviewAudio,
    isPlaying: reviewAudioPlaying,
  } = useAudioPlayer();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] =
    useState<FeedbackReason>('too_hard');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [encouragement, setEncouragement] =
    useState<EncouragementResponse | null>(null);
  const [encouragementOpen, setEncouragementOpen] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [previewAssessment, setPreviewAssessment] = useState<
    'clear' | 'fuzzy' | 'forgot'
  >();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWakeupPrompt, setShowWakeupPrompt] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [reviewStage, setReviewStage] = useState<number | null>(null);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
  const [reviewAudioLoading, setReviewAudioLoading] = useState(false);
  const [exerciseSummary, setExerciseSummary] = useState<{
    correct: number;
    total: number;
    results: ExerciseResultItem[];
  } | null>(null);
  const [reviewStartTime] = useState(() => (isReviewMode ? Date.now() : 0));
  const [reviewEndTime, setReviewEndTime] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (reviewAudioUrl) {
        URL.revokeObjectURL(reviewAudioUrl);
      }
    };
  }, [reviewAudioUrl]);

  useEffect(() => {
    setPreviewAssessment(undefined);
    setShowPreviewModal(false);
    setShowWakeupPrompt(false);
    setReviewCompleted(false);
    setReviewStage(null);
    if (reviewAudioUrl) {
      URL.revokeObjectURL(reviewAudioUrl);
      setReviewAudioUrl(null);
    }
    stopReviewAudio();
    setReviewAudioLoading(false);
  }, [articleId, isReviewMode, reviewAudioUrl, stopReviewAudio]);

  const durationSeconds = useMemo(() => {
    if (!isReviewMode || !reviewEndTime) {
      return 0;
    }
    return Math.max(0, Math.floor((reviewEndTime - reviewStartTime) / 1000));
  }, [isReviewMode, reviewEndTime, reviewStartTime]);

  useQuery(() => systemApi.getQuotes(8), {
    ready: isToday,
    onSuccess: (data) => setQuotes(data),
  });

  useEffect(() => {
    if (quotes.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setQuoteIndex((previous) => (previous + 1) % quotes.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [quotes]);

  const articleRequest = useQuery(
    async () => {
      if (isToday) {
        return generateTodayArticle();
      }
      return getArticleDetail(Number(articleId));
    },
    {
      refreshDeps: [articleId, isToday],
      onError: () => {
        message.error(
          isToday ? '今日课文生成失败，请稍后重试' : '课文加载失败',
        );
      },
    },
  );

  const reviewStatusRequest = useQuery(
    () => getArticleReviewStatus(Number(articleId)),
    {
      ready: isReviewMode && !isToday,
      onSuccess: (data) => {
        if (!data.is_in_review) {
          return;
        }
        setReviewStage(data.current_stage);
        setReviewCompleted(data.completed);
        if (!data.completed) {
          window.setTimeout(() => setShowWakeupPrompt(true), 400);
        }
      },
    },
  );

  const currentArticle = articleRequest.data as Article | undefined;

  const playReviewAudio = async () => {
    if (!currentArticle) {
      return;
    }

    try {
      setReviewAudioLoading(true);
      let nextUrl = reviewAudioUrl;
      if (!nextUrl) {
        nextUrl = await generateArticleAudio(currentArticle.id);
        setReviewAudioUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return nextUrl;
        });
      }

      await playReviewAudioFile(nextUrl, {
        onError: () => {
          message.error('课文音频播放失败，请稍后重试');
        },
      });
    } catch {
      message.error('课文音频生成失败，请稍后重试');
    } finally {
      setReviewAudioLoading(false);
    }
  };

  const updateProgressRequest = useMutation(
    async (
      progress: number,
      completed: boolean,
      results?: ExerciseResultItem[],
    ) => {
      if (!articleRequest.data) {
        return null;
      }
      return updateArticleProgress(
        articleRequest.data.id,
        progress,
        completed,
        results,
      );
    },
    {
      onSuccess: async (_data, params) => {
        const [, completed, results] = params;
        if (!completed || isReviewMode || !articleRequest.data) {
          return;
        }

        try {
          const nextEncouragement = await systemApi.getEncouragement({
            context_type: 'lesson',
            title: articleRequest.data.title,
            accuracy:
              results && results.length > 0
                ? Math.round(
                    (results.filter((item) => item.is_correct).length /
                      results.length) *
                      100,
                  )
                : undefined,
          });
          setEncouragement(nextEncouragement);
          setEncouragementOpen(true);
        } catch {
          message.success('今天的学习已经完成。');
        }
      },
      onError: () => {
        message.error('学习进度保存失败');
      },
    },
  );

  const regenerateRequest = useMutation(
    async () =>
      generateTodayArticle({
        forceRegenerate: true,
        feedbackReason,
        feedbackComment: feedbackComment || undefined,
      }),
    {
      onSuccess: () => {
        message.success('已经根据你的反馈重新生成今天的课文');
        setFeedbackOpen(false);
        setFeedbackComment('');
        void articleRequest.refresh();
      },
      onError: () => {
        message.error('重新生成失败，请稍后重试');
      },
    },
  );

  const reviewState = useMemo(() => {
    if (!previewAssessment) {
      return { defaultShowChinese: true, quickMode: false };
    }
    if (previewAssessment === 'clear') {
      return { defaultShowChinese: false, quickMode: true };
    }
    return { defaultShowChinese: true, quickMode: false };
  }, [previewAssessment]);

  if (articleRequest.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,_#fffdf9,_#fff9f1)]">
        <div className="rounded-[32px] border border-white/70 bg-white/70 p-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl">
          <Spin size="large" />
          <Title level={3} className="!mb-3 !mt-8 !text-gray-800">
            {isToday ? '正在生成今天的课文' : '正在加载课文'}
          </Title>
          {isToday && quotes.length > 0 ? (
            <>
              <Paragraph className="!mb-1 text-lg italic text-gray-700">
                "{quotes[quoteIndex]?.en}"
              </Paragraph>
              <Text className="text-amber-700">{quotes[quoteIndex]?.zh}</Text>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (articleRequest.error || !currentArticle) {
    return (
      <div className="flex h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffdf9,_#fff9f1)]">
        <Result
          status="404"
          title="课文暂时不可用"
          subTitle="这篇课文不存在，或者生成过程中出现了一点问题。"
          extra={
            <Button type="primary" onClick={() => navigate({ to: '/' })}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.1),_transparent_20%),linear-gradient(180deg,_#fffdf8,_#fff9f1_45%,_#fffdf8)] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1580px]">
        <ArticlePageActions
          isReviewMode={isReviewMode}
          isToday={isToday}
          onBackHome={() => navigate({ to: '/' })}
          onOpenFeedback={() => setFeedbackOpen(true)}
        />

        <ArticlePageStatusPanels
          isReviewMode={isReviewMode}
          reviewStage={reviewStage}
          nextReviewDate={reviewStatusRequest.data?.next_review_date || null}
          reviewCompleted={reviewCompleted}
          showWakeupPrompt={showWakeupPrompt}
          reviewAudioLoading={reviewAudioLoading}
          reviewAudioPlaying={reviewAudioPlaying}
          onPlayReviewAudio={() => {
            void playReviewAudio();
          }}
          onOpenPreviewAssessment={() => {
            setShowWakeupPrompt(false);
            setShowPreviewModal(true);
          }}
        />

        <ArticleReader
          article={currentArticle}
          isReviewMode={isReviewMode}
          defaultShowChinese={reviewState.defaultShowChinese}
          onProgressUpdate={(progress, completed, results) => {
            void updateProgressRequest.run(progress, completed, results);
          }}
          onExerciseUpdate={(summary) => {
            setExerciseSummary(summary);
          }}
          onComplete={() => {
            setReviewEndTime(Date.now());
            setShowCompleteModal(true);
          }}
        />
      </div>

      <ArticlePageModals
        article={currentArticle}
        feedbackOpen={feedbackOpen}
        feedbackReason={feedbackReason}
        feedbackComment={feedbackComment}
        feedbackLoading={regenerateRequest.loading}
        encouragementOpen={encouragementOpen}
        encouragement={encouragement}
        isReviewMode={isReviewMode}
        showPreviewModal={showPreviewModal}
        scheduleId={scheduleId}
        reviewStage={reviewStage}
        showCompleteModal={showCompleteModal}
        isQuickMode={reviewState.quickMode}
        durationSeconds={durationSeconds}
        correctCount={exerciseSummary?.correct}
        totalCount={exerciseSummary?.total}
        previewAssessment={previewAssessment}
        onFeedbackReasonChange={setFeedbackReason}
        onFeedbackCommentChange={setFeedbackComment}
        onCloseFeedback={() => setFeedbackOpen(false)}
        onSubmitFeedback={() => {
          void regenerateRequest.run();
        }}
        onCloseEncouragement={() => setEncouragementOpen(false)}
        onReturnHome={() => {
          setEncouragementOpen(false);
          navigate({ to: '/' });
        }}
        onPreviewConfirm={(assessment) => {
          setPreviewAssessment(assessment);
          setShowPreviewModal(false);
        }}
        onPreviewCancel={() => {
          setShowPreviewModal(false);
          setShowWakeupPrompt(true);
        }}
        onReviewComplete={(result: SubmitReviewResponse) => {
          setShowCompleteModal(false);
          message.success(result.message);
          navigate({ to: '/' });
        }}
        onReviewCancel={() => setShowCompleteModal(false)}
      />
    </div>
  );
}

export default ArticlePage;
