import type { STTProvider } from '../../types.js';

/** Groq Whisper STT — FREE tier (30 RPM). Requires GROQ_API_KEY env var. */
export class GroqWhisperSTT implements STTProvider {
  readonly name = 'GroqWhisperSTT';
  private apiKey: string;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private onResultCb: ((text: string, isFinal: boolean) => void) | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? (process.env?.GROQ_API_KEY ?? '') : '');
  }

  async available(): Promise<boolean> {
    return !!this.apiKey && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  async startListening(onResult: (text: string, isFinal: boolean) => void): Promise<void> {
    this.onResultCb = onResult;
    this.chunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.start(1000);
  }

  async stopListening(): Promise<string> {
    return new Promise<string>((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve('');
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.chunks = [];
        this.mediaRecorder?.stream.getTracks().forEach(t => t.stop());
        this.mediaRecorder = null;

        if (blob.size === 0) { resolve(''); return; }

        try {
          const text = await this.transcribe(blob);
          this.onResultCb?.(text, true);
          resolve(text);
        } catch (err) {
          console.warn('GroqWhisperSTT transcription failed:', err);
          resolve('');
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private async transcribe(audio: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', audio, 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'en');

    const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!resp.ok) throw new Error(`Groq Whisper ${resp.status}: ${await resp.text()}`);
    const data = await resp.json() as { text: string };
    return data.text;
  }
}
