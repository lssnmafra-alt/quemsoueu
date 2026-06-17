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

const DEFAULT_PREFS: AudioPrefs = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.28,
  sfxVolume: 0.72,
  muted: false,
};

const STORAGE_KEY = 'mata-mata-audio-prefs';

const TRACKS: Record<string, { tempo: number; scale: number[]; bass: number[]; lead: number[]; pad: number[]; mood: 'bright' | 'mystery' | 'battle' | 'victory' }> = {
  'login-theme': {
    tempo: 88,
    scale: [0, 3, 5, 7, 10, 12],
    bass: [0, 0, 7, 5, 3, 3, 7, 10],
    lead: [12, 10, 7, 10, 15, 12, 10, 7],
    pad: [0, 3, 7, 10],
    mood: 'mystery',
  },
  'lobby-theme': {
    tempo: 112,
    scale: [0, 2, 4, 7, 9, 12],
    bass: [0, 7, 9, 4, 0, 7, 12, 9],
    lead: [12, 14, 16, 19, 16, 14, 12, 9],
    pad: [0, 4, 7, 12],
    mood: 'bright',
  },
  'game-theme': {
    tempo: 132,
    scale: [0, 2, 3, 7, 10, 12],
    bass: [0, 0, 10, 7, 0, 3, 7, 10],
    lead: [12, 15, 14, 10, 12, 19, 17, 15],
    pad: [0, 3, 7, 10],
    mood: 'battle',
  },
  'victory-theme': {
    tempo: 104,
    scale: [0, 2, 4, 7, 9, 12],
    bass: [0, 4, 7, 12, 9, 7, 4, 0],
    lead: [12, 16, 19, 24, 21, 19, 16, 12],
    pad: [0, 4, 7, 12],
    mood: 'victory',
  },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private activeMusicTrack: MusicTrack | null = null;
  private hasUserGesture = false;
  private synthTimer: number | null = null;
  private synthStep = 0;
  private masterGain: GainNode | null = null;
  public prefs: AudioPrefs = DEFAULT_PREFS;

  constructor() {
    if (typeof window !== 'undefined') {
      this.prefs = this.loadPrefs();
      this.installGestureUnlock();
      this.installButtonSfx();
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

    if (this.activeMusicTrack && this.prefs.musicEnabled && !this.music && !this.synthTimer) {
      this.startSynthMusic(this.activeMusicTrack);
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
      void this.playMusic(this.activeMusicTrack || 'lobby-theme');
    } else {
      this.stopMusic();
    }
  }

  async playMusic(track: MusicTrack) {
    if (typeof window === 'undefined') return;

    this.activeMusicTrack = track;
    if (this.prefs.muted || !this.prefs.musicEnabled) return;
    if (!this.hasUserGesture) return;

    if (this.music || this.synthTimer) {
      if (this.activeMusicTrack === track) return;
      this.stopMusic(false);
    }

    const audio = new Audio(`/audio/music/${track}.mp3`);
    audio.loop = true;
    audio.volume = this.prefs.musicVolume;
    audio.addEventListener(
      'error',
      () => {
        this.stopHtmlMusicOnly();
        this.startSynthMusic(track);
      },
      { once: true },
    );

    this.music = audio;

    try {
      await audio.play();
    } catch {
      this.stopHtmlMusicOnly();
      this.startSynthMusic(track);
    }
  }

  stopMusic(clearTrack = true) {
    this.stopHtmlMusicOnly();
    this.stopSynthMusic();
    if (clearTrack) this.activeMusicTrack = null;
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

  setMusicVolume(value: number) {
    this.prefs.musicVolume = this.clampVolume(value);
    if (this.music) this.music.volume = this.prefs.musicVolume;
    if (this.masterGain) this.masterGain.gain.setTargetAtTime(this.prefs.musicVolume * 0.22, this.ctx?.currentTime || 0, 0.08);
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
    if (enabled) void this.playMusic(this.activeMusicTrack || 'lobby-theme');
    else this.stopMusic(false);
  }

  setSfxEnabled(enabled: boolean) {
    this.initFromUserGesture();
    this.prefs.sfxEnabled = enabled;
    this.savePrefs();
  }

  muteAll() {
    this.prefs.muted = true;
    this.stopMusic(false);
    this.savePrefs();
  }

  unmuteAll() {
    this.initFromUserGesture();
    this.prefs.muted = false;
    this.savePrefs();
    if (this.activeMusicTrack) void this.playMusic(this.activeMusicTrack);
  }

  private normalizeSfx(effect: SfxEffect) {
    const map: Record<string, string> = {
      select: 'click',
      turn: 'transition',
      win: 'victory',
      eliminate: 'eliminated',
      hurt: 'hit',
    };
    return map[String(effect).toLowerCase()] || String(effect).toLowerCase();
  }

  private installGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initFromUserGesture();
      if (this.activeMusicTrack) void this.playMusic(this.activeMusicTrack);
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

  private ensureContext() {
    if (this.ctx || typeof window === 'undefined') return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.prefs.musicVolume * 0.22;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
      this.masterGain = null;
    }
  }

  private startSynthMusic(track: MusicTrack) {
    this.ensureContext();
    if (!this.ctx || !this.masterGain || this.synthTimer || this.prefs.muted || !this.prefs.musicEnabled) return;

    const pattern = TRACKS[track] || TRACKS['lobby-theme'];
    const stepMs = Math.round((60_000 / pattern.tempo) / 2);
    this.synthStep = 0;
    this.masterGain.gain.setTargetAtTime(this.prefs.musicVolume * 0.22, this.ctx.currentTime, 0.15);

    const tick = () => {
      if (!this.ctx || !this.masterGain || this.prefs.muted || !this.prefs.musicEnabled) return;
      const t = this.ctx.currentTime;
      const step = this.synthStep++;
      const root = pattern.mood === 'bright' || pattern.mood === 'victory' ? 196 : pattern.mood === 'battle' ? 130.81 : 146.83;
      const bassSemi = pattern.bass[step % pattern.bass.length];
      const leadSemi = pattern.lead[step % pattern.lead.length];

      if (step % 2 === 0) this.note(root * this.semi(bassSemi - 12), t, 0.22, 'triangle', 0.14, this.masterGain!);
      if (step % 4 === 0) this.pad(root, pattern.pad, t, 0.9, this.masterGain!);
      if (step % 2 === 1) this.note(root * this.semi(leadSemi), t, 0.16, pattern.mood === 'battle' ? 'sawtooth' : 'sine', 0.06, this.masterGain!);
      if (pattern.mood === 'battle' && step % 2 === 0) this.noise(t, 0.05, 0.04, this.masterGain!);
      if (pattern.mood === 'bright' && step % 4 === 2) this.note(root * this.semi(24), t, 0.08, 'square', 0.025, this.masterGain!);
    };

    tick();
    this.synthTimer = window.setInterval(tick, stepMs);
  }

  private stopHtmlMusicOnly() {
    if (this.music) {
      this.music.pause();
      this.music.src = '';
      this.music = null;
    }
  }

  private stopSynthMusic() {
    if (this.synthTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.synthTimer);
      this.synthTimer = null;
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
      this.noise(t + 0.03, 0.35, 0.22, output);
      this.note(55, t + 0.22, 0.55, 'triangle', 0.28, output);
      return;
    }

    if (lower.includes('hit')) {
      this.noise(t, 0.16, 0.26, output);
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
      this.noise(t + 0.28, 0.18, 0.08, output);
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
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private pad(root: number, semis: number[], start: number, duration: number, destination: AudioNode) {
    semis.forEach((semi, index) => {
      this.note(root * this.semi(semi), start + index * 0.015, duration, 'sine', 0.025, destination);
    });
  }

  private noise(start: number, duration: number, volume: number, destination: AudioNode) {
    if (!this.ctx) return;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration);
  }

  private semi(value: number) {
    return Math.pow(2, value / 12);
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
