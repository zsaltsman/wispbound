import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { type Look, CW, CH } from './artPeople';
import { skelWarden } from './artW5';

// The final world, on the map: the prison's people (guards in black, prisoners in
// stripes, skeletons, ghosts, a very small imp), and its fixtures: the elevator, the
// slop, the trough, the kitchen pot and its cage, the mess-hall clock, the lock.

type Facing = 'down' | 'up' | 'left';

/** People, drawn by the usual person painter (textures.ts adds 'ch_' + key). */
export const LOOKS5: Record<string, Look> = {
  player_guard: { hat: 'cap', hatC: BLACK, body: DARK, legs: BLACK, lantern: true, tie: true },
  guard: { hat: 'cap', hatC: BLACK, body: DARK, legs: BLACK, tie: true },
  guard2: { hat: 'cap', hatC: BLACK, body: DARK, legs: BLACK, mustache: true, round: true },
  guard3: { hat: 'cap', hatC: BLACK, body: DARK, legs: BLACK, hair: 'ponytail', hairC: MID },
  sergeant: { hat: 'captain', hatC: BLACK, body: DARK, legs: BLACK, mustache: true, sash: true, round: true },
  slopwarden: { hat: 'cap', hatC: DARK, body: MID, legs: DARK, round: true, apron: true, mustache: true },
  cook: { hat: 'chef', body: LIGHT, legs: DARK, apron: true, round: true },
  pr_a: { hair: 'messy', hairC: DARK, body: LIGHT, legs: LIGHT, stripes: true },
  pr_b: { hair: 'bald', body: LIGHT, legs: LIGHT, stripes: true, beard: MID, round: true },
  pr_c: { hair: 'long', hairC: MID, body: LIGHT, legs: LIGHT, stripes: true },
  pr_d: { hair: 'spiky', hairC: BLACK, body: LIGHT, legs: LIGHT, stripes: true, small: true },
  pr_e: { hair: 'wild', hairC: WHITE, body: LIGHT, legs: LIGHT, stripes: true, beard: WHITE, bigcoat: true },
  pr_f: { hat: 'beanie', hatC: DARK, body: LIGHT, legs: LIGHT, stripes: true, round: true },
  pr_g: { hat: 'sou', hatC: MID, body: LIGHT, legs: LIGHT, stripes: true, beard: DARK },
  pr_h: { hair: 'afro', hairC: DARK, body: LIGHT, legs: LIGHT, stripes: true, glasses: true },
};

// ------------------------------------------------------------------ skeletons and an imp

function skeleton(dir: Facing, f: number, o: { cap?: boolean; coat?: boolean; stripes?: boolean }): PC {
  const p = new PC(CW, CH);
  const step = f === 1 ? 1 : f === 2 ? -1 : 0;
  const side = dir === 'left';
  // legs: two thin bones
  if (side) {
    p.rect(6 + step, 15, 1, 5, WHITE);
    p.rect(9 - step, 15, 1, 5, LIGHT);
  } else {
    p.rect(5, 15 + (step > 0 ? -1 : 0), 1, 5, WHITE);
    p.rect(10, 15 + (step < 0 ? -1 : 0), 1, 5, WHITE);
  }
  // the pelvis and the body (a coat, rags, or bare ribs)
  p.rect(5, 14, 6, 1, LIGHT);
  if (o.coat) {
    p.rect(4, 8, 8, 7, DARK);
    p.rect(7, 8, 2, 5, BLACK);
    p.px(10, 9, WHITE); // the badge
  } else if (o.stripes) {
    p.rect(4, 8, 8, 6, LIGHT);
    for (let y = 9; y < 14; y += 2) p.rect(4, y, 8, 1, DARK);
  } else {
    p.rect(7, 8, 2, 6, WHITE);
    for (let y = 9; y < 13; y += 2) p.rect(5, y, 6, 1, LIGHT);
  }
  // arms
  p.rect(side ? 6 : 3, 9 - (side ? 0 : step), 1, 5, WHITE);
  if (!side) p.rect(12, 9 + step, 1, 5, WHITE);
  // the skull
  p.ellipse(8, 4, 4, 4, WHITE);
  p.rect(6, 7, 4, 2, LIGHT);
  if (dir !== 'up') {
    p.rect(side ? 4 : 5, 3, 2, 2, BLACK);
    if (!side) p.rect(9, 3, 2, 2, BLACK);
    p.px(side ? 4 : 7, 6, BLACK);
    p.rect(side ? 4 : 6, 7, side ? 3 : 4, 1, BLACK);
    p.px(side ? 5 : 6, 7, LIGHT);
  }
  if (o.cap) {
    p.rect(3, 0, 10, 2, BLACK);
    p.rect(side ? 1 : 3, 2, side ? 8 : 10, 1, BLACK);
  }
  p.outline(BLACK);
  return p;
}
export function skeletonSheet(o: { cap?: boolean; coat?: boolean; stripes?: boolean } = {}): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(skeleton(d, f, o));
  return out;
}

