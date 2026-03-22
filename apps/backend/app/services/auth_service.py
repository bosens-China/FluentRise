"""
认证服务
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_sms_code,
)
from app.db.redis import delete_sms_code, get_sms_code, is_code_sent_recently, set_sms_code
from app.models.user import User
from app.schemas.user import LoginResponse, TokenResponse, UserInfo
from app.services.membership_service import membership_service


class AuthService:
    """认证服务类"""

    # 开发环境固定验证码
    DEV_SMS_CODE = "123456"

    @staticmethod
    async def send_sms_code(phone: str) -> tuple[bool, str | None]:
        """
        发送短信验证码
        开发环境返回固定验证码 123456
        生产环境调用短信服务商 API
        """
        # 检查是否频繁发送
        if await is_code_sent_recently(phone):
            return False, "发送过于频繁，请稍后再试"

        # 开发环境使用固定验证码
        if settings.ENVIRONMENT == "development":
            code = AuthService.DEV_SMS_CODE
            await set_sms_code(phone, code, settings.SMS_CODE_EXPIRE_SECONDS)
            print(f"【FluentRise】开发环境固定验证码: {code} (手机号: {phone})")
            return True, None

        # 生产环境生成随机验证码
        code = generate_sms_code(settings.SMS_CODE_LENGTH)
        await set_sms_code(phone, code, settings.SMS_CODE_EXPIRE_SECONDS)

        # TODO: 调用短信服务商发送短信
        print(f"【FluentRise】验证码 {code} 已发送至 {phone}")

        return True, None

    @staticmethod
    async def verify_sms_code(phone: str, code: str) -> bool:
        """验证短信验证码"""
        # 开发环境直接通过
        if settings.ENVIRONMENT == "development" and code == AuthService.DEV_SMS_CODE:
            await delete_sms_code(phone)
            return True

        stored_code = await get_sms_code(phone)
        if not stored_code:
            return False

        # 验证码匹配（不区分大小写）
        if stored_code.lower() == code.lower():
            await delete_sms_code(phone)
            return True

        return False

    @staticmethod
    async def get_or_create_user(db: AsyncSession, phone: str) -> User:
        """获取或创建用户"""
        # 查询用户
        result = await db.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()

        if user is None:
            # 创建新用户
            user = User(
                phone=phone,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # 更新最后登录时间
            user.last_login_at = func.now()
            await db.commit()
            await db.refresh(user)

        await membership_service.ensure_membership(db, user.id)
        return user

    @staticmethod
    async def login_by_phone(db: AsyncSession, phone: str, code: str) -> LoginResponse | None:
        """手机号验证码登录"""
        # 验证验证码
        is_valid = await AuthService.verify_sms_code(phone, code)
        if not is_valid:
            return None

        # 获取或创建用户
        user = await AuthService.get_or_create_user(db, phone)

        # 生成令牌
        token_data = {"sub": str(user.id), "phone": user.phone}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # 构建响应
        return LoginResponse(
            user=UserInfo.model_validate(user),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            ),
        )

    @staticmethod
    async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse | None:
        """刷新访问令牌"""
        from app.core.security import decode_token

        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return None

        user_id = payload.get("sub")
        phone = payload.get("phone")

        if not user_id:
            return None

        # 刷新前校验用户状态，避免被禁用/删除用户继续换取访问令牌
        result = await db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            return None

        # 生成新令牌
        token_data = {"sub": str(user.id), "phone": user.phone or phone}
        new_access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
