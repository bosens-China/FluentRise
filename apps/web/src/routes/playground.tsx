import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Card, Empty, Spin } from 'antd';

import { PlaygroundCompleteModal } from '@/components/playground/PlaygroundCompleteModal';
import { PlaygroundInsightsDrawer } from '@/components/playground/PlaygroundInsightsDrawer';
import { PlaygroundPageHeader } from '@/components/playground/PlaygroundPageHeader';
import { PlaygroundQuestionCard } from '@/components/playground/PlaygroundQuestionCard';
import { usePlaygroundGame } from '@/hooks/usePlaygroundGame';
import { usePlaygroundInsights } from '@/hooks/usePlaygroundInsights';
import { isAuthenticated } from '@/utils/request';

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
});

function PlaygroundPage() {
  const navigate = useNavigate();
  const insights = usePlaygroundInsights();
  const game = usePlaygroundGame({
    onPracticeSubmitted: () => {
      if (insights.showInsightsDrawer) {
        void insights.refreshInsights();
      }
    },
  });

  const handleRetry = async () => {
    await game.retryGame();
    if (insights.showInsightsDrawer) {
      await insights.refreshInsights();
    }
  };

  if (game.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#ffffff,_#f7fff1)]">
        <Spin size="large" tip="正在准备今天的训练题目..." />
      </div>
    );
  }

  if (game.isEmpty) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#ffffff,_#f7fff1)] p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <PlaygroundPageHeader
              showProgress={false}
              streak={0}
              onOpenInsights={insights.openInsights}
              onClose={() => navigate({ to: '/' })}
            />
          </div>
          <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有足够内容生成训练题，先去完成几篇课文或复习任务吧。"
            />
          </Card>
        </div>

        <PlaygroundInsightsDrawer
          open={insights.showInsightsDrawer}
          stats={insights.practiceStats}
          history={insights.practiceHistory}
          statsLoading={insights.statsLoading}
          historyLoading={insights.historyLoading}
          hasMore={insights.hasMoreHistory}
          onClose={() => insights.setShowInsightsDrawer(false)}
          onLoadMore={() => void insights.loadMoreHistory()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(88,204,2,0.14),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(28,176,246,0.12),_transparent_18%),linear-gradient(180deg,_#ffffff,_#f7fff1)]">
      <PlaygroundPageHeader
        progress={game.progress}
        currentIndex={game.currentIndex}
        total={game.totalQuestions}
        streak={game.streak}
        durationText={game.durationText}
        onOpenInsights={insights.openInsights}
        onClose={() => navigate({ to: '/' })}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {game.currentQuestion ? (
          <PlaygroundQuestionCard
            question={game.currentQuestion}
            state={game.currentState}
            isPlaying={game.isPlaying}
            onInputChange={game.updateCurrentInput}
            onSubmit={game.handleSubmit}
            onShowAnswer={game.handleShowAnswer}
            onPlayAudio={game.playAudio}
          />
        ) : null}
      </main>

      <PlaygroundCompleteModal
        open={game.showCompleteModal}
        durationText={game.durationText}
        maxStreak={game.maxStreak}
        result={game.submitResult}
        onRetry={() => void handleRetry()}
        onBackHome={() => navigate({ to: '/' })}
      />

      <PlaygroundInsightsDrawer
        open={insights.showInsightsDrawer}
        stats={insights.practiceStats}
        history={insights.practiceHistory}
        statsLoading={insights.statsLoading}
        historyLoading={insights.historyLoading}
        hasMore={insights.hasMoreHistory}
        onClose={() => insights.setShowInsightsDrawer(false)}
        onLoadMore={() => void insights.loadMoreHistory()}
      />
    </div>
  );
}
