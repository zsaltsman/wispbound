import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';

// World 4's spirits and beasts, drawn once in a small "design space" and scaled:
// the same code paints the little overworld sprite and the big battle body.
//
//  WISPMANE   a great lion whose mane is living light, drifting off him like smoke
//  VIPERWIND  a long, swift serpent of the sky, finned like a kite, trailing wind
//  CHAMPION   a giant gorilla grown over with moss and grass
//  CROW       a mutant crow, ragged, too many feathers, a white eye
//  SQUIRREL   an ancient squirrel the size of a cart, with an enormous tail
//  FLAMORA    the Overseer of All Spirits: a vast firebird, wings of flame
//  REAPER     a small hooded figure in a black cloak, carrying a huge blade

/** A pixel canvas drawn at scale k from design coordinates (the origin can be offset). */
export class K {
  p: PC;
  k: number;
  ox: number;
  oy: number;
  constructor(w: number, h: number, k: number, ox = 0, oy = 0) {
    this.p = new PC(Math.round(w * k), Math.round(h * k));
    this.k = k;
    this.ox = ox;
    this.oy = oy;
  }
  X(x: number) {
    return (x + this.ox) * this.k;
  }
  Y(y: number) {
    return (y + this.oy) * this.k;
  }
  ell(cx: number, cy: number, rx: number, ry: number, c: number) {
    this.p.ellipse(Math.round(this.X(cx)), Math.round(this.Y(cy)), Math.max(1, Math.round(rx * this.k)), Math.max(1, Math.round(ry * this.k)), c);
  }
  poly(pts: Pt[], c: number) {
    this.p.poly(pts.map(([x, y]) => [this.X(x), this.Y(y)] as Pt), c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number, t = 1) {
    const w = Math.max(1, Math.round(t * this.k));
    if (w <= 1) this.p.line(this.X(x0), this.Y(y0), this.X(x1), this.Y(y1), c);
    else this.p.thick(this.X(x0) - w / 2, this.Y(y0) - w / 2, this.X(x1) - w / 2, this.Y(y1) - w / 2, c, w);
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    this.p.rect(Math.round(this.X(x)), Math.round(this.Y(y)), Math.max(1, Math.round(w * this.k)), Math.max(1, Math.round(h * this.k)), c);
  }
  dot(x: number, y: number, c: number, r = 0.5) {
    const R = Math.max(0, Math.round(r * this.k) - 1);
    if (R <= 0) this.p.px(this.X(x), this.Y(y), c);
    else this.p.circle(Math.round(this.X(x)), Math.round(this.Y(y)), R, c);
  }
  /** Re-shade what's drawn so far as a lit form (light from the upper left). */
  form(cx: number, cy: number, rx: number, ry: number, ramp: number[], only?: number) {
    const p = this.p;
    p.shade((x, y) => {
      if (only !== undefined && p.get(x, y) !== only) return null;
      const nx = (x / this.k - this.ox - cx) / rx;
      const ny = (y / this.k - this.oy - cy) / ry;
      return 0.75 - nx * 0.35 - ny * 0.45;
    }, ramp);
  }
  done(diag = false) {
    this.p.outline(BLACK, diag);
    return this.p;
  }
}

// ------------------------------------------------------------------ shared shapes

/** A tapered, rounded limb: a chain of discs from (x0,y0) radius r0 to (x1,y1) radius r1. */
export function limb(K0: K, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: number) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * K0.k * 0.7));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    K0.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, r0 + (r1 - r0) * t, c);
  }
}
/** A limb through a list of points (a bent leg, a curling tail). */
export function chain(K0: K, pts: Pt[], r0: number, r1: number, c: number) {
  const segs = pts.length - 1;
  for (let i = 0; i < segs; i++) limb(K0, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + ((r1 - r0) * i) / segs, r0 + ((r1 - r0) * (i + 1)) / segs, c);
}
/** Quadratic curve sample. */
function quad(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
}
/** A flame or a wisp: a tapering curved stroke with a bright core. */
export function wisp(K0: K, a: Pt, c: Pt, b: Pt, r: number, col: number, core: number) {
  const n = Math.max(10, Math.ceil((Math.hypot(c[0] - a[0], c[1] - a[1]) + Math.hypot(b[0] - c[0], b[1] - c[1])) * K0.k * 0.8));
  for (let i = 0; i <= n; i++) {
    const [x, y] = quad(a, c, b, i / n);
    K0.ell(x, y, r * (1 - (i / n) * 0.85), r * (1 - (i / n) * 0.85), col);
  }
  for (let i = 0; i <= n * 0.6; i++) {
    const [x, y] = quad(a, c, b, i / n);
    K0.ell(x, y, r * 0.4 * (1 - i / n), r * 0.4 * (1 - i / n), core);
  }
}

