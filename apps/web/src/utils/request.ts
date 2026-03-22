/**
 * API 请求工具 - Axios 版本
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { router } from '@/router';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 是否正在刷新 Token
let isRefreshing = false;
// 等待 Token 刷新的请求队列
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * 获取存储的 access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

/**
 * 获取存储的 refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

/**
 * 设置令牌
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

/**
 * 清除令牌
 */
export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
}

/**
 * 订阅 Token 刷新
 */
function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: Error) => void,
): void {
  refreshSubscribers.push({ resolve, reject });
}

/**
 * 通知所有订阅者 Token 已刷新
 */
function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(newToken));
  refreshSubscribers = [];
}

/**
 * 通知所有订阅者 Token 刷新失败
 */
function onTokenRefreshFailed(error: Error): void {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
}

/**
 * 统一跳转到登录页
 */
function redirectToLogin(): void {
  void router.navigate({ to: '/login', replace: true });
}

/**
 * 执行 Token 刷新
 */
async function doRefreshToken(refreshTokenValue: string): Promise<void> {
  const response = await axios.post(
    `${request.defaults.baseURL}/auth/refresh`,
    { refresh_token: refreshTokenValue },
  );

  const { access_token, refresh_token } = response.data;
  setTokens(access_token, refresh_token);
  onTokenRefreshed(access_token);
}

// 请求拦截器 - 添加认证头
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// 响应拦截器 - 处理 Token 刷新
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError<{ message?: string; error?: string; detail?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 处理 401 错误 - Token 过期
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 排除刷新端点，避免循环
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        clearTokens();
        redirectToLogin();
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      // 如果正在刷新，等待刷新完成
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(request(originalRequest));
          }, reject);
        });
      }

      // 开始刷新 Token
      isRefreshing = true;
      originalRequest._retry = true;

      try {
        await doRefreshToken(refreshTokenValue);
        isRefreshing = false;

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
        return request(originalRequest);
      } catch {
        isRefreshing = false;
        const refreshError = new Error('登录已过期，请重新登录');
        onTokenRefreshFailed(refreshError);
        clearTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    // 统一错误处理
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '请求失败';

    // 处理用户账号异常 (被删除或禁用)
    if (error.response?.status === 404 && message === '用户不存在') {
      clearTokens();
      redirectToLogin();
      return Promise.reject(new Error('用户登录已失效，请重新登录'));
    }

    if (error.response?.status === 403 && message === '用户已被禁用') {
      clearTokens();
      redirectToLogin();
      return Promise.reject(new Error('当前账号已被禁用，请联系管理员'));
    }

    return Promise.reject(new Error(message));
  },
);

// 导出便捷方法
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  request.get(url, config);

export const post = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => request.post(url, data, config);

export const put = <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => request.put(url, data, config);

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  request.delete(url, config);

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export default request;
