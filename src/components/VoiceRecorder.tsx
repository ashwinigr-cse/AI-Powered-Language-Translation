import {Mic, MicOff, Square} from 'lucide-react';

interface VoiceRecorderProps {
  isSupported: boolean;
  isListening: boolean;
  interimText: string;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceRecorder({
  isSupported,
  isListening,
  interimText,
  onStart,
  onStop,
}: VoiceRecorderProps) {
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Speech recognition is not supported in this browser"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-400 cursor-not-allowed whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500"
      >
        <MicOff className="h-3.5 w-3.5" />
        <span>Voice Unavailable</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isListening ? (
        <button
          type="button"
          onClick={onStart}
          aria-label="Start voice input"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Mic className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>Speak</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop voice recording"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 whitespace-nowrap shrink-0 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span>Stop Recording</span>
        </button>
      )}
      {isListening && (
        <span className="max-w-[180px] truncate text-xs text-red-600 dark:text-red-400">
          {interimText ? `Hearing: "${interimText}"` : 'Listening...'}
        </span>
      )}
    </div>
  );
}
