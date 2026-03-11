# @jarvis/voice

Standalone live voice chat agent — zero config, free-first, works in browser + React Native.

```
npx jarvis-voice
```

Opens a browser. Click the mic. Talk to Jarvis.

## Install

```bash
npm install @jarvis/voice
```

## Quick Start (Browser)

```tsx
import { JarvisProvider, JarvisVoiceButton } from '@jarvis/voice/react';

function App() {
  return (
    <JarvisProvider>
      <JarvisVoiceButton />
    </JarvisProvider>
  );
}
```

Zero API keys required. Uses Web Speech API (STT/TTS) + Ollama (local LLM) by default.

## Quick Start (Headless)

```ts
import { createJarvis } from '@jarvis/voice';

const engine = createJarvis();
const response = await engine.send('What time is it?');
```

## Provider Chain

Free-first, auto-upgrades when API keys are available:

| Layer | Free (default) | Premium (auto-detected) |
|-------|---------------|----------------------|
| STT | Web Speech API / Expo Speech | Groq Whisper |
| LLM | Ollama (local) | Groq, Claude |
| TTS | Web Speech API / Expo Speech | ElevenLabs |

Set env vars to upgrade:

```bash
GROQ_API_KEY=...        # Groq Whisper STT + Llama LLM (free tier)
ANTHROPIC_API_KEY=...   # Claude LLM
ELEVENLABS_API_KEY=...  # ElevenLabs TTS
```

## React Hook

```tsx
import { useJarvis } from '@jarvis/voice/react';

function VoiceUI() {
  const { state, startListening, stopListening, send } = useJarvis();

  return (
    <div>
      <p>Status: {state.status}</p>
      <p>Transcript: {state.transcript}</p>
      <p>Response: {state.response}</p>
      <button onClick={state.status === 'listening' ? stopListening : startListening}>
        {state.status === 'listening' ? 'Stop' : 'Talk'}
      </button>
    </div>
  );
}
```

## Custom Providers

```ts
import { JarvisEngine, GroqLLM, ElevenLabsTTS, WebSpeechSTT } from '@jarvis/voice';

const engine = new JarvisEngine({
  stt: [new WebSpeechSTT()],
  tts: [new ElevenLabsTTS('your-api-key')],
  llm: [new GroqLLM('your-api-key')],
  systemPrompt: 'You are a helpful cooking assistant.',
});
```

## Custom Tools

```ts
const engine = createJarvis({
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: { location: { type: 'string', description: 'City name' } },
    execute: async ({ location }) => {
      const resp = await fetch(`https://wttr.in/${location}?format=3`);
      return resp.text();
    },
  }],
});
```

## Architecture

```
React UI        JarvisProvider → useJarvis → VoiceButton
Engine          JarvisEngine → ProviderChain → ToolRegistry
Providers       STT (3) / TTS (3) / LLM (3) adapters
```

~1,400 LOC. Zero runtime dependencies. 82 tests.

## React Native

Works with Expo. Install optional peer deps:

```bash
npx expo install expo-speech expo-speech-recognition
```

The provider chain auto-detects Expo modules via dynamic import.

## CLI Demo

```bash
npx jarvis-voice                    # Default port 3456
PORT=8080 npx jarvis-voice          # Custom port
GROQ_API_KEY=... npx jarvis-voice   # Use Groq cloud LLM
```

## License

MIT
