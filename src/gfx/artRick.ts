import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';

// Slick Rick, the motorcycle salesman, astride his chrome monster, and the
// wrecked grocery store he crashed into.

/**
 * Battle frames, 120x96, Rick faces left (toward your champion):
 * 0-1 idle (engine ticking over), 2 rev (front wheel up), 3 charge (low, lunging),
 * 4 hurt, 5-6 furious, 7 defeated (bike on its side, Rick sprawled).
 */
export function rickFrame(f: number): PC {
  const p = new PC(120, 96);
  if (f === 7) {
    // the bike on its side
    p.ellipse(60, 84, 44, 8, DARK);
    p.ring(28, 80, 12, 6, BLACK);
    p.ring(28, 80, 10, 5, MID);
    p.ring(92, 82, 12, 6, BLACK);
    p.ring(92, 82, 10, 5, MID);
    p.poly(
      [
        [36, 74],
        [84, 70],
        [88, 80],
        [40, 84],
      ],
      LIGHT
    );
    p.line(84, 70, 98, 60, WHITE);
    // Rick, flat on the floor, one shoe off
    p.rect(30, 88, 56, 6, DARK);
    p.ellipse(22, 90, 7, 5, LIGHT);
    p.ellipse(20, 86, 8, 3, BLACK); // the pompadour, deflated
    p.rect(14, 89, 6, 2, BLACK); // shades knocked askew
    p.rect(86, 90, 10, 4, BLACK);
    for (let i = 0; i < 3; i++) p.circle(70 + i * 9, 62 - i * 6, 2 + i, LIGHT); // smoke
    p.outline(BLACK);
    return p;
  }
  const rev = f === 2;
  const charge = f === 3;
  const hurt = f === 4;
  const mad = f === 5 || f === 6;
  const bob = f === 1 || f === 6 ? 1 : 0;
  const tilt = rev ? -10 : charge ? 4 : 0; // front wheel lift
  const ox = (hurt ? 6 : 0) + (charge ? -8 : 0);
  const fx = 28 + ox; // front wheel x
  const rx = 92 + ox; // rear wheel x
  const fy = 78 + tilt;
  const ry = 78;
  const wheel = (x: number, y: number) => {
    p.circle(x, y, 14, BLACK);
    p.ring(x, y, 13, 13, DARK);
    p.ring(x, y, 9, 9, MID);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) p.line(x, y, x + Math.cos(a + f) * 8, y + Math.sin(a + f) * 8, LIGHT);
    p.circle(x, y, 2, WHITE);
  };
  wheel(rx, ry);
  wheel(fx, fy);
  // chrome forks, raked out like a chopper
  p.thick(fx, fy, fx + 20, fy - 40 - tilt, LIGHT, 3);
  p.line(fx + 2, fy, fx + 22, fy - 40 - tilt, WHITE);
  // frame + tank + engine
  p.poly(
    [
      [fx + 18, 44 + bob + tilt / 2],
      [rx - 20, 50 + bob],
      [rx - 6, 66 + bob],
      [fx + 24, 70 + bob],
    ],
    MID
  );
  p.ellipse(fx + 32, 50 + bob + tilt / 2, 14, 7, LIGHT); // tank
  p.px(fx + 26, 47 + bob, WHITE);
  p.px(fx + 27, 47 + bob, WHITE);
  drawText(p, fx + 24, 48 + bob + tilt / 2, 'RR', DARK, 0);
  p.rect(fx + 30, 60 + bob, 22, 14, DARK); // engine block
  for (let x = fx + 32; x < fx + 52; x += 4) p.rect(x, 61 + bob, 2, 12, MID);
  // exhaust pipes, flames on a rev
  p.thick(fx + 40, 72 + bob, rx + 14, 70, LIGHT, 3);
  p.thick(fx + 44, 76 + bob, rx + 16, 76, MID, 3);
  if (rev || mad) {
    p.ellipse(rx + 22, 72, 6, 3, WHITE);
    p.ellipse(rx + 28, 70, 4, 2, LIGHT);
  }
  // seat + sissy bar
  p.rect(rx - 30, 46 + bob, 22, 5, BLACK);
  p.thick(rx - 6, 48 + bob, rx - 2, 24 + bob, LIGHT, 2);
  // handlebars (ape-hangers)
  const hx = fx + 20;
  const hy = fy - 40 - tilt;
  p.thick(hx, hy, hx + 2, hy - 14, LIGHT, 2);
  p.line(hx - 4, hy - 14, hx + 8, hy - 14, WHITE);
  // ---- Rick
  const sx = rx - 22 + (charge ? -10 : 0) + (hurt ? 4 : 0);
  const sy = 44 + bob + (charge ? 4 : 0);
  // legs to the pegs
  p.thick(sx, sy, fx + 34, 70 + bob, DARK, 6);
  p.rect(fx + 30, 68 + bob, 8, 4, BLACK);
  // suit torso, leaning toward the bars
  const lean = charge ? -14 : rev ? 6 : -4;
  p.poly(
    [
      [sx - 8, sy],
      [sx + 8, sy],
      [sx + 6 + lean, sy - 28],
      [sx - 10 + lean, sy - 28],
    ],
    DARK
  );
  // lapels, shirt and a fat tie
  p.poly(
    [
      [sx - 4 + lean, sy - 28],
      [sx + 2 + lean, sy - 28],
      [sx, sy - 12],
    ],
    WHITE
  );
  p.rect(sx - 1 + lean * 0.7, sy - 26, 3, 16, LIGHT);
  // arm to the handlebars, gold watch glinting
  p.thick(sx - 4 + lean, sy - 24, hx + 2, hy - 12, DARK, 5);
  p.px(hx + 4, hy - 13, WHITE);
  if (mad) {
    // the other arm shakes a fist
    p.thick(sx + 4 + lean, sy - 24, sx + 18 + lean, sy - 40, DARK, 5);
    p.circle(sx + 19 + lean, sy - 42, 4, LIGHT);
  }
  // head: pompadour, shades, an enormous grin
  const hdx = sx - 2 + lean;
  const hdy = sy - 38;
  p.ellipse(hdx, hdy, 9, 9, LIGHT);
  p.ellipse(hdx - 2, hdy - 9, 11, 5, BLACK); // pompadour
  p.ellipse(hdx - 8, hdy - 11, 5, 3, BLACK);
  p.px(hdx - 4, hdy - 12, WHITE);
  p.rect(hdx - 9, hdy - 2, 14, 4, BLACK); // shades
  p.px(hdx - 7, hdy - 1, WHITE);
  if (hurt) {
    p.rect(hdx - 6, hdy + 4, 6, 2, BLACK);
    p.px(hdx + 6, hdy - 6, WHITE); // sweat
  } else if (mad) {
    p.rect(hdx - 7, hdy + 4, 10, 3, BLACK);
    for (let x = hdx - 6; x < hdx + 3; x += 2) p.px(x, hdy + 4, WHITE);
    // veins + steam
    p.line(hdx + 4, hdy - 6, hdx + 7, hdy - 3, DARK);
    p.ellipse(hdx + 12, hdy - 14, 4, 3, WHITE);
  } else {
    // the salesman's smile: every tooth on display
    p.rect(hdx - 7, hdy + 4, 11, 3, WHITE);
    p.line(hdx - 7, hdy + 5, hdx + 3, hdy + 5, MID);
    p.px(hdx - 1, hdy + 4, LIGHT); // a gold tooth
  }
  if (charge) for (let i = 0; i < 4; i++) p.line(rx + 10, 40 + i * 10, rx + 26, 40 + i * 10, LIGHT); // speed lines
  p.outline(BLACK);
  return p;
}

