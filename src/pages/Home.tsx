import {ArrowRight, Globe2, History, Languages, Mic, Volume2} from 'lucide-react';
import {useState} from 'react';
import type {NavSection} from '../types';

interface HomeProps {
  supportedCount: number;
  onStartTranslating: () => void;
  onNavigate: (section: NavSection) => void;
}

export function Home({supportedCount, onStartTranslating, onNavigate}: HomeProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="grid grid-cols-1 items-stretch gap-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
            LinguaAI · Multilingual Text &amp; Speech Platform
          </p>
          <h1 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-slate-900 text-balance sm:text-4xl dark:text-white">
            Break language barriers with intelligent AI-powered translation.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Translate text and speech across multiple languages instantly. Powered by a modular
            FastAPI translation engine, automatic source detection, Web Speech dictation, and
            browser speech synthesis.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartTranslating}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0 dark:focus-visible:ring-offset-slate-900"
            >
              <span>Start Translating</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('languages')}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Globe2 className="h-4 w-4" />
              <span>
                {supportedCount > 0 ? `${supportedCount} Supported Languages` : 'Supported Languages'}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
          {!imageFailed ? (
            <img
              src="/src/assets/images/lingua_hero_acoustic_1794839462278.jpg"
              alt="Architectural glass acoustic prisms and brushed slate acoustic wave models representing multilingual translation"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className="h-full min-h-[240px] w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 p-6 text-center dark:from-slate-800 dark:to-slate-900">
              <Languages className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                LinguaAI Translation Engine
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Core Modules Summary */}
      <section aria-label="Core capabilities" className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Languages className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
            Real-Time Text Translation
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Translate paragraphs across dynamically loaded provider languages with automatic source
            language detection and one-click language swapping.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Mic className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
            Speech Recognition &amp; Playback
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Dictate text with live browser speech transcription, refine your input, and hear
            translated output via SpeechSynthesis with speed and volume controls.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <History className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
            Persistent SQLite History
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Every translation is stored reliably in SQLite. Search past records, copy or download
            TXT exports, or reload any entry back into the translator.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span>Browse History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* Secondary Quick Links */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <Volume2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Configurable Translation Provider
            </h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Inspect backend provider connectivity, API key status, and speech playback defaults in
              Settings.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Open Settings
        </button>
      </section>
    </div>
  );
}
