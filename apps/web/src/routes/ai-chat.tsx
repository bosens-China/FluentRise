import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, redirect, useSearch } from '@tanstack/react-router';
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Space,
  Typography,
} from 'antd';

import { streamAIChatMessage } from '@/api/aiChat';
import { getArticleDetail, getTodayArticle } from '@/api/article';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@/hooks/useData';
import { isAuthenticated } from '@/utils/request';

const { Paragraph, Text, Title } = Typography;

type ChatMode = 'lesson' | 'general';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const Route = createFileRoute('/ai-chat')({
  component: AIChatPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
});

function AIChatPage() {
  const search = useSearch({ from: '/ai-chat' }) as {
    articleId?: number;
    mode?: ChatMode;
  };
  const { message } = App.useApp();
  const [mode, setMode] = useState<ChatMode>(search.mode || 'general');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你可以问我课文里的表达，也可以直接把不会说的中文发给我。',
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const todayArticleRequest = useQuery(getTodayArticle);

  const lessonArticleId = useMemo(() => {
    if (typeof search.articleId === 'number') {
      return search.articleId;
    }
    return todayArticleRequest.data?.article?.id;
  }, [search.articleId, todayArticleRequest.data?.article?.id]);

  const articleDetailRequest = useQuery(
    async () => {
      if (!lessonArticleId) {
        return null;
      }
      return getArticleDetail(lessonArticleId);
    },
    {
      ready: Boolean(lessonArticleId),
    },
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) {
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) {
      return;
    }
    if (mode === 'lesson' && !lessonArticleId) {
      message.warning('当前还没有可用的课文上下文');
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    setMessages((previous) => [
      ...previous,
      { id: userMessageId, role: 'user', content: trimmed },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamAIChatMessage(
        {
          mode,
          message: trimmed,
          article_id: mode === 'lesson' ? lessonArticleId : undefined,
        },
        {
          signal: controller.signal,
          onChunk: (_chunk, accumulated) => {
            setMessages((previous) =>
              previous.map((item) =>
                item.id === assistantMessageId
                  ? { ...item, content: accumulated }
                  : item,
              ),
            );
          },
        },
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      setMessages((previous) =>
        previous.filter((item) => item.id !== assistantMessageId),
      );
      message.error(
        (error as Error).message ||
          (mode === 'lesson' ? '课文对话发送失败' : 'AI 求助发送失败'),
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Title level={2} className="!mb-2 !font-black !text-gray-800">
          AI 对话
        </Title>
        <Text className="text-base text-gray-500">
          一个入口专门围绕课文练习，另一个入口处理更通用的表达求助。
        </Text>
      </div>

      <Card className="mb-6 rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <Segmented<ChatMode>
          block
          value={mode}
          onChange={(nextValue) => setMode(nextValue)}
          options={[
            { label: '课文对话', value: 'lesson' },
            { label: '通用求助', value: 'general' },
          ]}
        />

        {mode === 'lesson' ? (
          <div className="mt-5 rounded-3xl bg-amber-50 p-5">
            {articleDetailRequest.data ? (
              <>
                <div className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-amber-500">
                  当前课文
                </div>
                <Title level={4} className="!mb-2 !text-gray-800">
                  {articleDetailRequest.data.title}
                </Title>
                <Paragraph className="!mb-0 text-gray-600">
                  这个模式下，AI 会尽量围绕当前课文的场景、新词和句型来帮助你。
                </Paragraph>
              </>
            ) : (
              <Empty
                description="还没有可用的课文上下文"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        ) : null}
      </Card>

      <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div
          ref={scrollContainerRef}
          className="mb-6 max-h-[520px] space-y-4 overflow-y-auto pr-2"
        >
          {messages.map((item) => (
            <div
              key={item.id}
              className={`rounded-3xl px-5 py-4 ${
                item.role === 'assistant'
                  ? 'mr-12 bg-slate-50 text-gray-700'
                  : 'ml-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              }`}
            >
              <div className="mb-1 text-xs font-bold uppercase tracking-[0.16em] opacity-70">
                {item.role === 'assistant' ? 'AI' : '我'}
              </div>
              <Paragraph
                className={`!mb-0 whitespace-pre-wrap ${
                  item.role === 'assistant' ? 'text-gray-700' : 'text-white'
                }`}
              >
                {item.content ||
                  (isStreaming && item.role === 'assistant'
                    ? '正在组织答案...'
                    : '')}
              </Paragraph>
            </div>
          ))}
        </div>

        <Space.Compact className="w-full">
          <Input.TextArea
            value={input}
            autoSize={{ minRows: 2, maxRows: 4 }}
            onChange={(event) => setInput(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              mode === 'lesson'
                ? '问课文里的句子、单词、表达都可以'
                : '把你不会表达的中文或英文发给我'
            }
          />
          <Button
            type="primary"
            loading={isStreaming}
            className="h-auto border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-8"
            onClick={() => void handleSend()}
          >
            发送
          </Button>
        </Space.Compact>

        {isStreaming ? (
          <Text className="mt-3 block text-xs text-gray-400">
            AI 正在流式输出...
          </Text>
        ) : null}
      </Card>
    </DashboardLayout>
  );
}
