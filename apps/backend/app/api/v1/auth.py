"""
认证相关路由。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import DbSession
from app.core.config import settings
from app.core.rate_limit import (
    auth_login_phone_rate_limit,
    auth_refresh_rate_limit,
    auth_sms_send_rate_limit,
)
from app.schemas.user import (
    LoginResponse,
    LogoutRequest,
    MessageResponse,
    PhoneLoginRequest,
    RefreshTokenRequest,
    SendSmsCodeRequest,
    SmsCodeResponse,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post(
    "/sms/send",
    response_model=SmsCodeResponse,
    summary="发送短信验证码",
    dependencies=[Depends(auth_sms_send_rate_limit)],
)
async def send_sms_code(request: SendSmsCodeRequest) -> SmsCodeResponse:
    """发送短信验证码到指定手机号。"""
    await AuthService.send_sms_code(request.phone)

    message = "验证码已发送"
    if settings.ENVIRONMENT == "development":
        message = "验证码已发送，开发环境请查看后端日志"

    return SmsCodeResponse(message=message, expire_seconds=settings.SMS_CODE_EXPIRE_SECONDS)


@router.post(
    "/login/phone",
    response_model=LoginResponse,
    summary="手机号验证码登录",
    dependencies=[Depends(auth_login_phone_rate_limit)],
)
async def login_by_phone(
    request: PhoneLoginRequest,
    db: DbSession,
) -> LoginResponse:
    """使用手机号和验证码登录。"""
    return await AuthService.login_by_phone(db=db, phone=request.phone, code=request.code)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="刷新访问令牌",
    dependencies=[Depends(auth_refresh_rate_limit)],
)
async def refresh_token(
    request: RefreshTokenRequest,
    db: DbSession,
) -> TokenResponse:
    """使用刷新令牌换取新的访问令牌。"""
    return await AuthService.refresh_tokens(db=db, refresh_token=request.refresh_token)


@router.post("/logout", response_model=MessageResponse, summary="退出登录")
async def logout(request: LogoutRequest | None = None) -> MessageResponse:
    """注销当前刷新令牌。"""
    await AuthService.logout(request.refresh_token if request else None)
    return MessageResponse(message="退出登录成功")
