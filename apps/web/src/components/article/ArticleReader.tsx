import { useState, useRef, useEffect } from 'react';
import type { RadioChangeEvent } from 'antd';
import {
  Card,
  Typography,
  Tag,
  Tabs,
  Button,
  Progress,
  Space,
  Tooltip,
  message,
  Spin,
  FloatButton,
  Row,
  Col,
  Radio,
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  EditOutlined,
  PauseCircleOutlined,
  FormOutlined,
  SoundOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import type { Article } from '@/api/article';
import { generateArticleAudio } from '@/api/article';
import { NoteEditor } from '@/components/note/NoteEditor';

const { Title, Text, Paragraph } = Typography;

interface ArticleReaderProps {
  article: Article;
  onProgressUpdate?: (progress: number, completed: boolean) => void;
  // 复习模式相关
  isReviewMode?: boolean;
  defaultShowChinese?: boolean;
  onExerciseUpdate?: (correct: number, total: number) => void;
  onComplete?: () => void;
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
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [readProgress, setReadProgress] = useState(article.is_read || 0);
  
  // 音频状态
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 笔记编辑器状态
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);

  // 等级标签
  const levelLabels = ['零基础', '入门', '初级', '初中级', '中级', '中高级', '高级'];

  // 提交练习答案
  const handleAnswerSelect = (exerciseIndex: number, answer: string) => {
    setExerciseAnswers((prev) => ({ ...prev, [exerciseIndex]: answer }));
  };

  // 检查答案
  const checkAnswer = (exerciseIndex: number) => {
    setShowAnswers((prev) => ({ ...prev, [exerciseIndex]: true }));
    
    // 如果所有题目都答对，更新进度
    const exercise = article.exercises[exerciseIndex];
    if (exerciseAnswers[exerciseIndex] === exercise.answer) {
      const allAnswered = article.exercises.every(
        (_, idx) => exerciseAnswers[idx] || idx === exerciseIndex
      );
      if (allAnswered) {
        const newProgress = Math.min(readProgress + 30, 100);
        setReadProgress(newProgress);
        onProgressUpdate?.(newProgress, newProgress >= 100);
      }
    }
  };

  // 追踪练习题正确情况，用于复习模式
  useEffect(() => {
    if (!isReviewMode || !onExerciseUpdate) return;
    
    const answeredCount = Object.keys(showAnswers).length;
    if (answeredCount === 0) return;
    
    let correctCount = 0;
    article.exercises.forEach((exercise, idx) => {
      if (showAnswers[idx] && exerciseAnswers[idx] === exercise.answer) {
        correctCount++;
      }
    });
    
    onExerciseUpdate(correctCount, article.exercises.length);
  }, [showAnswers, exerciseAnswers, article.exercises, isReviewMode, onExerciseUpdate]);

  // 标记完成
  const handleMarkComplete = () => {
    setReadProgress(100);
    onProgressUpdate?.(100, true);
  };

  // 组件卸载时清理音频 URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // 播放/暂停音频
  const toggleAudio = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    setLoadingAudio(true);
    try {
      const url = await generateArticleAudio(article.id);
      // 如果有旧的 URL，释放它以避免内存泄漏
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(url);
      // 等待状态更新和引用
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    } catch (e) {
      message.error('音频生成失败，请稍后重试');
      console.error(e);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  const playSingleTTS = (text: string) => {
    if (audioCache.current[text]) {
      const audio = audioCache.current[text];
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.error("Audio play failed:", e);
        message.error("播放音频失败");
      });
      return;
    }

    const url = `/api/v1/system/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    audioCache.current[text] = audio;
    audio.play().catch(e => {
      console.error("Audio play failed:", e);
      message.error("播放音频失败");
    });
  };

  // 高亮带有生词的英文段落
  const renderEnParagraph = (text: string) => {
    if (!article.vocabulary || article.vocabulary.length === 0) return text;
    
    // 按单词长度降序排列，避免短词替换长词的部分（如 "a" 替换 "apple"）
    const sortedVocab = [...article.vocabulary].sort((a, b) => b.word.length - a.word.length);
    const words = sortedVocab.map(v => v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
    
    const parts = text.split(regex);
    
    return parts.map((part, i) => {
      const match = sortedVocab.find(v => v.word.toLowerCase() === part.toLowerCase());
      if (match) {
        return (
          <Tooltip 
            key={i} 
            color="white"
            overlayInnerStyle={{ color: '#333' }}
            title={
              <div className="p-1">
                <div className="font-bold text-lg text-indigo-600 mb-1">{match.word}</div>
                {(match.uk_phonetic || match.us_phonetic) && (
                  <div className="text-xs text-gray-500 mb-1 font-mono">
                    {match.uk_phonetic && <span className="mr-2">UK {match.uk_phonetic}</span>}
                    {match.us_phonetic && <span>US {match.us_phonetic}</span>}
                  </div>
                )}
                <div className="text-sm text-gray-700 font-medium">{match.meaning}</div>
              </div>
            }
          >
            <span className="border-b-2 border-dashed border-indigo-400 text-indigo-700 cursor-help font-semibold bg-indigo-50/50 px-1 rounded hover:bg-indigo-100 transition-colors">
              {part}
            </span>
          </Tooltip>
        );
      }
      return part;
    });
  };

  // 右侧辅助面板内容
  const tabItems = [
    {
      key: 'vocabulary',
      label: (
        <span className="flex items-center gap-1.5 px-2">
          <TranslationOutlined />
          生词
        </span>
      ),
      children: (
        <div className="space-y-4 pr-2 mt-4">
          {article.vocabulary && article.vocabulary.length > 0 ? (
            article.vocabulary.map((vocab, index) => (
              <div
                key={index}
                className="rounded-2xl border border-indigo-50 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-indigo-700 text-xl">{vocab.word}</div>
                    <Button 
                      type="text" 
                      icon={<SoundOutlined className="text-indigo-400 hover:text-indigo-600" />} 
                      size="small" 
                      onClick={() => playSingleTTS(vocab.word)}
                    />
                  </div>
                </div>
                {(vocab.uk_phonetic || vocab.us_phonetic) && (
                  <div className="flex flex-wrap gap-3 mb-3 text-sm text-gray-500 font-mono">
                    {vocab.uk_phonetic && (
                      <span className="bg-slate-50 px-2 py-1 rounded">UK {vocab.uk_phonetic}</span>
                    )}
                    {vocab.us_phonetic && (
                      <span className="bg-slate-50 px-2 py-1 rounded">US {vocab.us_phonetic}</span>
                    )}
                  </div>
                )}
                <Paragraph className="mb-0! text-[15px] leading-relaxed text-gray-600 font-medium">
                  {vocab.meaning}
                </Paragraph>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-10">暂无生词</div>
          )}
        </div>
      ),
    },
    {
      key: 'grammar',
      label: (
        <span className="flex items-center gap-1.5 px-2">
          <BookOutlined />
          语法
        </span>
      ),
      children: (
        <div className="space-y-4 pr-2 mt-4">
          {article.grammar.map((grammar, index) => (
            <div
              key={index}
              className="rounded-2xl border border-indigo-50 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
            >
              <div className="mb-3 font-bold text-indigo-700 text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-sm">{index + 1}</span>
                {grammar.point}
              </div>
              <Paragraph className="mb-4! text-[15px] leading-relaxed text-gray-600">
                {grammar.explanation}
              </Paragraph>
              {grammar.examples && grammar.examples.length > 0 && (
                <div className="space-y-3 rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">Examples</Text>
                  {grammar.examples.map((example, exIdx) => (
                    <div key={exIdx} className="border-l-2 border-indigo-200 pl-3">
                      <Text className="block text-[15px] font-medium text-gray-800">{example.en}</Text>
                      <Text className="block text-[13px] text-gray-500 mt-0.5">
                        {example.zh}
                      </Text>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'tips',
      label: (
        <span className="flex items-center gap-1.5 px-2">
          <BulbOutlined />
          文化
        </span>
      ),
      children: (
        <div className="space-y-4 pr-2 mt-4">
          {article.tips.map((tip, index) => (
            <div
              key={index}
              className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 border border-amber-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
            >
              <div className="flex items-start gap-3 mb-2">
                <span className="text-xl">💡</span>
                <span className="font-bold text-amber-900 text-lg">{tip.title}</span>
              </div>
              <Paragraph className="mb-0! text-[15px] leading-relaxed text-amber-800/80 pl-8">
                {tip.content}
              </Paragraph>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'exercises',
      label: (
        <span className="flex items-center gap-1.5 px-2">
          <EditOutlined />
          练习
        </span>
      ),
      children: (
        <div className="space-y-6 pr-2 mt-4">
          {article.exercises.map((exercise, index) => (
            <div
              key={index}
              className={`rounded-2xl p-6 transition-all duration-300 ${
                showAnswers[index]
                  ? exerciseAnswers[index] === exercise.answer
                    ? 'bg-emerald-50/50 border border-emerald-100 shadow-sm'
                    : 'bg-rose-50/50 border border-rose-100 shadow-sm'
                  : 'bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md'
              }`}
            >
              <div className="mb-4 font-bold text-gray-400 text-sm tracking-wide">
                QUESTION {index + 1}
              </div>
              <Paragraph className="mb-6! text-lg font-medium text-gray-800 leading-snug">{exercise.question}</Paragraph>

              {exercise.type === 'choice' && exercise.options && (
                <Radio.Group
                  value={exerciseAnswers[index]}
                  onChange={(e: RadioChangeEvent) => handleAnswerSelect(index, e.target.value)}
                  className="w-full"
                >
                  <Space direction="vertical" className="w-full gap-3">
                    {exercise.options.map((option, optIdx) => (
                      <Radio
                        key={optIdx}
                        value={option}
                        disabled={showAnswers[index]}
                        className={`w-full m-0 px-4 py-3 rounded-xl border transition-all text-[15px] ${
                          showAnswers[index]
                            ? option === exercise.answer
                              ? 'border-emerald-500 bg-emerald-100/50 font-bold text-emerald-800'
                              : exerciseAnswers[index] === option
                                ? 'border-rose-300 bg-rose-100/50 text-rose-700 opacity-80'
                                : 'border-transparent bg-slate-50 opacity-60'
                            : exerciseAnswers[index] === option
                              ? 'border-indigo-500 bg-indigo-50 font-medium'
                              : 'border-slate-200 bg-white hover:border-indigo-300'
                        }`}
                      >
                        {option}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}

              {exercise.type === 'fill' && (
                <div className="mt-2">
                  <input
                    type="text"
                    className={`w-full rounded-xl border-2 px-4 py-3 text-base transition-all focus:outline-none focus:ring-4 ${
                      showAnswers[index]
                        ? exerciseAnswers[index] === exercise.answer
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-rose-300 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500/20'
                    }`}
                    placeholder="Type your answer here..."
                    value={exerciseAnswers[index] || ''}
                    onChange={(e) => handleAnswerSelect(index, e.target.value)}
                    disabled={showAnswers[index]}
                  />
                </div>
              )}

              {!showAnswers[index] && (
                <Button
                  type={exerciseAnswers[index] ? 'primary' : 'default'}
                  size="large"
                  shape="round"
                  className={`mt-6 w-full font-bold ${exerciseAnswers[index] ? 'shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400 border-0'}`}
                  onClick={() => checkAnswer(index)}
                  disabled={!exerciseAnswers[index]}
                >
                  检查答案
                </Button>
              )}

              {showAnswers[index] && (
                <div
                  className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                    exerciseAnswers[index] === exercise.answer
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {exerciseAnswers[index] === exercise.answer ? (
                    <>
                      <CheckCircleOutlined className="text-lg" />
                      回答正确！干得漂亮！
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold">×</span>
                      正确答案是: {exercise.answer}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full">
      {/* 顶部标题栏 */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-3xl bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -z-10 -translate-y-1/2 translate-x-1/4"></div>
        <div className="z-10">
          <Title level={2} className="mb-3! font-black! text-gray-800 tracking-tight">
            {article.title}
          </Title>
          <Space className="text-sm font-medium flex-wrap">
            <Text className="text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{article.publish_date}</Text>
            <Tag color="indigo" className="m-0 rounded-full px-3 py-1 border-0">{levelLabels[article.level] || '未知'}</Tag>
            {article.source_book && (
              <Tooltip title="基于新概念英语课文生成">
                <Tag color="gold" className="m-0 rounded-full px-3 py-1 border-0">
                  新概念 {article.source_book}-{article.source_lesson}
                </Tag>
              </Tooltip>
            )}
          </Space>
        </div>
        <div className="flex items-center gap-6 bg-slate-50/80 p-3 pr-4 rounded-2xl z-10 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Progress
              type="circle"
              percent={readProgress}
              size={54}
              strokeWidth={8}
              strokeColor={readProgress >= 100 ? '#10b981' : '#6366f1'}
              trailColor="rgba(0,0,0,0.05)"
              format={(p) => <span className="font-bold text-gray-700">{p}%</span>}
            />
          </div>
          {isReviewMode ? (
            // 复习模式：显示复习完成按钮
            <Button
              type="primary"
              shape="round"
              size="large"
              className="font-bold shadow-md shadow-indigo-200 bg-gradient-to-r from-emerald-500 to-teal-500 border-0"
              icon={<CheckCircleOutlined />}
              onClick={() => onComplete?.()}
            >
              完成复习
            </Button>
          ) : readProgress < 100 ? (
            <Button
              type="primary"
              shape="round"
              size="large"
              className="font-bold shadow-md shadow-indigo-200"
              icon={<CheckCircleOutlined />}
              onClick={handleMarkComplete}
            >
              标记完成
            </Button>
          ) : (
            <div className="text-green-500 font-bold flex items-center gap-2 px-2">
              <CheckCircleOutlined className="text-xl" /> 已完成
            </div>
          )}
        </div>
      </div>

      <Row gutter={[24, 32]}>
        {/* 左侧：文章内容 */}
        <Col xs={24} lg={14} xl={15} xxl={16}>
          <Card className="min-h-[600px] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl" bodyStyle={{ padding: '24px 28px' }}>
            {/* 工具栏 */}
            <div className="mb-8 flex items-center justify-between rounded-full bg-slate-50/80 p-2 border border-slate-100">
              <Button
                type={isPlaying ? 'primary' : 'text'}
                shape="round"
                size="large"
                icon={loadingAudio ? <Spin size="small" /> : isPlaying ? <PauseCircleOutlined /> : <SoundOutlined />}
                onClick={toggleAudio}
                disabled={loadingAudio}
                className={`font-medium ${isPlaying ? 'shadow-md shadow-indigo-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
              >
                {loadingAudio ? '生成中...' : isPlaying ? '暂停朗读' : '朗读全文'}
              </Button>
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onEnded={handleAudioEnded}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="hidden"
              />
              
              <Button
                type="text"
                shape="round"
                size="large"
                onClick={() => setShowChinese(!showChinese)}
                className="text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm font-medium"
              >
                {showChinese ? '隐藏中文' : '显示中文'}
              </Button>
            </div>

            {/* 文章段落 */}
            <div className="flex flex-col space-y-8">
              {article.content.map((paragraph, index) => (
                <div
                  key={index}
                  className="group relative rounded-2xl p-6 transition-all hover:bg-indigo-50/40 cursor-text"
                >
                  {/* Speaker Label */}
                  {paragraph.speaker && (
                     <Tag className="mb-4 border-0 bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-sm">
                        {paragraph.speaker}
                     </Tag>
                  )}
                  
                  <Paragraph className="mb-3! text-[22px] leading-[2.2] text-gray-800 font-medium tracking-wide">
                    {renderEnParagraph(paragraph.en)}
                  </Paragraph>
                  
                  {showChinese && (
                    <Paragraph className="mb-0! text-lg text-gray-400 leading-relaxed font-normal">
                      {paragraph.zh}
                    </Paragraph>
                  )}
                  
                  {/* 单句朗读按钮 */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip title="朗读此段">
                      <Button
                        type="text"
                        icon={<SoundOutlined className="text-lg text-indigo-500" />}
                        onClick={() => playSingleTTS(paragraph.en)}
                        className="bg-white/80 hover:bg-white shadow-sm"
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 右侧：辅助学习 */}
        <Col xs={24} lg={10} xl={9} xxl={8}>
          <div className="sticky top-24">
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl" bodyStyle={{ padding: '20px' }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                type="line"
                centered
                className="custom-tabs [&_.ant-tabs-nav::before]:border-0 [&_.ant-tabs-tab]:text-base [&_.ant-tabs-tab]:font-medium [&_.ant-tabs-tab-active]:font-bold"
                size="large"
              />
            </Card>
          </div>
        </Col>
      </Row>

      {/* 悬浮笔记按钮 */}
      <FloatButton
        icon={<FormOutlined />}
        type="primary"
        tooltip="记笔记"
        onClick={() => setIsNoteEditorOpen(true)}
        style={{ right: 48, bottom: 48, width: 56, height: 56 }}
        className="shadow-lg"
      />

      {/* 笔记编辑器 */}
      <NoteEditor
        open={isNoteEditorOpen}
        onClose={() => setIsNoteEditorOpen(false)}
        articleId={article.id}
      />
    </div>
  );
}
