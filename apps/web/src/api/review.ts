/**
 * 复习模块 API。
 */
import request from '@/utils/request';

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

export interface ReviewListResponse {
  items: ReviewItem[];
  total: number;
}

export interface TodayReviewSummary {
  has_reviews: boolean;
  count: number;
  message: string;
}

export interface ReviewStats {
  total_schedules: number;
  completed_schedules: number;
  today_pending: number;
  streak_days: number;
  weekly_completed: number;
  weekly_total: number;
}

export interface ArticleReviewStatus {
  is_in_review: boolean;
  schedule_id: number | null;
  current_stage: number | null;
  total_stages: number;
  next_review_date: string | null;
  completed: boolean;
}

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

export interface ReviewLogListResponse {
  logs: ReviewLogItem[];
  total: number;
}

export interface SubmitReviewRequest {
  quality_assessment: 'mastered' | 'fuzzy' | 'forgot';
  is_quick_mode?: boolean;
  duration_seconds?: number;
  correct_count?: number;
  total_count?: number;
  preview_assessment?: 'clear' | 'fuzzy' | 'forgot';
}

export interface SubmitReviewResponse {
  success: boolean;
  completed: boolean;
  next_stage: number;
  next_review_date: string | null;
  message: string;
}

export async function getTodayReviewSummary(): Promise<TodayReviewSummary> {
  return request.get('/reviews/today/summary');
}

export async function getTodayReviews(): Promise<ReviewListResponse> {
  return request.get('/reviews/today/list');
}

export async function getReviewStats(): Promise<ReviewStats> {
  return request.get('/reviews/stats');
}

export async function getArticleReviewStatus(
  articleId: number,
): Promise<ArticleReviewStatus> {
  return request.get(`/reviews/article/${articleId}/status`);
}

export async function getReviewLogs(
  scheduleId: number,
): Promise<ReviewLogListResponse> {
  return request.get(`/reviews/${scheduleId}/logs`);
}

export async function submitReview(
  scheduleId: number,
  data: SubmitReviewRequest,
): Promise<SubmitReviewResponse> {
  return request.post(`/reviews/${scheduleId}/submit`, data);
}

export function getStageLabel(stage: number, totalStages: number): string {
  if (stage > totalStages) {
    return '已完成';
  }
  return `第 ${stage}/${totalStages} 轮`;
}

export function getStageInterval(
  stage: number,
  stageIntervalsDays: number[],
): string {
  if (stage < 1 || stage > stageIntervalsDays.length) {
    return '';
  }
  return `${stageIntervalsDays[stage - 1]}天后`;
}

export function formatReviewDueText(daysUntilNext: number): string {
  if (daysUntilNext < 0) {
    return `已逾期 ${Math.abs(daysUntilNext)} 天`;
  }
  if (daysUntilNext === 0) {
    return '今天复习';
  }
  return `${daysUntilNext}天后`;
}

export function getReviewProgress(
  currentStage: number | null,
  totalStages: number,
): number {
  if (!currentStage || currentStage < 1) {
    return 0;
  }
  if (currentStage > totalStages) {
    return 100;
  }
  if (totalStages <= 1) {
    return 100;
  }
  return Math.round(((currentStage - 1) / totalStages) * 100);
}
