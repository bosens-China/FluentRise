import { get, post } from '@/utils/request';

export interface StudyLogStreakResponse {
  streak_days: number;
  today_checked_in: boolean;
}

export interface StudyLogMonthItem {
  date: string;
  course_title: string | null;
}

export interface StudyLogMonthResponse {
  checked_in_dates: StudyLogMonthItem[]; // 包含日期和课程标题
}

export const studyLogApi = {
  /**
   * 今日打卡
   */
  checkIn: () => {
    return post<{ message: string; success: boolean }>('/study-logs/check-in');
  },

  /**
   * 获取连胜天数和今日打卡状态
   */
  getStreak: () => {
    return get<StudyLogStreakResponse>('/study-logs/streak');
  },

  /**
   * 获取月度打卡记录
   * @param year 年份
   * @param month 月份 (1-12)
   */
  getMonthLogs: (year: number, month: number) => {
    return get<StudyLogMonthResponse>('/study-logs/month', {
      params: { year, month },
    });
  },
};
