import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer, rampPick, type Pt } from './pixel';
import { skull } from './artBoss';

// Storm, sea, debris and every combat effect.

// ------------------------------------------------------------------ noise

function valueNoise(seed: number, period: number) {
  const rng = artRng(seed);
  const g = Array.from({ length: period * period }, () => rng());
  const at = (x: number, y: number) => g[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = sm(x - xi);
    const ty = sm(y - yi);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * tx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * tx;
    return a + (b - a) * ty;
  };
}

function fbm(n: (x: number, y: number) => number, x: number, y: number, oct = 4) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += n(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

// ------------------------------------------------------------------ sky + storm

export function sky(): PC {
  const W = 640;
  const H = 230;
  const p = new PC(W, H);
  const n = valueNoise(7, 32);
  const horizon = 150;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // base gradient: black zenith, faint pale band on the horizon
      let v = 0.04 + Math.max(0, (y - 40) / (horizon - 40)) * 0.32;
      if (y > horizon - 18) v += ((y - (horizon - 18)) / 18) * 0.18;
      // storm clouds
      const c = fbm(n, x / 40, y / 22);
      const dens = Math.max(0, c - 0.42) * 2.4;
      v = v * (1 - Math.min(1, dens)) + dens * (0.18 + (1 - y / H) * 0.12);
      // lit cloud rims
      const rim = fbm(n, x / 40, (y - 2) / 22);
      if (rim < c - 0.035 && dens > 0.1) v += 0.16;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT], Math.min(1, v * 0.95), x, y));
    }
  return p;
}

export function moon(): PC {
  const p = new PC(30, 30);
  p.sphere(15, 15, 12, 12, [MID, LIGHT, WHITE], [-0.3, -0.4]);
  for (const [x, y, r] of [
    [10, 11, 2],
    [18, 18, 3],
    [17, 8, 1],
    [9, 19, 1],
  ])
    p.circle(x, y, r, MID);
  return p;
}

/** Tileable cloud band with transparent gaps. */
export function clouds(seed: number, W: number, H: number, dark: boolean): PC {
  const p = new PC(W, H);
  const period = 16;
  const n = valueNoise(seed, period);
  const sx = period / W;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = fbm(n, x * sx * 2, y / 14 + 3, 3);
      const edge = Math.min(1, y / 8, (H - 1 - y) / 10);
      const d = (c - 0.45) * 3 * edge;
      if (d <= 0) continue;
      const top = fbm(n, x * sx * 2, (y - 3) / 14 + 3, 3);
      let v = dark ? 0.1 + d * 0.12 : 0.16 + d * 0.16;
      if (top < c - 0.03) v += dark ? 0.1 : 0.2;
      if (d < 0.18 && bayer(x, y) > d * 5) continue;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT], v, x, y));
    }
  return p;
}

export function lightningBolt(seed: number): PC {
  const W = 70;
  const H = 150;
  const p = new PC(W, H);
  const rng = artRng(seed);
  const branch = (x: number, y: number, len: number, w: number) => {
    for (let i = 0; i < len && y < H; i++) {
      const nx = x + Math.round((rng() - 0.5) * 6);
      const ny = y + 3 + Math.floor(rng() * 4);
      p.thick(x, y, nx, ny, WHITE, w);
      if (rng() < 0.12 && w > 1) branch(nx, ny, Math.floor(len / 3), 1);
      x = Math.max(2, Math.min(W - 3, nx));
      y = ny;
    }
  };
  branch(35, 0, 40, 2);
  p.outline(LIGHT);
  return p;
}

// ------------------------------------------------------------------ sea