// ================================================================== WISPMANE

/**
 * Wispmane, facing left. Design box 64x48.
 * Poses: 0 stands, 1 roars (head up, mane flared), 2 crouches to pounce, 3 lies collapsed,
 * 4 sits (calm, at the old man's window).
 */
export function wispmane(k: number, pose: number, seed = 1): PC {
  const K0 = new K(64, 48, k);
  const r = artRng(seed + pose * 7);
  const down = pose === 3;
  const sit = pose === 4;
  const crouch = pose === 2 ? 4 : 0;
  const g = 46;
  // the tail: a long curve that ends in a little flame of light
  const tb: Pt = down ? [50, 40] : sit ? [50, 38] : [50, 24 + crouch];
  const tt: Pt = down ? [62, 42] : [61, 12 + crouch];
  chain(K0, [tb, [58, tb[1] + 2], tt], 1.4, 1, MID);
  wisp(K0, tt, [tt[0] + 2, tt[1] - 4], [tt[0] - 1, tt[1] - 8], 2.6, LIGHT, WHITE);
  // far legs
  if (!down && !sit) {
    chain(K0, [[45, 28 + crouch], [49, 37], [48 + crouch / 2, g]], 3.4, 2.4, DARK);
    chain(K0, [[24, 28 + crouch], [20, 37], [21 - crouch, g]], 3.4, 2.4, DARK);
  }
  // the body: deep chest, lean flank
  const by = down ? 38 : sit ? 30 : 25 + crouch;
  if (sit) {
    K0.ell(44, 36, 10, 9, MID);
    K0.ell(30, 28, 10, 11, MID);
  } else {
    K0.ell(38, by, 15, down ? 6 : 8, MID);
    K0.ell(25, by - 1, 10, down ? 7 : 10, MID);
  }
  // near legs
  if (!down) {
    if (sit) {
      chain(K0, [[28, 30], [27, 38], [26, g]], 3.6, 2.8, MID);
      K0.ell(48, g - 1, 5, 2.4, MID);
    } else {
      chain(K0, [[42, 26 + crouch], [46, 36], [44 + crouch, g]], 4, 2.8, MID);
      chain(K0, [[28, 26 + crouch], [27, 37], [26 - crouch, g]], 4, 2.8, MID);
    }
  }
  K0.form(32, by - 6, 24, 14, [DARK, MID, LIGHT]);
  if (!down) for (const x of sit ? [25] : [25 - crouch, 43 + crouch]) K0.ell(x, g, 3.4, 1.6, LIGHT);
  // the head
  const hx = down ? 12 : 14;
  const hy = (down ? 38 : sit ? 14 : 16) + (pose === 1 ? -4 : 0) + crouch;
  // the mane: living light, streaming back and up like smoke off a fire
  const flare = pose === 1 ? 1.4 : down ? 0.7 : 1;
  K0.ell(hx + 6, hy + 1, 9 * flare, 10 * flare, LIGHT);
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * 0.9 + (i / 15) * Math.PI * 1.35;
    const len = (10 + r() * 6) * flare;
    const sx = hx + 6 + Math.cos(a) * 5;
    const sy = hy + 1 + Math.sin(a) * 6;
    const ex = hx + 10 + Math.cos(a) * len + len * 0.6;
    const ey = hy + Math.sin(a) * len * 0.9 - len * 0.3;
    wisp(K0, [sx, sy], [(sx + ex) / 2 - 2, (sy + ey) / 2 - 3], [ex, ey], 2.2, i % 3 ? LIGHT : WHITE, WHITE);
  }
  K0.p.dither(0, 0, K0.p.w, K0.p.h, WHITE, 0.3, true);
  // face over the mane
  K0.ell(hx + 1, hy + 1, 6.4, 6, MID);
  K0.ell(hx - 3.4, hy + 3.4, 3.6, 2.8, LIGHT); // the muzzle
  K0.form(hx, hy - 1, 7, 7, [DARK, MID, LIGHT], MID);
  K0.ell(hx + 4, hy - 6.4, 1.8, 1.5, DARK); // an ear
  K0.dot(hx - 6.6, hy + 2.2, BLACK, 0.9); // nose
  if (pose === 1) {
    K0.poly([[hx - 7, hy + 4], [hx - 1, hy + 4.5], [hx - 4, hy + 9.5]], BLACK); // the roar
    K0.dot(hx - 5.4, hy + 5, WHITE, 0.6);
  } else K0.line(hx - 6, hy + 4.6, hx - 2, hy + 5, DARK, 0.6);
  if (down) K0.line(hx - 2.5, hy - 0.5, hx + 0.5, hy - 0.5, BLACK, 0.7);
  else {
    K0.ell(hx - 1.4, hy - 1, 1.4, 1, WHITE); // pale, steady eyes
    K0.dot(hx - 1.8, hy - 1, BLACK, 0.55);
  }
  return K0.done();
}

