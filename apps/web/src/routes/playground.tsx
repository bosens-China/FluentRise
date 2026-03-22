import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import {
  ClockCircleOutlined,
  CloseOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Progress, Spin, Typography, message } from 'antd';

import {
  getPlaygroundQuestions,
  submitPracticeResult,
  type Question,
  type QuestionType,
  type SubmitAnswerItem,
} from '@/api/playground';
import { PlaygroundCompleteModal } from '@/components/playground/PlaygroundCompleteModal';
import {
  PlaygroundQuestionCard,
  type QuestionState,
} from '@/components/playground/PlaygroundQuestionCard';
import { isAuthenticated } from '@/utils/request';

const { Text, Title } = Typography;

interface GameState {
  questions: Question[];
  currentIndex: number;
  questionStates: Map<string, QuestionState>;
  streak: number;
  maxStreak: number;
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    total: number;
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    encouragement_zh: string;
    encouragement_en: string;
  } | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    questions: [],
    currentIndex: 0,
    questionStates: new Map(),
    streak: 0,
    maxStreak: 0,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentQuestion = gameState.questions[gameState.currentIndex];
  const currentState = currentQuestion ? gameState.questionStates.get(currentQuestion.id) : undefined;

  const questionRequest = useRequest(getPlaygroundQuestions, {
    onSuccess: (data) => {
      const states = new Map<string, QuestionState>();
      data.questions.forEach((item) => {
        states.set(item.id, {
          currentInput: '',
          attempts: 0,
          isCorrect: null,
          showedAnswer: false,
        });
      });

      setGameState({
        questions: data.questions,
        currentIndex: 0,
        questionStates: states,
        streak: 0,
        maxStreak: 0,
      });
      setStartTime(Date.now());
      setCurrentTime(Date.now());
    },
    onError: (error) => {
      message.error(error.message || '游乐园题目加载失败');
    },
  });

  const submitRequest = useRequest(submitPracticeResult, {
    manual: true,
    onSuccess: (data) => {
      setSubmitResult({
        total: data.total,
        correct: data.correct,
        wrong: data.wrong,
        skipped: data.skipped,
        accuracy: data.accuracy,
        encouragement_zh: data.encouragement_zh,
        encouragement_en: data.encouragement_en,
      });
      setShowCompleteModal(true);
    },
    onError: (error) => {
      message.error(error.message || '练习结果提交失败');
    },
  });

  const progress = useMemo(() => {
    if (gameState.questions.length === 0) {
      return 0;
    }
    return Math.round((gameState.currentIndex / gameState.questions.length) * 100);
  }, [gameState.currentIndex, gameState.questions.length]);

  const durationSeconds = useMemo(() => Math.floor((currentTime - startTime) / 1000), [currentTime, startTime]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${restSeconds.toString().padStart(2, '0')}`;
  };

  const questionTypeLabelMap: Record<QuestionType, string> = {
    audio: '听音写词',
    meaning: '释义写词',
    fill_blank: '句子填空',
    context_cloze: '提示词填空',
    sentence_dictation: '短句默写',
  };

  const normalizeAnswer = (value: string, type: QuestionType) => {
    const base = value.trim().toLowerCase();
    if (type === 'sentence_dictation') {
      return base.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    }
    return base.replace(/\s+/g, ' ');
  };

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }
    setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.86;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const playAudio = useCallback(
    (url: string | undefined, fallbackText?: string) => {
      if (!url) {
        if (fallbackText) {
          speakText(fallbackText);
        }
        return;
      }

      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        if (fallbackText) {
          speakText(fallbackText);
        }
      };
      void audio.play().catch(() => {
        setIsPlaying(false);
        if (fallbackText) {
          speakText(fallbackText);
        }
      });
    },
    [speakText],
  );

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (
        ['fill_blank', 'context_cloze', 'sentence_dictation'].includes(currentQuestion.type) &&
        currentQuestion.sentence_audio_url
      ) {
        playAudio(currentQuestion.sentence_audio_url, currentQuestion.sentence || currentQuestion.word);
      } else {
        playAudio(currentQuestion.word_audio_url, currentQuestion.word);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [currentQuestion, playAudio]);

  const handleNext = () => {
    if (gameState.currentIndex >= gameState.questions.length - 1) {
      const answers: SubmitAnswerItem[] = gameState.questions.map((item) => {
        const state = gameState.questionStates.get(item.id);
        return {
          question_id: item.id,
          question_type: item.type,
          word: item.word,
          meaning: item.meaning,
          uk_phonetic: item.uk_phonetic,
          us_phonetic: item.us_phonetic,
          sentence: item.sentence,
          sentence_translation: item.sentence_translation,
          user_answer: state?.currentInput,
          is_correct: state?.isCorrect === true,
          attempts: state?.attempts || 1,
          showed_answer: state?.showedAnswer || false,
        };
      });

      void submitRequest.run({
        answers,
        duration_seconds: durationSeconds,
        max_streak: gameState.maxStreak,
      });
      return;
    }

    setGameState((previous) => ({ ...previous, currentIndex: previous.currentIndex + 1 }));
  };

  const handleSubmit = () => {
    if (!currentQuestion || !currentState) {
      return;
    }

    const isCorrect =
      normalizeAnswer(currentState.currentInput, currentQuestion.type) ===
      normalizeAnswer(currentQuestion.word, currentQuestion.type);
    const nextAttempts = currentState.attempts + 1;
    const nextStates = new Map(gameState.questionStates);
    nextStates.set(currentQuestion.id, {
      ...currentState,
      attempts: nextAttempts,
      isCorrect,
      showedAnswer: !isCorrect && nextAttempts >= 3,
    });

    setGameState((previous) => ({
      ...previous,
      questionStates: nextStates,
      streak: isCorrect ? previous.streak + 1 : 0,
      maxStreak: isCorrect ? Math.max(previous.maxStreak, previous.streak + 1) : previous.maxStreak,
    }));

    window.setTimeout(() => {
      if (isCorrect || nextAttempts >= 3) {
        handleNext();
      }
    }, isCorrect ? 700 : nextAttempts >= 3 ? 1400 : 0);
  };

  const handleShowAnswer = () => {
    if (!currentQuestion || !currentState) {
      return;
    }

    const nextStates = new Map(gameState.questionStates);
    nextStates.set(currentQuestion.id, {
      ...currentState,
      showedAnswer: true,
      isCorrect: false,
    });

    setGameState((previous) => ({ ...previous, questionStates: nextStates, streak: 0 }));
    window.setTimeout(() => handleNext(), 1500);
  };

  const updateCurrentInput = (value: string) => {
    if (!currentQuestion || !currentState) {
      return;
    }
    const nextStates = new Map(gameState.questionStates);
    nextStates.set(currentQuestion.id, {
      ...currentState,
      currentInput: value,
    });
    setGameState((previous) => ({ ...previous, questionStates: nextStates }));
  };

  if (questionRequest.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffdf7,_#fff8ef)]">
        <Spin size="large" tip="正在准备今天的游乐园题目..." />
      </div>
    );
  }

  if (!questionRequest.loading && gameState.questions.length === 0) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#fffdf7,_#fff8ef)] p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center justify-between">
            <Title level={2} className="!mb-0 !font-black !text-gray-800">
              游乐园
            </Title>
            <Button icon={<CloseOutlined />} onClick={() => navigate({ to: '/' })} />
          </div>
          <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <Empty description="还没有足够的内容生成游乐园题目，先完成几篇课文吧。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf8,_#fff8ef)]">
      <header className="sticky top-0 z-30 bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">游乐园</span>
            <span className="font-black text-gray-800">今天的训练场</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2 sm:flex">
              <Progress percent={progress} showInfo={false} className="w-36" strokeColor="#f59e0b" />
              <Text className="text-sm text-gray-500">
                {gameState.currentIndex + 1}/{gameState.questions.length}
              </Text>
            </div>
            {gameState.streak > 0 ? (
              <div className="flex items-center gap-1 font-bold text-orange-500">
                <FireOutlined />
                {gameState.streak}
              </div>
            ) : null}
            <div className="flex items-center gap-1 text-gray-500">
              <ClockCircleOutlined />
              <span className="font-mono">{formatTime(durationSeconds)}</span>
            </div>
            <Button icon={<CloseOutlined />} onClick={() => navigate({ to: '/' })} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {currentQuestion ? (
          <PlaygroundQuestionCard
            question={currentQuestion}
            state={currentState}
            isPlaying={isPlaying}
            questionTypeLabelMap={questionTypeLabelMap}
            onInputChange={updateCurrentInput}
            onSubmit={handleSubmit}
            onShowAnswer={handleShowAnswer}
            onPlayAudio={playAudio}
          />
        ) : null}
      </main>

      <PlaygroundCompleteModal
        open={showCompleteModal}
        durationText={formatTime(durationSeconds)}
        maxStreak={gameState.maxStreak}
        result={submitResult}
        onRetry={() => {
          setShowCompleteModal(false);
          setSubmitResult(null);
          void questionRequest.refresh();
        }}
        onBackHome={() => navigate({ to: '/' })}
      />
    </div>
  );
}
