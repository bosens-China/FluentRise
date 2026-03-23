import type { RadioChangeEvent } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircleOutlined, ReadOutlined } from '@ant-design/icons';
import {
  Alert,
  Button as AntButton,
  Input,
  Modal,
  Radio,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';

import type { Article, ExerciseResultItem } from '@/api/article';
import type { SpeechAnalyzeResponse } from '@/api/speech';
import { Card } from '@/components/ui';

import {
  EMPTY_EXERCISES,
  normalizeAnswer,
  type ExerciseSummary,
} from './articleReader.shared';
import { SpeechPracticePanel } from './SpeechPracticePanel';

const { Paragraph, Title } = Typography;

const READING_PASS_SCORE = 65;

interface ArticleCompletionModalProps {
  open: boolean;
  article: Article;
  exerciseSummary?: ExerciseSummary;
  exerciseAnswers: Record<number, string>;
  checkedMap: Record<number, boolean>;
  loading?: boolean;
  onClose: () => void;
  onAnswerSelect: (exerciseIndex: number, answer: string) => void;
  onCheckAnswer: (exerciseIndex: number) => void;
  onComplete: (exerciseResults: ExerciseResultItem[]) => void;
}

function isReadingPassed(result: SpeechAnalyzeResponse | null): boolean {
  if (!result) {
    return false;
  }

  return (
    result.confidence_level !== 'low' &&
    (result.similarity_score ?? 0) >= READING_PASS_SCORE
  );
}

export function ArticleCompletionModal({
  open,
  article,
  exerciseSummary,
  exerciseAnswers,
  checkedMap,
  loading = false,
  onClose,
  onAnswerSelect,
  onCheckAnswer,
  onComplete,
}: ArticleCompletionModalProps) {
  const [activeTab, setActiveTab] = useState<'exercise' | 'reading'>(
    'exercise',
  );
  const [speechResult, setSpeechResult] =
    useState<SpeechAnalyzeResponse | null>(null);
  const hasTriggeredCompleteRef = useRef(false);

  const exercises = article.exercises ?? EMPTY_EXERCISES;
  const exercisePassed = useMemo(() => {
    if (exercises.length === 0) {
      return true;
    }
    const correctCount = exerciseSummary?.correct ?? 0;
    const totalCount = exerciseSummary?.total ?? 0;
    return totalCount === exercises.length && correctCount === exercises.length;
  }, [exerciseSummary?.correct, exerciseSummary?.total, exercises.length]);

  const readingPassed = isReadingPassed(speechResult);

  useEffect(() => {
    if (!open) {
      setActiveTab(exercises.length > 0 ? 'exercise' : 'reading');
      setSpeechResult(null);
      hasTriggeredCompleteRef.current = false;
      return;
    }

    if (exercisePassed) {
      setActiveTab('reading');
    }
  }, [exercisePassed, exercises.length, open]);

  useEffect(() => {
    if (
      !open ||
      !exercisePassed ||
      !readingPassed ||
      loading ||
      hasTriggeredCompleteRef.current
    ) {
      return;
    }

    hasTriggeredCompleteRef.current = true;
    onComplete(exerciseSummary?.results ?? []);
  }, [
    exercisePassed,
    exerciseSummary?.results,
    loading,
    onComplete,
    open,
    readingPassed,
  ]);

  return (
    <Modal
      open={open}
      width={920}
      centered
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      title="完成本课"
      footer={null}
    >
      <div className="space-y-5">
        <Alert
          type="info"
          showIcon
          message="完成规则"
          description="先做练习，练习全部通过后再进入朗读模块。朗读校验通过后，会自动完成本课。"
        />

        <Tabs
          activeKey={activeTab}
          onChange={(value) => setActiveTab(value as 'exercise' | 'reading')}
          items={[
            {
              key: 'exercise',
              label: (
                <span className="flex items-center gap-2">
                  <CheckCircleOutlined />
                  1. 练习
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <Card className="p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div>
                        <Title level={4} className="!mb-2 !text-gray-800">
                          先完成当前课后练习
                        </Title>
                        <Paragraph className="!mb-0 text-gray-600">
                          练习全部答对后，系统会自动带你进入朗读模块。
                        </Paragraph>
                      </div>
                      <Tag
                        color={exercisePassed ? 'success' : 'processing'}
                        className="m-0 rounded-full px-4 py-1 text-sm"
                      >
                        {exercisePassed ? '已通过' : '待完成'}
                      </Tag>
                    </div>
                  </Card>

                  {exercises.length > 0 ? (
                    exercises.map((exercise, index) => {
                      const isChecked = checkedMap[index];
                      const currentAnswer = exerciseAnswers[index] || '';
                      const isCorrect =
                        normalizeAnswer(currentAnswer) ===
                        normalizeAnswer(exercise.answer);

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
                              onChange={(event: RadioChangeEvent) =>
                                onAnswerSelect(index, event.target.value)
                              }
                              className="w-full"
                            >
                              <Space direction="vertical" className="w-full">
                                {exercise.options.map((option) => (
                                  <Radio
                                    key={option}
                                    value={option}
                                    disabled={isChecked}
                                    className="m-0 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                                  >
                                    {option}
                                  </Radio>
                                ))}
                              </Space>
                            </Radio.Group>
                          ) : null}

                          {exercise.type === 'fill' ? (
                            <Input
                              value={currentAnswer}
                              disabled={isChecked}
                              onChange={(event) =>
                                onAnswerSelect(index, event.target.value)
                              }
                              placeholder="请输入答案"
                              className="rounded-xl"
                            />
                          ) : null}

                          {!isChecked ? (
                            <AntButton
                              type="primary"
                              shape="round"
                              size="large"
                              className="mt-5 border-0 bg-gradient-to-r from-amber-500 to-orange-500"
                              disabled={!currentAnswer}
                              onClick={() => onCheckAnswer(index)}
                            >
                              检查答案
                            </AntButton>
                          ) : (
                            <div
                              className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isCorrect
                                ? '回答正确，做得很好。'
                                : `正确答案：${exercise.answer || ''}`}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-gray-400">
                      这篇文章暂时没有练习题，可直接进入朗读模块。
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'reading',
              disabled: !exercisePassed,
              label: (
                <span className="flex items-center gap-2">
                  <ReadOutlined />
                  2. 朗读
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <Alert
                    type={readingPassed ? 'success' : 'warning'}
                    showIcon
                    message={readingPassed ? '朗读已通过' : '朗读通过线'}
                    description={
                      readingPassed
                        ? '朗读校验已通过，系统正在为你完成本课。'
                        : `建议至少达到 ${READING_PASS_SCORE}% 内容覆盖度，且识别稳定度不能为“偏低”。`
                    }
                  />
                  <SpeechPracticePanel
                    article={article}
                    variant="completion"
                    onResultChange={setSpeechResult}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}
