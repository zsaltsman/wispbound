import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { drawText } from './fontData';
import { building } from './artProps';
import { floodDamage } from './artIsland';
import { CW, CH, type Facing } from './artPeople';

// Two small businesses: MAD PIES in Hollowhaven (pies with furious little
// faces), and LUKE & GRACE'S THRIFT on Saltwash (merchandise of no value).

// ------------------------------------------------------------------ the pies

/** One pie, seen from the side and slightly above, with an angry face piped on top. */
export function pie(face: number, big = false): PC {
  const s = big ? 2 : 1;
  const p = new PC(14 * s, 10 * s);
  const R = (x: number, y: number, w: number, h: number, c: number) => p.rect(x * s, y * s, w * s, h * s, c);
  // tin + crust
  p.ellipse(7 * s, 6 * s, 6 * s, 3 * s, MID);
  R(1, 6, 12, 3, DARK);
  R(2, 9, 10, 1, BLACK);
  p.ellipse(7 * s, 5 * s, 6 * s, 3 * s, LIGHT);
  for (let x = 1; x < 13; x += 2) p.px(x * s, 5 * s + (x % 4 ? 1 : 0), WHITE); // crimped edge
  // the face: two slanted brows, two dots, a scowl
  const ex = [5, 9];
  const brow = [
    [1, -1],
    [1, 0],
    [-1, -1],
    [1, 1],
  ][face % 4];
  ex.forEach((x, i) => {
    const sl = i === 0 ? brow[0] : -brow[0];
    p.line(x * s - s, (3 + (sl > 0 ? 0 : 1)) * s, x * s + s, (3 + (sl > 0 ? 1 : 0)) * s, BLACK);
    p.px(x * s, 5 * s, BLACK);
  });
  if (face % 3 === 0) p.line(5 * s, 7 * s, 9 * s, 7 * s, BLACK); // flat grumble
  else if (face % 3 === 1) {
    p.line(5 * s, 7 * s, 7 * s, 6 * s, BLACK); // a pout
    p.line(7 * s, 6 * s, 9 * s, 7 * s, BLACK);
  } else p.rect(6 * s, 6 * s, 3 * s, 2 * s, BLACK); // a tiny shout
  p.outline(BLACK);
  return p;
}

/** The glass pie case on the counter (3 tiles wide). */
export function pieCase(): PC {
  const p = new PC(48, 32);
  p.rect(0, 14, 48, 18, DARK);
  p.rect(0, 14, 48, 2, MID);
  p.rect(2, 2, 44, 14, LIGHT);
  p.dither(2, 2, 44, 14, WHITE, 0.25);
  p.rect(2, 9, 44, 1, MID); // shelf
  for (let i = 0; i < 3; i++) p.blit(pie(i), 3 + i * 14, -1);
  for (let i = 0; i < 3; i++) p.blit(pie(i + 3), 3 + i * 14, 7);
  p.frame(1, 1, 46, 16, WHITE);
  drawText(p, 4, 21, 'FRESH', LIGHT, 0);
  p.outline(BLACK);
  return p;
}


// ------------------------------------------------------------------ the buildings

/** MAD PIES: a little bakery with a striped awning and a giant angry pie for a sign (7x5). */
export function madPiesShop(): PC {
  const p = building({ w: 7, h: 5, roofRows: 2, roof: 'gable', siding: 'plaster', doors: [3], windows: [], crooked: 2, seed: 910, chimney: 5 });
  const W = 112;
  // striped awning across the front
  for (let x = 2; x < W - 2; x++) {
    const stripe = Math.floor(x / 7) % 2 === 0;
    for (let y = 30; y < 37; y++) p.px(x, y, stripe ? WHITE : DARK);
    if (x % 7 === 3) p.px(x, 37, stripe ? LIGHT : DARK);
  }
  // display windows full of scowling pies
  for (const x0 of [4, 70]) {
    p.rect(x0, 42, 36, 24, BLACK);
    p.rect(x0 + 2, 44, 32, 20, LIGHT);
    p.dither(x0 + 2, 44, 32, 20, WHITE, 0.3);
    p.blit(pie(x0 % 3), x0 + 4, 50);
    p.blit(pie((x0 + 1) % 3 + 1), x0 + 18, 50);
  }
  // the sign: a big angry pie on a bracket
  p.rect(36, 2, 40, 22, BLACK);
  p.rect(38, 4, 36, 18, WHITE);
  drawText(p, 41, 6, 'MAD', BLACK, 1);
  drawText(p, 41, 14, 'PIES', BLACK, 1);
  p.blit(pie(2), 60, 8);
  // a chalkboard by the door
  p.rect(64, 66, 8, 12, DARK);
  p.rect(65, 67, 6, 6, BLACK);
  p.px(67, 69, WHITE);
  p.px(68, 70, WHITE);
  p.outline(BLACK);
  return p;
}