// ================================================================== VIPERWIND

/**
 * Viperwind, facing left. Design box 56x56: a long serpent with kite fins down its back.
 * Poses: 0 rears up (S-curve, head high), 1 hisses (jaws open, fins spread),
 * 2 slithers (low and long), 3 coils, 4 dances (a happy loop).
 */
export function viperwind(k: number, pose: number): PC {
  const K0 = new K(56, 56, k);
  const N = 70;
  const at = (t: number): Pt => {
    if (pose === 2) return [6 + t * 48, 48 + Math.sin(t * Math.PI * 3) * 3];
    if (pose === 3) {
      if (t < 0.18) return [16 + t * 50, 20 + t * 70];
      const a = (t - 0.18) * 11;
      const rr = 14 - (t - 0.18) * 10;
      return [28 + Math.cos(a) * rr, 40 + Math.sin(a) * rr * 0.55];
    }
    if (pose === 4) {
      const a = t * Math.PI * 2.6;
      return [16 + t * 30 + Math.sin(a) * 9, 12 + t * 36 + Math.cos(a) * 8];
    }
    const sway = pose === 1 ? 7 : 9;
    return [12 + t * 36 + Math.sin(t * Math.PI * 2.2) * sway, 9 + t * 44 - Math.sin(t * Math.PI) * 4];
  };
  const spine = [...Array(N + 1)].map((_, i) => at(i / N));
  const wOf = (i: number) => 4.4 - (i / N) * 3.6;
  // fins first (they sit behind the body), like the spars of a kite
  const fin = pose === 1 ? 1.7 : 1;
  for (let i = 8; i < N - 10; i += 9) {
    const [x, y] = spine[i];
    const [x2, y2] = spine[i + 5];
    const ang = Math.atan2(y2 - y, x2 - x) - Math.PI / 2;
    const fx = x + Math.cos(ang) * 7 * fin + 2;
    const fy = y + Math.sin(ang) * 7 * fin - 1;
    K0.poly([[x, y], [fx, fy], [x2, y2]], LIGHT);
    K0.line(x, y, fx, fy, WHITE, 0.6);
  }
  for (let i = N; i >= 0; i--) K0.ell(spine[i][0], spine[i][1], wOf(i), wOf(i), MID);
  K0.form(30, 26, 26, 26, [DARK, MID, LIGHT]);
  // a pale belly line and a pattern of chevrons on the back
  for (let i = 4; i < N - 4; i += 2) {
    const [x, y] = spine[i];
    const [x2, y2] = spine[i + 1];
    const ang = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
    K0.dot(x + Math.cos(ang) * wOf(i) * 0.6, y + Math.sin(ang) * wOf(i) * 0.6, WHITE, 0.6);
    if (i % 8 === 0) K0.dot(x - Math.cos(ang) * wOf(i) * 0.4, y - Math.sin(ang) * wOf(i) * 0.4, DARK, 0.8);
  }
  // the head: a narrow wedge with a swept crest
  const [hx, hy] = spine[0];
  K0.poly([[hx - 9, hy + 1], [hx - 2, hy - 4.5], [hx + 4, hy - 2], [hx + 4, hy + 4], [hx - 3, hy + 4.5]], LIGHT);
  K0.form(hx, hy - 1, 7, 5, [MID, LIGHT, WHITE], LIGHT);
  wisp(K0, [hx + 1, hy - 4], [hx + 6, hy - 6], [hx + 10, hy - 9 * fin], 1.8, WHITE, WHITE);
  if (pose === 1) {
    K0.poly([[hx - 10, hy + 2], [hx - 2, hy + 2], [hx - 6, hy + 8]], BLACK);
    K0.line(hx - 10, hy + 2, hx - 13, hy + 4, LIGHT, 0.5);
    K0.line(hx - 13, hy + 4, hx - 14, hy + 2, LIGHT, 0.5);
  } else K0.line(hx - 8, hy + 2, hx - 2, hy + 3, DARK, 0.5);
  K0.ell(hx - 3, hy - 1, 1.4, 1.1, BLACK);
  K0.dot(hx - 3.4, hy - 1.4, WHITE, 0.45);
  // wind curling off the tail
  const [tx, ty] = spine[N];
  for (let i = 0; i < 3; i++) wisp(K0, [tx, ty], [tx + 3 + i * 2, ty - 3 - i * 2], [tx + 6 + i * 3, ty - 1 - i * 4], 0.9, WHITE, WHITE);
  return K0.done();
}