/** Tileable wave strip. amp/height control size; level = base darkness. */
export function seaStrip(seed: number, W: number, H: number, amp: number, crest: number, base: number): PC {
  const p = new PC(W, H);
  const rng = artRng(seed);
  const k1 = (Math.PI * 2 * 6) / W;
  const k2 = (Math.PI * 2 * 13) / W;
  const k3 = (Math.PI * 2 * 29) / W;
  const o1 = rng() * 6;
  const o2 = rng() * 6;
  for (let x = 0; x < W; x++) {
    const s = Math.sin(x * k1 + o1) * 0.55 + Math.sin(x * k2 + o2) * 0.3 + Math.sin(x * k3) * 0.15;
    const top = Math.round(amp + 1 - s * amp);
    for (let y = top; y < H; y++) {
      const depth = (y - top) / Math.max(1, H - top);
      let v = base + 0.14 - depth * 0.18;
      if (y - top < crest) v = 0.62 + (s > 0.35 ? 0.4 : 0.1);
      else if (y - top < crest + 2) v = 0.36;
      // streaks across the swell
      if ((y * 17 + Math.floor(x / 9) * 31) % 23 === 0) v += 0.18;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT, WHITE], Math.max(0, v), x, y));
    }
    if (s > 0.55 && rng() < 0.3) p.px(x, top - 1, WHITE);
  }
  return p;
}

export function seaBase(): PC {
  const W = 720;
  const H = 280;
  const p = new PC(W, H);
  const n = valueNoise(99, 64);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = 0.14 + fbm(n, x / 30, y / 6, 3) * 0.16 - (y / H) * 0.05;
      if (y < 6) v += 0.15 - y * 0.025;
      p.px(x, y, rampPick([BLACK, DARK, MID], v, x, y));
    }
  return p;
}

// ------------------------------------------------------------------ props

export function raft(): PC {
  const p = new PC(64, 14);
  for (let i = 0; i < 6; i++) {
    const x = 4 + i * 9;
    const y = 4 + (i % 2);
    p.rect(x, y, 8, 5, i % 2 ? DARK : MID);
    p.line(x, y, x + 7, y, LIGHT);
    p.px(x + 2, y + 2, BLACK);
  }
  p.rect(2, 9, 60, 2, DARK);
  p.line(10, 3, 54, 3, DARK);
  p.px(30, 2, MID);
  p.outline(BLACK);
  return p;
}

export function barrel(): PC {
  const p = new PC(14, 12);
  p.ellipse(7, 6, 6, 5, DARK);
  p.shade((x) => (x < 6 ? 0.7 : 0.3), [BLACK, DARK, MID]);
  p.line(2, 3, 2, 9, BLACK);
  p.line(11, 3, 11, 9, BLACK);
  p.line(7, 1, 7, 11, MID);
  p.outline(BLACK);
  return p;
}

export function plank(): PC {
  const p = new PC(22, 6);
  p.poly(
    [
      [1, 2],
      [20, 1],
      [21, 4],
      [2, 5],
    ],
    MID
  );
  p.line(1, 2, 20, 1, LIGHT);
  p.px(6, 3, BLACK);
  p.px(15, 3, BLACK);
  p.outline(BLACK);
  return p;
}

export function crate(): PC {
  const p = new PC(12, 12);
  p.rect(1, 1, 10, 10, DARK);
  p.line(1, 1, 10, 10, MID);
  p.line(1, 10, 10, 1, MID);
  p.rect(1, 1, 10, 1, LIGHT);
  p.outline(BLACK);
  return p;
}

export function brokenMast(): PC {
  const p = new PC(34, 10);
  p.thick(1, 5, 30, 3, DARK, 3);
  p.line(1, 5, 30, 3, MID);
  p.line(30, 1, 33, 6, DARK);
  p.poly(
    [
      [12, 5],
      [20, 4],
      [22, 9],
      [14, 9],
    ],
    LIGHT
  );
  p.outline(BLACK);
  return p;
}

export function rockSilhouette(): PC {
  const p = new PC(90, 30);
  p.poly(
    [
      [0, 30],
      [8, 18],
      [14, 20],
      [22, 8],
      [30, 14],
      [36, 4],
      [44, 12],
      [52, 10],
      [60, 20],
      [70, 16],
      [80, 24],
      [90, 30],
    ],
    BLACK
  );
  // ruined lighthouse
  p.rect(37, 0, 4, 6, BLACK);
  p.px(38, 1, LIGHT);
  return p;
}

// ------------------------------------------------------------------ effects

export function ghostBall(): PC {
  const p = new PC(11, 11);
  p.sphere(5, 5, 4, 4, [MID, LIGHT, WHITE]);
  p.px(4, 5, BLACK);
  p.px(6, 5, BLACK);
  p.px(5, 7, BLACK);
  p.outline(BLACK);
  return p;
}

