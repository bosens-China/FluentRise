"""
整篇文章音频缓存与时间轴生成。
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any, Callable

from app.schemas.article import ArticleContent

ARTICLE_CACHE_TTL_SECONDS = 30 * 24 * 3600
ARTICLE_AUDIO_CACHE_VERSION = "v2"
ARTICLE_SEGMENT_PADDING_MS = 220


class ArticleAudioBundleService:
    """负责整篇文章音频与时间轴的缓存和生成。"""

    def __init__(
        self,
        *,
        logger: logging.Logger,
        edge_tts_module: Any,
        normalize_audio_text: Callable[[str], str],
        resolve_voice_for_speaker: Callable[[str | None, str | None], str],
        extract_audio_data: Callable[[Any], bytes | None],
        to_ms: Callable[[float | int | None], int],
    ) -> None:
        self.logger = logger
        self.edge_tts = edge_tts_module
        self.normalize_audio_text = normalize_audio_text
        self.resolve_voice_for_speaker = resolve_voice_for_speaker
        self.extract_audio_data = extract_audio_data
        self.to_ms = to_ms

    @staticmethod
    def build_article_cache_keys(article_id: int) -> tuple[str, str, str]:
        cache_prefix = f"tts:{ARTICLE_AUDIO_CACHE_VERSION}:article:{article_id}"
        return (
            f"{cache_prefix}:audio",
            f"{cache_prefix}:timeline",
            f"lock:{cache_prefix}",
        )

    async def get_cached_article_bundle(
        self,
        article_id: int,
    ) -> tuple[bytes | None, list[dict[str, object]] | None]:
        from app.db.redis import get_redis

        redis_client = await get_redis()
        audio_key, timeline_key, _ = self.build_article_cache_keys(article_id)
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

    async def store_article_bundle(
        self,
        article_id: int,
        *,
        audio_bytes: bytes,
        timeline: list[dict[str, object]],
    ) -> None:
        from app.db.redis import get_redis

        redis_client = await get_redis()
        audio_key, timeline_key, _ = self.build_article_cache_keys(article_id)
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
        timeline_json = json.dumps(timeline, ensure_ascii=False)
        await redis_client.execute_command("SETEX", audio_key, ARTICLE_CACHE_TTL_SECONDS, audio_b64)
        await redis_client.execute_command(
            "SETEX", timeline_key, ARTICLE_CACHE_TTL_SECONDS, timeline_json
        )

    async def generate_article_audio_bundle(
        self,
        article: ArticleContent,
    ) -> tuple[bytes, list[dict[str, object]]]:
        if self.edge_tts is None:
            raise ImportError("edge_tts is not installed")

        audio_data = bytearray()
        timeline: list[dict[str, object]] = []
        offset_base_ms = 0

        for paragraph_index, block in enumerate(article.content):
            voice = self.resolve_voice_for_speaker(block.speaker, None)
            communicate = self.edge_tts.Communicate(
                self.normalize_audio_text(block.en),
                voice,
                boundary="WordBoundary",
            )

            words: list[dict[str, object]] = []
            segment_start_ms: int | None = None
            segment_end_ms = offset_base_ms

            async for chunk in communicate.stream():
                audio_bytes = self.extract_audio_data(chunk)
                if audio_bytes is not None:
                    audio_data.extend(audio_bytes)
                    continue

                if chunk.get("type") != "WordBoundary":
                    continue

                word_text = str(chunk.get("text") or "").strip()
                if not word_text:
                    continue

                start_ms = offset_base_ms + self.to_ms(chunk.get("offset"))
                end_ms = max(start_ms + self.to_ms(chunk.get("duration")), start_ms + 1)
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

    async def get_or_create_article_bundle(
        self,
        article: ArticleContent,
        article_id: int,
    ) -> tuple[bytes, list[dict[str, object]]]:
        from app.db.redis import get_redis

        cached_audio, cached_timeline = await self.get_cached_article_bundle(article_id)
        if cached_audio and cached_timeline is not None:
            return cached_audio, cached_timeline

        redis_client = await get_redis()
        _, _, lock_key = self.build_article_cache_keys(article_id)
        lock = redis_client.lock(lock_key, timeout=300, blocking_timeout=30)
        acquired = await lock.acquire(blocking=True)

        if not acquired:
            self.logger.warning("[TTS Lock] Failed to acquire lock for article %s", article_id)
            return await self.generate_article_audio_bundle(article)

        try:
            cached_audio, cached_timeline = await self.get_cached_article_bundle(article_id)
            if cached_audio and cached_timeline is not None:
                return cached_audio, cached_timeline

            self.logger.info("[TTS Lock] Generating audio bundle for article %s", article_id)
            audio_bytes, timeline = await self.generate_article_audio_bundle(article)
            if audio_bytes:
                await self.store_article_bundle(
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

    async def warmup_article_audio(self, article_id: int, article: ArticleContent) -> None:
        from app.db.redis import get_redis

        redis_client = await get_redis()
        _, _, lock_key = self.build_article_cache_keys(article_id)
        lock = redis_client.lock(f"lock:{lock_key}:warmup", timeout=300, blocking_timeout=0)
        acquired = await lock.acquire(blocking=False)

        if not acquired:
            self.logger.debug("[TTS Warmup] Another process is warming article %s", article_id)
            return

        try:
            await self.get_or_create_article_bundle(article, article_id)
            self.logger.info("[TTS Warmup] Completed warmup for article %s", article_id)
        except Exception as exc:
            self.logger.warning("[TTS Warmup] Failed for article %s: %s", article_id, exc)
        finally:
            try:
                await lock.release()
            except Exception:
                pass