// ================================================================== THE ANCIENT FOREST CHAMPION

/** The giant gorilla, facing left. Design box 64x60. Poses: 0 stands, 1 fists raised, 2 slams, 3 down. */
export function gorilla(k: number, pose: number): PC {
  const K0 = new K(64, 60, k);
  const r = artRng(31 + pose);
  const g = 58;
  if (pose === 3) {
    K0.ell(34, 50, 24, 8, MID);
    K0.ell(14, 50, 8, 6, MID);
    limb(K0, 20, 52, 4, 55, 4, 3.4, DARK);
    K0.form(30, 46, 28, 10, [DARK, MID, LIGHT]);
    for (let i = 0; i < 14; i++) K0.dot(26 + r() * 26, 44 + r() * 6, LIGHT, 0.6);
    K0.line(8, 49, 12, 49, BLACK, 0.7);
    return K0.done();
  }
  // the far arm, then the legs, then the great hunched body
  const arm = (pts: Pt[], c: number) => {
    chain(K0, pts, 6, 5, c);
    const [hx, hy] = pts[pts.length - 1];
    K0.ell(hx, hy, 6, 5, c);
    K0.line(hx - 5, hy + 1, hx + 4, hy + 1, BLACK, 0.5);
  };
  if (pose === 1) arm([[42, 18], [50, 10], [48, 0]], DARK);
  else if (pose === 2) arm([[42, 20], [42, 36], [36, g - 4]], DARK);
  else arm([[42, 20], [50, 36], [50, g - 4]], DARK);
  limb(K0, 42, 42, 44, g - 3, 7, 5.5, DARK);
  limb(K0, 30, 42, 28, g - 3, 8, 6, MID);
  K0.ell(44, g - 1, 7, 2.4, DARK);
  K0.ell(28, g - 1, 8, 2.6, MID);
  K0.ell(36, 31, 18, 15, MID);
  K0.ell(30, 18, 16, 11, MID); // the shoulders, a ridge of muscle
  K0.form(30, 20, 24, 22, [DARK, MID, LIGHT]);
  // moss and grass grown over its back and shoulders
  for (let i = 0; i < 38; i++) {
    const a = -Math.PI * 0.9 + r() * Math.PI * 1.1;
    const x = 34 + Math.cos(a) * (12 + r() * 6);
    const y = 24 + Math.sin(a) * (12 + r() * 4);
    K0.line(x, y, x + (r() - 0.5) * 3, y - 1.5 - r() * 3, r() < 0.5 ? LIGHT : WHITE, 0.6);
  }
  for (let i = 0; i < 4; i++) K0.ell(30 + i * 7, 10 + (i % 2) * 3, 2.4, 1.6, LIGHT);
  // the chest
  K0.ell(24, 30, 7, 9, LIGHT);
  K0.form(24, 28, 7, 9, [MID, LIGHT, WHITE], LIGHT);
  K0.line(19, 28, 29, 28, MID, 0.5);
  // the near arm
  if (pose === 1) arm([[18, 18], [10, 10], [12, 0]], MID);
  else if (pose === 2) arm([[18, 20], [14, 36], [8, g - 4]], MID);
  else arm([[18, 20], [10, 36], [12, g - 4]], MID);
  // head: low between the shoulders, a heavy brow, small fierce eyes
  K0.ell(18, 14, 8, 7.5, DARK);
  K0.ell(15, 17, 5.4, 4.4, MID);
  K0.form(16, 14, 8, 8, [BLACK, DARK, MID], DARK);
  K0.rect(10, 10.5, 13, 2.2, BLACK);
  K0.dot(13.6, 13.6, WHITE, 0.8);
  K0.dot(18, 13.6, WHITE, 0.8);
  if (pose === 1 || pose === 2) {
    K0.ell(14, 19.5, 3.4, 2.2, BLACK);
    K0.line(12, 18.6, 16, 18.6, WHITE, 0.4);
  } else K0.line(12, 20, 17, 20, BLACK, 0.6);
  // a crown of leaves where its hair should be
  for (let i = 0; i < 6; i++) K0.poly([[12 + i * 2.4, 8], [13 + i * 2.4, 3 - (i % 2) * 2], [15 + i * 2.4, 8]], LIGHT);
  return K0.done();
}

