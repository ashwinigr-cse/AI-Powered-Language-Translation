import {Languages} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Navbar, SECTION_TITLES} from './components/Navbar';
import {ThemeToggle} from './components/ThemeToggle';
import {ToastContainer} from './components/ToastContainer';
import {AboutPage} from './pages/About';
import {HistoryPage} from './pages/History';
import {Home} from './pages/Home';
import {LanguagesPage} from './pages/Languages';
import {SettingsPage} from './pages/Settings';
import {TranslatorPage} from './pages/Translator';
import {
  ApiClientError,
  getLanguages,
  getPreferences,
  updatePreferences,
} from './services/api';
import type {
  HistoryItem,
  LanguageItem,
  NavSection,
  ThemeMode,
  ToastItem,
  UserPreferences,
} from './types';

const DEFAULT_PREFERENCES: UserPreferences = {
  default_source_language: 'auto',
  default_target_language: 'hi',
  auto_save_history: true,
  speech_rate: 1.0,
  speech_volume: 1.0,
  theme: 'light',
  updated_at: new Date().toISOString(),
};

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('linguaai-theme');
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  }
  return 'light';
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [providerName, setProviderName] = useState('libretranslate');
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [languagesError, setLanguagesError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [prefillRequest, setPrefillRequest] = useState<{
    sourceText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    key: number;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (type: ToastItem['type'], title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), {id, type, title, description}]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Keep DOM .dark class and localStorage synchronized
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('linguaai-theme', theme);
  }, [theme]);

  const loadSupportedLanguages = useCallback(async (forceRefresh = false) => {
    setLanguagesLoading(true);
    setLanguagesError(null);
    try {
      const res = await getLanguages(forceRefresh);
      setLanguages(res.languages);
      setProviderName(res.provider);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? `${err.message}${err.hint ? ` ${err.hint}` : ''}`
          : 'Unable to reach /api/languages endpoint.';
      setLanguagesError(msg);
    } finally {
      setLanguagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSupportedLanguages(false);

    getPreferences()
      .then((prefs) => {
        setPreferences(prefs);
        if (!window.localStorage.getItem('linguaai-theme') && (prefs.theme === 'light' || prefs.theme === 'dark')) {
          setTheme(prefs.theme);
        }
      })
      .catch(() => {
        // Keep local defaults if backend isn't reachable yet
      });
  }, [loadSupportedLanguages]);

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    setPreferences((prev) => ({...prev, theme: nextTheme}));
    updatePreferences({theme: nextTheme}).catch(() => {
      // Non-blocking sync
    });
  };

  const handleToggleTheme = () => {
    handleThemeChange(theme === 'dark' ? 'light' : 'dark');
  };

  const handleReuseTranslation = (item: HistoryItem) => {
    setPrefillRequest({
      sourceText: item.source_text,
      translatedText: item.translated_text,
      sourceLanguage: item.detected_language || item.source_language || 'auto',
      targetLanguage: item.target_language,
      key: Date.now(),
    });
    setActiveSection('translator');
    notify('info', 'Loaded translation into workspace');
  };

  const handleTranslateWithTarget = (targetCode: string) => {
    setPrefillRequest({
      sourceText: '',
      translatedText: '',
      sourceLanguage: preferences.default_source_language || 'auto',
      targetLanguage: targetCode,
      key: Date.now(),
    });
    setActiveSection('translator');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 lg:flex-row dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={setMobileMenuOpen}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop Workspace Top Bar */}
        <header className="hidden h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-8 lg:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 dark:text-slate-500">LinguaAI</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              /
            </span>
            <h1 className="font-display font-semibold text-slate-900 dark:text-white">
              {SECTION_TITLES[activeSection]}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
            {activeSection !== 'translator' && (
              <button
                type="button"
                onClick={() => setActiveSection('translator')}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0"
              >
                <Languages className="h-4 w-4" />
                <span>Open Translator</span>
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {activeSection === 'home' && (
            <Home
              supportedCount={languages.length}
              onStartTranslating={() => setActiveSection('translator')}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'translator' && (
            <TranslatorPage
              languages={languages}
              languagesLoading={languagesLoading}
              languagesError={languagesError}
              onRetryLanguages={() => void loadSupportedLanguages(true)}
              preferences={preferences}
              prefillRequest={prefillRequest}
              onReuseRecent={handleReuseTranslation}
              onViewAllHistory={() => setActiveSection('history')}
              onHistoryChanged={() => setHistoryRefreshTrigger((n) => n + 1)}
              onNotify={notify}
            />
          )}

          {activeSection === 'history' && (
            <HistoryPage
              refreshTrigger={historyRefreshTrigger}
              onReuseTranslation={handleReuseTranslation}
              onGoToTranslator={() => setActiveSection('translator')}
              onNotify={notify}
            />
          )}

          {activeSection === 'languages' && (
            <LanguagesPage
              languages={languages}
              providerName={providerName}
              loading={languagesLoading}
              error={languagesError}
              onRefresh={() => void loadSupportedLanguages(true)}
              onTranslateWithTarget={handleTranslateWithTarget}
            />
          )}

          {activeSection === 'about' && <AboutPage />}

          {activeSection === 'settings' && (
            <SettingsPage
              languages={languages}
              preferences={preferences}
              theme={theme}
              onPreferencesUpdated={setPreferences}
              onThemeChange={handleThemeChange}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
