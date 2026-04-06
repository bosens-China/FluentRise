"""
文章生成预算与提示词规则。
"""

from __future__ import annotations

import random
from dataclasses import dataclass

GOAL_SCENE_HINTS = {
    "daily": ["邻里交流", "朋友聊天", "日常购物", "家庭生活"],
    "work": ["办公室沟通", "会议准备", "自我介绍", "邮件场景"],
    "study": ["校园生活", "老师提问", "课堂讨论", "图书馆"],
    "travel": ["机场", "酒店", "问路", "点餐"],
    "exam": ["复习计划", "课堂任务", "答题思路", "学习安排"],
    "hobby": ["电影", "运动", "音乐", "社交兴趣"],
    "parent": ["亲子交流", "学校通知", "家庭日常", "陪伴孩子"],
}

SUPPORTED_SPEAKERS = [
    "Tom",
    "Mom",
    "Dad",
    "Amy",
    "Emma",
    "Jack",
    "Lily",
    "Mr. Lee",
    "Ms. Anna",
    "Teacher",
    "Student",
    "Narrator",
]

LEVEL_TARGET_WORDS = {
    0: 40,
    1: 60,
    2: 100,
    3: 150,
    4: 200,
    5: 250,
    6: 300,
}


@dataclass(frozen=True)
class LessonBudget:
    """当前课文的生成预算。"""

    level: int
    target_word_count: int
    new_vocab_max: int


def build_budget(*, user_level: int) -> LessonBudget:
    """构建本次文章预算。严格控制生词率。"""
    target_words = LEVEL_TARGET_WORDS.get(user_level, LEVEL_TARGET_WORDS[0])

    # 核心规则：生词率 <= 5%，且最多 7 个（取极小值）
    max_by_ratio = max(1, int(target_words * 0.05))
    new_vocab_max = min(max_by_ratio, 7)

    return LessonBudget(
        level=user_level,
        target_word_count=target_words,
        new_vocab_max=new_vocab_max,
    )


def pick_scene(learning_goals: list[str], custom_goal: str | None) -> str:
    """优先使用自定义目标，否则从学习目标中选场景。"""
    if custom_goal:
        return custom_goal

    candidates: list[str] = []
    for goal in learning_goals:
        candidates.extend(GOAL_SCENE_HINTS.get(goal, []))

    if not candidates:
        candidates = GOAL_SCENE_HINTS["daily"]
    return random.choice(candidates)
