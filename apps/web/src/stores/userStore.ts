/**
 * 全局用户会话状态。
 *
 * token 仍然保存在 auth-storage 中，
 * Zustand 只负责应用内的用户态与加载态。
 */

import { create } from 'zustand';

import type { UserInfo } from '@/api/user';
import {
  clearStoredUserInfo,
  getStoredUserInfo,
  isAuthenticated as hasAccessToken,
  setStoredUserInfo,
} from '@/lib/auth-storage';

interface UserState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (user: UserInfo | null) => void;
  clearSession: () => void;
  setLoading: (value: boolean) => void;
  syncFromStorage: () => void;
  updateUser: (updates: Partial<UserInfo>) => void;
}

function readInitialUser(): UserInfo | null {
  return getStoredUserInfo<UserInfo>();
}

export const useUserStore = create<UserState>()((set) => ({
  user: readInitialUser(),
  isAuthenticated: hasAccessToken(),
  isLoading: false,

  setSession: (user: UserInfo | null) => {
    if (user) {
      setStoredUserInfo(user);
    } else {
      clearStoredUserInfo();
    }

    set({
      user,
      isAuthenticated: user ? hasAccessToken() : false,
      isLoading: false,
    });
  },

  clearSession: () => {
    clearStoredUserInfo();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (value: boolean) => set({ isLoading: value }),

  syncFromStorage: () =>
    set({
      user: readInitialUser(),
      isAuthenticated: hasAccessToken(),
    }),

  updateUser: (updates: Partial<UserInfo>) =>
    set((state: UserState) => {
      const nextUser = state.user ? { ...state.user, ...updates } : null;
      if (nextUser) {
        setStoredUserInfo(nextUser);
      }
      return { user: nextUser };
    }),
}));

export const useUser = () => useUserStore((state: UserState) => state.user);
export const useIsAuthenticated = () =>
  useUserStore((state: UserState) => state.isAuthenticated);
export const useAuthLoading = () => useUserStore((state: UserState) => state.isLoading);

export function setAuthSession(user: UserInfo | null): void {
  useUserStore.getState().setSession(user);
}

export function clearAuthSession(): void {
  useUserStore.getState().clearSession();
}

export function syncAuthSession(): void {
  useUserStore.getState().syncFromStorage();
}
