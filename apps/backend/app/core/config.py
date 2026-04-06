"""
应用配置管理。
"""

from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "FluentRise Backend"
    APP_VERSION: str = "0.1.0"
    APP_TIMEZONE: str = "Asia/Shanghai"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = (
        "postgresql+asyncpg://fluentrise:dev_password_8847@localhost:54327/fluentrise_db"
    )
    REDIS_URL: str = "redis://localhost:6381/0"

    OPENAI_API_KEY: str = ""
    OPENAI_SMART_MODEL: str = "o3-mini"
    OPENAI_FAST_MODEL: str = "gpt-4o-mini"
    OPENAI_BASE_URL: str | None = None

    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_REALTIME_MODEL: str = "qwen3-asr-flash-realtime-2026-02-10"
    SPEECH_TARGET_DURATION_SECONDS: int = 60
    SPEECH_HARD_MAX_DURATION_SECONDS: int = 65

    SMS_CODE_EXPIRE_SECONDS: int = 300
    SMS_CODE_LENGTH: int = 6

    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3002",
        ]
    )

    @model_validator(mode="after")
    def validate_secret_key(self) -> "Settings":
        """非开发环境必须配置安全密钥。"""
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
    """获取配置单例。"""
    return Settings()


settings = get_settings()
