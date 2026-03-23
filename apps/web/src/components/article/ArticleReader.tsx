import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FormOutlined, MessageOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Col, Row, message } from 'antd';

import type { SentenceBreakdownResponse } from '@/api/aiChat';
import { getSentenceBreakdown } from '@/api/aiChat';
import type { Article, ExerciseResultItem } from '@/api/article';
import { generateArticleAudio } from '@/api/article';
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
  const [exerciseSummary, setExerciseSummary] = useState<ExerciseSummary>();
  const [loadingTTSKey, setLoadingTTSKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const singleAudioCache = useRef<Record<string, HTMLAudioElement>>({});
  const exercises = article.exercises ?? EMPTY_EXERCISES;

  useEffect(() => {
    setShowChinese(defaultShowChinese);
  }, [defaultShowChinese]);

  useEffect(() => {
    setReadProgress(article.is_read || 0);
    setActiveTab('tips');
    setExerciseAnswers({});
    setCheckedMap({});
    setExerciseSummary(undefined);
    setHelperOpen(false);
    setHelperTarget(null);
    setHelperData(null);
    setCurrentNote(null);
    setIsAIChatOpen(false);
    setIsCompletionOpen(false);
    setLoadingTTSKey(null);
  }, [article.id, article.is_read]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const sentenceBreakdownRequest = useRequest(getSentenceBreakdown, {
    manual: true,
    onSuccess: (data) => setHelperData(data),
    onError: () => {
      message.error('句子拆解暂时失败，请稍后再试');
    },
  });

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

  useEffect(() => {
    if (!onExerciseUpdate || exercises.length === 0) {
      return;
    }

    const checkedIndexes = Object.keys(checkedMap);
    if (checkedIndexes.length === 0) {
      return;
    }

    const results = buildExerciseResults();
    const summary = {
      correct: results.filter((item) => item.is_correct).length,
      total: exercises.length,
      results,
    };
    setExerciseSummary(summary);
    onExerciseUpdate(summary);
  }, [buildExerciseResults, checkedMap, exercises.length, onExerciseUpdate]);

  const playSingleTTS = useCallback(async (text: string) => {
    const cachedAudio = singleAudioCache.current[text];
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

    const url = `/api/v1/tts/audio?word=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    singleAudioCache.current[text] = audio;

    try {
      await audio.play();
    } catch {
      message.error('音频播放失败');
    } finally {
      setLoadingTTSKey((current) => (current === text ? null : current));
    }
  }, []);

  const toggleAudio = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      await audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    setLoadingAudio(true);
    try {
      const nextAudioUrl = await generateArticleAudio(article.id);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(nextAudioUrl);
      window.setTimeout(() => {
        void audioRef.current?.play();
        setIsPlaying(true);
      }, 60);
    } catch {
      message.error('文章音频生成失败，请稍后重试');
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

  const checkAnswer = (exerciseIndex: number) => {
    const nextCheckedMap = { ...checkedMap, [exerciseIndex]: true };
    setCheckedMap(nextCheckedMap);

    const currentResults = buildExerciseResults();
    const finishedCount = Object.keys(nextCheckedMap).length;
    const nextProgress =
      finishedCount === exercises.length && exercises.length > 0
        ? Math.max(readProgress, 80)
        : Math.max(readProgress, 70);

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
          audioUrl={audioUrl}
          loadingAudio={loadingAudio}
          isPlaying={isPlaying}
          showChinese={showChinese}
          loadingTTSKey={loadingTTSKey}
          onToggleAudio={() => void toggleAudio()}
          onToggleChinese={() => setShowChinese((value) => !value)}
          onPlaySingleTTS={(text) => void playSingleTTS(text)}
          onOpenSentenceHelper={openSentenceHelper}
          onAudioEnded={() => setIsPlaying(false)}
          onAudioPause={() => setIsPlaying(false)}
          onAudioPlay={() => setIsPlaying(true)}
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
