from typing import Optional

from app.schemas import DetectResponse
from app.services.translation_service import TranslationProvider


class LanguageDetectionService:
    def __init__(self, provider: TranslationProvider):
        self.provider = provider

    async def detect(self, text: str) -> DetectResponse:
        result = await self.provider.detect_language(text)
        language_name: Optional[str] = None

        try:
            languages = await self.provider.get_languages()
            for item in languages:
                if item.code == result.language:
                    language_name = item.name
                    break
        except Exception:
            language_name = None

        return DetectResponse(
            language=result.language,
            confidence=result.confidence,
            language_name=language_name,
        )
