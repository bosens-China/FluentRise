import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
  FormOutlined,
  MessageOutlined,
  PlayCircleFilled,
  ReadOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Col, Progress, Row, Typography } from 'antd';
import { Suspense, lazy, useEffect, useState } from 'react';

import type { Article, ExerciseResultItem } from '@/api/article';
import { useSystemConfig } from '@/hooks/useSystemConfig';

import { ArticleAIChatDrawer } from './ArticleAIChatDrawer';
import { ArticleCompletionModal } from './ArticleCompletionModal';
import { SentenceBreakdownDrawer } from './SentenceBreakdownDrawer';
import { useArticleReaderAssist } from './useArticleReaderAssist';
import { useArticleReaderAudio } from './useArticleReaderAudio';

const { Paragraph, Text, Title } = Typography;

const NoteEditor = lazy(async () => {
  const module = await import('@/components/note/NoteEditor');
  return { default: module.NoteEditor };
});

export type StudyStep = 'preview' | 'listening' | 'shadowing' | 'analysis';

interface ArticleReaderProps {
  article: Article;
  onProgressUpdate?: (
    progress: number,
    completed: boolean,
    exerciseResults?: ExerciseResultItem[],
    needsRepeat?: boolean,
  ) => void;
  isReviewMode?: boolean;
  onComplete?: () => void;
}

