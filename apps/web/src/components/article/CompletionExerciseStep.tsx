import { Input, Radio, Space, Tag, Typography } from 'antd';
import type { Exercise } from '@/api/article';
import { Card } from '@/components/ui';
import { normalizeAnswer } from './articleReader.shared';

const { Paragraph, Title } = Typography;

interface CompletionExerciseStepProps {
  exercises: Exercise[];
  exerciseAnswers: Record<number, string>;
  checkedMap: Record<number, boolean>;
  exercisePassed: boolean;
  exerciseProgressPercent: number;
  onAnswerSelect: (exerciseIndex: number, answer: string) => void;
  onCheckAnswer: (exerciseIndex: number, answerOverride?: string) => void;
  scheduleFillAutoCheck: (exerciseIndex: number, value: string) => void;
}

export function CompletionExerciseStep({
  exercises,
  exerciseAnswers,
  checkedMap,
  exercisePassed,
  exerciseProgressPercent,
  onAnswerSelect,
  onCheckAnswer,
  scheduleFillAutoCheck,
}: CompletionExerciseStepProps) {
  return (
    <div className="space-y-4 pt-2">
      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Title level={4} className="!mb-2 !text-gray-800">先完成当前课后练习</Title>
            <Paragraph className="!mb-0 text-gray-600">
              选择题会自动校验，填空题在你停顿后自动校验。答错可以继续改，全部通过后会自动进入朗读模块。
            </Paragraph>
          </div>
          <Tag color={exercisePassed ? 'success' : 'processing'} className="m-0 rounded-full px-4 py-1 text-sm">
            {exercisePassed ? '已通过 · 33%' : `进行中 · ${exerciseProgressPercent}%`}
          </Tag>
        </div>
      </Card>

      {exercises.length > 0 ? (
        exercises.map((exercise, index) => {
          const isChecked = checkedMap[index];
          const currentAnswer = exerciseAnswers[index] || '';
          const isCorrect = normalizeAnswer(currentAnswer) === normalizeAnswer(exercise.answer);
          const isLocked = isChecked && isCorrect;

          return (
            <div
              key={`${exercise.question}-${index}`}
              className={`rounded-2xl border p-6 ${
                !isChecked
                  ? 'border-slate-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)]'
                  : isCorrect
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="mb-3 text-xs font-bold tracking-[0.16em] text-gray-400">
                QUESTION {index + 1}
              </div>
              <Paragraph className="text-lg font-medium text-gray-800">
                {exercise.question}
              </Paragraph>

              {exercise.type === 'choice' && exercise.options ? (
                <Radio.Group
                  value={currentAnswer}
                  onChange={(e) => {
                    const val = String(e.target.value);
                    onAnswerSelect(index, val);
                    onCheckAnswer(index, val);
                  }}
                  className="w-full"
                >
                  <Space direction="vertical" className="w-full">
                    {exercise.options.map((option) => (
                      <Radio key={option} value={option} disabled={isLocked} className="m-0 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                        {option}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              ) : null}

              {exercise.type === 'fill' ? (
                <Input
                  value={currentAnswer}
                  disabled={isLocked}
                  onChange={(e) => {
                    const val = e.target.value;
                    onAnswerSelect(index, val);
                    scheduleFillAutoCheck(index, val);
                  }}
                  onPressEnter={() => {
                    if (normalizeAnswer(currentAnswer)) {
                      onCheckAnswer(index, currentAnswer);
                    }
                  }}
                  onBlur={() => {
                    if (normalizeAnswer(currentAnswer)) {
                      onCheckAnswer(index, currentAnswer);
                    }
                  }}
                  placeholder="请输入答案"
                  className="rounded-xl"
                />
              ) : null}

              {isChecked && normalizeAnswer(currentAnswer) ? (
                <div
                  className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
                    isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isCorrect ? '回答正确，做得很好。' : `还差一点，正确答案是：${exercise.answer || ''}`}
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-gray-400">
          这篇文章暂时没有练习题，可直接进入下一步。
        </div>
      )}
    </div>
  );
}
