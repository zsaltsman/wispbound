import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer, type Pt } from './pixel';
import { K, limb, wisp, reaper, wispmane, viperwind, flamora } from './artW4beasts';
import { superBody, upscale, stand } from './artW5';
import { evoFrames } from './artEvo';
import { creatureFrames2 } from './artCreatures2';
import { creatureFrames3 } from './artTitans';

// The God of Death, and everything that fights him.
//
//  THE REAPER     the hooded figure you met on the island, an empty hood and one scythe
//  BUFF REAPER    the same hood on a mountain of pale muscle (it is a little ridiculous)
//  TRUE FORM      a crown, two scythes, great tattered wings; six bladed legs grow from
//                 his back (drawn live by the battle rig so each one moves on its own)
//  SUPERCHARGED   your three spirits pushed past their limits: World 1's fire, World 2's
//                 glowing deep water, World 3's Titan steel
//  GUARDIAN       Wispmane or Viperwind, full size
//
// Everything faces left (the enemy side) unless it is one of yours.

// ------------------------------------------------------------------ shared

/** A scythe: a long staff from (bx,by) to the top (tx,ty), a crescent blade hanging off the top. */
function scythe(K0: K, bx: number, by: number, tx: number, ty: number, side: number, size = 1, staff = DARK) {
  limb(K0, bx, by, tx, ty, 0.9 * size, 0.9 * size, staff);
  const L = Math.hypot(tx - bx, ty - by);
  const d: Pt = [(tx - bx) / L, (ty - by) / L];
  const pp: Pt = [d[1] * side, -d[0] * side];
  const at = ([u, v]: Pt): Pt => [tx + pp[0] * u * size + d[0] * v * size, ty + pp[1] * u * size + d[1] * v * size];
  const outer: Pt[] = [[0, 1.5], [7, 2.5], [13, 1.5], [18, -1.5], [22, -7]];
  const inner: Pt[] = [[17.5, -3.6], [12.5, -1.6], [7, -0.8], [2, -1.8], [0, -2]];
  K0.poly([...outer, ...inner].map(at), LIGHT);
  for (let i = 0; i < outer.length - 1; i++) {
    const [x0, y0] = at(outer[i]);
    const [x1, y1] = at(outer[i + 1]);
    K0.line(x0, y0, x1, y1, WHITE, 0.7 * size);
  }
}

/** A dithered glow: light dots scattered in an ellipse, thinning out to the rim. */
export function halo(p: PC, cx: number, cy: number, rx: number, ry: number, c: number, amt = 0.4) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d > 1 || p.get(x, y) >= 0) continue;
      if (bayer(x, y) < (1 - d) * amt) p.px(x, y, c);
    }
}

