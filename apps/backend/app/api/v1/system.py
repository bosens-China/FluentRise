"""
系统相关 API 路由
"""

import random
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/system", tags=["系统配置"])


class Quote(BaseModel):
    en: str
    zh: str


# 鼓励语录数据 (100条左右)
ENCOURAGING_QUOTES = [
    {"en": "Every day is a second chance.", "zh": "每一天都是一次重来的机会。"},
    {
        "en": "Believe you can and you're halfway there.",
        "zh": "相信自己能做到，你就已经成功了一半。",
    },
    {
        "en": "It always seems impossible until it's done.",
        "zh": "在事情完成之前，它总是看似不可能的。",
    },
    {
        "en": "Don't watch the clock; do what it does. Keep going.",
        "zh": "不要盯着时钟看；像它一样，继续前进。",
    },
    {
        "en": "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "zh": "成功不是终点，失败也非末日：最重要的是继续前进的勇气。",
    },
    {
        "en": "You are never too old to set another goal or to dream a new dream.",
        "zh": "你永远不会因为太老而不能设定新目标或梦想新梦想。",
    },
    {
        "en": "The only limit to our realization of tomorrow will be our doubts of today.",
        "zh": "实现明天梦想的唯一障碍，是我们今天的疑虑。",
    },
    {
        "en": "Start where you are. Use what you have. Do what you can.",
        "zh": "从你所在的地方开始。用你拥有的一切。做你能做的事。",
    },
    {
        "en": "Failure is the condiment that gives success its flavor.",
        "zh": "失败是让成功更有滋味的调味品。",
    },
    {
        "en": "The harder you work for something, the greater you'll feel when you achieve it.",
        "zh": "你为之努力得越多，当你实现它时感觉就越棒。",
    },
    {"en": "Dream big and dare to fail.", "zh": "做大梦，敢于失败。"},
    {
        "en": "What you do today can improve all your tomorrows.",
        "zh": "你今天做的事可以改善你所有的明天。",
    },
    {"en": "Great things never come from comfort zones.", "zh": "伟大的事物从不源于舒适区。"},
    {"en": "The secret of getting ahead is getting started.", "zh": "成功的秘诀在于开始。"},
    {
        "en": "Don't stop when you're tired. Stop when you're done.",
        "zh": "累了不要停，完成时再停。",
    },
    {
        "en": "Wake up with determination. Go to bed with satisfaction.",
        "zh": "带着决心醒来，带着满足入睡。",
    },
    {
        "en": "Do something today that your future self will thank you for.",
        "zh": "今天做些事，让未来的自己感谢现在的你。",
    },
    {"en": "Little things make big days.", "zh": "小事成就伟大的一天。"},
    {
        "en": "It's going to be hard, but hard does not mean impossible.",
        "zh": "这会很难，但难并不意味着不可能。",
    },
    {"en": "Don't wait for opportunity. Create it.", "zh": "不要等待机会，去创造它。"},
    {
        "en": "Sometimes later becomes never. Do it now.",
        "zh": "有时候‘以后’会变成‘永远不’。现在就去做。",
    },
    {"en": "Your limitation—it's only your imagination.", "zh": "你的局限——只是你的想象力。"},
    {
        "en": "Push yourself, because no one else is going to do it for you.",
        "zh": "逼自己一把，因为没有人会替你去做。",
    },
    {
        "en": "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
        "zh": "有时候我们被考验，不是为了暴露弱点，而是为了发现力量。",
    },
    {
        "en": "The key to success is to focus on goals, not obstacles.",
        "zh": "成功的关键是专注于目标，而不是障碍。",
    },
    {"en": "Dream it. Wish it. Do it.", "zh": "梦想它。期盼它。去做它。"},
    {
        "en": "Success doesn't just find you. You have to go out and get it.",
        "zh": "成功不会主动找你，你必须主动去争取。",
    },
    {"en": "The harder the battle, the sweeter the victory.", "zh": "战斗越艰难，胜利越甜蜜。"},
    {
        "en": "A little progress each day adds up to big results.",
        "zh": "每天进步一点点，积累起来就是大成就。",
    },
    {
        "en": "The only way to do great work is to love what you do.",
        "zh": "做伟大工作的唯一方法是热爱你所做的事。",
    },
    {"en": "If you can dream it, you can do it.", "zh": "如果你能梦想它，你就能做到它。"},
    {"en": "Do what is right, not what is easy.", "zh": "做正确的事，而不是容易的事。"},
    {
        "en": "If it doesn't challenge you, it won't change you.",
        "zh": "如果不挑战你，就不会改变你。",
    },
    {
        "en": "Continuous improvement is better than delayed perfection.",
        "zh": "持续的进步胜过迟来的完美。",
    },
    {
        "en": "Learn as if you will live forever, live like you will die tomorrow.",
        "zh": "学习时就像你将永远活着，生活时就像你明天就会死去。",
    },
    {"en": "Action is the foundational key to all success.", "zh": "行动是所有成功的基本关键。"},
    {
        "en": "Motivation is what gets you started. Habit is what keeps you going.",
        "zh": "动力让你开始。习惯让你继续。",
    },
    {
        "en": "All our dreams can come true, if we have the courage to pursue them.",
        "zh": "只要我们有勇气去追求，我们所有的梦想都能成真。",
    },
    {
        "en": "Keep your face always toward the sunshine—and shadows will fall behind you.",
        "zh": "永远面向阳光——阴影就会落在你身后。",
    },
    {"en": "You are stronger than you think.", "zh": "你比你想象的更坚强。"},
    {
        "en": "A year from now you may wish you had started today.",
        "zh": "一年后你可能会希望你今天就开始了。",
    },
    {"en": "Strive for progress, not perfection.", "zh": "努力追求进步，而不是完美。"},
    {
        "en": "There are no shortcuts to any place worth going.",
        "zh": "任何值得去的地方都没有捷径。",
    },
    {"en": "Believe in yourself and all that you are.", "zh": "相信你自己和你的一切。"},
    {
        "en": "Focus on your goal. Don't look in any direction but ahead.",
        "zh": "专注于你的目标。不要看别处，只看前方。",
    },
    {"en": "Fall seven times and stand up eight.", "zh": "跌倒七次，站起八次。"},
    {
        "en": "Success is the sum of small efforts, repeated day-in and day-out.",
        "zh": "成功是每天日复一日的微小努力的总和。",
    },
    {
        "en": "To be the best, you must be able to handle the worst.",
        "zh": "想要成为最好，你必须能够承受最坏。",
    },
    {
        "en": "Don't count the days, make the days count.",
        "zh": "不要数着日子过，要让每一天都有价值。",
    },
    {"en": "Your only limit is you.", "zh": "你唯一的限制就是你自己。"},
    {"en": "Doubt kills more dreams than failure ever will.", "zh": "怀疑摧毁的梦想比失败更多。"},
    {"en": "Energy and persistence conquer all things.", "zh": "能量和坚持可以征服一切。"},
    {"en": "Mistakes are proof that you are trying.", "zh": "错误是你正在尝试的证明。"},
    {
        "en": "Make today so awesome yesterday gets jealous.",
        "zh": "让今天如此精彩，以至于昨天都会嫉妒。",
    },
    {
        "en": "Opportunities don't happen, you create them.",
        "zh": "机会不是凭空出现的，是你创造的。",
    },
    {
        "en": "Be the change that you wish to see in the world.",
        "zh": "成为你希望在世界上看到的改变。",
    },
    {
        "en": "Everything you've ever wanted is on the other side of fear.",
        "zh": "你曾经想要的一切都在恐惧的另一边。",
    },
    {
        "en": "Never give up on a dream just because of the time it will take to accomplish it.",
        "zh": "不要仅仅因为需要时间而放弃梦想。",
    },
    {
        "en": "The best way to predict your future is to create it.",
        "zh": "预测未来的最好方法就是去创造它。",
    },
    {
        "en": "No matter how slow you go, you are still lapping everybody on the couch.",
        "zh": "不管你走得多慢，你依然领先于那些躺在沙发上的人。",
    },
]


@router.get("/quotes", response_model=list[Quote], summary="获取鼓励语录")
async def get_quotes(count: int = 5) -> list[dict]:
    """
    随机获取指定数量的鼓励语录（支持中英文）
    """
    if count > len(ENCOURAGING_QUOTES):
        count = len(ENCOURAGING_QUOTES)
    return random.sample(ENCOURAGING_QUOTES, count)


@router.get("/tts", summary="通用文字转语音")
async def generate_tts(text: str) -> Any:
    """
    将任意文本转换为语音并返回音频流
    """
    from fastapi import HTTPException, Response, status

    from app.services.tts_service import tts_service

    if not text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文本不能为空")

    try:
        audio_bytes = await tts_service.get_audio_bytes_cached(text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS 服务不可用 (edge-tts 未安装)",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"音频生成失败: {str(e)}",
        )
