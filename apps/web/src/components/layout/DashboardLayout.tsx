import { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Typography,
  Dropdown,
  message,
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
} from '@ant-design/icons';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { AssessmentModal } from '@/components/assessment';

const { Sider, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useCurrentUser();
  const { logout } = useLogout();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '学习中心',
    },
    {
      key: '/review',
      icon: <HistoryOutlined />,
      label: '复习中心',
    },
    {
      key: '/vocabulary',
      icon: <ReadOutlined />,
      label: '我的生词本',
    },
    {
      key: '/notes',
      icon: <FormOutlined />,
      label: '我的笔记',
    },
  ];

  const userMenu: MenuProps = {
    items: [
      {
        key: 'level',
        icon: <SettingOutlined />,
        label: '修改英语等级',
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
    message.success('等级已更新！');
  };

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className="border-r border-indigo-50/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] fixed left-0 top-0 bottom-0 z-50 h-screen overflow-y-auto hidden-scrollbar"
        width={260}
      >
        <div className="flex h-20 items-center justify-center border-b border-indigo-50/50 px-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200">
              <ReadOutlined className="text-xl" />
            </div>
            {!collapsed && (
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-xl font-black text-transparent transition-opacity">
                FluentRise
              </span>
            )}
          </div>
        </div>

        <div className="px-3 py-6">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => {
              navigate({ to: key });
            }}
            className="border-none bg-transparent"
            itemIcon={null}
          />
        </div>
      </Sider>

      <Layout className="bg-transparent transition-all duration-300">
        <header className="flex h-20 items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-xl text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
          />

          <Dropdown menu={userMenu} placement="bottomRight" arrow>
            <div className="flex cursor-pointer items-center gap-3 rounded-full py-1.5 px-3 transition-all hover:bg-indigo-50 border border-transparent hover:border-indigo-100">
              <div className="flex flex-col text-right hidden sm:flex">
                <Text strong className="text-sm text-gray-800 leading-tight">
                  {user?.nickname || user?.phone}
                </Text>
                <Text className="text-xs text-indigo-500 font-medium">
                  {user && user.english_level != null
                    ? `Level ${user.english_level}`
                    : '未评估'}
                </Text>
              </div>
              <Avatar
                size="large"
                icon={<UserOutlined />}
                className="bg-indigo-100 text-indigo-600 shadow-sm"
                src={user?.avatar}
              />
            </div>
          </Dropdown>
        </header>
        <Content className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-6 md:p-8 min-h-[calc(100vh-80px)]">
          <div className="mx-auto max-w-7xl">{children}</div>
        </Content>
      </Layout>

      <AssessmentModal
        open={showAssessment}
        onClose={() => setShowAssessment(false)}
        onComplete={handleAssessmentComplete}
      />
    </Layout>
  );
}
