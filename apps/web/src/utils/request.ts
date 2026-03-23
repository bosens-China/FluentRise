/**
 * API 请求工具。
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
        clearTokens();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      '请求失败';

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
