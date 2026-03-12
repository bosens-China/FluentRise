/**
 * User Store - 全局用户状态管理
 * 
 * 使用 Zustand 管理用户认证状态和用户信息
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@/api/user';

interface UserState {
  // 状态
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: UserInfo | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  updateUser: (updates: Partial<UserInfo>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      
      setLoading: (value) => set({ isLoading: value }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'user-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// 便捷 hooks
export const useUser = () => useUserStore((state) => state.user);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
