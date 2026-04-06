/**
 * 统一的数据请求 Hooks
 */

import { useRequest } from 'ahooks';
import { type DependencyList } from 'react';

import { toast } from '@/lib/toast';

interface RequestOptions {
  showError?: boolean;
  onError?: (error: Error) => void;
}

interface QueryOptions<TData, TParams extends unknown[]>
  extends RequestOptions {
  onSuccess?: (data: TData, params: TParams) => void;
  ready?: boolean;
  manual?: boolean;
  refreshDeps?: DependencyList;
  defaultParams?: TParams;
}

export function useQuery<TData, TParams extends unknown[] = []>(
  service: (...args: TParams) => Promise<TData>,
  options: QueryOptions<TData, TParams> = {},
) {
  const {
    showError = true,
    onError,
    onSuccess,
    ready = true,
    manual = false,
    refreshDeps,
    defaultParams,
  } = options;

  return useRequest(service, {
    manual,
    ready,
    refreshDeps,
    defaultParams,
    onError: (error) => {
      if (showError) {
        toast.error(error.message || '请求失败');
      }
      onError?.(error);
    },
    onSuccess: (data, params) => {
      onSuccess?.(data, params);
    },
  });
}

interface MutationOptions<TData, TParams extends unknown[]> extends RequestOptions {
  onSuccess?: (data: TData, params: TParams) => void;
  showSuccess?: boolean;
  successMessage?: string;
}

export function useMutation<TData, TParams extends unknown[] = []>(
  service: (...args: TParams) => Promise<TData>,
  options: MutationOptions<TData, TParams> = {},
) {
  const {
    showError = true,
    showSuccess = false,
    successMessage,
    onError,
    onSuccess,
  } = options;

  return useRequest(service, {
    manual: true,
    onError: (error) => {
      if (showError) {
        toast.error(error.message || '请求失败');
      }
      onError?.(error);
    },
    onSuccess: (data, params) => {
      if (showSuccess && successMessage) {
        toast.success(successMessage);
      }
      onSuccess?.(data, params);
    },
  });
}
