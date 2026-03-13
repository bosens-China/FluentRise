import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame, Info } from 'lucide-react';
import { useRequest } from 'ahooks';
import dayjs, { type Dayjs } from 'dayjs';

import { Card, Tooltip, Skeleton } from '@/components/ui';
import { StreakIndicator } from '@/components/gamification';
import { toast } from '@/lib/toast';
import { studyLogApi, type StudyLogStreakResponse, type StudyLogMonthItem } from '@/api/studyLog';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const StudyCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [monthLogsMap, setMonthLogsMap] = useState<Map<string, StudyLogMonthItem>>(new Map());
  const [streakData, setStreakData] = useState<StudyLogStreakResponse>({
    streak_days: 0,
    today_checked_in: false,
  });

  // 获取连胜数据
  const { loading: streakLoading } = useRequest(studyLogApi.getStreak, {
    onSuccess: (data) => setStreakData(data),
    onError: (error) => toast.error(error.message || '获取连胜数据失败'),
  });

  // 获取月份打卡记录
  const { run: fetchMonthLogs, loading: logsLoading } = useRequest(studyLogApi.getMonthLogs, {
    manual: true,
    onSuccess: (data) => {
      const newMap = new Map<string, StudyLogMonthItem>();
      data.checked_in_dates.forEach((item) => newMap.set(item.date, item));
      setMonthLogsMap(newMap);
    },
    onError: (error) => toast.error(error.message || '获取打卡记录失败'),
  });

  useEffect(() => {
    fetchMonthLogs(currentDate.year(), currentDate.month() + 1);
  }, [currentDate, fetchMonthLogs]);

  const handlePrevMonth = () => setCurrentDate((prev) => prev.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate((prev) => prev.add(1, 'month'));

  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const grid: Dayjs[] = [];
    let current = startDate;
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      grid.push(current);
      current = current.add(1, 'day');
    }
    return grid;
  }, [currentDate]);

  const today = dayjs();
  const isCurrentMonth = currentDate.isSame(today, 'month');

  if (streakLoading) {
    return (
      <Card>
        <div className="p-6">
          <Skeleton variant="text" width={150} className="mb-6" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" className="aspect-square" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
              <Flame className="h-4 w-4 md:h-5 md:w-5 text-[var(--accent)]" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                学习打卡
              </h3>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">
                连续学习获得更多奖励
              </p>
            </div>
          </div>
          
          <Tooltip content="连续学习天数">
            <div className="cursor-help">
              <StreakIndicator days={streakData.streak_days} size="sm" />
            </div>
          </Tooltip>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="上个月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-base md:text-lg font-bold text-[var(--text-primary)]">
            {currentDate.format('YYYY年 M月')}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="下个月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-xs md:text-sm font-semibold text-[var(--text-tertiary)] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className={cn('grid grid-cols-7 gap-1 md:gap-2', logsLoading && 'opacity-50')}>
          {calendarGrid.map((date, index) => {
            const isCurrentMonth = date.isSame(currentDate, 'month');
            const dateStr = date.format('YYYY-MM-DD');
            const logItem = monthLogsMap.get(dateStr);
            const isToday = date.isSame(today, 'day');
            const isFuture = date.isAfter(today, 'day');

            return (
              <Tooltip
                key={index}
                content={logItem ? `已学习: ${logItem.course_title || '完成课程'}` : date.format('M月D日')}
              >
                <button
                  disabled={isFuture}
                  className={cn(
                    'relative aspect-square rounded-lg md:rounded-xl flex items-center justify-center transition-all',
                    'text-sm md:text-base font-medium',
                    !isCurrentMonth && 'opacity-30',
                    isFuture && 'cursor-not-allowed',
                    logItem
                      ? 'bg-[var(--accent-light)] text-[var(--accent)] font-bold'
                      : isToday
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  )}
                >
                  {logItem && (
                    <Flame className="absolute inset-0 m-auto h-4 w-4 md:h-6 md:w-6 text-[var(--accent)] opacity-20" />
                  )}
                  <span className={cn('relative z-10', logItem && 'text-sm md:text-base')}>
                    {date.date()}
                  </span>
                  {isToday && !logItem && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 md:mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[var(--accent-light)] border border-[var(--accent)]/20" />
            <span>已打卡</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
            <span>今日</span>
          </div>
          <Tooltip content="连续打卡可获得额外奖励">
            <Info className="h-4 w-4 ml-auto cursor-help opacity-50" />
          </Tooltip>
        </div>
      </div>
    </Card>
  );
};
