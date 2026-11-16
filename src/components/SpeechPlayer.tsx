import {Loader2, Pause, Play, Square, Volume2, VolumeX} from 'lucide-react';
import type {PlaybackStatus} from '../hooks/useSpeechSynthesis';

interface SpeechPlayerProps {
  isSupported: boolean;
  hasText: boolean;
  status: PlaybackStatus;
  rate: number;
  volume: number;
  activeVoiceName: string | null;
  warning: string | null;
  onRateChange: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  onSpeak: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function SpeechPlayer({
  isSupported,
  hasText,
  status,
  rate,
  volume,
  activeVoiceName,
  warning,
  onRateChange,
  onVolumeChange,
  onSpeak,
  onPause,
  onResume,
  onStop,
}: SpeechPlayerProps) {
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <VolumeX className="h-3.5 w-3.5" />
        <span>Audio playback is not supported in this browser.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'idle' && (
          <button
            type="button"
            disabled={!hasText}
            onClick={onSpeak}
            aria-label="Listen to translated text"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Volume2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Listen</span>
          </button>
        )}

        {status === 'loading' && (
          <button
            type="button"
            disabled
            aria-label="Preparing speech playback"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 whitespace-nowrap shrink-0 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Preparing...</span>
          </button>
        )}

        {status === 'speaking' && (
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause speech playback"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
          >
            <Pause className="h-3.5 w-3.5" />
            <span>Pause</span>
          </button>
        )}

        {status === 'paused' && (
          <button
            type="button"
            onClick={onResume}
            aria-label="Resume speech playback"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Resume</span>
          </button>
        )}

        {status !== 'idle' && (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop speech playback"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}

        <div className="flex items-center gap-3 pl-1 text-xs text-slate-600 dark:text-slate-400">
          <label className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Speed</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.25"
              value={rate}
              onChange={(e) => onRateChange(parseFloat(e.target.value))}
              aria-label="Speech playback speed"
              className="h-1.5 w-16 cursor-pointer accent-blue-600"
            />
            <span className="w-8 font-mono tabular-nums">{rate.toFixed(2).replace(/\.00$/, '')}x</span>
          </label>

          <label className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Vol</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Speech playback volume"
              className="h-1.5 w-14 cursor-pointer accent-blue-600"
            />
            <span className="w-8 font-mono tabular-nums">{Math.round(volume * 100)}%</span>
          </label>
        </div>
      </div>

      {(activeVoiceName || warning) && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {activeVoiceName && <span>Voice: {activeVoiceName}</span>}
          {warning && (
            <p className="mt-0.5 text-amber-700 dark:text-amber-400" role="status">
              {warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
