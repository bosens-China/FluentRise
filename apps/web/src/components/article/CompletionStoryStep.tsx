import type { Dispatch, SetStateAction } from 'react';
import { Alert, Button, Input } from 'antd';

import type { MiniStoryResponse } from '@/api/article';
import { LoadingSpinner } from '@/components/ui';

interface CompletionStoryStepProps {
  storyCompleted: boolean;
  storyPassed: boolean;
  storyAttempts: number;
  maxAttempts: number;
  storyLoading: boolean;
  miniStory: MiniStoryResponse | undefined;
  storyFeedback: string | null;
  storyAnswers: Record<string, string>;
  setStoryAnswers: Dispatch<SetStateAction<Record<string, string>>>;
  evaluatingStory: boolean;
  evaluateStory: () => void;
}

export function CompletionStoryStep({
  storyCompleted,
  storyPassed,
  storyAttempts,
  maxAttempts,
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
        message={
          storyCompleted
            ? storyPassed
              ? '小故事校验通过 · 100%'
              : '已完成（重试耗尽）'
            : '输出倒逼输入'
        }
        description={
          storyCompleted
            ? storyPassed
              ? '恭喜，你已经比较完整地掌握了今天的课文。'
              : '已经尽力了，系统会标记这篇文章明天再次学习。'
            : `阅读由今天生词生成的变种小故事，并用英文或中英夹杂简单回答问题。核心意思表达准确即可通过。最多重试 ${maxAttempts} 次。当前尝试：${storyAttempts}/${maxAttempts}`
        }
      />
      {storyLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      ) : miniStory ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-lg leading-8 text-gray-800">
            {miniStory.story_en}
          </div>

          {storyFeedback ? (
            <div
              className={`rounded-xl p-4 text-sm font-medium ${
                storyPassed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              老师点评：{storyFeedback}
            </div>
          ) : null}

          <div className="space-y-4">
            {miniStory.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-1 text-xs font-bold tracking-wider text-gray-400">
                  QUESTION {index + 1}
                </div>
                <div className="mb-1 text-base font-semibold text-gray-800">
                  {question.question_en}
                </div>
                <div className="mb-4 text-sm text-gray-500">
                  {question.question_zh}
                </div>
                <Input.TextArea
                  rows={2}
                  disabled={storyCompleted}
                  placeholder="请用英语简答，即使不完美也没关系"
                  value={storyAnswers[question.id] || ''}
                  onChange={(event) => {
                    setStoryAnswers((previous) => ({
                      ...previous,
                      [question.id]: event.target.value,
                    }));
                  }}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>

          {!storyCompleted ? (
            <div className="flex justify-end pt-4">
              <Button
                type="primary"
                size="large"
                className="rounded-xl border-0 bg-gradient-to-r from-amber-500 to-orange-500"
                loading={evaluatingStory}
                onClick={evaluateStory}
                disabled={miniStory.questions.some(
                  (question) => !(storyAnswers[question.id] || '').trim(),
                )}
              >
                提交校验
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="py-10 text-center text-gray-400">
          小故事加载失败，请关闭弹窗后重试
        </div>
      )}
    </div>
  );
}
