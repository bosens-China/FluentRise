/* eslint-disable react-refresh/only-export-components */
/**
 * 轻量级 Toast 通知系统
 * 替代 antd 的 message 组件
 */

import { createRoot } from 'react-dom/client';
import React, { useEffect, useState } from 'react';

interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastOptions['type'];
}

// 全局 toast 状态
let toasts: ToastItem[] = [];
let listeners: ((toasts: ToastItem[]) => void)[] = [];
let toastContainer: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function addToast(message: string, type: ToastOptions['type'] = 'info') {
  const id = Math.random().toString(36).substring(2, 9);
  const toast: ToastItem = { id, message, type };
  
  toasts = [...toasts, toast];
  notify();

  // 自动移除
  setTimeout(() => {
    removeToast(id);
  }, 3000);

  return id;
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function subscribe(listener: (toasts: ToastItem[]) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

// 获取 toast 样式
function getToastStyles(type: ToastOptions['type']): string {
  switch (type) {
    case 'success':
      return 'bg-[var(--success)] text-white';
    case 'error':
      return 'bg-[var(--error)] text-white';
    case 'warning':
      return 'bg-[var(--warning)] text-white';
    default:
      return 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]';
  }
}

// Toast 组件
function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribe(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={[
            'px-4 py-3 rounded-xl shadow-lg font-medium text-sm',
            'animate-slide-up pointer-events-auto min-w-[200px] text-center',
            getToastStyles(toast.type),
          ].join(' ')}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// 初始化 toast 容器
function initToastContainer() {
  if (typeof document === 'undefined') return;
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    root = createRoot(toastContainer);
    root.render(React.createElement(ToastContainer));
  }
}

// 导出 toast API
export const toast = {
  success(message: string) {
    initToastContainer();
    return addToast(message, 'success');
  },
  error(message: string) {
    initToastContainer();
    return addToast(message, 'error');
  },
  info(message: string) {
    initToastContainer();
    return addToast(message, 'info');
  },
  warning(message: string) {
    initToastContainer();
    return addToast(message, 'warning');
  },
};

// 为了保持与旧代码兼容，提供 message 对象
export const message = toast;
