import React, { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { useRequest } from 'ahooks';
import dayjs, { type Dayjs } from 'dayjs';

import { Card } from '@/components/ui';
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
  useRequest(studyLogApi.getStreak, {
    onSuccess: (data) => {
      setStreakData(data);
    },
    onError: (error) => {
      toast.error(error.message || '获取连胜数据失败');
    },
  });

  // 获取月份打卡记录
  const { run: fetchMonthLogs, loading: logsLoading } = useRequest(studyLogApi.getMonthLogs, {
    manual: true,
    onSuccess: (data) => {
      const newMap = new Map<string, StudyLogMonthItem>();
      data.checked_in_dates.forEach((item) => {
        newMap.set(item.date, item);
      });
      setMonthLogsMap(newMap);
    },
    onError: (error) => {
      toast.error(error.message || '获取打卡记录失败');
    },
  });

  // 当月份变化时重新获取
  useEffect(() => {
    fetchMonthLogs(currentDate.year(), currentDate.month() + 1);
  }, [currentDate, fetchMonthLogs]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => prev.add(1, 'month'));
  };

  // 生成日历网格数据
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

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--accent-light)] flex items-center justify-center">
            <Flame className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            学习打卡
          </h3>
        </div>
        <StreakIndicator days={streakData.streak_days} size="sm" />
      </div>

      {/* 月份切换 */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-bold text-[var(--text-primary)]">
          {currentDate.format('YYYY年 MM月')}
        </span>
        <button
          onClick={handleNextMonth}
          disabled={currentDate.isSame(today, 'month')}
          className="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 gap-2 text-center mb-3">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-sm font-semibold text-[var(--text-tertiary)]">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.map((date, index) => {
          const isCurrentMonth = date.isSame(currentDate, 'month');
          const dateStr = date.format('YYYY-MM-DD');
          const logItem = monthLogsMap.get(dateStr);
          const isToday = date.isSame(today, 'day');
          const isFuture = date.isAfter(today, 'day');

          return (
            <div
              key={index}
              className={cn(
                'relative flex items-center justify-center aspect-square rounded-xl transition-all',
                !isCurrentMonth && 'opacity-30',
                logsLoading && 'opacity-50'
              )}
            >
              {/* 打卡标记 */}
              {logItem && (
                <div className="absolute inset-0 bg-[var(--accent-light)] rounded-xl border border-[var(--accent)]/20" />
              )}

              {/* 今日标记 */}
              {isToday && !logItem && (
                <div className="absolute inset-0 bg-[var(--bg-tertiary)] rounded-xl" />
              )}

              {/* 日期内容 */}
              <div
                className={cn(
                  'relative z-10 w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium',
                  logItem
                    ? 'text-[var(--accent)] font-bold'
                    : isFuture
                    ? 'text-[var(--text-tertiary)]'
                    : 'text-[var(--text-secondary)]'
                )}
                title={logItem ? `已打卡: ${logItem.course_title || '学习了一篇课程'}` : undefined}
              >
                {logItem && (
                  <Flame className="absolute h-4 w-4 text-[var(--accent)] opacity-20" />
                )}
                <span className={cn(logItem && 'relative')}>{date.date()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--accent-light)] border border-[var(--accent)]/20" />
          <span>已打卡</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
          <span>今日</span>
        </div>
      </div>
    </Card>
  );
};
