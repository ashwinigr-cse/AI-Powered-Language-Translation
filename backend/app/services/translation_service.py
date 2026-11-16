from abc import ABC, abstractmethod
from dataclasses import dataclass
import time
from typing import Dict, List, Optional

import httpx

from app.config import Settings, get_settings
from app.schemas import LanguageItem


@dataclass
class DetectionResult:
    language: str
    confidence: Optional[float] = None


@dataclass
class TranslationResult:
    translated_text: str
    source_language: str
    target_language: str
    detected_language: Optional[str] = None
    detected_confidence: Optional[float] = None
    provider: str = "libretranslate"


class TranslationProviderError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 424,
        error_code: str = "TRANSLATION_PROVIDER_ERROR",
        hint: Optional[str] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.hint = hint


class UnsupportedLanguageError(TranslationProviderError):
    def __init__(self, message: str, hint: Optional[str] = None):
        super().__init__(
            message,
            status_code=400,
            error_code="UNSUPPORTED_LANGUAGE",
            hint=hint,
        )


class ProviderAuthError(TranslationProviderError):
    def __init__(self, message: str, hint: Optional[str] = None):
        super().__init__(
            message,
            status_code=424,
            error_code="PROVIDER_API_KEY_REQUIRED",
            hint=hint,
        )


class ProviderRateLimitError(TranslationProviderError):
    def __init__(self, message: str, hint: Optional[str] = None):
        super().__init__(
            message,
            status_code=429,
            error_code="PROVIDER_RATE_LIMITED",
            hint=hint,
        )


class ProviderTimeoutError(TranslationProviderError):
    def __init__(self, message: str, hint: Optional[str] = None):
        super().__init__(
            message,
            status_code=424,
            error_code="PROVIDER_TIMEOUT",
            hint=hint,
        )


class ProviderUnavailableError(TranslationProviderError):
    def __init__(self, message: str, hint: Optional[str] = None):
        super().__init__(
            message,
            status_code=424,
            error_code="PROVIDER_UNAVAILABLE",
            hint=hint,
        )


class TranslationProvider(ABC):
    provider_name: str

    @abstractmethod
    async def get_languages(self, force_refresh: bool = False) -> List[LanguageItem]:
        raise NotImplementedError

    @abstractmethod
    async def detect_language(self, text: str) -> DetectionResult:
        raise NotImplementedError

    @abstractmethod
    async def translate(
        self, text: str, source_language: str, target_language: str
    ) -> TranslationResult:
        raise NotImplementedError

    @abstractmethod
    async def close(self) -> None:
        raise NotImplementedError


