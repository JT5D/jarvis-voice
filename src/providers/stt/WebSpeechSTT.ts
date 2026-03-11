import type { STTProvider } from '../../types.js';

/** Browser SpeechRecognition API — FREE, zero dependencies */
export class WebSpeechSTT implements STTProvider {
  readonly name = 'WebSpeechSTT';
  private recognition: SpeechRecognition | null = null;
  private finalTranscript = '';

  async available(): Promise<boolean> {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  async startListening(onResult: (text: string, isFinal: boolean) => void): Promise<void> {
    const SpeechRecognitionCtor = (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) throw new Error('SpeechRecognition not available');

    this.finalTranscript = '';
    const recognition = new (SpeechRecognitionCtor as new () => SpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript;
          onResult(this.finalTranscript, true);
        } else {
          interim += transcript;
          onResult(this.finalTranscript + interim, false);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        console.warn('WebSpeechSTT error:', event.error);
      }
    };

    this.recognition = recognition;
    recognition.start();
  }

  async stopListening(): Promise<string> {
    this.recognition?.stop();
    const result = this.finalTranscript;
    this.recognition = null;
    this.finalTranscript = '';
    return result;
  }
}
