import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Copy,
  History,
  Search,
  Trash2,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {
  ApiClientError,
  clearHistory,
  deleteHistoryItem,
  getHistory,
} from '../services/api';
import type {HistoryItem} from '../types';

interface TranslationHistoryProps {
  refreshTrigger?: number;
  onReuseTranslation: (item: HistoryItem) => void;
  onGoToTranslator: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export function TranslationHistory({
  refreshTrigger = 0,
  onReuseTranslation,
  onGoToTranslator,
  onNotify,
}: TranslationHistoryProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadHistory = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory(query);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Failed to load translation history from SQLite database.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadHistory(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, refreshTrigger, loadHistory]);

  const handleCopy = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.translated_text);
      setCopiedId(item.id);
      onNotify('success', 'Copied translation to clipboard');
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      onNotify('error', 'Failed to copy text');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      onNotify('success', 'Translation record deleted');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to delete record.';
      onNotify('error', 'Delete failed', msg);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await clearHistory();
      setItems([]);
      setTotal(0);
      setConfirmClear(false);
      onNotify('success', 'Translation history cleared', res.message);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Unable to clear history.';
      onNotify('error', 'Clear failed', msg);
    } finally {
      setClearing(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history by text or language..."
            aria-label="Search translation history"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {total.toLocaleString()} {total === 1 ? 'record' : 'records'}
          </span>

          {total > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 whitespace-nowrap shrink-0 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </button>
          )}

          {confirmClear && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-900/60 dark:bg-red-950/40">
              <span className="text-xs font-medium text-red-800 dark:text-red-200">
                Delete all history?
              </span>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearAll}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
              >
                {clearing ? 'Clearing...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content States */}
      {loading ? (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {[1, 2, 3].map((row) => (
            <div key={row} className="space-y-2.5 p-4">
              <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/30"
        >
          <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          <p className="mt-2 text-sm font-medium text-red-900 dark:text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => void loadHistory(searchQuery)}
            className="mt-4 h-9 rounded-lg border border-red-300 bg-white px-4 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:text-red-200"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <History className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          <h3 className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-white">
            {searchQuery.trim() ? 'No matching translations' : 'No saved translations yet'}
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {searchQuery.trim()
              ? 'Try another search term or clear your filter.'
              : 'Successful translations are automatically stored in SQLite so you can search, copy, and reuse them anytime.'}
          </p>
          {!searchQuery.trim() && (
            <button
              type="button"
              onClick={onGoToTranslator}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap"
            >
              Open Translator
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {items.map((item) => {
            const sourceLabel =
              item.source_language_name ||
              (item.detected_language ? `${item.detected_language} (auto)` : item.source_language);
            const targetLabel = item.target_language_name || item.target_language;

            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {sourceLabel} → {targetLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.character_count} chars</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatTimestamp(item.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onReuseTranslation(item)}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>Reuse</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleCopy(item)}
                      aria-label={`Copy translation ${item.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      aria-label={`Delete translation ${item.id}`}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 whitespace-nowrap shrink-0 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.source_text}
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    {item.translated_text}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
