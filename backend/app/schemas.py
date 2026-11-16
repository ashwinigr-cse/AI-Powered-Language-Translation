from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    provider: str
    provider_url: str
    api_key_configured: bool
    timestamp: datetime


class LanguageItem(BaseModel):
    code: str
    name: str
    targets: List[str] = Field(default_factory=list)


class LanguagesResponse(BaseModel):
    provider: str
    auto_detect_supported: bool
    count: int
    languages: List[LanguageItem]


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_language: str = Field(default="auto", min_length=2, max_length=32)
    target_language: str = Field(..., min_length=2, max_length=32)
    save_to_history: bool = Field(default=True)

    @field_validator("text")
    @classmethod
    def validate_non_empty_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Input text cannot be empty or whitespace only.")
        return stripped

    @field_validator("source_language", "target_language")
    @classmethod
    def normalize_language_code(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Language code cannot be empty.")
        return cleaned


class TranslateResponse(BaseModel):
    id: Optional[int] = None
    source_text: str
    translated_text: str
    source_language: str
    detected_language: Optional[str] = None
    detected_confidence: Optional[float] = None
    target_language: str
    source_language_name: Optional[str] = None
    target_language_name: Optional[str] = None
    provider: str
    character_count: int
    created_at: datetime


class DetectRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)

    @field_validator("text")
    @classmethod
    def validate_detect_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Text for language detection cannot be empty.")
        return stripped


class DetectResponse(BaseModel):
    language: str
    confidence: Optional[float] = None
    language_name: Optional[str] = None


class HistoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_text: str
    translated_text: str
    source_language: str
    detected_language: Optional[str] = None
    target_language: str
    source_language_name: Optional[str] = None
    target_language_name: Optional[str] = None
    provider: str
    character_count: int
    created_at: datetime


class HistoryListResponse(BaseModel):
    total: int
    items: List[HistoryItemResponse]


class DeleteResponse(BaseModel):
    deleted: bool
    deleted_count: int
    message: str


class PreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    default_source_language: str
    default_target_language: str
    auto_save_history: bool
    speech_rate: float
    speech_volume: float
    theme: str
    updated_at: datetime


class PreferencesUpdateRequest(BaseModel):
    default_source_language: Optional[str] = Field(default=None, min_length=2, max_length=32)
    default_target_language: Optional[str] = Field(default=None, min_length=2, max_length=32)
    auto_save_history: Optional[bool] = None
    speech_rate: Optional[float] = Field(default=None, ge=0.5, le=2.0)
    speech_volume: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    theme: Optional[str] = Field(default=None, pattern="^(light|dark)$")


class ProviderStatusResponse(BaseModel):
    provider: str
    provider_url: str
    api_key_configured: bool
    timeout_seconds: float
    database_ready: bool
    configuration_guide: str


class ErrorDetailResponse(BaseModel):
    error_code: str
    message: str
    hint: Optional[str] = None
