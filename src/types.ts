/** Speech-to-text provider interface */
export interface STTProvider {
  readonly name: string;
  available(): Promise<boolean>;
  startListening(onResult: (text: string, isFinal: boolean) => void): Promise<void>;
  stopListening(): Promise<string>;
}

/** Text-to-speech provider interface */
export interface TTSProvider {
  readonly name: string;
  available(): Promise<boolean>;
  speak(text: string): Promise<void>;
  stop(): void;
}

/** Large language model provider interface */
export interface LLMProvider {
  readonly name: string;
  available(): Promise<boolean>;
  chat(messages: ChatMessage[], tools?: ToolSchema[], onChunk?: (chunk: string) => void): Promise<LLMResponse>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string }>;
}

export interface JarvisTool extends ToolSchema {
  execute(args: Record<string, unknown>): Promise<string>;
}

export type JarvisStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface JarvisState {
  status: JarvisStatus;
  transcript: string;
  response: string;
  error?: string;
  providers: { stt: string; tts: string; llm: string };
}

export interface JarvisConfig {
  stt?: STTProvider[];
  tts?: TTSProvider[];
  llm?: LLMProvider[];
  tools?: JarvisTool[];
  systemPrompt?: string;
  maxHistoryMessages?: number;
  maxToolRounds?: number;
  onStateChange?: (state: JarvisState) => void;
}
