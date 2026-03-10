"""
TTS 音频 API

提供单词/句子音频的 HTTP 接口，支持浏览器缓存
"""

import hashlib
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["语音合成"])


class AudioQueryParams(BaseModel):
    """音频查询参数"""
    word: str = Field(..., min_length=1, max_length=200, description="要合成的文本（单词或句子）")
    voice: str = Field(default="en-US-ChristopherNeural", description="语音类型")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")


def generate_cache_key(word: str, voice: str, speed: float) -> str:
    """生成缓存 key"""
    content = f"{voice}:{speed}:{word.lower().strip()}"
    return hashlib.md5(content.encode("utf-8")).hexdigest()


@router.get("/audio")
async def get_audio(
    word: str = Query(..., min_length=1, max_length=200, description="要合成的文本"),
    voice: str = Query(default="en-US-ChristopherNeural", description="语音类型"),
    speed: float = Query(default=1.0, ge=0.5, le=2.0, description="语速"),
) -> Any:
    """
    获取单词/句子音频

    支持浏览器缓存（Cache-Control: public, max-age=2592000）
    首次请求会异步生成并缓存到 Redis
    """
    if not word.strip():
        raise HTTPException(status_code=400, detail="单词不能为空")

    try:
        # 获取音频字节（内部有 Redis 缓存和分布式锁）
        audio_bytes = await tts_service.get_audio_bytes_cached_with_lock(
            word.strip(),
            voice=voice,
            speed=speed,
        )

        if not audio_bytes:
            raise HTTPException(status_code=500, detail="音频生成失败")

        # 生成 ETag（用于浏览器缓存验证）
        cache_key = generate_cache_key(word, voice, speed)
        etag = f'"{cache_key}"'

        # 返回音频，设置缓存头
        # 30 天 HTTP 缓存
        headers = {
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag": etag,
            "Content-Disposition": f'inline; filename="{cache_key}.mp3"',
        }

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers=headers,
        )

    except ImportError:
        raise HTTPException(status_code=503, detail="TTS 服务未安装")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"音频生成失败: {str(exc)}")


@router.get("/word/{word:path}")
async def get_word_audio(
    word: str,
    voice: str = Query(default="en-US-ChristopherNeural"),
) -> Any:
    """
    简化版：获取单词音频

    URL 示例: /tts/word/hello?voice=en-US-ChristopherNeural
    """
    return await get_audio(
        word=word,
        voice=voice,
        speed=1.0,
    )
