import { Drawer } from 'antd';
import { CalendarClock, CheckCheck, History, ListChecks } from 'lucide-react';
import { useRequest } from 'ahooks';

import { getReviewLogs } from '@/api/review';
import { Button, Card, Empty, LoadingSpinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

interface ReviewLogDrawerProps {
  open: boolean;
  scheduleId: number | null;
  title: string;
  onClose: () => void;
}

const previewLabelMap: Record<string, string> = {
  clear: '唤醒清晰',
  fuzzy: '唤醒模糊',
  forgot: '唤醒失败',
};

const qualityLabelMap: Record<string, string> = {
  mastered: '记得清楚',
  fuzzy: '有点模糊',
  forgot: '已经忘了',
};

export function ReviewLogDrawer({
  open,
  scheduleId,
  title,
  onClose,
}: ReviewLogDrawerProps) {
  const logsRequest = useRequest(
    async () => {
      if (!scheduleId) {
        return null;
      }
      return getReviewLogs(scheduleId);
    },
    {
      ready: open && scheduleId != null,
      refreshDeps: [open, scheduleId],
    },
  );

  return (
    <Drawer
      open={open}
      width={460}
      title="复习记录"
      onClose={onClose}
      styles={{ body: { paddingBottom: 24 } }}
      extra={
        scheduleId ? (
          <Button variant="ghost" size="sm" onClick={() => void logsRequest.refresh()}>
            刷新
          </Button>
        ) : null
      }
    >
      <div className="mb-5 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(135deg,_rgba(28,176,246,0.10),_rgba(88,204,2,0.08))] p-5">
        <div className="text-sm text-[var(--text-secondary)]">当前文章</div>
        <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{title}</div>
      </div>

      {logsRequest.loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="md" />
        </div>
      ) : logsRequest.data && logsRequest.data.logs.length > 0 ? (
        <div className="space-y-4">
          {logsRequest.data.logs.map((log) => (
            <Card key={log.id} padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-bold text-[var(--text-primary)]">
                    第 {log.stage} 轮复习
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <CalendarClock className="h-4 w-4" />
                    {formatDate(log.reviewed_at)}
                  </div>
                </div>
                <div className="rounded-full bg-[var(--secondary-light)] px-3 py-1 text-xs font-bold text-[var(--secondary)]">
                  {log.is_quick_mode ? '快速复习' : '完整复习'}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-[var(--text-primary)]">
                <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <History className="h-4 w-4" />
                    唤醒判断
                  </div>
                  <div>{log.preview_assessment ? previewLabelMap[log.preview_assessment] : '未记录'}</div>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <CheckCheck className="h-4 w-4" />
                    最终结果
                  </div>
                  <div>{log.quality_assessment ? qualityLabelMap[log.quality_assessment] : '未记录'}</div>
                </div>
                <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    <ListChecks className="h-4 w-4" />
                    完成情况
                  </div>
                  <div>
                    {log.correct_count != null && log.total_count != null
                      ? `${log.correct_count}/${log.total_count} 题正确`
                      : '本轮未记录答题数量'}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Empty
          title="还没有复习记录"
          description="等你完成第一轮复习后，这里会沉淀每次唤醒和掌握情况。"
          icon={<History className="h-10 w-10" />}
        />
      )}
    </Drawer>
  );
}
