/**
 * 认证相关 API
 */
import { post, setTokens, clearTokens } from '@/utils/request';
import type { UserInfo } from '@/api/user';

export interface SendSmsCodeRequest {
  phone: string;
}

export interface SendSmsCodeResponse {
  message: string;
  expire_seconds: number;
}

export interface PhoneLoginRequest {
  phone: string;
  code: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  user: UserInfo;
  tokens: TokenResponse;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface MessageResponse {
  message: string;
}

// 重新导出 UserInfo 类型
export type { UserInfo };

/**
 * 发送短信验证码
 */
export async function sendSmsCode(data: SendSmsCodeRequest): Promise<SendSmsCodeResponse> {
  return post<SendSmsCodeResponse>('/auth/sms/send', data);
}

/**
 * 手机号验证码登录
 */
export async function loginByPhone(data: PhoneLoginRequest): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login/phone', data);

  // 保存令牌
  if (response.tokens) {
    setTokens(response.tokens.access_token, response.tokens.refresh_token);
    // 保存用户信息
    localStorage.setItem('user_info', JSON.stringify(response.user));
  }

  return response;
}

/**
 * 退出登录
 */
export async function logout(): Promise<MessageResponse> {
  try {
    const response = await post<MessageResponse>('/auth/logout', {});
    clearTokens();
    return response;
  } catch {
    clearTokens();
    return { message: '退出登录成功' };
  }
}
