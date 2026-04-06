import confetti from 'canvas-confetti';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircleOutlined, EditOutlined, ReadOutlined } from '@ant-design/icons';
import { Alert, App, Modal, Tabs } from 'antd';
import { useRequest } from 'ahooks';

import type { Article, ExerciseResultItem } from '@/api/article';
import { generateArticleMiniStory, evaluateArticleMiniStory } from '@/api/article';
import type { SpeechAnalyzeResponse } from '@/api/speech';

import {
  EMPTY_EXERCISES,
  normalizeAnswer,
  type ExerciseSummary,
} from './articleReader.shared';
import { CompletionExerciseStep } from './CompletionExerciseStep';
import { CompletionReadingStep } from './CompletionReadingStep';
import { CompletionStoryStep } from './CompletionStoryStep';

const READING_PASS_SCORE = 65;
const AUTO_CHECK_DELAY_MS = 550;

interface ArticleCompletionModalProps {
  open: boolean;
  article: Article;
  exerciseSummary?: ExerciseSummary;
  exerciseAnswers: Record<number, string>;
  checkedMap: Record<number, boolean>;
  loading?: boolean;
  onClose: () => void;
  onAnswerSelect: (exerciseIndex: number, answer: string) => void;
  onCheckAnswer: (exerciseIndex: number, answerOverride?: string) => void;
  onComplete: (exerciseResults: ExerciseResultItem[], needsRepeat: boolean) => void;
}

