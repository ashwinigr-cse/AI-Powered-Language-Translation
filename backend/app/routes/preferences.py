from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import UserPreference
from app.schemas import PreferencesResponse, PreferencesUpdateRequest, ProviderStatusResponse

router = APIRouter(tags=["Settings & Preferences"])


def _get_or_create_preferences(db: Session) -> UserPreference:
    prefs = db.get(UserPreference, 1)
    if prefs is None:
        prefs = UserPreference(id=1)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("/preferences", response_model=PreferencesResponse)
def get_preferences(db: Session = Depends(get_db)):
    prefs = _get_or_create_preferences(db)
    return PreferencesResponse.model_validate(prefs)


@router.put("/preferences", response_model=PreferencesResponse)
def update_preferences(payload: PreferencesUpdateRequest, db: Session = Depends(get_db)):
    prefs = _get_or_create_preferences(db)
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    return PreferencesResponse.model_validate(prefs)


@router.get("/settings/status", response_model=ProviderStatusResponse)
def get_provider_status():
    settings = get_settings()
    return ProviderStatusResponse(
        provider=settings.translation_provider,
        provider_url=settings.libretranslate_url,
        api_key_configured=bool(settings.libretranslate_api_key.strip()),
        timeout_seconds=settings.request_timeout_seconds,
        database_ready=True,
        configuration_guide=(
            "Configure LIBRETRANSLATE_URL and optional LIBRETRANSLATE_API_KEY in backend/.env. "
            "Public https://libretranslate.com requires a portal.libretranslate.com API key for /translate, "
            "or you can run a self-hosted LibreTranslate instance on http://localhost:5000."
        ),
    )
