# LinguaAI – Intelligent Language Translator

A full-stack AI-powered multilingual text and speech translation application built with **React**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **SQLite**, **LibreTranslate**, and the browser **Web Speech** & **SpeechSynthesis** APIs.

---

## Features

- **Text-to-Text Translation**: Dual-panel workspace with searchable language selectors, character counter (`5,000` max), paste, clear, copy, and `.txt` export.
- **Automatic Source Language Detection**: Detects source language automatically via the translation provider when **Auto Detect** is selected.
- **Dynamic Language Discovery**: Queries the active translation provider (`GET /api/languages`) so only genuinely supported languages and pairs appear.
- **Speech-to-Text Dictation**: Live browser microphone transcription via the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with editable input and clear fallback notices on unsupported browsers.
- **Text-to-Speech Playback**: Browser `SpeechSynthesis` playback with **Listen**, **Pause**, **Resume**, **Stop**, speech rate (`0.5x–2.0x`), volume control, and target-language voice matching.
- **Persistent SQLite History**: Stores every successful translation in SQLite (`translation_history`) with search, copy, reuse-in-translator, single delete, and clear-all confirmation.
- **User Preferences & Dark Mode**: Persists default source/target languages, auto-save toggle, speech settings, and Light/Dark theme in SQLite (`user_preferences`).

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend**: Python 3.10+, FastAPI, Uvicorn, HTTPX, Pydantic v2, SQLAlchemy
- **Database**: SQLite (`backend/linguaai.db`, created automatically on startup)
- **Translation Provider**: LibreTranslate (configurable URL + optional API key in `backend/.env`)
- **Speech**: Browser Web Speech API & SpeechSynthesis API
- **Testing**: Pytest (backend integration & persistence tests), TypeScript compiler (`tsc --noEmit`), Vite production build

---

## Folder Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── history.py
│   │   │   ├── languages.py
│   │   │   ├── preferences.py
│   │   │   └── translation.py
│   │   ├── services/
│   │   │   ├── language_detection.py
│   │   │   └── translation_service.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── tests/
│   │   └── test_api.py
│   ├── .env.example
│   └── requirements.txt
├── src/
│   ├── components/
│   │   ├── LanguageSelector.tsx
│   │   ├── Navbar.tsx
│   │   ├── SpeechPlayer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ToastContainer.tsx
│   │   ├── TranslationHistory.tsx
│   │   ├── TranslatorPanel.tsx
│   │   └── VoiceRecorder.tsx
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   └── useSpeechSynthesis.ts
│   ├── pages/
│   │   ├── About.tsx
│   │   ├── History.tsx
│   │   ├── Home.tsx
│   │   ├── Languages.tsx
│   │   ├── Settings.tsx
│   │   └── Translator.tsx
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── server.ts
├── start-all.bat
├── start-backend.bat
├── start-frontend.bat
├── package.json
└── README.md
```

---

## Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and configure your translation provider:

```env
APP_NAME=LinguaAI Backend
APP_ENV=development
HOST=127.0.0.1
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173
DATABASE_URL=sqlite:///./linguaai.db
TRANSLATION_PROVIDER=libretranslate
LIBRETRANSLATE_URL=https://libretranslate.com
LIBRETRANSLATE_API_KEY=
REQUEST_TIMEOUT_SECONDS=15.0
```

- **Option A (Hosted LibreTranslate)**: Obtain an API key from [portal.libretranslate.com](https://portal.libretranslate.com) and set `LIBRETRANSLATE_API_KEY=your_key`.
- **Option B (Self-Hosted Keyless LibreTranslate via Docker)**:
  ```bash
  docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
  ```
  Then set `LIBRETRANSLATE_URL=http://localhost:5000` in `backend/.env`.

### Frontend (Optional root `.env`)

By default, `/api/*` requests are proxied to `http://127.0.0.1:8000` via `server.ts` and `vite.config.ts`. To point to a remote backend, set `VITE_API_BASE_URL=http://localhost:8000/api`.

---

## Installation & Running Locally

### 1. Backend Setup (Python / FastAPI)

```bash
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup (React / Vite)

From the project root:

```bash
npm install
npm run dev
```

`npm run dev` runs `server.ts` on **http://localhost:3000**, automatically starting FastAPI if port `8000` is not already active and proxying `/api/*` requests.

To run only the Vite dev server (when starting FastAPI separately):

```bash
npm run dev:frontend
```

### Windows Convenience Scripts

- `start-backend.bat` — creates `backend/.venv` if missing, installs requirements, and starts FastAPI on port `8000`.
- `start-frontend.bat` — installs npm packages if missing and starts Vite on port `3000`.
- `start-all.bat` — launches both backend and frontend in separate terminal windows.

---

## API Documentation

Interactive OpenAPI docs are available when FastAPI is running at `http://127.0.0.1:8000/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend health, SQLite status, and non-secret provider metadata |
| `GET` | `/api/languages` | Dynamically retrieves supported languages from the provider |
| `POST` | `/api/translate` | Translates `text` from `source_language` (`auto` supported) to `target_language` |
| `POST` | `/api/detect` | Detects language and confidence for input text |
| `GET` | `/api/history` | Lists saved SQLite translations (`?q=`, `?limit=`, `?offset=`) |
| `DELETE` | `/api/history/{id}` | Deletes a single translation history record |
| `DELETE` | `/api/history` | Clears all translation history records |
| `GET` | `/api/preferences` | Retrieves saved user preferences |
| `PUT` | `/api/preferences` | Updates user preferences in SQLite |
| `GET` | `/api/settings/status` | Returns non-secret provider configuration status |

---

## Testing

### Backend Tests (Pytest)

```bash
backend/.venv/bin/pytest -v backend/tests/test_api.py
```

### Frontend Typecheck & Build

```bash
npm run lint
npm run build
```

---

## Known Limitations

- **LibreTranslate API Key**: The public `https://libretranslate.com` endpoint returns supported languages (`/languages`) freely, but requires an API key (`LIBRETRANSLATE_API_KEY`) for `/translate` and `/detect`. Without a key or a self-hosted LibreTranslate instance, translation requests surface a clear configuration error instead of fake translations.
- **Provider Language Coverage**: Languages such as Kannada (`kn`) or Tamil (`ta`) only appear if supported by the connected LibreTranslate/Argos Translate instance (the public `libretranslate.com` catalog lists 51 languages and does not currently include Kannada).
- **Browser Speech APIs**: Speech recognition (`SpeechRecognition`) and system voices (`speechSynthesis`) depend on browser and OS support (Chrome/Edge provide the widest support).
