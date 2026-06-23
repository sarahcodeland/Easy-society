import Voice from '@react-native-community/voice';

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
};

// Voice search / voice-to-text composing: "speak instead of type". Used by
// the search bar and post/message composers' mic button.
export function startListening(languageCode: string, onResult: (text: string) => void, onError?: (e: unknown) => void): void {
  Voice.onSpeechResults = (e) => {
    const text = e.value?.[0];
    if (text) onResult(text);
  };
  Voice.onSpeechError = (e) => onError?.(e.error);
  Voice.start(LANGUAGE_TO_LOCALE[languageCode] ?? 'en-IN').catch(onError);
}

export function stopListening(): void {
  Voice.stop().catch(() => undefined);
}

export function destroyVoiceListener(): void {
  Voice.destroy().then(Voice.removeAllListeners).catch(() => undefined);
}
