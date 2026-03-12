/**
 * 用户相关 API
 */
import { get, post, put } from '@/utils/request';

export interface EnglishLevelInfo {
  level: number;
  label: string;
  cefr: string;
  vocabulary: number;
  description: string;
}

export interface LearningGoal {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface AssessmentQuestion {
  id: number;
  sentence: string;
  translation: string;
  level: number;
}

export interface AssessmentDataResponse {
  levels: EnglishLevelInfo[];
  goals: LearningGoal[];
  questions: AssessmentQuestion[];
}

export interface UpdateAssessmentRequest {
  english_level: number;
  learning_goals: string[];
  custom_goal?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatar?: string;
}

export interface UserInfo {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  english_level: number | null;
  learning_goals: string[] | null;
  custom_goal: string | null;
  has_completed_assessment: boolean;
  // 游戏化字段
  level?: number;
  total_xp?: number;
  today_xp?: number;
  streak_days?: number;
  study_days?: number;
  study_minutes?: number;
}

export interface UserProfileResponse {
  user: UserInfo;
  level_info: EnglishLevelInfo | null;
  goal_details: LearningGoal[];
}

/**
 * 获取评估数据
 */
export async function getAssessmentData(): Promise<AssessmentDataResponse> {
  return get<AssessmentDataResponse>('/user/assessment/data');
}

/**
 * 提交英语水平评估
 */
export async function submitAssessment(
  data: UpdateAssessmentRequest
): Promise<UserInfo> {
  return post<UserInfo>('/user/assessment', data);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  return get<UserInfo>('/user/me');
}

/**
 * 获取用户完整资料
 */
export async function getUserProfile(): Promise<UserProfileResponse> {
  return get<UserProfileResponse>('/user/profile');
}

/**
 * 更新用户资料
 */
export async function updateProfile(
  data: UpdateProfileRequest
): Promise<UserInfo> {
  return put<UserInfo>('/user/profile', data);
}

/**
 * 从 localStorage 获取缓存的用户信息
 */
export function getCachedUserInfo(): UserInfo | null {
  const userInfo = localStorage.getItem('user_info');
  if (userInfo) {
    try {
      return JSON.parse(userInfo) as UserInfo;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 检查是否需要完成评估
 */
export function needsAssessment(): boolean {
  const user = getCachedUserInfo();
  return user ? !user.has_completed_assessment : true;
}
