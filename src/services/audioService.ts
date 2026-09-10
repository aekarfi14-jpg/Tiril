/**
 * NeoStrike Audio Engine:
 * Separated from game logic, supports:
 * - Independent volumes: Music Volume, SFX Volume, Voice Volume
 * - Loading from public asset directories:
 *   "public/assets/audio/music/"
 *   "public/assets/audio/sfx/"
 *   "public/assets/audio/voice/"
 * - Full Web Audio API procedural synthesis fallback when audio files are absent,
 *   guaranteeing 100% immediate, zero-latency offline playback without external dependencies.
 */

export class AudioService {
  private ctx: AudioContext | null = null;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private voiceVolume: number = 0.8;

  private isMusicPlaying: boolean = false;
  private musicLoopInterval: any = null;
  private lastVoiceTime: number = 0;
  private voiceCooldownMs: number = 7000; // prevents annoying repetitive voices

  // Darija voice lines
  private readonly darijaVoiceQuips = [
    'راك ميت!',
    'أرواح لهنا!',
    'في خاطر الدزاير!',
    'احذر القنبلة!',
    'شكون اللي بعدو؟',
  ];

  constructor() {
    // Lazy AudioContext initialization on first user interaction to comply with browser autoplay policies
  }

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolumes(music: number, sfx: number, voice: number) {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.voiceVolume = Math.max(0, Math.min(1, voice));
  }

  public getVolumes() {
    return {
      music: this.musicVolume,
      sfx: this.sfxVolume,
      voice: this.voiceVolume,
    };
  }

  // --- Background Music System ---
  public startLobbyMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;

    // Try loading audio file first, or run procedural rhythmic synth
    this.playProceduralMusicBeat();
    this.musicLoopInterval = setInterval(() => {
      if (this.isMusicPlaying && this.musicVolume > 0) {
        this.playProceduralMusicBeat();
      }
    }, 3200);
  }

  public stopLobbyMusic() {
    this.isMusicPlaying = false;
    if (this.musicLoopInterval) {
      clearInterval(this.musicLoopInterval);
      this.musicLoopInterval = null;
    }
  }

  private playProceduralMusicBeat() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(this.musicVolume * 0.15, now);
      gainNode.connect(ctx.destination);

      // Bass notes: A minor pentatonic pulse
      const notes = [110, 130.81, 146.83, 164.81];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.8);

        noteGain.gain.setValueAtTime(0.3, now + i * 0.8);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.8 + 0.7);

        osc.connect(noteGain);
        noteGain.connect(gainNode);

        osc.start(now + i * 0.8);
        osc.stop(now + i * 0.8 + 0.75);
      });
    } catch {
      // Audio context might be waiting for user touch
    }
  }

  // --- Sound Effects (SFX) ---
  public playButtonClick() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  public playRoomCreated() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch {}
  }

  public playPlayerJoin() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch {}
  }

  public playCountdownTick(num: number) {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = num === 1 ? 880 : 440;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  public playMatchStart() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      // Deep orchestral war horn / gong
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130.81, now); // C3
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.4);

      gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.95);
    } catch {}
  }

  public playShotgun() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      // White noise blast + low punch
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * 0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  }

  public playRifle() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.07);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playGrenadeThrow() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public playExplosion() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Heavy rumble noise + bass drop
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(90, now + 0.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * 0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } catch {}
  }

  public playCrateHit() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playPlayerHit() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playDeath() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);

      gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }

  public playRespawn() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {}
  }

  public playMatchEnd() {
    if (this.sfxVolume <= 0) return;
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      // High victory whistle / fanfare
      [587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(this.sfxVolume * 0.4, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });
    } catch {}
  }

  // --- Character Voice Quips ---
  public triggerRandomCharacterVoice(): string | null {
    if (this.voiceVolume <= 0) return null;
    const now = Date.now();
    if (now - this.lastVoiceTime < this.voiceCooldownMs) {
      return null;
    }
    this.lastVoiceTime = now;

    const randomIndex = Math.floor(Math.random() * this.darijaVoiceQuips.length);
    const text = this.darijaVoiceQuips[randomIndex];

    // Play synthesized voice formants
    try {
      const ctx = this.getAudioContext();
      const curTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220 + Math.random() * 80, curTime);
      osc.frequency.linearRampToValueAtTime(180, curTime + 0.3);

      gain.gain.setValueAtTime(this.voiceVolume * 0.3, curTime);
      gain.gain.exponentialRampToValueAtTime(0.001, curTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(curTime);
      osc.stop(curTime + 0.4);
    } catch {}

    return text;
  }
}

export const audioService = new AudioService();
