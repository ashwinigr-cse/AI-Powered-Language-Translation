import asyncio
import io

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from gtts import gTTS
from gtts.lang import tts_langs
from pydantic import BaseModel, Field, field_validator

router = APIRouter(tags=["Text-to-Speech"])

TTS_LANG_ALIASES = {
    "auto": "en",
    "zh": "zh-CN",
    "zh-hans": "zh-CN",
    "zh-hant": "zh-TW",
    "pt-br": "pt",
    "he": "iw",
}


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    lang: str = Field(default="en", min_length=2, max_length=20)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text for speech synthesis cannot be empty.")
        return cleaned


def _resolve_tts_lang(lang_code: str) -> str:
    raw = (lang_code or "en").strip()
    lower = raw.lower()
    mapped = TTS_LANG_ALIASES.get(lower, raw)

    supported = tts_langs()
    if mapped in supported:
        return mapped
    if lower in supported:
        return lower
    base = lower.split("-")[0]
    if base in supported:
        return base
    raise HTTPException(
        status_code=422,
        detail={
            "error_code": "TTS_LANGUAGE_UNSUPPORTED",
            "message": f"Audio synthesis is not available for language '{lang_code}'.",
        },
    )


def _synthesize_mp3(text: str, lang: str) -> bytes:
    buf = io.BytesIO()
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.write_to_fp(buf)
    return buf.getvalue()


async def _build_tts_response(text: str, lang: str) -> StreamingResponse:
    cleaned = text.strip()
    if not cleaned:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "Text for speech synthesis cannot be empty.",
            },
        )
    if len(cleaned) > 5000:
        raise HTTPException(
            status_code=422,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "Text for speech synthesis exceeds 5000 characters.",
            },
        )

    resolved_lang = _resolve_tts_lang(lang)
    try:
        mp3_bytes = await asyncio.to_thread(_synthesize_mp3, cleaned, resolved_lang)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=424,
            detail={
                "error_code": "TTS_SYNTHESIS_FAILED",
                "message": f"Unable to synthesize speech audio: {exc}",
            },
        ) from exc

    return StreamingResponse(
        io.BytesIO(mp3_bytes),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": 'inline; filename="linguaai-speech.mp3"',
        },
    )


@router.get("/tts")
async def synthesize_speech_get(
    text: str = Query(..., min_length=1, max_length=5000),
    lang: str = Query(default="en", min_length=2, max_length=20),
):
    return await _build_tts_response(text=text, lang=lang)


@router.post("/tts")
async def synthesize_speech_post(payload: TtsRequest):
    return await _build_tts_response(text=payload.text, lang=payload.lang)
