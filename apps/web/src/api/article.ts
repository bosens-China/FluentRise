/**
 * 文章模块 API
 */
import request from '@/utils/request';

export interface BilingualContent {
  en: string;
  zh: string;
  speaker?: string;
}

export interface GrammarPoint {
  point: string;
  explanation: string;
  examples: BilingualContent[];
}

export interface CultureTip {
  title: string;
  content: string;
}

export interface Exercise {
  type: 'choice' | 'fill' | 'translation';
  question: string;
  options?: string[];
  answer?: string;
}

export interface VocabularyWord {
  word: string;
  uk_phonetic?: string;
  us_phonetic?: string;
  meaning: string;
}

export interface ExerciseResultItem {
  question: string;
  expected_answer: string;
  user_answer?: string;
  is_correct: boolean;
}

export interface ArticleAudioWordTiming {
  text: string;
  start_ms: number;
  end_ms: number;
}

export interface ArticleAudioSegmentTiming {
  paragraph_index: number;
  speaker?: string;
  text: string;
  start_ms: number;
  end_ms: number;
  words: ArticleAudioWordTiming[];
}

export interface ArticleAudioTimelineResponse {
  segments: ArticleAudioSegmentTiming[];
}

export interface Article {
  id: number;
  title: string;
  publish_date: string | null;
  level: number;
  source_book: number | null;
  source_lesson: number | null;
  vocabulary: VocabularyWord[] | null;
  content: BilingualContent[];
  grammar: GrammarPoint[];
  tips: CultureTip[];
  exercises: Exercise[] | null;
  is_read: number;
  is_completed: boolean;
  needs_repeat: boolean;
  created_at: string;
}

export interface ArticleProposal {
  id: number;
  title: string;
  description: string | null;
  level: number;
  order_index: number;
  status: 'pending' | 'realized';
  article_id: number | null;
  created_at: string;
}

export interface LearningPathResponse {
  completed_articles: {
    id: number;
    title: string;
    level: number;
    completed_at: string | null;
  }[];
  proposals: ArticleProposal[];
  current_level: number;
  total_vocab_count: number;
}

export interface ArticleListItem {
  id: number;
  title: string;
  publish_date: string | null;
  level: number;
  is_completed: boolean;
  needs_repeat: boolean;
  created_at: string;
}

export interface ArticleListResponse {
  items: ArticleListItem[];
  total: number;
}

export interface MiniStoryResponse {
  story_en: string;
  story_zh: string;
  questions: {
    id: string;
    question_en: string;
    question_zh: string;
  }[];
}

export interface MiniStoryEvaluateRequest {
  story_en: string;
  questions: { id: string; question_en: string }[];
  answers: Record<string, string>;
}

export interface MiniStoryEvaluateResponse {
  is_passed: boolean;
  score: number;
  feedback_zh: string;
}

export async function getLearningPath(): Promise<LearningPathResponse> {
  return request.get('/articles/path');
}

export async function realizeProposal(proposalId: number): Promise<Article> {
  return request.post(`/articles/proposals/${proposalId}/realize`, {}, {
    timeout: 120000,
  });
}

export async function generateTodayArticle(
  params: { forceRegenerate?: boolean; targetDate?: string; feedbackReason?: string; feedbackComment?: string } = {},
): Promise<Article> {
  return request.post(
    '/articles/today/generate',
    {
      force_regenerate: params.forceRegenerate ?? false,
      target_date: params.targetDate,
      feedback_reason: params.feedbackReason,
      feedback_comment: params.feedbackComment,
    },
    {
      timeout: 120000,
    },
  );
}

export async function getArticleHistory(
  page = 1,
  pageSize = 10,
): Promise<ArticleListResponse> {
  return request.get('/articles/history', {
    params: { page, page_size: pageSize },
  });
}

export async function getArticleDetail(articleId: number): Promise<Article> {
  return request.get(`/articles/${articleId}`);
}

export async function updateArticleProgress(
  articleId: number,
  isRead: number,
  isCompleted?: boolean,
  exerciseResults?: ExerciseResultItem[],
  needsRepeat?: boolean,
): Promise<Article> {
  return request.patch(`/articles/${articleId}/progress`, {
    is_read: isRead,
    is_completed: isCompleted,
    needs_repeat: needsRepeat,
    exercise_results: exerciseResults,
  });
}

export async function generateArticleAudio(articleId: number): Promise<string> {
  const response = await request.post(
    `/articles/${articleId}/audio`,
    {},
    {
      responseType: 'blob',
    },
  );
  return URL.createObjectURL(response as unknown as Blob);
}

export async function getArticleAudioTimeline(
  articleId: number,
): Promise<ArticleAudioTimelineResponse> {
  return request.get(`/articles/${articleId}/audio-timeline`);
}

export async function generateArticleMiniStory(
  articleId: number,
): Promise<MiniStoryResponse> {
  return request.post(`/articles/${articleId}/mini-story/generate`);
}

export async function evaluateArticleMiniStory(
  articleId: number,
  data: MiniStoryEvaluateRequest,
): Promise<MiniStoryEvaluateResponse> {
  return request.post(`/articles/${articleId}/mini-story/evaluate`, data);
}
