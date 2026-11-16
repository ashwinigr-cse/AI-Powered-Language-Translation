from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_name: str = "LinguaAI Backend"
    app_env: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = "sqlite:///./linguaai.db"
    translation_provider: str = "libretranslate"
    libretranslate_url: str = "https://libretranslate.com"
    libretranslate_api_key: str = ""
    request_timeout_seconds: float = 15.0

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def resolved_database_url(self) -> str:
        if self.database_url.startswith("sqlite:///./"):
            relative_path = self.database_url.removeprefix("sqlite:///./")
            db_path = (BACKEND_DIR / relative_path).resolve()
            return f"sqlite:///{db_path}"
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
