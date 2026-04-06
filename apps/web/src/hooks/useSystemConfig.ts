import { useRequest } from 'ahooks';

import { systemApi } from '@/api/system';

const SYSTEM_CONFIG_CACHE_KEY = 'system-config';
const SYSTEM_CONFIG_STALE_TIME = 5 * 60 * 1000;

export function useSystemConfig() {
  return useRequest(() => systemApi.getConfig(), {
    cacheKey: SYSTEM_CONFIG_CACHE_KEY,
    staleTime: SYSTEM_CONFIG_STALE_TIME,
  });
}
