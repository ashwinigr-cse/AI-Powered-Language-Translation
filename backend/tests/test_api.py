import json
from pathlib import Path
import sys

import httpx
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import database  # noqa: E402
from app.main import create_app  # noqa: E402
from app.services.translation_service import LibreTranslateProvider  # noqa: E402


def make_mock_transport(mode: str = "success") -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/languages" and request.method == "GET":
            if mode == "unreachable":
                raise httpx.ConnectError("Connection refused", request=request)
            return httpx.Response(
                200,
                json=[
                    {"code": "en", "name": "English", "targets": ["hi", "es", "fr"]},
                    {"code": "hi", "name": "Hindi", "targets": ["en"]},
                    {"code": "es", "name": "Spanish", "targets": ["en", "fr"]},
                    {"code": "fr", "name": "French", "targets": ["en", "es"]},
                ],
            )

        if request.url.path == "/detect" and request.method == "POST":
            body = json.loads(request.content.decode("utf-8"))
            if "नमस्ते" in body.get("q", ""):
                return httpx.Response(200, json=[{"language": "hi", "confidence": 96.5}])
            return httpx.Response(200, json=[{"language": "en", "confidence": 98.0}])

        if request.url.path == "/translate" and request.method == "POST":
            if mode == "missing_key":
                return httpx.Response(
                    400,
                    json={"error": "Visit https://portal.libretranslate.com to get an API key"},
                )
            if mode == "rate_limit":
                return httpx.Response(429, json={"error": "Too many requests"})
            if mode == "timeout":
                raise httpx.ReadTimeout("Request timed out", request=request)

            body = json.loads(request.content.decode("utf-8"))
            q = body["q"]
            source = body["source"]
            target = body["target"]

            if source == "en" and target == "hi":
                return httpx.Response(200, json={"translatedText": "नमस्ते दुनिया"})
            if source == "hi" and target == "en":
                return httpx.Response(200, json={"translatedText": "Hello world"})
            if source == "auto" and target == "es":
                return httpx.Response(
                    200,
                    json={
                        "translatedText": "Hola mundo",
                        "detectedLanguage": {"language": "en", "confidence": 95.0},
                    },
                )
            return httpx.Response(200, json={"translatedText": f"[{target}] {q}"})

        return httpx.Response(404, json={"error": "Not found"})

    return httpx.MockTransport(handler)


