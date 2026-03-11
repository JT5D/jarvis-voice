import type { STTProvider } from '../../types.js';

/**
 * React Native STT via expo-speech-recognition (optional peer dep).
 * Falls back gracefully if not installed.
 */
export class ExpoSpeechSTT implements STTProvider {
  readonly name = 'ExpoSpeech';
  private module: Record<string, any> | null = null;

  async available(): Promise<boolean> {
    try {
      // Dynamic import — won't fail at build time if not installed
      this.module = await import(/* webpackIgnore: true */ 'expo-speech-recognition').catch(() => null);
      return !!this.module?.ExpoSpeechRecognitionModule;
    } catch {
      return false;
    }
  }

  async startListening(onResult: (text: string, isFinal: boolean) => void): Promise<void> {
    if (!this.module) throw new Error('expo-speech-recognition not available');

    const { ExpoSpeechRecognitionModule } = this.module;
    ExpoSpeechRecognitionModule.addResultListener((event: { results: Array<{ transcript: string }>; isFinal: boolean }) => {
      const text = event.results[0]?.transcript ?? '';
      onResult(text, event.isFinal);
    });

    await ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
  }

  async stopListening(): Promise<string> {
    if (!this.module) return '';
    const { ExpoSpeechRecognitionModule } = this.module;
    await ExpoSpeechRecognitionModule.stop();
    return '';
  }
}
