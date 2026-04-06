"""
模型模块导入入口。

导入这些模型用于注册到 SQLAlchemy 元数据，供 Alembic 和 ORM 使用。
"""

from app.models.article import Article as Article
from app.models.learning_feedback import LearningFeedback as LearningFeedback
from app.models.membership import Membership as Membership
from app.models.mistake_book import MistakeBookEntry as MistakeBookEntry
from app.models.note import Note as Note
from app.models.practice_session import PracticeSession as PracticeSession
from app.models.review_schedule import ReviewLog as ReviewLog
from app.models.review_schedule import ReviewSchedule as ReviewSchedule
from app.models.study_log import StudyLog as StudyLog
from app.models.user import User as User
from app.models.vocabulary import Vocabulary as Vocabulary
