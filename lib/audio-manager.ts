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

type TrackMood = 'space' | 'lobby-space' | 'suspense-space' | 'victory-space';

type TrackPattern = {
  tempo: number;
  root: number;
  bass: number[];
  lead: number[];
  pad: number[];
  mood: TrackMood;
};

const DEFAULT_PREFS: AudioPrefs = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.2,
  sfxVolume: 0.72,
  muted: false,
};

const STORAGE_KEY = 'mata-mata-audio-prefs';

const TRACKS: Record<string, TrackPattern> = {
  'login-theme': {
    tempo: 54,
    root: 146.83,
    bass: [0, -5, -7, -10, -5, -12, -10, -7],
    lead: [12, 15, 19, 17, 15, 12, 10, 12],
    pad: [0, 3, 7, 10],
    mood: 'space',
  },
  'lobby-theme': {
    tempo: 62,
    root: 164.81,
    bass: [0, 0, -7, -5, -3, -5, -7, -12],
    lead: [12, 16, 19, 21, 19, 16, 14, 12],
    pad: [0, 4, 7, 11],
    mood: 'lobby-space',
  },
  'game-theme': {
    tempo: 70,
    root: 130.81,
    bass: [0, -12, -5, -7, 0, -10, -7, -5],
    lead: [12, 15, 17, 22, 20, 17, 15, 12],
    pad: [0, 3, 7, 10],
    mood: 'suspense-space',
  },
  'victory-theme': {
    tempo: 72,
    root: 196,
    bass: [0, 4, 7, 12, 7, 4, 0, -5],
    lead: [12, 16, 19, 24, 21, 19, 16, 12],
    pad: [0, 4, 7, 12],
    mood: 'victory-space',
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
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private airTimer: number | null = null;
  private musicRate = 1;
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

    const previousTrack = this.activeMusicTrack;
    this.activeMusicTrack = track;
    if (this.prefs.muted || !this.prefs.musicEnabled) return;
    if (!this.hasUserGesture) return;

    if ((this.music || this.synthTimer) && previousTrack === track) return;
    this.stopMusic(false);

    const audio = new Audio(`/audio/music/${track}.mp3`);
    audio.loop = true;
    audio.volume = this.prefs.musicVolume;
    audio.playbackRate = this.musicRate;
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

  setMusicRate(rate: number) {
    const nextRate = Math.max(0.75, Math.min(1.35, Number.isFinite(rate) ? rate : 1));
    if (Math.abs(this.musicRate - nextRate) < 0.01) return;

    this.musicRate = nextRate;
    if (this.music) this.music.playbackRate = nextRate;

    if (this.synthTimer && this.activeMusicTrack) {
      this.stopSynthMusic();
      this.startSynthMusic(this.activeMusicTrack);
    }
  }

  setMusicVolume(value: number) {
    this.prefs.musicVolume = this.clampVolume(value);
    if (this.music) this.music.volume = this.prefs.musicVolume;
    if (this.masterGain && this.ctx) this.masterGain.gain.setTargetAtTime(this.prefs.musicVolume * 0.18, this.ctx.currentTime, 0.2);
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
      this.masterGain.gain.value = this.prefs.musicVolume * 0.18;
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
    const stepMs = Math.round((60_000 / (pattern.tempo * this.musicRate)) / 2);
    this.synthStep = 0;
    this.masterGain.gain.setTargetAtTime(this.prefs.musicVolume * 0.18, this.ctx.currentTime, 0.25);
    this.startDrone(pattern);

    const tick = () => {
      if (!this.ctx || !this.masterGain || this.prefs.muted || !this.prefs.musicEnabled) return;
      const t = this.ctx.currentTime;
      const step = this.synthStep++;
      const root = pattern.root;
      const bassSemi = pattern.bass[step % pattern.bass.length];
      const leadSemi = pattern.lead[step % pattern.lead.length];

      if (step % 4 === 0) this.deepPulse(root * this.semi(bassSemi - 12), t, pattern.mood, this.masterGain);
      if (step % 8 === 0) this.spacePad(root, pattern.pad, t, 4.6, this.masterGain);
      if (step % 6 === 3) this.softPing(root * this.semi(leadSemi + 12), t, pattern.mood, this.masterGain);
      if (step % 12 === 6) this.softPing(root * this.semi(leadSemi + 19), t, pattern.mood, this.masterGain, 0.45);
      if (pattern.mood === 'suspense-space' && step % 10 === 5) this.spaceAir(t, 0.55, 0.025, this.masterGain);
      if (pattern.mood === 'lobby-space' && step % 16 === 10) this.softPing(root * this.semi(28), t, pattern.mood, this.masterGain, 0.35);
    };

    tick();
    this.synthTimer = window.setInterval(tick, stepMs);
    this.airTimer = window.setInterval(() => {
      if (this.ctx && this.masterGain && !this.prefs.muted && this.prefs.musicEnabled) {
        this.spaceAir(this.ctx.currentTime, 1.3, 0.012, this.masterGain);
      }
    }, 4800);
  }

  private startDrone(pattern: TrackPattern) {
    if (!this.ctx || !this.masterGain) return;
    this.stopDrone();

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0001;
    this.droneGain.gain.exponentialRampToValueAtTime(0.055, this.ctx.currentTime + 1.2);
    this.droneGain.connect(this.masterGain);

    const freqs = [pattern.root / 2, pattern.root * this.semi(pattern.pad[1] - 12), pattern.root * this.semi(pattern.pad[2] - 12)];
    this.droneOscillators = freqs.map((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const filter = this.ctx!.createBiquadFilter();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = pattern.mood === 'suspense-space' ? 520 : 760;
      filter.Q.value = 0.4;
      osc.connect(filter);
      filter.connect(this.droneGain!);
      osc.start();
      return osc;
    });
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
    if (this.airTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.airTimer);
      this.airTimer = null;
    }
    this.stopDrone();
  }

  private stopDrone() {
    if (this.ctx && this.droneGain) {
      try {
        this.droneGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
      } catch {}
    }
    for (const osc of this.droneOscillators) {
      try {
        osc.stop(this.ctx ? this.ctx.currentTime + 0.18 : undefined);
      } catch {}
    }
    this.droneOscillators = [];
    this.droneGain = null;
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

  private deepPulse(freq: number, start: number, mood: TrackMood, destination: AudioNode) {
    const volume = mood === 'suspense-space' ? 0.13 : 0.09;
    this.note(freq, start, 1.2, 'sine', volume, destination);
    this.note(freq * 2.01, start + 0.02, 0.85, 'triangle', volume * 0.35, destination);
  }

  private softPing(freq: number, start: number, mood: TrackMood, destination: AudioNode, volumeScale = 1) {
    const volume = (mood === 'victory-space' ? 0.055 : 0.038) * volumeScale;
    this.note(freq, start, 0.75, 'sine', volume, destination);
    this.note(freq * 2, start + 0.015, 0.38, 'triangle', volume * 0.35, destination);
  }

  private spacePad(root: number, semis: number[], start: number, duration: number, destination: AudioNode) {
    semis.forEach((semi, index) => {
      this.note(root * this.semi(semi), start + index * 0.04, duration, 'sine', 0.018, destination);
    });
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

  private semi(value: number) {
    return Math.pow(2, value / 12);
  }

  private clampVolume(value: number) {
    return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  }

  private loadPrefs(): AudioPrefs {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw), musicEnabled: true } : DEFAULT_PREFS;
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
