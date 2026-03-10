import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';

import { router } from './router';

// 为 TypeScript 注册路由类型
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// 渲染应用
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
