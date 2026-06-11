type MusicTrack = 'lobby-theme' | 'game-theme' | 'victory-theme' | string;
type SfxEffect = 'click' | 'hover' | 'vote' | 'eliminated' | 'message' | 'start-game' | 'transition' | 'select' | 'eliminate' | 'win' | 'turn' | string;

type AudioPrefs = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
};

const DEFAULT_PREFS: AudioPrefs = {
  musicEnabled: false,
  sfxEnabled: true,
  musicVolume: 0.35,
  sfxVolume: 0.5,
  muted: false,
};

const STORAGE_KEY = 'mata-mata-audio-prefs';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private activeMusicTrack: MusicTrack | null = null;
  private hasUserGesture = false;
  public prefs: AudioPrefs = DEFAULT_PREFS;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefs = this.loadPrefs();
    }
  }

  get enabled() {
    return !this.prefs.muted && (this.prefs.musicEnabled || this.prefs.sfxEnabled);
  }

  initFromUserGesture() {
    this.hasUserGesture = true;
    this.ensureContext();
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
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

    if (enabled) {
      void this.playMusic('lobby-theme');
    } else {
      this.stopMusic();
    }
  }

  async playMusic(track: MusicTrack) {
    if (typeof window === 'undefined' || !this.hasUserGesture || this.prefs.muted || !this.prefs.musicEnabled) return;

    if (this.activeMusicTrack === track && this.music) return;
    this.stopMusic();

    const audio = new Audio(`/audio/music/${track}.mp3`);
    audio.loop = true;
    audio.volume = this.prefs.musicVolume;
    audio.addEventListener('error', () => {
      this.playToneFallback('turn');
      this.stopMusic();
    }, { once: true });

    this.music = audio;
    this.activeMusicTrack = track;

    try {
      await audio.play();
    } catch {
      this.stopMusic();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
      this.music.src = '';
      this.music = null;
      this.activeMusicTrack = null;
    }
  }

  playSfx(effect: SfxEffect) {
    if (typeof window === 'undefined' || !this.hasUserGesture || this.prefs.muted || !this.prefs.sfxEnabled) return;

    const audio = new Audio(`/audio/sfx/${this.normalizeSfx(effect)}.mp3`);
    audio.volume = this.prefs.sfxVolume;
    audio.addEventListener('error', () => this.playToneFallback(effect), { once: true });
    void audio.play().catch(() => this.playToneFallback(effect));
  }

  playSFX(effect: SfxEffect) {
    this.playSfx(effect);
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
    if (enabled) void this.playMusic('lobby-theme');
    else this.stopMusic();
  }

  setSfxEnabled(enabled: boolean) {
    this.initFromUserGesture();
    this.prefs.sfxEnabled = enabled;
    this.savePrefs();
  }

  muteAll() {
    this.prefs.muted = true;
    this.stopMusic();
    this.savePrefs();
  }

  unmuteAll() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.savePrefs();
  }

  private normalizeSfx(effect: SfxEffect) {
    const map: Record<string, string> = {
      select: 'click',
      turn: 'transition',
      win: 'start-game',
      eliminate: 'eliminated',
    };
    return map[effect] || effect;
  }

  private ensureContext() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this.ctx = null;
    }
  }

  private playToneFallback(effect: SfxEffect) {
    this.ensureContext();
    if (!this.ctx || this.prefs.muted || !this.prefs.sfxEnabled) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lower = String(effect).toLowerCase();

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = lower.includes('elimin') ? 'sawtooth' : lower.includes('win') || lower.includes('start') ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(lower.includes('elimin') ? 120 : 420, t);
    osc.frequency.exponentialRampToValueAtTime(lower.includes('elimin') ? 45 : 740, t + 0.18);
    gain.gain.setValueAtTime(this.prefs.sfxVolume * 0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.start(t);
    osc.stop(t + 0.25);
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
