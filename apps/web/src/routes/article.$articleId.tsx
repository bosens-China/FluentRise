import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Quote } from 'lucide-react';
import { ArticleReader } from '@/components/article';
import { getArticleDetail, generateTodayArticle } from '@/api/article';
import { systemApi, type Quote as QuoteType } from '@/api/system';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@/hooks/useData';
import { updateArticleProgress } from '@/api/article';
import { getArticleReviewStatus, type SubmitReviewResponse } from '@/api/review';
import { ReviewProgressBar } from '@/components/review/ReviewProgressBar';
import { ReviewPreviewModal } from '@/components/review/ReviewPreviewModal';
import { ReviewCompleteModal } from '@/components/review/ReviewCompleteModal';
import { Button, Card } from '@/components/ui';
import { AuthGuard } from '@/components/providers';

export const Route = createFileRoute('/article/$articleId')({
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const search = useSearch({ from: '/article/$articleId' }) as { review?: number | string };
  const navigate = useNavigate();
  const isToday = articleId === 'today';

  // 复习模式相关状态
  const scheduleId = search.review ? Number(search.review) : null;
  const isReviewMode = !!scheduleId;

  const [reviewStage, setReviewStage] = useState<number | null>(null);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [previewAssessment, setPreviewAssessment] = useState<'clear' | 'fuzzy' | 'forgot'>();
  const [exerciseResults, setExerciseResults] = useState<{ correct: number; total: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [quotes, setQuotes] = useState<QuoteType[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // 复习开始时间
  const reviewStartTime = useMemo(() => (isReviewMode ? Date.now() : null), [isReviewMode]);

  // 计算复习用时
  const durationSeconds = useMemo(() => {
    if (!reviewStartTime || !currentTime) return 0;
    return Math.floor((currentTime - reviewStartTime) / 1000);
  }, [currentTime, reviewStartTime]);

  // 获取鼓励语录
  useEffect(() => {
    if (!isToday) return;
    systemApi.getQuotes(10).then((data) => {
      if (data?.length > 0) setQuotes(data);
    });
  }, [isToday]);

  // 定时切换语录
  useEffect(() => {
    if (quotes.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [quotes]);

  // 获取文章详情
  const { data: article, loading, error } = useQuery(
    async () => {
      if (isToday) return generateTodayArticle();
      return getArticleDetail(Number(articleId));
    },
    { ready: !!articleId }
  );

  // 复习模式：获取复习状态
  const { data: reviewStatus } = useQuery(
    async () => getArticleReviewStatus(Number(articleId)),
    {
      ready: isReviewMode && !isToday && !!articleId,
      onSuccess: (data) => {
        if (data.is_in_review) {
          setReviewStage(data.current_stage);
          setReviewCompleted(data.completed || false);
          if (!data.completed) {
            setTimeout(() => setShowPreviewModal(true), 500);
          }
        }
      },
    }
  );

  // 更新学习进度
  const updateProgress = async (articleId: number, progress: number, completed: boolean) => {
    try {
      await updateArticleProgress(articleId, progress, completed);
    } catch {
      // Error handled
    }
  };

  // 处理预览选择
  const handlePreviewConfirm = (assessment: 'clear' | 'fuzzy' | 'forgot') => {
    setPreviewAssessment(assessment);
    setShowPreviewModal(false);
  };

  // 处理练习结果更新
  const handleExerciseUpdate = (correct: number, total: number) => {
    setExerciseResults({ correct, total });
  };

  // 处理复习完成
  const handleReviewComplete = () => {
    setCurrentTime(Date.now());
    setShowCompleteModal(true);
  };

  // 提交复习完成
  const handleSubmitReview = (result: SubmitReviewResponse) => {
    setShowCompleteModal(false);
    if (result.completed) {
      navigate({ to: '/' });
    } else {
      navigate({ to: '/' });
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 md:p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-[var(--primary)]" />
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-4">
            {isToday ? '正在为你量身定制今日文章...' : '正在加载文章...'}
          </h2>

          {isToday && quotes.length > 0 && (
            <div className="mt-6 animate-fade-in">
              <Quote className="h-6 w-6 mx-auto mb-4 text-[var(--primary)] opacity-50" />
              <p className="text-lg text-[var(--text-primary)] mb-2 italic">
                "{quotes[currentQuoteIndex].en}"
              </p>
              <p className="text-[var(--text-secondary)]">
                {quotes[currentQuoteIndex].zh}
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 错误状态
  if (error || !article) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--error-light)] flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😕</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            文章未找到
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            抱歉，您访问的文章不存在或已被删除
          </p>
          <Button onClick={() => navigate({ to: '/' })}>返回首页</Button>
        </Card>
      </div>
    );
  }

  // 根据预览评估决定初始状态
  const getInitialReviewState = () => {
    if (!isReviewMode || !previewAssessment) return {};
    switch (previewAssessment) {
      case 'clear':
        return { defaultShowChinese: false, quickMode: true };
      case 'fuzzy':
        return { defaultShowChinese: true, quickMode: false };
      case 'forgot':
        return { defaultShowChinese: true, quickMode: false };
      default:
        return {};
    }
  };

  const reviewState = getInitialReviewState();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
              返回
            </Button>

            {/* 文章标题（滚动时显示） */}
            <h1 className="hidden md:block text-sm font-medium text-[var(--text-secondary)] truncate max-w-md">
              {article.title}
            </h1>

            {/* 复习模式标识 */}
            {isReviewMode && (
              <span className="px-2 py-1 rounded-full bg-[var(--accent)] text-white text-xs font-bold">
                复习模式
              </span>
            )}
          </div>
        </header>

        {/* 复习进度条 */}
        {isReviewMode && reviewStage && (
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <ReviewProgressBar
              currentStage={reviewStage}
              nextReviewDate={reviewStatus?.next_review_date || null}
              completed={reviewCompleted}
            />
          </div>
        )}

        {/* 文章内容 */}
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <ArticleReader
            article={article}
            isReviewMode={isReviewMode}
            defaultShowChinese={reviewState.defaultShowChinese !== false}
            onProgressUpdate={(progress, completed) => {
              updateProgress(article.id, progress, completed);
            }}
            onExerciseUpdate={handleExerciseUpdate}
            onComplete={isReviewMode ? handleReviewComplete : undefined}
          />
        </main>

        {/* 复习预览弹窗 */}
        {isReviewMode && (
          <ReviewPreviewModal
            open={showPreviewModal}
            articleTitle={article.title}
            onConfirm={handlePreviewConfirm}
            onCancel={() => setShowPreviewModal(false)}
          />
        )}

        {/* 复习完成弹窗 */}
        {isReviewMode && scheduleId && reviewStage && (
          <ReviewCompleteModal
            open={showCompleteModal}
            scheduleId={scheduleId}
            currentStage={reviewStage}
            isQuickMode={reviewState.quickMode || false}
            durationSeconds={durationSeconds}
            correctCount={exerciseResults?.correct}
            totalCount={exerciseResults?.total}
            previewAssessment={previewAssessment}
            onComplete={handleSubmitReview}
            onCancel={() => setShowCompleteModal(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
}

export default ArticlePage;