export function puff(f: number, size = 16): PC {
  const p = new PC(size, size);
  const r = size / 2 - 1;
  const fill = [0.85, 0.55, 0.28][f];
  const c = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5) / r;
      if (d > 1) continue;
      if (bayer(x, y) < fill * (1.1 - d * 0.6)) p.px(x, y, d < 0.5 ? WHITE : LIGHT);
    }
  return p;
}

export function boom(f: number): PC {
  const S = 40;
  const p = new PC(S, S);
  const c = S / 2;
  const r = 4 + f * 4;
  const fill = [1, 0.85, 0.6, 0.35, 0.15][f];
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r) continue;
      const inner = d < r - 3 - f;
      if (f > 1 && inner && d < r * 0.5) continue;
      if (bayer(x, y) < fill) p.px(x, y, f < 2 ? WHITE : inner ? LIGHT : WHITE);
    }
  if (f < 3)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + f * 0.3;
      p.line(c + Math.cos(a) * r, c + Math.sin(a) * r, c + Math.cos(a) * (r + 5), c + Math.sin(a) * (r + 5), WHITE);
    }
  return p;
}

export function splash(f: number): PC {
  const p = new PC(36, 30);
  const h = [8, 18, 24, 14][f];
  for (let k = -3; k <= 3; k++) {
    const x = 18 + k * 4;
    const hh = h - Math.abs(k) * 3;
    if (hh <= 0) continue;
    for (let y = 0; y < hh; y++) if (f < 3 || y % 2 === 0) p.px(x + Math.round(k * y * 0.12), 29 - y, y > hh - 3 ? WHITE : LIGHT);
  }
  if (f >= 2)
    for (let k = 0; k < 10; k++) p.px(4 + ((k * 7) % 28), 29 - h - ((k * 5) % 6), WHITE);
  return p;
}

export function spark(): PC {
  const p = new PC(7, 7);
  p.line(3, 0, 3, 6, WHITE);
  p.line(0, 3, 6, 3, WHITE);
  p.px(2, 2, LIGHT);
  p.px(4, 4, LIGHT);
  p.px(2, 4, LIGHT);
  p.px(4, 2, LIGHT);
  return p;
}

export function ring(size: number, thick: number, c = WHITE): PC {
  const p = new PC(size, size);
  const r = size / 2 - 1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5);
      if (d <= r && d > r - thick) p.px(x, y, c);
    }
  return p;
}

export function shieldBubble(): PC {
  const S = 64;
  const p = new PC(S, S);
  const c = S / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5) / (c - 1);
      if (d > 1) continue;
      if (d > 0.93) p.px(x, y, WHITE);
      else if (d > 0.82 && bayer(x, y) < 0.5) p.px(x, y, LIGHT);
      else if (bayer(x, y) < 0.07) p.px(x, y, WHITE);
    }
  // barnacle studs
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    p.circle(c + Math.cos(a) * (c - 4), c + Math.sin(a) * (c - 4), 1, LIGHT);
  }
  // glint
  p.line(14, 20, 20, 12, WHITE);
  return p;
}

export function hexagon(): PC {
  const S = 60;
  const p = new PC(S, S);
  const pts: Pt[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push([S / 2 + Math.cos(a) * 27, S / 2 + Math.sin(a) * 27]);
  }
  for (let k = 0; k < 6; k++) {
    const [x0, y0] = pts[k];
    const [x1, y1] = pts[(k + 1) % 6];
    p.thick(x0, y0, x1, y1, WHITE, 2);
  }
  for (let k = 0; k < 6; k++) p.line(S / 2, S / 2, pts[k][0], pts[k][1], LIGHT);
  return p;
}

export function rune(): PC {
  const p = new PC(9, 9);
  p.ring(4, 4, 4, 4, WHITE);
  p.line(4, 1, 4, 7, WHITE);
  p.line(1, 3, 7, 5, LIGHT);
  return p;
}

export function wailArc(): PC {
  const p = new PC(10, 18);
  for (let y = 0; y < 18; y++) {
    const x = Math.round(Math.sin((y / 17) * Math.PI) * 6);
    p.px(x + 1, y, WHITE);
    p.px(x + 2, y, LIGHT);
  }
  return p;
}