/** The opaque pixels on the edge of a silhouette. */
export function edges(p: PC): Pt[] {
  const out: Pt[] = [];
  for (let y = 1; y < p.h - 1; y++)
    for (let x = 1; x < p.w - 1; x++) {
      if (p.get(x, y) < 0) continue;
      if (p.get(x - 1, y) < 0 || p.get(x + 1, y) < 0 || p.get(x, y - 1) < 0 || p.get(x, y + 1) < 0) out.push([x, y]);
    }
  return out;
}
export function bbox(p: PC) {
  let top = p.h, bot = 0, left = p.w, right = 0;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++)
      if (p.get(x, y) >= 0) {
        top = Math.min(top, y);
        bot = Math.max(bot, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  return { top, bot, left, right, cx: (left + right) / 2, cy: (top + bot) / 2 };
}

// ================================================================== THE REAPER (first form)

/**
 * The Reaper as you met him, grown to his full height. Frames:
 * 0 idle, 1 scythe raised, 2 the swing, 3 the reaching hand, 4 rising off the floor,
 * 5 fallen (a heap of cloak, the scythe on the stones), 6 idle with his eyes lit (angry).
 */
export function reaperFull(k: number, f: number): PC {
  if (f === 5) {
    const K0 = new K(44, 60, k, 2, 0);
    scythe(K0, 4, 57, 40, 55, 1);
    K0.poly([[6, 58], [10, 50], [18, 46], [28, 47], [36, 52], [40, 58], [30, 57], [22, 59], [14, 57]], DARK);
    K0.form(20, 50, 16, 8, [BLACK, DARK, DARK, MID]);
    K0.ell(9, 50, 6, 5, DARK);
    K0.ell(7, 51.5, 3, 3, BLACK);
    limb(K0, 12, 54, 2, 58, 1.6, 1.2, DARK);
    K0.ell(1, 58.5, 1.4, 0.9, LIGHT);
    return K0.done();
  }
  const p = reaper(k, f === 6 ? 0 : f);
  if (f === 6 || f === 1 || f === 2) {
    // two pinpoints of light, deep in the empty hood
    const X = (x: number) => Math.round((x + 2) * k);
    const Y = (y: number) => Math.round(y * k);
    const e = Math.max(1, Math.round(k * 0.6));
    for (const ex of [14.6, 17.6]) p.rect(X(ex) - (e >> 1), Y(13) - (e >> 1), e, e, WHITE);
  }
  return p;
}

// ================================================================== BUFF REAPER

/**
 * The same empty hood on top of an absurd amount of pale muscle; the cloak has split and
 * hangs off him as a cape and a ragged skirt. Design box 124x108, ground at 104.
 * `m` is how far the muscle has grown (0 thin, 1 full: the transformation steps through it).
 * Poses: 0 idle (scythe on his shoulder), 1 double flex, 2 punch, 3 scythe overhead,
 * 4 both fists slammed into the floor, 5 kneeling, beaten, 6 idle, furious (eyes, steam).
 */
export function buffReaper(k: number, pose: number, m = 1): PC {
  const K0 = new K(124, 108, k);
  const r = artRng(811 + pose * 17 + Math.round(m * 10));
  const w = 0.5 + 0.5 * m;
  const dy = pose === 4 ? 10 : pose === 5 ? 18 : 0;
  const cx = 64 + (pose === 5 ? -4 : 0);
  const sw = 22 * w + 2;
  const shY = 48 + dy;
  const waY = 76 + dy;
  const G = 104;
  const SL: Pt = [cx - sw, shY + 2];
  const SR: Pt = [cx + sw, shY + 2];
  // arms: [elbow, fist] for the front (left) and back (right) arm
  const arms: Record<number, [Pt, Pt, Pt, Pt]> = {
    0: [[cx - sw - 6, 66], [cx - sw - 4, 82], [cx + sw + 8, 62], [cx + sw + 2, 46]],
    1: [[cx - sw - 13, 48], [cx - sw - 8, 28], [cx + sw + 13, 48], [cx + sw + 8, 28]],
    2: [[cx - sw - 17, 54], [cx - sw - 33, 52], [cx + sw + 8, 60], [cx + sw - 2, 70]],
    3: [[cx - sw - 6, 32], [cx - 2, 12], [cx + sw + 6, 32], [cx + 6, 12]],
    4: [[cx - sw - 10, 72 + 4], [cx - sw - 12, 100], [cx + sw + 10, 72 + 4], [cx + sw + 12, 100]],
    5: [[cx - sw - 4, 80], [cx - sw + 2, 100], [cx + sw + 4, 80], [cx + sw - 2, 100]],
    6: [[cx - sw - 6, 66], [cx - sw - 4, 82], [cx + sw + 8, 62], [cx + sw + 2, 46]],
  };
  const [eL, fL, eR, fR] = arms[pose];
  const arm = (s: Pt, e: Pt, f: Pt, flex: boolean) => {
    const R = 6 * w + 1;
    K0.ell(s[0], s[1], R + 1.5, R + 0.5, LIGHT); // the shoulder
    limb(K0, s[0], s[1], e[0], e[1], R, R * 0.85, LIGHT);
    // the bicep: a bulge on the upper arm, huge when he flexes
    const bx = (s[0] + e[0]) / 2;
    const by = (s[1] + e[1]) / 2;
    K0.ell(bx, by - (flex ? 3 * w : 0), R * (flex ? 1.35 : 1.05), R * (flex ? 1.15 : 0.9), LIGHT);
    limb(K0, e[0], e[1], f[0], f[1], R * 0.85, R * 0.7, LIGHT);
    K0.ell(f[0], f[1], R * 0.85 + 0.8, R * 0.8 + 0.8, LIGHT); // the fist
    K0.line(f[0] - R * 0.5, f[1] - R * 0.2, f[0] + R * 0.5, f[1] - R * 0.2, MID, 0.4);
  };

  // the scythe, behind him (on his shoulder, planted, or overhead in both hands)
  if (pose === 0 || pose === 6) scythe(K0, cx + sw + 10, 96, cx + sw - 4, 4, -1, 1.5);
  if (pose === 1 || pose === 2) scythe(K0, cx + sw + 22, G, cx + sw + 14, 16, 1, 1.5);
  if (pose === 4) scythe(K0, cx + sw + 26, G, cx + sw + 20, 26, 1, 1.4);
  if (pose === 5) scythe(K0, cx + 44, G - 1, cx - 10, G - 3, -1, 1.4);
  // the cape behind him
  K0.poly(
    [
      [cx - sw + 2, shY - 2],
      [cx + sw - 2, shY - 2],
      [cx + sw + 8, G - 6],
      [cx + sw + 3, G - 1],
      [cx + sw - 4, G - 6],
      [cx + 6, G],
      [cx - 4, G - 6],
      [cx - sw + 2, G - 1],
      [cx - sw - 6, G - 6],
    ],
    DARK
  );
  K0.form(cx + 8, 70, 30, 30, [BLACK, DARK, DARK]);
  // the back arm
  arm(SR, eR, fR, pose === 1);
  // the skirt: what is left of the robe, from the waist down
  const hw = 12 * w + 4;
  const hem: Pt[] = [];
  for (let i = 0; i <= 8; i++) hem.push([cx + hw + 6 - i * ((hw + 6) * 2) / 8, G - (i % 2 ? 4 : 0) - r() * 2]);
  K0.poly([[cx - hw, waY - 2], [cx + hw, waY - 2], ...hem], DARK);
  K0.line(cx - 4, waY, cx - 8, G - 4, BLACK, 0.6);
  K0.line(cx + 6, waY, cx + 9, G - 4, BLACK, 0.6);
  // the torso: a slab of muscle, wide at the shoulders
  K0.poly([[cx - sw, shY], [cx + sw, shY], [cx + hw, waY], [cx - hw, waY]], LIGHT);
  K0.ell(cx, shY - 4, 14 * w + 3, 6 * w + 1, LIGHT); // the traps
  // pecs and abs, cut in with shadow
  K0.ell(cx - 8 * w - 1, shY + 8, 9 * w + 1, 5 * w + 1, LIGHT);
  K0.ell(cx + 8 * w + 1, shY + 8, 9 * w + 1, 5 * w + 1, LIGHT);
  K0.line(cx - 16 * w - 1, shY + 13 * w + 1, cx - 1, shY + 14 * w + 1, MID, 0.7);
  K0.line(cx + 1, shY + 14 * w + 1, cx + 16 * w + 1, shY + 13 * w + 1, MID, 0.7);
  K0.line(cx, shY + 2, cx, waY - 2, MID, 0.6);
  for (let i = 0; i < 3; i++) {
    const y = shY + 18 * w + 4 + i * 4 * w;
    K0.line(cx - 7 * w, y, cx - 1, y, MID, 0.5);
    K0.line(cx + 1, y, cx + 7 * w, y, MID, 0.5);
  }
  // rags of the old cloak still caught on his shoulders
  K0.poly([[cx - sw - 4, shY - 3], [cx - sw + 9, shY - 6], [cx - sw + 6, shY + 6], [cx - sw - 1, shY + 3]], DARK);
  K0.poly([[cx + sw + 4, shY - 3], [cx + sw - 9, shY - 6], [cx + sw - 6, shY + 6], [cx + sw + 1, shY + 3]], DARK);
  // the hood: exactly the hood from the island, sat on a neck like a tree stump
  const hx = cx - 2 - (pose === 5 ? 6 : pose === 2 ? 3 : 0);
  const hy = shY - 12 + (pose === 5 ? 6 : 0);
  K0.ell(hx, hy, 9, 9.5, DARK);
  K0.form(hx + 2, hy - 3, 9, 9, [BLACK, DARK, MID], DARK);
  K0.ell(hx - 3, hy + 2, 4.5, 5.5, BLACK);
  if (pose !== 5 && (pose === 6 || pose === 1 || pose === 2 || pose === 4 || m >= 1)) {
    K0.dot(hx - 5, hy + 1, WHITE, 0.7);
    K0.dot(hx - 1.5, hy + 1, WHITE, 0.7);
  }
  // the front arm
  arm(SL, eL, fL, pose === 1);
  // the overhead scythe goes in front, held in both fists
  if (pose === 3) scythe(K0, cx + 22, 40, cx - 6, 2, -1, 1.6);
  // the muscle: every pale pixel re-lit as a rounded form
  K0.form(cx - 6, shY + 6, sw + 12, 34, [MID, LIGHT, LIGHT, WHITE], LIGHT);
  if (pose === 6) {
    // steam coming off his shoulders; a vein or two
    for (const sx of [SL[0] - 2, SL[0] + 6, SR[0] - 6, SR[0] + 2]) wisp(K0, [sx, shY - 6], [sx - 5, shY - 14], [sx + 1, shY - 22], 1.4, MID, LIGHT);
    K0.line(SL[0] - 2, SL[1] + 4, eL[0] + 1, eL[1] - 2, MID, 0.4);
  }
  return K0.done();
}

// ================================================================== THE TRUE FORM

/**
 * The God of Death. Tall robes, ribs showing through a tear in the chest with a white
 * soul burning behind them, a crown on the hood, a scythe in each hand. (Wings and the six
 * legs are separate.) Design box 120x128, ground at 126.
 * Poses: 0 idle, 1 scythes crossed overhead, 2 both scythes swung down, 3 arms flung wide
 * (the crown blazing), 4 hunched forward, 5 cowering (no crown, no scythes),
 * 6 bare and still (no crown, no scythes), 7 the last moment (fading at the edges).
 */
export function trueReaper(k: number, pose: number): PC {
  const K0 = new K(120, 128, k);
  const r = artRng(977 + pose * 7);
  const dy = pose === 4 ? 6 : pose === 5 ? 12 : pose === 7 ? 8 : 0;
  const dx = pose === 4 ? -4 : 0;
  const cx = 60 + dx;
  const shY = 54 + dy;
  const crown = pose <= 4;
  const scythes = pose <= 4;
  // hands: front (left) and back (right)
  const hands: Record<number, [Pt, Pt, Pt, Pt]> = {
    0: [[cx - 24, 66], [cx - 32, 80], [cx + 24, 66], [cx + 32, 80]],
    1: [[cx - 22, 52], [cx - 12, 38], [cx + 18, 52], [cx + 6, 38]],
    2: [[cx - 28, 70], [cx - 42, 82], [cx - 14, 76], [cx - 30, 90]],
    3: [[cx - 32, 46], [cx - 42, 30], [cx + 32, 46], [cx + 42, 30]],
    4: [[cx - 26, 74], [cx - 36, 88], [cx + 14, 76], [cx - 6, 92]],
    5: [[cx - 18, shY + 4], [cx - 16, shY - 12], [cx + 8, shY + 6], [cx - 6, shY - 10]],
    6: [[cx - 18, shY + 18], [cx - 20, shY + 36], [cx + 18, shY + 18], [cx + 20, shY + 36]],
    7: [[cx - 18, shY + 18], [cx - 20, shY + 36], [cx + 18, shY + 18], [cx + 20, shY + 36]],
  };
  const [eL, hL, eR, hR] = hands[pose];
  const sL: Pt = [cx - 15, shY + 2];
  const sR: Pt = [cx + 15, shY + 2];
  const arm = (s: Pt, e: Pt, h: Pt) => {
    limb(K0, s[0], s[1], e[0], e[1], 4.4, 3.6, DARK); // the sleeve
    limb(K0, e[0], e[1], h[0], h[1], 1.4, 1.1, LIGHT); // the bone
    K0.ell(h[0], h[1], 2.2, 2, LIGHT);
    for (let i = 0; i < 3; i++) K0.line(h[0] - 1.5 + i * 1.5, h[1], h[0] - 2 + i * 1.8, h[1] + 3, LIGHT, 0.5);
  };
  // the back scythe and arm
  if (scythes) {
    if (pose === 0) scythe(K0, hR[0] + 3, 122, hR[0] - 4, 24, 1, 1.6);
    if (pose === 1) scythe(K0, cx - 40, 92, cx + 16, 6, 1, 1.6);
    if (pose === 2) scythe(K0, cx - 6, 66, hR[0] - 18, 120, 1, 1.6);
    if (pose === 3) scythe(K0, hR[0], 76, hR[0] + 2, 6, 1, 1.6);
    if (pose === 4) scythe(K0, cx + 26, 66, hR[0] - 26, 122, 1, 1.6);
  }
  arm(sR, eR, hR);
  // the robe: tall, ragged, hanging just off the ground with smoke at the hem
  const hem = 118 + Math.min(dy, 6);
  const pts: Pt[] = [[cx - 14, shY - 4], [cx + 14, shY - 4], [cx + 19, shY + 22], [cx + 27, hem]];
  for (let i = 1; i < 9; i++) pts.push([cx + 27 - i * 6.75, hem - (i % 2 ? 5 + r() * 3 : 0)]);
  pts.push([cx - 27, hem], [cx - 19, shY + 22]);
  K0.poly(pts, DARK);
  for (let i = 0; i < 6; i++) wisp(K0, [cx - 22 + i * 9, hem - 2], [cx - 26 + i * 9, hem + 3], [cx - 30 + i * 10, hem + 6], 1.8, DARK, MID);
  K0.form(cx + 2, 80, 26, 40, [BLACK, DARK, DARK, MID]);
  K0.line(cx - 8, shY + 20, cx - 16, hem - 6, BLACK, 0.6);
  K0.line(cx + 7, shY + 20, cx + 14, hem - 6, BLACK, 0.6);
  // the tear in the chest: ribs, and the soul burning behind them
  K0.ell(cx - 2, shY + 14, 7, 10, BLACK);
  if (pose !== 7) {
    K0.ell(cx - 2, shY + 13, 3, 3.5, pose === 5 ? MID : WHITE);
    K0.ell(cx - 2, shY + 13, 1.4, 1.6, pose === 5 ? LIGHT : WHITE);
  }
  for (let i = 0; i < 4; i++) {
    const y = shY + 7 + i * 3.6;
    K0.line(cx - 8, y + 1, cx - 3, y - 0.5, LIGHT, 0.6);
    K0.line(cx - 1, y - 0.5, cx + 4, y + 1, LIGHT, 0.6);
  }
  K0.line(cx - 2, shY + 5, cx - 2, shY + 22, LIGHT, 0.7);
  // the hood, empty but for two burning eyes
  const hx = cx - 3 + (pose === 5 ? -2 : 0);
  const hy = shY - 14 + (pose === 5 ? 4 : 0) + (pose === 3 ? -2 : 0);
  K0.ell(hx, hy, 10, 11, DARK);
  K0.form(hx + 3, hy - 4, 10, 10, [BLACK, DARK, MID], DARK);
  K0.ell(hx - 4, hy + 2, 5, 6.5, BLACK);
  if (pose !== 6 && pose !== 7) {
    const ec = pose === 5 ? LIGHT : WHITE;
    K0.dot(hx - 6.5, hy + 1, ec, 0.8);
    K0.dot(hx - 2.5, hy + 1, ec, 0.8);
    if (pose !== 5) {
      // they drip light
      K0.line(hx - 6.5, hy + 2, hx - 6.8, hy + 5, LIGHT, 0.4);
      K0.line(hx - 2.5, hy + 2, hx - 2.3, hy + 4, LIGHT, 0.4);
    }
  } else if (pose === 6) {
    K0.dot(hx - 6.5, hy + 1, MID, 0.6);
    K0.dot(hx - 2.5, hy + 1, MID, 0.6);
  }
  // the crown
  if (crown) crownOn(K0, hx + 1, hy - 9, pose === 3);
  // the front arm and scythe
  arm(sL, eL, hL);
  if (scythes) {
    if (pose === 0) scythe(K0, hL[0] + 4, 122, hL[0] - 4, 22, -1, 1.6);
    if (pose === 1) scythe(K0, cx + 20, 96, cx - 34, 4, -1, 1.6);
    if (pose === 2) scythe(K0, cx - 20, 58, hL[0] - 14, 112, -1, 1.6);
    if (pose === 3) scythe(K0, hL[0], 76, hL[0] - 2, 6, -1, 1.6);
    if (pose === 4) scythe(K0, cx - 14, 62, hL[0] - 22, 116, -1, 1.6);
  }
  const p = K0.done();
  if (pose === 7) {
    // coming apart: the edges thin into nothing
    const rr = artRng(1234);
    p.remap((c, x, y) => (bayer(x, y) < 0.35 + rr() * 0.2 ? -1 : c === DARK ? MID : c));
  }
  return p;
}

/** The crown: a band of five spikes, brighter at the tips, a black stone at the front. */
function crownOn(K0: K, x: number, y: number, blaze = false) {
  K0.rect(x - 9, y + 2, 18, 3.5, LIGHT);
  for (let i = 0; i < 5; i++) {
    const sx = x - 8 + i * 4;
    const h = i === 2 ? 9 : i % 2 ? 6 : 7.5;
    K0.poly([[sx - 1.8, y + 2.5], [sx, y + 2.5 - h], [sx + 1.8, y + 2.5]], LIGHT);
    K0.dot(sx, y + 3 - h, WHITE, 0.6);
  }
  K0.line(x - 9, y + 2, x + 9, y + 2, WHITE, 0.5);
  K0.dot(x, y + 3.6, BLACK, 0.9);
  if (blaze) for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.1 + (i / 6) * 0.8);
    K0.line(x + Math.cos(a) * 12, y - Math.sin(a) * 10, x + Math.cos(a) * 18, y - Math.sin(a) * 16, WHITE, 0.6);
  }
}