class LibreTranslateProvider(TranslationProvider):
    provider_name = "libretranslate"

    def __init__(
        self,
        base_url: str,
        api_key: str = "",
        timeout_seconds: float = 15.0,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        cache_ttl_seconds: int = 300,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key.strip()
        self.timeout_seconds = timeout_seconds
        self.cache_ttl_seconds = cache_ttl_seconds
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout_seconds),
            transport=transport,
            headers={"Accept": "application/json"},
        )
        self._languages_cache: List[LanguageItem] = []
        self._languages_cached_at: float = 0.0

    def _config_hint(self) -> str:
        return (
            f"Verify LIBRETRANSLATE_URL (currently '{self.base_url}') and LIBRETRANSLATE_API_KEY "
            "in backend/.env. For https://libretranslate.com, obtain an API key at "
            "https://portal.libretranslate.com, or self-host LibreTranslate locally via Docker "
            "('docker run -p 5000:5000 libretranslate/libretranslate') and set "
            "LIBRETRANSLATE_URL=http://localhost:5000."
        )

    def _extract_error_message(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
            if isinstance(payload, dict):
                return str(payload.get("error") or payload.get("message") or response.text)
        except Exception:
            pass
        return response.text.strip() or f"HTTP {response.status_code}"

    def _handle_http_error(self, response: httpx.Response, operation: str) -> None:
        detail = self._extract_error_message(response)
        lowered = detail.lower()

        if response.status_code in (401, 403) or (
            response.status_code == 400 and ("api key" in lowered or "portal.libretranslate.com" in lowered)
        ):
            raise ProviderAuthError(
                f"LibreTranslate {operation} rejected: {detail}",
                hint=self._config_hint(),
            )
        if response.status_code == 429:
            raise ProviderRateLimitError(
                f"LibreTranslate rate limit exceeded during {operation}: {detail}",
                hint="Wait briefly before retrying or configure a dedicated LibreTranslate API key / self-hosted instance.",
            )
        if response.status_code == 400:
            raise TranslationProviderError(
                f"LibreTranslate rejected the {operation} request: {detail}",
                status_code=400,
                error_code="PROVIDER_BAD_REQUEST",
                hint="Verify the selected language pair and input text.",
            )
        raise ProviderUnavailableError(
            f"LibreTranslate returned HTTP {response.status_code} during {operation}: {detail}",
            hint=self._config_hint(),
        )

    async def get_languages(self, force_refresh: bool = False) -> List[LanguageItem]:
        now = time.monotonic()
        if (
            not force_refresh
            and self._languages_cache
            and (now - self._languages_cached_at) < self.cache_ttl_seconds
        ):
            return self._languages_cache

        try:
            response = await self._client.get("/languages")
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Timed out fetching supported languages from {self.base_url} after {self.timeout_seconds}s.",
                hint=self._config_hint(),
            ) from exc
        except httpx.RequestError as exc:
            raise ProviderUnavailableError(
                f"Unable to reach translation provider at {self.base_url}: {exc}",
                hint=self._config_hint(),
            ) from exc

        if response.status_code >= 400:
            self._handle_http_error(response, "languages lookup")

        raw = response.json()
        if not isinstance(raw, list):
            raise ProviderUnavailableError(
                "Invalid languages payload returned by translation provider.",
                hint=self._config_hint(),
            )

        items = [
            LanguageItem(
                code=str(entry["code"]),
                name=str(entry.get("name") or entry["code"]),
                targets=[str(t) for t in entry.get("targets", [])],
            )
            for entry in raw
            if isinstance(entry, dict) and entry.get("code")
        ]
        self._languages_cache = items
        self._languages_cached_at = now
        return items

    async def detect_language(self, text: str) -> DetectionResult:
        payload: Dict[str, str] = {"q": text}
        if self.api_key:
            payload["api_key"] = self.api_key

        try:
            response = await self._client.post("/detect", json=payload)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Timed out detecting language at {self.base_url} after {self.timeout_seconds}s.",
                hint=self._config_hint(),
            ) from exc
        except httpx.RequestError as exc:
            raise ProviderUnavailableError(
                f"Unable to reach language detection endpoint at {self.base_url}: {exc}",
                hint=self._config_hint(),
            ) from exc

        if response.status_code >= 400:
            self._handle_http_error(response, "language detection")

        data = response.json()
        if isinstance(data, list) and data:
            top = data[0]
            return DetectionResult(
                language=str(top.get("language", "")),
                confidence=float(top["confidence"]) if top.get("confidence") is not None else None,
            )

        raise TranslationProviderError(
            "Translation provider did not return a detected language.",
            status_code=424,
            error_code="DETECTION_FAILED",
        )

    async def translate(
        self, text: str, source_language: str, target_language: str
    ) -> TranslationResult:
        languages = await self.get_languages()
        lang_map = {lang.code: lang for lang in languages}

        if target_language not in lang_map:
            raise UnsupportedLanguageError(
                f"Target language '{target_language}' is not supported by the active translation provider.",
                hint="Choose one of the languages returned by GET /api/languages.",
            )

        if source_language != "auto":
            if source_language not in lang_map:
                raise UnsupportedLanguageError(
                    f"Source language '{source_language}' is not supported by the active translation provider.",
                    hint="Choose 'auto' or one of the supported languages from GET /api/languages.",
                )
            if source_language == target_language:
                raise TranslationProviderError(
                    "Source language and target language must be different.",
                    status_code=400,
                    error_code="SAME_SOURCE_AND_TARGET",
                    hint="Select a different target language or use Auto Detect.",
                )
            source_obj = lang_map[source_language]
            if source_obj.targets and target_language not in source_obj.targets:
                raise UnsupportedLanguageError(
                    f"Translation from '{source_language}' to '{target_language}' is not supported by the provider.",
                )

        payload: Dict[str, str] = {
            "q": text,
            "source": source_language,
            "target": target_language,
            "format": "text",
        }
        if self.api_key:
            payload["api_key"] = self.api_key

        try:
            response = await self._client.post("/translate", json=payload)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(
                f"Translation request timed out after {self.timeout_seconds}s.",
                hint=self._config_hint(),
            ) from exc
        except httpx.RequestError as exc:
            raise ProviderUnavailableError(
                f"Unable to reach translation service at {self.base_url}: {exc}",
                hint=self._config_hint(),
            ) from exc

        if response.status_code >= 400:
            self._handle_http_error(response, "translation")

        data = response.json()
        translated_text = data.get("translatedText")
        if translated_text is None:
            raise TranslationProviderError(
                "Translation provider response is missing 'translatedText'.",
                status_code=424,
                error_code="INVALID_PROVIDER_RESPONSE",
            )

        detected_lang: Optional[str] = None
        detected_conf: Optional[float] = None
        detected_raw = data.get("detectedLanguage")
        if isinstance(detected_raw, dict):
            detected_lang = detected_raw.get("language")
            conf_val = detected_raw.get("confidence")
            detected_conf = float(conf_val) if conf_val is not None else None

        return TranslationResult(
            translated_text=str(translated_text),
            source_language=source_language,
            target_language=target_language,
            detected_language=detected_lang,
            detected_confidence=detected_conf,
            provider=self.provider_name,
        )

    async def close(self) -> None:
        await self._client.aclose()


def build_translation_provider(settings: Optional[Settings] = None) -> TranslationProvider:
    cfg = settings or get_settings()
    provider_key = cfg.translation_provider.strip().lower()
    if provider_key == "libretranslate":
        return LibreTranslateProvider(
            base_url=cfg.libretranslate_url,
            api_key=cfg.libretranslate_api_key,
            timeout_seconds=cfg.request_timeout_seconds,
        )
    raise ValueError(f"Unsupported TRANSLATION_PROVIDER configured: '{cfg.translation_provider}'")
