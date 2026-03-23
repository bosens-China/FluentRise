import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  getPracticeHistory,
  getPracticeStats,
  type PracticeSession,
  type PracticeStats,
} from '@/api/playground';
import { toast } from '@/lib/toast';

const HISTORY_PAGE_SIZE = 8;

export function usePlaygroundInsights() {
  const [showInsightsDrawer, setShowInsightsDrawer] = useState(false);

  const statsQuery = useQuery({
    queryKey: ['playground', 'stats'],
    queryFn: getPracticeStats,
    enabled: showInsightsDrawer,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ['playground', 'history', HISTORY_PAGE_SIZE],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getPracticeHistory(pageParam, HISTORY_PAGE_SIZE),
    enabled: showInsightsDrawer,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (total, page) => total + page.sessions.length,
        0,
      );
      return loadedCount < lastPage.total ? allPages.length + 1 : undefined;
    },
  });

  useEffect(() => {
    if (statsQuery.error instanceof Error) {
      toast.error(statsQuery.error.message || '加载训练统计失败');
    }
  }, [statsQuery.error]);

  useEffect(() => {
    if (historyQuery.error instanceof Error) {
      toast.error(historyQuery.error.message || '加载训练记录失败');
    }
  }, [historyQuery.error]);

  const practiceHistory = useMemo<PracticeSession[]>(
    () => historyQuery.data?.pages.flatMap((page) => page.sessions) ?? [],
    [historyQuery.data],
  );

  const historyTotal = historyQuery.data?.pages[0]?.total ?? 0;

  const refreshInsights = useCallback(async () => {
    await Promise.all([statsQuery.refetch(), historyQuery.refetch()]);
  }, [historyQuery, statsQuery]);

  const openInsights = useCallback(() => {
    setShowInsightsDrawer(true);
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (!historyQuery.hasNextPage || historyQuery.isFetchingNextPage) {
      return;
    }
    await historyQuery.fetchNextPage();
  }, [historyQuery]);

  return {
    showInsightsDrawer,
    setShowInsightsDrawer,
    practiceStats: (statsQuery.data ?? null) as PracticeStats | null,
    practiceHistory,
    historyPage: historyQuery.data?.pages.length ?? 1,
    hasMoreHistory: Boolean(historyQuery.hasNextPage),
    statsLoading: statsQuery.isPending || statsQuery.isFetching,
    historyLoading: historyQuery.isPending || historyQuery.isFetchingNextPage,
    openInsights,
    refreshInsights,
    loadMoreHistory,
    historyTotal,
  };
}