@pytest.fixture()
def isolated_db(tmp_path, monkeypatch):
    db_file = tmp_path / "test_linguaai.db"
    db_url = f"sqlite:///{db_file}"
    test_engine = database.create_db_engine(db_url)
    TestingSessionLocal = database.sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, future=True
    )
    monkeypatch.setattr(database, "engine", test_engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    from app import main as app_main

    monkeypatch.setattr(app_main, "SessionLocal", TestingSessionLocal)
    database.init_db(test_engine)
    return db_file, test_engine


def test_health_and_languages(isolated_db):
    provider = LibreTranslateProvider(
        base_url="https://mock.libretranslate.local",
        transport=make_mock_transport("success"),
    )
    app = create_app(provider_override=provider)
    with TestClient(app) as client:
        health_resp = client.get("/api/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["status"] == "ok"
        assert health_data["database"] == "connected"

        lang_resp = client.get("/api/languages")
        assert lang_resp.status_code == 200
        lang_data = lang_resp.json()
        assert lang_data["count"] == 4
        assert any(item["code"] == "hi" for item in lang_data["languages"])


def test_translate_validation_and_history_persistence(isolated_db):
    provider = LibreTranslateProvider(
        base_url="https://mock.libretranslate.local",
        transport=make_mock_transport("success"),
    )
    app = create_app(provider_override=provider)
    with TestClient(app) as client:
        # Empty input validation
        empty_resp = client.post(
            "/api/translate",
            json={"text": "   ", "source_language": "en", "target_language": "hi"},
        )
        assert empty_resp.status_code == 422

        # Unsupported language
        unsupported_resp = client.post(
            "/api/translate",
            json={"text": "Hello", "source_language": "en", "target_language": "xx"},
        )
        assert unsupported_resp.status_code == 400
        assert unsupported_resp.json()["error_code"] == "UNSUPPORTED_LANGUAGE"

        # English -> Hindi
        en_hi = client.post(
            "/api/translate",
            json={"text": "Hello world", "source_language": "en", "target_language": "hi"},
        )
        assert en_hi.status_code == 200
        data = en_hi.json()
        assert data["translated_text"] == "नमस्ते दुनिया"
        assert data["id"] is not None

        # Auto-detect -> Spanish
        auto_es = client.post(
            "/api/translate",
            json={"text": "Hello world", "source_language": "auto", "target_language": "es"},
        )
        assert auto_es.status_code == 200
        auto_data = auto_es.json()
        assert auto_data["detected_language"] == "en"
        assert auto_data["translated_text"] == "Hola mundo"

        # Search history
        hist_resp = client.get("/api/history?q=Hola")
        assert hist_resp.status_code == 200
        assert hist_resp.json()["total"] == 1

    # Simulate backend restart using the same SQLite database file
    provider2 = LibreTranslateProvider(
        base_url="https://mock.libretranslate.local",
        transport=make_mock_transport("success"),
    )
    app2 = create_app(provider_override=provider2)
    with TestClient(app2) as client2:
        all_hist = client2.get("/api/history")
        assert all_hist.status_code == 200
        items = all_hist.json()["items"]
        assert len(items) == 2

        first_id = items[0]["id"]
        del_one = client2.delete(f"/api/history/{first_id}")
        assert del_one.status_code == 200
        assert del_one.json()["deleted_count"] == 1

        del_missing = client2.delete(f"/api/history/{first_id}")
        assert del_missing.status_code == 404

        del_all = client2.delete("/api/history")
        assert del_all.status_code == 200
        assert client2.get("/api/history").json()["total"] == 0


def test_provider_errors_are_surfaced_without_mock_fallback(isolated_db):
    for mode, expected_status, expected_code in [
        ("missing_key", 424, "PROVIDER_API_KEY_REQUIRED"),
        ("rate_limit", 429, "PROVIDER_RATE_LIMITED"),
        ("timeout", 424, "PROVIDER_TIMEOUT"),
    ]:
        provider = LibreTranslateProvider(
            base_url="https://mock.libretranslate.local",
            transport=make_mock_transport(mode),
        )
        app = create_app(provider_override=provider)
        with TestClient(app) as client:
            resp = client.post(
                "/api/translate",
                json={"text": "Hello", "source_language": "en", "target_language": "hi"},
            )
            assert resp.status_code == expected_status
            payload = resp.json()
            assert payload["error_code"] == expected_code
            assert "message" in payload


def test_preferences_crud(isolated_db):
    provider = LibreTranslateProvider(
        base_url="https://mock.libretranslate.local",
        transport=make_mock_transport("success"),
    )
    app = create_app(provider_override=provider)
    with TestClient(app) as client:
        initial = client.get("/api/preferences")
        assert initial.status_code == 200
        assert initial.json()["theme"] == "light"

        updated = client.put(
            "/api/preferences",
            json={"theme": "dark", "speech_rate": 1.25, "default_target_language": "es"},
        )
        assert updated.status_code == 200
        assert updated.json()["theme"] == "dark"
        assert updated.json()["speech_rate"] == 1.25
        assert updated.json()["default_target_language"] == "es"


def test_tts_endpoint(isolated_db, monkeypatch):
    from app.routes import tts as tts_route

    monkeypatch.setattr(tts_route, "_synthesize_mp3", lambda text, lang: b"ID3MOCKMP3DATA")

    provider = LibreTranslateProvider(
        base_url="https://mock.libretranslate.local",
        transport=make_mock_transport("success"),
    )
    app = create_app(provider_override=provider)
    with TestClient(app) as client:
        get_resp = client.get("/api/tts", params={"text": "नमस्ते दुनिया", "lang": "hi"})
        assert get_resp.status_code == 200
        assert get_resp.headers["content-type"].startswith("audio/mpeg")
        assert get_resp.content == b"ID3MOCKMP3DATA"

        post_resp = client.post("/api/tts", json={"text": "Hello world", "lang": "en"})
        assert post_resp.status_code == 200
        assert post_resp.content == b"ID3MOCKMP3DATA"

        bad_lang = client.post("/api/tts", json={"text": "Hello", "lang": "xx-invalid"})
        assert bad_lang.status_code == 422
        assert bad_lang.json()["error_code"] == "TTS_LANGUAGE_UNSUPPORTED"

