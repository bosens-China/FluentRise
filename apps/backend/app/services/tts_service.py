"""
TTS 语音合成服务
使用 edge-tts 生成文章音频
"""

from app.schemas.article import ArticleContent

try:
    import edge_tts
except ImportError:
    edge_tts = None
    print("Warning: edge_tts not found. Audio generation will be disabled.")


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

    async def generate_audio_stream(self, article: ArticleContent):
        """
        生成文章内容的音频流

        Args:
            article: 文章内容对象

        Yields:
            音频数据字节块

        Raises:
            ImportError: 当 edge_tts 未安装时
        """
        if edge_tts is None:
            raise ImportError("edge_tts is not installed")

        # 我们将连接来自不同说话者的音频流
        # 注意：edge-tts stream() 是异步生成器

        for block in article.content:
            # 确定声音
            voice = self.default_voice
            speaker = block.speaker

            if speaker:
                # 尝试匹配说话者姓名
                if speaker in self.voices:
                    voice = self.voices[speaker]
                # 如果未匹配，则使用简单的性别启发式方法
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

            # 为此块生成音频
            communicate = edge_tts.Communicate(block.en, voice)

            # 直接流式传输并写入字节
            async for chunk in communicate.stream():
                chunk_type = chunk.get("type")
                chunk_data = chunk.get("data")
                if chunk_type == "audio" and chunk_data is not None:
                    yield chunk_data


tts_service = TTSService()
