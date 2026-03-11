import type { JarvisConfig } from './types.js';
import { JarvisEngine } from './engine/JarvisEngine.js';
import { WebSpeechSTT } from './providers/stt/WebSpeechSTT.js';
import { GroqWhisperSTT } from './providers/stt/GroqWhisperSTT.js';
import { WebSpeechTTS } from './providers/tts/WebSpeechTTS.js';
import { ElevenLabsTTS } from './providers/tts/ElevenLabsTTS.js';
import { OllamaLLM } from './providers/llm/OllamaLLM.js';
import { GroqLLM } from './providers/llm/GroqLLM.js';
import { AnthropicLLM } from './providers/llm/AnthropicLLM.js';

/**
 * Create a Jarvis engine with sensible defaults.
 * Free-first provider chain — works with zero API keys.
 * Premium providers auto-detected from env vars.
 */
export function createJarvis(overrides: Partial<JarvisConfig> = {}): JarvisEngine {
  return new JarvisEngine({
    stt: overrides.stt ?? [new GroqWhisperSTT(), new WebSpeechSTT()],
    tts: overrides.tts ?? [new ElevenLabsTTS(), new WebSpeechTTS()],
    llm: overrides.llm ?? [new GroqLLM(), new AnthropicLLM(), new OllamaLLM()],
    tools: overrides.tools,
    systemPrompt: overrides.systemPrompt,
    maxHistoryMessages: overrides.maxHistoryMessages,
    maxToolRounds: overrides.maxToolRounds,
    onStateChange: overrides.onStateChange,
  });
}
