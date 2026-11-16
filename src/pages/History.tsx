import {TranslationHistory} from '../components/TranslationHistory';
import type {HistoryItem} from '../types';

interface HistoryPageProps {
  refreshTrigger: number;
  onReuseTranslation: (item: HistoryItem) => void;
  onGoToTranslator: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export function HistoryPage({
  refreshTrigger,
  onReuseTranslation,
  onGoToTranslator,
  onNotify,
}: HistoryPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Saved Translations
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Persistent SQLite history of translated text pairs. Search, copy, delete, or reload any
          entry into the translator.
        </p>
      </div>

      <TranslationHistory
        refreshTrigger={refreshTrigger}
        onReuseTranslation={onReuseTranslation}
        onGoToTranslator={onGoToTranslator}
        onNotify={onNotify}
      />
    </div>
  );
}
