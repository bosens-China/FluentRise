/**
 * 统一的认证信息存储工具。
 * 集中管理 token 和用户缓存，避免各处直接操作 localStorage。
 */

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_INFO_KEY = 'user_info';

function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

function readStorage(key: string): string | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    // 忽略存储异常，避免影响主流程。
  }
}

function removeStorage(key: string): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略存储异常，避免影响主流程。
  }
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  writeStorage(ACCESS_TOKEN_KEY, accessToken);
  writeStorage(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(REFRESH_TOKEN_KEY);
  removeStorage(USER_INFO_KEY);
}

export function setStoredUserInfo(user: unknown): void {
  writeStorage(USER_INFO_KEY, JSON.stringify(user));
}

export function getStoredUserInfo<T>(): T | null {
  const raw = readStorage(USER_INFO_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeStorage(USER_INFO_KEY);
    return null;
  }
}

export function clearStoredUserInfo(): void {
  removeStorage(USER_INFO_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
