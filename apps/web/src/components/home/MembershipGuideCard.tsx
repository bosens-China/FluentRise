import { FireOutlined } from '@ant-design/icons';
import { Card } from 'antd';

import type { MembershipStatus } from '@/api/user';

interface MembershipGuideCardProps {
  membership: MembershipStatus | null;
}

export function MembershipGuideCard({ membership }: MembershipGuideCardProps) {
  return (
    <Card className="rounded-[32px] border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
          <FireOutlined />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-800">基础版与会员版</div>
          <div className="text-sm text-gray-500">当前先展示试用状态，生产环境再做限制</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl bg-white/80 p-4">
          <div className="text-sm text-gray-500">会员试用</div>
          <div className="text-2xl font-black text-orange-600">{membership ? `${membership.days_left} 天` : '加载中'}</div>
        </div>
        <div className="rounded-2xl bg-white/80 p-4">
          <div className="text-sm text-gray-500">基础版建议保留</div>
          <div className="mt-1 text-sm leading-7 text-gray-700">
            每日一篇主课、基础复习、错题本、笔记和基础 AI 求助，足够让新用户建立学习习惯。
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-4">
          <div className="text-sm text-gray-500">会员版建议增强</div>
          <div className="mt-1 text-sm leading-7 text-gray-700">
            更高频生成、更丰富游乐园题量、深度 AI 陪练、后续的朗读纠音和多模态能力。
          </div>
        </div>
      </div>
    </Card>
  );
}
