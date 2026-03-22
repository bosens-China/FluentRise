import { TrophyOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';

import type { DashboardOverview } from '@/api/user';

interface AchievementPanelProps {
  loading: boolean;
  dashboard: DashboardOverview | null;
}

export function AchievementPanel({ loading, dashboard }: AchievementPanelProps) {
  const achievementCards = [
    {
      key: 'streak',
      label: '连续打卡',
      value: dashboard?.streak_days ?? 0,
      suffix: '天',
      tone: 'from-orange-500 to-amber-500',
    },
    {
      key: 'lesson',
      label: '完成课文',
      value: dashboard?.completed_lessons ?? 0,
      suffix: '篇',
      tone: 'from-sky-500 to-cyan-500',
    },
    {
      key: 'vocabulary',
      label: '累计生词',
      value: dashboard?.vocabulary_total ?? 0,
      suffix: '个',
      tone: 'from-emerald-500 to-teal-500',
    },
    {
      key: 'review',
      label: '待复习',
      value: dashboard?.review_pending_total ?? 0,
      suffix: '项',
      tone: 'from-indigo-500 to-blue-500',
    },
    {
      key: 'mistake',
      label: '待巩固错题',
      value: dashboard?.mistake_pending_total ?? 0,
      suffix: '题',
      tone: 'from-rose-500 to-orange-500',
    },
  ];

  return (
    <Card className="rounded-[32px] border-0 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <TrophyOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">学习成就</div>
          <div className="text-sm text-gray-400">把看得见的小进步持续积累起来</div>
        </div>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {achievementCards.map((item) => (
            <div key={item.key} className={`rounded-3xl bg-gradient-to-br ${item.tone} p-4 text-white shadow-sm`}>
              <div className="text-sm text-white/80">{item.label}</div>
              <div className="mt-2 text-3xl font-black">
                {item.value}
                <span className="ml-1 text-sm font-medium text-white/80">{item.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