function imp(dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = [0, -1, 0][f];
  const side = dir === 'left';
  p.rect(6, 17, 1, 3, DARK);
  p.rect(9, 17, 1, 3, DARK);
  p.ellipse(8, 14 + bob, 3, 3, MID);
  p.ellipse(8, 9 + bob, 4, 4, MID);
  // horns, a pointed tail
  p.line(5, 6 + bob, 4, 3 + bob, LIGHT);
  p.line(11, 6 + bob, 12, 3 + bob, LIGHT);
  p.line(side ? 11 : 12, 15 + bob, 14, 12 + bob, DARK);
  p.px(14, 11 + bob, DARK);
  if (dir !== 'up') {
    p.px(side ? 5 : 6, 9 + bob, WHITE);
    if (!side) p.px(10, 9 + bob, WHITE);
    p.rect(side ? 4 : 7, 11 + bob, 2, 1, BLACK);
  }
  p.outline(BLACK);
  return p;
}
export function impSheet(): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(imp(d, f));
  return out;
}

/** The Skeleton Warden on the map: a tall, non-directional figure (faces left). */
export function wardenOw(pose: number): PC {
  return skelWarden(0.32, pose);
}

// ------------------------------------------------------------------ fixtures

/** The elevator: two tiles wide, set into the wall (32x40). */
export function elevator(open: boolean): PC {
  const p = new PC(32, 40);
  p.rect(0, 4, 32, 36, DARK);
  p.frame(0, 4, 32, 36, BLACK);
  p.rect(2, 8, 28, 32, BLACK);
  if (open) {
    // the car: a dim cage of light
    p.rect(4, 10, 24, 30, DARK);
    for (let x = 6; x < 28; x += 4) p.rect(x, 10, 1, 30, BLACK);
    p.rect(2, 8, 3, 32, MID);
    p.rect(27, 8, 3, 32, MID);
  } else {
    p.rect(3, 8, 13, 32, MID);
    p.rect(16, 8, 13, 32, MID);
    p.rect(15, 8, 2, 32, BLACK);
    for (let y = 12; y < 40; y += 6) {
      p.rect(4, y, 11, 1, DARK);
      p.rect(17, y, 11, 1, DARK);
    }
  }
  // the dial over the doors: which floor it is on
  p.ellipse(16, 4, 7, 4, LIGHT);
  p.ellipse(16, 4, 5, 2, DARK);
  p.line(16, 5, 19, 2, WHITE);
  return p;
}

/** A tray of slop: grey, lumpy, steaming a little. */
export function slopTray(): PC {
  const p = new PC(14, 8);
  p.rect(0, 3, 14, 5, MID);
  p.frame(0, 3, 14, 5, BLACK);
  p.ellipse(5, 4, 3, 2, LIGHT);
  p.ellipse(9, 5, 2, 1, LIGHT);
  p.px(4, 3, WHITE);
  p.px(6, 0, LIGHT);
  p.px(8, 1, LIGHT);
  return p;
}

/** The slop trough (three tiles long). With the key, a glint in the muck. */
export function trough(key: boolean): PC {
  const p = new PC(48, 18);
  p.rect(1, 4, 46, 12, DARK);
  p.frame(1, 4, 46, 12, BLACK);
  p.rect(3, 6, 42, 6, MID);
  for (let i = 0; i < 9; i++) p.ellipse(5 + i * 4.5, 7 + (i % 2), 2, 1, LIGHT);
  p.rect(3, 16, 3, 2, BLACK);
  p.rect(42, 16, 3, 2, BLACK);
  if (key) {
    p.rect(30, 7, 4, 2, WHITE);
    p.px(35, 6, WHITE);
    p.px(36, 5, LIGHT);
  }
  // flies
  p.px(10, 1, BLACK);
  p.px(24, 0, BLACK);
  p.px(38, 2, BLACK);
  return p;
}

