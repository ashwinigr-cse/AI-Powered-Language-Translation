import type {
  DeleteResponse,
  HealthStatus,
  HistoryListResponse,
  LanguagesResponse,
  PreferencesUpdatePayload,
  ProviderStatus,
  TranslateRequest,
  TranslateResponse,
  UserPreferences,
} from '../types';

function resolveApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, '');
  if (!configured) {
    return '/api';
  }
  if (/^https?:\/\/(127\.0\.0\.1|localhost)(:8000)?(\/api)?$/i.test(configured)) {
    return '/api';
  }
  return configured;
}

const API_BASE = resolveApiBase();

export class ApiClientError extends Error {
  status: number;
  errorCode: string;
  hint?: string;

  constructor(status: number, errorCode: string, message: string, hint?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errorCode = errorCode;
    this.hint = hint;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  let attempt = 0;

  while (true) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    } catch (networkErr) {
      if (attempt < retries) {
        attempt += 1;
        await delay(500 * attempt);
        continue;
      }
      throw new ApiClientError(
        0,
        'NETWORK_ERROR',
        'Unable to connect to the translation backend server.',
        networkErr instanceof Error
          ? `Check that the FastAPI backend is running (${networkErr.message}).`
          : 'Check your network connection and backend server status.',
      );
    }

    const contentType = response.headers.get('content-type') || '';

    // Retry briefly if an upstream proxy returned an HTML warmup page while booting
    if (contentType.includes('text/html')) {
      if (attempt < retries) {
        attempt += 1;
        await delay(700 * attempt);
        continue;
      }
      throw new ApiClientError(
        response.status || 503,
        'BACKEND_WARMING_UP',
        'The backend server is still starting up or returned HTML instead of JSON.',
        'Wait a moment and click Retry Loading.',
      );
    }

    let data: unknown = null;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const errObj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const message =
        typeof errObj.message === 'string'
          ? errObj.message
          : typeof errObj.detail === 'string'
            ? errObj.detail
            : `Request failed with HTTP status ${response.status}.`;
      const errorCode =
        typeof errObj.error_code === 'string' ? errObj.error_code : `HTTP_${response.status}`;
      const hint = typeof errObj.hint === 'string' ? errObj.hint : undefined;
      throw new ApiClientError(response.status, errorCode, message, hint);
    }

    return data as T;
  }
}

export function getHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>('/health');
}

export function getLanguages(refresh = false): Promise<LanguagesResponse> {
  return requestJson<LanguagesResponse>(`/languages${refresh ? '?refresh=true' : ''}`);
}

export function translateText(payload: TranslateRequest): Promise<TranslateResponse> {
  return requestJson<TranslateResponse>('/translate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 1);
}

export function getHistory(query = '', limit = 100, offset = 0): Promise<HistoryListResponse> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('q', query.trim());
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return requestJson<HistoryListResponse>(`/history?${params.toString()}`);
}

export function deleteHistoryItem(id: number): Promise<DeleteResponse> {
  return requestJson<DeleteResponse>(`/history/${id}`, {
    method: 'DELETE',
  });
}

export function clearHistory(): Promise<DeleteResponse> {
  return requestJson<DeleteResponse>('/history', {
    method: 'DELETE',
  });
}

export function getPreferences(): Promise<UserPreferences> {
  return requestJson<UserPreferences>('/preferences');
}

export function updatePreferences(payload: PreferencesUpdatePayload): Promise<UserPreferences> {
  return requestJson<UserPreferences>('/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getProviderStatus(): Promise<ProviderStatus> {
  return requestJson<ProviderStatus>('/settings/status');
}

export function buildTtsAudioUrl(text: string, lang: string): string {
  const params = new URLSearchParams({text, lang});
  return `${API_BASE}/tts?${params.toString()}`;
}

export async function fetchTtsAudioBlob(
  text: string,
  lang: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text, lang}),
    signal,
  });

  if (!response.ok) {
    let message = `Unable to generate speech audio (${response.status}).`;
    try {
      const payload = (await response.json()) as {message?: string};
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Ignore parse error
    }
    throw new ApiClientError(response.status, 'TTS_FAILED', message);
  }

  return response.blob();
}

