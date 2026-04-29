import { useState, useCallback, useRef, useEffect } from 'react';

const SUPPORTED = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export function useVoice({ onTranscript, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (!SUPPORTED) {
      const msg = 'Voice input is not supported. Try Chrome.';
      setError(msg);
      onError?.(msg);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      finalTranscriptRef.current = transcript;
      setTranscript(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      let msg = 'Voice recognition error: ' + event.error;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        msg = 'Microphone access denied.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        msg = 'Network error. Please try again.';
      }
      setError(msg);
      onError?.(msg);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      const final = finalTranscriptRef.current.trim();
      if (final && onTranscript) {
        onTranscript(final);
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();

  }, [onTranscript, onError]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported: SUPPORTED,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript: () => {
      setTranscript('');
      finalTranscriptRef.current = '';
    },
  };
}