/**
 * 认证工具函数。
 * 这里保留兼容导出，实际逻辑统一走 auth-storage。
 */

import {
  clearTokens,
  getStoredUserInfo,
  isAuthenticated,
} from '@/lib/auth-storage';

export function isLoggedIn(): boolean {
  return isAuthenticated();
}

export function getUserInfo(): { phone: string; nickname?: string } | null {
  return getStoredUserInfo<{ phone: string; nickname?: string }>();
}

export function clearAuth(): void {
  clearTokens();
}
