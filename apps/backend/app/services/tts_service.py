"""
TTS 语音合成服务。

使用 `edge-tts` 生成单词、句子和整篇课文音频，并缓存全文朗读时间轴。
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import re
from typing import TYPE_CHECKING

from app.schemas.article import ArticleContent

try:
    import edge_tts
except ImportError:
    edge_tts = None
    print("Warning: edge_tts not found. Audio generation will be disabled.")

if TYPE_CHECKING:
    from edge_tts.typing import TTSChunk

logger = logging.getLogger(__name__)

ARTICLE_CACHE_TTL_SECONDS = 30 * 24 * 3600
ARTICLE_AUDIO_CACHE_VERSION = "v2"
ARTICLE_SEGMENT_PADDING_MS = 220
FULL_TEXT_VOICE = "en-US-ChristopherNeural"
MALE_VOICE = "en-US-EricNeural"
FEMALE_VOICE = "en-US-JennyNeural"
TEACHER_VOICE = "en-US-RogerNeural"
STUDENT_VOICE = "en-US-AnaNeural"


class TTSService:
    """TTS 语音合成服务类。"""

    def __init__(self) -> None:
        self.default_voice = FULL_TEXT_VOICE
        self.named_speaker_voices = {
            "tom": MALE_VOICE,
            "jack": MALE_VOICE,
            "dad": MALE_VOICE,
            "father": MALE_VOICE,
            "mr lee": MALE_VOICE,
            "mr. lee": MALE_VOICE,
            "mom": FEMALE_VOICE,
            "mum": FEMALE_VOICE,
            "mother": FEMALE_VOICE,
            "amy": FEMALE_VOICE,
            "emma": FEMALE_VOICE,
            "lily": FEMALE_VOICE,
            "ms anna": FEMALE_VOICE,
            "ms. anna": FEMALE_VOICE,
            "teacher": TEACHER_VOICE,
            "student": STUDENT_VOICE,
            "narrator": FULL_TEXT_VOICE,
        }
        self.female_markers = {
            "mrs",
            "miss",
            "ms",
            "mother",
            "mom",
            "mum",
            "girl",
            "woman",
            "lady",
        }
        self.male_markers = {
            "mr",
            "father",
            "dad",
            "boy",
            "man",
            "sir",
        }

    @staticmethod
    def _is_audio_chunk(chunk: TTSChunk) -> bool:
        return chunk.get("type") == "audio" and "data" in chunk

    @staticmethod
    def _is_word_boundary_chunk(chunk: TTSChunk) -> bool:
        return chunk.get("type") == "WordBoundary"

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
        normalized = re.sub(r"\s+", " ", speaker.strip().lower())
        return normalized

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
        """根据说话人名称挑选合适声线。"""
        if voice:
            return voice
        if not speaker:
            return self.default_voice

        normalized = self._normalize_speaker_name(speaker)
        if normalized in self.named_speaker_voices:
            return self.named_speaker_voices[normalized]

        tokens = {token for token in re.split(r"[^a-z]+", normalized) if token}
        if tokens & self.female_markers:
            return FEMALE_VOICE
        if tokens & self.male_markers:
            return MALE_VOICE
        if "teacher" in tokens:
            return TEACHER_VOICE
        if "student" in tokens:
            return STUDENT_VOICE
        return self.default_voice

    @staticmethod
    def _build_article_cache_keys(article_id: int) -> tuple[str, str, str]:
        cache_prefix = f"tts:{ARTICLE_AUDIO_CACHE_VERSION}:article:{article_id}"
        return (
            f"{cache_prefix}:audio",
            f"{cache_prefix}:timeline",
            f"lock:{cache_prefix}",
        )

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

    async def _get_cached_article_bundle(
        self,
        article_id: int,
    ) -> tuple[bytes | None, list[dict[str, object]] | None]:
        from app.db.redis import get_redis

        redis_client = await get_redis()
        audio_key, timeline_key, _ = self._build_article_cache_keys(article_id)
        cached_audio_b64 = await redis_client.execute_command("GET", audio_key)
        cached_timeline = await redis_client.execute_command("GET", timeline_key)

        audio_bytes: bytes | None = None
        timeline: list[dict[str, object]] | None = None

        if cached_audio_b64:
            try:
                audio_bytes = base64.b64decode(cached_audio_b64)
            except Exception:
                audio_bytes = None

        if cached_timeline:
            try:
                timeline = json.loads(cached_timeline)
            except Exception:
                timeline = None

        return audio_bytes, timeline

    async def _store_article_bundle(
        self,
        article_id: int,
        *,
        audio_bytes: bytes,
        timeline: list[dict[str, object]],
    ) -> None:
        from app.db.redis import get_redis

        redis_client = await get_redis()
        audio_key, timeline_key, _ = self._build_article_cache_keys(article_id)
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
        timeline_json = json.dumps(timeline, ensure_ascii=False)
        await redis_client.execute_command("SETEX", audio_key, ARTICLE_CACHE_TTL_SECONDS, audio_b64)
        await redis_client.execute_command(
            "SETEX", timeline_key, ARTICLE_CACHE_TTL_SECONDS, timeline_json
        )

    async def _get_or_create_article_bundle(
        self,
        article: ArticleContent,
        article_id: int,
    ) -> tuple[bytes, list[dict[str, object]]]:
        from app.db.redis import get_redis

        cached_audio, cached_timeline = await self._get_cached_article_bundle(article_id)
        if cached_audio and cached_timeline is not None:
            return cached_audio, cached_timeline

        redis_client = await get_redis()
        _, _, lock_key = self._build_article_cache_keys(article_id)
        lock = redis_client.lock(lock_key, timeout=300, blocking_timeout=30)
        acquired = await lock.acquire(blocking=True)

        if not acquired:
            logger.warning("[TTS Lock] Failed to acquire lock for article %s", article_id)
            return await self._generate_article_audio_bundle(article)

        try:
            cached_audio, cached_timeline = await self._get_cached_article_bundle(article_id)
            if cached_audio and cached_timeline is not None:
                return cached_audio, cached_timeline

            logger.info("[TTS Lock] Generating audio bundle for article %s", article_id)
            audio_bytes, timeline = await self._generate_article_audio_bundle(article)
            if audio_bytes:
                await self._store_article_bundle(
                    article_id,
                    audio_bytes=audio_bytes,
                    timeline=timeline,
                )
            return audio_bytes, timeline
        finally:
            try:
                await lock.release()
            except Exception:
                pass

    async def generate_article_audio_bytes(self, article: ArticleContent, article_id: int) -> bytes:
        """生成整篇课文音频。"""
        audio_bytes, _ = await self._get_or_create_article_bundle(article, article_id)
        return audio_bytes

    async def get_article_audio_timeline(
        self,
        article: ArticleContent,
        article_id: int,
    ) -> list[dict[str, object]]:
        """获取整篇课文音频时间轴。"""
        _, timeline = await self._get_or_create_article_bundle(article, article_id)
        return timeline

    async def _generate_article_audio_bundle(
        self,
        article: ArticleContent,
    ) -> tuple[bytes, list[dict[str, object]]]:
        """生成整篇课文音频和时间轴。"""
        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        audio_data = bytearray()
        timeline: list[dict[str, object]] = []
        offset_base_ms = 0

        for paragraph_index, block in enumerate(article.content):
            voice = self.resolve_voice_for_speaker(block.speaker)
            text_to_speak = self._normalize_audio_text(block.en)
            communicate = edge_tts.Communicate(
                text_to_speak,
                voice,
                boundary="WordBoundary",
            )

            words: list[dict[str, object]] = []
            segment_start_ms: int | None = None
            segment_end_ms = offset_base_ms

            async for chunk in communicate.stream():
                audio_bytes = self._extract_audio_data(chunk)
                if audio_bytes is not None:
                    audio_data.extend(audio_bytes)
                    continue

                if not self._is_word_boundary_chunk(chunk):
                    continue

                word_text = str(chunk.get("text") or "").strip()
                if not word_text:
                    continue

                start_ms = offset_base_ms + self._to_ms(chunk.get("offset"))
                end_ms = max(
                    start_ms + self._to_ms(chunk.get("duration")),
                    start_ms + 1,
                )
                words.append(
                    {
                        "text": word_text,
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                    }
                )
                if segment_start_ms is None:
                    segment_start_ms = start_ms
                segment_end_ms = max(segment_end_ms, end_ms)

            if segment_start_ms is None:
                segment_start_ms = offset_base_ms

            segment_end_ms += ARTICLE_SEGMENT_PADDING_MS
            timeline.append(
                {
                    "paragraph_index": paragraph_index,
                    "speaker": block.speaker,
                    "text": block.en,
                    "start_ms": segment_start_ms,
                    "end_ms": segment_end_ms,
                    "words": words,
                }
            )
            offset_base_ms = segment_end_ms

        return bytes(audio_data), timeline

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
        text_hash = hashlib.md5(
            f"{resolved_voice}:{speed}:{text}".encode("utf-8"),
        ).hexdigest()
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
                    "SETEX", cache_key, ARTICLE_CACHE_TTL_SECONDS, b64_data
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
        """原始音频生成。"""
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
        """异步预热课文音频和时间轴。"""
        from app.db.redis import get_redis

        redis_client = await get_redis()
        _, _, lock_key = self._build_article_cache_keys(article_id)
        lock = redis_client.lock(f"lock:{lock_key}:warmup", timeout=300, blocking_timeout=0)
        acquired = await lock.acquire(blocking=False)

        if not acquired:
            logger.debug("[TTS Warmup] Another process is warming article %s", article_id)
            return

        try:
            await self._get_or_create_article_bundle(article, article_id)
            logger.info("[TTS Warmup] Completed warmup for article %s", article_id)
        except Exception as exc:
            logger.warning("[TTS Warmup] Failed for article %s: %s", article_id, exc)
        finally:
            try:
                await lock.release()
            except Exception:
                pass


tts_service = TTSService()
