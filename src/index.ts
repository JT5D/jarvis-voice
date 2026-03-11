// Core engine
export { JarvisEngine } from './engine/JarvisEngine.js';
export { ProviderChain } from './engine/ProviderChain.js';

// Tools
export { ToolRegistry } from './tools/ToolRegistry.js';
export { createBuiltinTools } from './tools/builtins.js';

// Memory
export { Memory } from './memory/Memory.js';

// Providers — STT
export { WebSpeechSTT } from './providers/stt/WebSpeechSTT.js';
export { GroqWhisperSTT } from './providers/stt/GroqWhisperSTT.js';

// Providers — TTS
export { WebSpeechTTS } from './providers/tts/WebSpeechTTS.js';
export { ElevenLabsTTS } from './providers/tts/ElevenLabsTTS.js';

// Providers — LLM
export { OllamaLLM } from './providers/llm/OllamaLLM.js';
export { GroqLLM } from './providers/llm/GroqLLM.js';
export { AnthropicLLM } from './providers/llm/AnthropicLLM.js';

// Types
export type {
  STTProvider, TTSProvider, LLMProvider,
  ChatMessage, LLMResponse, ToolCall, ToolSchema,
  JarvisTool, JarvisConfig, JarvisState, JarvisStatus,
} from './types.js';

// Convenience: auto-configured engine with platform defaults
export { createJarvis } from './create.js';
