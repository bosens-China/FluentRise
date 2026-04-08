/**
 * Toast 通知工具。
 * 使用 antd message 的静态 API，可在非 React 上下文中调用。
 */

import { message } from 'antd';

export const toast = {
  success: (content: string) => message.success(content),
  error: (content: string) => message.error(content),
  info: (content: string) => message.info(content),
  warning: (content: string) => message.warning(content),
};

export { message };
