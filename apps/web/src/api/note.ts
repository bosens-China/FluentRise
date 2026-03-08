/**
 * 笔记模块 API
 *
 * 提供笔记的增删改查功能，支持关联文章创建笔记
 */
import request from '@/utils/request';

/**
 * 笔记数据模型
 */
export interface Note {
  /** 笔记 ID */
  id: number;
  /** 用户 ID */
  user_id: number;
  /** 笔记标题（可选） */
  title?: string;
  /** 笔记内容 */
  content: string;
  /** 关联文章 ID（可选） */
  article_id?: number;
  /** 关联文章标题（可选，后端返回） */
  article_title?: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 创建笔记请求参数
 */
export interface CreateNoteRequest {
  /** 笔记标题（可选） */
  title?: string;
  /** 笔记内容（必填） */
  content: string;
  /** 关联文章 ID（可选） */
  article_id?: number;
}

/**
 * 更新笔记请求参数
 */
export interface UpdateNoteRequest {
  /** 笔记标题（可选） */
  title?: string;
  /** 笔记内容（可选） */
  content?: string;
}

/**
 * 笔记列表响应数据
 */
export interface NoteListResponse {
  /** 笔记列表 */
  items: Note[];
  /** 总数 */
  total: number;
}

/**
 * 创建笔记
 * @param data - 创建笔记的请求数据
 * @returns 创建成功的笔记对象
 */
export async function createNote(data: CreateNoteRequest): Promise<Note> {
  return request.post('/notes', data);
}

/**
 * 获取笔记列表
 * @param params - 查询参数
 * @param params.page - 页码（可选，默认 1）
 * @param params.page_size - 每页数量（可选）
 * @param params.article_id - 按文章 ID 筛选（可选）
 * @returns 笔记列表响应数据
 */
export async function getNotes(params: {
  page?: number;
  page_size?: number;
  article_id?: number;
}): Promise<NoteListResponse> {
  return request.get('/notes', { params });
}

/**
 * 更新笔记
 * @param id - 笔记 ID
 * @param data - 更新笔记的请求数据
 * @returns 更新后的笔记对象
 */
export async function updateNote(id: number, data: UpdateNoteRequest): Promise<Note> {
  return request.patch(`/notes/${id}`, data);
}

/**
 * 删除笔记
 * @param id - 笔记 ID
 * @returns 删除结果
 */
export async function deleteNote(id: number): Promise<{ success: boolean }> {
  return request.delete(`/notes/${id}`);
}