/** The crown alone (it falls off him at the end). */
export function crownAlone(k: number): PC {
  const K0 = new K(24, 16, k);
  crownOn(K0, 12, 9);
  return K0.done();
}
/** One scythe alone, lying flat (for dropping). */
export function scytheAlone(k: number): PC {
  const K0 = new K(64, 34, k);
  scythe(K0, 2, 26, 48, 22, 1, 1.4);
  return K0.done();
}

/**
 * The wings: two great tattered wings of bone and torn membrane, both spread, fixed
 * behind his shoulders (the attach point is the middle of the canvas). Design 240x140.
 * `a`: 0 raised high, 1 level, 2 swept down (three flap frames), 3 folded half closed
 * (around him, like a shroud).
 */
export function wings(k: number, a: number): PC {
  const K0 = new K(240, 140, k);
  const root: Pt = [120, 62];
  const r = artRng(431 + a * 3);
  for (const s of [1, -1]) {
    const far = s === 1; // facing left, the right wing is the far one
    const span = far ? 0.9 : 1;
    const lift = [1, 0.3, -0.4, 0.5][a];
    const fold = a === 3 ? 0.55 : 1;
    const tilt = [-22, 0, 26, 40][a] * (Math.PI / 180);
    const wrist: Pt = [root[0] + s * 44 * span * fold, root[1] - 34 * lift - 8];
    const base = [-38, -4, 28, 58].map((d) => (d * Math.PI) / 180 + tilt);
    const lens = [72, 66, 54, 40];
    const tips: Pt[] = base.map((t, i) => [wrist[0] + s * Math.cos(t) * lens[i] * span * fold, wrist[1] + Math.sin(t) * lens[i] * span * fold]);
    // the membrane: from his back out along the arm, then scalloped from tip to tip, then home
    const mem: Pt[] = [[root[0], root[1] - 4], wrist, tips[0]];
    for (let i = 1; i < 4; i++) {
      const p0 = tips[i - 1];
      const p1 = tips[i];
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      mem.push([mx + (wrist[0] - mx) * 0.32, my + (wrist[1] - my) * 0.32], p1);
    }
    mem.push([root[0] + s * 16 * fold, root[1] + 40], [root[0] + s * 2, root[1] + 26]);
    const skin = far ? DARK : MID;
    K0.poly(mem, skin);
    // ribs of shadow in the membrane, then tears
    for (const t of tips) K0.line(wrist[0], wrist[1], (t[0] + root[0]) / 2, (t[1] + root[1] + 30) / 2, far ? BLACK : DARK, 0.8);
    for (let i = 0; i < 8; i++) {
      const t = tips[Math.floor(r() * 4)];
      const u = 0.35 + r() * 0.5;
      K0.ell(wrist[0] + (t[0] - wrist[0]) * u + (r() - 0.5) * 6, wrist[1] + (t[1] - wrist[1]) * u + 4 + r() * 8, 1.2 + r() * 2.4, 1 + r() * 1.8, BLACK);
    }
    // the bones
    K0.line(root[0], root[1] - 4, wrist[0], wrist[1], far ? MID : LIGHT, 3);
    K0.line(root[0], root[1] - 5, wrist[0], wrist[1] - 1, far ? LIGHT : WHITE, 0.8);
    for (const t of tips) {
      K0.line(wrist[0], wrist[1], t[0], t[1], far ? MID : LIGHT, 1.5);
      K0.dot(t[0], t[1], far ? LIGHT : WHITE, 1);
    }
    K0.dot(wrist[0], wrist[1], far ? LIGHT : WHITE, 2);
    // a hooked claw on the wrist
    K0.poly([[wrist[0] - 2, wrist[1] - 1], [wrist[0] + s * 4, wrist[1] - 9], [wrist[0] + s * 3, wrist[1] - 1]], far ? LIGHT : WHITE);
  }
  return K0.done();
}

