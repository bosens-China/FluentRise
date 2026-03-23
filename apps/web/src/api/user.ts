/**
 * 用户相关 API
 */
import { getStoredUserInfo } from '@/lib/auth-storage';
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

export interface MembershipStatus {
  status: string;
  plan_name: string;
  days_left: number;
  expires_at: string;
  payment_ready: boolean;
  multimodal_ready: boolean;
}

export interface DashboardOverview {
  streak_days: number;
  today_checked_in: boolean;
  completed_lessons: number;
  vocabulary_total: number;
  review_pending_total: number;
  mistake_pending_total: number;
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

export async function getAssessmentData(): Promise<AssessmentDataResponse> {
  return get<AssessmentDataResponse>('/user/assessment/data');
}

export async function submitAssessment(
  data: UpdateAssessmentRequest,
): Promise<UserInfo> {
  return post<UserInfo>('/user/assessment', data);
}

export async function reassess(
  data: UpdateAssessmentRequest,
): Promise<UserInfo> {
  return put<UserInfo>('/user/assessment', data);
}

export async function getCurrentUser(): Promise<UserInfo> {
  return get<UserInfo>('/user/me');
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return get<UserProfileResponse>('/user/profile');
}

export async function getMembershipStatus(): Promise<MembershipStatus> {
  return get<MembershipStatus>('/user/membership');
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return get<DashboardOverview>('/user/dashboard-overview');
}

export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<UserInfo> {
  return put<UserInfo>('/user/profile', data);
}

export function getCachedUserInfo(): UserInfo | null {
  return getStoredUserInfo<UserInfo>();
}

export function needsAssessment(): boolean {
  const user = getCachedUserInfo();
  return user ? !user.has_completed_assessment : true;
}
