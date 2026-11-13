import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer, type Pt } from './pixel';
import { K, chain, limb, wisp, wispmane, viperwind, flamora } from './artW4beasts';
import { creatureFrames } from './artCreatures';
import { evoFrames } from './artEvo';

// The final world, battle art: the three great spirits as creatures that fight beside
// you, the Skeleton Warden, the five SUPERCHARGED starters, and the prison arenas.

// ------------------------------------------------------------------ helpers

function kring(K0: K, cx: number, cy: number, rx: number, ry: number, c: number) {
  K0.p.ring(Math.round(K0.X(cx)), Math.round(K0.Y(cy)), Math.max(1, Math.round(rx * K0.k)), Math.max(1, Math.round(ry * K0.k)), c);
}

/** Nearest-neighbour upscale by a whole number. */
export function upscale(src: PC, n: number): PC {
  const o = new PC(src.w * n, src.h * n);
  for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.data[y * o.w + x] = src.data[Math.floor(y / n) * src.w + Math.floor(x / n)];
  return o;
}

/** Drop `src` into a w x h canvas, centred, standing on the bottom edge (minus `foot`). */
export function stand(src: PC, w: number, h: number, foot = 1, dy = 0): PC {
  let top = src.h, bot = 0, left = src.w, right = 0;
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++)
      if (src.get(x, y) >= 0) {
        top = Math.min(top, y);
        bot = Math.max(bot, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  const o = new PC(w, h);
  if (bot < top) return o;
  const dx = Math.round(w / 2 - (left + right) / 2);
  o.blit(src, dx, h - foot - bot - 1 + dy);
  return o;
}

// ================================================================== the three spirits, as creatures

/** 48x48 battle frames facing right: 0-3 idle, 4 attack, 5 hurt / knocked out. */
export function creatureFrames5(id: string): PC[] {
  const draw = (pose: number) => {
    if (id === 'wispmane') return wispmane(0.72, pose, 3);
    if (id === 'viperwind') return viperwind(0.8, pose);
    return flamora(0.48, pose);
  };
  // idle poses (with a little breathing bob), the attack pose, the fallen pose
  const plan: [number, number][] =
    id === 'wispmane'
      ? [[0, 0], [0, -1], [0, -1], [0, 0], [1, 0], [3, 0]]
      : id === 'viperwind'
        ? [[0, 0], [3, 0], [0, -1], [4, 0], [1, 0], [2, 0]]
        : [[0, 0], [0, -1], [1, -1], [1, 0], [2, 0], [3, 0]];
  return plan.map(([pose, bob]) => stand(draw(pose).flipX(), 48, 48, 1, bob));
}

/** Overworld followers (16x20, 9 frames: down, up, left x 3 steps). They are side-on beasts. */
export function miniSheet5(id: string): PC[] {
  const out: PC[] = [];
  const side = (f: number) => {
    const pose = id === 'viperwind' ? [0, 3, 0][f] : id === 'flamora' ? [0, 1, 0][f] : 0;
    const src = id === 'wispmane' ? wispmane(0.26, pose, 3) : id === 'viperwind' ? viperwind(0.3, pose) : flamora(0.18, pose);
    return stand(src, 16, 20, 1, f === 1 ? -1 : 0);
  };
  for (let d = 0; d < 3; d++) for (let f = 0; f < 3; f++) out.push(d === 1 ? side(f).flipX() : side(f));
  return out;
}

// ================================================================== THE SKELETON WARDEN

/**
 * Forty years on the night shift. A tall skeleton in a warden's peaked cap and a long
 * coat that hangs off its shoulder blades, a ring of keys at the hip, a lantern in one
 * hand and the nightstick in the other. Facing left. Design box 64x96.
 * Poses: 0 stands guard, 1 swings (nightstick overhead), 2 winds up (crouched, keys out),
 * 3 collapsed (a heap of bones, the cap on top), 4 stands guard with the lantern blazing
 * (his second wind: the coat is torn, the eye sockets burn).
 */
export function skelWarden(k: number, pose: number): PC {
  const K0 = new K(64, 96, k);
  const r = artRng(901 + pose);
  if (pose === 3) {
    // the heap: ribs, a femur, the skull with the cap jammed on, the keys spilled out
    K0.ell(32, 90, 26, 5, DARK);
    for (let i = 0; i < 9; i++) K0.line(12 + i * 5, 86 - (i % 3), 18 + i * 5 + r() * 4, 92, i % 2 ? WHITE : LIGHT, 2);
    limb(K0, 10, 88, 30, 84, 2.2, 2.2, LIGHT);
    K0.ell(10, 88, 3, 3, WHITE);
    K0.ell(30, 84, 3, 3, WHITE);
    K0.ell(44, 82, 8, 7, LIGHT);
    K0.form(44, 81, 8, 7, [MID, LIGHT, WHITE], LIGHT);
    K0.ell(41, 82, 2, 2.4, BLACK);
    K0.ell(46, 82, 2, 2.4, BLACK);
    K0.rect(38, 74, 14, 4, DARK);
    K0.poly([[36, 78], [54, 78], [56, 80], [34, 80]], BLACK);
    K0.ell(50, 74, 2, 2, LIGHT);
    for (let i = 0; i < 5; i++) K0.ell(16 + i * 3, 91, 1.4, 2, i % 2 ? LIGHT : MID);
    kring(K0, 16, 90, 5, 3, MID);
    return K0.done();
  }
  const rage = pose === 4;
  const swing = pose === 1;
  const crouch = pose === 2 ? 6 : 0;
  const g = 94;
  const hip = 58 + crouch;
  // legs: long bones in ragged trousers
  chain(K0, [[30, hip], [27, 76 + crouch / 2], [24, g - 2]], 3.2, 2.6, DARK);
  chain(K0, [[38, hip], [41, 76 + crouch / 2], [42, g - 2]], 3.2, 2.6, DARK);
  K0.ell(22, g - 1, 5, 2.2, BLACK); // boots
  K0.ell(41, g - 1, 5, 2.2, BLACK);
  // the long coat, open, hanging off the shoulders
  const sh = 30 + crouch;
  K0.poly([[22, sh], [46, sh], [52, hip + 14], [44, hip + 16], [34, hip + 6], [24, hip + 16], [16, hip + 14]], MID);
  K0.form(34, sh + 12, 20, 22, [DARK, MID, LIGHT], MID);
  if (rage)
    for (let i = 0; i < 5; i++) {
      const x = 18 + i * 7;
      K0.poly([[x, hip + 17], [x + 3, hip + 8 + r() * 4], [x + 6, hip + 17]], DARK);
      K0.line(x + 3, hip + 8, x + 3, hip + 16, BLACK, 0.8);
    }
  // the ribcage showing between the lapels
  K0.ell(34, sh + 12, 7, 11, BLACK);
  for (let i = 0; i < 5; i++) K0.line(28, sh + 5 + i * 4, 40, sh + 5 + i * 4, i === 0 ? WHITE : LIGHT, 1.3);
  K0.line(34, sh + 3, 34, sh + 24, WHITE, 1.4); // the spine
  // the badge and the belt with its ring of keys
  K0.poly([[44, sh + 6], [47, sh + 4], [50, sh + 6], [47, sh + 10]], WHITE);
  K0.rect(22, hip - 3, 26, 3, BLACK);
  kring(K0, 46, hip + 3, 4, 4, LIGHT);
  for (let i = 0; i < 4; i++) K0.line(44 + i * 1.6, hip + 5, 43 + i * 2, hip + 11, i % 2 ? WHITE : LIGHT, 1);
  // the head: a long skull under a peaked cap
  const hx = 32;
  const hy = 18 + crouch + (swing ? -2 : 0);
  K0.ell(hx, hy + 2, 8, 9, LIGHT);
  K0.form(hx, hy, 8, 9, [MID, LIGHT, WHITE], LIGHT);
  K0.rect(hx - 5, hy + 8, 10, 3, WHITE); // the jaw
  for (let i = 0; i < 4; i++) K0.line(hx - 4 + i * 2.6, hy + 8, hx - 4 + i * 2.6, hy + 11, BLACK, 0.6);
  K0.ell(hx - 4, hy + 2, 2.4, 2.8, BLACK);
  K0.ell(hx + 3, hy + 2, 2.4, 2.8, BLACK);
  // pin-prick lights in the sockets (they flare in his second wind)
  K0.dot(hx - 4.4, hy + 2, WHITE, rage ? 1.4 : 0.7);
  K0.dot(hx + 2.6, hy + 2, WHITE, rage ? 1.4 : 0.7);
  K0.poly([[hx - 1, hy + 5], [hx + 1, hy + 5], [hx, hy + 7]], BLACK);
  // the cap: a peaked warden's cap, brim pulled down
  K0.poly([[hx - 10, hy - 4], [hx + 10, hy - 4], [hx + 8, hy - 11], [hx - 6, hy - 12]], DARK);
  K0.poly([[hx - 14, hy - 4], [hx + 6, hy - 4], [hx + 4, hy - 1], [hx - 16, hy - 1]], BLACK);
  K0.ell(hx - 1, hy - 8, 2, 1.6, WHITE);
  // the lantern arm (his left, our right) and the nightstick arm
  const lx = 52, ly = rage ? sh + 4 : sh + 20 + crouch / 2;
  chain(K0, [[45, sh + 2], [50, sh + 12], [lx, ly]], 2.2, 1.8, LIGHT);
  K0.line(lx, ly, lx, ly + 4, BLACK, 1);
  K0.rect(lx - 4, ly + 4, 8, 10, BLACK);
  K0.rect(lx - 3, ly + 5, 6, 8, rage ? WHITE : LIGHT);
  if (rage) for (let i = 0; i < 8; i++) K0.dot(lx + (r() - 0.5) * 14, ly + 9 + (r() - 0.5) * 14, WHITE, 0.6);
  if (swing) {
    // the stick, raised high over the cap
    chain(K0, [[22, sh + 2], [14, sh - 6], [10, sh - 16]], 2.2, 1.8, LIGHT);
    K0.line(10, sh - 16, 4, sh - 38, BLACK, 4);
    K0.line(10, sh - 16, 4, sh - 38, DARK, 2.4);
  } else if (pose === 2) {
    // crouched, the ring of keys held out like a weapon
    chain(K0, [[22, sh + 2], [12, sh + 10], [4, sh + 12]], 2.2, 1.8, LIGHT);
    kring(K0, 2, sh + 16, 5, 5, WHITE);
    for (let i = 0; i < 5; i++) K0.line(0 + i * 1.6, sh + 20, -1 + i * 2, sh + 27, LIGHT, 1);
  } else {
    chain(K0, [[22, sh + 2], [18, sh + 14], [16, sh + 24 + crouch]], 2.2, 1.8, LIGHT);
    K0.line(16, sh + 22, 8, sh + 44, BLACK, 4);
    K0.line(16, sh + 22, 8, sh + 44, DARK, 2.4);
  }
  return K0.done();
}

// ================================================================== the SUPERCHARGED starters

/**
 * A starter pushed past its limits: the same creature (so you know it at once), three
 * times the size, its colours one shade darker except its eyes, which burn white, with
 * a ragged aura of light boiling off it. Faces left. Frames follow the spirits:
 * 0 rest, 1 attack, 2 winding up (aura flares), 3 spent (no aura: drained, small,
 * normal colours, slumped), 4 rest in the last phase (aura wild).
 */
export function superBody(id: string, f: number, n = 3, facingLeft = true, pickOverride?: number, seedOff = 0): PC {
  const src = creatureFrames(id);
  const pick = pickOverride ?? [0, 4, 2, 5, 1][f];
  const spent = f === 3;
  // evolved: its own bigger design (spent, the charge drains and it is the little one again)
  const evo = spent ? null : evoFrames(id);
  const up = upscale(evo ? evo[pick] : src[pick], n);
  const base = facingLeft ? up.flipX() : up;
  const W0 = Math.round((176 * n) / 3), H0 = Math.round((168 * n) / 3);
  const body = stand(base, W0, H0, 4);
  if (spent) {
    // drained: the colours wash out, it sags low
    body.remap((c) => (c === DARK ? MID : c));
    return body;
  }
  // darker, except the eyes and the brightest highlights
  body.remap((c) => (c === WHITE ? WHITE : c === LIGHT ? MID : c === MID ? DARK : c));
  const out = new PC(W0, H0);
  const r = artRng(7000 + f * 13 + id.length * 31 + seedOff);
  const flare = f === 2 ? 1.5 : f === 4 ? 1.35 : 1;
  // the aura: flames licking up off every edge of the silhouette
  const edge: Pt[] = [];
  for (let y = 1; y < H0 - 1; y++)
    for (let x = 1; x < W0 - 1; x++) {
      if (body.get(x, y) < 0) continue;
      if (body.get(x - 1, y) < 0 || body.get(x + 1, y) < 0 || body.get(x, y - 1) < 0) edge.push([x, y]);
    }
  for (let i = 0; i < edge.length; i += 3) {
    const [x, y] = edge[i];
    if (r() > 0.6) continue;
    const len = (4 + r() * 10) * flare;
    const sway = (r() - 0.5) * 5;
    for (let t = 0; t < len; t++) {
      const px = x + sway * (t / len) + Math.sin(t * 0.7 + i) * 1.2;
      const py = y - t;
      const c = t < len * 0.35 ? WHITE : t < len * 0.75 ? LIGHT : MID;
      if (bayer(Math.round(px), Math.round(py)) < 1 - t / len) out.px(px, py, c);
    }
  }
  // a faint halo ring behind it
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const rx = ((70 * n) / 3) * flare * 0.9, ry = ((60 * n) / 3) * flare * 0.9;
    const x = W0 / 2 + Math.cos(a) * rx;
    const y = H0 * 0.55 + Math.sin(a) * ry;
    if (bayer(Math.round(x), Math.round(y)) < 0.35) out.px(x, y, LIGHT);
  }
  out.blit(body, 0, 0);
  // crackles of energy across the body
  for (let i = 0; i < 6 * flare; i++) {
    const [x0, y0] = edge[Math.floor(r() * edge.length)] ?? [W0 / 2, H0 / 2];
    let x = x0, y = y0;
    for (let s = 0; s < 6; s++) {
      const nx = x + (r() - 0.5) * 12, ny = y + (r() - 0.3) * 10;
      out.line(x, y, nx, ny, WHITE);
      x = nx;
      y = ny;
    }
  }
  out.outline(BLACK);
  return out;
}