/** The six bladed legs, folded and drawn small, for the overworld sprite of the true form. */
export function trueReaperOw(k: number, pose: number): PC {
  const W = Math.round(240 * k * 0.5);
  const body = trueReaper(k, pose);
  const wg = wings(k * 0.5, 1);
  const out = new PC(Math.max(W, body.w + 20), body.h + 6);
  out.blit(wg, Math.round(out.w / 2 - wg.w / 2 + 2), Math.round(body.h * 0.42 - wg.h / 2));
  // little legs, curled over his shoulders
  const bx = Math.round(out.w / 2 - body.w / 2);
  for (let i = 0; i < 6; i++) {
    const sx = out.w / 2 + 2 + (i - 2.5) * 2;
    const sy = body.h * 0.45;
    const tx = out.w / 2 + (i - 2.5) * 6;
    const ty = body.h * 0.12 + Math.abs(i - 2.5) * 2;
    out.line(sx, sy, (sx + tx) / 2 + (i < 3 ? -3 : 3), ty - 2, MID);
    out.line((sx + tx) / 2 + (i < 3 ? -3 : 3), ty - 2, tx, ty + 3, LIGHT);
  }
  out.blit(body, bx, 6);
  out.outline(BLACK);
  return out;
}

// ================================================================== YOUR SPIRITS, SUPERCHARGED

