import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Layout,
  Menu,
  Tag,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AlertOutlined,
  FormOutlined,
  HistoryOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useRequest } from 'ahooks';

import { getReviewStats, type ReviewStats } from '@/api/review';
import { getMembershipStatus, type MembershipStatus } from '@/api/user';
import { AssessmentModal } from '@/components/assessment';
import { ProfileDrawer } from '@/components/layout/ProfileDrawer';
import { MobileNav } from '@/components/ui';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const { Content, Sider } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
  hideHeader?: boolean;
}

const SIDEBAR_WIDTH = 272;
const SIDEBAR_COLLAPSED_WIDTH = 88;

export function DashboardLayout({
  children,
  hideSidebar = false,
  hideHeader = false,
}: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
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

    const interval = window.setInterval(() => {
      fetchReviewStats();
      fetchMembership();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [fetchMembership, fetchReviewStats]);

  const menuItems = useMemo<MenuProps['items']>(
    () => [
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
    ],
    [reviewStats],
  );

  const userMenu: MenuProps = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: '我的资料',
        onClick: () => setShowProfileDrawer(true),
      },
      {
        key: 'assessment',
        icon: <SettingOutlined />,
        label: '重新评测等级',
        onClick: () => setShowAssessment(true),
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: logout,
      },
    ],
  };

  const selectedMenuKey = useMemo(() => {
    const pathname = location.pathname;
    const matched = ['/', '/review', '/vocabulary', '/mistakes', '/notes', '/ai-chat', '/playground']
      .filter((key) => (key === '/' ? pathname === '/' : pathname.startsWith(key)))
      .sort((left, right) => right.length - left.length)[0];
    return matched || '/';
  }, [location.pathname]);

  const contentOffsetClass = hideSidebar
    ? ''
    : collapsed
      ? 'lg:pl-[88px]'
      : 'lg:pl-[272px]';

  const handleAssessmentComplete = () => {
    setShowAssessment(false);
    refresh();
    fetchMembership();
    message.success('你的学习档案已经更新');
  };

  return (
    <>
      <Layout className="min-h-screen bg-[var(--bg-primary)]">
        {!hideSidebar ? (
          <Sider
            trigger={null}
            collapsible
            collapsed={collapsed}
            collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
            width={SIDEBAR_WIDTH}
            theme="light"
            className="fixed inset-y-0 left-0 z-50 hidden border-r border-[var(--border)] bg-[var(--bg-elevated)] lg:block"
          >
            <div className="sticky top-0 z-10 flex h-20 items-center justify-center border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4">
              <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                <div className="flex h-11 w-11 min-w-[44px] items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[var(--shadow-button)]">
                  <ReadOutlined className="text-xl" />
                </div>
                {!collapsed ? (
                  <div>
                    <div className="text-xl font-black tracking-tight text-[var(--text-primary)]">
                      FluentRise
                    </div>
                    <div className="text-xs font-medium text-[var(--primary)]">
                      渐进式英语学习平台
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="px-3 py-6">
              <Menu
                mode="inline"
                selectedKeys={[selectedMenuKey]}
                items={menuItems}
                onClick={({ key }) => navigate({ to: key })}
                className="border-none bg-transparent"
              />

              {!collapsed && membership ? (
                <div className="mx-2 mt-6 rounded-3xl border border-[var(--border)] bg-[var(--primary-light)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Text className="font-bold text-[var(--text-primary)]">会员试用</Text>
                    <Tag className="m-0 rounded-full border-0 bg-[var(--warning-light)] px-3 py-0.5 text-[var(--accent)]">
                      {membership.status === 'trial' ? '试用中' : membership.status}
                    </Tag>
                  </div>
                  <div className="text-2xl font-black text-[var(--primary)]">
                    {membership.days_left} 天
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    新用户默认赠送 7 天会员试用，支付能力暂未接入。
                  </div>
                  {!membership.multimodal_ready ? (
                    <div className="mt-3 rounded-2xl bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                      朗读纠音多模态能力：待完成
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!collapsed && reviewStats && reviewStats.today_pending > 0 ? (
                <button
                  type="button"
                  className="mx-2 mt-5 w-[calc(100%-1rem)] cursor-pointer rounded-3xl border border-[var(--secondary-light)] bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
                  onClick={() => navigate({ to: '/review' })}
                >
                  <div className="mb-2 text-sm font-bold text-[var(--secondary)]">复习提醒</div>
                  <div className="text-2xl font-black text-[var(--text-primary)]">
                    {reviewStats.today_pending}
                    <span className="ml-2 text-sm font-medium text-[var(--text-secondary)]">项待完成</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    连续复习 {reviewStats.streak_days} 天，本周完成 {reviewStats.weekly_completed}/
                    {reviewStats.weekly_total}
                  </div>
                </button>
              ) : null}
            </div>
          </Sider>
        ) : null}

        <Layout className={cn('bg-transparent transition-all duration-300', contentOffsetClass)}>
          {!hideHeader ? (
            <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-[var(--border)] bg-white/90 px-6 backdrop-blur-md">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-xl text-[var(--text-secondary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]',
                  hideSidebar ? 'invisible' : 'hidden lg:flex',
                )}
              />

              <div className="ml-auto flex items-center gap-3">
                <Button
                  type="default"
                  shape="round"
                  onClick={() => navigate({ to: '/ai-chat' })}
                  className="hidden border-[var(--border)] bg-white font-semibold text-[var(--secondary)] md:inline-flex"
                  icon={<MessageOutlined />}
                >
                  AI 对话
                </Button>
                <Button
                  type="primary"
                  shape="round"
                  icon={<PlayCircleOutlined />}
                  onClick={() => navigate({ to: '/playground' })}
                  className="border-0 bg-[var(--primary)] font-bold shadow-[var(--shadow-button)] hover:!bg-[var(--primary-hover)]"
                >
                  打开游乐园
                </Button>

                <Dropdown menu={userMenu} placement="bottomRight" arrow>
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-3 rounded-full border border-transparent px-3 py-1.5 transition-all duration-200 hover:border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                  >
                    <div className="hidden text-right sm:flex sm:flex-col">
                      <Text strong className="text-sm text-[var(--text-primary)]">
                        {user?.nickname || user?.phone}
                      </Text>
                      <Text className="text-xs font-medium text-[var(--primary)]">
                        {user?.english_level != null ? `等级 ${user.english_level}` : '未评测'}
                      </Text>
                    </div>
                    <Avatar
                      size="large"
                      icon={<UserOutlined />}
                      className="bg-[var(--primary-light)] text-[var(--primary)]"
                      src={user?.avatar}
                    />
                  </button>
                </Dropdown>
              </div>
            </header>
          ) : null}

          <Content className="min-h-[calc(100vh-80px)] bg-[radial-gradient(circle_at_top_left,_rgba(88,204,2,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(28,176,246,0.1),_transparent_18%),linear-gradient(180deg,_#ffffff,_#f9fff2_42%,_#ffffff)] p-4 pb-24 md:p-6 md:pb-24 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </Content>
        </Layout>
      </Layout>

      {!hideSidebar ? <MobileNav /> : null}

      <AssessmentModal
        open={showAssessment}
        onClose={() => setShowAssessment(false)}
        mode="update"
        onComplete={handleAssessmentComplete}
      />
      <ProfileDrawer
        open={showProfileDrawer}
        user={user}
        onClose={() => setShowProfileDrawer(false)}
        onUpdated={() => {
          refresh();
          setShowProfileDrawer(false);
        }}
      />
    </>
  );
}