// ================================================================== the arenas

/** The Warden's Post: a long stone corridor, barred cell doors, a single caged bulb. */
export function postBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(951);
  for (let y = 0; y < 210; y++)
    for (let x = 0; x < 680; x++) {
      const by = Math.floor(y / 12);
      const edge = y % 12 === 0 || (x + (by % 2) * 10) % 20 === 0;
      p.px(x, y, edge ? BLACK : (Math.floor(x / 20) * 5 + by * 3) % 7 === 0 ? MID : DARK);
    }
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 110;
    // a cell door: dark inside, bars, a hatch
    p.rect(x, 70, 70, 140, BLACK);
    for (let b = 0; b < 7; b++) p.rect(x + 4 + b * 10, 70, 3, 140, b % 2 ? MID : LIGHT);
    p.rect(x, 70, 70, 4, LIGHT);
    p.rect(x, 120, 70, 3, MID);
    p.rect(x + 26, 132, 18, 8, DARK);
    // something inside, watching
    if (r() < 0.6) {
      p.px(x + 30 + Math.floor(r() * 12), 100 + Math.floor(r() * 20), WHITE);
      p.px(x + 34 + Math.floor(r() * 12), 100 + Math.floor(r() * 20), WHITE);
    }
  }
  // the caged bulb and its cone of light
  p.rect(338, 0, 2, 22, BLACK);
  p.ring(339, 28, 7, 7, MID);
  p.circle(339, 28, 4, WHITE);
  for (let y = 36; y < 210; y++)
    for (let x = 339 - (y - 36) * 0.8; x < 339 + (y - 36) * 0.8; x++) if (bayer(Math.round(x), y) < 0.18) p.px(x, y, LIGHT);
  return p;
}

