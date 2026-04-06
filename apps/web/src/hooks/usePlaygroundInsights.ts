import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState } from 'react';

import {
  getPracticeHistory,
  getPracticeStats,
  type PracticeSession,
  type PracticeStats,
} from '@/api/playground';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from '@/lib/toast';

export function usePlaygroundInsights() {
  const { data: systemConfig } = useSystemConfig();
  const [showInsightsDrawer, setShowInsightsDrawer] = useState(false);
  const [practiceHistory, setPracticeHistory] = useState<PracticeSession[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const historyPageSize = systemConfig?.playground.history_page_size ?? 8;

  const statsRequest = useRequest(getPracticeStats, {
    manual: true,
    onError: (error) => {
      toast.error(error.message || '加载训练统计失败');
    },
  });

  const historyRequest = useRequest(
    async (page: number) => getPracticeHistory(page, historyPageSize),
    {
      manual: true,
      onError: (error) => {
        toast.error(error.message || '加载训练记录失败');
      },
    },
  );

  const practiceStats = useMemo<PracticeStats | null>(
    () => (statsRequest.data ?? null) as PracticeStats | null,
    [statsRequest.data],
  );

  const syncHistory = useCallback(
    (
      page: number,
      nextSessions: PracticeSession[],
      total: number,
      mode: 'replace' | 'append',
    ) => {
      setHistoryPage(page);
      setHistoryTotal(total);
      setPracticeHistory((previous) => {
        const merged =
          mode === 'replace' ? nextSessions : [...previous, ...nextSessions];
        setHasMoreHistory(merged.length < total);
        return merged;
      });
    },
    [],
  );

  const refreshInsights = useCallback(async () => {
    const [, history] = await Promise.all([
      statsRequest.runAsync(),
      historyRequest.runAsync(1),
    ]);
    syncHistory(1, history.sessions, history.total, 'replace');
  }, [historyRequest, statsRequest, syncHistory]);

  const openInsights = useCallback(async () => {
    setShowInsightsDrawer(true);
    if (statsRequest.data && historyTotal > 0) {
      return;
    }
    await refreshInsights();
  }, [historyTotal, refreshInsights, statsRequest.data]);

  const loadMoreHistory = useCallback(async () => {
    if (!hasMoreHistory || historyRequest.loading) {
      return;
    }
    const nextPage = historyPage + 1;
    const history = await historyRequest.runAsync(nextPage);
    syncHistory(nextPage, history.sessions, history.total, 'append');
  }, [hasMoreHistory, historyPage, historyRequest, syncHistory]);

  return {
    showInsightsDrawer,
    setShowInsightsDrawer,
    practiceStats,
    practiceHistory,
    historyPage,
    hasMoreHistory,
    statsLoading: statsRequest.loading,
    historyLoading: historyRequest.loading,
    openInsights,
    refreshInsights,
    loadMoreHistory,
    historyTotal,
  };
}
