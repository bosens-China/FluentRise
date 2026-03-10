/**
 * 艾宾浩斯复习系统 API
 */
import request from '@/utils/request';

/**
 * 复习项目
 */
export interface ReviewItem {
  schedule_id: number;
  article_id: number;
  title: string;
  level: number;
  stage: number;
  stage_label: string;
  days_until_next: number;
  next_review_date: string;
  source_book: number | null;
  source_lesson: number | null;
  last_reviewed_at: string | null;
}

/**
 * 复习列表响应
 */
export interface ReviewListResponse {
  items: ReviewItem[];
  total: number;
}

/**
 * 今日复习摘要
 */
export interface TodayReviewSummary {
  has_reviews: boolean;
  count: number;
  message: string;
}

/**
 * 复习统计
 */
export interface ReviewStats {
  total_schedules: number;
  completed_schedules: number;
  today_pending: number;
  streak_days: number;
  weekly_completed: number;
  weekly_total: number;
}

/**
 * 文章复习状态
 */
export interface ArticleReviewStatus {
  is_in_review: boolean;
  schedule_id: number | null;
  current_stage: number | null;
  total_stages: number;
  next_review_date: string | null;
  completed: boolean;
}

/**
 * 复习日志项
 */
export interface ReviewLogItem {
  id: number;
  stage: number;
  is_quick_mode: boolean;
  preview_assessment: string | null;
  quality_assessment: string | null;
  correct_count: number | null;
  total_count: number | null;
  reviewed_at: string;
}

/**
 * 复习日志列表响应
 */
export interface ReviewLogListResponse {
  logs: ReviewLogItem[];
  total: number;
}

/**
 * 提交复习请求
 */
export interface SubmitReviewRequest {
  quality_assessment: 'mastered' | 'fuzzy' | 'forgot';
  is_quick_mode?: boolean;
  duration_seconds?: number;
  correct_count?: number;
  total_count?: number;
  preview_assessment?: 'clear' | 'fuzzy' | 'forgot';
}

/**
 * 提交复习响应
 */
export interface SubmitReviewResponse {
  success: boolean;
  completed: boolean;
  next_stage: number;
  next_review_date: string | null;
  message: string;
}

/**
 * 获取今日复习摘要
 */
export async function getTodayReviewSummary(): Promise<TodayReviewSummary> {
  return request.get('/reviews/today/summary');
}

/**
 * 获取今日复习列表
 */
export async function getTodayReviews(): Promise<ReviewListResponse> {
  return request.get('/reviews/today/list');
}

/**
 * 获取复习统计
 */
export async function getReviewStats(): Promise<ReviewStats> {
  return request.get('/reviews/stats');
}

/**
 * 获取文章复习状态
 */
export async function getArticleReviewStatus(
  articleId: number,
): Promise<ArticleReviewStatus> {
  return request.get(`/reviews/article/${articleId}/status`);
}

/**
 * 获取复习日志
 */
export async function getReviewLogs(
  scheduleId: number,
): Promise<ReviewLogListResponse> {
  return request.get(`/reviews/${scheduleId}/logs`);
}

/**
 * 提交复习完成
 */
export async function submitReview(
  scheduleId: number,
  data: SubmitReviewRequest,
): Promise<SubmitReviewResponse> {
  return request.post(`/reviews/${scheduleId}/submit`, data);
}

/**
 * 获取复习阶段标签
 */
export function getStageLabel(stage: number): string {
  if (stage >= 8) return '已完成';
  return `第 ${stage}/7 轮`;
}

/**
 * 获取复习间隔描述
 */
export function getStageInterval(stage: number): string {
  const intervals = [1, 2, 3, 5, 7, 15, 30];
  if (stage < 1 || stage > 7) return '';
  const days = intervals[stage - 1];
  return `${days}天后`;
}

/**
 * 计算复习进度百分比
 */
export function getReviewProgress(currentStage: number | null): number {
  if (!currentStage || currentStage < 1) return 0;
  if (currentStage >= 8) return 100;
  return Math.round(((currentStage - 1) / 7) * 100);
}
