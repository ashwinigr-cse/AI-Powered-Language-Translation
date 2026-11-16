export function AboutPage() {
  const technologies = [
    {name: 'Python & FastAPI', detail: 'Async REST APIs, Pydantic validation, and provider abstraction'},
    {name: 'React & TypeScript', detail: 'Modular UI components with strict static typing'},
    {name: 'Tailwind CSS', detail: 'Responsive light/dark interface with accessible contrast'},
    {name: 'NLP & Machine Translation', detail: 'LibreTranslate integration with automatic language detection'},
    {name: 'Speech Recognition', detail: 'Browser Web Speech API for live voice dictation'},
    {name: 'Text-to-Speech', detail: 'Browser SpeechSynthesis API with rate and volume controls'},
    {name: 'SQLite & SQLAlchemy', detail: 'Persistent local storage for history and user preferences'},
  ];

  const features = [
    'Text-to-text translation with dynamic provider language discovery and automatic source detection.',
    'Speech-to-text microphone dictation with live interim transcripts and editable input before translation.',
    'Text-to-speech playback supporting Pause, Resume, Stop, playback speed, volume, and language voice matching.',
    'Persistent SQLite translation history with instant search, copy, TXT download, reuse, and deletion controls.',
    'Modular backend service layer engineered so additional translation engines can be plugged in without changing routes.',
  ];

  const enhancements = [
    'Document and PDF batch translation preserving formatting across sections.',
    'Dual-speaker live conversation mode with automatic turn-by-turn speech playback.',
    'Custom terminology glossaries for domain-specific academic, legal, or medical vocabulary.',
    'Offline neural model packaging for air-gapped desktop deployments.',
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
          System Documentation
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
          AI-Based Language Translation System
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>Objective:</strong> To reduce language barriers across global communication,
          education, and technical workflows using artificial intelligence, natural language
          processing, and browser speech interfaces.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            01. Problem Statement
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Multilingual collaboration is frequently slowed down by disconnected tools: text
            translators lack integrated voice dictation, speech tools fail to preserve editable
            transcripts or translation records, and many lightweight interfaces hardcode language
            lists that break when upstream engines change.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            02. Proposed Solution
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            LinguaAI unifies dynamic machine translation, automatic language detection, live
            browser speech recognition, synthesized audio playback, and persistent SQLite history
            inside a clean full-stack architecture separating React presentation from FastAPI
            translation services.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            03. System Features
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {features.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            04. Future Enhancements
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {enhancements.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          05. Technology Stack
        </h3>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {tech.name}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{tech.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
