import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置 dayjs 中文 locale
dayjs.locale('zh-cn');

// Ant Design 主题配置 - 与新设计系统保持一致
const customTheme = {
  token: {
    colorPrimary: '#58CC02',
    colorInfo: '#1CB0F6',
    colorSuccess: '#58CC02',
    colorWarning: '#FFC800',
    colorError: '#FF4B4B',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      borderRadius: 12,
      controlHeight: 48,
      controlHeightLG: 56,
      paddingInline: 24,
    },
    Input: {
      borderRadius: 12,
      controlHeight: 48,
      paddingInline: 16,
    },
    Card: {
      borderRadius: 16,
      paddingLG: 24,
    },
    Form: {
      verticalLabelPadding: '0 0 8px',
      itemMarginBottom: 24,
    },
  },
};

export const Route = createRootRoute({
  component: () => (
    <ConfigProvider locale={zhCN} theme={customTheme}>
      <AntdApp>
        <Outlet />
      </AntdApp>
    </ConfigProvider>
  ),
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
      <div className="text-center">
        <div className="mb-6 text-8xl font-black text-[var(--primary)]">404</div>
        <h1 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">
          页面未找到
        </h1>
        <p className="mb-8 text-[var(--text-secondary)]">
          抱歉，您访问的页面不存在或已被移除
        </p>
        <a
          href="/"
          className="inline-flex items-center rounded-xl bg-[var(--primary)] px-8 py-3 font-bold text-white shadow-[0_4px_0_rgb(76,176,2)] hover:translate-y-[1px] hover:shadow-[0_3px_0_rgb(76,176,2)] active:translate-y-[2px] active:shadow-[0_2px_0_rgb(76,176,2)] transition-all"
        >
          返回首页
        </a>
      </div>
    </div>
  ),
});