// ================================================================== THE MUTANT CROW

/** The mutant crow, facing left. Design box 64x52. Poses: 0 perched, 1 wings spread, 2 diving, 3 down. */
export function crow(k: number, pose: number): PC {
  const K0 = new K(64, 52, k);
  const r = artRng(41 + pose);
  if (pose === 3) {
    K0.ell(32, 44, 20, 6, DARK);
    for (let i = 0; i < 10; i++) limb(K0, 16 + i * 3.5, 42, 14 + i * 3.6, 47 + (i % 2) * 2, 1.4, 0.6, BLACK);
    K0.ell(12, 44, 5, 4, DARK);
    K0.poly([[7, 44], [0, 46], [7, 46]], MID);
    K0.line(10, 42, 13, 42, LIGHT, 0.6);
    return K0.done();
  }
  const feathers = (cx: number, cy: number, from: number, to: number, len: number, n: number, c: number, flip = 1) => {
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * i) / (n - 1);
      const l = len * (1 - Math.abs(i - n * 0.35) / (n * 1.6));
      limb(K0, cx, cy, cx + Math.cos(a) * l * flip, cy + Math.sin(a) * l, 2.4, 0.8, c);
    }
  };
  if (pose === 2) {
    // a dive: wings folded back, beak first, falling like a dart
    feathers(36, 22, -0.9, -0.2, 26, 6, BLACK);
    K0.ell(24, 28, 12, 7, DARK);
    feathers(30, 30, 0.1, 0.5, 26, 4, BLACK);
    K0.form(24, 26, 12, 8, [BLACK, DARK, MID], DARK);
    K0.poly([[2, 36], [13, 26], [15, 32]], LIGHT);
    K0.dot(15, 27, WHITE, 1.6);
    K0.dot(14.6, 27, BLACK, 0.6);
    return K0.done();
  }
  const spread = pose === 1;
  // the far wing
  if (spread) feathers(34, 22, -Math.PI * 0.9, -Math.PI * 0.35, 30, 9, BLACK, -1);
  // body: a ragged egg of feathers
  K0.ell(32, 30, 13, 15, DARK);
  for (let i = 0; i < 36; i++) {
    const a = r() * Math.PI * 2;
    const x = 32 + Math.cos(a) * 12;
    const y = 30 + Math.sin(a) * 14;
    limb(K0, x, y, x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 1, 0.5, BLACK);
  }
  K0.form(28, 24, 14, 16, [BLACK, DARK, MID]);
  // the near wing
  if (spread) feathers(30, 22, -Math.PI * 0.62, -Math.PI * 0.05, 34, 9, DARK);
  else {
    K0.poly([[26, 20], [46, 22], [50, 42], [36, 40]], BLACK);
    for (let i = 0; i < 5; i++) K0.line(30 + i * 3, 24, 38 + i * 3, 40, DARK, 0.7);
  }
  // tail feathers
  for (let i = 0; i < 4; i++) limb(K0, 40, 40, 52 + i * 2.2, 48 - i * 1.2, 2, 0.8, BLACK);
  // legs gripping the perch
  limb(K0, 28, 43, 26, 50, 1.2, 0.8, MID);
  limb(K0, 34, 43, 36, 50, 1.2, 0.8, MID);
  K0.line(20, 50.5, 42, 50.5, MID, 0.8);
  // head and beak
  K0.ell(20, 18, 8, 7, DARK);
  K0.form(18, 15, 8, 7, [BLACK, DARK, MID], DARK);
  K0.poly([[13, 16.5], [1, 21], [13, 21.5]], LIGHT);
  K0.line(3, 20.5, 12, 19.6, MID, 0.5);
  // one huge white eye (and a second, smaller one: it's a mutant)
  K0.ell(16.5, 15, 2.6, 2.4, WHITE);
  K0.dot(16, 15.2, BLACK, 1);
  K0.dot(22.6, 13.4, LIGHT, 1.1);
  // a crest of spiky feathers
  for (let i = 0; i < 5; i++) limb(K0, 22 + i * 1.6, 12, 25 + i * 2.4, 3 + (i % 2) * 2, 1.2, 0.5, BLACK);
  return K0.done();
}

