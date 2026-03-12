/**
 * ErrorBoundary - 错误边界组件
 * 
 * 捕获 React 组件树中的错误，防止整个应用崩溃
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)]">
          <div className="max-w-md w-full text-center">
            <div className="h-20 w-20 mx-auto mb-6 rounded-2xl bg-[var(--error-light)] flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-[var(--error)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              出错了
            </h1>
            <p className="text-[var(--text-secondary)] mb-6">
              抱歉，应用遇到了问题。请尝试刷新页面。
            </p>
            {this.state.error && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--bg-secondary)] text-left">
                <p className="text-xs text-[var(--text-tertiary)] font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <Button onClick={this.handleReset}>
              <RefreshCw className="h-5 w-5" />
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 页面级别的错误处理组件
 */
export function PageError({ 
  error, 
  reset 
}: { 
  error: Error; 
  reset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
      <div className="h-16 w-16 mb-4 rounded-2xl bg-[var(--error-light)] flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-[var(--error)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        加载失败
      </h2>
      <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
        {error.message || '请求失败，请稍后重试'}
      </p>
      {reset && (
        <Button onClick={reset} variant="outline">
          <RefreshCw className="h-5 w-5" />
          重试
        </Button>
      )}
    </div>
  );
}
