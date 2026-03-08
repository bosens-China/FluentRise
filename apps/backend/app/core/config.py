"""
应用配置管理
"""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置类"""

    # 应用信息
    APP_NAME: str = "FluentRise Backend"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # 安全
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30天

    # 数据库
    DATABASE_URL: str = (
        "postgresql+asyncpg://fluentrise:dev_password_8847@localhost:54327/fluentrise_db"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6381/0"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str | None = None  # 兼容 OpenAI 的第三方 API（如 DeepSeek）

    # 验证码
    SMS_CODE_EXPIRE_SECONDS: int = 300  # 5分钟
    SMS_CODE_LENGTH: int = 6

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        """非开发环境禁止使用弱默认密钥。"""
        insecure_values = {
            "",
            "your-secret-key-change-in-production",
            "CHANGE_ME",
            "CHANGE_ME_IN_ENV",
        }
        if self.ENVIRONMENT != "development" and self.SECRET_KEY in insecure_values:
            raise ValueError("生产环境必须配置安全的 SECRET_KEY")
        return self


@lru_cache
def get_settings() -> Settings:
    """获取配置实例（缓存）"""
    return Settings()


settings = get_settings()
