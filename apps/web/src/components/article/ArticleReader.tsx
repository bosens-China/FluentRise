import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormOutlined, MessageOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Col, Row, message } from 'antd';

import type { SentenceBreakdownResponse } from '@/api/aiChat';
import { getSentenceBreakdown } from '@/api/aiChat';
import type {
  Article,
  ArticleAudioTimelineResponse,
  ExerciseResultItem,
} from '@/api/article';
import { getArticleAudioTimeline } from '@/api/article';
import { getNotes, type Note } from '@/api/note';

import { ArticleAIChatDrawer } from './ArticleAIChatDrawer';
import { ArticleCompletionModal } from './ArticleCompletionModal';
import { ArticleReaderHeader } from './ArticleReaderHeader';
import { ArticleReadingPane } from './ArticleReadingPane';
import { ArticleStudyTabs } from './ArticleStudyTabs';
import { SentenceBreakdownDrawer } from './SentenceBreakdownDrawer';
import {
  EMPTY_EXERCISES,
  normalizeAnswer,
  type ExerciseSummary,
} from './articleReader.shared';

const NoteEditor = lazy(async () => {
  const module = await import('@/components/note/NoteEditor');
  return { default: module.NoteEditor };
});

interface ArticleReaderProps {
  article: Article;
  onProgressUpdate?: (
    progress: number,
    completed: boolean,
    exerciseResults?: ExerciseResultItem[],
  ) => void;
  isReviewMode?: boolean;
  defaultShowChinese?: boolean;
  onExerciseUpdate?: (summary: ExerciseSummary) => void;
  onComplete?: () => void;
}

interface SentenceHelperTarget {
  sentence: string;
  paragraphIndex: number;
}

function buildParagraphAudioUrl(text: string, speaker?: string): string {
  const params = new URLSearchParams({ word: text });
  if (speaker) {
    params.set('speaker', speaker);
  }
  return `/api/v1/tts/audio?${params.toString()}`;
}

