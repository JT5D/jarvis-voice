import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSpeechSTT } from '../../src/providers/stt/WebSpeechSTT.js';
import { WebSpeechTTS } from '../../src/providers/tts/WebSpeechTTS.js';
import { GroqWhisperSTT } from '../../src/providers/stt/GroqWhisperSTT.js';
import { GroqLLM } from '../../src/providers/llm/GroqLLM.js';
import { OllamaLLM } from '../../src/providers/llm/OllamaLLM.js';
import { AnthropicLLM } from '../../src/providers/llm/AnthropicLLM.js';
import { ElevenLabsTTS } from '../../src/providers/tts/ElevenLabsTTS.js';
import { ExpoSpeechSTT } from '../../src/providers/stt/ExpoSpeechSTT.js';
import { ExpoSpeechTTS } from '../../src/providers/tts/ExpoSpeechTTS.js';

describe('WebSpeechSTT', () => {
  it('has correct name', () => {
    const stt = new WebSpeechSTT();
    expect(stt.name).toBe('WebSpeechSTT');
  });

  it('reports unavailable when SpeechRecognition missing', async () => {
    const stt = new WebSpeechSTT();
    // jsdom doesn't have SpeechRecognition
    const available = await stt.available();
    expect(available).toBe(false);
  });

  it('stopListening returns empty string when not started', async () => {
    const stt = new WebSpeechSTT();
    const result = await stt.stopListening();
    expect(result).toBe('');
  });
});

describe('WebSpeechTTS', () => {
  it('has correct name', () => {
    const tts = new WebSpeechTTS();
    expect(tts.name).toBe('WebSpeechTTS');
  });

  it('reports unavailable when speechSynthesis missing', async () => {
    // jsdom has window but no speechSynthesis
    const tts = new WebSpeechTTS();
    const available = await tts.available();
    expect(available).toBe(false);
  });

  it('stop does not throw when speechSynthesis missing', () => {
    const tts = new WebSpeechTTS();
    expect(() => tts.stop()).not.toThrow();
  });

  it('speak resolves immediately for empty text', async () => {
    const tts = new WebSpeechTTS();
    await expect(tts.speak('')).resolves.toBeUndefined();
  });
});

describe('GroqWhisperSTT', () => {
  it('has correct name', () => {
    const stt = new GroqWhisperSTT('test-key');
    expect(stt.name).toBe('GroqWhisperSTT');
  });

  it('reports unavailable without API key', async () => {
    const stt = new GroqWhisperSTT('');
    expect(await stt.available()).toBe(false);
  });

  it('reports unavailable without navigator.mediaDevices', async () => {
    const stt = new GroqWhisperSTT('test-key');
    // jsdom doesn't have mediaDevices.getUserMedia
    expect(await stt.available()).toBe(false);
  });
});

describe('GroqLLM', () => {
  it('has correct name', () => {
    const llm = new GroqLLM('test-key');
    expect(llm.name).toBe('GroqLLM');
  });

  it('reports unavailable without API key', async () => {
    const llm = new GroqLLM('');
    expect(await llm.available()).toBe(false);
  });

  it('reports available with API key', async () => {
    const llm = new GroqLLM('test-key');
    expect(await llm.available()).toBe(true);
  });
});

describe('OllamaLLM', () => {
  it('has correct name', () => {
    const llm = new OllamaLLM();
    expect(llm.name).toBe('OllamaLLM');
  });

  it('reports unavailable when server not running', async () => {
    // Use an invalid port so fetch fails fast
    const llm = new OllamaLLM('test', 'http://localhost:1');
    expect(await llm.available()).toBe(false);
  });
});

describe('AnthropicLLM', () => {
  it('has correct name', () => {
    const llm = new AnthropicLLM('test-key');
    expect(llm.name).toBe('AnthropicLLM');
  });

  it('reports unavailable without API key', async () => {
    const llm = new AnthropicLLM('');
    expect(await llm.available()).toBe(false);
  });

  it('reports available with API key', async () => {
    const llm = new AnthropicLLM('test-key');
    expect(await llm.available()).toBe(true);
  });
});

describe('ElevenLabsTTS', () => {
  it('has correct name', () => {
    const tts = new ElevenLabsTTS('test-key');
    expect(tts.name).toBe('ElevenLabsTTS');
  });

  it('reports unavailable without API key', async () => {
    const tts = new ElevenLabsTTS('');
    expect(await tts.available()).toBe(false);
  });

  it('stop does not throw when no audio playing', () => {
    const tts = new ElevenLabsTTS('test-key');
    expect(() => tts.stop()).not.toThrow();
  });
});

describe('ExpoSpeechSTT', () => {
  it('has correct name', () => {
    const stt = new ExpoSpeechSTT();
    expect(stt.name).toBe('ExpoSpeech');
  });

  it('reports unavailable when expo-speech-recognition not installed', async () => {
    const stt = new ExpoSpeechSTT();
    expect(await stt.available()).toBe(false);
  });

  it('stopListening returns empty when module not loaded', async () => {
    const stt = new ExpoSpeechSTT();
    const result = await stt.stopListening();
    expect(result).toBe('');
  });
});

describe('ExpoSpeechTTS', () => {
  it('has correct name', () => {
    const tts = new ExpoSpeechTTS();
    expect(tts.name).toBe('ExpoSpeech');
  });

  it('reports unavailable when expo-speech not installed', async () => {
    const tts = new ExpoSpeechTTS();
    expect(await tts.available()).toBe(false);
  });

  it('stop does not throw when module not loaded', () => {
    const tts = new ExpoSpeechTTS();
    expect(() => tts.stop()).not.toThrow();
  });
});
