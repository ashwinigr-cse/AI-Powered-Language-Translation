import {useCallback, useEffect, useRef, useState} from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const SPEECH_LOCALE_MAP: Record<string, string> = {
  auto: 'en-US',
  en: 'en-US',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ar: 'ar-SA',
  pt: 'pt-PT',
  'pt-BR': 'pt-BR',
  ru: 'ru-RU',
  it: 'it-IT',
  nl: 'nl-NL',
  tr: 'tr-TR',
};

export function toSpeechLocale(langCode: string): string {
  if (!langCode || langCode === 'auto') {
    return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
  }
  return SPEECH_LOCALE_MAP[langCode] || langCode;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function mapSpeechError(errorCode: string): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. Allow microphone access in your browser site settings and retry.';
    case 'no-speech':
      return 'No speech was detected. Check your microphone input and speak clearly.';
    case 'audio-capture':
      return 'No microphone device was found or audio capture failed.';
    case 'network':
      return 'Speech recognition network service failed. Verify your internet connection.';
    case 'aborted':
      return 'Speech recognition stopped.';
    default:
      return `Speech recognition error (${errorCode}).`;
  }
}

export function useSpeechRecognition() {
  const [isSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionConstructor()));
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalBufferRef = useRef('');

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if recognition already halted
      }
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(
    (
      langCode: string,
      initialText: string,
      onTranscriptUpdate: (fullText: string) => void,
    ) => {
      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        setError(
          'Browser Speech Recognition (Web Speech API) is not supported in this browser. Try Chrome, Edge, or Safari, or type/paste text directly.',
        );
        return false;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }

      setError(null);
      setInterimText('');
      finalBufferRef.current = initialText.trim() ? `${initialText.trim()} ` : '';

      const recognition = new RecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = toSpeechLocale(langCode);

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let newlyFinalized = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            newlyFinalized += `${transcript.trim()} `;
          } else {
            interim += transcript;
          }
        }

        if (newlyFinalized) {
          finalBufferRef.current = `${finalBufferRef.current}${newlyFinalized}`;
        }

        setInterimText(interim.trim());
        const combined = `${finalBufferRef.current}${interim}`.trim();
        onTranscriptUpdate(combined);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error !== 'aborted') {
          setError(mapSpeechError(event.error));
        }
        setIsListening(false);
        setInterimText('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        return true;
      } catch (err) {
        setError(
          err instanceof Error
            ? `Failed to start speech recognition: ${err.message}`
            : 'Unable to start microphone speech recognition.',
        );
        setIsListening(false);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    error,
    clearError: () => setError(null),
    startListening,
    stopListening,
  };
}