/**
 * Overworld: Rick on his bike, side view, facing left. Two frames (wheels spinning).
 * 48x44, with headroom so the whole pompadour fits on the canvas.
 */
export function rickBike(f: number): PC {
  const p = new PC(48, 44);
  const by = 36; // wheel centres
  for (const x of [9, 38]) {
    p.circle(x, by, 7, BLACK);
    p.ring(x, by, 6, 6, DARK);
    p.ring(x, by, 4, 4, MID);
    const a = f * 0.8;
    p.line(x - Math.cos(a) * 4, by - Math.sin(a) * 4, x + Math.cos(a) * 4, by + Math.sin(a) * 4, LIGHT);
    p.line(x - Math.sin(a) * 4, by + Math.cos(a) * 4, x + Math.sin(a) * 4, by - Math.cos(a) * 4, MID);
    p.circle(x, by, 1, WHITE);
  }
  // chrome forks, raked out like a chopper, and ape-hanger bars
  p.thick(9, by, 15, 20, LIGHT, 2);
  p.line(10, by, 16, 20, WHITE);
  p.thick(15, 20, 14, 14, LIGHT, 1);
  p.line(11, 14, 17, 14, WHITE);
  // frame, chrome tank with his initials, engine block
  p.poly(
    [
      [15, 23],
      [34, 25],
      [37, 32],
      [17, 31],
    ],
    MID
  );
  p.ellipse(20, 23, 6, 3, LIGHT);
  p.px(17, 22, WHITE);
  p.px(18, 22, WHITE);
  p.rect(20, 28, 10, 6, DARK);
  for (let x = 21; x < 30; x += 2) p.rect(x, 29, 1, 4, MID);
  // twin exhausts, a puff on alternate frames
  p.thick(24, 34, 46, 33, LIGHT, 2);
  p.px(45, 32, WHITE);
  if (f) {
    p.circle(46, 30, 1, LIGHT);
    p.circle(44, 28, 1, MID);
  }
  // seat and sissy bar
  p.rect(26, 22, 10, 3, BLACK);
  p.thick(37, 24, 39, 14, LIGHT, 1);
  // ---- Rick: leg down to the peg
  p.thick(29, 24, 22, 32, BLACK, 3);
  p.rect(19, 31, 5, 2, BLACK);
  // dark suit, leaning toward the bars
  p.poly(
    [
      [25, 24],
      [33, 24],
      [31, 12],
      [23, 12],
    ],
    DARK
  );
  p.line(31, 13, 32, 23, MID); // a sheen down his back
  // white shirt and a fat black tie: the brightest thing on him
  p.poly(
    [
      [24, 12],
      [29, 12],
      [26, 18],
    ],
    WHITE
  );
  p.rect(25, 13, 2, 6, BLACK);
  // arm reaching for the bars, gold watch glinting
  p.thick(24, 14, 15, 14, DARK, 2);
  p.px(18, 13, WHITE);
  // head
  p.circle(26, 8, 4, LIGHT);
  p.px(29, 8, MID); // ear
  p.rect(28, 9, 1, 2, BLACK); // sideburn
  // the pompadour: a tall black wave combed up and forward, with one bright shine
  p.ellipse(27, 4, 5, 3, BLACK);
  p.ellipse(22, 3, 4, 2, BLACK);
  p.ellipse(19, 4, 2, 2, BLACK);
  p.px(23, 2, WHITE);
  p.px(24, 2, LIGHT);
  p.px(26, 2, MID);
  // shades and the salesman's grin
  p.rect(21, 7, 6, 2, BLACK);
  p.px(22, 7, WHITE);
  p.rect(22, 11, 4, 1, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the wrecked store arena

/** Back wall of shelves, half-emptied, with the hole Rick drove through. */
export function storeWall(): PC {
  const W = 640;
  const H = 180;
  const p = new PC(W, H);
  const r = artRng(55);
  p.rect(0, 0, W, H, DARK);
  p.dither(0, 0, W, H, BLACK, 0.3);
  // tall shelving units
  for (let x = 0; x < W; x += 60) {
    p.rect(x + 4, 30, 52, 150, BLACK);
    for (let y = 36; y < 178; y += 24) {
      p.rect(x + 6, y + 18, 48, 2, MID);
      for (let k = x + 8; k < x + 54; k += 5) if (r() < 0.6) p.rect(k, y + 18 - (4 + Math.floor(r() * 9)), 4, 4 + Math.floor(r() * 9), r() < 0.5 ? MID : LIGHT);
    }
  }
  // aisle signs
  for (let i = 0; i < 5; i++) {
    const x = 40 + i * 130;
    p.rect(x, 6, 70, 14, LIGHT);
    drawText(p, x + 4, 9, ['CEREAL', 'SPREADS', 'SOUP', 'SNACKS', 'PETS'][i], BLACK, 0);
    p.line(x + 10, 0, x + 10, 6, MID);
    p.line(x + 60, 0, x + 60, 6, MID);
  }
  // the hole in the wall, with daylight and rubble
  p.ellipse(500, 110, 50, 56, LIGHT);
  p.ellipse(500, 112, 44, 50, WHITE);
  p.dither(456, 60, 88, 104, LIGHT, 0.3, true);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = 46 + r() * 16;
    p.rect(500 + Math.cos(a) * d, 110 + Math.sin(a) * d * 1.1, 4, 3, r() < 0.5 ? MID : BLACK);
  }
  // tyre marks running out of it
  p.line(470, 170, 380, 180, BLACK);
  p.line(476, 174, 390, 180, BLACK);
  return p;
}

/** Checkerboard floor, scuffed, with spilled cans. */
export function storeFloor(): PC {
  const W = 720;
  const H = 140;
  const p = new PC(W, H);
  for (let y = 0; y < H; y++) {
    const s = 6 + y * 0.18;
    for (let x = 0; x < W; x++) {
      const cx = Math.floor((x - W / 2) / s / (1 + y * 0.02));
      const cy = Math.floor(y / (4 + y * 0.12));
      p.px(x, y, (cx + cy) % 2 === 0 ? MID : DARK);
    }
  }
  p.dither(0, 0, W, 20, BLACK, 0.4);
  const r = artRng(88);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = 20 + Math.floor(r() * (H - 30));
    p.rect(x, y, 4, 5, r() < 0.5 ? LIGHT : WHITE);
    p.rect(x, y, 4, 1, MID);
  }
  return p;
}