/**
 * The kitchen door, set in the side wall of the mess hall: heavy iron, a barred window,
 * a big padlock, and a plaque with a pot on it so you know what is behind it. 16x32.
 */
export function kitchenDoor(): PC {
  const p = new PC(16, 32);
  // the plaque over the door: a pot and its steam
  p.rect(1, 0, 14, 9, MID);
  p.rect(1, 0, 14, 1, LIGHT);
  p.rect(4, 4, 8, 4, BLACK);
  p.rect(3, 4, 10, 1, BLACK);
  p.px(6, 2, WHITE);
  p.px(9, 1, WHITE);
  p.px(8, 3, LIGHT);
  // the door
  p.rect(1, 10, 14, 22, DARK);
  p.rect(2, 11, 12, 20, MID);
  for (const y of [11, 30]) for (let x = 3; x < 14; x += 3) p.px(x, y, LIGHT);
  p.rect(2, 19, 12, 1, DARK);
  // the barred window
  p.rect(4, 13, 8, 5, BLACK);
  for (let x = 5; x < 12; x += 2) p.rect(x, 13, 1, 5, LIGHT);
  // the padlock
  p.rect(9, 22, 5, 5, WHITE);
  p.rect(10, 20, 3, 2, LIGHT);
  p.px(11, 24, BLACK);
  p.outline(BLACK);
  return p;
}

