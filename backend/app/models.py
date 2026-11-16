from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TranslationRecord(Base):
    __tablename__ = "translation_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_language: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    detected_language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    target_language: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_language_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    target_language_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="libretranslate")
    character_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    default_source_language: Mapped[str] = mapped_column(String(32), nullable=False, default="auto")
    default_target_language: Mapped[str] = mapped_column(String(32), nullable=False, default="hi")
    auto_save_history: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    speech_rate: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    speech_volume: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    theme: Mapped[str] = mapped_column(String(16), nullable=False, default="light")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )
