import { createFileRoute } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Spin, message, Button, Result, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ArticleReader } from '@/components/article';
import { getArticleDetail, updateArticleProgress, generateTodayArticle } from '@/api/article';
import { systemApi, type Quote } from '@/api/system';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const { Text, Paragraph } = Typography;

export const Route = createFileRoute('/article/$articleId')({
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();
  const isToday = articleId === 'today';

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

  const { run: updateProgress } = useRequest(
    async (progress: number, completed: boolean) => {
      if (!article) return;
      return updateArticleProgress(article.id, progress, completed);
    },
    {
      manual: true,
      onSuccess: (_result: unknown, [, completed]) => {
         if (completed) {
             message.success('恭喜完成今日学习！');
         }
      }
    }
  );

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
              <Text className="text-base text-indigo-600/80 font-medium">
                {quotes[currentQuoteIndex].zh}
              </Text>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
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
        
        <ArticleReader
          article={article}
          onProgressUpdate={(progress, completed) => {
            updateProgress(progress, completed);
          }}
        />
      </div>
    </div>
  );
}
