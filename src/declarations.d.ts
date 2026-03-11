// Optional peer dependencies — declared as modules so TS doesn't error on dynamic imports.
// These are only used at runtime when installed in a React Native project.
declare module 'expo-speech-recognition' {
  export const ExpoSpeechRecognitionModule: {
    addResultListener(cb: (event: { results: Array<{ transcript: string }>; isFinal: boolean }) => void): void;
    start(options: { lang: string; interimResults: boolean }): Promise<void>;
    stop(): Promise<void>;
  };
}

declare module 'expo-speech' {
  const Speech: {
    speak(text: string, options?: { language?: string; onDone?: () => void; onError?: (err: Error) => void }): void;
    stop(): void;
  };
  export default Speech;
}
