type MusicTrack = 'login-theme' | 'lobby-theme' | 'game-theme' | 'victory-theme' | string;
type SfxEffect =
  | 'click'
  | 'hover'
  | 'vote'
  | 'hit'
  | 'hurt'
  | 'eliminated'
  | 'message'
  | 'start-game'
  | 'transition'
  | 'select'
  | 'eliminate'
  | 'win'
  | 'turn'
  | 'miss'
  | string;

type AudioPrefs = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
};

export type CurrentMusicInfo = {
  url: string;
  key?: string;
  genre?: string;
  title?: string;
  mood?: string;
};

type AudioSession = {
  track: MusicTrack | null;
  info: CurrentMusicInfo | null;
  currentTime: number;
  paused: boolean;
  rate: number;
  history: CurrentMusicInfo[];
};

const DEFAULT_PREFS: AudioPrefs = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.2,
  sfxVolume: 0.72,
  muted: false,
};

const STORAGE_KEY = 'mata-mata-audio-prefs';
const PROFILE_STORAGE_KEY = 'quemSouEu:profile';
const MUSIC_GENRES_KEY = 'quemSouEu:musicGenres';
const MUSIC_BLOCKED_TRACKS_KEY = 'quemSouEu:musicBlockedTracks';
const MUSIC_SESSION_KEY = 'quemSouEu:musicSession';
const NOW_PLAYING_EVENT = 'quemSouEu:music-track';
const DEFAULT_MUSIC_GENRES = ['Disco', 'Kpop', 'Rock'];