type CompletionTabKey = 'exercise' | 'reading' | 'story';

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
  const { message } = App.useApp();
  const [manualActiveTab, setManualActiveTab] = useState<CompletionTabKey | null>(null);
  const [speechResult, setSpeechResult] = useState<SpeechAnalyzeResponse | null>(null);
  
  // Attempts tracking
  const [readingAttempts, setReadingAttempts] = useState(0);
  const [storyAttempts, setStoryAttempts] = useState(0);
  
  // Story state
  const [storyAnswers, setStoryAnswers] = useState<Record<string, string>>({});
  const [storyPassed, setStoryPassed] = useState(false);
  const [storyFeedback, setStoryFeedback] = useState<string | null>(null);

  const hasTriggeredCompleteRef = useRef(false);
  const autoCheckTimersRef = useRef<Record<number, number>>({});

  const exercises = article.exercises ?? EMPTY_EXERCISES;
  const exerciseAnsweredCount = useMemo(() => {
    if (exercises.length === 0) return 0;
    return exercises.filter((_, index) => Boolean(normalizeAnswer(exerciseAnswers[index]))).length;
  }, [exerciseAnswers, exercises]);

  const exercisePassed = useMemo(() => {
    if (exercises.length === 0) return true;
    const correctCount = exerciseSummary?.correct ?? 0;
    const totalCount = exerciseSummary?.total ?? 0;
    return totalCount === exercises.length && correctCount === exercises.length;
  }, [exerciseSummary?.correct, exerciseSummary?.total, exercises.length]);

  const readingPassed = isReadingPassed(speechResult);
  const readingSoftFailed = !readingPassed && readingAttempts >= 3;
  const readingCompleted = readingPassed || readingSoftFailed;

  const storySoftFailed = !storyPassed && storyAttempts >= 3;
  const storyCompleted = storyPassed || storySoftFailed;

  const preferredTab = useMemo<CompletionTabKey>(() => {
    if (!exercisePassed) {
      return 'exercise';
    }
    if (!readingCompleted) {
      return 'reading';
    }
    return 'story';
  }, [exercisePassed, readingCompleted]);

  const activeTab = useMemo<CompletionTabKey>(() => {
    if (!manualActiveTab) {
      return exercises.length > 0 ? 'exercise' : 'reading';
    }
    if (manualActiveTab === 'reading' && !exercisePassed) {
      return preferredTab;
    }
    if (manualActiveTab === 'story' && (!exercisePassed || !readingCompleted)) {
      return preferredTab;
    }
    return manualActiveTab;
  }, [exercisePassed, exercises.length, manualActiveTab, preferredTab, readingCompleted]);

  const exerciseProgressPercent = exercises.length === 0 ? 33 : Math.round((exerciseAnsweredCount / exercises.length) * 33);
  
  let totalProgressPercent = exerciseProgressPercent;
  if (exercisePassed) {
    totalProgressPercent = 33;
    if (readingCompleted) {
      totalProgressPercent = 66;
      if (storyCompleted) {
        totalProgressPercent = 100;
      }
    }
  }

  // Fetch Mini Story
  const { data: miniStory, loading: storyLoading, run: fetchStory } = useRequest(
    () => generateArticleMiniStory(article.id),
    {
      manual: true,
      onError: () => message.error('小故事生成失败，请稍后重试'),
    }
  );

  // Evaluate Mini Story
  const { loading: evaluatingStory, run: evaluateStory } = useRequest(
    async () => {
      if (!miniStory) return;
      return evaluateArticleMiniStory(article.id, {
        story_en: miniStory.story_en,
        questions: miniStory.questions.map(q => ({ id: q.id, question_en: q.question_en })),
        answers: storyAnswers,
      });
    },
    {
      manual: true,
      onSuccess: (data) => {
        setStoryAttempts(prev => prev + 1);
        if (data) {
          setStoryFeedback(data.feedback_zh);
          if (data.is_passed) {
            setStoryPassed(true);
          } else {
            message.warning('还差一点，请根据老师的反馈调整答案。');
          }
        }
      },
      onError: () => message.error('校验失败，请稍后重试'),
    }
  );

  useEffect(() => {
    if (!open || !exercisePassed || !readingCompleted || storyCompleted || miniStory || storyLoading) {
      return;
    }
    void fetchStory();
  }, [exercisePassed, fetchStory, miniStory, open, readingCompleted, storyCompleted, storyLoading]);

  useEffect(() => {
    if (!open || !exercisePassed || !readingCompleted || !storyCompleted || loading || hasTriggeredCompleteRef.current) {
      return;
    }

    hasTriggeredCompleteRef.current = true;
    const needsRepeat = readingSoftFailed || storySoftFailed;
    
    if (!needsRepeat) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#58CC02', '#1CB0F6', '#FF9600'],
      });
    }
    
    onComplete(exerciseSummary?.results ?? [], needsRepeat);
  }, [exercisePassed, readingCompleted, storyCompleted, exerciseSummary?.results, loading, onComplete, open, readingSoftFailed, storySoftFailed]);

  const scheduleFillAutoCheck = (exerciseIndex: number, value: string) => {
    const previousTimer = autoCheckTimersRef.current[exerciseIndex];
    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }
    if (!normalizeAnswer(value)) {
      return;
    }
    autoCheckTimersRef.current[exerciseIndex] = window.setTimeout(() => {
      onCheckAnswer(exerciseIndex, value);
      delete autoCheckTimersRef.current[exerciseIndex];
    }, AUTO_CHECK_DELAY_MS);
  };

  const handleSpeechResult = (result: SpeechAnalyzeResponse | null) => {
    setSpeechResult(result);
    if (result) {
      setReadingAttempts(prev => prev + 1);
    }
  };

  const handleAfterOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setManualActiveTab(exercises.length > 0 ? 'exercise' : 'reading');
      return;
    }

    setManualActiveTab(null);
    setSpeechResult(null);
    setReadingAttempts(0);
    setStoryAttempts(0);
    setStoryAnswers({});
    setStoryPassed(false);
    setStoryFeedback(null);
    hasTriggeredCompleteRef.current = false;
    Object.values(autoCheckTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
    autoCheckTimersRef.current = {};
  };

  const handleTabChange = (value: string) => {
    const nextTab = value as CompletionTabKey;
    setManualActiveTab(nextTab);
    if (nextTab === 'story' && !miniStory && !storyLoading) {
      void fetchStory();
    }
  };

  return (
    <Modal
      open={open}
      width={920}
      centered
      destroyOnClose
      maskClosable={false}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      title="完成本课"
      footer={null}
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingRight: 12 } }}
    >
      <div className="space-y-5">
        <Alert
          type="info"
          showIcon
          message="完成规则"
          description={`分为三个阶段：课后练习、朗读校验、故事概述。当前完成度 ${totalProgressPercent}%。`}
        />

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
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
                <CompletionExerciseStep
                  exercises={exercises}
                  exerciseAnswers={exerciseAnswers}
                  checkedMap={checkedMap}
                  exercisePassed={exercisePassed}
                  exerciseProgressPercent={exerciseProgressPercent}
                  onAnswerSelect={onAnswerSelect}
                  onCheckAnswer={onCheckAnswer}
                  scheduleFillAutoCheck={scheduleFillAutoCheck}
                />
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
                <CompletionReadingStep
                  article={article}
                  readingCompleted={readingCompleted}
                  readingPassed={readingPassed}
                  readingAttempts={readingAttempts}
                  handleSpeechResult={handleSpeechResult}
                />
              ),
            },
            {
              key: 'story',
              disabled: !exercisePassed || !readingCompleted,
              label: (
                <span className="flex items-center gap-2">
                  <EditOutlined />
                  3. 故事概述
                </span>
              ),
              children: (
                <CompletionStoryStep
                  storyCompleted={storyCompleted}
                  storyPassed={storyPassed}
                  storyAttempts={storyAttempts}
                  storyLoading={storyLoading}
                  miniStory={miniStory}
                  storyFeedback={storyFeedback}
                  storyAnswers={storyAnswers}
                  setStoryAnswers={setStoryAnswers}
                  evaluatingStory={evaluatingStory}
                  evaluateStory={evaluateStory}
                />
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
}
