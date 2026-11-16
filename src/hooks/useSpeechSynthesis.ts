import {useCallback, useEffect, useRef, useState} from 'react';
import {buildTtsAudioUrl, fetchTtsAudioBlob} from '../services/api';
import {toSpeechLocale} from './useSpeechRecognition';

export type PlaybackStatus = 'idle' | 'loading' | 'speaking' | 'paused';

export function useSpeechSynthesis(defaultRate = 1.0, defaultVolume = 1.0) {
  const [speechSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
  );
  const [audioSupported] = useState<boolean>(() => typeof window !== 'undefined' && typeof Audio !== 'undefined');
  const isSupported = speechSupported || audioSupported;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [rate, setRateState] = useState<number>(defaultRate);
  const [volume, setVolumeState] = useState<number>(defaultVolume);
  const [activeVoiceName, setActiveVoiceName] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const modeRef = useRef<'none' | 'speech' | 'audio'>('none');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speakDelayTimerRef = useRef<number | null>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const playbackTokenRef = useRef(0);

  useEffect(() => {
    setRateState(defaultRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = defaultRate;
    }
  }, [defaultRate]);

  useEffect(() => {
    setVolumeState(defaultVolume);
    if (audioRef.current) {
      audioRef.current.volume = defaultVolume;
    }
  }, [defaultVolume]);

  const clearTimers = useCallback(() => {
    if (speakDelayTimerRef.current !== null) {
      window.clearTimeout(speakDelayTimerRef.current);
      speakDelayTimerRef.current = null;
    }
    if (watchdogTimerRef.current !== null) {
      window.clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  }, []);

  const cleanupAudioOnly = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {
        // Ignore audio cleanup errors
      }
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    clearTimers();
    modeRef.current = 'none';
    utteranceRef.current = null;

    if (speechSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speechSynthesis cancel errors
      }
    }
    cleanupAudioOnly();
    setStatus('idle');
    setActiveVoiceName(null);
  }, [cleanupAudioOnly, clearTimers, speechSupported]);

  useEffect(() => {
    if (!speechSupported) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      stop();
    };
  }, [speechSupported, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const findMatchingVoice = useCallback(
    (langCode: string, voiceList?: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
      const candidates = voiceList && voiceList.length > 0 ? voiceList : voices;
      if (!candidates.length) {
        return null;
      }
      const targetLocale = toSpeechLocale(langCode).toLowerCase();
      const baseLang = langCode.split('-')[0].toLowerCase();

      const exact = candidates.find((v) => v.lang.toLowerCase() === targetLocale);
      if (exact) {
        return exact;
      }
      const prefix = candidates.find((v) => v.lang.toLowerCase().startsWith(`${baseLang}-`));
      if (prefix) {
        return prefix;
      }
      const loose = candidates.find((v) => v.lang.toLowerCase() === baseLang);
      return loose || null;
    },
    [voices],
  );

  const setRate = useCallback((nextRate: number) => {
    setRateState(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, []);

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(nextVolume);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  }, []);

  const playServerAudio = useCallback(
    (cleanedText: string, langCode: string, langDisplayName: string | undefined, token: number, notice?: string) => {
      if (!audioSupported) {
        setWarning('Audio playback is unavailable in this browser.');
        setStatus('idle');
        return;
      }

      cleanupAudioOnly();
      modeRef.current = 'audio';
      setStatus('loading');
      setActiveVoiceName(`LinguaAI Audio (${langDisplayName || langCode})`);
      if (notice) {
        setWarning(notice);
      }

      const audio = new Audio();
      audio.preload = 'auto';
      audio.playbackRate = rate;
      audio.volume = volume;
      audioRef.current = audio;

      audio.onplaying = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        setStatus('speaking');
      };
      audio.onpause = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        if (!audio.ended && audio.currentTime > 0 && audio.currentTime < (audio.duration || Infinity)) {
          setStatus('paused');
        }
      };
      audio.onended = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        modeRef.current = 'none';
        setStatus('idle');
        setActiveVoiceName(null);
      };
      audio.onerror = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        modeRef.current = 'none';
        setStatus('idle');
        setActiveVoiceName(null);
        setWarning('Unable to play synthesized speech audio for this language.');
      };

      const encodedLen = encodeURIComponent(cleanedText).length;
      if (encodedLen <= 1400) {
        audio.src = buildTtsAudioUrl(cleanedText, langCode);
        void audio.play().catch(() => {
          if (playbackTokenRef.current !== token) {
            return;
          }
          modeRef.current = 'none';
          setStatus('idle');
          setActiveVoiceName(null);
          setWarning('Browser blocked audio playback. Tap Listen again to play.');
        });
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      void fetchTtsAudioBlob(cleanedText, langCode, controller.signal)
        .then((blob) => {
          if (playbackTokenRef.current !== token) {
            return;
          }
          const objectUrl = URL.createObjectURL(blob);
          blobUrlRef.current = objectUrl;
          audio.src = objectUrl;
          return audio.play();
        })
        .catch((err) => {
          if (playbackTokenRef.current !== token || (err instanceof DOMException && err.name === 'AbortError')) {
            return;
          }
          modeRef.current = 'none';
          setStatus('idle');
          setActiveVoiceName(null);
          setWarning(err instanceof Error ? err.message : 'Unable to play synthesized speech audio.');
        });
    },
    [audioSupported, cleanupAudioOnly, rate, volume],
  );

  const speak = useCallback(
    (text: string, langCode: string, langDisplayName?: string) => {
      if (!isSupported) {
        setWarning('Audio playback is not supported in this browser.');
        return;
      }
      const cleaned = text.trim();
      if (!cleaned) {
        return;
      }

      const wasBusy =
        speechSupported && (window.speechSynthesis.speaking || window.speechSynthesis.pending);

      stop();
      const token = playbackTokenRef.current;
      setWarning(null);

      const liveVoices = speechSupported ? window.speechSynthesis.getVoices() : [];
      if (liveVoices.length > 0 && liveVoices.length !== voices.length) {
        setVoices(liveVoices);
      }
      const matchedVoice = speechSupported ? findMatchingVoice(langCode, liveVoices) : null;

      // If browser SpeechSynthesis has no matching OS voice for this language (common for Hindi/regional languages),
      // stream real synthesized MP3 audio via /api/tts immediately within the tap gesture.
      if (!speechSupported || !matchedVoice) {
        const notice = speechSupported
          ? `No ${langDisplayName || langCode} system voice installed; playing LinguaAI cloud audio.`
          : undefined;
        playServerAudio(cleaned, langCode, langDisplayName, token, notice);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utteranceRef.current = utterance;
      modeRef.current = 'speech';

      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang || toSpeechLocale(langCode);
      utterance.rate = rate;
      utterance.volume = volume;
      setActiveVoiceName(matchedVoice.name);
      setStatus('loading');

      let started = false;
      const triggerFallback = () => {
        if (playbackTokenRef.current !== token || started) {
          return;
        }
        clearTimers();
        utteranceRef.current = null;
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
        playServerAudio(
          cleaned,
          langCode,
          langDisplayName,
          token,
          'Browser speech voice did not respond; switched to LinguaAI cloud audio.',
        );
      };

      utterance.onstart = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        started = true;
        if (watchdogTimerRef.current !== null) {
          window.clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
        setStatus('speaking');
      };
      utterance.onpause = () => {
        if (playbackTokenRef.current === token) {
          setStatus('paused');
        }
      };
      utterance.onresume = () => {
        if (playbackTokenRef.current === token) {
          setStatus('speaking');
        }
      };
      utterance.onend = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        clearTimers();
        modeRef.current = 'none';
        utteranceRef.current = null;
        setStatus('idle');
        setActiveVoiceName(null);
      };
      utterance.onerror = (event) => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        if (event.error === 'interrupted' || event.error === 'canceled') {
          return;
        }
        if (!started) {
          triggerFallback();
          return;
        }
        clearTimers();
        modeRef.current = 'none';
        utteranceRef.current = null;
        setStatus('idle');
        setActiveVoiceName(null);
        setWarning(`Speech playback encountered an error (${event.error}).`);
      };

      const startBrowserSpeech = () => {
        if (playbackTokenRef.current !== token) {
          return;
        }
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
          watchdogTimerRef.current = window.setTimeout(() => {
            if (!started) {
              triggerFallback();
            }
          }, 1200);
        } catch {
          triggerFallback();
        }
      };

      if (wasBusy) {
        // Avoid Chromium race condition when cancel() and speak() execute in the same tick
        speakDelayTimerRef.current = window.setTimeout(startBrowserSpeech, 60);
      } else {
        startBrowserSpeech();
      }
    },
    [
      clearTimers,
      findMatchingVoice,
      isSupported,
      playServerAudio,
      rate,
      speechSupported,
      stop,
      voices.length,
      volume,
    ],
  );

  const pause = useCallback(() => {
    if (modeRef.current === 'audio' && audioRef.current) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setStatus('paused');
      }
      return;
    }
    if (speechSupported && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, [speechSupported]);

  const resume = useCallback(() => {
    if (modeRef.current === 'audio' && audioRef.current) {
      if (audioRef.current.paused) {
        void audioRef.current.play().then(() => setStatus('speaking')).catch(() => {
          setWarning('Unable to resume audio playback.');
        });
      }
      return;
    }
    if (speechSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setStatus('speaking');
    }
  }, [speechSupported]);

  return {
    isSupported,
    status,
    rate,
    setRate,
    volume,
    setVolume,
    voicesCount: voices.length,
    activeVoiceName,
    warning,
    clearWarning: () => setWarning(null),
    hasVoiceForLanguage: (langCode: string) => Boolean(findMatchingVoice(langCode)),
    speak,
    pause,
    resume,
    stop,
  };
}
