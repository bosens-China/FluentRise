import { getAccessToken, post } from '@/utils/request';

export interface AIChatRequest {
  mode: 'lesson' | 'general';
  message: string;
  article_id?: number;
  history?: AIChatHistoryItem[];
}

export interface AIChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatResponse {
  reply: string;
}

export interface StreamAIChatOptions {
  signal?: AbortSignal;
  onChunk?: (chunk: string, accumulated: string) => void;
}

export interface SentenceBreakdownChunk {
  text: string;
  explanation: string;
}

export interface SentenceBreakdownKeyword {
  word: string;
  meaning: string;
  usage: string;
}

export interface SentenceBreakdownExample {
  en: string;
  zh: string;
}

export interface SentenceBreakdownRequest {
  sentence: string;
  article_id?: number;
  paragraph_index?: number;
}

export interface SentenceBreakdownResponse {
  translation: string;
  chunks: SentenceBreakdownChunk[];
  keywords: SentenceBreakdownKeyword[];
  pattern: string;
  pattern_explanation: string;
  reusable_examples: SentenceBreakdownExample[];
  simpler_version: string;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const detail = 'detail' in payload ? payload.detail : null;
  const message = 'message' in payload ? payload.message : null;
  const error = 'error' in payload ? payload.error : null;

  for (const candidate of [detail, message, error]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return null;
}

export async function sendAIChatMessage(
  data: AIChatRequest,
): Promise<AIChatResponse> {
  return post<AIChatResponse>('/ai-chat/respond', data);
}

export async function streamAIChatMessage(
  data: AIChatRequest,
  options: StreamAIChatOptions = {},
): Promise<AIChatResponse> {
  const token = getAccessToken();
  const response = await fetch('/api/v1/ai-chat/respond/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal: options.signal,
  });

  if (!response.ok) {
    let errorMessage = 'AI 对话发送失败';
    try {
      const payload = (await response.json()) as unknown;
      errorMessage = extractErrorMessage(payload) ?? errorMessage;
    } catch {
      const payload = await response.text();
      if (payload.trim()) {
        errorMessage = payload.trim();
      }
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('AI 对话流不可用');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) {
      continue;
    }

    accumulated += chunk;
    options.onChunk?.(chunk, accumulated);
  }

  const lastChunk = decoder.decode();
  if (lastChunk) {
    accumulated += lastChunk;
    options.onChunk?.(lastChunk, accumulated);
  }

  return { reply: accumulated.trim() };
}

export async function getSentenceBreakdown(
  data: SentenceBreakdownRequest,
): Promise<SentenceBreakdownResponse> {
  return post<SentenceBreakdownResponse>('/ai-chat/sentence-breakdown', data);
}
