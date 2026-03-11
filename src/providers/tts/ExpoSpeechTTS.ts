import type { TTSProvider } from '../../types.js';

/**
 * React Native TTS via expo-speech (optional peer dep).
 * Falls back gracefully if not installed.
 */
export class ExpoSpeechTTS implements TTSProvider {
  readonly name = 'ExpoSpeech';
  private module: Record<string, any> | null = null;

  async available(): Promise<boolean> {
    try {
      this.module = await import(/* webpackIgnore: true */ 'expo-speech').catch(() => null);
      return !!this.module?.default?.speak;
    } catch {
      return false;
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.module) throw new Error('expo-speech not available');

    return new Promise((resolve, reject) => {
      this.module!.default.speak(text, {
        language: 'en-US',
        onDone: () => resolve(),
        onError: (err: Error) => reject(err),
      });
    });
  }

  stop(): void {
    this.module?.default?.stop?.();
  }
}