export function ghostBolt(): PC {
  const p = new PC(18, 11);
  p.ellipse(12, 5, 5, 4, WHITE);
  for (let x = 1; x < 9; x++) {
    const y = 5 + Math.round(Math.sin(x * 0.9) * 2);
    p.px(x, y, x < 4 ? MID : LIGHT);
    if (x > 4) p.px(x, y - 1, LIGHT);
  }
  p.px(13, 4, BLACK);
  p.px(15, 4, BLACK);
  p.px(14, 7, BLACK);
  p.outline(BLACK);
  return p;
}

export function bigSkull(): PC {
  const p = new PC(40, 40);
  skull(p, 20, 18, 15, LIGHT, true);
  p.outline(BLACK);
  return p;
}

export function moonFx(): PC {
  const p = new PC(34, 34);
  p.sphere(17, 17, 14, 14, [LIGHT, WHITE], [-0.4, -0.4]);
  p.ellipse(23, 13, 9, 11, -1); // crescent
  p.outline(LIGHT);
  return p;
}

export function kernel(): PC {
  const p = new PC(5, 7);
  p.ellipse(2, 3, 2, 3, LIGHT);
  p.px(1, 2, WHITE);
  p.outline(BLACK);
  return p;
}

export function plus(): PC {
  const p = new PC(7, 7);
  p.rect(2, 0, 3, 7, WHITE);
  p.rect(0, 2, 7, 3, WHITE);
  p.outline(BLACK);
  return p;
}

export function strawHand(): PC {
  const p = new PC(16, 12);
  for (let k = -2; k <= 2; k++) p.line(2, 6, 14, 6 + k * 2.5, k % 2 === 0 ? LIGHT : WHITE);
  p.ellipse(3, 6, 2, 2, MID);
  p.outline(BLACK);
  return p;
}

export function gear(f: number): PC {
  const p = new PC(13, 13);
  p.circle(6, 6, 4, LIGHT);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + f * (Math.PI / 8);
    p.rect(6 + Math.round(Math.cos(a) * 5), 6 + Math.round(Math.sin(a) * 5), 2, 2, LIGHT);
  }
  p.circle(6, 6, 1, BLACK);
  p.outline(BLACK);
  return p;
}

export function clockFace(): PC {
  const S = 72;
  const p = new PC(S, S);
  const c = S / 2;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5);
      if (d > c - 1) continue;
      if (d > c - 4) p.px(x, y, WHITE);
      else if (d > c - 6) p.px(x, y, LIGHT);
      else if (bayer(x, y) < 0.12) p.px(x, y, LIGHT);
    }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const r0 = c - 12;
    const r1 = c - 8;
    p.thick(c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * r1, c + Math.sin(a) * r1, WHITE, k % 3 === 0 ? 2 : 1);
  }
  return p;
}

export function clockHand(len: number): PC {
  const p = new PC(4, len);
  p.rect(1, 0, 2, len, WHITE);
  p.px(0, 2, LIGHT);
  p.px(3, 2, LIGHT);
  return p;
}

export function canopyFx(): PC {
  const p = new PC(80, 40);
  for (let x = -38; x <= 38; x++) {
    const topY = 36 - Math.round(Math.sqrt(1 - (x / 38.5) ** 2) * 32);
    p.px(40 + x, topY, WHITE);
    p.px(40 + x, topY + 1, LIGHT);
    for (let y = topY + 2; y < 37; y++) if (bayer(40 + x, y) < 0.12) p.px(40 + x, y, LIGHT);
  }
  for (let k = 0; k <= 6; k++) p.line(40, 4, 2 + k * 12.6, 36, LIGHT);
  return p;
}

export function slash(): PC {
  const S = 44;
  const p = new PC(S, S);
  for (let a = -1.2; a <= 1.2; a += 0.01) {
    const t = 1 - Math.abs(a) / 1.2;
    const r = 18;
    const w = Math.round(1 + t * 3);
    for (let k = 0; k < w; k++) p.px(S / 2 + Math.cos(a) * (r - k), S / 2 + Math.sin(a) * (r - k), k === 0 ? WHITE : LIGHT);
  }
  return p;
}

