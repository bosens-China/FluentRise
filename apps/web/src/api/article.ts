/**
 * 文章模块 API
 *
 * 提供文章获取、生成、历史记录、阅读进度更新等功能
 */
import request from '@/utils/request';

/**
 * 双语内容
 */
export interface BilingualContent {
  /** 英文内容 */
  en: string;
  /** 中文内容 */
  zh: string;
  /** 说话人（可选） */
  speaker?: string;
}

/**
 * 语法点
 */
export interface GrammarPoint {
  /** 语法点名称 */
  point: string;
  /** 语法点解释 */
  explanation: string;
  /** 示例列表 */
  examples: BilingualContent[];
}

/**
 * 文化贴士
 */
export interface CultureTip {
  /** 贴士标题 */
  title: string;
  /** 贴士内容 */
  content: string;
}

/**
 * 练习题
 */
export interface Exercise {
  /** 题目类型：选择题、填空题、翻译题 */
  type: 'choice' | 'fill' | 'translation';
  /** 题目内容 */
  question: string;
  /** 选项（选择题时必填） */
  options?: string[];
  /** 答案 */
  answer?: string;
}

/**
 * 生词
 */
export interface VocabularyWord {
  word: string;
  uk_phonetic?: string;
  us_phonetic?: string;
  meaning: string;
}

/**
 * 文章详情
 */
export interface Article {
  /** 文章 ID */
  id: number;
  /** 文章标题 */
  title: string;
  /** 发布日期 */
  publish_date: string;
  /** 文章难度等级 */
  level: number;
  /** 来源书籍 ID（可选） */
  source_book: number | null;
  /** 来源课程 ID（可选） */
  source_lesson: number | null;
  /** 生词列表 */
  vocabulary: VocabularyWord[] | null;
  /** 双语内容段落列表 */
  content: BilingualContent[];
  /** 语法点列表 */
  grammar: GrammarPoint[];
  /** 文化贴士列表 */
  tips: CultureTip[];
  /** 练习题列表 */
  exercises: Exercise[];
  /** 阅读进度（段落索引） */
  is_read: number;
  /** 是否已完成阅读 */
  is_completed: boolean;
  /** 创建时间 */
  created_at: string;
}

/**
 * 今日文章响应
 */
export interface TodayArticleResponse {
  /** 是否存在今日文章 */
  has_article: boolean;
  /** 文章对象（不存在时为 null） */
  article: Article | null;
}

/**
 * 获取今日文章
 * @returns 今日文章响应数据
 */
export async function getTodayArticle(): Promise<TodayArticleResponse> {
  return request.get('/articles/today');
}

/**
 * 生成今日文章
 * @param forceRegenerate - 是否强制重新生成（默认 false）
 * @param targetDate - 目标日期，格式为 YYYY-MM-DD（可选，默认今日）
 * @returns 生成的文章对象
 */
export async function generateTodayArticle(
  forceRegenerate = false,
  targetDate?: string,
): Promise<Article> {
  return request.post(
    '/articles/today/generate',
    {
      force_regenerate: forceRegenerate,
      target_date: targetDate,
    },
    {
      timeout: 120000, // 增加超时时间到 2 分钟
    },
  );
}

/**
 * 文章列表项
 */
export interface ArticleListItem {
  id: number;
  title: string;
  publish_date: string;
  level: number;
  is_completed: boolean;
  created_at: string;
}

/**
 * 历史文章列表响应
 */
export interface ArticleListResponse {
  items: ArticleListItem[];
  total: number;
}

/**
 * 获取历史文章列表
 * @param page - 页码（默认 1）
 * @param pageSize - 每页数量（默认 10）
 * @returns 历史文章列表
 */
export async function getArticleHistory(page = 1, pageSize = 10): Promise<ArticleListResponse> {
  return request.get('/articles/history', {
    params: { page, page_size: pageSize },
  });
}

/**
 * 获取文章详情
 * @param articleId - 文章 ID
 * @returns 文章详情对象
 */
export async function getArticleDetail(articleId: number): Promise<Article> {
  return request.get(`/articles/${articleId}`);
}

/**
 * 更新阅读进度
 * @param articleId - 文章 ID
 * @param isRead - 当前阅读到的段落索引
 * @param isCompleted - 是否已完成阅读（可选）
 * @returns 更新后的文章对象
 */
export async function updateArticleProgress(
  articleId: number,
  isRead: number,
  isCompleted?: boolean,
): Promise<Article> {
  return request.patch(`/articles/${articleId}/progress`, {
    is_read: isRead,
    is_completed: isCompleted,
  });
}

/**
 * 生成文章音频
 * @param articleId - 文章 ID
 * @returns 音频 Blob URL
 */
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
