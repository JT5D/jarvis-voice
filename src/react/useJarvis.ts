import { useState, useEffect, useCallback } from 'react';
import type { JarvisState } from '../types.js';
import { useJarvisEngine } from './JarvisProvider.js';

export interface UseJarvisReturn {
  state: JarvisState;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  send: (text: string) => Promise<string>;
  stop: () => void;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isIdle: boolean;
}

export function useJarvis(): UseJarvisReturn {
  const engine = useJarvisEngine();
  const [state, setState] = useState<JarvisState>(engine.getState());

  useEffect(() => engine.subscribe(setState), [engine]);

  const startListening = useCallback(() => engine.startListening(), [engine]);
  const stopListening = useCallback(() => engine.stopListening(), [engine]);
  const send = useCallback((text: string) => engine.send(text), [engine]);
  const stop = useCallback(() => engine.stop(), [engine]);

  return {
    state, startListening, stopListening, send, stop,
    isListening: state.status === 'listening',
    isThinking: state.status === 'thinking',
    isSpeaking: state.status === 'speaking',
    isIdle: state.status === 'idle',
  };
}
