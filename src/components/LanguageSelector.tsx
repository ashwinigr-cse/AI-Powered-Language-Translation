import {Check, ChevronDown, Search, Sparkles} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import type {LanguageItem} from '../types';

interface LanguageSelectorProps {
  id: string;
  label: string;
  value: string;
  languages: LanguageItem[];
  allowAutoDetect?: boolean;
  disabled?: boolean;
  detectedLabel?: string | null;
  onChange: (code: string) => void;
}

export function LanguageSelector({
  id,
  label,
  value,
  languages,
  allowAutoDetect = false,
  disabled = false,
  detectedLabel,
  onChange,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [open]);

  const selectedName = useMemo(() => {
    if (value === 'auto') {
      return detectedLabel ? `Auto Detect (${detectedLabel})` : 'Auto Detect';
    }
    const found = languages.find((l) => l.code === value);
    return found ? found.name : value || 'Select language';
  }, [detectedLabel, languages, value]);

  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return languages;
    }
    return languages.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q),
    );
  }, [languages, search]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto sm:min-w-[220px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span className="truncate">{selectedName}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-12 z-40 w-full min-w-[260px] rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter languages..."
                aria-label="Filter languages"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {allowAutoDetect && (!search.trim() || 'auto detect'.includes(search.toLowerCase())) && (
              <button
                type="button"
                role="option"
                aria-selected={value === 'auto'}
                onClick={() => {
                  onChange('auto');
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  value === 'auto'
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Auto Detect</span>
                </span>
                {value === 'auto' && <Check className="h-4 w-4 shrink-0" />}
              </button>
            )}

            {filteredLanguages.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No supported languages match "{search}".
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = value === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(lang.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{lang.name}</span>
                    <span className="ml-2 flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        {lang.code}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
