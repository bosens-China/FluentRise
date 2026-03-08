"""
TTS 语音合成服务
使用 edge-tts 生成文章音频
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.schemas.article import ArticleContent

try:
    import edge_tts
except ImportError:
    edge_tts = None
    print("Warning: edge_tts not found. Audio generation will be disabled.")

if TYPE_CHECKING:
    from edge_tts.typing import TTSChunk


class TTSService:
    """TTS 语音合成服务类"""

    def __init__(self) -> None:
        """初始化声音映射"""
        # 简单的声音映射
        self.voices = {
            "Narrator": "en-US-ChristopherNeural",
            "Male": "en-US-GuyNeural",
            "Female": "en-US-JennyNeural",
            "Alice": "en-US-AriaNeural",
            "Bob": "en-US-EricNeural",
            "Teacher": "en-US-RogerNeural",
            "Student": "en-US-AnaNeural",
        }
        self.default_voice = "en-US-ChristopherNeural"

    @staticmethod
    def _is_audio_chunk(chunk: TTSChunk) -> bool:
        """
        类型守卫：检查 chunk 是否为音频数据

        使用这种方式可以：
        1. 明确表达意图
        2. 让类型检查器理解类型收窄
        3. 复用逻辑
        """
        return chunk.get("type") == "audio" and "data" in chunk

    @staticmethod
    def _extract_audio_data(chunk: TTSChunk) -> bytes | None:
        """
        安全提取音频数据

        返回 None 表示非音频 chunk 或数据缺失
        """
        if chunk.get("type") != "audio":
            return None

        data = chunk.get("data")
        if data is None:
            return None

        # 确保是 bytes 类型
        if isinstance(data, bytes):
            return data

        # 如果 edge-tts 返回其他类型（如 bytearray），转换为 bytes
        return bytes(data) if data else None

    async def generate_audio_stream(self, article: ArticleContent):
        """
        [弃用] 使用新版带缓存的 generate_article_audio_bytes
        """
        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        for block in article.content:
            voice = self.default_voice
            speaker = block.speaker

            if speaker:
                if speaker in self.voices:
                    voice = self.voices[speaker]
                elif (
                    "Mrs" in speaker
                    or "Miss" in speaker
                    or "Ms" in speaker
                    or "Mother" in speaker
                    or "Girl" in speaker
                    or "Woman" in speaker
                ):
                    voice = self.voices["Female"]
                elif "Mr" in speaker or "Father" in speaker or "Boy" in speaker or "Man" in speaker:
                    voice = self.voices["Male"]

            communicate = edge_tts.Communicate(block.en, voice)

            async for chunk in communicate.stream():
                audio_data = self._extract_audio_data(chunk)
                if audio_data is not None:
                    yield audio_data

    async def generate_article_audio_bytes(self, article: ArticleContent, article_id: int) -> bytes:
        """
        生成整篇文章的音频，并使用 Redis 缓存 30 天
        """
        import base64

        from app.db.redis import get_redis

        redis_client = await get_redis()
        cache_key = f"tts:article:{article_id}"

        # 通过 base64 编码绕过 Redis 客户端可能存在的默认 UTF-8 解码问题
        cached_b64 = await redis_client.execute_command("GET", cache_key)
        if cached_b64:
            try:
                return base64.b64decode(cached_b64)
            except Exception:
                pass  # 忽略旧的损坏缓存

        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        audio_data = bytearray()

        # 1. 朗读标题 (增加标点使其产生停顿)
        title_comm = edge_tts.Communicate(f"{article.title}. . ", self.default_voice)
        async for chunk in title_comm.stream():
            audio_bytes = self._extract_audio_data(chunk)
            if audio_bytes is not None:
                audio_data.extend(audio_bytes)

        # 2. 朗读正文
        for block in article.content:
            voice = self.default_voice
            speaker = block.speaker

            if speaker:
                if speaker in self.voices:
                    voice = self.voices[speaker]
                elif any(
                    title in speaker for title in ["Mrs", "Miss", "Ms", "Mother", "Girl", "Woman"]
                ):
                    voice = self.voices["Female"]
                elif any(title in speaker for title in ["Mr", "Father", "Boy", "Man"]):
                    voice = self.voices["Male"]

            # 在每段话结尾增加句号，利用 edge-tts 的特性生成自然的段落停顿，避免 MP3 直接拼接过于紧凑
            text_to_speak = f"{block.en}. . "
            communicate = edge_tts.Communicate(text_to_speak, voice)
            async for chunk in communicate.stream():
                audio_bytes = self._extract_audio_data(chunk)
                if audio_bytes is not None:
                    audio_data.extend(audio_bytes)

        audio_bytes = bytes(audio_data)
        if audio_bytes:
            # 存入前进行 base64 编码，确保写入的是纯文本字符
            b64_data = base64.b64encode(audio_bytes).decode("ascii")
            await redis_client.execute_command("SETEX", cache_key, 30 * 24 * 3600, b64_data)

        return audio_bytes

    async def get_audio_bytes_cached(self, text: str, voice: str | None = None) -> bytes:
        """
        生成单句/单词音频，并缓存 30 天
        """
        import base64
        import hashlib

        from app.db.redis import get_redis

        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        voice = voice or self.default_voice
        text_hash = hashlib.md5(f"{voice}:{text}".encode("utf-8")).hexdigest()
        cache_key = f"tts:single:{text_hash}"

        redis_client = await get_redis()

        # 通过 base64 编码绕过 Redis 客户端可能存在的默认 UTF-8 解码问题
        cached_b64 = await redis_client.execute_command("GET", cache_key)
        if cached_b64:
            try:
                return base64.b64decode(cached_b64)
            except Exception:
                pass  # 忽略旧的损坏缓存

        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            audio_bytes = self._extract_audio_data(chunk)
            if audio_bytes is not None:
                audio_data.extend(audio_bytes)

        audio_bytes = bytes(audio_data)
        if audio_bytes:
            # 存入前进行 base64 编码，确保写入的是纯文本字符
            b64_data = base64.b64encode(audio_bytes).decode("ascii")
            await redis_client.execute_command("SETEX", cache_key, 30 * 24 * 3600, b64_data)

        return audio_bytes


tts_service = TTSService()