/** Base frames of a spirit as it fights for you (48x48, facing right, 0-3 idle, 4 attack, 5 hurt). */
function baseFrames(id: string): PC[] {
  if (['glowbell', 'hammerfin', 'bubblotl', 'glidray'].includes(id)) return creatureFrames2(id);
  return creatureFrames3(id);
}

/** World 1: the supercharged look you already know from the prison (fire licking off it). */
function scW1(id: string, f: number): PC {
  // superBody's frame code: 0 rest, 2 winding up (flare); its seed varies the flames
  const code = f === 4 ? 2 : f === 5 ? 0 : 0;
  return superBody(id, code, 2, false, f, f * 5 + 1);
}

/** World 2: glowing deep water. Dark body, a luminous rim, photophores, bubbles, streaming current. */
function scW2(id: string, f: number): PC {
  const W0 = 120, H0 = 112;
  const body = stand(upscale(evoFrames(id)?.[f] ?? baseFrames(id)[f], 2), W0, H0, 4);
  body.remap((c) => (c === WHITE ? WHITE : c === LIGHT ? MID : c === MID ? DARK : c));
  const r = artRng(5100 + f * 11 + id.length * 7);
  const ed = edges(body);
  // the rim glows, like something that lives where no light reaches
  for (const [x, y] of ed) if (bayer(x, y) < 0.7) body.px(x, y, LIGHT);
  // photophores: rows of bright spots along the body
  const bb = bbox(body);
  for (let i = 0; i < 14; i++) {
    const x = Math.round(bb.left + 8 + r() * (bb.right - bb.left - 16));
    const y = Math.round(bb.top + 8 + r() * (bb.bot - bb.top - 16));
    if (body.get(x, y) === DARK || body.get(x, y) === MID) {
      body.rect(x, y, 2, 2, WHITE);
      if (body.get(x - 1, y) >= 0) body.px(x - 1, y, LIGHT);
    }
  }
  const out = new PC(W0, H0);
  halo(out, bb.cx, bb.cy, (bb.right - bb.left) * 0.75, (bb.bot - bb.top) * 0.7, MID, 0.35);
  // the current streaming off it, back to the left (it faces right)
  for (let i = 0; i < 6; i++) {
    const y0 = bb.top + 10 + i * ((bb.bot - bb.top - 20) / 5);
    const ph = f * 0.9 + i;
    let px = bb.left + 6, py = y0;
    for (let t = 0; t < 26 + r() * 14; t++) {
      const x = bb.left + 6 - t, y = y0 + Math.sin(t * 0.35 + ph) * 3;
      if (bayer(x, Math.round(y)) < 1 - t / 40) out.line(px, py, x, y, t < 10 ? LIGHT : MID);
      px = x;
      py = y;
    }
  }
  out.blit(body, 0, 0);
  // bubbles, rising
  for (let i = 0; i < 9; i++) {
    const x = bb.left + r() * (bb.right - bb.left);
    const y = bb.top + ((r() * (bb.bot - bb.top) - f * 9) % (bb.bot - bb.top + 20)) - 6;
    const rad = 1 + Math.floor(r() * 3);
    if (rad === 1) out.px(x, y, WHITE);
    else out.ring(Math.round(x), Math.round(y), rad, rad, LIGHT);
  }
  out.outline(BLACK);
  return out;
}

