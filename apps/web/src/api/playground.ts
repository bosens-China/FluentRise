/**
 * 游乐场模块 API
 *
 * 提供单词练习题目获取、提交练习结果、历史记录等功能
 */
import request from '@/utils/request';

/**
 * 题目类型
 */
export type QuestionType = 'audio' | 'meaning' | 'fill_blank';

/**
 * 题目
 */
export interface Question {
  /** 题目唯一ID */
  id: string;
  /** 题目类型 */
  type: QuestionType;
  /** 目标单词 */
  word: string;
  /** 中文释义 */
  meaning: string;
  /** 首字母提示 */
  hint: string;
  /** 英式音标 */
  uk_phonetic?: string;
  /** 美式音标 */
  us_phonetic?: string;
  /** 填空句子（含下划线） */
  sentence?: string;
  /** 句子中文翻译 */
  sentence_translation?: string;
  /** 单词音频 HTTP URL（所有题型都有，可缓存） */
  word_audio_url?: string;
  /** 句子音频 HTTP URL（填空题有，可缓存） */
  sentence_audio_url?: string;
}

/**
 * 题目列表响应
 */
export interface QuestionListResponse {
  questions: Question[];
  total: number;
}

/**
 * 单个答案提交项
 */
export interface SubmitAnswerItem {
  question_id: string;
  word: string;
  is_correct: boolean;
  attempts: number;
  showed_answer: boolean;
}

/**
 * 提交练习请求
 */
export interface SubmitPracticeRequest {
  answers: SubmitAnswerItem[];
  duration_seconds: number;
  max_streak: number;
}

/**
 * 提交练习响应
 */
export interface SubmitPracticeResponse {
  session_id: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  message: string;
}

/**
 * 练习历史记录
 */
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

/**
 * 练习历史列表响应
 */
export interface PracticeHistoryResponse {
  sessions: PracticeSession[];
  total: number;
}

/**
 * 练习统计
 */
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

/**
 * 获取今日练习题目
 * @returns 题目列表（30道，已随机打乱）
 */
export async function getPlaygroundQuestions(): Promise<QuestionListResponse> {
  return request.get('/playground/questions');
}

/**
 * 提交练习结果
 * @param data 练习结果数据
 * @returns 提交结果
 */
export async function submitPracticeResult(
  data: SubmitPracticeRequest,
): Promise<SubmitPracticeResponse> {
  return request.post('/playground/submit', data);
}

/**
 * 获取练习历史
 * @param page 页码（默认1）
 * @param pageSize 每页数量（默认10）
 * @returns 练习历史列表
 */
export async function getPracticeHistory(
  page = 1,
  pageSize = 10,
): Promise<PracticeHistoryResponse> {
  return request.get('/playground/history', {
    params: { page, page_size: pageSize },
  });
}

/**
 * 获取练习统计
 * @returns 练习统计数据
 */
export async function getPracticeStats(): Promise<PracticeStats> {
  return request.get('/playground/stats');
}
