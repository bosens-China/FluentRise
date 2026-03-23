/**
 * 认证相关 API。
 */
import type { UserInfo } from '@/api/user';
import {
  clearTokens,
  getRefreshToken,
  setStoredUserInfo,
  setTokens,
} from '@/lib/auth-storage';
import { post } from '@/utils/request';

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

export interface LogoutRequest {
  refresh_token?: string;
}

export interface MessageResponse {
  message: string;
}

export type { UserInfo };

export async function sendSmsCode(
  data: SendSmsCodeRequest,
): Promise<SendSmsCodeResponse> {
  return post<SendSmsCodeResponse>('/auth/sms/send', data);
}

export async function loginByPhone(
  data: PhoneLoginRequest,
): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login/phone', data);

  if (response.tokens) {
    setTokens(response.tokens.access_token, response.tokens.refresh_token);
    setStoredUserInfo(response.user);
  }

  return response;
}

export async function logout(): Promise<MessageResponse> {
  const refreshToken = getRefreshToken();
  const payload: LogoutRequest = refreshToken
    ? { refresh_token: refreshToken }
    : {};

  try {
    const response = await post<MessageResponse>('/auth/logout', payload);
    clearTokens();
    return response;
  } catch {
    clearTokens();
    return { message: '退出登录成功' };
  }
}