/** LUKE & GRACE'S THRIFT: a flood-stained shopfront with junk piled outside (7x5). */
export function thriftShop(): PC {
  const p = building({ w: 7, h: 5, roofRows: 2, roof: 'flat', siding: 'brick', doors: [3], windows: [], seed: 977 });
  p.rect(4, 4, 104, 22, BLACK);
  p.rect(6, 6, 100, 18, LIGHT);
  drawText(p, 10, 8, 'LUKE & GRACE', BLACK, 1);
  drawText(p, 24, 16, 'THRIFT', DARK, 1);
  // a sign leaning in the window
  p.rect(6, 40, 34, 26, BLACK);
  p.rect(8, 42, 30, 22, MID);
  drawText(p, 10, 46, 'ALL', WHITE, 0);
  drawText(p, 10, 54, 'MINT', WHITE, 0);
  // junk on the pavement: a three-legged chair and a lampshade
  p.rect(76, 58, 12, 3, MID);
  p.rect(76, 61, 2, 10, DARK);
  p.rect(86, 61, 2, 6, DARK); // short leg
  p.rect(76, 48, 2, 10, DARK);
  p.poly(
    [
      [92, 58],
      [104, 58],
      [101, 50],
      [95, 50],
    ],
    LIGHT
  );
  floodDamage(p, 26, 62, 44);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the merchandise (thrift props)

export function junk(kind: string): PC {
  const p = new PC(16, 24);
  switch (kind) {
    case 'chair': // three legs
      p.rect(3, 4, 2, 8, MID);
      p.rect(3, 11, 10, 3, LIGHT);
      p.rect(3, 14, 2, 8, DARK);
      p.rect(11, 14, 2, 8, DARK);
      p.rect(7, 14, 2, 3, DARK); // the stump
      break;
    case 'clock':
      p.rect(4, 2, 8, 20, DARK);
      p.circle(8, 7, 3, WHITE);
      p.line(8, 7, 8, 5, BLACK);
      p.line(8, 7, 6, 9, BLACK);
      p.line(5, 4, 11, 10, MID); // cracked
      p.rect(7, 12, 2, 8, MID);
      break;
    case 'lamp': // no shade
      p.rect(7, 4, 2, 16, MID);
      p.circle(8, 4, 2, WHITE);
      p.rect(4, 20, 8, 3, DARK);
      break;
    case 'tv': // a hole where the screen should be
      p.rect(1, 6, 14, 12, MID);
      p.rect(3, 8, 10, 8, BLACK);
      p.line(3, 8, 12, 15, DARK);
      p.line(5, 6, 3, 1, LIGHT);
      p.line(11, 6, 13, 1, LIGHT);
      p.rect(3, 18, 2, 3, DARK);
      p.rect(11, 18, 2, 3, DARK);
      break;
    case 'jacket': // with an enormous hole
      p.rect(7, 2, 2, 3, LIGHT); // hanger
      p.poly(
        [
          [2, 5],
          [14, 5],
          [15, 21],
          [1, 21],
        ],
        DARK
      );
      p.ellipse(8, 13, 4, 5, -1 as any);
      p.line(8, 5, 8, 8, MID);
      break;
    case 'box': // random objects
      p.rect(1, 12, 14, 10, MID);
      p.rect(1, 12, 14, 2, LIGHT);
      p.line(3, 12, 1, 6, LIGHT); // a fork
      p.circle(9, 10, 2, WHITE); // a doll head
      p.rect(12, 7, 2, 6, DARK); // a single chopstick
      drawText(p, 3, 15, '?', BLACK, 0);
      break;
    case 'toaster': // survived a war
      p.rect(2, 10, 12, 10, LIGHT);
      p.rect(4, 9, 3, 2, BLACK);
      p.rect(9, 9, 3, 2, BLACK);
      p.line(2, 14, 7, 16, DARK);
      p.circle(11, 15, 1, BLACK);
      p.line(5, 9, 3, 3, MID); // smoke
      p.line(10, 9, 12, 4, MID);
      break;
    case 'rack': // clothes on a rail
      p.rect(1, 3, 14, 1, LIGHT);
      p.rect(1, 3, 1, 20, MID);
      p.rect(14, 3, 1, 20, MID);
      for (let x = 2; x < 14; x += 3) p.rect(x, 4, 3, 12 + (x % 2) * 3, x % 2 ? DARK : MID);
      break;
  }
  p.outline(BLACK);
  return p;
}

export const JUNK_KINDS = ['chair', 'clock', 'lamp', 'tv', 'jacket', 'box', 'toaster', 'rack'];

// ------------------------------------------------------------------ Roxie

/** Roxie: a scruffy little white terrier, pointy ears, a dark collar with a tag. */
function roxie(dir: Facing, f: number, mode: 'walk' | 'bark' | 'sit' | 'pie' = 'walk'): PC {
  const p = new PC(CW, CH);
  const bob = f === 1 ? -1 : 0;
  const side = dir === 'left';
  const sit = mode === 'sit';
  // body + legs
  if (sit) {
    p.ellipse(8, 15, 3, 4, WHITE);
    p.rect(6, 18, 1, 2, LIGHT);
    p.rect(9, 18, 1, 2, LIGHT);
  } else {
    p.ellipse(8, 15 + bob, side ? 5 : 4, 3, WHITE);
    p.line(5, 17 + bob, 11, 17 + bob, LIGHT); // a soft belly shadow
    for (const x of side ? [4, 6, 10, 12] : [5, 10]) p.rect(x, 17, 1, 3 - (f === 1 && x % 4 === 0 ? 1 : 0), LIGHT);
  }
  // a scruffy wagging tail
  p.line(side ? 13 : 12, 14, side ? 15 : 14, 10 + (f === 1 ? -1 : 1), WHITE);
  // head with pointed ears
  const hx = side ? 4 : 8;
  const hy = (sit ? 9 : 10) + bob;
  p.ellipse(hx, hy, 3, 3, WHITE);
  p.dither(hx - 3, hy - 3, 7, 6, LIGHT, 0.2, true);
  p.poly(
    [
      [hx - 3, hy - 2],
      [hx - 2, hy - 6],
      [hx - 1, hy - 2],
    ],
    LIGHT
  );
  if (!side)
    p.poly(
      [
        [hx + 1, hy - 2],
        [hx + 2, hy - 6],
        [hx + 3, hy - 2],
      ],
      LIGHT
    );
  if (dir === 'down') {
    p.px(hx - 1, hy, BLACK);
    p.px(hx + 1, hy, BLACK);
    p.px(hx, hy + 2, BLACK);
    if (mode === 'bark') p.rect(hx - 1, hy + 3, 3, 1, BLACK);
    if (sit) p.px(hx, hy + 3, MID); // tongue out, all innocence
  } else if (side) {
    p.rect(hx - 4, hy + 1, 2, 2, WHITE);
    p.px(hx - 4, hy + 1, BLACK);
    p.px(hx - 1, hy - 1, BLACK);
    if (mode === 'bark') p.rect(hx - 4, hy + 3, 3, 1, BLACK);
    if (mode === 'pie') {
      // a stolen pie, clamped in her jaws
      p.ellipse(hx - 4, hy + 3, 3, 2, LIGHT);
      p.line(hx - 7, hy + 4, hx - 1, hy + 4, DARK);
      p.px(hx - 5, hy + 2, BLACK);
      p.px(hx - 3, hy + 2, BLACK);
    }
  }
  // collar and tag
  if (dir !== 'up') {
    p.line(hx - 2, hy + 3, hx + 2, hy + 3, DARK); // a dark collar on white fur
    p.px(hx, hy + 4, MID);
  }
  p.outline(BLACK);
  return p;
}

/** Sheet: 0-8 walk (down/up/left), 9 bark, 10 bark side, 11 sitting innocently, 12 carrying a pie. */
export function roxieSheet(): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(roxie(d, f === 2 ? 0 : f));
  out.push(roxie('down', 0, 'bark'));
  out.push(roxie('left', 0, 'bark'));
  out.push(roxie('down', 0, 'sit'));
  out.push(roxie('left', 1, 'pie'));
  return out;
}
