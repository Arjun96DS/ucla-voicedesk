// 

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
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (!SUPPORTED) {
      const msg = 'Voice input is not supported in this browser. Try Chrome or Edge.';
      setError(msg);
      onError?.(msg);
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsListening(false);
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        finalTranscriptRef.current += final;
        setTranscript(finalTranscriptRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      let msg = 'Voice recognition error';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        msg = 'Microphone access denied. Please allow microphone access.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        msg = 'Network error during voice recognition.';
      } else if (event.error === 'audio-capture') {
        msg = 'No microphone found. Please connect a microphone.';
      } else if (event.error === 'aborted') {
        return;
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

    setTimeout(() => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      } catch (err) {
        setError('Failed to start voice recognition. Please try again.');
        setIsListening(false);
        recognitionRef.current = null;
      }
    }, 150);

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
    clearTranscript: () => { setTranscript(''); finalTranscriptRef.current = ''; },
  };
}