// ================================================================== THE ANCIENT TREE GUARDIAN

/** The giant squirrel, facing left. Design box 64x64. Poses: 0 sits, 1 tail curled overhead, 2 spinning ball, 3 down. `rage`: a bigger tail, an angry face. */
export function squirrel(k: number, pose: number, rage = false): PC {
  const K0 = new K(64, 64, k);
  const r = artRng(51 + pose);
  if (pose === 2) {
    K0.ell(32, 36, 22, 22, MID);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      wisp(K0, [32 + Math.cos(a) * 6, 36 + Math.sin(a) * 6], [32 + Math.cos(a + 0.5) * 16, 36 + Math.sin(a + 0.5) * 16], [32 + Math.cos(a + 1) * 21, 36 + Math.sin(a + 1) * 21], 2, LIGHT, WHITE);
    }
    K0.form(28, 30, 22, 22, [DARK, MID, LIGHT]);
    return K0.done();
  }
  if (pose === 3) {
    K0.ell(34, 56, 22, 6, MID);
    K0.ell(14, 55, 7, 5, MID);
    K0.ell(52, 50, 11, 7, LIGHT);
    K0.form(30, 52, 26, 10, [DARK, MID, LIGHT]);
    K0.line(10, 53, 13, 53, BLACK, 0.6);
    return K0.done();
  }
  // the tail: one enormous plume, a great curl rising behind it
  const ts = rage ? 1.18 : 1;
  const path: Pt[] = pose === 1 ? [[44, 56], [54, 44], [54, 22], [44, 9], [28, 7], [20, 14]] : [[44, 56], [54, 46], [55, 26], [50, 13], [42, 11]];
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i];
    const [x1, y1] = path[i + 1];
    for (let t = 0; t <= 1; t += 0.08) {
      const rr = (8 + i * 0.4 - (i === path.length - 2 ? t * 3 : 0)) * ts;
      K0.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rr, rr, MID);
    }
  }
  K0.form(52, 24, 14, 26, [DARK, MID, LIGHT]);
  for (let i = 0; i < 70; i++) {
    const [x0, y0] = path[Math.floor(r() * (path.length - 1))];
    const a = r() * Math.PI * 2;
    const d = (6 + r() * 3) * ts;
    K0.line(x0 + Math.cos(a) * d * 0.6, y0 + Math.sin(a) * d * 0.6, x0 + Math.cos(a) * (d + 2), y0 + Math.sin(a) * (d + 2), r() < 0.5 ? LIGHT : WHITE, 0.5);
  }
  // body: up on its haunches
  K0.ell(36, 46, 13, 14, MID);
  K0.ell(32, 50, 7, 9, LIGHT);
  K0.form(34, 42, 14, 16, [DARK, MID, LIGHT]);
  K0.ell(38, 60, 10, 3, DARK);
  // forepaws holding a nut
  limb(K0, 30, 40, 22, 44, 3, 2.6, MID);
  K0.ell(19, 43, 3.6, 4, DARK);
  K0.line(16, 41, 22, 41, LIGHT, 0.6);
  // head
  K0.ell(24, 30, 9.5, 8.5, MID);
  K0.form(22, 27, 9, 9, [DARK, MID, LIGHT], MID);
  K0.ell(17, 33, 4.4, 3.4, LIGHT); // a cheek stuffed with nuts
  K0.dot(14.4, 30.6, BLACK, 1);
  K0.ell(20.4, 27, 1.8, 1.8, BLACK);
  K0.dot(20, 26.4, WHITE, 0.55);
  // tufted ears
  K0.poly([[24, 23], [26, 12], [30, 23]], MID);
  wisp(K0, [26, 13], [26, 10], [28, 7], 1.2, LIGHT, WHITE);
  if (rage) {
    K0.line(17, 24, 23, 26, BLACK, 0.9);
    K0.ell(15, 35, 2.2, 1.4, BLACK);
  }
  return K0.done();
}

