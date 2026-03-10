"""
游乐场题目生成服务
"""

import random
import re
from datetime import date
from typing import Any
from urllib.parse import quote

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.vocabulary import Vocabulary


class QuestionType:
    """题目类型"""
    AUDIO = "audio"           # 听音写词
    MEANING = "meaning"       # 释义写词
    FILL_BLANK = "fill_blank" # 句子填空


class Question:
    """题目数据结构"""
    
    def __init__(
        self,
        word: str,
        meaning: str,
        question_type: str,
        uk_phonetic: str | None = None,
        us_phonetic: str | None = None,
        sentence: str | None = None,
        sentence_translation: str | None = None,
        word_audio_url: str | None = None,
        sentence_audio_url: str | None = None,
    ):
        self.id = f"{question_type}_{word}_{random.randint(1000, 9999)}"
        self.word = word
        self.meaning = meaning
        self.type = question_type
        self.uk_phonetic = uk_phonetic
        self.us_phonetic = us_phonetic
        self.sentence = sentence
        self.sentence_translation = sentence_translation
        self.word_audio_url = word_audio_url  # HTTP URL
        self.sentence_audio_url = sentence_audio_url  # HTTP URL
        self.hint = self._generate_hint()
    
    def _generate_hint(self) -> str:
        """生成提示（首字母）"""
        if len(self.word) <= 2:
            return self.word[0] if self.word else ""
        return self.word[0] + "_" * (len(self.word) - 1)
    
    def to_dict(self) -> dict[str, Any]:
        """转换为字典"""
        result = {
            "id": self.id,
            "type": self.type,
            "word": self.word,
            "meaning": self.meaning,
            "hint": self.hint,
        }
        
        if self.uk_phonetic:
            result["uk_phonetic"] = self.uk_phonetic
        if self.us_phonetic:
            result["us_phonetic"] = self.us_phonetic
        if self.sentence:
            result["sentence"] = self.sentence
        if self.sentence_translation:
            result["sentence_translation"] = self.sentence_translation
        if self.word_audio_url:
            result["word_audio_url"] = self.word_audio_url
        if self.sentence_audio_url:
            result["sentence_audio_url"] = self.sentence_audio_url
            
        return result


def build_audio_url(text: str, voice: str = "en-US-ChristopherNeural", speed: float = 1.0) -> str:
    """
    构建音频 URL
    
    URL 格式: /v1/tts/audio?word={encoded_text}&voice={voice}&speed={speed}
    """
    # 对文本进行 URL 编码
    encoded_text = quote(text, safe='')
    return f"/v1/tts/audio?word={encoded_text}&voice={voice}&speed={speed}"


