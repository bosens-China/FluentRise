"""初始化后端业务表结构。"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260405_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("nickname", sa.String(length=50), nullable=True),
        sa.Column("avatar", sa.String(length=500), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("english_level", sa.Integer(), nullable=True),
        sa.Column("learning_goals", sa.JSON(), nullable=True),
        sa.Column("custom_goal", sa.String(length=200), nullable=True),
        sa.Column(
            "has_completed_assessment",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("openai_thread_id", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("publish_date", sa.Date(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("source_book", sa.Integer(), nullable=True),
        sa.Column("source_lesson", sa.Integer(), nullable=True),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("vocabulary", sa.JSON(), nullable=True),
        sa.Column("grammar", sa.JSON(), nullable=True),
        sa.Column("tips", sa.JSON(), nullable=True),
        sa.Column("exercises", sa.JSON(), nullable=True),
        sa.Column("is_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "publish_date", name="uq_articles_user_publish_date"),
    )
    op.create_index("ix_articles_id", "articles", ["id"], unique=False)
    op.create_index("ix_articles_publish_date", "articles", ["publish_date"], unique=False)
    op.create_index("ix_articles_user_id", "articles", ["user_id"], unique=False)

    op.create_table(
        "memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="trial"),
        sa.Column("plan_name", sa.String(length=50), nullable=False, server_default="trial_week"),
        sa.Column(
            "started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_memberships_user_id"),
    )
    op.create_index("ix_memberships_id", "memberships", ["id"], unique=False)
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"], unique=False)

    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notes_article_id", "notes", ["article_id"], unique=False)
    op.create_index("ix_notes_id", "notes", ["id"], unique=False)
    op.create_index("ix_notes_user_id", "notes", ["user_id"], unique=False)

    op.create_table(
        "study_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("course_title", sa.String(length=200), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "date", name="uix_user_date"),
    )
    op.create_index("ix_study_logs_date", "study_logs", ["date"], unique=False)
    op.create_index("ix_study_logs_id", "study_logs", ["id"], unique=False)
    op.create_index("ix_study_logs_user_id", "study_logs", ["user_id"], unique=False)

    op.create_table(
        "review_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=False),
        sa.Column("current_stage", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("next_review_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("initial_completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("self_assessment", sa.String(length=20), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_review_schedules_article_id", "review_schedules", ["article_id"], unique=False
    )
    op.create_index("ix_review_schedules_id", "review_schedules", ["id"], unique=False)
    op.create_index("ix_review_schedules_user_id", "review_schedules", ["user_id"], unique=False)

    op.create_table(
        "review_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("stage", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("is_quick_mode", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("preview_assessment", sa.String(length=20), nullable=True),
        sa.Column("quality_assessment", sa.String(length=20), nullable=True),
        sa.Column("correct_count", sa.Integer(), nullable=True),
        sa.Column("total_count", sa.Integer(), nullable=True),
        sa.Column(
            "reviewed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["schedule_id"], ["review_schedules.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_review_logs_id", "review_logs", ["id"], unique=False)
    op.create_index("ix_review_logs_schedule_id", "review_logs", ["schedule_id"], unique=False)

    op.create_table(
        "practice_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wrong_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("details", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_practice_sessions_id", "practice_sessions", ["id"], unique=False)
    op.create_index("ix_practice_sessions_user_id", "practice_sessions", ["user_id"], unique=False)

    op.create_table(
        "learning_feedbacks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=True),
        sa.Column("practice_session_id", sa.Integer(), nullable=True),
        sa.Column("module", sa.String(length=30), nullable=False),
        sa.Column("feedback_type", sa.String(length=30), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["practice_session_id"], ["practice_sessions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_learning_feedbacks_article_id", "learning_feedbacks", ["article_id"], unique=False
    )
    op.create_index(
        "ix_learning_feedbacks_practice_session_id",
        "learning_feedbacks",
        ["practice_session_id"],
        unique=False,
    )
    op.create_index("ix_learning_feedbacks_id", "learning_feedbacks", ["id"], unique=False)
    op.create_index(
        "ix_learning_feedbacks_user_id", "learning_feedbacks", ["user_id"], unique=False
    )

    op.create_table(
        "mistake_book_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("item_type", sa.String(length=30), nullable=False),
        sa.Column("target_text", sa.String(length=500), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=True),
        sa.Column("last_user_answer", sa.Text(), nullable=True),
        sa.Column("context_text", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("mistake_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("correct_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_mastered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "first_seen_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("last_corrected_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "item_type", "target_text", name="uq_mistake_item"),
    )
    op.create_index("ix_mistake_book_entries_id", "mistake_book_entries", ["id"], unique=False)
    op.create_index(
        "ix_mistake_book_entries_user_id", "mistake_book_entries", ["user_id"], unique=False
    )

    op.create_table(
        "vocabularies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("article_id", sa.Integer(), nullable=True),
        sa.Column("word", sa.String(length=100), nullable=False),
        sa.Column("uk_phonetic", sa.String(length=100), nullable=True),
        sa.Column("us_phonetic", sa.String(length=100), nullable=True),
        sa.Column("meaning", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["article_id"], ["articles.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_vocabularies_article_id", "vocabularies", ["article_id"], unique=False)
    op.create_index("ix_vocabularies_id", "vocabularies", ["id"], unique=False)
    op.create_index("ix_vocabularies_user_id", "vocabularies", ["user_id"], unique=False)
    op.create_index("ix_vocabularies_word", "vocabularies", ["word"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_vocabularies_word", table_name="vocabularies")
    op.drop_index("ix_vocabularies_user_id", table_name="vocabularies")
    op.drop_index("ix_vocabularies_id", table_name="vocabularies")
    op.drop_index("ix_vocabularies_article_id", table_name="vocabularies")
    op.drop_table("vocabularies")

    op.drop_index("ix_mistake_book_entries_user_id", table_name="mistake_book_entries")
    op.drop_index("ix_mistake_book_entries_id", table_name="mistake_book_entries")
    op.drop_table("mistake_book_entries")

    op.drop_index("ix_learning_feedbacks_user_id", table_name="learning_feedbacks")
    op.drop_index("ix_learning_feedbacks_id", table_name="learning_feedbacks")
    op.drop_index(
        "ix_learning_feedbacks_practice_session_id",
        table_name="learning_feedbacks",
    )
    op.drop_index("ix_learning_feedbacks_article_id", table_name="learning_feedbacks")
    op.drop_table("learning_feedbacks")

    op.drop_index("ix_practice_sessions_user_id", table_name="practice_sessions")
    op.drop_index("ix_practice_sessions_id", table_name="practice_sessions")
    op.drop_table("practice_sessions")

    op.drop_index("ix_review_logs_schedule_id", table_name="review_logs")
    op.drop_index("ix_review_logs_id", table_name="review_logs")
    op.drop_table("review_logs")

    op.drop_index("ix_review_schedules_user_id", table_name="review_schedules")
    op.drop_index("ix_review_schedules_id", table_name="review_schedules")
    op.drop_index("ix_review_schedules_article_id", table_name="review_schedules")
    op.drop_table("review_schedules")

    op.drop_index("ix_study_logs_user_id", table_name="study_logs")
    op.drop_index("ix_study_logs_id", table_name="study_logs")
    op.drop_index("ix_study_logs_date", table_name="study_logs")
    op.drop_table("study_logs")

    op.drop_index("ix_notes_user_id", table_name="notes")
    op.drop_index("ix_notes_id", table_name="notes")
    op.drop_index("ix_notes_article_id", table_name="notes")
    op.drop_table("notes")

    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_index("ix_memberships_id", table_name="memberships")
    op.drop_table("memberships")

    op.drop_index("ix_articles_user_id", table_name="articles")
    op.drop_index("ix_articles_publish_date", table_name="articles")
    op.drop_index("ix_articles_id", table_name="articles")
    op.drop_table("articles")

    op.drop_index("ix_users_phone", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
