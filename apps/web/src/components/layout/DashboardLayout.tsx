import { useEffect, useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Typography,
  Dropdown,
  message,
  Badge,
  Tag,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  ReadOutlined,
  FormOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  MessageOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';

import { getReviewStats, type ReviewStats } from '@/api/review';
import { getMembershipStatus, type MembershipStatus } from '@/api/user';
import { AssessmentModal } from '@/components/assessment';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';

/**
 * DashboardLayout - 仪表盘布局
 * 
 * 包含侧边栏、顶部栏和主内容区的响应式布局
 */

interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 是否隐藏侧边栏（用于登录页等） */
  hideSidebar?: boolean;
  /** 是否隐藏顶部栏 */
  hideHeader?: boolean;
  /** 用户数据 */
  user?: {
    username?: string;
    avatar?: string;
    level?: number;
    currentXP?: number;
    requiredXP?: number;
    todayXP?: number;
    streakDays?: number;
  };
  /** 退出登录回调 */
  onLogout?: () => void;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useCurrentUser();
  const { logout } = useLogout();

  const { run: fetchReviewStats } = useRequest(getReviewStats, {
    manual: true,
    onSuccess: (data) => setReviewStats(data),
  });

  const { run: fetchMembership } = useRequest(getMembershipStatus, {
    manual: true,
    onSuccess: (data) => setMembership(data),
  });

  useEffect(() => {
    fetchReviewStats();
    fetchMembership();

    const interval = setInterval(() => {
      fetchReviewStats();
      fetchMembership();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchMembership, fetchReviewStats]);

  const menuItems: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: '学习中心' },
    {
      key: '/review',
      icon:
        reviewStats && reviewStats.today_pending > 0 ? (
          <Badge count={reviewStats.today_pending} size="small">
            <HistoryOutlined />
          </Badge>
        ) : (
          <HistoryOutlined />
        ),
      label: '复习中心',
    },
    { key: '/vocabulary', icon: <ReadOutlined />, label: '生词本' },
    { key: '/mistakes', icon: <AlertOutlined />, label: '错题本' },
    { key: '/notes', icon: <FormOutlined />, label: '笔记' },
    { key: '/ai-chat', icon: <MessageOutlined />, label: 'AI 对话' },
    { key: '/playground', icon: <PlayCircleOutlined />, label: '游乐园' },
  ];

  const userMenu: MenuProps = {
    items: [
      {
        key: 'level',
        icon: <SettingOutlined />,
        label: '重新评测等级',
        onClick: () => setShowAssessment(true),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: logout,
      },
    ],
  };

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    refresh();
    fetchMembership();
    message.success('你的学习档案已经更新');
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className="fixed left-0 top-0 bottom-0 z-50 h-screen overflow-y-auto border-r border-amber-100/60 bg-white"
        width={272}
      >
        <div className="sticky top-0 z-10 flex h-20 items-center justify-center border-b border-amber-100/60 bg-white px-4">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-11 w-11 min-w-[44px] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200">
              <ReadOutlined className="text-xl" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-xl font-black tracking-tight text-gray-800">FluentRise</div>
                <div className="text-xs font-medium text-amber-600">渐进式英语学习平台</div>
              </div>
            )}
          </div>
        )}

        <div className="px-3 py-6">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate({ to: key })}
            className="border-none bg-transparent"
            itemIcon={null}
          />

          {!collapsed && membership && (
            <div className="mx-2 mt-6 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <Text className="font-bold text-amber-900">会员试用</Text>
                <Tag color="gold" className="m-0 rounded-full border-0">
                  {membership.status === 'trial' ? '试用中' : membership.status}
                </Tag>
              </div>
              <div className="text-2xl font-black text-amber-600">{membership.days_left} 天</div>
              <div className="mt-1 text-xs text-amber-700/80">
                新用户默认赠送 7 天会员试用，支付能力暂未接入。
              </div>
              {!membership.multimodal_ready && (
                <div className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs text-gray-600">
                  朗读纠音多模态能力：待完成
                </div>
              )}
            </div>
          )}

          {!collapsed && reviewStats && reviewStats.today_pending > 0 && (
            <div
              className="mx-2 mt-5 cursor-pointer rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-4 transition-all hover:shadow-md"
              onClick={() => navigate({ to: '/review' })}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">复习提醒</span>
              </div>
              <div className="text-2xl font-black text-indigo-600">
                {reviewStats.today_pending}
                <span className="ml-2 text-sm font-medium text-indigo-500">项待完成</span>
              </div>
              <div className="mt-2 text-xs text-indigo-700/80">
                连续复习 {reviewStats.streak_days} 天，本周完成 {reviewStats.weekly_completed}/{reviewStats.weekly_total}
              </div>
            </div>
          )}
        </div>
      </Sider>

      <Layout className="bg-transparent transition-all duration-300">
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between bg-white/85 px-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] backdrop-blur-md">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-gray-600 hover:bg-amber-50 hover:text-amber-600"
          />

          <div className="hidden items-center gap-3 md:flex">
            <Button
              type="default"
              shape="round"
              onClick={() => navigate({ to: '/ai-chat' })}
              className="border-amber-200 bg-white px-5 font-semibold text-amber-700"
              icon={<MessageOutlined />}
            >
              AI 对话
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate({ to: '/playground' })}
              className="rounded-full border-0 bg-gradient-to-r from-rose-500 to-orange-500 px-6 font-bold shadow-lg shadow-rose-200"
            >
              打开游乐园
            </Button>
          </div>

          <Dropdown menu={userMenu} placement="bottomRight" arrow>
            <div className="flex cursor-pointer items-center gap-3 rounded-full border border-transparent px-3 py-1.5 transition-all hover:border-amber-100 hover:bg-amber-50">
              <div className="hidden text-right sm:flex sm:flex-col">
                <Text strong className="text-sm text-gray-800">
                  {user?.nickname || user?.phone}
                </Text>
                <Text className="text-xs font-medium text-amber-600">
                  {user?.english_level != null ? `等级 ${user.english_level}` : '未评测'}
                </Text>
              </div>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                className="bg-amber-100 text-amber-700"
                src={user?.avatar}
              />
            </div>
          </Dropdown>
        </header>

        <Content className="min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(244,114,182,0.12),_transparent_20%),linear-gradient(180deg,_#fffdf8,_#fffaf2_42%,_#fffefb)] p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </Content>
      </Layout>

        {/* 移动端底部导航 */}
        {!hideSidebar && <MobileNav />}
      </div>
    );
  }
);

DashboardLayout.displayName = 'DashboardLayout';

export { DashboardLayout };
