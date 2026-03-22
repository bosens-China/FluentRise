/**
 * 游乐园 API
 */
import request from '@/utils/request';

export type QuestionType =
  | 'audio'
  | 'meaning'
  | 'fill_blank'
  | 'context_cloze'
  | 'sentence_dictation';

export interface Question {
  id: string;
  type: QuestionType;
  word: string;
  meaning: string;
  hint: string;
  uk_phonetic?: string;
  us_phonetic?: string;
  sentence?: string;
  sentence_translation?: string;
  word_audio_url?: string;
  sentence_audio_url?: string;
}

export interface QuestionListResponse {
  questions: Question[];
  total: number;
}

export interface SubmitAnswerItem {
  question_id: string;
  question_type: QuestionType;
  word: string;
  meaning?: string;
  uk_phonetic?: string;
  us_phonetic?: string;
  sentence?: string;
  sentence_translation?: string;
  user_answer?: string;
  is_correct: boolean;
  attempts: number;
  showed_answer: boolean;
}

export interface SubmitPracticeRequest {
  answers: SubmitAnswerItem[];
  duration_seconds: number;
  max_streak: number;
}

export interface SubmitPracticeResponse {
  session_id: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  message: string;
  encouragement_zh: string;
  encouragement_en: string;
}

export interface PracticeSession {
  id: number;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  accuracy: number;
  duration_seconds: number;
  max_streak: number;
  created_at: string;
}

export interface PracticeHistoryResponse {
  sessions: PracticeSession[];
  total: number;
}

export interface PracticeStats {
  total_sessions: number;
  total_questions: number;
  total_correct: number;
  total_wrong: number;
  total_skipped: number;
  overall_accuracy: number;
  total_duration_minutes: number;
  best_streak: number;
}

export async function getPlaygroundQuestions(): Promise<QuestionListResponse> {
  return request.get('/playground/questions');
}

export async function submitPracticeResult(
  data: SubmitPracticeRequest,
): Promise<SubmitPracticeResponse> {
  return request.post('/playground/submit', data);
}

export async function getPracticeHistory(
  page = 1,
  pageSize = 10,
): Promise<PracticeHistoryResponse> {
  return request.get('/playground/history', {
    params: { page, page_size: pageSize },
  });
}

export async function getPracticeStats(): Promise<PracticeStats> {
  return request.get('/playground/stats');
}
