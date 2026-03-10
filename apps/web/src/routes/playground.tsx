import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import {
  Button,
  Progress,
  Input,
  message,
  Spin,
  Empty,
  Modal,
  Card,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  CloseOutlined,
  SoundOutlined,
  FireOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  getPlaygroundQuestions,
  submitPracticeResult,
  type Question,
  type SubmitAnswerItem,
} from '@/api/playground';
import { isAuthenticated } from '@/utils/request';

export const Route = createFileRoute('/playground')({
  component: PlaygroundPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw new Error('UNAUTHORIZED');
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'UNAUTHORIZED') {
      window.location.href = '/login';
      return null;
    }
    return <div>出错了: {error.message}</div>;
  },
});

// 题目状态
interface QuestionState {
  currentInput: string;
  attempts: number;
  isCorrect: boolean | null;
  showedAnswer: boolean;
}

// 游戏状态
interface GameState {
  questions: Question[];
  currentIndex: number;
  questionStates: Map<string, QuestionState>;
  streak: number;
  maxStreak: number;
  isComplete: boolean;
}

function PlaygroundPage() {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 开始时间（使用惰性初始化）
  const [startTime] = useState<number>(() => Date.now());
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());

  // 游戏状态
  const [gameState, setGameState] = useState<GameState>({
    questions: [],
    currentIndex: 0,
    questionStates: new Map(),
    streak: 0,
    maxStreak: 0,
    isComplete: false,
  });

  // 是否正在播放音频
  const [isPlaying, setIsPlaying] = useState(false);
  // 显示完成弹窗
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  // 提交结果
  const [submitResult, setSubmitResult] = useState<{
    total: number;
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    message: string;
  } | null>(null);

  // 获取题目
  const { loading, run: fetchQuestions } = useRequest(getPlaygroundQuestions, {
    manual: true,
    onSuccess: (data) => {
      const states = new Map<string, QuestionState>();
      data.questions.forEach((q) => {
        states.set(q.id, {
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
        isComplete: false,
      });
    },
    onError: (error) => {
      message.error(error.message || '获取题目失败');
    },
  });

  // 提交练习
  const { loading: submitting, run: submitResultFn } = useRequest(
    submitPracticeResult,
    {
      manual: true,
      onSuccess: (data) => {
        setSubmitResult(data);
        setShowCompleteModal(true);
      },
      onError: (error) => {
        message.error(error.message || '提交失败');
      },
    },
  );

  // 初始加载
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 当前题目
  const currentQuestion = gameState.questions[gameState.currentIndex];
  const currentState = currentQuestion
    ? gameState.questionStates.get(currentQuestion.id)
    : undefined;

  // Web Speech API 备用
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // 播放音频的通用函数
  const playAudio = useCallback((url: string | undefined, fallbackText?: string) => {
    if (!url) {
      // 如果没有 URL，使用 Web Speech API 作为备用
      if (fallbackText) {
        speakText(fallbackText);
      }
      return false;
    }
    
    setIsPlaying(true);
    
    // 使用 Audio 元素播放
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      // 播放失败时尝试使用 Web Speech API
      if (fallbackText) {
        speakText(fallbackText);
      }
    };
    
    audio.play().catch(() => {
      setIsPlaying(false);
      if (fallbackText) {
        speakText(fallbackText);
      }
    });
    
    return true;
  }, [speakText]);

  // 自动朗读当前题目
  useEffect(() => {
    if (!currentQuestion) return;

    // 延迟 500ms 后自动播放，给用户准备时间
    const timer = setTimeout(() => {
      if (currentQuestion.type === 'fill_blank' && currentQuestion.sentence_audio_url) {
        // 填空题：播放完整句子
        playAudio(currentQuestion.sentence_audio_url, currentQuestion.sentence || currentQuestion.word);
      } else if (currentQuestion.word_audio_url) {
        // 其他题型：播放单词
        playAudio(currentQuestion.word_audio_url, currentQuestion.word);
      } else {
        // 备用：使用 Web Speech API
        speakText(currentQuestion.word);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentQuestion, playAudio, speakText]);

  // 手动播放按钮点击
  const handlePlayAudio = useCallback(() => {
    if (!currentQuestion) return;
    
    if (currentQuestion.type === 'fill_blank' && currentQuestion.sentence_audio_url) {
      playAudio(currentQuestion.sentence_audio_url, currentQuestion.sentence || currentQuestion.word);
    } else if (currentQuestion.word_audio_url) {
      playAudio(currentQuestion.word_audio_url, currentQuestion.word);
    } else {
      speakText(currentQuestion.word);
    }
  }, [currentQuestion, playAudio, speakText]);

  // 进度
  const progress = useMemo(() => {
    if (gameState.questions.length === 0) return 0;
    return Math.round((gameState.currentIndex / gameState.questions.length) * 100);
  }, [gameState.currentIndex, gameState.questions.length]);

  // 用时（秒）
  const durationSeconds = useMemo(() => {
    return Math.floor((currentTime - startTime) / 1000);
  }, [currentTime, startTime]);

  // 完成练习（移到 durationSeconds 之后）
  const handleComplete = useCallback(() => {
    const answers: SubmitAnswerItem[] = [];
    gameState.questions.forEach((q) => {
      const state = gameState.questionStates.get(q.id);
      if (state) {
        answers.push({
          question_id: q.id,
          word: q.word,
          is_correct: state.isCorrect === true,
          attempts: state.attempts,
          showed_answer: state.showedAnswer,
        });
      }
    });

    submitResultFn({
      answers,
      duration_seconds: durationSeconds,
      max_streak: gameState.maxStreak,
    });
  }, [gameState.questions, gameState.questionStates, gameState.maxStreak, durationSeconds, submitResultFn]);

  // 下一题
  const handleNext = useCallback(() => {
    if (gameState.currentIndex >= gameState.questions.length - 1) {
      // 完成所有题目
      handleComplete();
    } else {
      setGameState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }));
    }
  }, [gameState.currentIndex, gameState.questions.length, handleComplete]);

  // 显示答案
  const handleShowAnswer = useCallback(() => {
    if (!currentQuestion || !currentState) return;

    const newStates = new Map(gameState.questionStates);
    newStates.set(currentQuestion.id, {
      ...currentState,
      showedAnswer: true,
      isCorrect: false,
    });

    setGameState((prev) => ({
      ...prev,
      questionStates: newStates,
      streak: 0,
    }));

    // 延迟后自动下一题
    setTimeout(() => {
      handleNext();
    }, 2000);
  }, [currentQuestion, currentState, gameState.questionStates, handleNext]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + H 显示答案
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        handleShowAnswer();
      }
      // Space 播放音频
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handlePlayAudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShowAnswer, handlePlayAudio]);

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 提交答案
  const handleSubmit = useCallback(() => {
    if (!currentQuestion || !currentState) return;

    const input = currentState.currentInput.trim().toLowerCase();
    const correct = input === currentQuestion.word.toLowerCase();

    const newStates = new Map(gameState.questionStates);
    const newState: QuestionState = {
      ...currentState,
      attempts: currentState.attempts + 1,
      isCorrect: correct,
    };
    newStates.set(currentQuestion.id, newState);

    if (correct) {
      // 正确：增加连击，进入下一题
      const newStreak = gameState.streak + 1;
      const newMaxStreak = Math.max(gameState.maxStreak, newStreak);
      
      setGameState((prev) => ({
        ...prev,
        questionStates: newStates,
        streak: newStreak,
        maxStreak: newMaxStreak,
      }));

      // 延迟后自动下一题
      setTimeout(() => {
        handleNext();
      }, 800);
    } else {
      // 错误：检查是否达到3次
      if (newState.attempts >= 3) {
        // 显示答案，进入下一题
        newState.showedAnswer = true;
        setGameState((prev) => ({
          ...prev,
          questionStates: newStates,
          streak: 0,
        }));
        setTimeout(() => {
          handleNext();
        }, 2000);
      } else {
        // 提示错误
        setGameState((prev) => ({
          ...prev,
          questionStates: newStates,
          streak: 0,
        }));
      }
    }
  }, [currentQuestion, currentState, gameState.streak, gameState.maxStreak, gameState.questionStates, handleNext]);

  // 输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentQuestion) return;
    
    const newStates = new Map(gameState.questionStates);
    const state = newStates.get(currentQuestion.id);
    if (state) {
      newStates.set(currentQuestion.id, {
        ...state,
        currentInput: e.target.value,
      });
      setGameState((prev) => ({
        ...prev,
        questionStates: newStates,
      }));
    }
  }, [currentQuestion, gameState.questionStates]);

  // 重新开始
  const handleRestart = useCallback(() => {
    setShowCompleteModal(false);
    setSubmitResult(null);
    fetchQuestions();
  }, [fetchQuestions]);

  // 返回首页
  const handleGoHome = useCallback(() => {
    navigate({ to: '/' });
  }, [navigate]);

  // 渲染题目内容 - 听音写词
  const renderAudioQuestion = () => {
    if (!currentQuestion) return null;
    
    return (
      <div className="text-center py-8">
        {/* 播放按钮 */}
        <div className="mb-8">
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<SoundOutlined className="text-2xl" />}
            className="w-28 h-28 bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-200"
            loading={isPlaying}
            onClick={handlePlayAudio}
          />
        </div>
        
        {/* 提示文字 */}
        <p className="text-gray-500 text-lg mb-2">听音频，写出你听到的单词</p>
        <p className="text-xs text-gray-400">快捷键：空格键重新播放</p>
        
        {/* 音标提示（可选显示） */}
        {(currentQuestion.uk_phonetic || currentQuestion.us_phonetic) && (
          <div className="mt-6 flex justify-center gap-4 text-gray-400 text-sm">
            {currentQuestion.uk_phonetic && (
              <span className="bg-gray-50 px-3 py-1 rounded-full">
                UK {currentQuestion.uk_phonetic}
              </span>
            )}
            {currentQuestion.us_phonetic && (
              <span className="bg-gray-50 px-3 py-1 rounded-full">
                US {currentQuestion.us_phonetic}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染题目内容 - 释义写词
  const renderMeaningQuestion = () => {
    if (!currentQuestion) return null;
    
    return (
      <div className="text-center py-6">
        {/* 播放按钮（小） */}
        <div className="mb-4">
          <Button
            type="text"
            shape="circle"
            icon={<SoundOutlined />}
            className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
            loading={isPlaying}
            onClick={handlePlayAudio}
          />
        </div>
        
        {/* 释义显示 */}
        <div className="bg-indigo-50 rounded-2xl p-6 mb-6 mx-4">
          <div className="text-2xl font-bold text-indigo-900">
            {currentQuestion.meaning}
          </div>
        </div>
        
        {/* 音标 */}
        {(currentQuestion.uk_phonetic || currentQuestion.us_phonetic) && (
          <div className="flex justify-center gap-4 text-gray-400 text-sm mb-4">
            {currentQuestion.uk_phonetic && <span>UK {currentQuestion.uk_phonetic}</span>}
            {currentQuestion.us_phonetic && <span>US {currentQuestion.us_phonetic}</span>}
          </div>
        )}
        
        <p className="text-gray-500">根据释义写出单词</p>
      </div>
    );
  };

  // 渲染题目内容 - 句子填空
  const renderFillBlankQuestion = () => {
    if (!currentQuestion) return null;
    
    // 高亮显示填空部分
    const renderSentence = () => {
      if (!currentQuestion.sentence) return null;
      
      const parts = currentQuestion.sentence.split('_____');
      return (
        <span>
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <span className="inline-block min-w-[80px] border-b-2 border-indigo-400 mx-1 text-center">
                  {currentState?.showedAnswer ? (
                    <span className="text-indigo-600 font-bold">{currentQuestion.word}</span>
                  ) : (
                    <span className="text-indigo-300">?</span>
                  )}
                </span>
              )}
            </span>
          ))}
        </span>
      );
    };
    
    return (
      <div className="py-6">
        {/* 播放按钮 */}
        <div className="text-center mb-6">
          <Button
            type="text"
            shape="circle"
            icon={<SoundOutlined className="text-lg" />}
            className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
            loading={isPlaying}
            onClick={handlePlayAudio}
          />
        </div>
        
        {/* 句子显示 */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-4 mx-2">
          <div className="text-xl text-gray-800 leading-relaxed text-center font-medium">
            {renderSentence()}
          </div>
        </div>
        
        {/* 中文翻译 */}
        {currentQuestion.sentence_translation && (
          <div className="text-center text-gray-500 text-sm mb-4">
            {currentQuestion.sentence_translation}
          </div>
        )}
        
        <p className="text-center text-gray-400 text-sm">填入缺失的单词</p>
      </div>
    );
  };

  // 渲染题目内容
  const renderQuestionContent = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'audio':
        return renderAudioQuestion();
      case 'meaning':
        return renderMeaningQuestion();
      case 'fill_blank':
        return renderFillBlankQuestion();
      default:
        return null;
    }
  };

  // 获取输入框状态
  const getInputStatus = () => {
    if (!currentState) return '';
    if (currentState.isCorrect === true) return 'success';
    if (currentState.isCorrect === false && currentState.attempts >= 3) return 'error';
    if (currentState.isCorrect === false) return 'error';
    return '';
  };

  // 获取提示消息
  const getHintMessage = () => {
    if (!currentState) return null;
    if (currentState.showedAnswer) {
      return (
        <div className="text-orange-500">
          正确答案是：<span className="font-bold">{currentQuestion?.word}</span>
        </div>
      );
    }
    if (currentState.isCorrect === false) {
      const remaining = 3 - currentState.attempts;
      if (remaining > 0) {
        return (
          <div className="text-red-500">
            错误！还有 {remaining} 次机会
            <div className="text-sm text-gray-500 mt-1">
              提示：{currentQuestion?.hint}
            </div>
          </div>
        );
      }
    }
    if (currentState.isCorrect === true) {
      return <div className="text-green-500">正确！🎉</div>;
    }
    return null;
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <Spin size="large" tip="加载题目中..." />
      </div>
    );
  }

  // 无题目
  if (!loading && gameState.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-gray-800">🎮 单词游乐场</h1>
            <Button
              icon={<CloseOutlined />}
              onClick={handleGoHome}
              className="rounded-xl"
            />
          </div>
          <Empty
            description="暂无足够单词生成题目"
            className="py-20"
          >
            <Button type="primary" onClick={handleGoHome} className="rounded-xl">
              返回首页
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* 顶部栏 */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <span className="font-black text-gray-800">单词游乐场</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* 进度 */}
            <div className="hidden sm:flex items-center gap-2">
              <Progress
                percent={progress}
                size="small"
                className="w-32"
                showInfo={false}
                strokeColor="#6366f1"
              />
              <span className="text-sm text-gray-500">
                {gameState.currentIndex + 1}/{gameState.questions.length}
              </span>
            </div>
            
            {/* 连击 */}
            {gameState.streak > 0 && (
              <div className="flex items-center gap-1 text-orange-500 font-bold">
                <FireOutlined />
                <span>{gameState.streak}</span>
              </div>
            )}
            
            {/* 计时 */}
            <div className="flex items-center gap-1 text-gray-500">
              <ClockCircleOutlined />
              <span className="font-mono">{formatTime(durationSeconds)}</span>
            </div>
            
            {/* 关闭 */}
            <Button
              icon={<CloseOutlined />}
              onClick={handleGoHome}
              className="rounded-xl"
            />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 进度条（移动端） */}
        <div className="sm:hidden mb-6">
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor="#6366f1"
          />
          <div className="text-center text-sm text-gray-500 mt-2">
            {gameState.currentIndex + 1} / {gameState.questions.length}
          </div>
        </div>

        {/* 题目卡片 */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
          {/* 题型标签 */}
          <div className="flex justify-center mb-4">
            <Tag
              color={
                currentQuestion?.type === 'audio'
                  ? 'blue'
                  : currentQuestion?.type === 'meaning'
                  ? 'purple'
                  : 'orange'
              }
              className="px-4 py-1 text-sm rounded-full"
            >
              {currentQuestion?.type === 'audio' && '🔊 听音写词'}
              {currentQuestion?.type === 'meaning' && '📝 释义写词'}
              {currentQuestion?.type === 'fill_blank' && '💭 句子填空'}
            </Tag>
          </div>

          {/* 题目内容 */}
          {renderQuestionContent()}

          {/* 输入区域 - 固定在底部 */}
          <div className="mt-6 px-4 sm:px-8 pb-4">
            <Input
              size="large"
              placeholder="输入单词..."
              value={currentState?.currentInput || ''}
              onChange={handleInputChange}
              onPressEnter={handleSubmit}
              status={getInputStatus() as 'error' | ''}
              disabled={currentState?.isCorrect === true || currentState?.showedAnswer === true}
              className="text-center text-lg h-14 rounded-xl"
              autoFocus
            />
            
            {/* 提示消息 */}
            {getHintMessage() && (
              <div className="text-center mt-4 min-h-[3rem]">
                {getHintMessage()}
              </div>
            )}

            {/* 按钮组 */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                icon={<EyeOutlined />}
                onClick={handleShowAnswer}
                disabled={currentState?.isCorrect === true || currentState?.showedAnswer === true}
                className="rounded-xl"
              >
                显示答案
                <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
                  (Ctrl+H)
                </span>
              </Button>
              
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={
                  !currentState?.currentInput.trim() ||
                  currentState?.isCorrect === true ||
                  currentState?.showedAnswer === true
                }
                className="rounded-xl px-8 bg-indigo-500 hover:bg-indigo-600"
              >
                {currentState?.isCorrect === true ? '正确!' : '提交'}
              </Button>
            </div>
          </div>
        </Card>

        {/* 快捷键提示 */}
        <div className="text-center mt-6 text-xs text-gray-400">
          快捷键：Enter 提交 · Ctrl+H 显示答案 · 空格播放音频
        </div>
      </main>

      {/* 完成弹窗 */}
      <Modal
        open={showCompleteModal}
        footer={null}
        closable={false}
        centered
        width={480}
        className="playground-complete-modal"
      >
        {submitResult && (
          <div className="text-center py-6">
            {/* 勋章 */}
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center text-5xl shadow-lg">
                🏆
              </div>
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-black text-gray-800 mb-2">
              练习完成！
            </h2>
            <p className="text-lg text-indigo-600 font-medium mb-6">
              {submitResult.message}
            </p>

            {/* 统计数据 */}
            <Row gutter={[16, 16]} className="mb-6">
              <Col span={8}>
                <div className="bg-green-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-green-600">
                    {submitResult.correct}
                  </div>
                  <div className="text-xs text-green-500">正确</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bg-red-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-red-600">
                    {submitResult.wrong}
                  </div>
                  <div className="text-xs text-red-500">错误</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="bg-orange-50 rounded-2xl p-4">
                  <div className="text-2xl font-black text-orange-600">
                    {submitResult.skipped}
                  </div>
                  <div className="text-xs text-orange-500">跳过</div>
                </div>
              </Col>
            </Row>

            <div className="bg-indigo-50 rounded-2xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">正确率</span>
                <span className="text-xl font-black text-indigo-600">
                  {submitResult.accuracy}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">用时</span>
                <span className="font-medium">{formatTime(durationSeconds)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">最高连击</span>
                <span className="font-medium flex items-center gap-1">
                  <FireOutlined className="text-orange-500" />
                  {gameState.maxStreak}
                </span>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-center gap-4">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRestart}
                className="rounded-xl h-12 px-6"
              >
                再来一次
              </Button>
              <Button
                type="primary"
                icon={<TrophyOutlined />}
                onClick={handleGoHome}
                className="rounded-xl h-12 px-8 bg-indigo-500 hover:bg-indigo-600"
              >
                返回首页
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