class QuestionGenerator:
    """题目生成器"""
    
    # 目标题目数量
    TARGET_COUNT = 30
    
    # 各题型数量分配
    TYPE_DISTRIBUTION = {
        QuestionType.AUDIO: 10,
        QuestionType.MEANING: 10,
        QuestionType.FILL_BLANK: 10,
    }
    
    # 默认语音
    DEFAULT_VOICE = "en-US-ChristopherNeural"
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.questions: list[Question] = []
    
    async def generate(self) -> list[Question]:
        """生成题目列表"""
        # 1. 收集单词源和句子源
        words = await self._collect_words()
        sentences = await self._collect_sentences()
        
        # 2. 打乱单词顺序
        random.shuffle(words)
        
        # 3. 根据分配生成各类型题目
        questions = []
        word_index = 0
        
        # 听音写词（前10个单词）
        audio_words = words[:self.TYPE_DISTRIBUTION[QuestionType.AUDIO]]
        for word_data in audio_words:
            word_audio_url = build_audio_url(word_data["word"], self.DEFAULT_VOICE)
            
            q = Question(
                word=word_data["word"],
                meaning=word_data["meaning"],
                question_type=QuestionType.AUDIO,
                uk_phonetic=word_data.get("uk_phonetic"),
                us_phonetic=word_data.get("us_phonetic"),
                word_audio_url=word_audio_url,
            )
            questions.append(q)
            word_index += 1
        
        # 释义写词（接下来10个单词）
        meaning_words = words[
            word_index:
            word_index + self.TYPE_DISTRIBUTION[QuestionType.MEANING]
        ]
        for word_data in meaning_words:
            word_audio_url = build_audio_url(word_data["word"], self.DEFAULT_VOICE)
            
            q = Question(
                word=word_data["word"],
                meaning=word_data["meaning"],
                question_type=QuestionType.MEANING,
                uk_phonetic=word_data.get("uk_phonetic"),
                us_phonetic=word_data.get("us_phonetic"),
                word_audio_url=word_audio_url,
            )
            questions.append(q)
            word_index += 1
        
        # 句子填空（最后10个单词）
        fill_words = words[word_index:self.TARGET_COUNT]
        for word_data in fill_words:
            # 尝试找到包含该单词的句子
            sentence_pair = self._find_sentence_with_word(
                word_data["word"], 
                sentences
            )
            
            if sentence_pair:
                sentence_en = sentence_pair["en"]
                sentence_zh = sentence_pair["zh"]
                # 替换单词为下划线
                sentence_with_blank = self._replace_word_with_blank(
                    sentence_en, 
                    word_data["word"]
                )
            else:
                #  fallback：使用简单模板
                sentence_with_blank = f"Please fill in the blank: _____"
                sentence_zh = f"请填写单词：{word_data['meaning']}"
            
            # 生成音频 URL
            word_audio_url = build_audio_url(word_data["word"], self.DEFAULT_VOICE)
            sentence_text = sentence_pair["en"] if sentence_pair else sentence_with_blank.replace("_____", word_data["word"])
            sentence_audio_url = build_audio_url(sentence_text, self.DEFAULT_VOICE)
            
            q = Question(
                word=word_data["word"],
                meaning=word_data["meaning"],
                question_type=QuestionType.FILL_BLANK,
                uk_phonetic=word_data.get("uk_phonetic"),
                us_phonetic=word_data.get("us_phonetic"),
                sentence=sentence_with_blank,
                sentence_translation=sentence_zh,
                word_audio_url=word_audio_url,
                sentence_audio_url=sentence_audio_url,
            )
            questions.append(q)
        
        # 4. 最终打乱所有题目顺序
        random.shuffle(questions)
        
        return questions
    
    async def _collect_words(self) -> list[dict[str, Any]]:
        """收集单词源（今日文章 + 生词本）"""
        words = []
        word_set = set()  # 去重
        
        # 1. 获取今日文章的单词（优先级最高）
        today_words = await self._get_today_article_words()
        for w in today_words:
            if w["word"].lower() not in word_set and len(words) < self.TARGET_COUNT:
                words.append(w)
                word_set.add(w["word"].lower())
        
        # 2. 如果不够，从生词本补充
        if len(words) < self.TARGET_COUNT:
            vocab_words = await self._get_vocabulary_words(
                exclude=word_set,
                limit=self.TARGET_COUNT - len(words)
            )
            words.extend(vocab_words)
            for w in vocab_words:
                word_set.add(w["word"].lower())
        
        # 3. 如果还不够，从历史文章补充
        if len(words) < self.TARGET_COUNT:
            history_words = await self._get_history_article_words(
                exclude=word_set,
                limit=self.TARGET_COUNT - len(words)
            )
            words.extend(history_words)
        
        return words
    
    async def _collect_sentences(self) -> list[dict[str, str]]:
        """收集句子源（从文章 content 中获取）"""
        sentences = []
        
        # 获取用户的文章
        result = await self.db.execute(
            select(Article)
            .where(Article.user_id == self.user_id)
            .order_by(desc(Article.publish_date))
            .limit(20)  # 最近20篇文章
        )
        articles = result.scalars().all()
        
        for article in articles:
            if article.content:
                for item in article.content:
                    if item.get("en") and item.get("zh"):
                        sentences.append({
                            "en": item["en"],
                            "zh": item["zh"],
                        })
        
        return sentences
    
    def _find_sentence_with_word(
        self, 
        word: str, 
        sentences: list[dict[str, str]]
    ) -> dict[str, str] | None:
        """找到包含指定单词的句子"""
        word_lower = word.lower()
        word_pattern = r'\b' + re.escape(word_lower) + r'\b'
        
        # 随机打乱句子顺序，增加多样性
        shuffled = sentences.copy()
        random.shuffle(shuffled)
        
        for sent in shuffled:
            en_text = sent["en"].lower()
            # 检查是否包含完整单词（不是其他单词的一部分）
            if re.search(word_pattern, en_text):
                return sent
        
        return None
    
    def _replace_word_with_blank(self, sentence: str, word: str) -> str:
        """将句子中的单词替换为下划线"""
        word_lower = word.lower()
        word_pattern = r'\b' + re.escape(word_lower) + r'\b'
        
        # 不区分大小写替换
        result = re.sub(word_pattern, "_____", sentence, flags=re.IGNORECASE)
        return result
    
    async def _get_today_article_words(self) -> list[dict[str, Any]]:
        """获取今日文章的单词"""
        today = date.today()
        
        result = await self.db.execute(
            select(Article)
            .where(
                Article.user_id == self.user_id,
                Article.publish_date == today,
            )
        )
        article = result.scalar_one_or_none()
        
        if not article or not article.vocabulary:
            return []
        
        words = []
        for vocab in article.vocabulary:
            words.append({
                "word": vocab["word"],
                "meaning": vocab["meaning"],
                "uk_phonetic": vocab.get("uk_phonetic"),
                "us_phonetic": vocab.get("us_phonetic"),
                "source": "today_article",
            })
        
        return words
    
    async def _get_vocabulary_words(
        self,
        exclude: set[str],
        limit: int,
    ) -> list[dict[str, Any]]:
        """从生词本获取单词"""
        result = await self.db.execute(
            select(Vocabulary)
            .where(Vocabulary.user_id == self.user_id)
            .order_by(desc(Vocabulary.created_at))
            .limit(limit * 2)  # 多取一些用于去重
        )
        vocabularies = result.scalars().all()
        
        words = []
        for vocab in vocabularies:
            if vocab.word.lower() not in exclude and len(words) < limit:
                words.append({
                    "word": vocab.word,
                    "meaning": vocab.meaning,
                    "uk_phonetic": vocab.uk_phonetic,
                    "us_phonetic": vocab.us_phonetic,
                    "source": "vocabulary",
                })
        
        return words
    
    async def _get_history_article_words(
        self,
        exclude: set[str],
        limit: int,
    ) -> list[dict[str, Any]]:
        """从历史文章获取单词"""
        result = await self.db.execute(
            select(Article)
            .where(
                Article.user_id == self.user_id,
                Article.vocabulary.isnot(None),
            )
            .order_by(desc(Article.publish_date))
            .limit(10)  # 最近10篇文章
        )
        articles = result.scalars().all()
        
        words = []
        for article in articles:
            if not article.vocabulary:
                continue
            for vocab in article.vocabulary:
                word_lower = vocab["word"].lower()
                if word_lower not in exclude and len(words) < limit:
                    words.append({
                        "word": vocab["word"],
                        "meaning": vocab["meaning"],
                        "uk_phonetic": vocab.get("uk_phonetic"),
                        "us_phonetic": vocab.get("us_phonetic"),
                        "source": "history_article",
                    })
                    exclude.add(word_lower)
                if len(words) >= limit:
                    break
            if len(words) >= limit:
                break
        
        return words


async def generate_questions(db: AsyncSession, user_id: int) -> list[Question]:
    """生成游乐场题目的便捷函数"""
    generator = QuestionGenerator(db, user_id)
    return await generator.generate()
