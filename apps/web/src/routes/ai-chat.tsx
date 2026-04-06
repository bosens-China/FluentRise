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

import { streamAIChatMessage, type AIChatHistoryItem } from '@/api/aiChat';
import { getArticleDetail, getLearningPath } from '@/api/article';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from '@/hooks/useData';
import { isAuthenticated } from '@/utils/request';

const { Paragraph, Title } = Typography;

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

  const pathRequest = useQuery(getLearningPath);

  const lessonArticleId = useMemo(() => {
    if (typeof search.articleId === 'number') {
      return search.articleId;
    }
    // 从学习路径中找第一个已生成的文章
    const firstRealized = pathRequest.data?.proposals.find((p) => p.status === 'realized' && p.article_id);
    return firstRealized?.article_id || pathRequest.data?.completed_articles[0]?.id;
  }, [search.articleId, pathRequest.data]);

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
      message.warning('请先选择或完成一篇课文');
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: 'assistant', content: '' },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      await streamAIChatMessage(
        {
          message: trimmed,
          mode: mode,
          article_id: mode === 'lesson' ? lessonArticleId : undefined,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .map<AIChatHistoryItem>((m) => ({
              role: m.role,
              content: m.content,
            })),
        },
        {
          onChunk: (chunk: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          },
          signal: abortControllerRef.current.signal,
        },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      message.error('发送失败，请重试');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-160px)] flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[32px] bg-white shadow-sm border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-50 px-6 py-4">
            <Title level={4} className="!mb-0">AI 助教</Title>
            <Segmented
              value={mode}
              onChange={(v) => setMode(v as ChatMode)}
              options={[
                { label: '课文答疑', value: 'lesson' },
                { label: '自由聊', value: 'general' },
              ]}
            />
          </div>

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--primary)] text-white shadow-md rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.content || (isStreaming && msg.role === 'assistant' ? '...' : '')}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-50 p-4">
            <Space.Compact className="w-full">
              <Input
                size="large"
                placeholder="在此输入你的问题..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={handleSend}
                disabled={isStreaming}
                className="rounded-l-2xl border-slate-200"
              />
              <Button
                type="primary"
                size="large"
                onClick={handleSend}
                loading={isStreaming}
                className="rounded-r-2xl px-8 font-bold"
              >
                发送
              </Button>
            </Space.Compact>
          </div>
        </div>

        {mode === 'lesson' && (
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <Card title="当前关联课文" className="rounded-2xl border-slate-100 shadow-sm">
              {articleDetailRequest.loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
              ) : articleDetailRequest.data ? (
                <div>
                  <Title level={5}>{articleDetailRequest.data.title}</Title>
                  <Paragraph className="text-slate-500 text-sm line-clamp-3">
                    {articleDetailRequest.data.content[0]?.en}
                  </Paragraph>
                  <Button type="link" className="p-0 h-auto">查看正文</Button>
                </div>
              ) : (
                <Empty description="暂未关联课文" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
            
            <Card title="你可以这样问" className="rounded-2xl border-slate-100 shadow-sm bg-amber-50/30">
              <div className="space-y-2">
                {[
                  '这句话怎么翻译？',
                  '这里用了什么语法？',
                  '这个单词怎么用？',
                  '能给我举个例子吗？'
                ].map(q => (
                  <Button 
                    key={q} 
                    block 
                    className="text-left h-auto py-2 px-3 border-amber-100 hover:border-amber-300 text-slate-600 bg-white"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AIChatPage;