/** World 3: the Titan steel. Armour plates riveted over it, a furnace in its chest, steam, and
 * the mark of its Titan: Scorvex's stinger, Widowmaker's blades, Ironclad's hammer. */
function scW3(id: string, f: number): PC {
  const W0 = 128, H0 = 116;
  const evo = evoFrames(id);
  const body = stand(upscale(evo?.[f] ?? baseFrames(id)[f], 2), W0, H0, 4);
  body.remap((c) => (c === WHITE ? WHITE : c === LIGHT ? MID : c));
  const bb = bbox(body);
  const r = artRng(5300 + f * 13 + id.length * 5);
  // plates: black seams on a grid, a pale rivet at each corner
  for (let y = 0; y < H0; y++)
    for (let x = 0; x < W0; x++) {
      const c = body.get(x, y);
      // the evolved form wears its own armour; only the little one gets riveted plates
      if (evo || (c !== MID && c !== DARK)) continue;
      if ((x - bb.left) % 12 === 0 || (y - bb.top) % 10 === 0) body.px(x, y, BLACK);
      else if ((x - bb.left) % 12 === 2 && (y - bb.top) % 10 === 2) body.px(x, y, LIGHT);
      else if ((x - bb.left) % 12 === 1 || (y - bb.top) % 10 === 1) body.px(x, y, c === MID ? LIGHT : MID);
    }
  // the furnace: a white-hot glow in its middle
  for (let y = -6; y <= 6; y++)
    for (let x = -8; x <= 8; x++) {
      const d = Math.hypot(x / 8, y / 6);
      const px = Math.round(bb.cx + x), py = Math.round(bb.cy + 4 + y);
      if (d <= 1 && body.get(px, py) >= 0) body.px(px, py, d < 0.45 ? WHITE : bayer(px, py) < 1 - d ? LIGHT : body.get(px, py));
    }
  const out = new PC(W0, H0);
  // the Titan's mark, behind it
  if (id === 'scorvlet' && !evo) {
    // a great segmented tail over its back, ending in a white-hot stinger
    const base: Pt = [bb.left + 10, bb.cy];
    const tip: Pt = [bb.cx + 12, bb.top - 4 + (f === 4 ? 10 : 0)];
    const ctl: Pt = [bb.left - 16, bb.top - 22];
    for (let i = 12; i >= 0; i--) {
      const u = i / 12;
      const x = (1 - u) * (1 - u) * base[0] + 2 * (1 - u) * u * ctl[0] + u * u * tip[0];
      const y = (1 - u) * (1 - u) * base[1] + 2 * (1 - u) * u * ctl[1] + u * u * tip[1];
      out.circle(Math.round(x), Math.round(Math.max(3, y)), Math.round(6 - u * 2.5), i % 2 ? MID : LIGHT);
    }
    out.poly([[tip[0] - 3, Math.max(3, tip[1]) - 2], [tip[0] + 8, Math.max(3, tip[1]) + 6], [tip[0] - 1, Math.max(3, tip[1]) + 5]], WHITE);
  }
  if (id === 'widowling' && !evo) {
    // four extra bladed legs, steel, reaching out from its back
    for (let i = 0; i < 4; i++) {
      const hx = bb.cx - 6 + i * 4, hy = bb.cy - 6;
      const kx = bb.left - 8 + i * 30 + (f === 4 ? 6 : 0), ky = bb.top - 10 + Math.abs(i - 1.5) * 4;
      const fx = kx + (i < 2 ? -10 : 10), fy = bb.bot - 2;
      out.thick(hx, hy, kx, ky, MID, 3);
      out.thick(kx, ky, fx, fy - 8, LIGHT, 2);
      out.poly([[fx - 3, fy - 10], [fx + 3, fy - 10], [fx, fy]], WHITE);
      out.circle(kx, ky, 2, LIGHT);
    }
  }
  if (id === 'ironbud' && !evo) {
    // Ironclad's hammer, huge, over its shoulder
    const hx = bb.cx + (f === 4 ? 26 : 6), hy = bb.top + (f === 4 ? 10 : -2);
    out.thick(bb.cx - 10, bb.cy + 6, hx, hy, MID, 3);
    out.rect(hx - 14, hy - 12, 28, 18, MID);
    out.rect(hx - 14, hy - 12, 28, 3, LIGHT);
    out.rect(hx - 14, hy + 3, 28, 3, DARK);
    out.rect(hx - 12, hy - 8, 2, 2, WHITE);
    out.rect(hx + 10, hy - 8, 2, 2, WHITE);
  }
  out.blit(body, 0, 0);
  // steam, rising off the plates
  for (let i = 0; i < 6; i++) {
    const x = bb.left + 6 + r() * (bb.right - bb.left - 12);
    const y0 = bb.top + 6 - ((f * 5 + i * 3) % 12);
    for (let t = 0; t < 4; t++) out.ellipse(Math.round(x + Math.sin(t + i) * 2), Math.round(y0 - t * 4), 2 + t, 1 + Math.floor(t / 2), t < 2 ? LIGHT : MID);
  }
  out.outline(BLACK);
  return out;
}