/** A fluorescent tube hanging from chains. */
export function tube(): PC {
  const p = new PC(64, 40);
  p.line(10, 0, 10, 30, MID);
  p.line(54, 0, 54, 30, MID);
  p.rect(4, 30, 56, 6, DARK);
  p.rect(6, 32, 52, 3, WHITE);
  p.outline(BLACK);
  return p;
}

export function oilBlob(): PC {
  const p = new PC(20, 12);
  p.ellipse(10, 6, 9, 5, BLACK);
  p.ellipse(8, 5, 3, 1, MID);
  p.px(13, 7, DARK);
  return p;
}

export function businessCard(): PC {
  const p = new PC(14, 9);
  p.rect(0, 0, 14, 9, WHITE);
  p.rect(1, 2, 7, 1, BLACK);
  p.rect(1, 5, 11, 1, MID);
  p.rect(10, 1, 3, 3, DARK);
  p.outline(BLACK);
  return p;
}

/** Big speech burst for the sales pitch. */
export function pitchBubble(word: string): PC {
  const p = new PC(word.length * 6 + 16, 20);
  p.ellipse(p.w / 2, 9, p.w / 2 - 1, 8, WHITE);
  p.poly([[p.w / 2 + 4, 15], [p.w / 2 + 12, 19], [p.w / 2 + 10, 13]], WHITE);
  drawText(p, 8, 6, word, BLACK, 1);
  p.outline(BLACK);
  return p;
}
