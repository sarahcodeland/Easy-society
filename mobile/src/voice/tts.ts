import * as Speech from 'expo-speech';

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
  Speech.speak(text, { language: locale });
}

export function stopSpeaking(): void {
  Speech.stop();
}
