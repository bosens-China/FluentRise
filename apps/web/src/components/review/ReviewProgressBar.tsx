import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Progress, Tag, Tooltip } from 'antd';

import { getReviewProgress, getStageInterval } from '@/api/review';
import { useSystemConfig } from '@/hooks/useSystemConfig';

interface ReviewProgressBarProps {
  currentStage: number;
  totalStages?: number;
  nextReviewDate?: string | null;
  completed?: boolean;
}

const FALLBACK_REVIEW_STAGE_INTERVALS = [1, 2, 3, 5, 7, 14, 30, 60, 90];

export function ReviewProgressBar({
  currentStage,
  totalStages,
  nextReviewDate,
  completed = false,
}: ReviewProgressBarProps) {
  const { data: systemConfig } = useSystemConfig();
  const resolvedTotalStages =
    totalStages ?? systemConfig?.review.total_stages ?? 9;
  const reviewStageIntervals =
    systemConfig?.review.stage_intervals_days ?? FALLBACK_REVIEW_STAGE_INTERVALS;
  const progress = completed
    ? 100
    : getReviewProgress(currentStage, resolvedTotalStages);
  const stages = Array.from(
    { length: resolvedTotalStages },
    (_, index) => index + 1,
  );

  return (
    <div className="mb-6 rounded-2xl border border-indigo-50 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <ReloadOutlined className="text-lg" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800">
              {completed ? '复习完成' : '复习模式'}
            </div>
            <div className="text-sm text-gray-500">
              {completed
                ? `已完成全部 ${resolvedTotalStages} 轮复习，内容已经掌握得更稳了`
                : `第 ${currentStage}/${resolvedTotalStages} 轮复习 · 艾宾浩斯遗忘曲线`}
            </div>
          </div>
        </div>

        {!completed && nextReviewDate ? (
          <Tooltip title="下次复习时间">
            <Tag className="rounded-full border-0 bg-indigo-50 px-3 py-1 font-medium text-indigo-600">
              {`下次：${getStageInterval(currentStage, reviewStageIntervals)}`}
            </Tag>
          </Tooltip>
        ) : null}

        {completed ? (
          <Tag
            className="rounded-full border-0 bg-emerald-50 px-3 py-1 font-medium text-emerald-600"
            icon={<CheckCircleOutlined />}
          >
            全部完成
          </Tag>
        ) : null}
      </div>

      <div className="mb-4">
        <Progress
          percent={progress}
          strokeColor={{
            '0%': '#6366f1',
            '100%': '#a855f7',
          }}
          trailColor="#e0e7ff"
          strokeWidth={10}
          showInfo={false}
          className="!mb-2"
        />

        <div className="flex justify-between px-1">
          {stages.map((stage) => {
            const isCompleted = completed || stage < currentStage;
            const isCurrent = !completed && stage === currentStage;

            return (
              <Tooltip
                key={stage}
                title={`第 ${stage} 轮 · ${getStageInterval(stage, reviewStageIntervals)}复习`}
              >
                <div
                  className={`h-3 w-3 rounded-full transition-all ${
                    isCompleted
                      ? 'bg-indigo-500'
                      : isCurrent
                        ? 'bg-indigo-500 ring-4 ring-indigo-100'
                        : 'bg-gray-200'
                  }`}
                />
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>开始</span>
        <span>中段</span>
        <span>完成</span>
      </div>
    </div>
  );
}