/** A spirit of yours, supercharged: 6 frames (0-3 idle, 4 attack, 5 hurt), facing right. */
export function scFrames(id: string): PC[] {
  const w1 = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'].includes(id);
  const w2 = ['glowbell', 'hammerfin', 'bubblotl', 'glidray'].includes(id);
  const raw = [0, 1, 2, 3, 4, 5].map((f) => (w1 ? scW1(id, f) : w2 ? scW2(id, f) : scW3(id, f)));
  // one common canvas so the frames line up
  const W0 = Math.max(...raw.map((p) => p.w));
  const H0 = Math.max(...raw.map((p) => p.h));
  return raw.map((p) => {
    const o = new PC(W0, H0);
    o.blit(p, Math.round((W0 - p.w) / 2), H0 - p.h);
    return o;
  });
}

/** The guardian at full size: Wispmane or Viperwind, facing right (0-3 idle, 4 attack, 5 hurt). */
export function guardianFrames(id: string): PC[] {
  const draw = (pose: number) => (id === 'wispmane' ? wispmane(1.05, pose, 3) : viperwind(1.15, pose));
  const plan: [number, number][] = id === 'wispmane' ? [[0, 0], [0, -1], [0, -1], [0, 0], [1, 0], [3, 0]] : [[0, 0], [3, 0], [0, -1], [4, 0], [1, 0], [2, 0]];
  return plan.map(([pose, bob], i) => {
    const p = stand(draw(pose).flipX(), 80, 72, 1, bob);
    // a few motes of light around it
    const r = artRng(600 + i);
    for (let n = 0; n < 6; n++) {
      const x = Math.floor(r() * 80), y = Math.floor(r() * 50);
      if (p.get(x, y) < 0) p.px(x, y, i % 2 ? WHITE : LIGHT);
    }
    return p;
  });
}

/** Flamora with its fire gone out: grey, folded on the floor of a cell. */
export function flamoraDim(k: number): PC {
  const p = flamora(k, 3);
  p.remap((c) => (c === WHITE ? MID : c === LIGHT ? MID : c === MID ? DARK : c));
  return p;
}

// ================================================================== THE ARENAS

/** The high-security hall: a vault of black stone, chains, moonlit slits, the great sealed door. */
export function hallBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(9601);
  for (let y = 0; y < 210; y++)
    for (let x = 0; x < 680; x++) {
      const by = Math.floor(y / 18);
      const seam = y % 18 === 0 || (x + (by % 2) * 22) % 44 === 0;
      p.px(x, y, seam ? BLACK : bayer(x, y) < 0.08 ? MID : DARK);
    }
  // pillars with chains
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 120;
    for (let y = 0; y < 210; y++) for (let xx = x; xx < x + 30; xx++) p.px(xx, y, bayer(xx, y) < 0.3 ? MID : DARK);
    p.rect(x, 0, 3, 210, MID);
    p.rect(x + 27, 0, 3, 210, BLACK);
    for (let b = 0; b < 210; b += 26) p.rect(x - 2, b, 34, 3, BLACK);
    // a chain hanging beside it, swaying a little (painted mid-swing)
    const cx = x + 46 + Math.floor(r() * 8);
    for (let l = 0; l < 14; l++) p.ring(cx + Math.round(Math.sin(l * 0.3) * 2), 4 + l * 7, 2, 3, l % 2 ? MID : LIGHT);
  }
  // high moonlit slits; their light falls in long pale bars
  for (let i = 0; i < 5; i++) {
    const x = 98 + i * 120;
    p.rect(x, 14, 12, 50, BLACK);
    p.rect(x + 3, 18, 6, 42, LIGHT);
    for (let y = 64; y < 210; y++)
      for (let dx = 0; dx < 10 + (y - 64) * 0.22; dx++) {
        const xx = x + 1 + dx + Math.round((y - 64) * 0.35);
        if (bayer(xx, y) < 0.12 && p.get(xx, y) === DARK) p.px(xx, y, MID);
      }
  }
  // the great round door at the end of the hall, torn off its hinges
  p.circle(340, 120, 58, BLACK);
  p.ring(340, 120, 58, 58, MID);
  p.ring(340, 120, 54, 54, LIGHT);
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    p.rect(Math.round(340 + Math.cos(ang) * 46) - 2, Math.round(120 + Math.sin(ang) * 46) - 2, 5, 5, MID);
  }
  return p;
}

/**
 * The centre of his domain: no walls, no sky. A black eclipse in a white corona, floating
 * shards of the prison, chains going up into nothing, faces in the dark.
 */