/** The guard barracks: lockers, a weapon rack, a duty board, a high barred window. */
export function guardBack(): PC {
  const p = new PC(680, 210);
  const r = artRng(952);
  for (let y = 0; y < 210; y++) for (let x = 0; x < 680; x++) p.px(x, y, y % 30 === 0 ? BLACK : (x + y) % 61 === 0 ? MID : DARK);
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 74;
    if (i % 3 === 1) {
      // the weapon rack: batons and spears
      p.rect(x, 90, 60, 6, MID);
      for (let w = 0; w < 6; w++) p.rect(x + 4 + w * 10, 60 + (w % 2) * 10, 3, 100, w % 2 ? LIGHT : MID);
      p.rect(x, 150, 60, 6, MID);
    } else {
      // a pair of lockers
      for (let l = 0; l < 2; l++) {
        p.rect(x + l * 30, 80, 28, 130, MID);
        p.frame(x + l * 30, 80, 28, 130, BLACK);
        for (let v = 0; v < 4; v++) p.rect(x + l * 30 + 6, 90 + v * 4, 16, 1, BLACK);
        p.rect(x + l * 30 + 22, 140, 2, 8, LIGHT);
        if (r() < 0.3) p.rect(x + l * 30 + 3, 120, 22, 2, LIGHT);
      }
    }
  }
  // a high barred window with moonlight
  p.rect(300, 14, 80, 40, BLACK);
  for (let b = 0; b < 5; b++) p.rect(306 + b * 16, 14, 3, 40, MID);
  p.circle(330, 30, 6, LIGHT);
  // the duty board
  p.rect(560, 24, 90, 44, LIGHT);
  p.frame(560, 24, 90, 44, BLACK);
  for (let l = 0; l < 5; l++) p.rect(566, 30 + l * 7, 30 + Math.floor(r() * 50), 2, DARK);
  return p;
}

/** Old prison flagstones, worn smooth, with drains. */
export function prisonFloor(): PC {
  const p = new PC(720, 140);
  const r = artRng(953);
  for (let y = 0; y < 140; y++) for (let x = 0; x < 720; x++) p.px(x, y, bayer(x, y) < 0.12 + r() * 0.05 ? DARK : MID);
  for (let y = 0; y < 140; y += 16) p.rect(0, y, 720, 1, DARK);
  for (let y = 0; y < 140; y += 16) for (let x = (y / 16) % 2 ? 0 : 24; x < 720; x += 48) p.rect(x, y, 1, 16, DARK);
  for (let i = 0; i < 4; i++) {
    const x = 80 + i * 170;
    p.rect(x, 40, 20, 10, BLACK);
    for (let b = 0; b < 4; b++) p.rect(x + 2 + b * 5, 40, 2, 10, DARK);
  }
  return p;
}

export const W5_BATTLE_IDS = ['wispmane', 'viperwind', 'flamora'];
void LIGHT;
