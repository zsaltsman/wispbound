import { SONGS, line, drum, lift, type Song, type Part } from './songs';
import { SONGS3 } from './songs3';
import { SONGS4 } from './songs4';
import { SONGS5 } from './songs5';
import { SONGS6 } from './songs6';
import { SONGS7 } from './songs7';

/** The music bus level, and songs that play louder than the rest (the Grim Reaper's fights). */
const MUSIC_BASE = 0.22;
const SONG_GAIN: Record<string, number> = { w4_reaper2: 1.7, gr_reaper1: 1.7, gr_buff: 1.7, gr_true: 1.7, gr_final: 1.7, gr_final2: 1.7 };

// World 3's songs live in their own file
Object.assign(SONGS, SONGS3, SONGS4, SONGS5, SONGS6, SONGS7);

// All sound is synthesised live with WebAudio: original chiptune SFX, a looping
// three-phase boss theme, and storm ambience. Nothing starts until the first
// user gesture, so browser autoplay rules never block the game.

type Wave = OscillatorType;

/**
 * The Flying Dutchman's opening: two pounding tritone stabs on a ghost-ship chord,
 * a crash, then a lead that slides down chromatically into the theme's own bass.
 */
const DUTCH_INTRO: { steps: number; parts: Part[] } = {
  steps: 32,
  parts: [
    line('D2 - - . D2 - - . Ab2 - - - - - - - ' + 'Eb2 - - . Eb2 - - . D2 - - - - - - -', 'sawtooth', 0.13),
    line('A2 - - . A2 - - . D3 - - - - - - - ' + 'Bb2 - - . Bb2 - - . A2 - - - - - - -', 'sawtooth', 0.09),
    line('D5 - - . D5 - - . Ab5 - - - - - - - ' + 'G5 - F5 - Eb5 - D5 - C#5 - - - D5 - - -', 'square', 0.08, 3),
    drum('x..x..x.x....... ' + 'x..x..x.x...x.xx', 'boom', 0.45),
    drum('x............... ' + 'x...............', 'crash', 0.1),
    drum('................ ' + '........x.x.xxxx', 'snare', 0.15),
  ],
};
const DUTCH_LIFT = lift(0.2);

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class SoundSystem {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private amb!: GainNode;
  /** The player's own levels: music, and everything else (effects + ambience). */
  private musicBus!: GainNode;
  private fxBus!: GainNode;
  private musicVol = 1;
  private fxVol = 1;
  private noiseBuf!: AudioBuffer;
  enabled = true;
  volume = 0.7;
  private musicPhase = 0;
  private musicTimer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private ambNodes: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode }[] = [];
  private storm = 1;
  private song: Song | null = null;
  songName = '';
  private ambProfile = 'battle';
  private ambTimer: number | null = null;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.musicBus.connect(this.master);
    this.fxBus = this.ctx.createGain();
    this.fxBus.gain.value = this.fxVol;
    this.fxBus.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.55;
    this.sfx.connect(this.fxBus);
    this.music = this.ctx.createGain();
    this.music.gain.value = MUSIC_BASE;
    this.music.connect(this.musicBus);
    this.amb = this.ctx.createGain();
    this.amb.gain.value = 0.0;
    this.amb.connect(this.fxBus);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.applyVolume();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
  }

  /** Music level, 0..1 (on top of the master volume). */
  setMusicVolume(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v));
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.musicVol, this.ctx.currentTime, 0.05);
  }

  /** Sound effects and ambience level, 0..1 (on top of the master volume). */
  setSfxVolume(v: number) {
    this.fxVol = Math.max(0, Math.min(1, v));
    if (this.ctx) this.fxBus.gain.setTargetAtTime(this.fxVol, this.ctx.currentTime, 0.05);
  }

  private applyVolume() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime, 0.05);
  }

  private get ready() {
    return !!this.ctx && this.enabled;
  }

  // ------------------------------------------------------------ primitives

  tone(o: {
    type?: Wave;
    f: number;
    f2?: number;
    dur: number;
    vol?: number;
    at?: number;
    attack?: number;
    bus?: 'sfx' | 'music';
    vibrato?: number;
  }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = (o.at ?? c.currentTime) + 0.001;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    if (o.vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = o.vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur + 0.05);
    }
    const v = o.vol ?? 0.3;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g).connect(o.bus === 'music' ? this.music : this.sfx);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  noise(o: {
    dur: number;
    vol?: number;
    type?: BiquadFilterType;
    f?: number;
    f2?: number;
    q?: number;
    at?: number;
    attack?: number;
    bus?: 'sfx' | 'music';
  }) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = (o.at ?? c.currentTime) + 0.001;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filt = c.createBiquadFilter();
    filt.type = o.type ?? 'lowpass';
    filt.frequency.setValueAtTime(o.f ?? 2000, t);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + o.dur);
    filt.Q.value = o.q ?? 0.7;
    const g = c.createGain();
    const v = o.vol ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filt).connect(g).connect(o.bus === 'music' ? this.music : this.sfx);
    src.start(t, Math.random());
    src.stop(t + o.dur + 0.05);
  }

  // ------------------------------------------------------------ named effects

  play(name: string) {
    if (!this.ready) return;
    const now = this.ctx!.currentTime;
    switch (name) {
      case 'move':
        this.tone({ f: 880, dur: 0.05, vol: 0.12 });
        break;
      case 'select':
        this.tone({ f: 660, dur: 0.06, vol: 0.15 });
        this.tone({ f: 990, dur: 0.08, vol: 0.15, at: now + 0.06 });
        break;
      case 'back':
        this.tone({ f: 500, f2: 300, dur: 0.1, vol: 0.12 });
        break;
      case 'deny':
        this.tone({ f: 140, dur: 0.12, vol: 0.18, type: 'square' });
        this.tone({ f: 130, dur: 0.14, vol: 0.18, type: 'square', at: now + 0.13 });
        break;
      case 'text':
        this.tone({ f: 1200, dur: 0.02, vol: 0.04 });
        break;
      case 'hit':
        this.noise({ dur: 0.12, vol: 0.4, f: 3000, f2: 400 });
        this.tone({ f: 220, f2: 60, dur: 0.12, vol: 0.25, type: 'square' });
        break;
      case 'crit':
        this.noise({ dur: 0.2, vol: 0.5, f: 5000, f2: 300 });
        this.tone({ f: 600, f2: 80, dur: 0.2, vol: 0.3, type: 'sawtooth' });
        this.tone({ f: 1400, dur: 0.08, vol: 0.12, at: now + 0.02 });
        break;
      case 'heavy':
        this.noise({ dur: 0.45, vol: 0.6, f: 1200, f2: 60 });
        this.tone({ f: 120, f2: 30, dur: 0.45, vol: 0.5, type: 'sine' });
        break;
      case 'cannon':
        this.noise({ dur: 0.35, vol: 0.55, f: 1800, f2: 90 });
        this.tone({ f: 90, f2: 35, dur: 0.3, vol: 0.45, type: 'sine' });
        break;
      case 'boom':
        this.noise({ dur: 0.7, vol: 0.6, f: 900, f2: 40 });
        this.tone({ f: 70, f2: 25, dur: 0.6, vol: 0.5, type: 'sine' });
        break;
      case 'thunder':
        this.noise({ dur: 1.8, vol: 0.5, f: 700, f2: 60, attack: 0.02 });
        this.noise({ dur: 0.25, vol: 0.4, f: 4000, f2: 600, type: 'bandpass' });
        break;
      case 'thunder_far':
        this.noise({ dur: 2.2, vol: 0.2, f: 300, f2: 50, attack: 0.3 });
        break;
      case 'splash':
        this.noise({ dur: 0.5, vol: 0.35, f: 2500, f2: 500, type: 'bandpass', q: 0.5 });
        break;
      case 'wave':
        this.noise({ dur: 1.6, vol: 0.55, f: 300, f2: 2500, attack: 0.6 });
        this.noise({ dur: 1.0, vol: 0.5, f: 2000, f2: 200, at: now + 1.0 });
        break;
      case 'horn':
        this.tone({ f: midi(38), dur: 1.6, vol: 0.28, type: 'sawtooth', attack: 0.25, vibrato: 1.5 });
        this.tone({ f: midi(38) * 1.01, dur: 1.6, vol: 0.22, type: 'sawtooth', attack: 0.3 });
        this.tone({ f: midi(45), dur: 1.4, vol: 0.12, type: 'square', attack: 0.4 });
        break;
      case 'creak':
        this.tone({ f: 180, f2: 120, dur: 0.5, vol: 0.12, type: 'sawtooth', vibrato: 18 });
        break;
      case 'chain':
        for (let i = 0; i < 6; i++) this.noise({ dur: 0.05, vol: 0.25, f: 6000, type: 'highpass', at: now + i * 0.05 });
        break;
      case 'ghost':
        this.tone({ f: 500, f2: 900, dur: 0.5, vol: 0.12, type: 'sine', vibrato: 30, attack: 0.1 });
        break;
      case 'wail':
        this.tone({ f: 300, f2: 1200, dur: 0.6, vol: 0.14, type: 'triangle', vibrato: 40, attack: 0.05 });
        this.tone({ f: 450, f2: 1500, dur: 0.6, vol: 0.08, type: 'square', vibrato: 30, attack: 0.05 });
        break;
      case 'heal':
        [0, 4, 7, 12].forEach((n, i) => this.tone({ f: midi(72 + n), dur: 0.15, vol: 0.12, type: 'triangle', at: now + i * 0.07 }));
        break;
      case 'shield':
        this.tone({ f: midi(67), dur: 0.35, vol: 0.12, type: 'square' });
        this.tone({ f: midi(74), dur: 0.35, vol: 0.1, type: 'square', at: now + 0.05 });
        this.noise({ dur: 0.3, vol: 0.15, f: 6000, type: 'highpass' });
        break;
      case 'buff':
        [0, 7, 12].forEach((n, i) => this.tone({ f: midi(64 + n), dur: 0.12, vol: 0.12, at: now + i * 0.06 }));
        break;
      case 'debuff':
        [12, 6, 0].forEach((n, i) => this.tone({ f: midi(60 + n), dur: 0.14, vol: 0.12, type: 'square', at: now + i * 0.07 }));
        break;
      case 'miss':
        this.tone({ f: 900, f2: 300, dur: 0.15, vol: 0.1, type: 'triangle' });
        break;
      case 'charge':
        this.tone({ f: 120, f2: 900, dur: 0.8, vol: 0.12, type: 'sawtooth' });
        break;
      case 'warn':
        this.tone({ f: midi(81), dur: 0.08, vol: 0.12 });
        this.tone({ f: midi(81), dur: 0.08, vol: 0.12, at: now + 0.14 });
        break;
      case 'tick':
        this.tone({ f: 2000, dur: 0.02, vol: 0.12, type: 'square' });
        this.tone({ f: 1500, dur: 0.02, vol: 0.12, type: 'square', at: now + 0.25 });
        break;
      case 'rewind':
        for (let i = 0; i < 10; i++) this.tone({ f: 2400 - i * 160, dur: 0.03, vol: 0.08, at: now + i * 0.05 });
        this.tone({ f: 800, f2: 200, dur: 0.6, vol: 0.12, type: 'triangle' });
        break;
      case 'freeze':
        this.tone({ f: midi(84), dur: 0.9, vol: 0.1, type: 'triangle', vibrato: 4 });
        this.tone({ f: midi(91), dur: 0.9, vol: 0.06, type: 'sine' });
        break;
      case 'swish':
        this.noise({ dur: 0.15, vol: 0.25, f: 1500, f2: 6000, type: 'bandpass', q: 1.5 });
        break;
      case 'spin':
        for (let i = 0; i < 3; i++)
          this.noise({ dur: 0.12, vol: 0.25, f: 1200, f2: 5000, type: 'bandpass', q: 2, at: now + i * 0.12 });
        break;
      case 'anchor':
        this.tone({ f: 1400, f2: 200, dur: 0.6, vol: 0.12, type: 'sine' });
        break;
      case 'siphon':
        this.tone({ f: 200, f2: 90, dur: 1.0, vol: 0.18, type: 'sawtooth', vibrato: 8 });
        break;
      case 'whirl':
        this.noise({ dur: 1.6, vol: 0.4, f: 200, f2: 1500, type: 'bandpass', q: 3, attack: 0.3 });
        break;
      case 'counter':
        this.tone({ f: midi(76), dur: 0.08, vol: 0.14 });
        this.tone({ f: midi(83), dur: 0.12, vol: 0.14, at: now + 0.08 });
        break;
      case 'phase':
        this.tone({ f: midi(26), dur: 2.4, vol: 0.4, type: 'sawtooth', attack: 0.4 });
        this.tone({ f: midi(27), dur: 2.4, vol: 0.3, type: 'sawtooth', attack: 0.5 });
        this.noise({ dur: 2.5, vol: 0.4, f: 200, f2: 1200, attack: 0.8 });
        [0, 1, 6, 7].forEach((n, i) => this.tone({ f: midi(62 + n), dur: 0.5, vol: 0.08, at: now + 1.2 + i * 0.18 }));
        break;
      case 'victory': {
        const seq = [67, 71, 74, 79, 0, 76, 79, 83, 86];
        seq.forEach((n, i) => n && this.tone({ f: midi(n), dur: 0.22, vol: 0.14, at: now + i * 0.13 }));
        this.tone({ f: midi(43), dur: 1.4, vol: 0.2, type: 'triangle', at: now + 0.5 });
        break;
      }
      case 'defeat': {
        const seq = [62, 61, 58, 55, 50];
        seq.forEach((n, i) => this.tone({ f: midi(n), dur: 0.5, vol: 0.13, type: 'triangle', at: now + i * 0.38 }));
        this.tone({ f: midi(26), dur: 2.6, vol: 0.25, type: 'sawtooth', at: now + 0.2, attack: 0.5 });
        break;
      }
      // ---------------------------------------------------------- overworld
      case 'step':
        this.noise({ dur: 0.03, vol: 0.05, f: 900, type: 'lowpass' });
        break;
      case 'bump':
        this.tone({ f: 90, f2: 60, dur: 0.07, vol: 0.12, type: 'square' });
        break;
      case 'door':
        this.tone({ f: 300, f2: 180, dur: 0.12, vol: 0.1, type: 'square' });
        this.noise({ dur: 0.15, vol: 0.12, f: 1200, type: 'bandpass', at: now + 0.05 });
        break;
      case 'slam':
        this.noise({ dur: 0.35, vol: 0.55, f: 600, f2: 80 });
        this.tone({ f: 80, f2: 40, dur: 0.3, vol: 0.4, type: 'sine' });
        break;
      case 'item':
        [0, 4, 7, 12, 7, 12].forEach((n, i) => this.tone({ f: midi(76 + n), dur: 0.12, vol: 0.12, at: now + i * 0.08 }));
        break;
      case 'quest':
        [0, 7, 12, 16, 19, 24].forEach((n, i) => this.tone({ f: midi(67 + n), dur: 0.18, vol: 0.12, type: i % 2 ? 'square' : 'triangle', at: now + i * 0.11 }));
        this.tone({ f: midi(43), dur: 1, vol: 0.15, type: 'triangle', at: now + 0.3 });
        break;
      case 'recruit':
        [0, 4, 7, 11, 14, 19, 23, 24].forEach((n, i) => this.tone({ f: midi(64 + n), dur: 0.3, vol: 0.1, type: 'triangle', at: now + i * 0.12, vibrato: 4 }));
        this.tone({ f: midi(40), dur: 1.6, vol: 0.2, type: 'triangle', at: now + 0.4 });
        break;
      case 'unlock':
        this.tone({ f: 1200, dur: 0.04, vol: 0.12 });
        this.tone({ f: 800, dur: 0.06, vol: 0.12, at: now + 0.07 });
        this.noise({ dur: 0.1, vol: 0.15, f: 3000, type: 'bandpass', at: now + 0.12 });
        break;
      case 'locked':
        this.tone({ f: 180, dur: 0.06, vol: 0.12 });
        this.tone({ f: 160, dur: 0.06, vol: 0.12, at: now + 0.1 });
        break;
      case 'bark':
        this.tone({ f: 520, f2: 260, dur: 0.12, vol: 0.22, type: 'sawtooth' });
        this.noise({ dur: 0.1, vol: 0.2, f: 1400, type: 'bandpass', q: 2 });
        break;
      case 'bell':
        for (const [m, v, d] of [
          [1, 0.3, 3.5],
          [2.4, 0.12, 2.5],
          [3, 0.1, 2],
          [4.2, 0.06, 1.4],
          [0.5, 0.12, 4],
        ])
          this.tone({ f: 220 * m, dur: d, vol: v, type: 'sine', attack: 0.003 });
        this.noise({ dur: 0.08, vol: 0.2, f: 5000, type: 'highpass' });
        break;
      case 'bell_dud':
        this.tone({ f: 160, f2: 120, dur: 0.25, vol: 0.2, type: 'square' });
        this.noise({ dur: 0.2, vol: 0.25, f: 700 });
        break;
      case 'bellfish':
        for (const [m, d] of [
          [1, 1.6],
          [2.76, 1.1],
          [5.4, 0.7],
        ])
          this.tone({ f: 880 * m, dur: d, vol: 0.08, type: 'sine', attack: 0.002, vibrato: 6 });
        [0, 7, 12].forEach((n, i) => this.tone({ f: midi(84 + n), dur: 0.4, vol: 0.06, type: 'triangle', at: now + 0.2 + i * 0.1 }));
        break;
      case 'cast':
        this.noise({ dur: 0.3, vol: 0.25, f: 800, f2: 4000, type: 'bandpass', q: 1.5 });
        this.noise({ dur: 0.15, vol: 0.2, f: 1500, type: 'bandpass', at: now + 0.35 });
        break;
      case 'bite':
        this.noise({ dur: 0.2, vol: 0.4, f: 2000, f2: 400, type: 'bandpass' });
        this.tone({ f: 600, dur: 0.06, vol: 0.12, at: now + 0.02 });
        this.tone({ f: 600, dur: 0.06, vol: 0.12, at: now + 0.12 });
        break;
      case 'reel':
        for (let i = 0; i < 8; i++) this.noise({ dur: 0.02, vol: 0.12, f: 5000, type: 'highpass', at: now + i * 0.05 });
        break;
      case 'scream':
        this.tone({ f: 900, f2: 500, dur: 0.6, vol: 0.12, type: 'sawtooth', vibrato: 30 });
        this.tone({ f: 1200, f2: 700, dur: 0.5, vol: 0.06, type: 'square', vibrato: 25, at: now + 0.05 });
        break;
      case 'poof':
        this.noise({ dur: 0.4, vol: 0.4, f: 400, f2: 5000, type: 'bandpass' });
        this.tone({ f: 200, f2: 1600, dur: 0.3, vol: 0.1, type: 'triangle' });
        break;
      case 'crystal':
        [0, 3, 7, 10, 14].forEach((n, i) => this.tone({ f: midi(74 + n), dur: 0.6, vol: 0.05, type: 'sine', at: now + i * 0.07, vibrato: 5 }));
        break;
      case 'hammer':
        for (let i = 0; i < 3; i++) {
          this.noise({ dur: 0.06, vol: 0.35, f: 2500, type: 'bandpass', at: now + i * 0.22 });
          this.tone({ f: 300, dur: 0.05, vol: 0.12, type: 'square', at: now + i * 0.22 });
        }
        break;
      case 'right':
        this.tone({ f: midi(79), dur: 0.1, vol: 0.12 });
        this.tone({ f: midi(84), dur: 0.2, vol: 0.12, at: now + 0.1 });
        break;
      case 'wrong':
        this.tone({ f: 110, dur: 0.4, vol: 0.18, type: 'sawtooth' });
        break;
      case 'chime':
        this.tone({ f: midi(76), dur: 0.6, vol: 0.12, type: 'sine' });
        this.tone({ f: midi(72), dur: 0.8, vol: 0.12, type: 'sine', at: now + 0.45 });
        break;
      case 'cheer':
        for (let i = 0; i < 10; i++) this.noise({ dur: 0.5, vol: 0.08, f: 800 + Math.random() * 2000, type: 'bandpass', q: 3, at: now + Math.random() * 0.8 });
        break;
      case 'flush':
        this.noise({ dur: 1.4, vol: 0.35, f: 400, f2: 2500, type: 'bandpass', attack: 0.2 });
        break;
      case 'ladder':
        for (let i = 0; i < 4; i++) this.tone({ f: 200 + i * 40, dur: 0.05, vol: 0.08, type: 'square', at: now + i * 0.15 });
        break;
      case 'drip':
        this.tone({ f: 1400 + Math.random() * 600, f2: 700, dur: 0.12, vol: 0.06, type: 'sine' });
        break;
      case 'crow':
        this.tone({ f: 700, f2: 500, dur: 0.25, vol: 0.08, type: 'sawtooth', vibrato: 40 });
        this.tone({ f: 650, f2: 450, dur: 0.25, vol: 0.07, type: 'sawtooth', vibrato: 40, at: now + 0.3 });
        break;
      case 'oink':
        this.tone({ f: 300, f2: 220, dur: 0.15, vol: 0.12, type: 'square', vibrato: 30 });
        break;
      case 'cluck':
        this.tone({ f: 900, f2: 1200, dur: 0.06, vol: 0.08, type: 'square' });
        this.tone({ f: 800, dur: 0.06, vol: 0.06, type: 'square', at: now + 0.1 });
        break;
      case 'moo':
        this.tone({ f: 140, f2: 110, dur: 0.8, vol: 0.14, type: 'sawtooth', attack: 0.1 });
        break;
      case 'meow':
        this.tone({ f: 700, f2: 1000, dur: 0.15, vol: 0.08, type: 'triangle' });
        this.tone({ f: 1000, f2: 600, dur: 0.2, vol: 0.08, type: 'triangle', at: now + 0.15 });
        break;
      case 'piano':
        [0, 1, 6].forEach((n, i) => this.tone({ f: midi(57 + n), dur: 1.2, vol: 0.12, type: 'triangle', at: now + i * 0.25 }));
        break;
      case 'heartbeat':
        this.tone({ f: 70, f2: 40, dur: 0.15, vol: 0.4, type: 'sine' });
        this.tone({ f: 70, f2: 40, dur: 0.15, vol: 0.3, type: 'sine', at: now + 0.22 });
        break;
      case 'tickclock':
        this.tone({ f: 2400, dur: 0.02, vol: 0.1, type: 'square' });
        break;
      // ---------------------------------------------------------- World 2
      case 'gull':
        this.tone({ f: 1400, f2: 900, dur: 0.18, vol: 0.05, type: 'triangle', vibrato: 60 });
        this.tone({ f: 1300, f2: 800, dur: 0.22, vol: 0.05, type: 'triangle', vibrato: 60, at: now + 0.22 });
        break;
      case 'rev':
        this.tone({ f: 60, f2: 180, dur: 0.5, vol: 0.18, type: 'sawtooth', vibrato: 25 });
        this.tone({ f: 90, f2: 240, dur: 0.45, vol: 0.08, type: 'square', at: now + 0.05 });
        this.noise({ dur: 0.5, vol: 0.08, f: 400, type: 'lowpass' });
        break;
      case 'crash':
        this.noise({ dur: 0.9, vol: 0.45, f: 2500, f2: 200, type: 'lowpass' });
        this.tone({ f: 120, f2: 40, dur: 0.6, vol: 0.3, type: 'square' });
        for (let i = 0; i < 6; i++) this.tone({ f: 800 + Math.random() * 1200, dur: 0.05, vol: 0.06, type: 'square', at: now + 0.1 + i * 0.07 });
        break;
      case 'heli':
        for (let i = 0; i < 8; i++) this.noise({ dur: 0.06, vol: 0.14, f: 300, type: 'lowpass', at: now + i * 0.09 });
        break;
      case 'siren':
        this.tone({ f: 700, f2: 1100, dur: 0.6, vol: 0.07, type: 'square' });
        this.tone({ f: 1100, f2: 700, dur: 0.6, vol: 0.07, type: 'square', at: now + 0.6 });
        break;
      case 'creakmetal':
        this.tone({ f: 220, f2: 160, dur: 0.7, vol: 0.1, type: 'sawtooth', vibrato: 18, attack: 0.1 });
        break;
      case 'rattle':
        for (let i = 0; i < 8; i++) this.noise({ dur: 0.03, vol: 0.12, f: 1800, type: 'bandpass', q: 4, at: now + i * 0.05 });
        break;
      case 'whoosh':
        this.noise({ dur: 0.6, vol: 0.25, f: 300, f2: 3000, type: 'bandpass', q: 1, attack: 0.15 });
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) this.tone({ f: 880, dur: 0.14, vol: 0.09, type: 'square', at: now + i * 0.28 });
        break;
      case 'clank':
        this.tone({ f: 1200, f2: 600, dur: 0.12, vol: 0.12, type: 'square' });
        this.noise({ dur: 0.1, vol: 0.1, f: 3000, type: 'highpass' });
        break;
      case 'sonar':
        this.tone({ f: 1320, dur: 1.4, vol: 0.08, type: 'sine', attack: 0.01 });
        break;
      case 'bubbles':
        for (let i = 0; i < 6; i++) this.tone({ f: 400 + Math.random() * 600, f2: 900 + Math.random() * 500, dur: 0.06, vol: 0.05, type: 'sine', at: now + i * 0.06 });
        break;
      case 'rumble':
        this.noise({ dur: 2.2, vol: 0.4, f: 120, type: 'lowpass', attack: 0.4 });
        this.tone({ f: 45, f2: 35, dur: 2.2, vol: 0.25, type: 'sine', attack: 0.4 });
        break;
      case 'water':
        this.noise({ dur: 2.5, vol: 0.4, f: 700, f2: 1500, type: 'bandpass', q: 0.6, attack: 0.3 });
        break;
      case 'impact':
        this.tone({ f: 80, f2: 30, dur: 0.8, vol: 0.45, type: 'square' });
        this.noise({ dur: 0.8, vol: 0.4, f: 600, f2: 80, type: 'lowpass' });
        break;
      case 'stone':
        this.noise({ dur: 1.6, vol: 0.3, f: 200, type: 'lowpass', attack: 0.2 });
        this.tone({ f: 55, f2: 50, dur: 1.6, vol: 0.2, type: 'triangle', attack: 0.2 });
        break;
      // ---------------------------------------------------------- World 4
      case 'roar':
        this.noise({ dur: 1.4, vol: 0.45, f: 900, f2: 160, type: 'lowpass', attack: 0.12 });
        this.tone({ f: 120, f2: 70, dur: 1.4, vol: 0.3, type: 'sawtooth', vibrato: 18, attack: 0.1 });
        this.tone({ f: 180, f2: 90, dur: 1.2, vol: 0.14, type: 'square', vibrato: 24, attack: 0.1 });
        break;
      case 'roar_small':
        this.noise({ dur: 0.6, vol: 0.3, f: 1200, f2: 300, type: 'lowpass', attack: 0.05 });
        this.tone({ f: 200, f2: 110, dur: 0.6, vol: 0.18, type: 'sawtooth', vibrato: 20, attack: 0.04 });
        break;
      case 'hiss':
        this.noise({ dur: 0.9, vol: 0.3, f: 5000, f2: 7000, type: 'highpass', attack: 0.06 });
        this.noise({ dur: 0.9, vol: 0.12, f: 3000, type: 'bandpass', q: 2, attack: 0.06 });
        break;
      case 'purr':
        for (let i = 0; i < 8; i++) this.tone({ f: 55, f2: 48, dur: 0.12, vol: 0.2, type: 'sawtooth', at: now + i * 0.14 });
        this.noise({ dur: 1.2, vol: 0.08, f: 200, type: 'lowpass', attack: 0.2 });
        break;
      case 'cricket':
        for (let i = 0; i < 3; i++) this.tone({ f: 4200 + Math.random() * 300, dur: 0.04, vol: 0.025, type: 'sine', at: now + i * 0.07 });
        break;
      case 'caw':
        this.tone({ f: 520, f2: 300, dur: 0.35, vol: 0.14, type: 'sawtooth', vibrato: 60 });
        this.noise({ dur: 0.35, vol: 0.12, f: 1800, type: 'bandpass', q: 3 });
        this.tone({ f: 480, f2: 260, dur: 0.4, vol: 0.12, type: 'sawtooth', vibrato: 60, at: now + 0.45 });
        break;
      case 'screech':
        this.tone({ f: 1400, f2: 2600, dur: 0.8, vol: 0.12, type: 'sawtooth', vibrato: 90 });
        this.noise({ dur: 0.8, vol: 0.2, f: 4000, type: 'highpass' });
        break;
      case 'flute':
        // Carlo's melody: the one Viperwind dances to
        [0, 4, 7, 9, 7, 4, 12, 11, 9, 7].forEach((n, i) => this.tone({ f: midi(74 + n), dur: i === 9 ? 0.6 : 0.26, vol: 0.09, type: 'sine', vibrato: 6, attack: 0.03, at: now + i * 0.26 }));
        break;
      case 'mush0':
      case 'mush1':
      case 'mush2':
      case 'mush3': {
        const n = [0, 4, 7, 12][+name.slice(4)];
        this.tone({ f: midi(67 + n), dur: 0.55, vol: 0.12, type: 'triangle', vibrato: 8, attack: 0.02 });
        this.tone({ f: midi(79 + n), dur: 0.3, vol: 0.05, type: 'sine', attack: 0.02 });
        break;
      }
      case 'sputter':
        for (let i = 0; i < 7; i++) {
          this.tone({ f: 70 + Math.random() * 30, f2: 40, dur: 0.09, vol: 0.25, type: 'square', at: now + i * 0.16 + Math.random() * 0.05 });
          this.noise({ dur: 0.08, vol: 0.2, f: 500, type: 'lowpass', at: now + i * 0.16 });
        }
        break;
      case 'engine':
        for (let i = 0; i < 14; i++) this.tone({ f: 60 + i * 3, dur: 0.08, vol: 0.2, type: 'square', at: now + i * 0.09 });
        this.noise({ dur: 1.4, vol: 0.18, f: 400, type: 'lowpass', attack: 0.2 });
        break;
      case 'vroom':
        this.tone({ f: 180, f2: 320, dur: 0.4, vol: 0.06, type: 'square', vibrato: 30 });
        this.tone({ f: 320, f2: 200, dur: 0.4, vol: 0.06, type: 'square', vibrato: 30, at: now + 0.4 });
        break;
      case 'grow':
        [0, 2, 4, 7, 9, 12].forEach((n, i) => this.tone({ f: midi(60 + n), dur: 0.2, vol: 0.08, type: 'triangle', at: now + i * 0.08 }));
        this.noise({ dur: 0.8, vol: 0.12, f: 900, f2: 2400, type: 'bandpass', q: 1, attack: 0.1 });
        break;
      case 'slice':
        this.noise({ dur: 0.5, vol: 0.5, f: 8000, f2: 400, type: 'bandpass', q: 0.8 });
        this.tone({ f: 2200, f2: 90, dur: 0.6, vol: 0.18, type: 'sawtooth' });
        break;
      case 'fire':
        this.noise({ dur: 1.6, vol: 0.45, f: 600, f2: 2400, type: 'bandpass', q: 0.6, attack: 0.15 });
        this.tone({ f: 90, f2: 160, dur: 1.4, vol: 0.2, type: 'sawtooth', vibrato: 12, attack: 0.15 });
        break;
      case 'cry':
        // Flamora: a high, ringing call
        this.tone({ f: 1100, f2: 1700, dur: 0.9, vol: 0.12, type: 'triangle', vibrato: 30, attack: 0.08 });
        this.tone({ f: 1650, f2: 2200, dur: 0.7, vol: 0.06, type: 'sine', vibrato: 20, attack: 0.08, at: now + 0.1 });
        break;
      case 'sparkle':
        [0, 7, 12, 19].forEach((n, i) => this.tone({ f: midi(84 + n), dur: 0.12, vol: 0.05, type: 'sine', at: now + i * 0.05 }));
        break;
      case 'register':
        this.tone({ f: 2000, dur: 0.05, vol: 0.08, type: 'square' });
        this.tone({ f: 2600, dur: 0.5, vol: 0.08, type: 'sine', at: now + 0.08 });
        break;
      // the spirit research facility: crackling energy, glass, old machines
      case 'zap':
        for (let i = 0; i < 5; i++) this.tone({ f: 900 + Math.random() * 1800, f2: 200, dur: 0.05, vol: 0.07, type: 'sawtooth', at: now + i * 0.035 });
        this.noise({ dur: 0.25, vol: 0.14, f: 3500, type: 'highpass' });
        break;
      case 'glass':
        this.noise({ dur: 0.7, vol: 0.3, f: 5000, type: 'highpass' });
        for (let i = 0; i < 8; i++) this.tone({ f: 2500 + Math.random() * 2500, dur: 0.07, vol: 0.05, type: 'sine', at: now + 0.05 + i * 0.06 });
        break;
      case 'hum':
        this.tone({ f: 60, dur: 1.6, vol: 0.12, type: 'sawtooth', attack: 0.3 });
        this.tone({ f: 120, dur: 1.6, vol: 0.05, type: 'square', attack: 0.3 });
        break;
      case 'breaker':
        this.tone({ f: 300, f2: 120, dur: 0.08, vol: 0.16, type: 'square' });
        this.noise({ dur: 0.12, vol: 0.18, f: 1500, type: 'lowpass' });
        break;
      case 'powerup':
        this.tone({ f: 50, f2: 400, dur: 1.4, vol: 0.12, type: 'sawtooth', attack: 0.1 });
        this.tone({ f: 100, f2: 800, dur: 1.4, vol: 0.05, type: 'square', attack: 0.1 });
        break;
      case 'powerdown':
        this.tone({ f: 400, f2: 40, dur: 1.2, vol: 0.12, type: 'sawtooth' });
        break;
    }
  }

  /** Short dialogue blip (pitch varies per speaker). */
  blip(pitch: number) {
    if (!this.ready) return;
    this.tone({ f: pitch, dur: 0.03, vol: 0.05, type: 'square' });
  }

  // ------------------------------------------------------------ ambience

  startAmbience() {
    if (!this.ctx || this.ambNodes.length) return;
    const c = this.ctx;
    const mk = (type: BiquadFilterType, f: number, vol: number) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = f;
      const gain = c.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(this.amb);
      src.start();
      return { src, gain, filter };
    };
    this.ambNodes.push(mk('lowpass', 420, 0.5)); // ocean body
    this.ambNodes.push(mk('highpass', 5000, 0.08)); // rain hiss
    this.amb.gain.setTargetAtTime(0.5, c.currentTime, 1.5);
    const swell = () => {
      if (!this.ctx) return;
      const sea = this.ambNodes[0];
      const t = this.ctx.currentTime;
      sea.gain.gain.setTargetAtTime(0.25 + Math.random() * 0.45 * this.storm, t, 1.2);
      sea.filter.frequency.setTargetAtTime(300 + Math.random() * 400 * this.storm, t, 1.5);
      window.setTimeout(swell, 1800 + Math.random() * 1500);
    };
    swell();
  }

  /** Background soundscape per area. The rain hiss keeps its reduced level outdoors. */
  setAmbience(profile: string) {
    this.ambProfile = profile;
    if (!this.ctx || this.ambNodes.length < 2) return;
    const t = this.ctx.currentTime;
    const [sea, rain] = this.ambNodes;
    const outdoor = profile === 'town' || profile === 'farm' || profile === 'coast' || profile === 'park';
    const levels: Record<string, [number, number]> = {
      town: [0.5, 0.08],
      farm: [0.35, 0.08],
      indoor: [0.12, 0.0],
      store: [0.06, 0.0],
      mansion: [0.18, 0.02],
      cave: [0.25, 0.0],
      cellar: [0.1, 0.0],
      coast: [0.55, 0.0],
      park: [0.3, 0.0],
      deep: [0.2, 0.0],
      gods: [0.18, 0.0],
      // out on the open water between islands
      sea: [0.62, 0.0],
      seastorm: [0.72, 0.1],
      seafog: [0.4, 0.0],
      title: [0.32, 0.0],
      // World 4: a still night, almost no sea; the crickets carry it
      island: [0.14, 0.0],
      forest: [0.1, 0.0],
      // boss fights: the storm stays audible, but well under the music
      battle: [0.26, 0.035],
    };
    const [amb, rainV] = levels[profile] ?? [0.5, 0.08];
    this.amb.gain.setTargetAtTime(amb, t, 0.8);
    rain.gain.gain.setTargetAtTime(rainV, t, 0.8);
    sea.filter.frequency.setTargetAtTime(outdoor ? 420 : 220, t, 0.8);
    if (this.ambTimer !== null) window.clearTimeout(this.ambTimer);
    const tick = () => {
      const p = this.ambProfile;
      if (p === 'cave' || p === 'cellar') this.play(Math.random() < 0.8 ? 'drip' : 'creak');
      else if (p === 'mansion') this.play(Math.random() < 0.6 ? 'creak' : 'ghost');
      else if (p === 'coast' || p === 'sea') this.play(Math.random() < 0.6 ? 'gull' : 'creak');
      else if (p === 'seastorm') this.play(Math.random() < 0.4 ? 'creak' : Math.random() < 0.5 ? 'wave' : 'thunder_far');
      else if (p === 'seafog') this.play(Math.random() < 0.5 ? 'creak' : Math.random() < 0.5 ? 'bell' : 'ghost');
      else if (p === 'title') this.play(Math.random() < 0.5 ? 'wave' : 'creak');
      else if (p === 'park') this.play(Math.random() < 0.6 ? 'creakmetal' : 'gull');
      else if (p === 'deep') this.play(Math.random() < 0.5 ? 'sonar' : 'bubbles');
      else if (p === 'gods') this.play(Math.random() < 0.7 ? 'drip' : 'stone');
      else if (p === 'island' || p === 'forest') {
        this.play('cricket');
        window.setTimeout(() => this.ambProfile === p && this.play('cricket'), 300 + Math.random() * 500);
        if (p === 'forest' && Math.random() < 0.15) this.play('crow');
      } else if (p === 'farm' || p === 'town') {
        if (Math.random() < 0.5) this.play('crow');
      }
      this.ambTimer = window.setTimeout(tick, p === 'island' || p === 'forest' ? 900 + Math.random() * 1600 : 3500 + Math.random() * 6000);
    };
    if (profile !== 'indoor' && profile !== 'store' && profile !== 'battle') this.ambTimer = window.setTimeout(tick, 2500);
  }

  setStorm(level: number) {
    this.storm = level;
    if (!this.ctx || !this.ambNodes[1]) return;
    // the storm only rises in boss fights, where the music has to stay on top: keep the rain hiss low there
    const mix = this.ambProfile === 'battle' ? 0.4 : 1;
    this.ambNodes[1].gain.gain.setTargetAtTime((0.055 + level * 0.04) * mix, this.ctx.currentTime, 1);
  }

  // ------------------------------------------------------------ music

  /** Overworld songs (see songs.ts). Passing the current song is a no-op. */
  playSong(name: string | null) {
    if (!this.ctx) {
      this.songName = name ?? '';
      return;
    }
    if (name === this.songName && this.musicTimer !== null) return;
    this.songName = name ?? '';
    this.song = name ? SONGS[name] ?? null : null;
    // the Grim Reaper's fights play louder than everything else
    this.music?.gain.setTargetAtTime(MUSIC_BASE * (name ? SONG_GAIN[name] ?? 1 : 1), this.ctx.currentTime, 0.2);
    if (!this.song) {
      this.stopMusic();
      return;
    }
    this.step = 0;
    this.introStep = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (this.musicTimer === null) this.musicTimer = window.setInterval(() => this.schedule(), 25);
  }

  /** Where we are in the current song's one-shot intro (past its end once the loop has started). */
  private introStep = 0;
  /** The Dutchman's procedural theme gets an opening hit too. */
  private dutchIntro = 0;

  startMusic(phase: number) {
    if (!this.ctx) return;
    this.music?.gain.setTargetAtTime(MUSIC_BASE, this.ctx.currentTime, 0.2);
    if (this.song) {
      this.song = null;
      this.songName = '';
      this.stopMusic();
    }
    this.musicPhase = phase;
    if (this.musicTimer !== null) return;
    this.step = 0;
    this.dutchIntro = DUTCH_INTRO.steps;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 25);
  }

  setMusicPhase(phase: number) {
    // a harder phase comes in on a drum roll, from the top of the bar
    if (phase > this.musicPhase && !this.song) {
      this.dutchIntro = DUTCH_LIFT.steps;
      this.step = 0;
    }
    this.musicPhase = phase;
  }

  stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.song = null;
    this.songName = '';
  }

  private schedule() {
    if (!this.ctx) return;
    if (this.song) {
      const sixteenth = 60 / this.song.bpm / 4;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        const intro = this.song.intro;
        if (intro && this.introStep < intro.steps) {
          if (this.enabled) this.playParts(intro.parts, this.introStep, this.nextTime, sixteenth);
          this.introStep++;
        } else {
          if (this.enabled) this.playSongStep(this.song, this.step, this.nextTime, sixteenth);
          this.step = (this.step + 1) % this.song.steps;
        }
        this.nextTime += sixteenth;
      }
      return;
    }
    const bpm = [0, 96, 112, 132][this.musicPhase] || 96;
    const sixteenth = 60 / bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      if (this.dutchIntro > 0) {
        const intro = this.musicPhase > 1 ? DUTCH_LIFT : DUTCH_INTRO;
        if (this.enabled) this.playParts(intro.parts, intro.steps - this.dutchIntro, this.nextTime, sixteenth);
        this.dutchIntro--;
      } else {
        if (this.enabled) this.playStep(this.step, this.nextTime, sixteenth);
        this.step = (this.step + 1) % 64;
      }
      this.nextTime += sixteenth;
    }
  }

  private playSongStep(song: Song, s: number, t: number, len: number) {
    this.playParts(song.parts, s, t, len);
  }

  private playParts(parts: Part[], s: number, t: number, len: number) {
    for (const p of parts) {
      const i = s % p.notes.length;
      const n = p.notes[i];
      if (n === null) continue;
      if (p.wave === 'crash') this.noise({ dur: 0.9, vol: p.vol, f: 5000, f2: 2500, type: 'highpass', at: t, bus: 'music' });
      else if (p.wave === 'boom') {
        // a deep, long timpani-like hit with a little noise on the front of it
        this.tone({ f: 110, f2: 32, dur: 0.45, vol: p.vol, type: 'sine', at: t, bus: 'music' });
        this.noise({ dur: 0.12, vol: p.vol * 0.3, f: 500, type: 'lowpass', at: t, bus: 'music' });
      } else if (p.wave === 'kick') this.tone({ f: 140, f2: 40, dur: 0.12, vol: p.vol, type: 'sine', at: t, bus: 'music' });
      else if (p.wave === 'hat') this.noise({ dur: 0.03, vol: p.vol, f: 8000, type: 'highpass', at: t, bus: 'music' });
      else if (p.wave === 'snare') this.noise({ dur: 0.1, vol: p.vol, f: 1800, type: 'bandpass', at: t, bus: 'music' });
      else this.tone({ f: midi(n), dur: len * p.lens[i] * 0.95, vol: p.vol, type: p.wave, at: t, bus: 'music', vibrato: p.vibrato, attack: 0.01 });
    }
  }

  private playStep(s: number, t: number, len: number) {
    const ph = this.musicPhase;
    const bar = Math.floor(s / 16) % 4;
    const st = s % 16;
    // bass: phrygian D, eighth notes
    const BASS = [
      [38, 38, 50, 38, 41, 38, 39, 38],
      [38, 38, 50, 38, 36, 36, 34, 36],
      [38, 38, 50, 38, 41, 43, 44, 43],
      [38, 39, 38, 36, 34, 33, 34, 36],
    ];
    if (st % 2 === 0) {
      const n = BASS[bar][st / 2];
      this.tone({ f: midi(n), dur: len * 1.8, vol: 0.32, type: 'triangle', at: t, bus: 'music' });
    }
    // lead melody
    const LEAD: Record<number, [number, number]>[] = [
      { 0: [62, 6], 6: [65, 2], 8: [69, 4], 12: [70, 4] },
      { 0: [69, 6], 6: [67, 2], 8: [65, 4], 12: [63, 4] },
      { 0: [62, 6], 6: [65, 2], 8: [69, 3], 11: [72, 1], 12: [74, 4] },
      { 0: [75, 4], 4: [74, 4], 8: [70, 4], 12: [69, 4] },
    ];
    const ln = LEAD[bar][st];
    if (ln && (ph >= 2 || bar % 2 === 0 || st < 8))
      this.tone({ f: midi(ln[0] + (ph === 3 ? 12 : 0)), dur: len * ln[1] * 0.95, vol: 0.09, type: 'square', at: t, bus: 'music', vibrato: 3 });
    // arpeggio from phase 2
    if (ph >= 2) {
      const ARP = [74, 69, 65, 69, 74, 77, 75, 69];
      this.tone({ f: midi(ARP[st % 8] + (bar === 3 ? -2 : 0)), dur: len * 0.8, vol: 0.035, type: 'square', at: t, bus: 'music' });
    }
    // drums
    if (st % 4 === 0) this.tone({ f: 140, f2: 40, dur: 0.12, vol: ph >= 2 ? 0.5 : 0.35, type: 'sine', at: t, bus: 'music' });
    if (st % 2 === 0) this.noise({ dur: 0.03, vol: 0.06, f: 8000, type: 'highpass', at: t, bus: 'music' });
    if (ph >= 2 && (st === 4 || st === 12)) this.noise({ dur: 0.12, vol: 0.2, f: 1800, type: 'bandpass', at: t, bus: 'music' });
    if (ph === 3 && bar === 3 && st >= 12) this.noise({ dur: 0.06, vol: 0.15, f: 2200, type: 'bandpass', at: t, bus: 'music' });
  }
}

export const sound = new SoundSystem();
