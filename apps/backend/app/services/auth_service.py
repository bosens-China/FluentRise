"""
认证服务。
"""

from __future__ import annotations

import logging
from secrets import compare_digest

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import TooManyRequestsError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_sms_code,
    generate_token_id,
)
from app.core.time import utc_now
from app.db.redis import (
    delete_sms_code,
    get_refresh_token_owner,
    get_sms_code,
    is_code_sent_recently,
    revoke_refresh_token,
    set_sms_code,
    store_refresh_token,
)
from app.models.user import User
from app.repositories.user_repository import get_user_by_id, get_user_by_phone
from app.schemas.user import LoginResponse, TokenResponse, UserInfo
from app.services.membership_service import membership_service

logger = logging.getLogger(__name__)
REFRESH_TOKEN_EXPIRE_SECONDS = settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60


class AuthService:
    """认证服务。"""

    DEV_SMS_CODE = "123456"

    @staticmethod
    async def send_sms_code(phone: str) -> None:
        if await is_code_sent_recently(phone):
            raise TooManyRequestsError("发送过于频繁，请稍后再试")

        if settings.ENVIRONMENT == "development":
            code = AuthService.DEV_SMS_CODE
            await set_sms_code(phone, code, settings.SMS_CODE_EXPIRE_SECONDS)
            logger.info("开发环境验证码已生成，手机号=%s，验证码=%s", phone, code)
            return

        code = generate_sms_code(settings.SMS_CODE_LENGTH)
        await set_sms_code(phone, code, settings.SMS_CODE_EXPIRE_SECONDS)
        logger.info("验证码已生成并等待短信服务发送，手机号=%s", phone)

    @staticmethod
    async def verify_sms_code(phone: str, code: str) -> bool:
        if settings.ENVIRONMENT == "development" and code == AuthService.DEV_SMS_CODE:
            await delete_sms_code(phone)
            return True

        stored_code = await get_sms_code(phone)
        if not stored_code:
            return False

        if compare_digest(stored_code.lower(), code.lower()):
            await delete_sms_code(phone)
            return True

        return False

    @staticmethod
    async def get_or_create_user(*, db: AsyncSession, phone: str) -> User:
        async with db.begin():
            user = await get_user_by_phone(db, phone=phone)

            if user is None:
                user = User(
                    phone=phone,
                    is_active=True,
                    is_verified=True,
                    last_login_at=utc_now(),
                )
                db.add(user)
                await db.flush()
            else:
                user.last_login_at = utc_now()

            await membership_service.ensure_membership(db=db, user_id=user.id, commit=False)

        await db.refresh(user)
        return user

    @staticmethod
    async def login_by_phone(*, db: AsyncSession, phone: str, code: str) -> LoginResponse:
        if not await AuthService.verify_sms_code(phone, code):
            raise UnauthorizedError("验证码错误或已过期")

        user = await AuthService.get_or_create_user(db=db, phone=phone)
        token_data = {"sub": str(user.id), "phone": user.phone}

        access_token = create_access_token(token_data)
        refresh_jti = generate_token_id()
        refresh_token = create_refresh_token({**token_data, "jti": refresh_jti})
        await store_refresh_token(refresh_jti, user.id, REFRESH_TOKEN_EXPIRE_SECONDS)

        return LoginResponse(
            user=UserInfo.model_validate(user),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
        )

    @staticmethod
    async def refresh_tokens(*, db: AsyncSession, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("无效的刷新令牌")

        user_id = payload.get("sub")
        phone = payload.get("phone")
        refresh_jti = payload.get("jti")

        if not isinstance(user_id, str) or not user_id:
            raise UnauthorizedError("无效的刷新令牌")
        if not isinstance(refresh_jti, str) or not refresh_jti:
            raise UnauthorizedError("无效的刷新令牌")

        refresh_owner = await get_refresh_token_owner(refresh_jti)
        if refresh_owner != user_id:
            raise UnauthorizedError("无效的刷新令牌")

        user = await get_user_by_id(db, user_id=int(user_id))
        if user is None or not user.is_active:
            await revoke_refresh_token(refresh_jti)
            raise UnauthorizedError("无效的刷新令牌")

        token_data = {"sub": str(user.id), "phone": user.phone or phone}
        new_access_token = create_access_token(token_data)
        new_refresh_jti = generate_token_id()
        new_refresh_token = create_refresh_token({**token_data, "jti": new_refresh_jti})

        await revoke_refresh_token(refresh_jti)
        await store_refresh_token(new_refresh_jti, user.id, REFRESH_TOKEN_EXPIRE_SECONDS)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    @staticmethod
    async def logout(refresh_token: str | None) -> None:
        if not refresh_token:
            return

        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return

        refresh_jti = payload.get("jti")
        if not isinstance(refresh_jti, str) or not refresh_jti:
            return

        await revoke_refresh_token(refresh_jti)
