import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography, Divider, Row, Col } from 'antd';
import { MobileOutlined, SafetyCertificateOutlined, RocketOutlined } from '@ant-design/icons';
import { useInterval } from 'ahooks';

import { useSendSmsCode, useLoginByPhone } from '@/hooks/useAuth';
import { isAuthenticated } from '@/utils/request';

const { Title, Text } = Typography;

interface LoginForm {
  phone: string;
  code: string;
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  beforeLoad: () => {
    // 如果已登录，重定向到首页
    if (isAuthenticated()) {
      throw new Error('ALREADY_LOGGED_IN');
    }
  },
  errorComponent: ({ error }) => {
    if (error.message === 'ALREADY_LOGGED_IN') {
      return <Navigate to="/" />;
    }
    return <div>出错了: {error.message}</div>;
  },
});

// 装饰性背景图案组件
function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* 左上角大圆形 */}
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
      {/* 右下角大圆形 */}
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl" />
      {/* 中间渐变 */}
      <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-blue-200/20 blur-3xl" />
      {/* 小装饰点 */}
      <div className="absolute left-20 top-1/4 h-4 w-4 rounded-full bg-indigo-400/40" />
      <div className="absolute bottom-1/4 right-32 h-3 w-3 rounded-full bg-purple-400/40" />
      <div className="absolute right-1/4 top-20 h-2 w-2 rounded-full bg-blue-400/40" />
    </div>
  );
}

// 统一的输入框高度样式
const inputStyles = {
  height: '48px',
  lineHeight: '48px',
};

function LoginPage() {
  const [form] = Form.useForm<LoginForm>();
  const [countdown, setCountdown] = useState(0);

  // 使用自定义 hooks
  const { sendCode, sending } = useSendSmsCode();
  const { login, loading } = useLoginByPhone();

  // 倒计时逻辑
  useInterval(
    () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    },
    countdown > 0 ? 1000 : undefined,
  );

  // 发送验证码
  const handleSendCode = async () => {
    const phone = form.getFieldValue('phone');

    // 验证手机号
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phone || !phoneReg.test(phone)) {
      message.error('请输入正确的手机号');
      return;
    }

    try {
      await sendCode({ phone });
      setCountdown(60);
    } catch {
      // 错误已在 hook 中处理
    }
  };

  // 登录提交
  const handleSubmit = async (values: LoginForm) => {
    try {
      await login({ phone: values.phone, code: values.code });
      // 登录成功会自动跳转
    } catch {
      // 错误已在 hook 中处理
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4">
      <BackgroundDecoration />

      <div className="relative w-full max-w-md">
        {/* Logo 区域 */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl text-white shadow-xl shadow-indigo-200">
            <RocketOutlined />
          </div>
          <Title level={2} className="!mb-2 !text-gray-800">
            FluentRise
          </Title>
          <Text className="text-base text-gray-500">开启你的学习之旅</Text>
        </div>

        {/* 登录卡片 */}
        <Card
          className="border-0 shadow-2xl shadow-indigo-100/50"
          bodyStyle={{ padding: '40px 32px' }}
        >
          <div className="mb-8 text-center">
            <Title level={4} className="!mb-1 !font-semibold !text-gray-800">
              欢迎回来
            </Title>
            <Text className="text-sm text-gray-400">请输入手机号登录/注册</Text>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {/* 手机号输入 */}
            <Form.Item
              name="phone"
              rules={[
                { required: true, message: '请输入手机号' },
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: '请输入正确的手机号',
                },
              ]}
            >
              <Input
                prefix={
                  <MobileOutlined className="mr-2 text-lg text-gray-400" />
                }
                placeholder="请输入手机号"
                maxLength={11}
                style={inputStyles}
                className="rounded-xl hover:border-indigo-400 focus:border-indigo-500"
              />
            </Form.Item>

            {/* 验证码输入 */}
            <Form.Item
              name="code"
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码为6位数字' },
              ]}
              className="!mb-6"
            >
              <Row gutter={12}>
                <Col flex="auto">
                  <Input
                    prefix={
                      <SafetyCertificateOutlined className="mr-2 text-lg text-gray-400" />
                    }
                    placeholder="请输入验证码"
                    maxLength={6}
                    style={inputStyles}
                    className="w-full rounded-xl hover:border-indigo-400 focus:border-indigo-500"
                  />
                </Col>
                <Col flex="none">
                  <Button
                    onClick={handleSendCode}
                    loading={sending}
                    disabled={countdown > 0 || sending}
                    style={{ ...inputStyles, padding: '0 20px' }}
                    className="rounded-xl border-gray-200 font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </Col>
              </Row>
            </Form.Item>

            {/* 登录按钮 */}
            <Form.Item className="!mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={inputStyles}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-medium shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-300"
              >
                登录 / 注册
              </Button>
            </Form.Item>

            <div className="text-center">
              <Text className="text-xs text-gray-400">
                未注册的手机号将自动创建账号
              </Text>
            </div>
          </Form>

          <Divider className="my-6 border-gray-100">
            <Text className="text-xs text-gray-300">开发环境</Text>
          </Divider>

          <div className="text-center">
            <Text className="text-xs text-gray-400">固定验证码：123456</Text>
          </div>
        </Card>

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <Text className="text-xs text-gray-400">
            登录即表示你同意我们的服务条款和隐私政策
          </Text>
        </div>
      </div>
    </div>
  );
}
