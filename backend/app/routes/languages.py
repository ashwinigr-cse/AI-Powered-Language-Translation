from fastapi import APIRouter, Query, Request

from app.schemas import LanguagesResponse
from app.services.translation_service import TranslationProvider

router = APIRouter(tags=["Languages"])


def get_provider(request: Request) -> TranslationProvider:
    return request.app.state.translation_provider


@router.get("/languages", response_model=LanguagesResponse)
async def list_supported_languages(
    request: Request,
    refresh: bool = Query(default=False, description="Force refresh from translation provider"),
):
    provider = get_provider(request)
    languages = await provider.get_languages(force_refresh=refresh)
    return LanguagesResponse(
        provider=provider.provider_name,
        auto_detect_supported=True,
        count=len(languages),
        languages=languages,
    )
