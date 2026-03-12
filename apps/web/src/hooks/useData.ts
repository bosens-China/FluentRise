/**
 * 统一的数据获取 Hooks
 * 
 * 封装 ahooks 的 useRequest，提供统一的错误处理和加载状态
 */

import { useRequest } from 'ahooks';
import { useCallback } from 'react';
import { toast } from '@/lib/toast';

/**
 * 标准数据获取 Hook - 自动执行
 */
export function useQuery<TData>(
  service: () => Promise<TData>,
  options: {
    showError?: boolean;
    onError?: (error: Error) => void;
    onSuccess?: (data: TData) => void;
    ready?: boolean;
  } = {}
) {
  const { showError = true, onError, onSuccess, ready = true } = options;

  return useRequest(service, {
    manual: false,
    ready,
    onError: (error) => {
      if (showError) {
        toast.error(error.message || '请求失败');
      }
      onError?.(error);
    },
    onSuccess: (data) => {
      onSuccess?.(data);
    },
  });
}

/**
 * 手动执行的 mutation Hook
 */
export function useMutation<TData, TParams extends unknown[] = [unknown]>(
  service: (...args: TParams) => Promise<TData>,
  options: {
    showError?: boolean;
    showSuccess?: boolean;
    successMessage?: string;
    onError?: (error: Error) => void;
    onSuccess?: (data: TData) => void;
  } = {}
) {
  const { 
    showError = true, 
    showSuccess = false, 
    successMessage,
    onError, 
    onSuccess 
  } = options;

  return useRequest(service, {
    manual: true,
    onError: (error) => {
      if (showError) {
        toast.error(error.message || '请求失败');
      }
      onError?.(error);
    },
    onSuccess: (data) => {
      if (showSuccess && successMessage) {
        toast.success(successMessage);
      }
      onSuccess?.(data);
    },
  });
}

/**
 * 分页查询 Hook
 */
interface PaginationParams {
  page?: number;
  pageSize?: number;
}

interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function usePagination<T>(
  service: (params: PaginationParams) => Promise<PaginationResult<T>>,
  options: {
    pageSize?: number;
    showError?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { pageSize: defaultPageSize = 10, showError = true, onError } = options;

  const { data, loading, run, params, refresh } = useRequest(
    (p: PaginationParams) => service(p),
    {
      manual: false,
      defaultParams: [{ page: 1, pageSize: defaultPageSize }],
      onError: (error) => {
        if (showError) {
          toast.error(error.message || '请求失败');
        }
        onError?.(error);
      },
    }
  );

  const currentPage = params?.[0]?.page ?? 1;
  const pageSize = params?.[0]?.pageSize ?? defaultPageSize;

  const changePage = useCallback((page: number) => {
    run({ page, pageSize });
  }, [run, pageSize]);

  const changePageSize = useCallback((newPageSize: number) => {
    run({ page: 1, pageSize: newPageSize });
  }, [run]);

  return {
    data,
    loading,
    pagination: {
      current: currentPage,
      pageSize,
      total: data?.total ?? 0,
      totalPages: data?.totalPages ?? 0,
      onChange: changePage,
      onPageSizeChange: changePageSize,
    },
    refresh,
  };
}
