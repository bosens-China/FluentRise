import { createRootRoute, Outlet } from '@tanstack/react-router';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置 dayjs 中文 locale
dayjs.locale('zh-cn');

// 自定义主题配置
const customTheme = {
  token: {
    colorPrimary: '#4f46e5',
    colorInfo: '#4f46e5',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontSize: 14,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 8px 40px rgba(0, 0, 0, 0.12)',
  },
  components: {
    Button: {
      borderRadius: 10,
      controlHeight: 44,
      controlHeightLG: 52,
      paddingInline: 24,
    },
    Input: {
      borderRadius: 10,
      controlHeight: 48,
      paddingInline: 16,
    },
    Card: {
      borderRadius: 20,
      paddingLG: 32,
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
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
      <div className="text-center">
        <div className="mb-6 text-8xl font-bold text-indigo-600">404</div>
        <h1 className="mb-4 text-2xl font-semibold text-gray-800">页面未找到</h1>
        <p className="mb-8 text-gray-500">抱歉，您访问的页面不存在或已被移除</p>
        <a
          href="/"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-8 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-300"
        >
          返回首页
        </a>
      </div>
    </div>
  ),
});
