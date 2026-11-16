import {CheckCircle2, Loader2, Save, Server, ShieldAlert} from 'lucide-react';
import {useEffect, useState} from 'react';
import {ApiClientError, getProviderStatus, updatePreferences} from '../services/api';
import type {LanguageItem, ProviderStatus, ThemeMode, UserPreferences} from '../types';

interface SettingsPageProps {
  languages: LanguageItem[];
  preferences: UserPreferences;
  theme: ThemeMode;
  onPreferencesUpdated: (prefs: UserPreferences) => void;
  onThemeChange: (theme: ThemeMode) => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export function SettingsPage({
  languages,
  preferences,
  theme,
  onPreferencesUpdated,
  onThemeChange,
  onNotify,
}: SettingsPageProps) {
  const [defaultSource, setDefaultSource] = useState(preferences.default_source_language);
  const [defaultTarget, setDefaultTarget] = useState(preferences.default_target_language);
  const [autoSave, setAutoSave] = useState(preferences.auto_save_history);
  const [speechRate, setSpeechRate] = useState(preferences.speech_rate);
  const [speechVolume, setSpeechVolume] = useState(preferences.speech_volume);
  const [saving, setSaving] = useState(false);

  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setDefaultSource(preferences.default_source_language);
    setDefaultTarget(preferences.default_target_language);
    setAutoSave(preferences.auto_save_history);
    setSpeechRate(preferences.speech_rate);
    setSpeechVolume(preferences.speech_volume);
  }, [preferences]);

  useEffect(() => {
    let active = true;
    setStatusLoading(true);
    getProviderStatus()
      .then((res) => {
        if (active) {
          setProviderStatus(res);
          setStatusError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setStatusError(
            err instanceof ApiClientError ? err.message : 'Unable to reach backend status endpoint.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setStatusLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updatePreferences({
        default_source_language: defaultSource,
        default_target_language: defaultTarget,
        auto_save_history: autoSave,
        speech_rate: speechRate,
        speech_volume: speechVolume,
        theme,
      });
      onPreferencesUpdated(updated);
      onNotify('success', 'Settings saved to SQLite');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Could not update preferences.';
      onNotify('error', 'Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* User Preferences Form */}
      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Translator &amp; Audio Preferences
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Stored persistently in the SQLite database across sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="pref-source-lang"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Default Source Language
            </label>
            <select
              id="pref-source-lang"
              value={defaultSource}
              onChange={(e) => setDefaultSource(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="auto">Auto Detect</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-target-lang"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Default Target Language
            </label>
            <select
              id="pref-target-lang"
              value={defaultTarget}
              onChange={(e) => setDefaultTarget(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {languages.length === 0 ? (
                <option value={defaultTarget}>{defaultTarget}</option>
              ) : (
                languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="pref-speech-rate"
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <span>Default Speech Rate</span>
              <span className="font-mono tabular-nums">{speechRate.toFixed(2)}x</span>
            </label>
            <input
              id="pref-speech-rate"
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="pref-speech-volume"
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <span>Default Speech Volume</span>
              <span className="font-mono tabular-nums">{Math.round(speechVolume * 100)}%</span>
            </label>
            <input
              id="pref-speech-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={speechVolume}
              onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Appearance Theme
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose Light or Dark workspace palette.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {(['light', 'dark'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onThemeChange(mode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    theme === mode
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Auto-Save Translation History
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persist successful translations automatically in SQLite.
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-60 whitespace-nowrap"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
        </button>
      </form>

      {/* Server-side Provider Configuration Status */}
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Backend &amp; Provider Configuration
          </h2>
        </div>

        {statusLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : statusError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {statusError}
          </div>
        ) : providerStatus ? (
          <div className="space-y-4">
            <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Active Provider</dt>
                <dd className="font-mono font-medium text-slate-900 dark:text-slate-100">
                  {providerStatus.provider}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Provider Endpoint</dt>
                <dd className="font-mono text-xs text-slate-900 dark:text-slate-100">
                  {providerStatus.provider_url}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">API Key Status</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {providerStatus.api_key_configured ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Configured on server
                      </span>
                    </>
                  ) : providerStatus.provider_url.includes('127.0.0.1') ||
                    providerStatus.provider_url.includes('localhost') ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Not required (self-hosted)
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-amber-700 dark:text-amber-400">
                        Not set (required for libretranslate.com)
                      </span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Request Timeout</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {providerStatus.timeout_seconds}s
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">SQLite Database</dt>
                <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                  {providerStatus.database_ready ? 'Ready' : 'Unavailable'}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                Configuration Guide
              </p>
              <p className="mt-1">{providerStatus.configuration_guide}</p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
