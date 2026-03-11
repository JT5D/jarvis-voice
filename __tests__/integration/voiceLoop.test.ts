import { describe, it, expect, vi } from 'vitest';
import { JarvisEngine } from '../../src/engine/JarvisEngine.js';
import type { STTProvider, TTSProvider, LLMProvider, LLMResponse, ChatMessage, ToolSchema } from '../../src/types.js';

function createMockProviders() {
  const stt: STTProvider = {
    name: 'TestSTT',
    available: vi.fn().mockResolvedValue(true),
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn().mockResolvedValue('what is 2+2?'),
  };

  const tts: TTSProvider = {
    name: 'TestTTS',
    available: vi.fn().mockResolvedValue(true),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  };

  const llm: LLMProvider = {
    name: 'TestLLM',
    available: vi.fn().mockResolvedValue(true),
    chat: vi.fn().mockImplementation(async (
      _msgs: ChatMessage[], _tools?: ToolSchema[], onChunk?: (chunk: string) => void
    ): Promise<LLMResponse> => {
      const response = '2+2 is 4';
      onChunk?.(response);
      return { content: response };
    }),
  };

  return { stt, tts, llm };
}

describe('Voice loop integration', () => {
  it('completes full send -> LLM -> TTS cycle', async () => {
    const { stt, tts, llm } = createMockProviders();
    const engine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [llm] });

    const states: string[] = [];
    engine.subscribe(s => states.push(s.status));

    const result = await engine.send('what is 2+2?');
    expect(result).toBe('2+2 is 4');
    expect(tts.speak).toHaveBeenCalledWith('2+2 is 4');
    expect(states).toContain('thinking');
    expect(states).toContain('speaking');
  });

  it('handles provider failover', async () => {
    const badLLM: LLMProvider = {
      name: 'BadLLM',
      available: vi.fn().mockResolvedValue(false),
      chat: vi.fn(),
    };
    const { stt, tts, llm: goodLLM } = createMockProviders();

    const engine = new JarvisEngine({
      stt: [stt], tts: [tts], llm: [badLLM, goodLLM],
    });

    const result = await engine.send('test');
    expect(result).toBe('2+2 is 4');
    expect(badLLM.chat).not.toHaveBeenCalled();
    expect(goodLLM.chat).toHaveBeenCalled();
  });

  it('multi-turn conversation preserves history', async () => {
    const { stt, tts, llm } = createMockProviders();
    const engine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [llm] });

    await engine.send('Hello');
    await engine.send('How are you?');

    const calls = (llm.chat as ReturnType<typeof vi.fn>).mock.calls;
    // Second call should have history from first turn
    const secondCallMsgs = calls[1][0] as ChatMessage[];
    // system + user("Hello") + assistant("2+2 is 4") + user("How are you?")
    expect(secondCallMsgs.length).toBeGreaterThanOrEqual(4);
  });

  it('tool execution round-trip works end-to-end', async () => {
    const { stt, tts } = createMockProviders();
    let round = 0;
    const toolLLM: LLMProvider = {
      name: 'ToolLLM',
      available: vi.fn().mockResolvedValue(true),
      chat: vi.fn().mockImplementation(async (): Promise<LLMResponse> => {
        round++;
        if (round === 1) {
          return { content: '', toolCalls: [{ id: 't1', name: 'remember', args: { key: 'test', value: 'works' } }] };
        }
        return { content: 'I remembered that for you.' };
      }),
    };

    const engine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [toolLLM] });
    const result = await engine.send('remember this');
    expect(result).toBe('I remembered that for you.');
    expect(engine.memory.get('test')).toBe('works');
  });

  it('createJarvis factory creates a working engine', async () => {
    // Test that imports work and engine initializes
    const { createJarvis } = await import('../../src/create.js');
    const engine = createJarvis({
      stt: [createMockProviders().stt],
      tts: [createMockProviders().tts],
      llm: [createMockProviders().llm],
    });
    expect(engine).toBeInstanceOf(JarvisEngine);
    const result = await engine.send('test');
    expect(result).toBe('2+2 is 4');
  });
});
