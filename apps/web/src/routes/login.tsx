import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useInterval } from 'ahooks';
import { Sparkles, Smartphone, KeyRound, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSendSmsCode, useLoginByPhone } from '@/hooks/useAuth';
import { isAuthenticated } from '@/utils/request';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

// 装饰性背景图案
function BackgroundDecoration() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[var(--primary)]/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[var(--secondary)]/10 blur-3xl" />
      <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="absolute left-20 top-1/4 h-4 w-4 rounded-full bg-[var(--primary)]/40" />
      <div className="absolute bottom-1/4 right-32 h-3 w-3 rounded-full bg-[var(--secondary)]/40" />
      <div className="absolute right-1/4 top-20 h-2 w-2 rounded-full bg-[var(--accent)]/40" />
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--text-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}

const languages = ['🇺🇸 英语', '🇯🇵 日语', '🇰🇷 韩语', '🇫🇷 法语', '🇩🇪 德语', '🇪🇸 西班牙语'];

function LanguageCloud() {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-6">
      {languages.map((lang, i) => (
        <span
          key={lang}
          className="px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium animate-fade-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {lang}
        </span>
      ))}
    </div>
  );
}

function LoginPage() {
  // 如果已登录，重定向到首页或指定的重定向地址
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)] p-4">
      <BackgroundDecoration />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-[0_8px_0_rgb(76,176,2)]">
            <Sparkles className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">
            FluentRise
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            开启你的语言学习之旅
          </p>
          <LanguageCloud />
        </div>
        <LoginForm />
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-[var(--text-tertiary)]">
            登录即表示你同意我们的服务条款和隐私政策
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)]">
            <span>每日 10 分钟</span>
            <span>•</span>
            <span>持续进步</span>
            <span>•</span>
            <span>轻松学习</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState<{ phone?: string; code?: string }>({});

  const { sendCode, sending } = useSendSmsCode();
  const { login, loading } = useLoginByPhone();

  useInterval(
    () => setCountdown((prev) => (prev <= 1 ? 0 : prev - 1)),
    countdown > 0 ? 1000 : undefined
  );

  const validatePhone = (value: string) => {
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!value) return '请输入手机号';
    if (!phoneReg.test(value)) return '请输入正确的手机号';
    return '';
  };

  const validateCode = (value: string) => {
    if (!value) return '请输入验证码';
    if (value.length !== 6) return '验证码为6位数字';
    return '';
  };

  const handleSendCode = async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }
    setErrors({});

    try {
      await sendCode({ phone });
      setCountdown(60);
    } catch {
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneError = validatePhone(phone);
    const codeError = validateCode(code);
    
    if (phoneError || codeError) {
      setErrors({ phone: phoneError, code: codeError });
      return;
    }
    setErrors({});

    try {
      await login({ phone, code });
    } catch {
      return;
    }
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-3xl shadow-[var(--shadow-card)] border border-[var(--border)] p-8">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
          欢迎回来
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          请输入手机号登录/注册
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            手机号
          </label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.slice(0, 11));
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              placeholder="请输入手机号"
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--bg-secondary)] border-2 border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:bg-[var(--bg-primary)] focus:outline-none transition-all"
            />
          </div>
          {errors.phone && (
            <p className="mt-1.5 text-sm text-[var(--error)]">{errors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            验证码
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (errors.code) setErrors({ ...errors, code: undefined });
                }}
                placeholder="请输入验证码"
                className="w-full h-14 pl-12 pr-4 rounded-xl bg-[var(--bg-secondary)] border-2 border-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:bg-[var(--bg-primary)] focus:outline-none transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={countdown > 0 || sending}
              className="h-14 px-5 rounded-xl font-semibold text-sm whitespace-nowrap bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--secondary-light)] hover:text-[var(--secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : countdown > 0 ? (
                `${countdown}s`
              ) : (
                '获取验证码'
              )}
            </button>
          </div>
          {errors.code && (
            <p className="mt-1.5 text-sm text-[var(--error)]">{errors.code}</p>
          )}
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg" className="mt-2">
          {loading ? '登录中...' : '登录 / 注册'}
          {!loading && <ArrowRight className="h-5 w-5" />}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--border)] text-center space-y-2">
        <p className="text-xs text-[var(--text-tertiary)]">
          未注册的手机号将自动创建账号
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          开发环境验证码：<span className="font-mono font-bold text-[var(--primary)]">123456</span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
