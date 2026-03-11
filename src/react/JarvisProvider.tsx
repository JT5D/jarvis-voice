import React, { createContext, useContext, useRef, useMemo } from 'react';
import type { JarvisConfig } from '../types.js';
import { createJarvis } from '../create.js';
import { JarvisEngine } from '../engine/JarvisEngine.js';

const JarvisContext = createContext<JarvisEngine | null>(null);

export function useJarvisEngine(): JarvisEngine {
  const engine = useContext(JarvisContext);
  if (!engine) throw new Error('useJarvis must be used within <JarvisProvider>');
  return engine;
}

export interface JarvisProviderProps {
  config?: Partial<JarvisConfig>;
  engine?: JarvisEngine;
  children: React.ReactNode;
}

export function JarvisProvider({ config, engine: externalEngine, children }: JarvisProviderProps) {
  const engineRef = useRef<JarvisEngine | null>(externalEngine ?? null);

  const engine = useMemo(() => {
    if (externalEngine) return externalEngine;
    if (!engineRef.current) engineRef.current = createJarvis(config ?? {});
    return engineRef.current;
  }, [externalEngine, config]);

  return <JarvisContext.Provider value={engine}>{children}</JarvisContext.Provider>;
}
