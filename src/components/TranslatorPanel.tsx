import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  Eraser,
  Languages,
  Loader2,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useSpeechRecognition} from '../hooks/useSpeechRecognition';
import {useSpeechSynthesis} from '../hooks/useSpeechSynthesis';
import {ApiClientError, translateText} from '../services/api';
import type {LanguageItem, TranslateResponse} from '../types';
import {LanguageSelector} from './LanguageSelector';
import {SpeechPlayer} from './SpeechPlayer';
import {VoiceRecorder} from './VoiceRecorder';

interface TranslatorPanelProps {
  languages: LanguageItem[];
  languagesLoading: boolean;
  languagesError: string | null;
  onRetryLanguages: () => void;
  defaultSourceLanguage: string;
  defaultTargetLanguage: string;
  autoSaveHistory: boolean;
  defaultSpeechRate: number;
  defaultSpeechVolume: number;
  prefillRequest?: {
    sourceText: string;
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    key: number;
  } | null;
  onTranslationSaved?: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

const MAX_CHARS = 5000;

export function TranslatorPanel({
  languages,
  languagesLoading,
  languagesError,
  onRetryLanguages,
  defaultSourceLanguage,
  defaultTargetLanguage,
  autoSaveHistory,
  defaultSpeechRate,
  defaultSpeechVolume,
  prefillRequest,
  onTranslationSaved,
  onNotify,
}: TranslatorPanelProps) {
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage || 'auto');
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage || 'hi');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [detectedConfidence, setDetectedConfidence] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorState, setErrorState] = useState<{message: string; hint?: string} | null>(null);

  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis(defaultSpeechRate, defaultSpeechVolume);

  // Apply defaults when languages load and current target is unavailable
  useEffect(() => {
    if (!languages.length) {
      return;
    }
    const codes = new Set(languages.map((l) => l.code));
    if (sourceLanguage !== 'auto' && !codes.has(sourceLanguage)) {
      setSourceLanguage('auto');
    }
    if (!codes.has(targetLanguage)) {
      if (codes.has(defaultTargetLanguage)) {
        setTargetLanguage(defaultTargetLanguage);
      } else {
        const fallback = languages.find((l) => l.code !== sourceLanguage);
        if (fallback) {
          setTargetLanguage(fallback.code);
        }
      }
    }
  }, [languages, defaultTargetLanguage, sourceLanguage, targetLanguage]);

  // Populate when reusing an entry from Translation History
  useEffect(() => {
    if (!prefillRequest) {
      return;
    }
    setSourceText(prefillRequest.sourceText);
    setTranslatedText(prefillRequest.translatedText);
    setSourceLanguage(prefillRequest.sourceLanguage || 'auto');
    setTargetLanguage(prefillRequest.targetLanguage);
    setDetectedLanguage(null);
    setDetectedConfidence(null);
    setErrorState(null);
  }, [prefillRequest]);

  const targetLanguageOptions = useMemo(() => {
    if (sourceLanguage === 'auto') {
      return languages;
    }
    const srcObj = languages.find((l) => l.code === sourceLanguage);
    if (srcObj && srcObj.targets.length > 0) {
      const allowed = new Set(srcObj.targets);
      return languages.filter((l) => l.code !== sourceLanguage && allowed.has(l.code));
    }
    return languages.filter((l) => l.code !== sourceLanguage);
  }, [languages, sourceLanguage]);

  // Ensure target stays valid when source changes
  useEffect(() => {
    if (!targetLanguageOptions.length) {
      return;
    }
    if (!targetLanguageOptions.some((l) => l.code === targetLanguage)) {
      setTargetLanguage(targetLanguageOptions[0].code);
    }
  }, [targetLanguageOptions, targetLanguage]);

  const detectedLanguageName = useMemo(() => {
    if (!detectedLanguage) {
      return null;
    }
    return languages.find((l) => l.code === detectedLanguage)?.name || detectedLanguage;
  }, [detectedLanguage, languages]);

  const targetLanguageName = useMemo(() => {
    return languages.find((l) => l.code === targetLanguage)?.name || targetLanguage;
  }, [languages, targetLanguage]);

  const handleTranslate = async () => {
    const trimmed = sourceText.trim();
    if (!trimmed) {
      const msg = 'Enter or dictate text in the source panel before translating.';
      setErrorState({message: msg});
      onNotify('error', 'Empty input', msg);
      return;
    }

    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
      const msg = 'Source and target languages must be different.';
      setErrorState({message: msg});
      onNotify('error', 'Invalid language pair', msg);
      return;
    }

    if (recognition.isListening) {
      recognition.stopListening();
    }
    synthesis.stop();

    setIsTranslating(true);
    setErrorState(null);

    try {
      const result: TranslateResponse = await translateText({
        text: trimmed,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        save_to_history: autoSaveHistory,
      });

      setTranslatedText(result.translated_text);
      setDetectedLanguage(result.detected_language);
      setDetectedConfidence(result.detected_confidence);
      if (autoSaveHistory) {
        onTranslationSaved?.();
      }
      onNotify('success', 'Translation complete');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorState({message: err.message, hint: err.hint});
        onNotify('error', 'Translation failed', err.message);
      } else {
        const fallbackMsg = err instanceof Error ? err.message : 'Unexpected translation error.';
        setErrorState({message: fallbackMsg});
        onNotify('error', 'Translation failed', fallbackMsg);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    let effectiveSource = sourceLanguage;
    if (effectiveSource === 'auto') {
      if (detectedLanguage) {
        effectiveSource = detectedLanguage;
      } else {
        onNotify(
          'info',
          'Select a source language to swap',
          'Choose a specific source language or translate text with Auto Detect first.',
        );
        return;
      }
    }

    if (effectiveSource === targetLanguage) {
      return;
    }

    synthesis.stop();
    setSourceLanguage(targetLanguage);
    setTargetLanguage(effectiveSource);
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
    setDetectedLanguage(null);
    setDetectedConfidence(null);
    setErrorState(null);
  };

  const handleClear = () => {
    if (recognition.isListening) {
      recognition.stopListening();
    }
    synthesis.stop();
    setSourceText('');
    setTranslatedText('');
    setDetectedLanguage(null);
    setDetectedConfidence(null);
    setErrorState(null);
    recognition.clearError();
  };

  const handlePaste = async () => {
    if (!navigator.clipboard?.readText) {
      onNotify(
        'info',
        'Clipboard paste unavailable',
        'Your browser blocks programmatic paste here. Use Ctrl+V / Cmd+V directly in the text area.',
      );
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText.trim()) {
        onNotify('info', 'Clipboard is empty');
        return;
      }
      setSourceText(clipText.slice(0, MAX_CHARS));
      setErrorState(null);
      onNotify('success', 'Text pasted from clipboard');
    } catch {
      onNotify(
        'error',
        'Clipboard permission denied',
        'Allow clipboard access or paste directly with Ctrl+V / Cmd+V.',
      );
    }
  };

  const handleCopy = async () => {
    if (!translatedText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      onNotify('success', 'Copied translation to clipboard');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('error', 'Failed to copy text', 'Select and copy the output manually.');
    }
  };

  const handleDownload = () => {
    if (!translatedText) {
      return;
    }
    const effectiveSrc = detectedLanguage || sourceLanguage;
    const content = [
      `Source (${effectiveSrc}):`,
      sourceText,
      '',
      `Translation (${targetLanguage}):`,
      translatedText,
      '',
    ].join('\n');

    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linguaai-${effectiveSrc}-to-${targetLanguage}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onNotify('success', 'Downloaded translation as TXT');
  };

  const handleStartSpeech = () => {
    synthesis.stop();
    const speechLang = sourceLanguage === 'auto' ? 'en' : sourceLanguage;
    recognition.startListening(speechLang, sourceText, (updatedText) => {
      setSourceText(updatedText.slice(0, MAX_CHARS));
      setErrorState(null);
    });
  };

  return (
    <div className="space-y-4">
      {languagesError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium">Could not load supported languages from backend</p>
              <p className="mt-0.5 text-xs opacity-90">{languagesError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryLanguages}
            className="h-9 rounded-lg border border-amber-400 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Dual Translation Panels */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left Panel: Source Language */}
        <section
          aria-label="Source text panel"
          className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <LanguageSelector
              id="source-language-select"
              label="Source language"
              value={sourceLanguage}
              languages={languages}
              allowAutoDetect={true}
              disabled={languagesLoading}
              detectedLabel={detectedLanguageName}
              onChange={(code) => {
                setSourceLanguage(code);
                setDetectedLanguage(null);
                setDetectedConfidence(null);
              }}
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePaste}
                aria-label="Paste text from clipboard"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>Paste</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={!sourceText && !translatedText}
                aria-label="Clear source and translated text"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-4">
            <label htmlFor="source-text-input" className="sr-only">
              Text to translate
            </label>
            <textarea
              id="source-text-input"
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value.slice(0, MAX_CHARS));
                if (errorState) {
                  setErrorState(null);
                }
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleTranslate();
                }
              }}
              maxLength={MAX_CHARS}
              rows={7}
              placeholder="Type, paste, or dictate text to translate..."
              className="w-full flex-1 resize-none bg-transparent text-base leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />

            {recognition.error && (
              <p
                role="alert"
                className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                {recognition.error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <VoiceRecorder
              isSupported={recognition.isSupported}
              isListening={recognition.isListening}
              interimText={recognition.interimText}
              onStart={handleStartSpeech}
              onStop={recognition.stopListening}
            />

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {detectedLanguageName && (
                <span>
                  Detected: <strong className="font-medium text-slate-700 dark:text-slate-200">{detectedLanguageName}</strong>
                  {detectedConfidence !== null ? ` (${Math.round(detectedConfidence)}%)` : ''}
                </span>
              )}
              <span className="font-mono tabular-nums">
                {sourceText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Center Swap Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleSwapLanguages}
            aria-label="Swap source and target languages"
            title="Swap languages"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-transform duration-150 hover:scale-105 hover:border-blue-300 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 lg:rotate-0" />
          </button>
        </div>

        {/* Right Panel: Translated Output */}
        <section
          aria-label="Translated text panel"
          className="flex flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <LanguageSelector
              id="target-language-select"
              label="Target language"
              value={targetLanguage}
              languages={targetLanguageOptions}
              allowAutoDetect={false}
              disabled={languagesLoading || targetLanguageOptions.length === 0}
              onChange={setTargetLanguage}
            />

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!translatedText}
                aria-label="Copy translated text"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
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
                onClick={handleDownload}
                disabled={!translatedText}
                aria-label="Download translation as text file"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download TXT</span>
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-4">
            {isTranslating ? (
              <div className="space-y-3 py-2" aria-label="Translating text">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ) : translatedText ? (
              <div
                aria-live="polite"
                className="min-h-[168px] whitespace-pre-wrap break-words text-base leading-relaxed text-slate-900 dark:text-slate-100"
              >
                {translatedText}
              </div>
            ) : (
              <div className="flex min-h-[168px] items-start text-base text-slate-400 dark:text-slate-500">
                Translation output will appear here.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <SpeechPlayer
              isSupported={synthesis.isSupported}
              hasText={Boolean(translatedText.trim())}
              status={synthesis.status}
              rate={synthesis.rate}
              volume={synthesis.volume}
              activeVoiceName={synthesis.activeVoiceName}
              warning={synthesis.warning}
              onRateChange={synthesis.setRate}
              onVolumeChange={synthesis.setVolume}
              onSpeak={() => synthesis.speak(translatedText, targetLanguage, targetLanguageName)}
              onPause={synthesis.pause}
              onResume={synthesis.resume}
              onStop={synthesis.stop}
            />
          </div>
        </section>
      </div>

      {/* Primary Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Press <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-700">Ctrl</kbd> +{' '}
          <kbd className="rounded border border-slate-300 px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-700">Enter</kbd> to translate quickly.
        </p>

        <button
          type="button"
          onClick={handleTranslate}
          disabled={isTranslating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 dark:focus-visible:ring-offset-slate-950"
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <Languages className="h-4 w-4" />
              <span>Translate</span>
            </>
          )}
        </button>
      </div>

      {/* Structured Provider / Validation Error Banner */}
      {errorState && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <p className="font-semibold">{errorState.message}</p>
              {errorState.hint && (
                <p className="text-xs leading-relaxed text-red-800 dark:text-red-300">
                  {errorState.hint}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