export function ArticleReader({
  article,
  onProgressUpdate,
  isReviewMode = false,
  defaultShowChinese = true,
  onExerciseUpdate,
  onComplete,
}: ArticleReaderProps) {
  const [activeTab, setActiveTab] = useState('tips');
  const [showChinese, setShowChinese] = useState(defaultShowChinese);
  const [exerciseAnswers, setExerciseAnswers] = useState<
    Record<number, string>
  >({});
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const [readProgress, setReadProgress] = useState(article.is_read || 0);
  const [audioTimeline, setAudioTimeline] =
    useState<ArticleAudioTimelineResponse | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackParagraphIndex, setCurrentPlaybackParagraphIndex] =
    useState<number | null>(null);
  const [currentSegmentElapsedMs, setCurrentSegmentElapsedMs] = useState(0);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperTarget, setHelperTarget] = useState<SentenceHelperTarget | null>(
    null,
  );
  const [helperData, setHelperData] =
    useState<SentenceBreakdownResponse | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [loadingTTSKey, setLoadingTTSKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const singleAudioCache = useRef<Record<string, HTMLAudioElement>>({});
  const currentAudioUrlRef = useRef<string | null>(null);
  const isAdvancingSegmentRef = useRef(false);
  const exercises = article.exercises ?? EMPTY_EXERCISES;

  useEffect(() => {
    setShowChinese(defaultShowChinese);
  }, [defaultShowChinese]);

  useEffect(() => {
    setReadProgress(article.is_read || 0);
    setActiveTab('tips');
    setExerciseAnswers({});
    setCheckedMap({});
    setHelperOpen(false);
    setHelperTarget(null);
    setHelperData(null);
    setCurrentNote(null);
    setIsAIChatOpen(false);
    setIsCompletionOpen(false);
    setLoadingTTSKey(null);
    setAudioTimeline(null);
    setCurrentPlaybackParagraphIndex(null);
    setCurrentSegmentElapsedMs(0);
    setIsPlaying(false);
    currentAudioUrlRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, [article.id, article.is_read]);

  const sentenceBreakdownRequest = useRequest(
    async (params: {
      sentence: string;
      article_id?: number;
      paragraph_index?: number;
    }) => {
      try {
        return await getSentenceBreakdown(params);
      } catch {
        return getSentenceBreakdown(params);
      }
    },
    {
      manual: true,
      onSuccess: (data) => setHelperData(data),
      onError: () => {
        message.error('句子拆解暂时失败，请稍后再试');
      },
    },
  );

  const articleNoteRequest = useRequest(
    async () => {
      const response = await getNotes({
        page: 1,
        page_size: 1,
        article_id: article.id,
      });
      return response.items[0] ?? null;
    },
    {
      manual: true,
      onSuccess: (data) => setCurrentNote(data),
      onError: () => {
        message.error('读取笔记失败，请稍后再试');
      },
    },
  );

  const buildExerciseResults = useCallback((): ExerciseResultItem[] => {
    return exercises.map((exercise, index) => {
      const expectedAnswer = exercise.answer || '';
      const userAnswer = exerciseAnswers[index] || '';
      return {
        question: exercise.question,
        expected_answer: expectedAnswer,
        user_answer: userAnswer,
        is_correct:
          normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer),
      };
    });
  }, [exerciseAnswers, exercises]);

  const exerciseSummary = useMemo<ExerciseSummary | undefined>(() => {
    const checkedIndexes = Object.keys(checkedMap);
    if (checkedIndexes.length === 0 || exercises.length === 0) {
      return undefined;
    }

    const results = buildExerciseResults();
    return {
      correct: results.filter((item) => item.is_correct).length,
      total: exercises.length,
      results,
    };
  }, [buildExerciseResults, checkedMap, exercises.length]);

  useEffect(() => {
    if (!onExerciseUpdate || !exerciseSummary) {
      return;
    }
    onExerciseUpdate(exerciseSummary);
  }, [exerciseSummary, onExerciseUpdate]);

  const playSingleTTS = useCallback(async (text: string, speaker?: string) => {
    const cacheKey = `${speaker ?? 'default'}::${text}`;
    const cachedAudio = singleAudioCache.current[cacheKey];
    setLoadingTTSKey(text);

    if (cachedAudio) {
      cachedAudio.currentTime = 0;
      try {
        await cachedAudio.play();
      } catch {
        message.error('音频播放失败');
      } finally {
        setLoadingTTSKey((current) => (current === text ? null : current));
      }
      return;
    }

    const audio = new Audio(buildParagraphAudioUrl(text, speaker));
    singleAudioCache.current[cacheKey] = audio;

    try {
      await audio.play();
    } catch {
      message.error('音频播放失败');
    } finally {
      setLoadingTTSKey((current) => (current === text ? null : current));
    }
  }, []);

  const ensureAudioTimeline = useCallback(async () => {
    if (audioTimeline) {
      return audioTimeline;
    }

    try {
      const nextTimeline = await getArticleAudioTimeline(article.id);
      setAudioTimeline(nextTimeline);
      return nextTimeline;
    } catch {
      const retryTimeline = await getArticleAudioTimeline(article.id);
      setAudioTimeline(retryTimeline);
      return retryTimeline;
    }
  }, [article.id, audioTimeline]);

  const playParagraphSegment = useCallback(
    async (paragraphIndex: number, resetCurrentTime = true) => {
      const audioElement = audioRef.current;
      const paragraph = article.content[paragraphIndex];

      if (!audioElement || !paragraph) {
        return;
      }

      const nextUrl = buildParagraphAudioUrl(paragraph.en, paragraph.speaker);
      if (currentAudioUrlRef.current !== nextUrl) {
        currentAudioUrlRef.current = nextUrl;
        audioElement.src = nextUrl;
      }
      if (resetCurrentTime) {
        audioElement.currentTime = 0;
      }

      setCurrentPlaybackParagraphIndex(paragraphIndex);
      setCurrentSegmentElapsedMs(Math.round(audioElement.currentTime * 1000));
      await audioElement.play();
      setIsPlaying(true);
    },
    [article.content],
  );

  const toggleAudio = async () => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    setLoadingAudio(true);
    try {
      try {
        await ensureAudioTimeline();
      } catch {
        message.warning('时间线准备失败，本次将先播放音频，高亮会稍后恢复');
      }

      if (
        currentPlaybackParagraphIndex !== null &&
        currentAudioUrlRef.current
      ) {
        await audioElement.play();
        setIsPlaying(true);
      } else {
        await playParagraphSegment(0);
      }
    } catch {
      message.error('课文朗读暂时失败，请稍后重试');
    } finally {
      setLoadingAudio(false);
    }
  };

  const openSentenceHelper = (sentence: string, paragraphIndex: number) => {
    setHelperTarget({ sentence, paragraphIndex });
    setHelperData(null);
    setHelperOpen(true);
    void sentenceBreakdownRequest.run({
      sentence,
      article_id: article.id,
      paragraph_index: paragraphIndex,
    });
  };

  const handleAnswerSelect = (exerciseIndex: number, answer: string) => {
    setExerciseAnswers((previous) => ({
      ...previous,
      [exerciseIndex]: answer,
    }));
  };

  const checkAnswer = (exerciseIndex: number, answerOverride?: string) => {
    const nextCheckedMap = { ...checkedMap, [exerciseIndex]: true };
    setCheckedMap(nextCheckedMap);

    const nextAnswers =
      answerOverride === undefined
        ? exerciseAnswers
        : {
            ...exerciseAnswers,
            [exerciseIndex]: answerOverride,
          };
    const currentResults = exercises.map((exercise, index) => {
      const expectedAnswer = exercise.answer || '';
      const userAnswer = nextAnswers[index] || '';
      return {
        question: exercise.question,
        expected_answer: expectedAnswer,
        user_answer: userAnswer,
        is_correct:
          normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer),
      };
    });
    const answeredCount = exercises.filter((_, index) =>
      Boolean(normalizeAnswer(nextAnswers[index])),
    ).length;
    const exerciseProgress =
      exercises.length === 0
        ? 50
        : Math.round((answeredCount / exercises.length) * 50);
    const nextProgress = Math.max(readProgress, exerciseProgress);

    setReadProgress(nextProgress);
    onProgressUpdate?.(nextProgress, false, currentResults);
  };

  const handleMarkComplete = () => {
    setIsCompletionOpen(true);
  };

  const handleCompleteCourse = (results: ExerciseResultItem[]) => {
    setReadProgress(100);
    setIsCompletionOpen(false);
    onProgressUpdate?.(100, true, results);
  };

  const handleOpenNoteEditor = () => {
    setIsNoteEditorOpen(true);
    void articleNoteRequest.run();
  };

  const handleAudioEnded = () => {
    if (isAdvancingSegmentRef.current) {
      return;
    }

    const nextIndex =
      currentPlaybackParagraphIndex === null
        ? null
        : currentPlaybackParagraphIndex + 1;

    if (nextIndex === null || nextIndex >= article.content.length) {
      setIsPlaying(false);
      setCurrentPlaybackParagraphIndex(null);
      setCurrentSegmentElapsedMs(0);
      currentAudioUrlRef.current = null;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }

    isAdvancingSegmentRef.current = true;
    setCurrentSegmentElapsedMs(0);
    void playParagraphSegment(nextIndex)
      .catch(() => {
        message.error('课文朗读中断，请稍后重试');
        setIsPlaying(false);
        setCurrentPlaybackParagraphIndex(null);
        setCurrentSegmentElapsedMs(0);
      })
      .finally(() => {
        isAdvancingSegmentRef.current = false;
      });
  };

  return (
    <div className="mx-auto w-full">
      <ArticleReaderHeader
        article={article}
        readProgress={readProgress}
        isReviewMode={isReviewMode}
        onComplete={onComplete}
        onMarkComplete={handleMarkComplete}
      />

      <Row gutter={[24, 32]}>
        <ArticleReadingPane
          article={article}
          audioRef={audioRef}
          audioTimeline={audioTimeline}
          loadingAudio={loadingAudio}
          isPlaying={isPlaying}
          currentPlaybackParagraphIndex={currentPlaybackParagraphIndex}
          currentSegmentElapsedMs={currentSegmentElapsedMs}
          showChinese={showChinese}
          loadingTTSKey={loadingTTSKey}
          onToggleAudio={() => void toggleAudio()}
          onToggleChinese={() => setShowChinese((value) => !value)}
          onPlaySingleTTS={(text, speaker) => void playSingleTTS(text, speaker)}
          onOpenSentenceHelper={openSentenceHelper}
          onAudioEnded={handleAudioEnded}
          onAudioPause={() => {
            if (!isAdvancingSegmentRef.current) {
              setIsPlaying(false);
            }
          }}
          onAudioPlay={() => setIsPlaying(true)}
          onAudioTimeUpdate={setCurrentSegmentElapsedMs}
        />

        <Col xs={24} lg={10} xl={9}>
          <div className="sticky top-24">
            <ArticleStudyTabs
              article={article}
              activeTab={activeTab}
              loadingTTSKey={loadingTTSKey}
              onTabChange={setActiveTab}
              onPlaySingleTTS={(text) => void playSingleTTS(text)}
            />
          </div>
        </Col>
      </Row>

      <div className="fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3 md:bottom-8 md:right-8">
        <button
          type="button"
          aria-label="打开 AI 课文对话"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#ffb347,_#ff8a00)] text-white shadow-[0_18px_36px_rgba(255,138,0,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
          onClick={() => setIsAIChatOpen(true)}
        >
          <MessageOutlined className="text-lg" />
        </button>

        <button
          type="button"
          aria-label="打开课文笔记"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#58CC02,_#3ba700)] text-white shadow-[0_18px_36px_rgba(88,204,2,0.24)] transition-transform duration-200 hover:-translate-y-0.5"
          onClick={handleOpenNoteEditor}
        >
          <FormOutlined className="text-lg" />
        </button>
      </div>

      <SentenceBreakdownDrawer
        open={helperOpen}
        loading={sentenceBreakdownRequest.loading}
        sentence={helperTarget?.sentence || ''}
        data={helperData}
        onClose={() => setHelperOpen(false)}
      />

      <ArticleAIChatDrawer
        article={article}
        open={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

      <ArticleCompletionModal
        open={isCompletionOpen}
        article={article}
        exerciseSummary={exerciseSummary}
        exerciseAnswers={exerciseAnswers}
        checkedMap={checkedMap}
        onClose={() => setIsCompletionOpen(false)}
        onAnswerSelect={handleAnswerSelect}
        onCheckAnswer={checkAnswer}
        onComplete={handleCompleteCourse}
      />

      {isNoteEditorOpen ? (
        <Suspense fallback={null}>
          <NoteEditor
            open={isNoteEditorOpen}
            onClose={() => setIsNoteEditorOpen(false)}
            onSuccess={() => void articleNoteRequest.run()}
            initialNote={currentNote}
            articleId={article.id}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
