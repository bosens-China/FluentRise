"""
TTS 语音合成服务。

使用 `edge-tts` 生成单词、句子和整篇课文音频，并缓存全文朗读时间轴。
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
from typing import TYPE_CHECKING

from app.schemas.article import ArticleContent
from app.services.speech.article_audio_bundle import (
    ARTICLE_CACHE_TTL_SECONDS,
    ArticleAudioBundleService,
)

try:
    import edge_tts
except ImportError:
    edge_tts = None
    print("Warning: edge_tts not found. Audio generation will be disabled.")

if TYPE_CHECKING:
    from edge_tts.typing import TTSChunk

logger = logging.getLogger(__name__)


def generate_cache_key(word: str, voice: str, speed: float) -> str:
    """生成缓存 key。"""
    content = f"{voice}:{speed}:{word.lower().strip()}"
    return hashlib.md5(content.encode("utf-8")).hexdigest()


FULL_TEXT_VOICE = "en-US-AriaNeural" # 成熟专业
MALE_VOICE = "en-US-GuyNeural"      # 稳重
FEMALE_VOICE = "en-US-JennyNeural"  # 活泼
TEACHER_VOICE = "en-US-BrianNeural" # 干练
STUDENT_VOICE = "en-US-EmmaNeural"  # 甜美
CHILD_VOICE = "en-US-AnaNeural"    # 童声


class TTSService:
    """TTS 语音合成服务类。"""

    def __init__(self) -> None:
        self.default_voice = FULL_TEXT_VOICE
        self.named_speaker_voices = {
            "tom": MALE_VOICE,
            "jack": MALE_VOICE,
            "dad": MALE_VOICE,
            "father": MALE_VOICE,
            "grandfather": MALE_VOICE,
            "grandpa": MALE_VOICE,
            "mr lee": MALE_VOICE,
            "mr. lee": MALE_VOICE,
            "mom": FEMALE_VOICE,
            "mum": FEMALE_VOICE,
            "mother": FEMALE_VOICE,
            "grandmother": FEMALE_VOICE,
            "grandma": FEMALE_VOICE,
            "amy": FEMALE_VOICE,
            "emma": FEMALE_VOICE,
            "lily": FEMALE_VOICE,
            "ms anna": FEMALE_VOICE,
            "ms. anna": FEMALE_VOICE,
            "teacher": TEACHER_VOICE,
            "student": STUDENT_VOICE,
            "kid": CHILD_VOICE,
            "child": CHILD_VOICE,
            "boy": CHILD_VOICE,
            "girl": CHILD_VOICE,
            "narrator": FULL_TEXT_VOICE,
        }
        self.female_markers = {
            "mrs",
            "miss",
            "ms",
            "mother",
            "mom",
            "mum",
            "woman",
            "lady",
            "grandma",
            "grandmother",
        }
        self.male_markers = {
            "mr",
            "father",
            "dad",
            "man",
            "sir",
            "grandpa",
            "grandfather",
        }
        self.child_markers = {
            "kid",
            "child",
            "boy",
            "girl",
            "baby",
            "son",
            "daughter",
        }
        self.article_audio_bundle_service = ArticleAudioBundleService(
            logger=logger,
            edge_tts_module=edge_tts,
            normalize_audio_text=self._normalize_audio_text,
            resolve_voice_for_speaker=self.resolve_voice_for_speaker,
            extract_audio_data=self._extract_audio_data,
            to_ms=self._to_ms,
        )

    @staticmethod
    def _extract_audio_data(chunk: TTSChunk) -> bytes | None:
        if chunk.get("type") != "audio":
            return None

        data = chunk.get("data")
        if data is None:
            return None
        if isinstance(data, bytes):
            return data
        return bytes(data) if data else None

    @staticmethod
    def _to_ms(value: float | int | None) -> int:
        if value is None:
            return 0
        return max(0, int(round(float(value) / 10_000)))

    @staticmethod
    def _normalize_speaker_name(speaker: str) -> str:
        return re.sub(r"\s+", " ", speaker.strip().lower())

    @staticmethod
    def _normalize_audio_text(text: str) -> str:
        stripped = text.strip()
        if not stripped:
            return stripped
        if stripped[-1] in {".", "!", "?"}:
            return stripped
        return f"{stripped}."

    def resolve_voice_for_speaker(
        self,
        speaker: str | None,
        voice: str | None = None,
    ) -> str:
        """根据说话人名称选择合适声线。"""
        if voice:
            return voice
        if not speaker:
            return self.default_voice

        normalized = self._normalize_speaker_name(speaker)
        if normalized in self.named_speaker_voices:
            return self.named_speaker_voices[normalized]

        tokens = {token for token in re.split(r"[^a-z]+", normalized) if token}
        if tokens & self.child_markers:
            return CHILD_VOICE
        if tokens & self.female_markers:
            return FEMALE_VOICE
        if tokens & self.male_markers:
            return MALE_VOICE
        if "teacher" in tokens:
            return TEACHER_VOICE
        if "student" in tokens:
            return STUDENT_VOICE
        return self.default_voice

    async def generate_audio_stream(self, article: ArticleContent):
        """兼容旧调用的流式接口。"""
        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        for block in article.content:
            voice = self.resolve_voice_for_speaker(block.speaker)
            communicate = edge_tts.Communicate(
                self._normalize_audio_text(block.en),
                voice,
                boundary="WordBoundary",
            )
            async for chunk in communicate.stream():
                audio_data = self._extract_audio_data(chunk)
                if audio_data is not None:
                    yield audio_data

    async def generate_article_audio_bytes(self, article: ArticleContent, article_id: int) -> bytes:
        """生成整篇文章音频。"""
        audio_bytes, _ = await self.article_audio_bundle_service.get_or_create_article_bundle(
            article,
            article_id,
        )
        return audio_bytes

    async def get_article_audio_timeline(
        self,
        article: ArticleContent,
        article_id: int,
    ) -> list[dict[str, object]]:
        """获取整篇文章的朗读时间轴。"""
        _, timeline = await self.article_audio_bundle_service.get_or_create_article_bundle(
            article,
            article_id,
        )
        return timeline

    async def get_audio_bytes_cached(
        self,
        text: str,
        voice: str | None = None,
        speaker: str | None = None,
    ) -> bytes:
        """生成单词或句子音频，并缓存 30 天。"""
        from app.db.redis import get_redis

        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        resolved_voice = self.resolve_voice_for_speaker(speaker, voice)
        text_hash = hashlib.md5(f"{resolved_voice}:{text}".encode("utf-8")).hexdigest()
        cache_key = f"tts:single:{text_hash}"
        redis_client = await get_redis()

        cached_b64 = await redis_client.execute_command("GET", cache_key)
        if cached_b64:
            try:
                return base64.b64decode(cached_b64)
            except Exception:
                pass

        audio_bytes = await self._generate_audio_raw(text, resolved_voice)
        if audio_bytes:
            b64_data = base64.b64encode(audio_bytes).decode("ascii")
            await redis_client.execute_command(
                "SETEX", cache_key, ARTICLE_CACHE_TTL_SECONDS, b64_data
            )
        return audio_bytes

    async def get_audio_bytes_cached_with_lock(
        self,
        text: str,
        voice: str | None = None,
        speed: float = 1.0,
        speaker: str | None = None,
    ) -> bytes:
        """生成单词或句子音频，并用分布式锁避免缓存击穿。"""
        from app.db.redis import get_redis

        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        resolved_voice = self.resolve_voice_for_speaker(speaker, voice)
        text_hash = hashlib.md5(f"{resolved_voice}:{speed}:{text}".encode("utf-8")).hexdigest()
        cache_key = f"tts:single:{text_hash}"
        lock_key = f"lock:{cache_key}"
        redis_client = await get_redis()

        cached_b64 = await redis_client.execute_command("GET", cache_key)
        if cached_b64:
            try:
                return base64.b64decode(cached_b64)
            except Exception:
                pass

        lock = redis_client.lock(lock_key, timeout=120, blocking_timeout=10)
        acquired = await lock.acquire(blocking=True)

        if not acquired:
            logger.warning("[TTS Lock] Failed to acquire lock for text: %s", text[:50])
            return await self._generate_audio_raw(text, resolved_voice, speed)

        try:
            cached_b64 = await redis_client.execute_command("GET", cache_key)
            if cached_b64:
                try:
                    return base64.b64decode(cached_b64)
                except Exception:
                    pass

            audio_bytes = await self._generate_audio_raw(text, resolved_voice, speed)
            if audio_bytes:
                b64_data = base64.b64encode(audio_bytes).decode("ascii")
                await redis_client.execute_command(
                    "SETEX",
                    cache_key,
                    ARTICLE_CACHE_TTL_SECONDS,
                    b64_data,
                )
            return audio_bytes
        finally:
            try:
                await lock.release()
            except Exception:
                pass

    async def _generate_audio_raw(
        self,
        text: str,
        voice: str,
        speed: float = 1.0,
    ) -> bytes:
        """底层音频生成。"""
        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        rate_str = "+0%"
        if speed > 1.0:
            rate_str = f"+{int((speed - 1) * 100)}%"
        elif speed < 1.0:
            rate_str = f"-{int((1 - speed) * 100)}%"

        communicate = edge_tts.Communicate(text, voice, rate=rate_str)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            audio_bytes = self._extract_audio_data(chunk)
            if audio_bytes is not None:
                audio_data.extend(audio_bytes)
        return bytes(audio_data)

    async def warmup_article_audio(self, article_id: int, article: ArticleContent) -> None:
        """异步预热整篇文章音频和时间轴。"""
        await self.article_audio_bundle_service.warmup_article_audio(article_id, article)


tts_service = TTSService()
