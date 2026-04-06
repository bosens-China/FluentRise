import { Alert, Button, Input } from 'antd';
import type { MiniStoryResponse } from '@/api/article';
import { LoadingSpinner } from '@/components/ui';

interface CompletionStoryStepProps {
  storyCompleted: boolean;
  storyPassed: boolean;
  storyAttempts: number;
  storyLoading: boolean;
  miniStory: MiniStoryResponse | undefined;
  storyFeedback: string | null;
  storyAnswers: Record<string, string>;
  setStoryAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  evaluatingStory: boolean;
  evaluateStory: () => void;
}

export function CompletionStoryStep({
  storyCompleted,
  storyPassed,
  storyAttempts,
  storyLoading,
  miniStory,
  storyFeedback,
  storyAnswers,
  setStoryAnswers,
  evaluatingStory,
  evaluateStory,
}: CompletionStoryStepProps) {
  return (
    <div className="space-y-4 pt-2">
      <Alert
        type={storyCompleted ? (storyPassed ? 'success' : 'warning') : 'info'}
        showIcon
        message={storyCompleted ? (storyPassed ? '小故事校验通过 · 100%' : '已完课 (重试耗尽)') : '输出倒逼输入'}
        description={
          storyCompleted
            ? (storyPassed ? '恭喜，你已经完美掌握了今天的课文！' : '已经尽力了，系统会标记这篇文章明天再次学习。')
            : `阅读由今天生词生成的变种小故事，并用英文（或中英夹杂）简单回答问题。核心意思表达准确即可通过。最多重试 3 次。当前尝试：${storyAttempts}/3`
        }
      />
      {storyLoading ? (
        <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
      ) : miniStory ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-amber-50 p-6 text-gray-800 text-lg leading-8 border border-amber-100">
            {miniStory.story_en}
          </div>

          {storyFeedback && (
            <div className={`p-4 rounded-xl text-sm font-medium ${storyPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              老师点评：{storyFeedback}
            </div>
          )}

          <div className="space-y-4">
            {miniStory.questions.map((q, idx) => (
              <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-1 text-xs font-bold tracking-wider text-gray-400">QUESTION {idx + 1}</div>
                <div className="text-base font-semibold text-gray-800 mb-1">{q.question_en}</div>
                <div className="text-sm text-gray-500 mb-4">{q.question_zh}</div>
                <Input.TextArea
                  rows={2}
                  disabled={storyCompleted}
                  placeholder="请用英语简答（即使不完美也没关系）"
                  value={storyAnswers[q.id] || ''}
                  onChange={(e) => setStoryAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>

          {!storyCompleted && (
            <div className="flex justify-end pt-4">
              <Button 
                type="primary" 
                size="large" 
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 border-0" 
                loading={evaluatingStory}
                onClick={evaluateStory}
                disabled={miniStory.questions.some(q => !(storyAnswers[q.id] || '').trim())}
              >
                提交校验
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400">小故事加载失败，请关闭弹窗重试</div>
      )}
    </div>
  );
}