export function spinRing(f: number): PC {
  const S = 56;
  const p = new PC(S, S);
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * Math.PI * 2 + f * 0.7;
    for (let a = a0; a < a0 + 1.4; a += 0.02) {
      const r = 24 - (a - a0) * 3;
      p.px(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r * 0.55, WHITE);
      p.px(S / 2 + Math.cos(a) * (r - 1), S / 2 + Math.sin(a) * (r - 1) * 0.55, LIGHT);
    }
  }
  return p;
}

export function anchor(): PC {
  const p = new PC(44, 56);
  // ring
  p.ring(22, 5, 4, 4, LIGHT);
  p.ring(22, 5, 3, 3, MID);
  // stock
  p.rect(10, 11, 25, 3, LIGHT);
  p.circle(10, 12, 2, LIGHT);
  p.circle(34, 12, 2, LIGHT);
  // shank
  p.rect(20, 9, 5, 38, LIGHT);
  p.rect(23, 9, 2, 38, MID);
  // arms + flukes
  for (let a = 0.15; a < Math.PI - 0.15; a += 0.01) {
    const x = 22 - Math.cos(a) * 19;
    const y = 36 + Math.sin(a) * 14;
    p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, LIGHT);
  }
  p.poly(
    [
      [1, 33],
      [8, 36],
      [3, 43],
    ],
    WHITE
  );
  p.poly(
    [
      [43, 33],
      [36, 36],
      [41, 43],
    ],
    WHITE
  );
  p.poly(
    [
      [18, 49],
      [26, 49],
      [22, 55],
    ],
    WHITE
  );
  // cursed runes
  p.px(22, 20, BLACK);
  p.px(22, 26, BLACK);
  p.px(22, 32, BLACK);
  p.outline(BLACK);
  return p;
}

export function sailor(f: number): PC {
  const p = new PC(22, 30);
  const cx = 11;
  // wispy lower body
  for (let y = 18; y < 30; y++) {
    const w = Math.max(0, 6 - Math.floor((y - 18) / 2));
    const off = Math.round(Math.sin(y * 0.6 + f * 2) * 1.5);
    for (let x = cx - w; x <= cx + w; x++) if ((x + y + f) % 2 === 0 || y < 22) p.px(x + off, y, LIGHT);
  }
  // torso
  p.poly(
    [
      [cx - 5, 11],
      [cx + 5, 11],
      [cx + 6, 20],
      [cx - 6, 20],
    ],
    LIGHT
  );
  for (let y = 12; y < 20; y += 3) p.line(cx - 5, y, cx + 5, y, MID); // striped shirt
  // skull head + bandana
  p.sphere(cx, 7, 4, 4, [MID, LIGHT, WHITE]);
  p.rect(cx - 4, 2, 9, 3, MID);
  p.line(cx + 4, 3, cx + 7, 5 + f, MID);
  p.px(cx - 2, 7, BLACK);
  p.px(cx + 1, 7, BLACK);
  p.line(cx - 1, 10, cx + 1, 10, BLACK);
  // cutlass arm
  const up = f === 1;
  p.thick(cx + 5, 12, cx + 8, up ? 6 : 14, LIGHT, 2);
  p.line(cx + 9, up ? 5 : 14, cx + 12, up ? -1 : 8, WHITE);
  p.line(cx + 10, up ? 5 : 14, cx + 13, up ? 0 : 9, LIGHT);
  p.outline(BLACK);
  return p;
}