/** The kitchen's great pot on its fire, and the cage hung over it (40x48). */
export function bigPot(): PC {
  const p = new PC(40, 24);
  p.ellipse(20, 10, 18, 9, DARK);
  p.ellipse(20, 6, 16, 4, MID);
  p.ellipse(20, 6, 13, 3, LIGHT);
  p.rect(2, 4, 2, 4, BLACK);
  p.rect(36, 4, 2, 4, BLACK);
  const r = artRng(977);
  for (let i = 0; i < 9; i++) p.poly([[6 + i * 3.5, 23], [8 + i * 3.5, 15 + r() * 4], [10 + i * 3.5, 23]], i % 2 ? WHITE : LIGHT);
  p.outline(BLACK);
  return p;
}
export function potCage(open: boolean): PC {
  const p = new PC(32, 40);
  p.rect(15, 0, 2, 8, MID); // the chain
  p.ellipse(16, 10, 13, 4, DARK);
  p.rect(3, 10, 26, 2, MID);
  p.rect(3, 36, 26, 3, MID);
  for (let x = 4; x < 30; x += 5) {
    if (open && x > 8 && x < 24) continue;
    p.rect(x, 11, 2, 25, LIGHT);
    p.px(x, 11, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** The mess-hall clock. Stopped: the glass cracked, the hands at eight. */
export function wallClock(stopped: boolean): PC {
  const p = new PC(16, 16);
  p.circle(8, 8, 7, DARK);
  p.circle(8, 8, 6, WHITE);
  for (let h = 0; h < 12; h++) p.px(8 + Math.round(Math.cos((h / 12) * Math.PI * 2) * 5), 8 + Math.round(Math.sin((h / 12) * Math.PI * 2) * 5), MID);
  if (stopped) {
    // eight o'clock: the hour hand down and to the left, the minute hand straight up
    p.line(8, 8, 5, 10, BLACK);
    p.line(8, 8, 8, 3, BLACK);
    p.line(3, 4, 7, 7, MID);
    p.line(9, 9, 13, 12, MID);
  } else {
    p.line(8, 8, 11, 6, BLACK);
    p.line(8, 8, 8, 3, BLACK);
  }
  p.outline(BLACK);
  return p;
}

/** The big three-wheel combination lock on the last cell (16x16, hung on the bars). */
export function comboLock(open: boolean): PC {
  const p = new PC(16, 18);
  if (open) {
    p.ring(8, 4, 4, 4, LIGHT);
    p.rect(9, 4, 4, 4, -1 as unknown as number);
  } else p.ring(8, 5, 4, 4, LIGHT);
  p.rect(2, 7, 12, 10, MID);
  p.frame(2, 7, 12, 10, BLACK);
  for (let i = 0; i < 3; i++) {
    p.rect(3 + i * 4, 10, 3, 4, WHITE);
    p.rect(3 + i * 4, 12, 3, 1, DARK);
  }
  return p;
}

/** The portcullis the Warden drops (three tiles wide, two tall). */
export function portcullis(): PC {
  const p = new PC(48, 36);
  for (let x = 2; x < 48; x += 6) {
    p.rect(x, 0, 3, 32, MID);
    p.rect(x, 0, 1, 32, LIGHT);
    p.poly([[x, 32], [x + 3, 32], [x + 1.5, 36]], MID);
  }
  for (let y = 4; y < 32; y += 9) p.rect(0, y, 48, 2, DARK);
  p.outline(BLACK);
  return p;
}

/** A coat stand in the equipment room, with (or without) a spare uniform. */
export function uniformRack(full: boolean): PC {
  const p = new PC(16, 28);
  p.rect(7, 2, 2, 24, DARK);
  p.rect(3, 26, 10, 2, DARK);
  p.rect(3, 3, 10, 2, MID);
  if (full) {
    p.rect(3, 5, 10, 12, DARK);
    p.rect(7, 5, 2, 10, BLACK);
    p.px(11, 7, WHITE);
    p.rect(4, 0, 8, 3, BLACK); // the cap on top
  }
  p.outline(BLACK);
  return p;
}

/** All that is left of a prisoner: a little heap of dust and their clothes. */
export function dustPile(v: number): PC {
  const p = new PC(16, 10);
  const r = artRng(990 + v);
  p.ellipse(8, 7, 6, 3, MID);
  p.rect(3, 5, 9, 3, LIGHT);
  for (let y = 5; y < 8; y += 2) p.rect(3, y, 9, 1, DARK); // the stripes
  for (let i = 0; i < 8; i++) p.px(2 + Math.floor(r() * 12), 6 + Math.floor(r() * 4), LIGHT);
  if (v % 2) p.rect(10, 3, 4, 2, DARK); // a cap
  p.outline(BLACK);
  return p;
}

/** A soul, drawn up out of a body (8x10). */
export function soulWisp(): PC {
  const p = new PC(8, 12);
  p.ellipse(4, 4, 3, 3, WHITE);
  p.poly([[1, 5], [7, 5], [5, 11], [4, 8], [3, 11]], LIGHT);
  p.px(3, 3, BLACK);
  p.px(5, 3, BLACK);
  return p;
}

/** Food in the air: a drumstick, a pie, a blob of mash, a fish. */
export function foodFx(k: number): PC {
  const p = new PC(10, 10);
  if (k === 0) {
    p.ellipse(4, 4, 3, 3, MID);
    p.line(6, 6, 9, 9, WHITE);
    p.px(9, 8, WHITE);
  } else if (k === 1) {
    p.ellipse(5, 6, 4, 3, LIGHT);
    p.ellipse(5, 5, 3, 1, WHITE);
  } else if (k === 2) {
    p.ellipse(5, 5, 4, 3, WHITE);
    p.px(3, 3, LIGHT);
  } else {
    p.ellipse(4, 5, 3, 2, MID);
    p.poly([[7, 5], [9, 3], [9, 7]], MID);
    p.px(2, 4, BLACK);
  }
  p.outline(BLACK);
  return p;
}

/** The kitchen key, small and filthy. */
export function filthyKey(): PC {
  const p = new PC(12, 8);
  p.ring(3, 4, 2, 2, LIGHT);
  p.rect(5, 4, 6, 1, LIGHT);
  p.rect(9, 5, 1, 2, LIGHT);
  p.rect(7, 5, 1, 1, LIGHT);
  p.px(1, 6, MID);
  p.px(6, 2, MID);
  p.outline(BLACK);
  return p;
}

/** A label over the specimen cell. */
export function specimenSign(): PC {
  const p = new PC(30, 9);
  p.rect(0, 0, 30, 9, LIGHT);
  p.frame(0, 0, 30, 9, BLACK);
  for (let i = 0; i < 7; i++) p.rect(3 + i * 3.6, 3, 2, 3, BLACK);
  return p;
}
