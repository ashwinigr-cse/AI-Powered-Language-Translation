export type NavSection =
  | 'home'
  | 'translator'
  | 'history'
  | 'languages'
  | 'about'
  | 'settings';

export type ThemeMode = 'light' | 'dark';

export interface LanguageItem {
  code: string;
  name: string;
  targets: string[];
}

export interface LanguagesResponse {
  provider: string;
  auto_detect_supported: boolean;
  count: number;
  languages: LanguageItem[];
}

export interface TranslateRequest {
  text: string;
  source_language: string;
  target_language: string;
  save_to_history?: boolean;
}

export interface TranslateResponse {
  id: number | null;
  source_text: string;
  translated_text: string;
  source_language: string;
  detected_language: string | null;
  detected_confidence: number | null;
  target_language: string;
  source_language_name: string | null;
  target_language_name: string | null;
  provider: string;
  character_count: number;
  created_at: string;
}

export interface HistoryItem {
  id: number;
  source_text: string;
  translated_text: string;
  source_language: string;
  detected_language: string | null;
  target_language: string;
  source_language_name: string | null;
  target_language_name: string | null;
  provider: string;
  character_count: number;
  created_at: string;
}

export interface HistoryListResponse {
  total: number;
  items: HistoryItem[];
}

export interface DeleteResponse {
  deleted: boolean;
  deleted_count: number;
  message: string;
}

export interface UserPreferences {
  default_source_language: string;
  default_target_language: string;
  auto_save_history: boolean;
  speech_rate: number;
  speech_volume: number;
  theme: ThemeMode;
  updated_at: string;
}

export interface PreferencesUpdatePayload {
  default_source_language?: string;
  default_target_language?: string;
  auto_save_history?: boolean;
  speech_rate?: number;
  speech_volume?: number;
  theme?: ThemeMode;
}

export interface ProviderStatus {
  provider: string;
  provider_url: string;
  api_key_configured: boolean;
  timeout_seconds: number;
  database_ready: boolean;
  configuration_guide: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  database: string;
  provider: string;
  provider_url: string;
  api_key_configured: boolean;
  timestamp: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
