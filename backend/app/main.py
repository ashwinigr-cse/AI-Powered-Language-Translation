from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.routes import history, languages, preferences, translation, tts
from app.schemas import HealthResponse
from app.services.translation_service import (
    TranslationProvider,
    TranslationProviderError,
    build_translation_provider,
)


def create_app(provider_override: TranslationProvider | None = None) -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        init_db()
        provider = provider_override or build_translation_provider(settings)
        application.state.translation_provider = provider
        try:
            yield
        finally:
            await provider.close()

    application = FastAPI(
        title="LinguaAI Translation API",
        description="REST backend for LinguaAI – Intelligent Language Translator.",
        version="1.0.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.exception_handler(TranslationProviderError)
    async def translation_provider_exception_handler(
        _request: Request, exc: TranslationProviderError
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": exc.error_code,
                "message": exc.message,
                "hint": exc.hint,
            },
        )

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        errors = jsonable_encoder(exc.errors())
        raw_msg = errors[0].get("msg", "Invalid request payload.") if errors else "Invalid request."
        first_msg = raw_msg.removeprefix("Value error, ")
        return JSONResponse(
            status_code=422,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": first_msg,
                "details": errors,
            },
        )

    @application.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict):
            return JSONResponse(status_code=exc.status_code, content=exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": "HTTP_ERROR",
                "message": str(exc.detail),
            },
        )

    @application.get("/api/health", response_model=HealthResponse, tags=["Health"])
    def health_check():
        db_status = "connected"
        try:
            with SessionLocal() as db:
                db.execute(text("SELECT 1"))
        except Exception:
            db_status = "error"

        return HealthResponse(
            status="ok" if db_status == "connected" else "degraded",
            service=settings.app_name,
            database=db_status,
            provider=settings.translation_provider,
            provider_url=settings.libretranslate_url,
            api_key_configured=bool(settings.libretranslate_api_key.strip()),
            timestamp=datetime.now(timezone.utc),
        )

    application.include_router(languages.router, prefix="/api")
    application.include_router(translation.router, prefix="/api")
    application.include_router(history.router, prefix="/api")
    application.include_router(preferences.router, prefix="/api")
    application.include_router(tts.router, prefix="/api")

    return application


app = create_app()