export function ArticleReader({
  article,
  onProgressUpdate,
  onComplete,
}: ArticleReaderProps) {
  const { message } = App.useApp();
  const { data: systemConfig } = useSystemConfig();
  const [step, setStep] = useState<StudyStep>('preview');
  const [listenCount, setListenCount] = useState(0);
  const [currentShadowingIndex, setCurrentShadowingIndex] = useState(-1);
  const [isPausedForShadowing, setIsPausedForShadowing] = useState(false);

  const listenRequiredCount =
    systemConfig?.article_learning.listen_required_count ?? 5;

  const {
    currentNote,
    helperData,
    helperOpen,
    helperTarget,
    isAIChatOpen,
    isCompletionOpen,
    isNoteEditorOpen,
    openNoteEditor,
    openSentenceHelper,
    sentenceBreakdownRequest,
    setHelperOpen,
    setIsAIChatOpen,
    setIsCompletionOpen,
    setIsNoteEditorOpen,
  } = useArticleReaderAssist({ articleId: article.id });

  const {
    audioRef,
    audioTimeline,
    isPlaying,
    playSingleTTS,
    setIsPlaying,
  } = useArticleReaderAudio({ article });

  useEffect(() => {
    if (
      step !== 'shadowing' ||
      !isPlaying ||
      currentShadowingIndex === -1 ||
      !audioTimeline?.segments
    ) {
      return;
    }

    const segment = audioTimeline.segments[currentShadowingIndex];
    if (!segment) {
      return;
    }

    const checkPause = () => {
      if (
        audioRef.current &&
        audioRef.current.currentTime * 1000 >= segment.end_ms - 50
      ) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPausedForShadowing(true);

        const pauseMs = Math.max(3000, (segment.text.length / 15) * 2000);

        window.setTimeout(() => {
          setIsPausedForShadowing(false);
          const nextIndex = currentShadowingIndex + 1;

          if (nextIndex < audioTimeline.segments.length) {
            setCurrentShadowingIndex(nextIndex);
            if (audioRef.current) {
              audioRef.current.currentTime =
                audioTimeline.segments[nextIndex].start_ms / 1000;
              void audioRef.current.play();
              setIsPlaying(true);
            }
            return;
          }

          setCurrentShadowingIndex(-1);
          message.success('影子跟读完成，进入深度解析阶段');
          setStep('analysis');
        }, pauseMs);
      }
    };

    const interval = window.setInterval(checkPause, 100);
    return () => window.clearInterval(interval);
  }, [
    audioRef,
    audioTimeline,
    currentShadowingIndex,
    isPlaying,
    message,
    setIsPlaying,
    step,
  ]);

  const handleStartShadowing = () => {
    setStep('shadowing');
    setCurrentShadowingIndex(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleListenEnd = () => {
    setListenCount((previous) => {
      const next = previous + 1;
      if (next >= listenRequiredCount) {
        message.success(`盲听 ${listenRequiredCount} 遍达成，解锁影子跟读`);
      }
      return next;
    });
    setIsPlaying(false);
  };

  const renderStepHeader = () => (
    <div className="mb-8 flex items-center justify-between px-2">
      <div className="flex gap-4">
        {[
          { key: 'preview', label: '1. 预热', icon: <ReadOutlined /> },
          { key: 'listening', label: '2. 盲听', icon: <CustomerServiceOutlined /> },
          { key: 'shadowing', label: '3. 跟读', icon: <SoundOutlined /> },
          { key: 'analysis', label: '4. 解析', icon: <CheckCircleOutlined /> },
        ].map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold transition-all ${
              step === item.key
                ? 'scale-105 bg-[var(--primary)] text-white shadow-lg'
                : 'text-slate-400 opacity-60'
            }`}
          >
            {item.icon}
            <span className="hidden sm:inline">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl pb-32">
      {renderStepHeader()}

      <AnimatePresence mode="wait">
        {step === 'preview' ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden rounded-[32px] border-0 shadow-xl">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-white">
                <Title level={2} className="!mb-2 !text-white">
                  {article.title}
                </Title>
                <Paragraph className="!mb-0 text-lg !text-white/90">
                  在开始听读前，先熟悉一下本课的生词。
                </Paragraph>
              </div>
              <div className="p-8">
                <Title level={4} className="mb-6 flex items-center gap-2">
                  <span className="h-6 w-1.5 rounded-full bg-amber-500" />
                  本课生词（{article.vocabulary?.length || 0}）
                </Title>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {article.vocabulary?.map((vocabulary) => (
                    <button
                      key={vocabulary.word}
                      type="button"
                      onClick={() => void playSingleTTS(vocabulary.word)}
                      className="group flex items-center justify-between rounded-2xl border border-transparent bg-slate-50 p-4 text-left transition-all hover:border-amber-200 hover:bg-amber-50"
                    >
                      <div>
                        <div className="text-xl font-bold text-slate-800">
                          {vocabulary.word}
                        </div>
                        <div className="font-mono text-sm text-slate-400">
                          {vocabulary.us_phonetic}
                        </div>
                        <div className="mt-1 text-slate-600">
                          {vocabulary.meaning}
                        </div>
                      </div>
                      <SoundOutlined className="text-xl text-slate-300 group-hover:text-amber-500" />
                    </button>
                  ))}
                </div>
                <div className="mt-12 flex justify-center">
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    className="h-16 px-12 text-lg font-bold shadow-xl shadow-amber-200"
                    onClick={() => setStep('listening')}
                  >
                    掌握了，进入盲听 <ArrowRightOutlined />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {step === 'listening' ? (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="rounded-[32px] border-0 p-12 text-center shadow-xl">
              <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-blue-50 text-5xl text-blue-500">
                <CustomerServiceOutlined />
              </div>
              <Title level={2}>盲听磨耳朵</Title>
              <Paragraph className="mb-10 text-lg text-slate-500">
                暂时不要看文本。闭上眼，通过声音去感受文章的含义。你需要听满{' '}
                {listenRequiredCount} 遍。
              </Paragraph>

              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <Button
                    type="primary"
                    shape="circle"
                    className="h-32 w-32 border-0 bg-blue-500 shadow-2xl transition-all hover:scale-105"
                    icon={
                      isPlaying ? (
                        <div className="mx-auto h-8 w-8 rounded-sm bg-white" />
                      ) : (
                        <PlayCircleFilled className="text-4xl" />
                      )
                    }
                    onClick={() => {
                      if (!audioRef.current) {
                        return;
                      }
                      if (isPlaying) {
                        audioRef.current.pause();
                        setIsPlaying(false);
                        return;
                      }
                      void audioRef.current.play();
                      setIsPlaying(true);
                    }}
                  />
                  {isPlaying ? (
                    <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-400 opacity-20" />
                  ) : null}
                </div>

                <div className="w-full max-w-sm">
                  <div className="mb-2 flex justify-between px-1">
                    <span className="font-bold text-blue-600">盲听进度</span>
                    <span className="font-bold text-blue-600">
                      {listenCount}/{listenRequiredCount}
                    </span>
                  </div>
                  <Progress
                    percent={Math.min(
                      100,
                      (listenCount / listenRequiredCount) * 100,
                    )}
                    showInfo={false}
                    strokeColor="#3b82f6"
                  />
                </div>

                {listenCount >= listenRequiredCount ? (
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    className="h-14 border-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-10 font-bold shadow-lg"
                    onClick={handleStartShadowing}
                  >
                    开始影子跟读 <ArrowRightOutlined />
                  </Button>
                ) : null}
              </div>
            </Card>
            <audio
              ref={audioRef}
              onEnded={handleListenEnd}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </motion.div>
        ) : null}

        {step === 'shadowing' ? (
          <motion.div
            key="shadowing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden rounded-[32px] border-0 shadow-xl">
              <div className="flex items-center justify-between bg-slate-800 p-8 text-white">
                <div>
                  <Title level={3} className="!mb-1 !text-white">
                    影子跟读
                  </Title>
                  <Paragraph className="!mb-0 !text-slate-400">
                    每句播完后会自动暂停，请大声复读。
                  </Paragraph>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-500">
                    {currentShadowingIndex + 1}
                    <span className="text-sm text-slate-500">
                      {' '}
                      / {audioTimeline?.segments?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex min-h-[300px] flex-col items-center justify-center p-12 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentShadowingIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="space-y-6"
                  >
                    <div className="max-w-2xl text-3xl font-black leading-relaxed text-slate-800">
                      {audioTimeline?.segments?.[currentShadowingIndex]?.text}
                    </div>

                    {isPausedForShadowing ? (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-amber-100">
                          <motion.div
                            className="h-full bg-amber-500"
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{
                              duration: Math.max(
                                3,
                                ((audioTimeline?.segments?.[
                                  currentShadowingIndex
                                ]?.text.length || 0) /
                                  15) *
                                  2,
                              ),
                            }}
                          />
                        </div>
                        <Text className="font-bold uppercase tracking-widest text-amber-600">
                          请开口复读...
                        </Text>
                      </motion.div>
                    ) : (
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <motion.div
                            key={value}
                            animate={{ height: isPlaying ? [10, 30, 10] : 10 }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.5,
                              delay: value * 0.1,
                            }}
                            className="w-1.5 rounded-full bg-blue-400"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {step === 'analysis' ? (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={15}>
                <div className="space-y-6">
                  <Card className="rounded-[28px] border-0 p-8 shadow-lg">
                    <Title level={3} className="mb-8">
                      正文对照
                    </Title>
                    <div className="space-y-8">
                      {article.content.map((block, index) => (
                        <div key={index} className="group relative">
                          <div className="flex items-start gap-4">
                            <button
                              type="button"
                              onClick={() => void playSingleTTS(block.en, block.speaker)}
                              className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all hover:bg-amber-100 hover:text-amber-600"
                            >
                              <SoundOutlined />
                            </button>
                            <div className="flex-1">
                              <Paragraph className="mb-2 text-xl font-medium leading-relaxed text-slate-800">
                                {block.en}
                              </Paragraph>
                              <Paragraph className="leading-relaxed text-slate-500">
                                {block.zh}
                              </Paragraph>
                            </div>
                            <Button
                              type="link"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() => openSentenceHelper(block.en, index)}
                            >
                              拆句
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-12 flex justify-center border-t pt-10">
                      <Button
                        type="primary"
                        size="large"
                        shape="round"
                        className="h-16 border-0 bg-emerald-500 px-16 text-lg font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-600"
                        onClick={() => setIsCompletionOpen(true)}
                      >
                        我学完了，去闯关
                      </Button>
                    </div>
                  </Card>
                </div>
              </Col>

              <Col xs={24} lg={9}>
                <div className="sticky top-24 space-y-6">
                  <Card title="重点语法" className="rounded-2xl border-0 shadow-md">
                    {article.grammar.map((grammar, index) => (
                      <div key={index} className="mb-6 last:mb-0">
                        <div className="mb-1 font-bold text-slate-800">
                          {grammar.point}
                        </div>
                        <div className="text-sm text-slate-500">
                          {grammar.explanation}
                        </div>
                      </div>
                    ))}
                  </Card>
                  <Card
                    title="文化锦囊"
                    className="rounded-2xl border-0 bg-amber-50/50 shadow-md"
                  >
                    {article.tips.map((tip, index) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <div className="mb-1 text-sm font-bold text-amber-800">
                          {tip.title}
                        </div>
                        <div className="text-xs leading-relaxed text-amber-700/80">
                          {tip.content}
                        </div>
                      </div>
                    ))}
                  </Card>
                </div>
              </Col>
            </Row>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-4">
        <Button
          type="primary"
          shape="circle"
          className="h-14 w-14 border-0 bg-amber-500 shadow-2xl"
          icon={<MessageOutlined className="text-xl" />}
          onClick={() => setIsAIChatOpen(true)}
        />
        <Button
          type="primary"
          shape="circle"
          className="h-14 w-14 border-0 bg-emerald-500 shadow-2xl"
          icon={<FormOutlined className="text-xl" />}
          onClick={openNoteEditor}
        />
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
        onClose={() => setIsCompletionOpen(false)}
        onComplete={(results, needsRepeat) => {
          setIsCompletionOpen(false);
          onProgressUpdate?.(100, true, results, needsRepeat);
          onComplete?.();
        }}
        exerciseAnswers={{}}
        checkedMap={{}}
        onAnswerSelect={() => {}}
        onCheckAnswer={() => {}}
      />
      {isNoteEditorOpen ? (
        <Suspense fallback={null}>
          <NoteEditor
            open={isNoteEditorOpen}
            onClose={() => setIsNoteEditorOpen(false)}
            initialNote={currentNote}
            articleId={article.id}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
