from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TranslationRecord
from app.schemas import DetectRequest, DetectResponse, TranslateRequest, TranslateResponse
from app.services.language_detection import LanguageDetectionService
from app.services.translation_service import TranslationProvider

router = APIRouter(tags=["Translation"])


def get_provider(request: Request) -> TranslationProvider:
    return request.app.state.translation_provider


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    payload: TranslateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    provider = get_provider(request)
    languages = await provider.get_languages()
    name_map = {lang.code: lang.name for lang in languages}

    result = await provider.translate(
        text=payload.text,
        source_language=payload.source_language,
        target_language=payload.target_language,
    )

    resolved_source_code = (
        result.detected_language
        if payload.source_language == "auto" and result.detected_language
        else payload.source_language
    )
    source_name = (
        name_map.get(resolved_source_code)
        if resolved_source_code != "auto"
        else "Auto Detect"
    )
    target_name = name_map.get(payload.target_language, payload.target_language)
    char_count = len(payload.text)

    record_id = None
    created_at = datetime.now(timezone.utc)

    if payload.save_to_history:
        record = TranslationRecord(
            source_text=payload.text,
            translated_text=result.translated_text,
            source_language=payload.source_language,
            detected_language=result.detected_language,
            target_language=payload.target_language,
            source_language_name=source_name,
            target_language_name=target_name,
            provider=result.provider,
            character_count=char_count,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_id = record.id
        created_at = record.created_at

    return TranslateResponse(
        id=record_id,
        source_text=payload.text,
        translated_text=result.translated_text,
        source_language=payload.source_language,
        detected_language=result.detected_language,
        detected_confidence=result.detected_confidence,
        target_language=payload.target_language,
        source_language_name=source_name,
        target_language_name=target_name,
        provider=result.provider,
        character_count=char_count,
        created_at=created_at,
    )


@router.post("/detect", response_model=DetectResponse)
async def detect_source_language(
    payload: DetectRequest,
    request: Request,
):
    provider = get_provider(request)
    detector = LanguageDetectionService(provider)
    return await detector.detect(payload.text)