type PlayMusicOptions = {
  force?: boolean;
  excludeKeys?: string[];
  pushHistory?: boolean;
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private activeMusicTrack: MusicTrack | null = null;
  private activeMusicUrl = '';
  private currentMusicInfo: CurrentMusicInfo | null = null;
  private hasUserGesture = false;
  private musicRate = 1;
  private musicRequestId = 0;
  private musicPaused = false;
  private musicHistory: CurrentMusicInfo[] = [];
  private restoredMusicTime = 0;
  private lastSessionSaveAt = 0;
  public prefs: AudioPrefs = DEFAULT_PREFS;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefs = this.loadPrefs();
      this.restoreSession();
      this.installGestureUnlock();
      this.installButtonSfx();
      this.installSessionPersistence();
    }
  }

  get enabled() {
    return !this.prefs.muted && (this.prefs.musicEnabled || this.prefs.sfxEnabled);
  }

  getCurrentMusicInfo() {
    return this.currentMusicInfo;
  }

  isMusicPaused() {
    return this.musicPaused;
  }

  initFromUserGesture() {
    this.hasUserGesture = true;
    this.ensureContext();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();

    if (this.currentMusicInfo?.url && this.prefs.musicEnabled && !this.prefs.muted && !this.music && !this.musicPaused) {
      void this.startResolvedMusic(this.currentMusicInfo, 'restored-session', this.restoredMusicTime);
      return;
    }

    if (this.activeMusicTrack && this.prefs.musicEnabled && !this.music && !this.musicPaused) {
      void this.playMusic(this.activeMusicTrack);
    }
  }

  init() {
    this.initFromUserGesture();
  }

  toggle(enabled: boolean) {
    this.initFromUserGesture();
    this.prefs.musicEnabled = enabled;
    this.prefs.sfxEnabled = enabled;
    this.prefs.muted = false;
    this.savePrefs();

    if (enabled) this.resumeMusic();
    else this.stopMusic(false);
  }

  async playMusic(track: MusicTrack, options: PlayMusicOptions = {}) {
    if (typeof window === 'undefined') return;

    const previousTrack = this.activeMusicTrack;
    const selectedGenres = this.getMusicGenres();
    const blockedTracks = this.getMusicBlockedTracks();
    const nextGenres = selectedGenres.length > 0 ? selectedGenres : DEFAULT_MUSIC_GENRES;
    const excludedKeys = [...blockedTracks, ...(options.excludeKeys || [])].filter(Boolean);
    const nextGenreKey = `${nextGenres.join('|')}::blocked:${excludedKeys.join('|')}`;
    this.activeMusicTrack = track;

    if (this.prefs.muted || !this.prefs.musicEnabled) {
      this.saveSession();
      return;
    }

    if (!options.force) {
      if (this.music) {
        this.saveSession();
        return;
      }

      if (this.currentMusicInfo?.url) {
        if (!this.musicPaused) await this.startResolvedMusic(this.currentMusicInfo, 'persisted-session', this.restoredMusicTime);
        return;
      }
    }

    if (!options.force && this.music && previousTrack === track && this.music.dataset.genreKey === nextGenreKey) return;

    const requestId = ++this.musicRequestId;
    const previousInfo = this.currentMusicInfo;
    const trackInfo = await this.resolveLicensedTrack(track, nextGenres, excludedKeys);
    if (requestId !== this.musicRequestId || !trackInfo?.url || this.prefs.muted || !this.prefs.musicEnabled) return;

    if (options.pushHistory !== false && previousInfo?.url && previousInfo.url !== trackInfo.url) {
      this.pushMusicHistory(previousInfo);
    }

    this.stopHtmlMusicOnly();
    await this.startResolvedMusic(trackInfo, nextGenreKey, 0);
  }

  stopMusic(clearTrack = true) {
    this.musicRequestId += 1;
    this.stopHtmlMusicOnly();
    this.musicPaused = false;
    if (clearTrack) {
      this.activeMusicTrack = null;
      this.currentMusicInfo = null;
      this.restoredMusicTime = 0;
    }
    this.saveSession();
  }

  pauseMusic() {
    this.initFromUserGesture();
    if (!this.music) return;
    this.music.pause();
    this.musicPaused = true;
    this.saveSession();
  }

  resumeMusic() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.prefs.musicEnabled = true;
    this.savePrefs();

    if (this.music) {
      void this.music.play().then(() => {
        this.musicPaused = false;
        this.saveSession();
      }).catch(() => {});
      return;
    }

    if (this.currentMusicInfo?.url) {
      this.musicPaused = false;
      void this.startResolvedMusic(this.currentMusicInfo, 'resume-session', this.restoredMusicTime);
      return;
    }

    void this.playMusic(this.activeMusicTrack || 'lobby-theme', { force: true, pushHistory: false });
  }

  toggleMusicPause() {
    if (this.musicPaused) this.resumeMusic();
    else this.pauseMusic();
  }

  async nextMusic() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.prefs.musicEnabled = true;
    this.savePrefs();

    const current = this.currentMusicInfo;
    const excludeKeys = current?.key ? [current.key] : [];
    await this.playMusic(this.activeMusicTrack || current?.mood || 'lobby-theme', { force: true, excludeKeys, pushHistory: true });
  }

  async previousMusic() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.prefs.musicEnabled = true;
    this.savePrefs();

    const previous = this.musicHistory.pop();
    if (previous?.url) {
      this.musicRequestId += 1;
      this.stopHtmlMusicOnly();
      await this.startResolvedMusic(previous, 'manual-previous', 0);
      return;
    }

    if (this.music) {
      this.music.currentTime = 0;
      await this.music.play().catch(() => {});
      this.musicPaused = false;
      this.saveSession();
      return;
    }

    await this.playMusic(this.activeMusicTrack || this.currentMusicInfo?.mood || 'lobby-theme', { force: true, pushHistory: false });
  }

  playSfx(effect: SfxEffect) {
    if (typeof window === 'undefined' || this.prefs.muted || !this.prefs.sfxEnabled) return;

    this.initFromUserGesture();

    const normalized = this.normalizeSfx(effect);
    const audio = new Audio(`/audio/sfx/${normalized}.mp3`);
    audio.volume = this.prefs.sfxVolume;
    audio.addEventListener('error', () => this.playToneFallback(normalized), { once: true });
    void audio.play().catch(() => this.playToneFallback(normalized));
  }

  playSFX(effect: SfxEffect) {
    this.playSfx(effect);
  }

  setMusicRate(rate: number) {
    const nextRate = Math.max(0.75, Math.min(1.35, Number.isFinite(rate) ? rate : 1));
    if (Math.abs(this.musicRate - nextRate) < 0.01) return;

    this.musicRate = nextRate;
    if (this.music) this.music.playbackRate = nextRate;
    this.saveSession();
  }

  setMusicVolume(value: number) {
    this.prefs.musicVolume = this.clampVolume(value);
    if (this.music) this.music.volume = this.prefs.musicVolume;
    this.savePrefs();
  }

  setSfxVolume(value: number) {
    this.prefs.sfxVolume = this.clampVolume(value);
    this.savePrefs();
  }

  setMusicEnabled(enabled: boolean) {
    this.initFromUserGesture();
    this.prefs.musicEnabled = enabled;
    this.savePrefs();
    if (enabled) this.resumeMusic();
    else this.stopMusic(false);
  }

  setSfxEnabled(enabled: boolean) {
    this.initFromUserGesture();
    this.prefs.sfxEnabled = enabled;
    this.savePrefs();
  }

  muteAll() {
    this.prefs.muted = true;
    if (this.music) {
      this.music.pause();
      this.musicPaused = true;
    }
    this.savePrefs();
    this.saveSession();
  }

  unmuteAll() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.savePrefs();
    this.resumeMusic();
  }

  private async resolveLicensedTrack(track: MusicTrack, genres: string[], blockedTracks: string[]): Promise<CurrentMusicInfo | null> {
    const params = new URLSearchParams({ mood: String(track) });
    genres.forEach((genre) => params.append('genre', genre));
    blockedTracks.forEach((key) => params.append('exclude', key));

    try {
      const response = await fetch(`/api/audio/track?${params.toString()}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== 'string' || !result.url) return null;

      return {
        url: result.url,
        key: typeof result.key === 'string' ? result.key : undefined,
        genre: typeof result.genre === 'string' ? result.genre : undefined,
        title: typeof result.title === 'string' ? result.title : undefined,
        mood: typeof result.mood === 'string' ? result.mood : String(track),
      };
    } catch {
      return null;
    }
  }

  private async startResolvedMusic(trackInfo: CurrentMusicInfo, genreKey: string, startAt = 0) {
    this.emitMusicInfo(trackInfo);
    this.restoredMusicTime = Number.isFinite(startAt) && startAt > 0 ? startAt : 0;
    this.saveSession();

    if (!this.hasUserGesture) return;

    const audio = new Audio(trackInfo.url);
    audio.loop = true;
    audio.volume = this.prefs.musicVolume;
    audio.playbackRate = this.musicRate;
    audio.dataset.genreKey = genreKey;
    audio.addEventListener('error', () => this.stopHtmlMusicOnly(), { once: true });
    audio.addEventListener('timeupdate', () => this.saveSessionThrottled());
    audio.addEventListener('pause', () => {
      this.musicPaused = true;
      this.saveSession();
    });
    audio.addEventListener('play', () => {
      this.musicPaused = false;
      this.saveSession();
    });

    if (this.restoredMusicTime > 0) {
      const restoreTime = this.restoredMusicTime;
      audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(audio.duration) && audio.duration > restoreTime) audio.currentTime = restoreTime;
      }, { once: true });
    }

    this.music = audio;
    this.activeMusicUrl = trackInfo.url;

    try {
      await audio.play();
      this.musicPaused = false;
      this.saveSession();
    } catch {
      this.stopHtmlMusicOnly();
    }
  }

  private pushMusicHistory(info: CurrentMusicInfo) {
    if (!info?.url) return;
    const last = this.musicHistory[this.musicHistory.length - 1];
    if (last?.url === info.url) return;
    this.musicHistory = [...this.musicHistory.slice(-8), info];
    this.saveSession();
  }

  private getMusicGenres() {
    if (typeof window === 'undefined') return [];

    try {
      const direct = JSON.parse(window.localStorage.getItem(MUSIC_GENRES_KEY) || '[]');
      if (Array.isArray(direct) && direct.length) return direct.map(String).filter(Boolean);
    } catch {}

    try {
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
      return Array.isArray(profile.music_genres) ? profile.music_genres.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private getMusicBlockedTracks() {
    if (typeof window === 'undefined') return [];

    try {
      const direct = JSON.parse(window.localStorage.getItem(MUSIC_BLOCKED_TRACKS_KEY) || '[]');
      if (Array.isArray(direct) && direct.length) return direct.map(String).filter(Boolean);
    } catch {}

    try {
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_STORAGE_KEY) || '{}');
      return Array.isArray(profile.music_blocked_tracks) ? profile.music_blocked_tracks.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private emitMusicInfo(info: CurrentMusicInfo) {
    this.currentMusicInfo = info;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(NOW_PLAYING_EVENT, { detail: info }));
  }

  private normalizeSfx(effect: SfxEffect) {
    const map: Record<string, string> = {
      select: 'click',
      turn: 'transition',
      win: 'victory',
      victory: 'victory',
      defeat: 'eliminated',
      eliminate: 'eliminated',
      player_eliminated: 'eliminated',
      life_lost: 'hit',
      hurt: 'hit',
      card_reveal: 'transition',
      reveal: 'transition',
      suspense: 'transition',
      sudden_death: 'transition',
    };
    return map[String(effect).toLowerCase()] || String(effect).toLowerCase();
  }

  private installGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initFromUserGesture();
      if (this.activeMusicTrack && !this.currentMusicInfo?.url && !this.musicPaused) void this.playMusic(this.activeMusicTrack);
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  private installButtonSfx() {
    if (typeof document === 'undefined') return;
    document.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target as HTMLElement | null;
        if (!target?.closest) return;
        const clickable = target.closest('button, [role="button"], a, label, input[type="button"], input[type="submit"]');
        if (clickable) this.playSfx('click');
      },
      { passive: true },
    );
  }

  private installSessionPersistence() {
    if (typeof window === 'undefined') return;
    window.addEventListener('pagehide', () => this.saveSession());
    window.addEventListener('beforeunload', () => this.saveSession());
    document.addEventListener('visibilitychange', () => this.saveSession());
  }

  private ensureContext() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this.ctx = null;
    }
  }

  private stopHtmlMusicOnly() {
    if (this.music) {
      this.restoredMusicTime = this.getMusicCurrentTime();
      this.music.pause();
      this.music.src = '';
      this.music = null;
      this.activeMusicUrl = '';
    }
  }

  private getMusicCurrentTime() {
    if (!this.music) return this.restoredMusicTime;
    const time = this.music.currentTime;
    return Number.isFinite(time) && time >= 0 ? time : 0;
  }

  private saveSessionThrottled() {
    const now = Date.now();
    if (now - this.lastSessionSaveAt < 1500) return;
    this.lastSessionSaveAt = now;
    this.saveSession();
  }

  private saveSession() {
    if (typeof window === 'undefined') return;

    const info = this.currentMusicInfo;
    if (!info?.url) {
      window.localStorage.removeItem(MUSIC_SESSION_KEY);
      return;
    }

    const session: AudioSession = {
      track: this.activeMusicTrack || info.mood || 'lobby-theme',
      info,
      currentTime: this.getMusicCurrentTime(),
      paused: this.musicPaused,
      rate: this.musicRate,
      history: this.musicHistory.slice(-8),
    };

    try {
      window.localStorage.setItem(MUSIC_SESSION_KEY, JSON.stringify(session));
    } catch {}
  }

  private restoreSession() {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(MUSIC_SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw) as Partial<AudioSession>;
      if (!session?.info?.url) return;

      this.currentMusicInfo = session.info;
      this.activeMusicTrack = session.track || session.info.mood || 'lobby-theme';
      this.restoredMusicTime = Number.isFinite(session.currentTime) ? Math.max(0, Number(session.currentTime)) : 0;
      this.musicPaused = Boolean(session.paused);
      this.musicRate = Number.isFinite(session.rate) ? Math.max(0.75, Math.min(1.35, Number(session.rate))) : 1;
      this.musicHistory = Array.isArray(session.history) ? session.history.filter((item) => item?.url).slice(-8) : [];
    } catch {
      window.localStorage.removeItem(MUSIC_SESSION_KEY);
    }
  }

  private playToneFallback(effect: SfxEffect) {
    this.ensureContext();
    if (!this.ctx || this.prefs.muted || !this.prefs.sfxEnabled) return;

    const t = this.ctx.currentTime;
    const output = this.ctx.createGain();
    output.gain.value = this.prefs.sfxVolume;
    output.connect(this.ctx.destination);
    const lower = String(effect).toLowerCase();

    if (lower.includes('elimin')) {
      this.note(196, t, 0.18, 'sawtooth', 0.28, output);
      this.note(92, t + 0.08, 0.55, 'sawtooth', 0.34, output);
      this.spaceAir(t + 0.03, 0.35, 0.22, output);
      this.note(55, t + 0.22, 0.55, 'triangle', 0.28, output);
      return;
    }

    if (lower.includes('hit')) {
      this.spaceAir(t, 0.16, 0.26, output);
      this.note(120, t, 0.25, 'sawtooth', 0.32, output);
      this.note(70, t + 0.07, 0.26, 'triangle', 0.24, output);
      return;
    }

    if (lower.includes('vote')) {
      this.note(440, t, 0.08, 'triangle', 0.16, output);
      this.note(660, t + 0.07, 0.12, 'square', 0.18, output);
      this.note(990, t + 0.17, 0.16, 'triangle', 0.13, output);
      return;
    }

    if (lower.includes('victory') || lower.includes('win') || lower.includes('start')) {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => this.note(freq, t + index * 0.08, 0.32, 'square', 0.16, output));
      this.spaceAir(t + 0.28, 0.18, 0.08, output);
      return;
    }

    if (lower.includes('miss')) {
      this.note(260, t, 0.16, 'sine', 0.12, output);
      this.note(180, t + 0.12, 0.22, 'triangle', 0.12, output);
      return;
    }

    if (lower.includes('transition') || lower.includes('turn')) {
      this.note(320, t, 0.11, 'triangle', 0.11, output);
      this.note(540, t + 0.08, 0.13, 'triangle', 0.12, output);
      this.note(760, t + 0.16, 0.13, 'sine', 0.12, output);
      return;
    }

    this.note(520, t, 0.05, 'triangle', 0.13, output);
    this.note(760, t + 0.045, 0.08, 'sine', 0.1, output);
  }

  private note(freq: number, start: number, duration: number, type: OscillatorType, volume: number, destination: AudioNode) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'sawtooth' ? 900 : 1600, start);
    filter.Q.value = 0.45;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.08);
  }

  private spaceAir(start: number, duration: number, volume: number, destination: AudioNode) {
    if (!this.ctx) return;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 740;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration);
  }

  private clampVolume(value: number) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  }

  private loadPrefs(): AudioPrefs {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  }

  private savePrefs() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
  }
}

export const audioManager = new AudioManager();