// ================================================================== FLAMORA

/** The Overseer of All Spirits, facing left. Design box 96x72. Poses: 0 wings up, 1 wings down, 2 wings ablaze (attack), 3 fallen. */
export function flamora(k: number, pose: number): PC {
  const K0 = new K(96, 72, k);
  const r = artRng(61 + pose);
  if (pose === 3) {
    K0.ell(50, 62, 26, 6, MID);
    for (let i = 0; i < 11; i++) wisp(K0, [30 + i * 4, 60], [32 + i * 4.6, 66], [36 + i * 5.2, 69], 2, i % 2 ? LIGHT : MID, LIGHT);
    K0.ell(22, 60, 6, 5, LIGHT);
    K0.form(22, 58, 6, 5, [MID, LIGHT, WHITE], LIGHT);
    K0.poly([[16, 60], [9, 62.5], [16, 63]], WHITE);
    K0.line(21, 58.5, 25, 58.5, BLACK, 0.6); // eye shut
    return K0.done();
  }
  const up = pose !== 1;
  const fire = pose === 2 ? 1.25 : 1;
  // wings: long flame-feathers that fan out and lick upward at the tips
  for (const back of [true, false])
    for (let i = 0; i < 10; i++) {
      const a = up ? -Math.PI / 2 - 0.95 + i * 0.2 : -0.35 + i * 0.15;
      const len = (26 + Math.sin(i * 0.8) * 7) * fire;
      const bx = 48 + (back ? 4 : 0);
      const by = 34;
      const dir = back ? -0.75 : 1;
      const ex = bx + Math.cos(a) * len * dir;
      const ey = by + Math.sin(a) * len;
      wisp(K0, [bx, by], [(bx + ex) / 2 + (r() - 0.5) * 4, (by + ey) / 2 - 2], [ex, ey - 3], 3.2, back ? MID : LIGHT, back ? LIGHT : WHITE);
    }
  // tail: streamers of fire
  for (let i = 0; i < 5; i++) wisp(K0, [56, 40 + i], [70 + i * 2, 44 + i * 3], [82 + i * 3, 52 + i * 4], 2.4, i % 2 ? MID : LIGHT, WHITE);
  // body
  K0.ell(46, 38, 12, 9, LIGHT);
  K0.form(44, 34, 13, 10, [MID, LIGHT, WHITE], LIGHT);
  // neck, head, and a crown of flame
  limb(K0, 40, 34, 28, 24, 4.6, 3.6, LIGHT);
  K0.ell(25, 21, 5.8, 5.2, LIGHT);
  K0.form(24, 19, 6, 5, [MID, LIGHT, WHITE], LIGHT);
  K0.poly([[20, 20], [11, 23.5], [20, 24.5]], MID);
  K0.ell(23.6, 19.6, 1.3, 1.1, BLACK);
  K0.dot(23.2, 19.2, WHITE, 0.45);
  for (let i = 0; i < 5; i++) wisp(K0, [25 + i * 1.4, 17], [26 + i * 2, 12], [24 + i * 3.4, 5 + (i % 2) * 3], 1.4, WHITE, WHITE);
  K0.p.dither(0, 0, K0.p.w, K0.p.h, WHITE, 0.1, true);
  return K0.done();
}

// ================================================================== THE REAPER

/**
 * The Reaper, facing left. Design box 44x60: a short hooded figure, the cloak hiding
 * everything, and a scythe taller than it is. Poses: 0 floats, 1 raises the blade,
 * 2 swings, 3 one arm raised (the hand open), 4 cloak lifted on a wind of its own.
 */
