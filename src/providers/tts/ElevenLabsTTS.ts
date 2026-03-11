import type { TTSProvider } from '../../types.js';

const SAMPLE_RATE = 22050;

/** ElevenLabs TTS with true streaming via AudioContext — PREMIUM, requires ELEVENLABS_API_KEY */
export class ElevenLabsTTS implements TTSProvider {
  readonly name = 'ElevenLabsTTS';
  private apiKey: string;
  private voiceId: string;
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private aborted = false;

  constructor(apiKey?: string, voiceId?: string) {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? (process.env?.ELEVENLABS_API_KEY ?? '') : '');
    this.voiceId = voiceId ?? (typeof process !== 'undefined' ? (process.env?.ELEVENLABS_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB') : 'pNInz6obpgDQGcFmaJgB');
  }

  async available(): Promise<boolean> {
    return !!this.apiKey && typeof window !== 'undefined';
  }

  async speak(text: string): Promise<void> {
    if (!text) return;
    this.aborted = false;

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
          output_format: 'pcm_22050',
        }),
      },
    );

    if (!resp.ok) throw new Error(`ElevenLabs ${resp.status}: ${await resp.text()}`);

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    // Stream PCM chunks via AudioContext
    if (!this.ctx || this.ctx.state === 'closed') {
      const AC = (globalThis as unknown as Record<string, unknown>).AudioContext ??
        (globalThis as unknown as Record<string, unknown>).webkitAudioContext;
      if (!AC) throw new Error('AudioContext not available');
      this.ctx = new (AC as new () => AudioContext)();
    }

    let scheduledTime = this.ctx.currentTime;

    return new Promise<void>(async (resolve, reject) => {
      try {
        while (true) {
          if (this.aborted) { reader.cancel(); resolve(); return; }
          const { done, value } = await reader.read();
          if (done) break;

          // Convert Int16 PCM to Float32
          const int16 = new Int16Array(value.buffer, value.byteOffset, value.byteLength >> 1);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768;
          }

          const buffer = this.ctx!.createBuffer(1, float32.length, SAMPLE_RATE);
          buffer.getChannelData(0).set(float32);

          const source = this.ctx!.createBufferSource();
          source.buffer = buffer;
          source.connect(this.ctx!.destination);

          if (scheduledTime < this.ctx!.currentTime) {
            scheduledTime = this.ctx!.currentTime;
          }
          source.start(scheduledTime);
          scheduledTime += buffer.duration;

          this.currentSource = source;
        }

        // Wait for last chunk to finish playing
        const remaining = scheduledTime - this.ctx!.currentTime;
        if (remaining > 0 && !this.aborted) {
          await new Promise<void>(r => setTimeout(r, remaining * 1000));
        }
        resolve();
      } catch (err) {
        if (this.aborted) resolve();
        else reject(err);
      }
    });
  }

  stop(): void {
    this.aborted = true;
    try { this.currentSource?.stop(); } catch { /* already stopped */ }
    this.currentSource = null;
  }
}
