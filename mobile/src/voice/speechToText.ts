// Voice search / voice-to-text composing: "speak instead of type". Used by
// the search bar and post/message composers' mic button.
//
// Stubbed out: on-device speech recognition has no Expo Go-compatible
// implementation (it requires a custom dev client / native build), so while
// developing in Expo Go this immediately reports "unavailable" instead of
// listening. Swap this back to a real STT backend once running a dev client.
export function startListening(_languageCode: string, _onResult: (text: string) => void, onError?: (e: unknown) => void): void {
  onError?.(new Error('Voice input is unavailable in Expo Go'));
}

export function stopListening(): void {
  // no-op
}

export function destroyVoiceListener(): void {
  // no-op
}
