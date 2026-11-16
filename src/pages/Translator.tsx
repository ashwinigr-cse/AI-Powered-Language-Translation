import {ArrowUpRight} from 'lucide-react';
import {useEffect, useState} from 'react';
import {TranslatorPanel} from '../components/TranslatorPanel';
import {getHistory} from '../services/api';
import type {HistoryItem, LanguageItem, UserPreferences} from '../types';

interface TranslatorPageProps {
  languages: LanguageItem[];
  languagesLoading: boolean;
  languagesError: string | null;
  onRetryLanguages: () => void;
  preferences: UserPreferences;
  prefillRequest: {
    sourceText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    key: number;
  } | null;
  onReuseRecent: (item: HistoryItem) => void;
  onViewAllHistory: () => void;
  onHistoryChanged: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export function TranslatorPage({
  languages,
  languagesLoading,
  languagesError,
  onRetryLanguages,
  preferences,
  prefillRequest,
  onReuseRecent,
  onViewAllHistory,
  onHistoryChanged,
  onNotify,
}: TranslatorPageProps) {
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([]);

  const fetchRecent = async () => {
    try {
      const res = await getHistory('', 3, 0);
      setRecentItems(res.items);
    } catch {
      // Non-blocking: recent strip stays quiet if history endpoint fails
    }
  };

  useEffect(() => {
    void fetchRecent();
  }, []);

  return (
    <div className="space-y-8">
      <TranslatorPanel
        languages={languages}
        languagesLoading={languagesLoading}
        languagesError={languagesError}
        onRetryLanguages={onRetryLanguages}
        defaultSourceLanguage={preferences.default_source_language}
        defaultTargetLanguage={preferences.default_target_language}
        autoSaveHistory={preferences.auto_save_history}
        defaultSpeechRate={preferences.speech_rate}
        defaultSpeechVolume={preferences.speech_volume}
        prefillRequest={prefillRequest}
        onTranslationSaved={() => {
          void fetchRecent();
          onHistoryChanged();
        }}
        onNotify={onNotify}
      />

      {recentItems.length > 0 && (
        <section aria-label="Recent translations" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              Recent Translations
            </h2>
            <button
              type="button"
              onClick={onViewAllHistory}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all history
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onReuseRecent(item)}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-slate-800/70"
              >
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate font-medium">
                      {item.source_language_name || item.source_language} →{' '}
                      {item.target_language_name || item.target_language}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.translated_text}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.source_text}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
