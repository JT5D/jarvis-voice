import type { TTSProvider } from '../../types.js';

/** Browser SpeechSynthesis API — FREE, zero dependencies */
export class WebSpeechTTS implements TTSProvider {
  readonly name = 'WebSpeechTTS';
  private utterance: SpeechSynthesisUtterance | null = null;

  async available(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async speak(text: string): Promise<void> {
    if (!text) return;
    return new Promise<void>((resolve, reject) => {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      this.utterance = utterance;

      utterance.onend = () => { this.utterance = null; resolve(); };
      utterance.onerror = (e) => {
        this.utterance = null;
        if (e.error === 'canceled') resolve();
        else reject(new Error(`TTS error: ${e.error}`));
      };

      synth.speak(utterance);
    });
  }

  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.utterance = null;
  }
}
