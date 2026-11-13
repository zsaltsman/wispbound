import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, rampPick } from './pixel';

// Battle art for the grocery store cellar and its angry resident.

export function cellarWall(): PC {
  const W = 640;
  const H = 180;
  const p = new PC(W, H);
  const r = artRng(31);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const row = Math.floor(y / 8);
      const off = row % 2 ? 8 : 0;
      const mortar = y % 8 === 0 || (x + off) % 16 === 0;
      let v = mortar ? 0.05 : 0.16 + ((x * 7 + row * 13) % 5) * 0.015;
      v *= 0.65 + 0.35 * (y / H);
      p.px(x, y, rampPick([BLACK, DARK, MID], v, x, y));
    }
  // rusty shelving units against the wall, stacked with old stock
  for (let x0 = 10; x0 < W; x0 += 120) {
    p.rect(x0, 40, 3, 140, MID);
    p.rect(x0 + 90, 40, 3, 140, MID);
    for (const y of [60, 100, 140]) {
      p.rect(x0, y, 93, 3, MID);
      p.rect(x0, y + 3, 93, 1, BLACK);
      let x = x0 + 5;
      while (x < x0 + 86) {
        const w = 6 + Math.floor(r() * 10);
        const h = 8 + Math.floor(r() * 14);
        const kind = r();
        if (kind < 0.4) {
          // jars
          p.rect(x, y - h, w, h, DARK);
          p.rect(x + 1, y - h + 2, w - 2, h - 3, MID);
          p.rect(x, y - h, w, 2, LIGHT);
        } else if (kind < 0.75) {
          // cans
          p.rect(x, y - h, w, h, MID);
          p.rect(x, y - h, w, 1, LIGHT);
          p.rect(x, y - Math.floor(h / 2), w, 2, DARK);
        } else {
          // a sagging box
          p.poly(
            [
              [x, y],
              [x + w, y],
              [x + w + 2, y - h],
              [x - 1, y - h + 3],
            ],
            DARK
          );
          p.line(x, y - h + 3, x + w + 2, y - h, MID);
        }
        x += w + 2 + Math.floor(r() * 3);
      }
    }
  }
  // pipes and cobwebs
  p.rect(0, 18, W, 4, DARK);
  p.rect(0, 18, W, 1, MID);
  for (let x = 40; x < W; x += 150) {
    p.rect(x, 22, 4, 18, DARK);
    p.px(x + 1, 30, LIGHT);
  }
  for (const x0 of [0, 230, 470]) {
    for (let k = 0; k < 6; k++) p.line(x0, 22, x0 + 6 + k * 6, 22 + 30 - k * 4, MID);
    for (let k = 1; k < 4; k++) p.ring(x0, 22, k * 9, k * 9, DARK);
  }
  return p;
}

export function cellarFloor(): PC {
  const W = 720;
  const H = 150;
  const p = new PC(W, H);
  const r = artRng(77);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = y / H;
      let v = 0.22 + t * 0.1;
      // perspective seams
      const sx = ((x - W / 2) / (0.4 + t * 0.8)) % 60;
      if (Math.abs(sx) < 0.8 || y % Math.max(6, Math.round(6 + t * 20)) === 0) v -= 0.12;
      p.px(x, y, rampPick([BLACK, DARK, MID, LIGHT], v, x, y));
    }
  for (let i = 0; i < 14; i++) p.ellipse(Math.floor(r() * W), 20 + Math.floor(r() * (H - 30)), 10 + Math.floor(r() * 22), 3 + Math.floor(r() * 6), DARK);
  for (let i = 0; i < 40; i++) p.px(Math.floor(r() * W), Math.floor(r() * H), LIGHT);
  p.rect(0, 0, W, 2, BLACK);
  return p;
}

export function crates(): PC {
  const p = new PC(70, 80);
  const box = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, h, MID);
    p.frame(x, y, w, h, DARK);
    p.line(x + 1, y + 1, x + w - 2, y + h - 2, DARK);
    p.rect(x, y, w, 2, LIGHT);
  };
  box(2, 44, 32, 34);
  box(36, 50, 30, 28);
  box(14, 12, 30, 32);
  p.rect(48, 30, 12, 20, DARK); // a mop leaning
  p.line(54, 0, 54, 30, MID);
  p.outline(BLACK);
  return p;
}

export function bulb(): PC {
  const p = new PC(12, 60);
  p.rect(5, 0, 2, 46, DARK);
  p.rect(3, 46, 6, 4, MID);
  p.ellipse(6, 54, 4, 5, WHITE);
  p.px(4, 52, LIGHT);
  p.outline(BLACK);
  return p;
}

export function bigBucket(): PC {
  const p = new PC(30, 26);
  p.poly(
    [
      [3, 8],
      [27, 8],
      [24, 25],
      [6, 25],
    ],
    MID
  );
  p.shade((x) => (x < 12 ? 0.8 : 0.35), [DARK, MID, LIGHT]);
  p.ellipse(15, 8, 12, 3, BLACK);
  for (const [x, y] of [
    [9, 7],
    [14, 5],
    [19, 7],
    [23, 6],
  ])
    p.line(x, y, x + (x % 2 ? 1 : -1), y - 4, LIGHT);
  p.ring(15, 6, 12, 6, LIGHT);
  p.rect(9, 14, 12, 5, LIGHT);
  p.line(10, 16, 19, 16, DARK);
  p.outline(BLACK);
  return p;
}

