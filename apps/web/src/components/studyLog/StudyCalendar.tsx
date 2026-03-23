import { useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { ChevronLeft, ChevronRight, Flame, Info } from 'lucide-react';

import {
  studyLogApi,
  type StudyLogMonthItem,
  type StudyLogStreakResponse,
} from '@/api/studyLog';
import { StreakIndicator } from '@/components/gamification';
import { Button, Card, Skeleton, Tooltip } from '@/components/ui';
import { useMutation, useQuery } from '@/hooks/useData';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function StudyCalendar() {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [monthLogsMap, setMonthLogsMap] = useState<
    Map<string, StudyLogMonthItem>
  >(new Map());
  const [streakData, setStreakData] = useState<StudyLogStreakResponse>({
    streak_days: 0,
    today_checked_in: false,
  });

  const streakRequest = useQuery(studyLogApi.getStreak, {
    onSuccess: (data) => setStreakData(data),
    onError: (error) => toast.error(error.message || '获取打卡数据失败'),
  });

  const monthLogsRequest = useQuery(
    () => studyLogApi.getMonthLogs(currentDate.year(), currentDate.month() + 1),
    {
      refreshDeps: [currentDate.year(), currentDate.month()],
      onSuccess: (data) => {
        const nextMap = new Map<string, StudyLogMonthItem>();
        data.checked_in_dates.forEach((item) => nextMap.set(item.date, item));
        setMonthLogsMap(nextMap);
      },
      onError: (error) => toast.error(error.message || '获取月度打卡记录失败'),
    },
  );

  const checkInRequest = useMutation(studyLogApi.checkIn, {
    onSuccess: async (data) => {
      toast.success(data.message || '今日已打卡');
      await streakRequest.refresh();
      await monthLogsRequest.refresh();
    },
    onError: (error) => toast.error(error.message || '手动打卡失败'),
  });

  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const dates: Dayjs[] = [];
    let pointer = startDate;
    while (pointer.isBefore(endDate) || pointer.isSame(endDate, 'day')) {
      dates.push(pointer);
      pointer = pointer.add(1, 'day');
    }
    return dates;
  }, [currentDate]);

  const today = dayjs();
  const disableNextMonth = currentDate.isSame(today, 'month');

  if (streakRequest.loading) {
    return (
      <Card>
        <div className="p-6">
          <Skeleton variant="text" width={160} className="mb-6" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                className="aspect-square"
              />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-light)] md:h-10 md:w-10">
              <Flame className="h-4 w-4 text-[var(--accent)] md:h-5 md:w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] md:text-lg">
                学习打卡
              </h3>
              <p className="hidden text-xs text-[var(--text-secondary)] sm:block">
                连续学习更容易把节奏稳下来
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!streakData.today_checked_in ? (
              <Button
                size="sm"
                loading={checkInRequest.loading}
                onClick={() => void checkInRequest.run()}
              >
                今日打卡
              </Button>
            ) : (
              <div className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                今日已打卡
              </div>
            )}
            <Tooltip content="连续学习天数">
              <div className="cursor-help">
                <StreakIndicator days={streakData.streak_days} size="sm" />
              </div>
            </Tooltip>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between md:mb-6">
          <button
            type="button"
            className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label="上一个月"
            onClick={() =>
              setCurrentDate((previous) => previous.subtract(1, 'month'))
            }
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-base font-bold text-[var(--text-primary)] md:text-lg">
            {currentDate.format('YYYY 年 M 月')}
          </span>
          <button
            type="button"
            disabled={disableNextMonth}
            className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="下一个月"
            onClick={() =>
              setCurrentDate((previous) => previous.add(1, 'month'))
            }
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center md:gap-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-xs font-semibold text-[var(--text-tertiary)] md:text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        <div
          className={cn(
            'grid grid-cols-7 gap-1 md:gap-2',
            monthLogsRequest.loading && 'opacity-50',
          )}
        >
          {calendarGrid.map((date) => {
            const isCurrentMonth = date.isSame(currentDate, 'month');
            const dateKey = date.format('YYYY-MM-DD');
            const logItem = monthLogsMap.get(dateKey);
            const isToday = date.isSame(today, 'day');
            const isFuture = date.isAfter(today, 'day');

            return (
              <Tooltip
                key={dateKey}
                content={
                  logItem
                    ? `已学习：${logItem.course_title || '完成课程'}`
                    : date.format('M 月 D 日')
                }
              >
                <button
                  type="button"
                  disabled={isFuture}
                  className={cn(
                    'relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-all md:rounded-xl md:text-base',
                    !isCurrentMonth && 'opacity-30',
                    isFuture && 'cursor-not-allowed',
                    logItem
                      ? 'bg-[var(--accent-light)] font-bold text-[var(--accent)]'
                      : isToday
                        ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]',
                  )}
                >
                  {logItem ? (
                    <Flame className="absolute inset-0 m-auto h-4 w-4 text-[var(--accent)] opacity-20 md:h-6 md:w-6" />
                  ) : null}
                  <span className="relative z-10">{date.date()}</span>
                  {isToday && !logItem ? (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--primary)]" />
                  ) : null}
                </button>
              </Tooltip>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-secondary)] md:mt-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded border border-[var(--accent)]/20 bg-[var(--accent-light)]" />
            <span>已打卡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[var(--bg-tertiary)]" />
            <span>今天</span>
          </div>
          <Tooltip content="完成学习后系统会自动打卡，你也可以在这里手动补打一回。">
            <Info className="ml-auto h-4 w-4 cursor-help opacity-50" />
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
