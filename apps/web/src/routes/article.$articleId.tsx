import { createFileRoute } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { Spin, message, Button, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ArticleReader } from '@/components/article';
import { getArticleDetail, updateArticleProgress } from '@/api/article';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/article/$articleId')({
  component: ArticlePage,
});

function ArticlePage() {
  const { articleId } = Route.useParams();
  const navigate = useNavigate();

  const { data: article, loading, error } = useRequest(
    () => getArticleDetail(Number(articleId)),
    {
      refreshDeps: [articleId],
      onError: (err) => {
        message.error('获取文章详情失败');
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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
        <Spin size="large" tip="正在加载文章..." />
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
