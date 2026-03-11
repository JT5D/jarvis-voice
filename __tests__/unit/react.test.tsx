import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { JarvisProvider, useJarvisEngine } from '../../src/react/JarvisProvider.js';
import { JarvisEngine } from '../../src/engine/JarvisEngine.js';
import type { LLMProvider, LLMResponse, STTProvider, TTSProvider } from '../../src/types.js';

function mockProviders() {
  const stt: STTProvider = {
    name: 'MockSTT',
    available: async () => true,
    startListening: async () => {},
    stopListening: async () => '',
  };
  const tts: TTSProvider = {
    name: 'MockTTS',
    available: async () => true,
    speak: async () => {},
    stop: () => {},
  };
  const llm: LLMProvider = {
    name: 'MockLLM',
    available: async () => true,
    chat: async (): Promise<LLMResponse> => ({ content: 'test response' }),
  };
  return { stt: [stt], tts: [tts], llm: [llm] };
}

function EngineConsumer() {
  const engine = useJarvisEngine();
  return React.createElement('div', { 'data-testid': 'engine-name' }, engine.llmChain.names().join(','));
}

describe('JarvisProvider', () => {
  it('provides engine via context', () => {
    const { getByTestId } = render(
      React.createElement(JarvisProvider, { config: mockProviders() },
        React.createElement(EngineConsumer),
      ),
    );
    expect(getByTestId('engine-name').textContent).toBe('MockLLM');
  });

  it('accepts external engine', () => {
    const engine = new JarvisEngine(mockProviders());
    const { getByTestId } = render(
      React.createElement(JarvisProvider, { engine },
        React.createElement(EngineConsumer),
      ),
    );
    expect(getByTestId('engine-name').textContent).toBe('MockLLM');
  });

  it('throws when used outside provider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(React.createElement(EngineConsumer))).toThrow('must be used within');
    spy.mockRestore();
  });
});