export function reaper(k: number, pose: number): PC {
  const K0 = new K(44, 60, k, 2, 0);
  const lift = pose === 4;
  // the scythe: a long dark staff and a crescent blade hanging from its top
  const scythe = (bx: number, by: number, tx: number, ty: number, side: number) => {
    limb(K0, bx, by, tx, ty, 0.9, 0.9, DARK);
    const L = Math.hypot(tx - bx, ty - by);
    const d: Pt = [(tx - bx) / L, (ty - by) / L];
    const pp: Pt = [d[1] * side, -d[0] * side];
    const at = ([u, v]: Pt): Pt => [tx + pp[0] * u + d[0] * v, ty + pp[1] * u + d[1] * v];
    const outer: Pt[] = [[0, 1.5], [7, 2.5], [13, 1.5], [18, -1.5], [22, -7]];
    const inner: Pt[] = [[17.5, -3.6], [12.5, -1.6], [7, -0.8], [2, -1.8], [0, -2]];
    K0.poly([...outer, ...inner].map(at), LIGHT);
    for (let i = 0; i < outer.length - 1; i++) {
      const [x0, y0] = at(outer[i]);
      const [x1, y1] = at(outer[i + 1]);
      K0.line(x0, y0, x1, y1, WHITE, 0.7);
    }
  };
  // the cloak: a dark bell, ragged at the hem, never quite touching the ground
  const hem = lift ? 46 : 52;
  K0.poly([[20, 10], [27, 15], [31, 30], [34, hem], [29, hem - 3], [25, hem + 1.5], [20, hem - 3], [15, hem + 1.5], [10, hem - 2.5], [7, 30], [12, 15]], DARK);
  if (lift) for (let i = 0; i < 5; i++) wisp(K0, [9 + i * 6, hem - 3], [7 + i * 7, hem + 3], [4 + i * 8, hem + 8 + (i % 2) * 3], 1.6, DARK, DARK);
  K0.form(16, 22, 14, 26, [BLACK, DARK, DARK, MID]);
  K0.line(14, 22, 12, hem - 4, BLACK, 0.6);
  K0.line(23, 22, 26, hem - 4, BLACK, 0.6);
  // the hood: deep, and nothing inside it at all
  K0.ell(18.5, 12, 7, 7.5, DARK);
  K0.form(20, 9, 7, 7, [BLACK, DARK, MID], DARK);
  K0.ell(16, 13.5, 3.6, 4.6, BLACK);
  if (pose === 0 || pose === 3 || pose === 4) scythe(31, 50, 30, 6, -1);
  if (pose === 1) scythe(26, 34, 30, 0, -1);
  if (pose === 2) scythe(16, 30, -1, 50, 1);
  // the arm: a sleeve; pose 3 shows a thin, pale hand
  if (pose === 1) limb(K0, 19, 22, 26, 8, 2.4, 1.6, DARK);
  else if (pose === 2) limb(K0, 17, 22, 12, 32, 2.4, 1.6, DARK);
  else if (pose === 3) {
    limb(K0, 15, 22, 5, 13, 2.4, 1.6, DARK);
    K0.ell(3.6, 11.4, 1.6, 2, LIGHT);
    for (let i = 0; i < 3; i++) K0.line(2.6 + i, 10, 2 + i * 1.2, 7.6, LIGHT, 0.4);
  } else limb(K0, 22, 24, 29, 32, 2.2, 1.4, DARK);
  return K0.done();
}

// ================================================================== the black cat (bigger than the townsfolk's)

/** The black cat that leads you around the island: sits and stares. 20x20, facing left. 0 sits, 1 sits looking up, 2 runs. */
export function blackCat(f: number): PC {
  const p = new PC(20, 20);
  if (f === 2) {
    p.ellipse(10, 14, 6, 2, BLACK);
    p.ellipse(4, 12, 3, 2, BLACK);
    p.line(15, 13, 19, 9, BLACK);
    p.line(5, 16, 2, 18, BLACK);
    p.line(14, 16, 17, 18, BLACK);
    p.px(2, 11, WHITE);
    p.px(3, 9, BLACK);
    p.px(5, 9, BLACK);
    return p;
  }
  p.ellipse(11, 15, 4, 4, BLACK);
  p.rect(8, 17, 6, 3, BLACK);
  p.ellipse(9, 9 - (f === 1 ? 1 : 0), 3, 3, BLACK);
  p.px(7, 5 - (f === 1 ? 1 : 0), BLACK);
  p.px(11, 5 - (f === 1 ? 1 : 0), BLACK);
  // eyes: two small white points that never blink
  p.px(8, 9 - (f === 1 ? 2 : 0), WHITE);
  p.px(10, 9 - (f === 1 ? 2 : 0), WHITE);
  p.line(15, 18, 18, 15, BLACK);
  p.line(18, 15, 17, 12, BLACK);
  return p;
}
