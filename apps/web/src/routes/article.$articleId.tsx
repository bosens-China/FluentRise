import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Spin, message, Button, Result, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ArticleReader } from '@/components/article';
import { getArticleDetail, updateArticleProgress, generateTodayArticle } from '@/api/article';
import { systemApi, type Quote } from '@/api/system';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ReviewProgressBar } from '@/components/review/ReviewProgressBar';
import { ReviewPreviewModal } from '@/components/review/ReviewPreviewModal';
import { ReviewCompleteModal } from '@/components/review/ReviewCompleteModal';
import { getArticleReviewStatus, type SubmitReviewResponse } from '@/api/review';

const { Paragraph } = Typography;

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
  const [previewAssessment, setPreviewAssessment] = useState<'clear' | 'fuzzy' | 'forgot' | undefined>();
  const [exerciseResults, setExerciseResults] = useState<{ correct: number; total: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  
  // 使用惰性初始化记录复习开始时间（只在组件挂载时执行一次）
  const [reviewStartTime] = useState<number | null>(() => 
    isReviewMode ? Date.now() : null
  );
  
  // 计算复习用时
  const durationSeconds = useMemo(() => {
    if (!reviewStartTime || !currentTime) return 0;
    return Math.floor((currentTime - reviewStartTime) / 1000);
  }, [currentTime, reviewStartTime]);
  
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // 获取鼓励语录
  useRequest(
    async () => systemApi.getQuotes(10),
    {
      ready: isToday,
      onSuccess: (data) => {
        if (data && data.length > 0) {
          setQuotes(data);
        }
      }
    }
  );

  // 定时切换语录
  useEffect(() => {
    if (quotes.length > 1) {
      const timer = setInterval(() => {
        setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [quotes]);

  // 获取文章详情
  const { data: article, loading, error } = useRequest(
    () => {
      if (isToday) {
        return generateTodayArticle();
      }
      return getArticleDetail(Number(articleId));
    },
    {
      refreshDeps: [articleId, isToday],
      onError: (err) => {
        message.error(isToday ? '生成文章失败，请稍后重试' : '获取文章详情失败');
        console.error(err);
      },
    }
  );

  // 复习模式：获取复习状态
  const { data: reviewStatus } = useRequest(
    () => getArticleReviewStatus(Number(articleId)),
    {
      ready: isReviewMode && !isToday,
      onSuccess: (data) => {
        if (data.is_in_review) {
          setReviewStage(data.current_stage);
          setReviewCompleted(data.completed || false);
          // 显示预览弹窗
          if (!data.completed) {
            setTimeout(() => setShowPreviewModal(true), 500);
          }
        }
      },
    }
  );

  // 更新学习进度
  const { run: updateProgress } = useRequest(
    async (progress: number, completed: boolean) => {
      if (!article) return;
      return updateArticleProgress(article.id, progress, completed);
    },
    {
      manual: true,
      onSuccess: (_result: unknown, [, completed]) => {
         if (completed && !isReviewMode) {
             message.success('恭喜完成今日学习！');
         }
      },
      onError: (error) => {
        message.error(error.message || '保存进度失败');
      }
    }
  );

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
    message.success(result.message);
    
    if (result.completed) {
      // 全部完成，返回首页
      navigate({ to: '/' });
    } else {
      // 还有下一轮，也返回首页
      navigate({ to: '/' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        <div className="flex flex-col items-center bg-white/50 backdrop-blur-xl p-12 rounded-3xl shadow-xl border border-white/60">
          <Spin size="large" className="mb-8 scale-150" />
          
          <h3 className="text-xl font-bold text-indigo-900 mb-6">
            {isToday ? '正在为你量身定制今日文章...' : '正在加载文章...'}
          </h3>

          {isToday && quotes.length > 0 && (
            <div className="mt-4 text-center max-w-lg px-8 min-h-[100px] flex flex-col justify-center animate-fade-in transition-opacity duration-500">
              <Paragraph className="text-lg font-medium text-gray-700 mb-3 italic">
                "{quotes[currentQuoteIndex].en}"
              </Paragraph>
              <Typography.Text className="text-base text-indigo-600/80 font-medium">
                {quotes[currentQuoteIndex].zh}
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        <Result
          status="404"
          title="文章未找到"
          subTitle="抱歉，您访问的文章不存在或已被删除。"
          extra={
            <Button type="primary" onClick={() => navigate({ to: '/' })}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  // 根据预览评估决定初始状态
  const getInitialReviewState = () => {
    if (!isReviewMode || !previewAssessment) return {};
    
    switch (previewAssessment) {
      case 'clear':
        // 记得清楚，默认不显示中文，直接做题
        return { 
          defaultShowChinese: false,
          quickMode: true,
        };
      case 'fuzzy':
        // 有点模糊，显示中文帮助复习
        return { 
          defaultShowChinese: true,
          quickMode: false,
        };
      case 'forgot':
        // 基本忘了，完整重新学习
        return { 
          defaultShowChinese: true,
          quickMode: false,
        };
      default:
        return {};
    }
  };

  const reviewState = getInitialReviewState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate({ to: '/' })}
            className="text-gray-500 hover:text-indigo-600 hover:bg-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm border border-gray-100/50"
          >
            返回首页
          </Button>
        </div>

        {/* 复习进度条 */}
        {isReviewMode && reviewStage && (
          <ReviewProgressBar
            currentStage={reviewStage}
            nextReviewDate={reviewStatus?.next_review_date || null}
            completed={reviewCompleted}
          />
        )}
        
        <ArticleReader
          article={article}
          isReviewMode={isReviewMode}
          defaultShowChinese={reviewState.defaultShowChinese !== false}
          onProgressUpdate={(progress, completed) => {
            updateProgress(progress, completed);
          }}
          onExerciseUpdate={handleExerciseUpdate}
          onComplete={isReviewMode ? handleReviewComplete : undefined}
        />
      </div>

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
  );
}
