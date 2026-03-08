"""
认证相关路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db
from app.schemas.user import (
    LoginResponse,
    MessageResponse,
    PhoneLoginRequest,
    RefreshTokenRequest,
    SendSmsCodeRequest,
    SmsCodeResponse,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/sms/send", response_model=SmsCodeResponse, summary="发送短信验证码")
async def send_sms_code(
    request: SendSmsCodeRequest,
) -> SmsCodeResponse:
    """
    发送短信验证码到指定手机号
    - 同一个手机号 60 秒内只能发送一次
    - 验证码 5 分钟内有效
    - 开发环境会返回验证码（生产环境不会）
    """
    success, result = await AuthService.send_sms_code(request.phone)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=result,
        )

    # 默认不回传验证码，避免泄露
    message = "验证码已发送"
    if settings.ENVIRONMENT == "development":
        message = "验证码已发送（开发环境请查看后端日志）"

    return SmsCodeResponse(
        message=message,
        expire_seconds=300,
    )


@router.post("/login/phone", response_model=LoginResponse, summary="手机号验证码登录")
async def login_by_phone(
    request: PhoneLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    使用手机号和验证码登录
    - 如果用户不存在会自动注册
    - 返回访问令牌和刷新令牌
    """
    result = await AuthService.login_by_phone(db, request.phone, request.code)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="验证码错误或已过期",
        )

    return result


@router.post("/refresh", response_model=TokenResponse, summary="刷新访问令牌")
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    使用刷新令牌获取新的访问令牌
    """
    result = await AuthService.refresh_tokens(db, request.refresh_token)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的刷新令牌",
        )

    return result


@router.post("/logout", response_model=MessageResponse, summary="退出登录")
async def logout() -> MessageResponse:
    """
    退出登录（客户端需要删除令牌）
    后端可以选择将令牌加入黑名单（当前版本仅返回成功）
    """
    return MessageResponse(message="退出登录成功")
