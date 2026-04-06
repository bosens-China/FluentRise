import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRequest } from 'ahooks';

import {
  getPlaygroundQuestions,
  submitPracticeResult,
  type SubmitAnswerItem,
} from '@/api/playground';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import {
  createInitialGameState,
  formatDurationText,
  normalizeAnswer,
  type GameState,
  type PlaygroundSubmitResult,
} from '@/lib/playground';
import { toast } from '@/lib/toast';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface UsePlaygroundGameOptions {
  onPracticeSubmitted?: () => void;
}

const PREPARE_AUDIO_DELAY = 450;

export function usePlaygroundGame(options: UsePlaygroundGameOptions = {}) {
  const { onPracticeSubmitted } = options;
  const { data: systemConfig } = useSystemConfig();
  const {
    play: playAudioFile,
    stop: stopAudioPlayback,
    isPlaying: isAudioPlaying,
  } = useAudioPlayer();
  const timeoutIdsRef = useRef<number[]>([]);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isSpeakingFallback, setIsSpeakingFallback] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<PlaygroundSubmitResult | null>(null);
  const [gameState, setGameState] = useState(createInitialGameState);
  const maxAttempts = systemConfig?.playground.max_attempts ?? 3;

  const currentQuestion = gameState.questions[gameState.currentIndex];
  const currentState = currentQuestion
    ? gameState.questionStates.get(currentQuestion.id)
    : undefined;

  const durationSeconds = useMemo(
    () => Math.floor((currentTime - startTime) / 1000),
    [currentTime, startTime],
  );

  const clearPendingTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) =>
      window.clearTimeout(timeoutId),
    );
    timeoutIdsRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (id) => id !== timeoutId,
      );
      callback();
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    return () => {
      clearPendingTimeouts();
      stopAudioPlayback();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearPendingTimeouts, stopAudioPlayback]);

  const questionsRequest = useRequest(getPlaygroundQuestions, {
    onSuccess: (data) => {
      setGameState(createInitialGameState(data.questions));
      setStartTime(Date.now());
      setCurrentTime(Date.now());
    },
    onError: (error) => {
      toast.error(error.message || '训练题目加载失败');
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
      onPracticeSubmitted?.();
    },
    onError: (error) => {
      toast.error(error.message || '训练结果提交失败');
    },
  });

  const progress = useMemo(() => {
    if (gameState.questions.length === 0) {
      return 0;
    }
    return Math.round(
      (gameState.currentIndex / gameState.questions.length) * 100,
    );
  }, [gameState.currentIndex, gameState.questions.length]);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingFallback(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.86;
    utterance.onend = () => setIsSpeakingFallback(false);
    utterance.onerror = () => setIsSpeakingFallback(false);
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

      void playAudioFile(url, {
        onError: () => {
          if (fallbackText) {
            speakText(fallbackText);
          }
        },
      });
    },
    [playAudioFile, speakText],
  );

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }

    const audioUrl =
      ['fill_blank', 'context_cloze', 'sentence_dictation'].includes(
        currentQuestion.type,
      ) && currentQuestion.sentence_audio_url
        ? currentQuestion.sentence_audio_url
        : currentQuestion.word_audio_url;

    const fallbackText = [
      'fill_blank',
      'context_cloze',
      'sentence_dictation',
    ].includes(currentQuestion.type)
      ? currentQuestion.sentence || currentQuestion.word
      : currentQuestion.word;

    schedule(() => {
      playAudio(audioUrl, fallbackText);
    }, PREPARE_AUDIO_DELAY);

    return clearPendingTimeouts;
  }, [clearPendingTimeouts, currentQuestion, playAudio, schedule]);

  const submitOrAdvance = useCallback(
    (nextGameState: GameState) => {
      if (nextGameState.currentIndex >= nextGameState.questions.length - 1) {
        const answers: SubmitAnswerItem[] = nextGameState.questions.map(
          (question) => {
            const questionState = nextGameState.questionStates.get(question.id);
            return {
              question_id: question.id,
              question_type: question.type,
              word: question.word,
              meaning: question.meaning,
              uk_phonetic: question.uk_phonetic,
              us_phonetic: question.us_phonetic,
              sentence: question.sentence,
              sentence_translation: question.sentence_translation,
              user_answer: questionState?.currentInput,
              is_correct: questionState?.isCorrect === true,
              attempts: questionState?.attempts || 1,
              showed_answer: questionState?.showedAnswer || false,
            };
          },
        );

        void submitRequest.run({
          answers,
          duration_seconds: durationSeconds,
          max_streak: nextGameState.maxStreak,
        });
        return;
      }

      startTransition(() => {
        setGameState({
          ...nextGameState,
          currentIndex: nextGameState.currentIndex + 1,
        });
      });
    },
    [durationSeconds, submitRequest],
  );

  const updateCurrentInput = useCallback(
    (value: string) => {
      if (!currentQuestion || !currentState) {
        return;
      }

      const nextQuestionStates = new Map(gameState.questionStates);
      nextQuestionStates.set(currentQuestion.id, {
        ...currentState,
        currentInput: value,
      });

      setGameState((previous) => ({
        ...previous,
        questionStates: nextQuestionStates,
      }));
    },
    [currentQuestion, currentState, gameState.questionStates],
  );

  const handleSubmit = useCallback(() => {
    if (!currentQuestion || !currentState) {
      return;
    }

    const isCorrect =
      normalizeAnswer(currentState.currentInput, currentQuestion.type) ===
      normalizeAnswer(currentQuestion.word, currentQuestion.type);
    const attempts = currentState.attempts + 1;
    const nextQuestionStates = new Map(gameState.questionStates);
    nextQuestionStates.set(currentQuestion.id, {
      ...currentState,
      attempts,
      isCorrect,
      showedAnswer: !isCorrect && attempts >= maxAttempts,
    });

    const nextGameState: GameState = {
      ...gameState,
      questionStates: nextQuestionStates,
      streak: isCorrect ? gameState.streak + 1 : 0,
      maxStreak: isCorrect
        ? Math.max(gameState.maxStreak, gameState.streak + 1)
        : gameState.maxStreak,
    };

    setGameState(nextGameState);

    if (isCorrect || attempts >= maxAttempts) {
      schedule(() => submitOrAdvance(nextGameState), isCorrect ? 700 : 1400);
    }
  }, [currentQuestion, currentState, gameState, maxAttempts, schedule, submitOrAdvance]);

  const handleShowAnswer = useCallback(() => {
    if (!currentQuestion || !currentState) {
      return;
    }

    const nextQuestionStates = new Map(gameState.questionStates);
    nextQuestionStates.set(currentQuestion.id, {
      ...currentState,
      showedAnswer: true,
      isCorrect: false,
    });

    const nextGameState: GameState = {
      ...gameState,
      questionStates: nextQuestionStates,
      streak: 0,
    };

    setGameState(nextGameState);
    schedule(() => submitOrAdvance(nextGameState), 1500);
  }, [currentQuestion, currentState, gameState, schedule, submitOrAdvance]);

  const retryGame = useCallback(async () => {
    clearPendingTimeouts();
    setShowCompleteModal(false);
    setSubmitResult(null);
    setGameState(createInitialGameState());
    setStartTime(Date.now());
    setCurrentTime(Date.now());
    await questionsRequest.refreshAsync();
  }, [clearPendingTimeouts, questionsRequest]);

  return {
    currentQuestion: currentQuestion ?? null,
    currentState,
    currentIndex: gameState.currentIndex + 1,
    totalQuestions: gameState.questions.length,
    streak: gameState.streak,
    maxStreak: gameState.maxStreak,
    progress,
    durationText: formatDurationText(durationSeconds),
    isLoading: questionsRequest.loading && gameState.questions.length === 0,
    isEmpty: !questionsRequest.loading && gameState.questions.length === 0,
    isPlaying: isAudioPlaying || isSpeakingFallback,
    showCompleteModal,
    submitResult,
    updateCurrentInput,
    handleSubmit,
    handleShowAnswer,
    playAudio,
    retryGame,
    closeCompleteModal: () => setShowCompleteModal(false),
  };
}
