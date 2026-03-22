import { useCallback, useEffect, useRef, useState } from 'react';
import { useRequest } from 'ahooks';
import { FloatButton, Row, Col, message } from 'antd';
import { FormOutlined } from '@ant-design/icons';

import type { SentenceBreakdownResponse } from '@/api/aiChat';
import { getSentenceBreakdown } from '@/api/aiChat';
import type { Article, ExerciseResultItem } from '@/api/article';
import { generateArticleAudio } from '@/api/article';
import { NoteEditor } from '@/components/note/NoteEditor';

import { ArticleReaderHeader } from './ArticleReaderHeader';
import { ArticleReadingPane } from './ArticleReadingPane';
import { ArticleStudyTabs } from './ArticleStudyTabs';
import { SentenceBreakdownDrawer } from './SentenceBreakdownDrawer';
import { EMPTY_EXERCISES, normalizeAnswer, type ExerciseSummary } from './articleReader.shared';

interface ArticleReaderProps {
  article: Article;
  onProgressUpdate?: (progress: number, completed: boolean, exerciseResults?: ExerciseResultItem[]) => void;
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
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [showChinese, setShowChinese] = useState(defaultShowChinese);
  const [exerciseAnswers, setExerciseAnswers] = useState<Record<number, string>>({});
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const [readProgress, setReadProgress] = useState(article.is_read || 0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperTarget, setHelperTarget] = useState<SentenceHelperTarget | null>(null);
  const [helperData, setHelperData] = useState<SentenceBreakdownResponse | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const singleAudioCache = useRef<Record<string, HTMLAudioElement>>({});
  const exercises = article.exercises ?? EMPTY_EXERCISES;

  useEffect(() => {
    setShowChinese(defaultShowChinese);
  }, [defaultShowChinese]);

  useEffect(() => {
    setReadProgress(article.is_read || 0);
    setExerciseAnswers({});
    setCheckedMap({});
    setHelperOpen(false);
    setHelperTarget(null);
    setHelperData(null);
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

  const buildExerciseResults = useCallback((): ExerciseResultItem[] => {
    return exercises.map((exercise, index) => {
      const expectedAnswer = exercise.answer || '';
      const userAnswer = exerciseAnswers[index] || '';
      return {
        question: exercise.question,
        expected_answer: expectedAnswer,
        user_answer: userAnswer,
        is_correct: normalizeAnswer(userAnswer) === normalizeAnswer(expectedAnswer),
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
    onExerciseUpdate({
      correct: results.filter((item) => item.is_correct).length,
      total: exercises.length,
      results,
    });
  }, [buildExerciseResults, checkedMap, exercises, onExerciseUpdate]);

  const playSingleTTS = useCallback((text: string) => {
    if (singleAudioCache.current[text]) {
      const cachedAudio = singleAudioCache.current[text];
      cachedAudio.currentTime = 0;
      void cachedAudio.play().catch(() => {
        message.error('音频播放失败');
      });
      return;
    }

    const url = `/api/v1/tts/audio?word=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    singleAudioCache.current[text] = audio;
    void audio.play().catch(() => {
      message.error('音频播放失败');
    });
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
    setExerciseAnswers((previous) => ({ ...previous, [exerciseIndex]: answer }));
  };

  const checkAnswer = (exerciseIndex: number) => {
    const nextCheckedMap = { ...checkedMap, [exerciseIndex]: true };
    setCheckedMap(nextCheckedMap);

    const currentResults = buildExerciseResults();
    const finishedCount = Object.keys(nextCheckedMap).length;
    const nextProgress =
      finishedCount === exercises.length && exercises.length > 0 ? 100 : Math.max(readProgress, 70);
    setReadProgress(nextProgress);
    onProgressUpdate?.(nextProgress, nextProgress >= 100 && !isReviewMode, currentResults);
  };

  const handleMarkComplete = () => {
    const results = buildExerciseResults();
    setReadProgress(100);
    onProgressUpdate?.(100, true, results);
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
          onToggleAudio={() => void toggleAudio()}
          onToggleChinese={() => setShowChinese((value) => !value)}
          onPlaySingleTTS={playSingleTTS}
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
              exerciseAnswers={exerciseAnswers}
              checkedMap={checkedMap}
              onTabChange={setActiveTab}
              onAnswerSelect={handleAnswerSelect}
              onCheckAnswer={checkAnswer}
              onPlaySingleTTS={playSingleTTS}
            />
          </div>
        </Col>
      </Row>

      <FloatButton
        icon={<FormOutlined />}
        type="primary"
        tooltip="记笔记"
        onClick={() => setIsNoteEditorOpen(true)}
        style={{ right: 48, bottom: 48, width: 56, height: 56 }}
        className="shadow-lg"
      />

      <SentenceBreakdownDrawer
        open={helperOpen}
        loading={sentenceBreakdownRequest.loading}
        sentence={helperTarget?.sentence || ''}
        data={helperData}
        onClose={() => setHelperOpen(false)}
      />

      <NoteEditor open={isNoteEditorOpen} onClose={() => setIsNoteEditorOpen(false)} articleId={article.id} />
    </div>
  );
}
