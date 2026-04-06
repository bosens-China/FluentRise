/**
 * API 请求工具。
 *
 * 统一处理鉴权头、刷新令牌和错误跳转。
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  setTokens,
} from '@/lib/auth-storage';
import { router } from '@/router';
import { clearAuthSession, syncAuthSession } from '@/stores/userStore';

const request: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function subscribeTokenRefresh(
  resolve: (token: string) => void,
  reject: (error: Error) => void,
): void {
  refreshSubscribers.push({ resolve, reject });
}

function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((subscriber) => subscriber.resolve(newToken));
  refreshSubscribers = [];
}

function onTokenRefreshFailed(error: Error): void {
  refreshSubscribers.forEach((subscriber) => subscriber.reject(error));
  refreshSubscribers = [];
}

function clearLocalSession(): void {
  clearTokens();
  clearAuthSession();
}

function redirectToLogin(): void {
  void router.navigate({ to: '/login', replace: true });
}

async function doRefreshToken(refreshTokenValue: string): Promise<void> {
  const response = await axios.post<{
    access_token: string;
    refresh_token: string;
  }>(`${request.defaults.baseURL}/auth/refresh`, {
    refresh_token: refreshTokenValue,
  });

  const { access_token, refresh_token } = response.data;
  setTokens(access_token, refresh_token);
  syncAuthSession();
  onTokenRefreshed(access_token);
}

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (
    error: AxiosError<{ message?: string; error?: string; detail?: string }>,
  ) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        clearLocalSession();
        redirectToLogin();
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        clearLocalSession();
        redirectToLogin();
        return Promise.reject(new Error('登录已过期，请重新登录'));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(request(originalRequest));
          }, reject);
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        await doRefreshToken(refreshTokenValue);
        isRefreshing = false;
        originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
        return request(originalRequest);
      } catch {
        isRefreshing = false;
        const refreshError = new Error('登录已过期，请重新登录');
        onTokenRefreshFailed(refreshError);
        clearLocalSession();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    const detailMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error;
    const resolvedMessage = Array.isArray(detailMessage)
      ? detailMessage.join('；')
      : detailMessage;
    const finalMessage = resolvedMessage || error.message || '请求失败';

    if (error.response?.status === 404 && finalMessage === '用户不存在') {
      clearLocalSession();
      redirectToLogin();
      return Promise.reject(new Error('用户登录状态已失效，请重新登录'));
    }

    if (error.response?.status === 403 && finalMessage === '用户已被禁用') {
      clearLocalSession();
      redirectToLogin();
      return Promise.reject(new Error('当前账号已被禁用，请联系管理员'));
    }

    return Promise.reject(new Error(finalMessage));
  },
);

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

export {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  setTokens,
};

export default request;
