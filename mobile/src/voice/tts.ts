import Tts from 'react-native-tts';

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
};

// Text-to-speech for posts/announcements — read aloud in the user's chosen
// language so literacy isn't a barrier to using the app.
export async function speak(text: string, languageCode: string): Promise<void> {
  const locale = LANGUAGE_TO_LOCALE[languageCode] ?? 'en-IN';
  try {
    await Tts.setDefaultLanguage(locale);
  } catch {
    // Falls back to device default voice if the requested locale's voice
    // pack isn't installed — better to speak in the wrong accent than not
    // speak at all.
  }
  Tts.speak(text);
}

export function stopSpeaking(): void {
  Tts.stop();
}
