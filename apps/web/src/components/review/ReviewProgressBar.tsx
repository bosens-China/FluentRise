/**
 * 复习进度条组件
 * 显示当前复习的阶段进度
 */
import { Progress, Tag, Tooltip } from 'antd';
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getReviewProgress, getStageInterval } from '@/api/review';

interface ReviewProgressBarProps {
  currentStage: number;
  totalStages?: number;
  nextReviewDate?: string | null;
  completed?: boolean;
}

export function ReviewProgressBar({
  currentStage,
  totalStages = 9,
  nextReviewDate,
  completed = false,
}: ReviewProgressBarProps) {
  const progress = completed ? 100 : getReviewProgress(currentStage);
  
  // 生成阶段节点
  const stages = Array.from({ length: totalStages }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-50 mb-6">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <ReloadOutlined className="text-lg" />
          </div>
          <div>
            <div className="font-bold text-gray-800 text-lg">
              {completed ? '复习完成' : '复习模式'}
            </div>
            <div className="text-sm text-gray-500">
              {completed 
                ? '已完成全部9轮复习，内容已牢固掌握' 
                : `第 ${currentStage}/${totalStages} 轮复习 · 艾宾浩斯遗忘曲线`
              }
            </div>
          </div>
        </div>
        
        {!completed && nextReviewDate && (
          <Tooltip title="下次复习时间">
            <Tag className="rounded-full px-3 py-1 bg-indigo-50 text-indigo-600 border-0 font-medium">
              下次：{getStageInterval(currentStage)}
            </Tag>
          </Tooltip>
        )}
        
        {completed && (
          <Tag className="rounded-full px-3 py-1 bg-emerald-50 text-emerald-600 border-0 font-medium" icon={<CheckCircleOutlined />}>
            全部完成
          </Tag>
        )}
      </div>

      {/* 进度条 */}
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
        
        {/* 阶段节点 */}
        <div className="flex justify-between px-1">
          {stages.map((stage) => {
            const isCompleted = completed || stage < currentStage;
            const isCurrent = !completed && stage === currentStage;
            
            return (
              <Tooltip 
                key={stage} 
                title={`第${stage}轮 · ${getStageInterval(stage)}后复习`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all ${
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

      {/* 阶段标签 */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>开始</span>
        <span>第3轮</span>
        <span>第7轮</span>
      </div>
    </div>
  );
}
