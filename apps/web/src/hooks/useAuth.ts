/**
 * 认证相关自定义 Hooks。
 */

import { useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';
import { useEffect, useCallback } from 'react';

import { sendSmsCode, loginByPhone, logout, type UserInfo } from '@/api/auth';
import { getCurrentUser, getCachedUserInfo } from '@/api/user';
import { clearTokens, isAuthenticated, setTokens } from '@/lib/auth-storage';
import { message } from '@/lib/toast';
import {
  clearAuthSession,
  setAuthSession,
  syncAuthSession,
  useAuthLoading,
  useUser,
  useUserStore,
} from '@/stores/userStore';

/**
 * 发送验证码。
 */
export function useSendSmsCode() {
  const { run, loading } = useRequest(sendSmsCode, {
    manual: true,
    onSuccess: (data: { message: string }) => {
      message.success(data.message);
    },
    onError: (error: Error) => {
      message.error(error.message || '发送失败，请重试');
    },
  });

  return {
    sendCode: run,
    sending: loading,
  };
}

/**
 * 手机号登录。
 */
export function useLoginByPhone() {
  const navigate = useNavigate();
  const user = useUser();

  const { run, loading } = useRequest(loginByPhone, {
    manual: true,
    onSuccess: (data) => {
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
      setAuthSession(data.user);
      message.success('登录成功');
      navigate({ to: '/' });
    },
    onError: (error: Error) => {
      message.error(error.message || '登录失败，请重试');
    },
  });

  return {
    login: run,
    loading,
    user,
  };
}

/**
 * 退出登录。
 */
export function useLogout() {
  const navigate = useNavigate();

  const { run, loading } = useRequest(logout, {
    manual: true,
    onSuccess: () => {
      clearTokens();
      clearAuthSession();
      message.success('已退出登录');
      navigate({ to: '/login' });
    },
    onError: () => {
      clearTokens();
      clearAuthSession();
      navigate({ to: '/login' });
    },
  });

  return {
    logout: run,
    loading,
  };
}

/**
 * 当前用户信息。
 */
export function useCurrentUser() {
  const user = useUser();
  const isLoading = useAuthLoading();
  const setLoading = useUserStore(
    (state: ReturnType<typeof useUserStore.getState>) => state.setLoading,
  );

  const { run } = useRequest(getCurrentUser, {
    manual: true,
    onSuccess: (data: UserInfo) => {
      setAuthSession(data);
    },
    onError: () => {
      const cached = getCachedUserInfo();
      if (cached) {
        setAuthSession(cached);
        return;
      }

      clearTokens();
      clearAuthSession();
    },
    onFinally: () => {
      setLoading(false);
    },
  });

  useEffect(() => {
    syncAuthSession();

    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void run();
  }, [run, setLoading]);

  return {
    user,
    isLoading,
    refresh: run,
  };
}

/**
 * 认证状态检查。
 */
export function useAuthCheck() {
  const navigate = useNavigate();

  const checkAuth = useCallback(() => {
    if (!isAuthenticated()) {
      navigate({ to: '/login' });
      return false;
    }
    return true;
  }, [navigate]);

  return { checkAuth };
}