export function hook(): PC {
  const p = new PC(12, 14);
  p.rect(6, 0, 1, 8, LIGHT);
  for (let a = 0; a < Math.PI * 1.2; a += 0.1) p.px(Math.round(6 - Math.sin(a) * 4), Math.round(8 + (1 - Math.cos(a)) * 2.5), WHITE);
  p.px(1, 7, WHITE);
  p.outline(BLACK);
  return p;
}

/**
 * Old Grundy, the angry fisherman. 72x96 frames:
 * 0-1 idle, 2 wind-up (rod raised), 3 strike, 4 hurt, 5-6 furious, 7 defeated (slumped).
 */
export function fisherman(f: number): PC {
  const p = new PC(72, 96);
  const furious = f === 5 || f === 6;
  const bob = f === 1 || f === 6 ? 1 : 0;
  const slump = f === 7;
  const hurt = f === 4;
  const cx = 34 + (hurt ? 3 : 0);
  const top = 10 + bob + (slump ? 22 : 0);
  // boots + legs
  if (!slump) {
    p.rect(cx - 12, 72, 9, 20, DARK);
    p.rect(cx + 3, 72, 9, 20, DARK);
    p.rect(cx - 14, 88, 12, 6, BLACK);
    p.rect(cx + 2, 88, 13, 6, BLACK);
    p.rect(cx - 12, 72, 2, 16, MID);
  } else {
    p.rect(cx - 18, 84, 36, 8, DARK);
    p.rect(cx - 22, 88, 12, 6, BLACK);
    p.rect(cx + 12, 88, 12, 6, BLACK);
  }
  // raincoat
  p.poly(
    [
      [cx - 16, top + 30],
      [cx + 16, top + 30],
      [cx + 20, top + 66],
      [cx - 20, top + 66],
    ],
    LIGHT
  );
  p.shade((x, y) => (y > top + 28 && y < top + 68 ? 0.95 - (x - cx + 20) / 60 : null), [MID, LIGHT, WHITE]);
  p.line(cx, top + 32, cx, top + 64, MID);
  for (let y = top + 38; y < top + 64; y += 8) p.rect(cx - 3, y, 2, 2, DARK);
  p.rect(cx - 20, top + 64, 40, 3, MID);
  // arms and the rod
  const rodC = DARK;
  if (f === 2) {
    // wound up, rod over his head
    p.thick(cx + 14, top + 34, cx + 22, top + 12, LIGHT, 4);
    p.thick(cx + 22, top + 12, cx - 10, top - 8, rodC, 2);
    p.line(cx - 10, top - 8, cx - 28, top - 4, MID);
    p.circle(cx + 20, top + 16, 3, MID); // reel
  } else if (f === 3) {
    // strike: rod thrust forward at you
    p.thick(cx - 14, top + 36, cx - 26, top + 38, LIGHT, 4);
    p.thick(cx - 26, top + 38, cx - 70, top + 26, rodC, 2);
    p.circle(cx - 24, top + 40, 3, MID);
  } else if (slump) {
    p.thick(cx - 16, top + 40, cx - 26, top + 60, LIGHT, 4);
    p.line(cx - 26, top + 60, cx + 30, top + 66, rodC);
  } else {
    p.thick(cx - 14, top + 34, cx - 22, top + 52, LIGHT, 4);
    p.thick(cx - 22, top + 52, cx - 30, top - 6, rodC, 2);
    p.line(cx - 30, top - 6, cx - 34, top + 30, MID); // line hanging
    p.circle(cx - 24, top + 48, 3, MID);
    p.thick(cx + 14, top + 34, cx + 18, top + 56, LIGHT, 4);
  }
  // head: weathered face, huge white beard
  const hy = top + 22;
  p.ellipse(cx, hy, 9, 9, LIGHT);
  p.ellipse(cx, hy + 8, 11, 9, WHITE);
  p.dither(cx - 11, hy + 2, 22, 16, LIGHT, 0.3);
  p.rect(cx - 6, hy + 4, 12, 2, MID); // moustache
  // eyes + eyebrows
  if (slump) {
    p.line(cx - 6, hy - 1, cx - 2, hy - 1, BLACK);
    p.line(cx + 2, hy - 1, cx + 6, hy - 1, BLACK);
  } else {
    p.rect(cx - 6, hy - 2, 3, 2, BLACK);
    p.rect(cx + 3, hy - 2, 3, 2, BLACK);
    p.px(cx - 5, hy - 2, furious ? WHITE : MID);
    p.px(cx + 4, hy - 2, furious ? WHITE : MID);
    p.thick(cx - 8, hy - 7 + (hurt ? 2 : 0), cx - 2, hy - 4, DARK, 2);
    p.thick(cx + 8, hy - 7 + (hurt ? 2 : 0), cx + 2, hy - 4, DARK, 2);
  }
  p.px(cx - 1, hy + 1, MID);
  p.px(cx + 1, hy + 1, MID);
  if (f === 3 || furious) p.rect(cx - 3, hy + 8, 6, 3, BLACK); // yelling
  // sou'wester hat
  p.ellipse(cx, hy - 9, 10, 5, LIGHT);
  p.poly(
    [
      [cx - 15, hy - 6],
      [cx + 16, hy - 6],
      [cx + 20, hy - 2],
      [cx - 17, hy - 3],
    ],
    LIGHT
  );
  p.rect(cx - 10, hy - 9, 20, 1, MID);
  p.px(cx - 6, hy - 12, WHITE);
  if (furious) {
    // steam
    for (const [x, y] of [
      [cx - 14, hy - 20],
      [cx + 12, hy - 22],
    ]) {
      p.circle(x, y, 3, LIGHT);
      p.circle(x + 2, y - 4, 2, MID);
    }
  }
  p.outline(BLACK);
  return p;
}
