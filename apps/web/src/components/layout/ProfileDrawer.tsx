import { useEffect, useState } from 'react';
import { App, Avatar, Drawer, Input, Skeleton, Tag } from 'antd';
import { Camera, Phone, Sparkles, Target, UserCircle2 } from 'lucide-react';

import {
  getUserProfile,
  updateProfile,
  type LearningGoal,
  type UserInfo,
} from '@/api/user';
import { useMutation, useQuery } from '@/hooks/useData';
import { Button } from '@/components/ui';

interface ProfileDrawerProps {
  open: boolean;
  user: UserInfo | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ProfileDrawer({
  open,
  user,
  onClose,
  onUpdated,
}: ProfileDrawerProps) {
  const { message } = App.useApp();
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [goalDetails, setGoalDetails] = useState<LearningGoal[]>([]);
  const [levelLabel, setLevelLabel] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserInfo | null>(null);

  const profileRequest = useQuery(getUserProfile, {
    manual: true,
    onSuccess: (data) => {
      setProfileUser(data.user);
      setNickname(data.user.nickname ?? '');
      setAvatar(data.user.avatar ?? '');
      setGoalDetails(data.goal_details);
      setLevelLabel(data.level_info?.label ?? null);
    },
    onError: (error) => {
      message.error(error.message || '加载学习档案失败');
    },
  });

  const updateRequest = useMutation(updateProfile, {
    onSuccess: () => {
      message.success('资料已更新');
      onUpdated();
    },
    onError: (error) => {
      message.error(error.message || '保存资料失败');
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    void profileRequest.run();
  }, [open, profileRequest]);

  const handleSave = () => {
    void updateRequest.run({
      nickname: nickname.trim() || undefined,
      avatar: avatar.trim() || undefined,
    });
  };

  return (
    <Drawer
      open={open}
      title="我的资料"
      width={460}
      onClose={onClose}
      destroyOnClose={false}
      styles={{ body: { paddingBottom: 24 } }}
    >
      {profileRequest.loading ? (
        <div className="space-y-4">
          <Skeleton.Avatar active size={72} shape="circle" />
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(135deg,_rgba(88,204,2,0.12),_rgba(28,176,246,0.08))] p-5">
            <div className="flex items-center gap-4">
              <Avatar
                size={72}
                src={avatar || user?.avatar || undefined}
                className="bg-[var(--primary)] text-white"
                icon={<UserCircle2 className="h-8 w-8" />}
              />
              <div className="min-w-0">
                <div className="truncate text-xl font-black text-[var(--text-primary)]">
                  {nickname || user?.nickname || '还没有昵称'}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {profileUser?.phone || user?.phone}
                  </span>
                  {profileUser?.english_level != null ? (
                    <Tag className="m-0 rounded-full border-0 bg-[var(--primary-light)] px-3 py-1 text-[var(--primary)]">
                      等级 {profileUser.english_level}
                    </Tag>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              基础资料
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  昵称
                </label>
                <Input
                  value={nickname}
                  maxLength={24}
                  placeholder="给自己起一个更容易记住的名字"
                  onChange={(event) => setNickname(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  头像地址
                </label>
                <Input
                  value={avatar}
                  placeholder="可选，填入头像图片链接"
                  prefix={<Camera className="h-4 w-4 text-[var(--text-secondary)]" />}
                  onChange={(event) => setAvatar(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Target className="h-4 w-4 text-[var(--secondary)]" />
              学习档案
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm text-[var(--text-secondary)]">当前等级</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  {levelLabel || '尚未完成评测'}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm text-[var(--text-secondary)]">学习目标</div>
                <div className="flex flex-wrap gap-2">
                  {goalDetails.length > 0 ? (
                    goalDetails.map((goal) => (
                      <Tag
                        key={goal.id}
                        className="m-0 rounded-full border-0 bg-[var(--secondary-light)] px-3 py-1 text-[var(--secondary)]"
                      >
                        {goal.label}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">暂未设置</span>
                  )}
                </div>
              </div>
              {profileUser?.custom_goal ? (
                <div>
                  <div className="mb-2 text-sm text-[var(--text-secondary)]">补充目标</div>
                  <div className="rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    {profileUser.custom_goal}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>
              关闭
            </Button>
            <Button loading={updateRequest.loading} onClick={handleSave}>
              保存资料
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
