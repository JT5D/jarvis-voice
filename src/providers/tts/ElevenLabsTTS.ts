import type { TTSProvider } from '../../types.js';

/** ElevenLabs TTS via REST — PREMIUM, requires ELEVENLABS_API_KEY */
export class ElevenLabsTTS implements TTSProvider {
  readonly name = 'ElevenLabsTTS';
  private apiKey: string;
  private voiceId: string;
  private audio: HTMLAudioElement | null = null;

  constructor(apiKey?: string, voiceId = 'pNInz6obpgDQGcFmaJgB') {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? (process.env?.ELEVENLABS_API_KEY ?? '') : '');
    this.voiceId = voiceId;
  }

  async available(): Promise<boolean> {
    return !!this.apiKey && typeof window !== 'undefined';
  }

  async speak(text: string): Promise<void> {
    if (!text) return;

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${await resp.text()}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);

    return new Promise<void>((resolve, reject) => {
      this.audio = new Audio(url);
      this.audio.onended = () => { URL.revokeObjectURL(url); this.audio = null; resolve(); };
      this.audio.onerror = () => { URL.revokeObjectURL(url); this.audio = null; reject(new Error('Audio playback failed')); };
      this.audio.play().catch(reject);
    });
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}
