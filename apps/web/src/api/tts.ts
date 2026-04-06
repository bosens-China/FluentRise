const DEFAULT_VOICE = 'en-US-ChristopherNeural';

export function getTextAudioUrl(text: string, speed = 1, voice = DEFAULT_VOICE): string {
  const params = new URLSearchParams({
    word: text,
    voice,
    speed: String(speed),
  });
  return `/api/v1/tts/audio?${params.toString()}`;
}

export function getWordAudioUrl(word: string, voice = DEFAULT_VOICE): string {
  return `/api/v1/tts/word/${encodeURIComponent(word)}?voice=${encodeURIComponent(voice)}`;
}

export function getConfiguredTextAudioUrl(
  text: string,
  defaultVoice?: string,
  speed = 1,
  voice?: string,
): string {
  return getTextAudioUrl(text, speed, voice ?? defaultVoice ?? DEFAULT_VOICE);
}

export function getConfiguredWordAudioUrl(
  word: string,
  defaultVoice?: string,
  voice?: string,
): string {
  return getWordAudioUrl(word, voice ?? defaultVoice ?? DEFAULT_VOICE);
}
