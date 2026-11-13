// A tiny palette-indexed raster used to paint every sprite in the game.
// Colors are indices into the 5-shade monochrome palette; -1 is transparent.

export const PAL_RGB: [number, number, number][] = [
  [0, 0, 0],
  [64, 64, 64],
  [128, 128, 128],
  [191, 191, 191],
  [255, 255, 255],
];
export const PAL_HEX = [0x000000, 0x404040, 0x808080, 0xbfbfbf, 0xffffff];
export const BLACK = 0;
export const DARK = 1;
export const MID = 2;
export const LIGHT = 3;
export const WHITE = 4;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number) => BAYER4[(y & 3) * 4 + (x & 3)] / 16;

export type Pt = [number, number];

export class PC {
  readonly w: number;
  readonly h: number;
  data: Int8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Int8Array(w * h).fill(-1);
  }

  px(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.data[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }

  /** 1px rectangle outline. */
  frame(x: number, y: number, w: number, h: number, c: number) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  /** Ordered dither fill: `amount` (0..1) of pixels get colour c. */
  dither(x: number, y: number, w: number, h: number, c: number, amount: number, onlyOpaque = false) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const X = x + i;
        const Y = y + j;
        if (onlyOpaque && this.get(X, Y) < 0) continue;
        if (bayer(X, Y) < amount) this.px(X, Y, c);
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  thick(x0: number, y0: number, x1: number, y1: number, c: number, t = 2) {
    for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) this.line(x0 + i, y0 + j, x1 + i, y1 + j, c);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let y = -ry; y <= ry; y++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2));
      for (let x = Math.round(-half); x <= Math.round(half); x++) this.px(cx + x, cy + y, c);
    }
  }

  ring(cx: number, cy: number, rx: number, ry: number, c: number) {
    const steps = Math.max(24, Math.round((rx + ry) * 4));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      this.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, c);
    }
  }

  circle(cx: number, cy: number, r: number, c: number) {
    this.ellipse(cx, cy, r, r, c);
  }

  /** Even-odd scanline polygon fill. */
  poly(pts: Pt[], c: number) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      const sy = y + 0.5;
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
  }

  /** Shade a filled ellipse like a lit sphere using a colour ramp and dithering. */
  sphere(cx: number, cy: number, rx: number, ry: number, ramp: number[], light: [number, number] = [-0.55, -0.65]) {
    const lz = Math.sqrt(Math.max(0, 1 - light[0] ** 2 - light[1] ** 2));
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        const nx = x / (rx + 0.5);
        const ny = y / (ry + 0.5);
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const nz = Math.sqrt(1 - d);
        const l = Math.max(0, nx * light[0] + ny * light[1] + nz * lz);
        this.px(cx + x, cy + y, rampPick(ramp, l, cx + x, cy + y));
      }
  }

  /** Re-shade existing opaque pixels by a function returning brightness 0..1. */
  shade(fn: (x: number, y: number) => number | null, ramp: number[]) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) < 0) continue;
        const v = fn(x, y);
        if (v === null) continue;
        this.px(x, y, rampPick(ramp, v, x, y));
      }
  }

  /** 1px outline around every opaque pixel (4-neighbourhood). */
  outline(c = BLACK, diag = false) {
    const src = this.data.slice();
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : src[y * this.w + x]);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (at(x, y) >= 0) continue;
        let n = at(x - 1, y) >= 0 || at(x + 1, y) >= 0 || at(x, y - 1) >= 0 || at(x, y + 1) >= 0;
        if (!n && diag) n = at(x - 1, y - 1) >= 0 || at(x + 1, y - 1) >= 0 || at(x - 1, y + 1) >= 0 || at(x + 1, y + 1) >= 0;
        if (n) this.data[y * this.w + x] = c;
      }
  }

  /** Stamp a string sprite. '.' or ' ' = skip, '0'-'4' = palette, 'x' = erase. */
  stamp(rows: string[], x: number, y: number, map: Record<string, number> = {}) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        if (ch === 'x') {
          this.px(x + i, y + j, -1);
          continue;
        }
        const c = ch in map ? map[ch] : Number(ch);
        if (!Number.isNaN(c)) this.px(x + i, y + j, c);
      }
    });
  }

  replace(from: number, to: number) {
    for (let i = 0; i < this.data.length; i++) if (this.data[i] === from) this.data[i] = to;
  }

  /** Map every opaque colour through `fn`. */
  remap(fn: (c: number, x: number, y: number) => number) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (c >= 0) this.data[y * this.w + x] = fn(c, x, y);
      }
  }

  blit(src: PC, dx: number, dy: number) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c >= 0) this.px(dx + x, dy + y, c);
      }
  }

  flipX(): PC {
    const o = new PC(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.data[y * this.w + x] = this.get(this.w - 1 - x, y);
    return o;
  }

  copy(): PC {
    const o = new PC(this.w, this.h);
    o.data = this.data.slice();
    return o;
  }

  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      if (c < 0) continue;
      const [r, g, b] = PAL_RGB[c];
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

export function rampPick(ramp: number[], v: number, x: number, y: number): number {
  const f = Math.max(0, Math.min(0.9999, v)) * (ramp.length - 1);
  const base = Math.floor(f);
  const frac = f - base;
  return bayer(x, y) < frac ? ramp[Math.min(ramp.length - 1, base + 1)] : ramp[base];
}

/** Deterministic pseudo-random for art generation (stable sprites every launch). */
export function artRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Sheet of equally sized frames laid out horizontally. */
export function sheet(frames: PC[]): PC {
  const w = frames[0].w;
  const h = frames[0].h;
  const s = new PC(w * frames.length, h);
  frames.forEach((f, i) => s.blit(f, i * w, 0));
  return s;
}
