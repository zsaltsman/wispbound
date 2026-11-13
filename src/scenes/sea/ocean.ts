import Phaser from 'phaser';
import { PAL_RGB, bayer } from '../../gfx/pixel';

// The open sea, drawn live: a perspective plane of moving water from the horizon down to the
// bottom of the screen, rendered at half resolution into a canvas every frame and quantised
// to the five shades with the same ordered dither as the rest of the art.

export interface Mood {
  night: boolean;
  /** How rough the water is, 0 (glass) to 1 (storm). */
  chop: number;
  /** Fog: 0 none, 1 thick. The water fades into grey with distance. */
  fog: number;
  /** A moon or sun on the water: its bearing (radians, world) and how wide the glitter path is. */
  light?: { az: number; width: number };
}

/** Distance of a row below the horizon: d = DEPTH / rows-below. */
export const DEPTH = 900;
/** Focal length in screen pixels (lateral offset = (x - centre) * d / FOCAL). */
export const FOCAL = 200;

const LUT = PAL_RGB.map(([r, g, b]) => (255 << 24) | (b << 16) | (g << 8) | r);

export class Ocean {
  readonly img: Phaser.GameObjects.Image;
  private tex: Phaser.Textures.CanvasTexture;
  private data: ImageData;
  private buf: Uint32Array;
  readonly lw: number;
  readonly lh: number;

  /** `top` is the horizon's screen y; the sea fills `w` x `h` screen pixels below it. */
  constructor(
    scene: Phaser.Scene,
    key: string,
    readonly top: number,
    readonly w: number,
    readonly h: number,
    readonly k = 2,
    /** Camera height, as DEPTH: larger looks down on the water from higher up. */
    readonly depth = DEPTH
  ) {
    this.lw = Math.ceil(w / k);
    this.lh = Math.ceil(h / k);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.tex = scene.textures.createCanvas(key, this.lw, this.lh)!;
    const ctx = this.tex.getContext();
    this.data = ctx.createImageData(this.lw, this.lh);
    this.buf = new Uint32Array(this.data.data.buffer);
    this.img = scene.add.image(0, top, key).setOrigin(0, 0).setScale(k);
  }

  /**
   * Draw the water as seen from (px, pz) looking along `heading` (0 = +z, "north").
   * `wake` adds foam trailing back from a boat at screen (x, y) moving at `speed` (0..1).
   */
  render(px: number, pz: number, heading: number, t: number, m: Mood, wake?: { x: number; y: number; speed: number; turn: number }) {
    const { lw, lh, k, buf } = this;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const rx = Math.cos(heading), rz = -Math.sin(heading);
    const cx = this.w / 2;
    const chop = m.chop;
    const lightX = m.light ? cx + wrapAngle(m.light.az - heading) * FOCAL : -999;
    const sc = this.depth / DEPTH;
    const hi = sc > 1.5;
    for (let j = 0; j < lh; j++) {
      const dy = (j + 0.5) * k;
      const d = this.depth / dy;
      // detail fades out toward the horizon (and the haze takes over)
      const amp = Math.max(0, 1 - d / (1400 * sc));
      const haze = Math.max(0, 1 - dy / 46);
      const fogMix = m.fog > 0 ? Math.min(1, (d / (900 * sc)) * m.fog) : 0;
      // seen from higher up, the near water has small ripples of its own
      const near = hi ? Math.min(1, dy / 70) : 0;
      const ox = px + fx * d, oz = pz + fz * d;
      const sy = Math.round(j * k + this.top);
      for (let i = 0; i < lw; i++) {
        const sx = (i + 0.5) * k;
        const lat = ((sx - cx) * d) / FOCAL;
        const wx = ox + rx * lat;
        const wz = oz + rz * lat;
        const wave =
          Math.sin(wx * 0.045 + t * 0.7) * 0.42 +
          Math.sin(wz * 0.06 + wx * 0.021 - t * 1.1) * 0.36 +
          Math.sin((wx - wz) * 0.11 + t * (1.4 + chop)) * (0.12 + chop * 0.22) +
          (near ? Math.sin(wx * 0.31 + wz * 0.23 + t * 2.3) * Math.sin(wz * 0.27 - wx * 0.12 - t * 1.7) * near * (0.3 + chop * 0.2) : 0);
        let b = m.night ? 0.16 : 0.4;
        b += wave * amp * (0.1 + chop * 0.06);
        b += haze * (m.night ? 0.22 : 0.42);
        // crests: whitecaps when it is rough, a fine sparkle when it is calm
        if (wave * amp > (hi ? 0.8 - chop * 0.14 : 0.62 - chop * 0.22)) b = m.night ? 0.62 : 0.86;
        // the moon's (or sun's) path of glitter across the water
        if (m.light) {
          const half = m.light.width * (0.4 + dy / 60);
          if (Math.abs(sx - lightX) < half && wave > 0.2 - (half - Math.abs(sx - lightX)) / half * 0.3) b = Math.max(b, m.night ? 0.8 : 0.98);
        }
        if (fogMix > 0) b = b + (0.5 - b) * fogMix;
        buf[j * lw + i] = LUT[pick(b, i, j + sy)];
      }
    }
    if (wake && wake.speed > 0.02) this.foam(wake);
    this.tex.getContext().putImageData(this.data, 0, 0);
    this.tex.refresh();
  }

  /** A V of foam spreading back from the boat's stern toward you. */
  private foam(wk: { x: number; y: number; speed: number; turn: number }) {
    const { lw, lh, k, buf } = this;
    const j0 = Math.floor((wk.y - this.top) / k);
    const len = 10 + wk.speed * 34;
    for (let j = Math.max(0, j0); j < lh && j < j0 + len; j++) {
      const n = j - j0;
      const fade = 1 - n / len;
      const spread = 4 + n * (0.7 + wk.speed * 0.5);
      const drift = -wk.turn * n * 0.6;
      for (const s of [-1, 1]) {
        const x = Math.round(wk.x / k + drift + s * spread + Math.sin(n * 0.9 + s) * 0.8);
        for (let q = -1; q <= 1; q++) {
          const i = x + q;
          if (i < 0 || i >= lw) continue;
          if (bayer(i, j) < fade * (q === 0 ? 1 : 0.5)) buf[j * lw + i] = LUT[q === 0 && fade > 0.5 ? 4 : 3];
        }
      }
      // the churned water right behind the stern
      if (n < len * 0.5) {
        const c = Math.round(wk.x / k + drift);
        for (let q = -2; q <= 2; q++) if (bayer(c + q, j + n) < fade * 0.5 && c + q >= 0 && c + q < lw) buf[j * lw + c + q] = LUT[3];
      }
    }
  }
}

function pick(v: number, x: number, y: number) {
  const f = Math.max(0, Math.min(0.9999, v)) * 4;
  const base = Math.floor(f);
  return bayer(x, y) < f - base ? Math.min(4, base + 1) : base;
}

export function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
