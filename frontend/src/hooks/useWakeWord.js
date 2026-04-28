import { useState, useEffect, useRef, useCallback } from 'react';

const WAKE_PHRASES = ['hey voicedesk', 'hey voice desk', 'ok voicedesk', 'okay voicedesk'];

const SUPPORTED = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function useWakeWord({ onWake, enabled = true } = {}) {
  const [isPassiveListening, setIsPassiveListening] = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  const restartTimerRef = useRef(null);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const stop = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsPassiveListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SUPPORTED || !enabledRef.current) return;
    if (recognitionRef.current) return; // already running

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsPassiveListening(true);

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase().trim();
        const hit = WAKE_PHRASES.some(phrase => text.includes(phrase));
        if (hit) {
          setWakeDetected(true);
          setTimeout(() => setWakeDetected(false), 3000);
          onWake?.();
          // Brief pause then restart passive listening
          recognition.abort();
          restartTimerRef.current = setTimeout(() => {
            recognitionRef.current = null;
            if (enabledRef.current) start();
          }, 4000);
          return;
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') { stop(); return; }
      // Auto-restart on other errors
      recognitionRef.current = null;
      setIsPassiveListening(false);
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current) start();
      }, 2000);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsPassiveListening(false);
      // Auto-restart to keep listening
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current) start();
      }, 500);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { recognitionRef.current = null; }
  }, [onWake, stop]);

  useEffect(() => {
    if (enabled && SUPPORTED) start();
    else stop();
    return stop;
  }, [enabled, start, stop]);

  return { isPassiveListening, wakeDetected, isSupported: SUPPORTED };
}
