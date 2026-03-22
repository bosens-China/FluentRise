import { post } from '@/utils/request';

export interface AIChatRequest {
  mode: 'lesson' | 'general';
  message: string;
  article_id?: number;
}

export interface AIChatResponse {
  reply: string;
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

export async function sendAIChatMessage(data: AIChatRequest): Promise<AIChatResponse> {
  return post<AIChatResponse>('/ai-chat/respond', data);
}

export async function getSentenceBreakdown(
  data: SentenceBreakdownRequest,
): Promise<SentenceBreakdownResponse> {
  return post<SentenceBreakdownResponse>('/ai-chat/sentence-breakdown', data);
}
