import type {
  JarvisConfig, JarvisState, JarvisStatus,
  STTProvider, TTSProvider, LLMProvider,
  ChatMessage, JarvisTool,
} from '../types.js';
import { ProviderChain } from './ProviderChain.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { Memory } from '../memory/Memory.js';
import { createBuiltinTools } from '../tools/builtins.js';

const DEFAULT_SYSTEM_PROMPT = `You are Jarvis, an intelligent voice assistant. You are warm, precise, and concise. Keep responses short — you are speaking aloud, not writing an essay. If you need a tool, use it. If you have the answer, say it.`;

const MAX_HISTORY = 20;
const MAX_TOOL_ROUNDS = 5;

export class JarvisEngine {
  readonly sttChain: ProviderChain<STTProvider>;
  readonly ttsChain: ProviderChain<TTSProvider>;
  readonly llmChain: ProviderChain<LLMProvider>;
  readonly tools: ToolRegistry;
  readonly memory: Memory;

  private history: ChatMessage[] = [];
  private systemPrompt: string;
  private maxHistory: number;
  private maxToolRounds: number;
  private state: JarvisState;
  private listeners = new Set<(state: JarvisState) => void>();
  private abortController: AbortController | null = null;

  constructor(config: JarvisConfig = {}) {
    this.sttChain = new ProviderChain(config.stt ?? []);
    this.ttsChain = new ProviderChain(config.tts ?? []);
    this.llmChain = new ProviderChain(config.llm ?? []);
    this.tools = new ToolRegistry();
    this.memory = new Memory();
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.maxHistory = config.maxHistoryMessages ?? MAX_HISTORY;
    this.maxToolRounds = config.maxToolRounds ?? MAX_TOOL_ROUNDS;

    // Register builtin tools
    for (const tool of createBuiltinTools(this.memory)) {
      this.tools.register(tool);
    }
    // Register user tools
    if (config.tools) {
      for (const tool of config.tools) {
        this.tools.register(tool);
      }
    }

    this.state = {
      status: 'idle',
      transcript: '',
      response: '',
      providers: { stt: '', tts: '', llm: '' },
    };

    if (config.onStateChange) {
      this.listeners.add(config.onStateChange);
    }
  }

  /** Subscribe to state changes */
  subscribe(listener: (state: JarvisState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current state */
  getState(): Readonly<JarvisState> {
    return { ...this.state };
  }

  /** Start listening via STT */
  async startListening(): Promise<void> {
    this.abort();
    this.abortController = new AbortController();
    this.updateState({ status: 'listening', transcript: '', response: '', error: undefined });

    try {
      const stt = await this.sttChain.resolve();
      this.updateState({ providers: { ...this.state.providers, stt: stt.name } });

      await stt.startListening((text, isFinal) => {
        this.updateState({ transcript: text });
        if (isFinal && text.trim()) {
          this.processInput(text.trim());
        }
      });
    } catch (err) {
      this.handleError(err);
    }
  }

  /** Stop listening */
  async stopListening(): Promise<void> {
    try {
      const stt = await this.sttChain.resolve();
      const finalText = await stt.stopListening();
      if (finalText.trim() && this.state.status === 'listening') {
        await this.processInput(finalText.trim());
      } else if (this.state.status === 'listening') {
        this.updateState({ status: 'idle' });
      }
    } catch (err) {
      this.handleError(err);
    }
  }

  /** Send text input directly (bypass STT) */
  async send(text: string): Promise<string> {
    this.abort();
    this.abortController = new AbortController();
    return this.processInput(text);
  }

  /** Stop all activity */
  stop(): void {
    this.abort();
    try {
      this.ttsChain.resolve().then(tts => tts.stop()).catch(() => {});
    } catch {
      // ignore
    }
    this.updateState({ status: 'idle' });
  }

  /** Process user input through LLM + tools + TTS */
  private async processInput(text: string): Promise<string> {
    this.updateState({ status: 'thinking', transcript: text });

    this.history.push({ role: 'user', content: text });
    this.trimHistory();

    try {
      const llm = await this.llmChain.resolve();
      this.updateState({ providers: { ...this.state.providers, llm: llm.name } });

      const messages: ChatMessage[] = [
        { role: 'system', content: this.systemPrompt },
        ...this.history,
      ];

      let response = '';
      let rounds = 0;

      // Agentic tool loop (max rounds to prevent infinite loops)
      while (rounds < this.maxToolRounds) {
        if (this.abortController?.signal.aborted) break;
        rounds++;

        let accumulated = '';
        const result = await llm.chat(
          messages,
          this.tools.size > 0 ? this.tools.list() : undefined,
          (chunk) => {
            accumulated += chunk;
            this.updateState({ response: accumulated });
          },
        );

        response = result.content;

        // Handle tool calls
        if (result.toolCalls && result.toolCalls.length > 0) {
          messages.push({ role: 'assistant', content: response });

          for (const call of result.toolCalls) {
            const toolResult = await this.tools.execute(call);
            messages.push({
              role: 'tool',
              content: toolResult,
              toolCallId: call.id,
            });
          }
          // Continue loop — LLM will see tool results
          continue;
        }

        // No tool calls — done
        break;
      }

      this.history.push({ role: 'assistant', content: response });
      this.trimHistory();
      this.updateState({ response });

      // Speak the response
      await this.speak(response);
      return response;
    } catch (err) {
      if (err instanceof Error && err.message.includes('rate')) {
        // Rate limit — mark provider failed and retry
        const llm = await this.llmChain.resolve().catch(() => null);
        if (llm) this.llmChain.markFailed(llm.name);
      }
      this.handleError(err);
      return '';
    }
  }

  /** Speak text via TTS */
  private async speak(text: string): Promise<void> {
    if (!text || this.abortController?.signal.aborted) return;
    this.updateState({ status: 'speaking' });

    try {
      const tts = await this.ttsChain.resolve();
      this.updateState({ providers: { ...this.state.providers, tts: tts.name } });
      await tts.speak(text);
    } catch (err) {
      // TTS failure is non-fatal — response is still shown as text
      console.warn('TTS failed:', err);
    }

    if (!this.abortController?.signal.aborted) {
      this.updateState({ status: 'idle' });
    }
  }

  private trimHistory(): void {
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  private abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  private updateState(partial: Partial<JarvisState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {
        // Listener error shouldn't crash engine
      }
    }
  }

  private handleError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.updateState({ status: 'error', error: message });
  }
}
