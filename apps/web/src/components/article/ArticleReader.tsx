import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightOutlined, 
  CustomerServiceOutlined, 
  ReadOutlined, 
  SoundOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  FormOutlined,
  PlayCircleFilled
} from '@ant-design/icons';
import { Button, Card, Col, Progress, Row, Typography, App } from 'antd';
import { useEffect, useState, Suspense, lazy } from 'react';

import type { Article, ExerciseResultItem } from '@/api/article';
import { ArticleAIChatDrawer } from './ArticleAIChatDrawer';
import { ArticleCompletionModal } from './ArticleCompletionModal';
import { SentenceBreakdownDrawer } from './SentenceBreakdownDrawer';
import { useArticleReaderAssist } from './useArticleReaderAssist';
import { useArticleReaderAudio } from './useArticleReaderAudio';

const { Title, Text, Paragraph } = Typography;

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
  const [step, setStep] = useState<StudyStep>('preview');
  
  // Listening state
  const [listenCount, setListenCount] = useState(0);
  
  // Shadowing state
  const [currentShadowingIndex, setCurrentShadowingIndex] = useState(-1);
  const [isPausedForShadowing, setIsPausedForShadowing] = useState(false);

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

  // 影子跟读逻辑
  useEffect(() => {
    if (step !== 'shadowing' || !isPlaying || currentShadowingIndex === -1 || !audioTimeline?.segments) return;

    const segment = audioTimeline.segments[currentShadowingIndex];
    if (!segment) return;

    // 监听播放位置，当接近 segment 结束时准备暂停
    const checkPause = () => {
      if (audioRef.current && audioRef.current.currentTime * 1000 >= segment.end_ms - 50) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPausedForShadowing(true);
        
        // 计算暂停时间：max(3s, 字符数/15 * 2)
        const pauseMs = Math.max(3000, (segment.text.length / 15) * 2000);
        
        setTimeout(() => {
          setIsPausedForShadowing(false);
          const nextIdx = currentShadowingIndex + 1;
          if (nextIdx < audioTimeline.segments.length) {
            setCurrentShadowingIndex(nextIdx);
            if (audioRef.current) {
              audioRef.current.currentTime = audioTimeline.segments[nextIdx].start_ms / 1000;
              audioRef.current.play();
              setIsPlaying(true);
            }
          } else {
            setCurrentShadowingIndex(-1);
            message.success('影子跟读完成！进入深度解析阶段');
            setStep('analysis');
          }
        }, pauseMs);
      }
    };

    const interval = setInterval(checkPause, 100);
    return () => clearInterval(interval);
  }, [step, isPlaying, currentShadowingIndex, audioTimeline, audioRef, message, setIsPlaying]);

  const handleStartShadowing = () => {
    setStep('shadowing');
    setCurrentShadowingIndex(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleListenEnd = () => {
    setListenCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        message.success('盲听 5 遍达成！解锁影子跟读');
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
        ].map((s) => (
          <div 
            key={s.key} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
              step === s.key ? 'bg-[var(--primary)] text-white shadow-lg scale-105' : 'text-slate-400 opacity-60'
            }`}
          >
            {s.icon}
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl pb-32">
      {renderStepHeader()}

      <AnimatePresence mode="wait">
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="rounded-[32px] border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-white">
                <Title level={2} className="!text-white !mb-2">{article.title}</Title>
                <Paragraph className="!text-white/90 text-lg opacity-80">在开始听读前，先熟悉一下本课的生词。</Paragraph>
              </div>
              <div className="p-8">
                <Title level={4} className="mb-6 flex items-center gap-2">
                  <span className="h-6 w-1.5 bg-amber-500 rounded-full" />
                  本课生词 ({article.vocabulary?.length || 0})
                </Title>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {article.vocabulary?.map((v) => (
                    <button
                      key={v.word}
                      type="button"
                      onClick={() => void playSingleTTS(v.word)}
                      className="group flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all text-left"
                    >
                      <div>
                        <div className="text-xl font-bold text-slate-800">{v.word}</div>
                        <div className="text-sm text-slate-400 font-mono">{v.us_phonetic}</div>
                        <div className="mt-1 text-slate-600">{v.meaning}</div>
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
        )}

        {step === 'listening' && (
          <motion.div key="listening" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="rounded-[32px] border-0 shadow-xl p-12 text-center">
              <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-blue-50 text-blue-500 text-5xl">
                <CustomerServiceOutlined />
              </div>
              <Title level={2}>盲听磨耳朵</Title>
              <Paragraph className="text-lg text-slate-500 mb-10">
                暂时不要看文本。闭上眼，通过声音去感受文章的含义。你需要听满 5 遍。
              </Paragraph>
              
              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <Button
                    type="primary"
                    shape="circle"
                    className="h-32 w-32 border-0 bg-blue-500 hover:scale-105 shadow-2xl transition-all"
                    icon={isPlaying ? <div className="h-8 w-8 bg-white rounded-sm mx-auto" /> : <PlayCircleFilled className="text-4xl" />}
                    onClick={() => {
                      if (audioRef.current) {
                        if (isPlaying) {
                          audioRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          audioRef.current.play();
                          setIsPlaying(true);
                        }
                      }
                    }}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-blue-400 opacity-20" />
                  )}
                </div>

                <div className="w-full max-w-sm">
                  <div className="flex justify-between mb-2 px-1">
                    <span className="font-bold text-blue-600">盲听进度</span>
                    <span className="font-bold text-blue-600">{listenCount}/5</span>
                  </div>
                  <Progress percent={listenCount * 20} showInfo={false} strokeColor="#3b82f6" />
                </div>

                {listenCount >= 5 && (
                  <Button 
                    type="primary" 
                    size="large" 
                    shape="round" 
                    className="h-14 px-10 font-bold bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-lg"
                    onClick={handleStartShadowing}
                  >
                    开始影子跟读 <ArrowRightOutlined />
                  </Button>
                )}
              </div>
            </Card>
            <audio ref={audioRef} onEnded={handleListenEnd} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
          </motion.div>
        )}

        {step === 'shadowing' && (
          <motion.div key="shadowing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="rounded-[32px] border-0 shadow-xl overflow-hidden">
              <div className="bg-slate-800 p-8 text-white flex items-center justify-between">
                <div>
                  <Title level={3} className="!text-white !mb-1">影子跟读</Title>
                  <Paragraph className="!text-slate-400 !mb-0">每句播完后会自动暂停，请大声复读。</Paragraph>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-500">
                    {currentShadowingIndex + 1} <span className="text-sm text-slate-500">/ {audioTimeline?.segments?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-12 min-h-[300px] flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentShadowingIndex}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="space-y-6"
                  >
                    <div className="text-3xl font-black text-slate-800 leading-relaxed max-w-2xl">
                      {audioTimeline?.segments?.[currentShadowingIndex]?.text}
                    </div>
                    
                    {isPausedForShadowing ? (
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1] }} 
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="h-1.5 w-48 bg-amber-100 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-amber-500" 
                            initial={{ width: '0%' }} 
                            animate={{ width: '100%' }} 
                            transition={{ duration: Math.max(3, ((audioTimeline?.segments?.[currentShadowingIndex]?.text.length || 0) / 15) * 2) }}
                          />
                        </div>
                        <Text className="text-amber-600 font-bold uppercase tracking-widest">请开口复读...</Text>
                      </motion.div>
                    ) : (
                      <div className="flex justify-center gap-1">
                        {[1,2,3,4,5].map(i => (
                          <motion.div 
                            key={i}
                            animate={{ height: isPlaying ? [10, 30, 10] : 10 }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            className="w-1.5 bg-blue-400 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 'analysis' && (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={15}>
                <div className="space-y-6">
                  <Card className="rounded-[28px] border-0 shadow-lg p-8">
                    <Title level={3} className="mb-8">正文对照</Title>
                    <div className="space-y-8">
                      {article.content.map((block, idx) => (
                        <div key={idx} className="group relative">
                          <div className="flex items-start gap-4">
                            <button 
                              type="button"
                              onClick={() => void playSingleTTS(block.en, block.speaker)}
                              className="mt-1 h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-slate-50 hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-all"
                            >
                              <SoundOutlined />
                            </button>
                            <div className="flex-1">
                              <Paragraph className="text-xl font-medium text-slate-800 leading-relaxed mb-2">
                                {block.en}
                              </Paragraph>
                              <Paragraph className="text-slate-500 leading-relaxed">
                                {block.zh}
                              </Paragraph>
                            </div>
                            <Button 
                              type="link" 
                              className="opacity-0 group-hover:opacity-100" 
                              onClick={() => openSentenceHelper(block.en, idx)}
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
                        className="h-16 px-16 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 border-0 shadow-xl shadow-emerald-100"
                        onClick={() => setIsCompletionOpen(true)}
                      >
                        我学完了，去闯关！
                      </Button>
                    </div>
                  </Card>
                </div>
              </Col>
              
              <Col xs={24} lg={9}>
                <div className="sticky top-24 space-y-6">
                  <Card title="重点语法" className="rounded-2xl border-0 shadow-md">
                    {article.grammar.map((g, i) => (
                      <div key={i} className="mb-6 last:mb-0">
                        <div className="font-bold text-slate-800 mb-1">{g.point}</div>
                        <div className="text-sm text-slate-500">{g.explanation}</div>
                      </div>
                    ))}
                  </Card>
                  <Card title="文化锦囊" className="rounded-2xl border-0 shadow-md bg-amber-50/50">
                    {article.tips.map((t, i) => (
                      <div key={i} className="mb-4 last:mb-0">
                        <div className="font-bold text-amber-800 text-sm mb-1">{t.title}</div>
                        <div className="text-xs text-amber-700/80 leading-relaxed">{t.content}</div>
                      </div>
                    ))}
                  </Card>
                </div>
              </Col>
            </Row>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Float Buttons */}
      <div className="fixed bottom-8 right-8 z-30 flex flex-col gap-4">
        <Button 
          type="primary" 
          shape="circle" 
          className="h-14 w-14 shadow-2xl bg-amber-500 border-0" 
          icon={<MessageOutlined className="text-xl" />} 
          onClick={() => setIsAIChatOpen(true)}
        />
        <Button 
          type="primary" 
          shape="circle" 
          className="h-14 w-14 shadow-2xl bg-emerald-500 border-0" 
          icon={<FormOutlined className="text-xl" />} 
          onClick={openNoteEditor}
        />
      </div>

      {/* Modals & Drawers */}
      <SentenceBreakdownDrawer
        open={helperOpen}
        loading={sentenceBreakdownRequest.loading}
        sentence={helperTarget?.sentence || ''}
        data={helperData}
        onClose={() => setHelperOpen(false)}
      />
      <ArticleAIChatDrawer article={article} open={isAIChatOpen} onClose={() => setIsAIChatOpen(false)} />
      <ArticleCompletionModal
        open={isCompletionOpen}
        article={article}
        onClose={() => setIsCompletionOpen(false)}
        onComplete={(results, needsRepeat) => {
          setIsCompletionOpen(false);
          onProgressUpdate?.(100, true, results, needsRepeat);
          onComplete?.();
        }}
        // 简化这些，因为重构后逻辑在内部
        exerciseAnswers={{}}
        checkedMap={{}}
        onAnswerSelect={() => {}}
        onCheckAnswer={() => {}}
      />
      {isNoteEditorOpen && (
        <Suspense fallback={null}>
          <NoteEditor open={isNoteEditorOpen} onClose={() => setIsNoteEditorOpen(false)} initialNote={currentNote} articleId={article.id} />
        </Suspense>
      )}
    </div>
  );
}
