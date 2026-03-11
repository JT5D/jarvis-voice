import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JarvisEngine } from '../../src/engine/JarvisEngine.js';
import type { STTProvider, TTSProvider, LLMProvider, LLMResponse, ChatMessage, ToolSchema } from '../../src/types.js';

function mockSTT(name = 'MockSTT'): STTProvider {
  let cb: ((text: string, isFinal: boolean) => void) | null = null;
  return {
    name,
    available: vi.fn().mockResolvedValue(true),
    startListening: vi.fn().mockImplementation(async (onResult) => { cb = onResult; }),
    stopListening: vi.fn().mockImplementation(async () => {
      cb?.('hello jarvis', true);
      return 'hello jarvis';
    }),
  };
}

function mockTTS(name = 'MockTTS'): TTSProvider {
  return {
    name,
    available: vi.fn().mockResolvedValue(true),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  };
}

function mockLLM(response = 'Hello!', name = 'MockLLM'): LLMProvider {
  return {
    name,
    available: vi.fn().mockResolvedValue(true),
    chat: vi.fn().mockImplementation(async (
      _msgs: ChatMessage[], _tools?: ToolSchema[], onChunk?: (chunk: string) => void
    ): Promise<LLMResponse> => {
      onChunk?.(response);
      return { content: response };
    }),
  };
}

describe('JarvisEngine', () => {
  let engine: JarvisEngine;
  let stt: STTProvider;
  let tts: TTSProvider;
  let llm: LLMProvider;

  beforeEach(() => {
    stt = mockSTT();
    tts = mockTTS();
    llm = mockLLM();
    engine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [llm] });
  });

  it('starts in idle state', () => {
    expect(engine.getState().status).toBe('idle');
  });

  it('notifies subscribers on state change', async () => {
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.send('test');
    expect(listener).toHaveBeenCalled();
    const states = listener.mock.calls.map((c: [{ status: string }]) => c[0].status);
    expect(states).toContain('thinking');
  });

  it('unsubscribes correctly', () => {
    const listener = vi.fn();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.stop();
    // Listener should not be called after unsubscribe (only the stop update)
    // Actually, it should not be called at all since we unsubscribed
    expect(listener).not.toHaveBeenCalled();
  });

  it('sends text input and gets LLM response', async () => {
    const result = await engine.send('hello');
    expect(result).toBe('Hello!');
    expect(llm.chat).toHaveBeenCalled();
    expect(tts.speak).toHaveBeenCalledWith('Hello!');
  });

  it('includes system prompt in LLM messages', async () => {
    await engine.send('test');
    const calls = (llm.chat as ReturnType<typeof vi.fn>).mock.calls;
    const messages = calls[0][0] as ChatMessage[];
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Jarvis');
  });

  it('handles LLM errors gracefully', async () => {
    const badLLM = mockLLM();
    (badLLM.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('LLM down'));
    const errorEngine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [badLLM] });
    
    const result = await errorEngine.send('test');
    expect(result).toBe('');
    expect(errorEngine.getState().status).toBe('error');
    expect(errorEngine.getState().error).toContain('LLM down');
  });

  it('stops current activity', () => {
    engine.stop();
    expect(engine.getState().status).toBe('idle');
  });

  it('processes tool calls in agentic loop', async () => {
    let callCount = 0;
    const toolLLM: LLMProvider = {
      name: 'ToolLLM',
      available: vi.fn().mockResolvedValue(true),
      chat: vi.fn().mockImplementation(async (): Promise<LLMResponse> => {
        callCount++;
        if (callCount === 1) {
          return {
            content: '',
            toolCalls: [{ id: 'tc1', name: 'get_time', args: {} }],
          };
        }
        return { content: 'The time is now.' };
      }),
    };

    const toolEngine = new JarvisEngine({ stt: [stt], tts: [tts], llm: [toolLLM] });
    const result = await toolEngine.send('what time is it?');
    expect(result).toBe('The time is now.');
    expect(toolLLM.chat).toHaveBeenCalledTimes(2);
  });

  it('limits tool execution rounds', async () => {
    const infiniteLLM: LLMProvider = {
      name: 'InfiniteLLM',
      available: vi.fn().mockResolvedValue(true),
      chat: vi.fn().mockResolvedValue({
        content: 'calling tool',
        toolCalls: [{ id: 'tc', name: 'get_time', args: {} }],
      } as LLMResponse),
    };

    const limitEngine = new JarvisEngine({
      stt: [stt], tts: [tts], llm: [infiniteLLM],
      maxToolRounds: 3,
    });
    await limitEngine.send('loop');
    expect(infiniteLLM.chat).toHaveBeenCalledTimes(3);
  });

  it('trims conversation history', async () => {
    const shortEngine = new JarvisEngine({
      stt: [stt], tts: [tts], llm: [llm],
      maxHistoryMessages: 4,
    });
    for (let i = 0; i < 10; i++) {
      await shortEngine.send(`msg ${i}`);
    }
    // History should be trimmed but engine should still work
    const result = await shortEngine.send('final');
    expect(result).toBe('Hello!');
  });
});