export function domainBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(9701);
  for (let y = 0; y < 210; y++) for (let x = 0; x < 680; x++) p.px(x, y, bayer(x, y) < 0.12 * (y / 210) ? DARK : BLACK);
  // the eclipse
  const ex = 340, ey = 74;
  for (let y = ey - 80; y < ey + 80; y++)
    for (let x = ex - 100; x < ex + 100; x++) {
      const d = Math.hypot(x - ex, y - ey);
      if (d < 44) continue;
      const t = (d - 44) / 56;
      if (t > 1) continue;
      const rays = 0.5 + 0.5 * Math.sin(Math.atan2(y - ey, x - ex) * 9 + d * 0.05);
      const v = (1 - t) * (0.6 + rays * 0.4);
      p.px(x, y, v > 0.82 ? WHITE : bayer(x, y) < v ? (v > 0.5 ? LIGHT : MID) : p.get(x, y));
    }
  p.circle(ex, ey, 44, BLACK);
  p.ring(ex, ey, 44, 44, WHITE);
  // chains, straight up into the dark
  for (let i = 0; i < 7; i++) {
    const x = 30 + i * 100 + Math.floor(r() * 30);
    const len = 40 + Math.floor(r() * 90);
    for (let l = 0; l < len; l += 7) p.ring(x, l, 2, 3, l % 14 ? DARK : MID);
  }
  // floating shards of the prison: blocks, a barred window, a cell door
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 76 + Math.floor(r() * 20);
    const y = 110 + Math.floor(r() * 60) - (i % 2) * 40;
    const w = 14 + Math.floor(r() * 26), h = 8 + Math.floor(r() * 12);
    p.poly([[x, y], [x + w, y + 2], [x + w - 4, y + h], [x + w / 2, y + h + 6], [x + 3, y + h]], DARK);
    p.rect(x, y, w, 2, MID);
    if (i % 3 === 1) for (let b = 0; b < 3; b++) p.rect(x + 3 + b * 5, y - 14, 2, 14, MID);
  }
  // faces in the dark, very faint: the souls he took
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * 680), y = 20 + Math.floor(r() * 120);
    if (Math.hypot(x - ex, y - ey) < 110) continue;
    p.ellipse(x, y, 4, 5, DARK);
    p.px(x - 2, y - 1, MID);
    p.px(x + 2, y - 1, MID);
    p.rect(x - 1, y + 2, 3, 1, MID);
  }
  return p;
}

/** The floor of his domain: a round dais of black stone split by cracks of white light. */
export function domainFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(9801);
  for (let y = 0; y < 140; y++) for (let x = 0; x < 720; x++) p.px(x, y, bayer(x, y) < 0.1 + (y / 140) * 0.15 ? MID : DARK);
  // rings carved into it
  for (let k = 1; k < 6; k++) {
    for (let a = 0; a < Math.PI * 2; a += 0.004) {
      const x = Math.round(360 + Math.cos(a) * k * 70);
      const y = Math.round(20 + Math.sin(a) * k * 14);
      if (y >= 0 && y < 140) p.px(x, y, BLACK);
    }
  }
  // the cracks, with light in them
  for (let i = 0; i < 16; i++) {
    let x = Math.floor(r() * 720), y = Math.floor(r() * 30);
    for (let s = 0; s < 14; s++) {
      const nx = x + (r() - 0.5) * 30, ny = y + 3 + r() * 9;
      p.line(x, y, nx, ny, s < 4 ? WHITE : LIGHT);
      p.line(x + 1, y, nx + 1, ny, BLACK);
      x = nx;
      y = ny;
      if (y > 140) break;
    }
  }
  return p;
}

// ================================================================== THE CAT

/**
 * The shadow the cat throws on the wall under the lamp: not a cat. A hooded figure with
 * a cat's ears through the hood, a crown, a scythe. Solid; drawn at low alpha on the wall.
 */
export function catShadow(): PC {
  const K0 = new K(90, 130, 1.6);
  // the scythe
  limb(K0, 70, 126, 64, 10, 1.2, 1.2, BLACK);
  K0.poly([[64, 10], [52, 6], [38, 8], [26, 16], [20, 26], [30, 18], [42, 14], [54, 14], [64, 16]], BLACK);
  // robe
  K0.poly([[32, 44], [52, 44], [62, 126], [22, 126]], BLACK);
  limb(K0, 52, 50, 66, 70, 4, 3, BLACK);
  // hood with ears
  K0.ell(42, 36, 11, 12, BLACK);
  K0.poly([[33, 30], [31, 14], [39, 25]], BLACK);
  K0.poly([[51, 30], [53, 14], [45, 25]], BLACK);
  // crown
  for (let i = 0; i < 5; i++) K0.poly([[34 + i * 4, 24], [36 + i * 4, 17 - (i === 2 ? 3 : 0)], [38 + i * 4, 24]], BLACK);
  // a tail curling out from under the hem
  limb(K0, 58, 122, 74, 112, 2, 1.4, BLACK);
  limb(K0, 74, 112, 80, 98, 1.4, 1, BLACK);
  return K0.p;
}

/**
 * The very last image: the cat's eyes, close, filling the dark. Frames: 0 open (slit
 * pupils), 1 half closed, 2 closed (a slow blink), 3 open and glowing brighter.
 */
export function catEyes(f: number): PC {
  const p = new PC(220, 70);
  const open = f === 1 ? 0.45 : f === 2 ? 0.04 : 1;
  for (const cx of [60, 160]) {
    const cy = 36;
    const rx = 34, ry = 20 * open;
    if (f === 3) halo(p, cx, cy, rx + 12, 24 + 10, MID, 0.5);
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        // an almond: pointed at both corners
        const u = (x - cx) / rx;
        const lim = ry * (1 - u * u);
        if (Math.abs(y - cy) > lim) continue;
        const d = Math.hypot(u, (y - cy) / Math.max(1, ry));
        p.px(x, y, d < 0.5 ? WHITE : bayer(x, y) < 1 - d * 0.6 ? WHITE : LIGHT);
      }
    if (open > 0.1) {
      // the pupil: a thin vertical slit
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
        const w = 2.4 * (1 - Math.abs(y - cy) / Math.max(1, ry + 1));
        p.rect(Math.round(cx - w), y, Math.max(1, Math.round(w * 2)), 1, BLACK);
      }
      p.rect(cx - 12, Math.round(cy - ry * 0.5), 3, 2, WHITE);
    } else p.rect(cx - rx + 4, cy, rx * 2 - 8, 1, MID);
  }
  return p;
}
