import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioOutlined,
  LoadingOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { App, Alert, Progress, Space, Tag, Typography } from 'antd';
import { Mic, RotateCcw, Square, Waves } from 'lucide-react';

import type { Article } from '@/api/article';
import {
  analyzeSpeech,
  type SpeechAnalyzeResponse,
  type SpeechConfidenceLevel,
} from '@/api/speech';
import { Button, Card, Empty } from '@/components/ui';
import { useMutation } from '@/hooks/useData';
import { useSpeechRecorder } from '@/hooks/useSpeechRecorder';

const { Paragraph, Text, Title } = Typography;

const TARGET_DURATION_SECONDS = 60;

const confidenceLabelMap: Record<SpeechConfidenceLevel, string> = {
  high: '稳定',
  medium: '一般',
  low: '偏低',
};

const confidenceColorMap: Record<SpeechConfidenceLevel, string> = {
  high: 'green',
  medium: 'gold',
  low: 'red',
};

interface SpeechPracticePanelProps {
  article: Article;
  variant?: 'default' | 'completion';
  onResultChange?: (result: SpeechAnalyzeResponse | null) => void;
}

export function SpeechPracticePanel({
  article,
  variant = 'default',
  onResultChange,
}: SpeechPracticePanelProps) {
  const { message } = App.useApp();
  const [result, setResult] = useState<SpeechAnalyzeResponse | null>(null);
  const submittedKeyRef = useRef<string | null>(null);
  const referenceText = useMemo(
    () => article.content.map((item) => item.en).join(' '),
    [article.content],
  );

  const {
    status,
    remainingSeconds,
    recordedFile,
    errorMessage,
    startRecording,
    stopRecording,
    resetRecording,
  } = useSpeechRecorder({
    maxDurationSeconds: TARGET_DURATION_SECONDS,
  });

  const analyzeRequest = useMutation(analyzeSpeech, {
    onSuccess: (data) => {
      startTransition(() => {
        setResult(data);
      });
      onResultChange?.(data);
      message.success('朗读解析完成');
    },
    onError: (error) => {
      message.error(error.message || '朗读解析失败，请稍后重试');
    },
  });

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    message.error(errorMessage);
  }, [errorMessage, message]);

  useEffect(() => {
    if (status !== 'stopped' || !recordedFile) {
      return;
    }

    const currentKey = `${recordedFile.size}-${recordedFile.lastModified}`;
    if (submittedKeyRef.current === currentKey) {
      return;
    }

    submittedKeyRef.current = currentKey;
    void analyzeRequest.run({
      file: recordedFile,
      language: 'en',
      referenceText,
    });
  }, [analyzeRequest, recordedFile, referenceText, status]);

  useEffect(() => {
    if (status === 'recording' && remainingSeconds === 0) {
      message.warning('已到 60 秒建议上限，录音已自动停止并开始解析');
    }
  }, [message, remainingSeconds, status]);

  const handleStart = async () => {
    setResult(null);
    submittedKeyRef.current = null;
    onResultChange?.(null);
    await startRecording();
  };

  const handleStop = async () => {
    await stopRecording();
  };

  const progressPercent = Math.round(
    ((TARGET_DURATION_SECONDS - remainingSeconds) / TARGET_DURATION_SECONDS) *
      100,
  );

  return (
    <div className="space-y-6">
      <Alert
        type="info"
        showIcon
        message="录音规则"
        description="建议单次录音控制在 60 秒内。系统会在 60 秒自动停止并开始解析，结果更适合做课文跟读回看，不等同于严格发音纠错。"
      />

      {variant === 'completion' ? (
        <Card className="p-0">
          <div className="border-b border-slate-100 bg-[linear-gradient(135deg,_rgba(88,204,2,0.08),_rgba(255,255,255,0.96))] p-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[var(--shadow-button)]">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-black text-[var(--text-primary)]">
                  朗读当前课文
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  这里仅展示英文原文，完成朗读后系统会自动校验。
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-[320px] space-y-4 overflow-y-auto p-6">
            {article.content.map((item, index) => (
              <div
                key={`${item.en}-${index}`}
                className="rounded-2xl border border-slate-100 bg-white px-5 py-4"
              >
                {item.speaker ? (
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
                    {item.speaker}
                  </div>
                ) : null}
                <div className="text-base leading-8 text-gray-800">
                  {item.en}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,_rgba(88,204,2,0.12),_rgba(28,176,246,0.10))] p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[var(--shadow-button)]">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-black text-[var(--text-primary)]">
                  跟读当前课文
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  系统会先返回识别文本，再给你一份和当前课文的宽松匹配参考。
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 p-4">
              <div className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                当前参考课文
              </div>
              <div className="line-clamp-4 text-sm leading-7 text-[var(--text-primary)]">
                {referenceText}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Title level={4} className="!mb-1 !text-[var(--text-primary)]">
              录音进度
            </Title>
            <Text className="text-[var(--text-secondary)]">
              {status === 'recording'
                ? '正在录音，请尽量连续朗读'
                : analyzeRequest.loading
                  ? '录音已结束，正在上传并解析'
                  : result
                    ? '本轮解析已完成，你可以继续重录'
                    : '点击开始录音后会立即进入计时'}
            </Text>
          </div>
          <div className="rounded-3xl bg-[var(--bg-secondary)] px-5 py-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              剩余时间
            </div>
            <div className="mt-1 text-3xl font-black text-[var(--primary)]">
              {remainingSeconds}s
            </div>
          </div>
        </div>

        <Progress
          percent={progressPercent}
          showInfo={false}
          strokeColor="var(--primary)"
          trailColor="rgba(0,0,0,0.06)"
        />

        <div className="mt-6 flex flex-wrap gap-3">
          {status !== 'recording' ? (
            <Button
              leftIcon={<AudioOutlined />}
              loading={analyzeRequest.loading}
              onClick={() => void handleStart()}
            >
              开始录音
            </Button>
          ) : (
            <Button
              variant="accent"
              leftIcon={<Square className="h-4 w-4" />}
              onClick={() => void handleStop()}
            >
              停止并解析
            </Button>
          )}
          <Button
            variant="outline"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            disabled={status === 'recording' || analyzeRequest.loading}
            onClick={() => {
              resetRecording();
              setResult(null);
              submittedKeyRef.current = null;
              onResultChange?.(null);
            }}
          >
            重新来一遍
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Waves className="h-4 w-4 text-[var(--secondary)]" />
          朗读反馈
        </div>

        {analyzeRequest.loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <LoadingOutlined className="text-3xl text-[var(--secondary)]" />
            <Paragraph className="!mb-0 !mt-4 text-[var(--text-secondary)]">
              正在上传音频并调用朗读分析服务，请稍等片刻。
            </Paragraph>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                <SoundOutlined />
                识别文本
              </div>
              <div className="whitespace-pre-wrap leading-7 text-[var(--text-primary)]">
                {result.transcript}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                <div className="text-sm font-semibold text-[var(--text-secondary)]">
                  录音时长
                </div>
                <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  {result.duration_seconds}s
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                <div className="text-sm font-semibold text-[var(--text-secondary)]">
                  内容覆盖度
                </div>
                <div className="mt-2 text-2xl font-black text-[var(--primary)]">
                  {result.similarity_score != null
                    ? `${result.similarity_score}%`
                    : '未比对'}
                </div>
              </div>
              <div className="rounded-2xl bg-[var(--bg-secondary)] p-4">
                <div className="text-sm font-semibold text-[var(--text-secondary)]">
                  识别稳定度
                </div>
                <div className="mt-2">
                  <Tag
                    color={confidenceColorMap[result.confidence_level]}
                    className="m-0 rounded-full px-3 py-1 text-sm"
                  >
                    {confidenceLabelMap[result.confidence_level]}
                  </Tag>
                </div>
              </div>
            </div>

            {result.confidence_level === 'low' ? (
              <Alert
                type="warning"
                showIcon
                message="这次识别不太稳定"
                description="建议把练习范围缩到一句或一小段，再试一次。当前结果更适合作为参考，不建议直接当成严格纠错。"
              />
            ) : null}

            <div className="rounded-2xl bg-[var(--secondary-light)]/40 p-4">
              <div className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                反馈说明
              </div>
              <div className="leading-7 text-[var(--text-primary)]">
                {result.analysis_zh}
              </div>
            </div>

            {result.missing_words.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                  可能漏读的重点词
                </div>
                <Space wrap>
                  {result.missing_words.map((word) => (
                    <Tag key={word} color="orange">
                      {word}
                    </Tag>
                  ))}
                </Space>
              </div>
            ) : null}

            {result.extra_words.length > 0 ? (
              <div>
                <div className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                  可能多读或替换的重点词
                </div>
                <Space wrap>
                  {result.extra_words.map((word) => (
                    <Tag key={word} color="blue">
                      {word}
                    </Tag>
                  ))}
                </Space>
              </div>
            ) : null}
          </div>
        ) : (
          <Empty
            title="还没有朗读结果"
            description="开始录音后，系统会在结束后自动上传并返回识别结果。"
            icon={<Mic className="h-10 w-10" />}
          />
        )}
      </Card>
    </div>
  );
}
