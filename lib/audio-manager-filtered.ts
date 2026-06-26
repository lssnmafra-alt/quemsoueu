import { AudioManager as BaseAudioManager, type CurrentMusicInfo } from './audio-manager';

const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function readArray(key: string) {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readProfileArray(key: 'music_genres' | 'music_blocked_tracks') {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const profile = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
    return Array.isArray(profile?.[key]) ? profile[key].map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function currentMusicIsAllowed(info: CurrentMusicInfo | null, genres: string[], blocked: string[]) {
  if (!info?.url) return true;
  const blockedSet = new Set(blocked.map(normalize));
  if (info.key && blockedSet.has(normalize(info.key))) return false;
  const selectedGenres = genres.map(normalize).filter(Boolean);
  if (selectedGenres.length && info.genre && !selectedGenres.includes(normalize(info.genre))) return false;
  return true;
}

function preferenceKey(genres: string[], blocked: string[]) {
  return `${genres.map(normalize).sort().join('|')}::${blocked.map(normalize).sort().join('|')}`;
}

class FilterAwareAudioManager extends BaseAudioManager {
  private lastPreferenceKey = '';

  async playMusic(track: any, options: any = {}) {
    const genres = readArray(MUSIC_GENRES_KEY);
    const blocked = [...readArray(MUSIC_BLOCKED_TRACKS_KEY), ...readProfileArray('music_blocked_tracks')];
    const effectiveGenres = genres.length ? genres : readProfileArray('music_genres');
    const nextPreferenceKey = preferenceKey(effectiveGenres, blocked);
    const preferencesChanged = Boolean(this.lastPreferenceKey && this.lastPreferenceKey !== nextPreferenceKey);
    const currentAllowed = currentMusicIsAllowed(this.getCurrentMusicInfo(), effectiveGenres, [...blocked, ...(options.excludeKeys || [])]);

    this.lastPreferenceKey = nextPreferenceKey;

    if (preferencesChanged || !currentAllowed) {
      this.stopMusic(false);
      return super.playMusic(track, { ...options, force: true, pushHistory: false });
    }

    return super.playMusic(track, options);
  }
}

export { FilterAwareAudioManager as AudioManager };
export type { CurrentMusicInfo } from './audio-manager';
export const audioManager = new FilterAwareAudioManager();
