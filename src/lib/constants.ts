export const ELEVENLABS = {
  apiBase: 'https://api.elevenlabs.io',
  voicesUrl: 'https://api.elevenlabs.io/v2/voices?voice_type=personal',
  historyUrl: 'https://api.elevenlabs.io/v1/history?page_size=25',
  generateUrl: 'https://api.elevenlabs.io/v1/text-to-speech',
} as const;

export const VIEW = {
  HOME: 'HOME',
  COMPOSE: 'COMPOSE',
  HISTORY: 'HISTORY',
} as const;

