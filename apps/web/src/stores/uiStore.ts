/**
 * UI Store - 全局 UI 状态管理
 * 
 * 管理主题、侧边栏状态等 UI 相关状态
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // 主题
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarCollapsed: false,
      mobileMenuOpen: false,

      setTheme: (theme: UIState['theme']) => {
        set({ theme });
        applyTheme(theme);
      },

      toggleTheme: () => {
        set((state: UIState) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          applyTheme(newTheme);
          return { theme: newTheme };
        });
      },

      toggleSidebar: () =>
        set((state: UIState) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setMobileMenuOpen: (open: boolean) => set({ mobileMenuOpen: open }),
    }),
    {
      name: 'ui-store',
      partialize: (state: UIState) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  )
);

// 应用主题到 DOM
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// 初始化系统主题监听
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', (e) => {
    const store = useUIStore.getState();
    if (store.theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}
