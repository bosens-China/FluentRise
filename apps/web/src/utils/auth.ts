/**
 * 认证工具函数
 */

/**
 * 检查用户是否已登录
 */
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('access_token');
  return !!token;
}

/**
 * 获取存储的用户信息
 */
export function getUserInfo(): { phone: string; nickname?: string } | null {
  if (typeof window === 'undefined') return null;
  const userInfo = localStorage.getItem('user_info');
  if (userInfo) {
    try {
      return JSON.parse(userInfo);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 清除登录状态
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
}
