import { useEffect, useRef, useState } from 'react';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Input, Typography } from 'antd';

import { streamAIChatMessage } from '@/api/aiChat';
import type { Article } from '@/api/article';

const { Paragraph, Text, Title } = Typography;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ArticleAIChatDrawerProps {
  article: Article;
  open: boolean;
  onClose: () => void;
}

function buildWelcomeMessage(title: string): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: `可以围绕《${title}》直接问我。你可以继续追问句子、词语、表达场景，也可以把你想说的中文发给我，我会贴着课文来帮你表达。`,
  };
}

export function ArticleAIChatDrawer({
  article,
  open,
  onClose,
}: ArticleAIChatDrawerProps) {
  const { message } = App.useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    buildWelcomeMessage(article.title),
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInput('');
    setMessages([buildWelcomeMessage(article.title)]);
    setIsStreaming(false);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, [article.id, article.title]);

  useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      return;
    }

    window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) {
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, open, isStreaming]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const assistantMessageId = `assistant-${Date.now()}`;

    setMessages((previous) => [
      ...previous,
      userMessage,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      },
    ]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamAIChatMessage(
        {
          mode: 'lesson',
          message: trimmed,
          article_id: article.id,
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
      message.error((error as Error).message || '课文对话发送失败，请稍后重试');
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  return (
    <Drawer
      open={open}
      width={520}
      title="AI 课文对话"
      onClose={onClose}
      destroyOnClose={false}
    >
      <div className="flex h-full flex-col">
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
            <MessageOutlined />
            当前上下文
          </div>
          <Title level={4} className="!mb-2 !text-gray-800">
            {article.title}
          </Title>
          <Paragraph className="!mb-0 text-sm leading-7 text-gray-600">
            这里的回答会尽量贴着当前课文来解释词句、延展表达和补充场景。
          </Paragraph>
        </div>

        <div
          ref={scrollContainerRef}
          className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1"
        >
          {messages.map((item) => (
            <div
              key={item.id}
              className={`rounded-3xl px-5 py-4 ${
                item.role === 'assistant'
                  ? 'mr-10 bg-slate-50 text-gray-700'
                  : 'ml-10 bg-gradient-to-r from-amber-500 to-orange-500 text-white'
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

          {isStreaming ? (
            <Text className="block pl-2 text-xs text-gray-400">
              AI 正在流式输出...
            </Text>
          ) : null}
        </div>

        <div className="mt-5">
          <Input.TextArea
            value={input}
            autoSize={{ minRows: 3, maxRows: 5 }}
            onChange={(event) => setInput(event.target.value)}
            onPressEnter={(event) => {
              if (event.shiftKey) {
                return;
              }
              event.preventDefault();
              void handleSend();
            }}
            placeholder="直接问词义、句子、语法，或者把你想表达的中文发给我。"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <Text className="text-xs text-gray-400">
              Enter 发送，Shift + Enter 换行
            </Text>
            <Button
              type="primary"
              loading={isStreaming}
              className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-6"
              icon={<SendOutlined />}
              onClick={() => void handleSend()}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
