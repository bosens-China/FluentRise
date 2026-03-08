/**
 * 认证相关的自定义 Hooks
 */
import { useNavigate } from '@tanstack/react-router';
import { useRequest, useSetState } from 'ahooks';
import { message } from 'antd';
import { useEffect, useCallback } from 'react';

import {
  sendSmsCode,
  loginByPhone,
  logout,
  type UserInfo,
} from '@/api/auth';
import {
  getCurrentUser,
  getCachedUserInfo,
} from '@/api/user';
import { clearTokens, isAuthenticated } from '@/utils/request';

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
}

/**
 * 使用发送验证码
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
 * 使用手机号登录
 */
export function useLoginByPhone() {
  const navigate = useNavigate();
  const [state, setState] = useSetState<AuthState>({
    user: null,
    isLoading: false,
  });

  const { run, loading } = useRequest(loginByPhone, {
    manual: true,
    onSuccess: (data) => {
      setState({ user: data.user });
      message.success('登录成功！');
      navigate({ to: '/' });
    },
    onError: (error: Error) => {
      message.error(error.message || '登录失败，请重试');
    },
  });

  return {
    login: run,
    loading,
    user: state.user,
  };
}

/**
 * 使用退出登录
 */
export function useLogout() {
  const navigate = useNavigate();

  const { run, loading } = useRequest(logout, {
    manual: true,
    onSuccess: () => {
      message.success('已退出登录');
      navigate({ to: '/login' });
    },
    onError: () => {
      // 即使请求失败也清除本地状态
      clearTokens();
      navigate({ to: '/login' });
    },
  });

  return {
    logout: run,
    loading,
  };
}

/**
 * 使用当前用户信息
 */
export function useCurrentUser() {
  const [state, setState] = useSetState<AuthState>({
    user: null,
    isLoading: true,
  });

  const { run } = useRequest(getCurrentUser, {
    manual: true,
    onSuccess: (data) => {
      setState({ user: data, isLoading: false });
      // 更新缓存
      localStorage.setItem('user_info', JSON.stringify(data));
    },
    onError: () => {
      // 使用缓存数据
      const cached = getCachedUserInfo();
      setState({ user: cached, isLoading: false });
    },
  });

  useEffect(() => {
    // 先使用缓存数据
    const cached = getCachedUserInfo();
    if (cached) {
      setState({ user: cached, isLoading: false });
    }
    
    // 如果已登录，获取最新数据
    if (isAuthenticated()) {
      run();
    } else {
      setState({ isLoading: false });
    }
  }, [run, setState]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    refresh: run,
  };
}

/**
 * 使用认证状态检查
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