export function tidalWave(): PC {
  const W = 360;
  const H = 170;
  const FACE = 80;
  const p = new PC(W, H);
  const rng = artRng(808);
  // steep front face on the left, a long swell behind it
  const topAt = (x: number) =>
    x < FACE
      ? Math.round(H - 8 - Math.pow(x / FACE, 0.55) * (H - 34))
      : Math.round(26 + ((x - FACE) / (W - FACE)) * 50 + Math.sin(x * 0.07) * 4);
  for (let x = 0; x < W; x++) {
    const top = topAt(x);
    for (let y = top; y < H; y++) {
      const depth = (y - top) / (H - top);
      let v = 0.24 - depth * 0.22;
      if (Math.sin(x * 0.35 + Math.sin(y * 0.06) * 3) > 0.92) v += 0.22; // falling streaks
      if (x < FACE && y - top < 14) v += 0.25 * (1 - (y - top) / 14);
      if (y - top < 3) v = 0.95;
      else if (y - top < 6) v = 0.62;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT, WHITE], Math.max(0, v), x, y));
    }
  }
  // the curling lip, hanging out over the face
  for (let a = 0; a < Math.PI * 1.05; a += 0.004) {
    const r = 30 - a * 7;
    const x = FACE + 2 - Math.sin(a) * r * 1.5;
    const y = 30 - Math.cos(a) * r * 0.8 + r * 0.8 - 22;
    for (let k = 0; k < 7; k++) p.px(x + k * 0.6, y + k, k < 2 ? WHITE : k < 4 ? LIGHT : MID);
  }
  // foam spray off the crest
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rng() * W);
    const top = topAt(x);
    p.px(x - Math.floor(rng() * 8), Math.round(top - rng() * 14), rng() < 0.6 ? WHITE : LIGHT);
  }
  p.outline(BLACK);
  return p;
}

export function whirl(f: number): PC {
  const W = 220;
  const H = 64;
  const p = new PC(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2);
      const dy = (y - H / 2) / (H / 2);
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const a = Math.atan2(dy, dx);
      const s = Math.sin(a * 3 + d * 14 - f * 1.6);
      let v = 0.2 - (1 - d) * 0.2;
      if (s > 0.6) v = 0.55 + d * 0.3;
      if (d < 0.12) v = 0;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT, WHITE], v, x, y));
    }
  return p;
}

export function bigCannon(): PC {
  const p = new PC(56, 28);
  p.rect(10, 7, 40, 14, LIGHT);
  p.shade((x, y) => 0.95 - Math.abs(y - 11) / 9, [MID, LIGHT, WHITE]);
  p.rect(48, 4, 8, 20, LIGHT);
  p.rect(2, 9, 10, 10, MID);
  for (const x of [18, 30, 42]) p.rect(x, 7, 2, 14, MID);
  skull(p, 26, 14, 4, WHITE, false);
  p.rect(53, 8, 3, 12, BLACK);
  p.outline(BLACK);
  // spectral flicker edge
  return p;
}

export function beam(): PC {
  const p = new PC(32, 22);
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 32; x++) {
      const d = Math.abs(y - 10.5) / 11;
      if (d < 0.35) p.px(x, y, WHITE);
      else if (d < 0.7 && bayer(x, y) < 0.7) p.px(x, y, LIGHT);
      else if (bayer(x, y) < 0.25) p.px(x, y, MID);
    }
  return p;
}

export function fogCloud(seed: number): PC {
  const W = 120;
  const H = 46;
  const p = new PC(W, H);
  const n = valueNoise(seed, 8);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
      if (d > 1) continue;
      const v = (1 - d) * (0.5 + fbm(n, x / 18, y / 10, 3));
      if (bayer(x, y) < v * 0.9) p.px(x, y, v > 0.6 ? WHITE : LIGHT);
    }
  return p;
}

export function chainLink(): PC {
  const p = new PC(8, 5);
  p.ring(2, 2, 2, 2, LIGHT);
  p.line(4, 2, 7, 2, WHITE);
  p.px(2, 1, WHITE);
  return p;
}

export function soulOrb(): PC {
  const p = new PC(7, 7);
  p.circle(3, 3, 3, LIGHT);
  p.circle(3, 3, 1, WHITE);
  return p;
}

export function rainStreak(): PC {
  const p = new PC(2, 7);
  p.line(1, 0, 0, 6, LIGHT);
  p.px(0, 6, WHITE);
  return p;
}

export function dot(c = WHITE, s = 2): PC {
  const p = new PC(s, s);
  p.rect(0, 0, s, s, c);
  return p;
}

export function warnBang(): PC {
  const p = new PC(9, 14);
  p.rect(3, 0, 3, 9, WHITE);
  p.rect(3, 11, 3, 3, WHITE);
  p.outline(BLACK);
  return p;
}

export function cursor(): PC {
  const p = new PC(5, 7);
  p.poly(
    [
      [0, 0],
      [5, 3.5],
      [0, 7],
    ],
    BLACK
  );
  return p;
}
