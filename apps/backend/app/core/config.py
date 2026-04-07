"""
应用配置管理。
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """应用配置。"""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "FluentRise Backend"
    APP_VERSION: str = "0.1.0"
    APP_TIMEZONE: str = "Asia/Shanghai"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    ENABLE_DOCS: bool | None = None
    ENABLE_OPENAPI: bool | None = None

    SECRET_KEY: str = "CHANGE_ME_IN_ENV"
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

    TTS_DEFAULT_VOICE: str = "en-US-ChristopherNeural"

    DASHSCOPE_API_KEY: str = ""
    DASHSCOPE_ASR_MODEL: str = "qwen3-asr-flash-2026-02-10"
    SPEECH_PROVIDER: str = "dashscope"
    SPEECH_DEFAULT_LANGUAGE: str = "en"
    SPEECH_TARGET_DURATION_SECONDS: int = 60
    SPEECH_HARD_MAX_DURATION_SECONDS: int = 65
    SPEECH_READING_PASS_SCORE: int = 65
    SPEECH_MAX_ATTEMPTS: int = 3
    SPEECH_ACCEPTED_CONTENT_TYPES: tuple[str, ...] = (
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
    )
    SPEECH_SUPPORTED_AUDIO_FORMATS: tuple[str, ...] = ("wav",)
    ARTICLE_LISTEN_REQUIRED_COUNT: int = 5
    REVIEW_TOTAL_STAGES: int = 9
    REVIEW_STAGE_INTERVALS_DAYS: tuple[int, ...] = (1, 2, 3, 5, 7, 14, 30, 60, 90)
    PLAYGROUND_HISTORY_PAGE_SIZE: int = 8
    PLAYGROUND_MAX_ATTEMPTS: int = 3

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
            "CHANGE_ME",
            "CHANGE_ME_IN_ENV",
        }
        if self.ENABLE_DOCS is None:
            self.ENABLE_DOCS = self.ENVIRONMENT != "production"
        if self.ENABLE_OPENAPI is None:
            self.ENABLE_OPENAPI = self.ENABLE_DOCS
        if self.ENVIRONMENT != "development" and self.SECRET_KEY in insecure_values:
            raise ValueError("生产环境必须配置安全的 SECRET_KEY")
        return self


@lru_cache
def get_settings() -> Settings:
    """获取配置单例。"""
    return Settings()


settings = get_settings()
