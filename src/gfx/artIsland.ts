import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';
import { building, window16, door16, type BuildingOpts } from './artProps';

// World 2: the flooded island of Saltwash. Buildings that have been hit by wave
// after wave, stranded boats and cars, sandbags, and the town's landmarks.

/** Water damage on a front wall: a tide line, stains below it, sand at the base. */
export function floodDamage(p: PC, top: number, lineY: number, seed: number) {
  const r = artRng(seed);
  const W = p.w;
  for (let x = 0; x < W; x++) {
    const y = lineY + Math.round(Math.sin(x * 0.3 + seed) * 1.2);
    if (p.get(x, y) < 0) continue;
    p.px(x, y, BLACK);
    p.px(x, y + 1, DARK);
    // grime below the line
    for (let yy = y + 2; yy < p.h - 3; yy++) {
      const c = p.get(x, yy);
      if (c < 0 || c === BLACK) continue;
      if ((x * 7 + yy * 3) % 5 === 0) p.px(x, yy, Math.max(BLACK, c - 1));
    }
  }
  // drips and streaks
  for (let i = 0; i < W / 10; i++) {
    const x = Math.floor(r() * W);
    const len = 3 + Math.floor(r() * 8);
    for (let k = 0; k < len; k++) if (p.get(x, lineY + 2 + k) > 0) p.px(x, lineY + 2 + k, DARK);
  }
  // sand heaped against the wall, seaweed caught on it
  for (let x = 0; x < W; x++) {
    const h = 2 + Math.round(Math.abs(Math.sin(x * 0.11 + seed)) * 3);
    for (let k = 0; k < h; k++) if (p.get(x, p.h - 1 - k) >= 0) p.px(x, p.h - 1 - k, k === h - 1 ? WHITE : LIGHT);
  }
  for (let i = 0; i < W / 24; i++) {
    const x = Math.floor(r() * (W - 6));
    p.line(x, p.h - 4, x + 5, p.h - 6, DARK);
  }
  void top;
}

/** A crack running up a wall. */
function crack(p: PC, x: number, y0: number, y1: number, seed: number) {
  const r = artRng(seed);
  let cx = x;
  for (let y = y1; y > y0; y--) {
    if (p.get(cx, y) > 0) p.px(cx, y, BLACK);
    if (r() < 0.35) cx += r() < 0.5 ? 1 : -1;
    if (r() < 0.06) p.line(cx, y, cx + (r() < 0.5 ? 4 : -4), y - 3, BLACK);
  }
}

/** Damaged houses (7x5 tiles). */
export function floodHouse(v: number): PC {
  const opts: Partial<BuildingOpts>[] = [
    { roof: 'gable', siding: 'wood', windows: [{ x: 1, boarded: true }, { x: 5 }], crooked: 4, chimney: 5 },
    { roof: 'gambrel', siding: 'plaster', windows: [{ x: 1, broken: true }, { x: 5, boarded: true }], crooked: -2 },
    { roof: 'gable', siding: 'brick', windows: [{ x: 1 }, { x: 5, broken: true }], crooked: 1, chimney: 1 },
    { roof: 'flat', siding: 'plaster', windows: [{ x: 1, boarded: true }, { x: 5, boarded: true }] },
    { roof: 'gable', siding: 'stone', windows: [{ x: 1, lit: true }, { x: 5 }], crooked: -5, dark: true },
    { roof: 'mansard', siding: 'wood', windows: [{ x: 1, broken: true }, { x: 5, lit: true }], chimney: 4 },
  ];
  const p = building({ w: 7, h: 5, roofRows: 3, doors: [3], seed: 200 + v, ...(opts[v % opts.length] as any) });
  floodDamage(p, 44, 58 + (v % 3) * 2, v * 3 + 1);
  crack(p, 20 + v * 9, 46, 76, v + 9);
  if (v % 2 === 0) {
    // a missing chunk of roof
    p.poly(
      [
        [70 + v, 6],
        [96, 14],
        [86, 30],
        [72, 22],
      ],
      BLACK
    );
    p.line(74, 14, 90, 22, MID);
  }
  if (v === 3) {
    // spray-painted plea on the wall
    drawText(p, 34, 48, 'SOS', WHITE);
  }
  return p;
}

/** A house half-collapsed by the last wave (7x5). */
export function ruinHouse(seed: number): PC {
  const p = new PC(112, 80);
  const r = artRng(seed);
  // standing remains of the side walls
  p.rect(0, 26, 20, 54, MID);
  p.rect(86, 34, 26, 46, MID);
  for (let y = 28; y < 80; y += 4) {
    p.rect(0, y, 20, 1, DARK);
    p.rect(86, y, 26, 1, DARK);
  }
  // a roof slab slid down at an angle
  p.poly(
    [
      [12, 30],
      [70, 12],
      [104, 44],
      [44, 64],
    ],
    DARK
  );
  for (let i = 0; i < 9; i++) p.line(14 + i * 7, 30 - i * 2, 46 + i * 7, 62 - i * 2, BLACK);
  // rubble heap
  for (let i = 0; i < 90; i++) {
    const x = 10 + Math.floor(r() * 92);
    const y = 56 + Math.floor(r() * 22);
    p.rect(x, y, 2 + Math.floor(r() * 4), 2 + Math.floor(r() * 3), r() < 0.5 ? MID : r() < 0.5 ? LIGHT : DARK);
  }
  // snapped beams
  p.thick(30, 74, 52, 40, LIGHT, 2);
  p.thick(70, 76, 82, 50, MID, 2);
  window16(p, 88, 44, { x: 0, broken: true });
  floodDamage(p, 26, 60, seed);
  p.outline(BLACK);
  return p;
}

/** The inventor's house: antennae, a radar dish, pipes, a garage that is far too big (9x6). */
export function inventorHouse(): PC {
  const p = building({ w: 9, h: 6, roofRows: 3, roof: 'gambrel', siding: 'wood', doors: [2], windows: [{ x: 4, lit: true }, { x: 7, lit: true }], crooked: 6, seed: 404 });
  const W = 144;
  // a radar dish on the roof
  p.ellipse(108, 12, 12, 7, LIGHT);
  p.ellipse(108, 12, 9, 5, MID);
  p.line(108, 12, 116, 2, WHITE);
  p.circle(116, 2, 1, WHITE);
  p.rect(106, 18, 4, 10, DARK);
  // antennae and a weather vane shaped like a fish
  p.line(30, 0, 30, 22, LIGHT);
  p.line(26, 4, 34, 4, LIGHT);
  p.line(27, 8, 33, 8, LIGHT);
  p.line(64, 2, 64, 16, MID);
  p.ellipse(64, 2, 4, 2, WHITE);
  // pipes snaking down the wall
  p.thick(136, 30, 136, 92, DARK, 3);
  p.thick(136, 60, 120, 60, DARK, 3);
  p.circle(136, 60, 3, MID);
  // a gear-shaped sign
  p.circle(84, 52, 8, LIGHT);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) p.rect(84 + Math.cos(a) * 9 - 1, 52 + Math.sin(a) * 9 - 1, 3, 3, LIGHT);
  p.circle(84, 52, 3, BLACK);
  // a hand-painted sign
  p.rect(4, 44, 22, 10, WHITE);
  drawText(p, 6, 46, 'KEEP', BLACK);
  p.rect(4, 56, 22, 10, WHITE);
  drawText(p, 7, 58, 'OUT', BLACK);
  // smoke puffing out of a pipe
  p.ellipse(136, 24, 4, 3, LIGHT);
  p.ellipse(140, 18, 3, 2, WHITE);
  floodDamage(p, 44, 70, 77);
  void W;
  p.outline(BLACK);
  return p;
}

/** City Hall: columns, a clock, the flag, re-election banners (16x9). */
export function cityHall(): PC {
  const p = building({ w: 16, h: 9, roofRows: 4, roof: 'dome', siding: 'stone', doors: [], windows: [{ x: 1 }, { x: 3, boarded: true }, { x: 12, broken: true }, { x: 14 }], seed: 501 });
  const W = 256;
  const H = 144;
  // a pediment and six columns
  p.poly(
    [
      [72, 70],
      [128, 46],
      [184, 70],
    ],
    LIGHT
  );
  p.poly(
    [
      [80, 68],
      [128, 50],
      [176, 68],
    ],
    MID
  );
  drawText(p, 104, 58, 'CITY HALL', BLACK);
  for (let i = 0; i < 6; i++) {
    const x = 78 + i * 20;
    p.rect(x, 70, 10, 58, LIGHT);
    p.rect(x, 70, 2, 58, WHITE);
    p.rect(x + 8, 70, 2, 58, MID);
    p.rect(x - 2, 68, 14, 3, WHITE);
    p.rect(x - 2, 126, 14, 3, MID);
  }
  // one column has cracked and been propped up with a plank
  crack(p, 124, 72, 124, 3);
  p.thick(116, 126, 132, 80, DARK, 2);
  // the doors in the shadow of the portico
  p.rect(110, 98, 36, 30, BLACK);
  door16(p, 110, 100, 28, 'wood');
  door16(p, 128, 100, 28, 'wood');
  // a clock in the drum of the dome
  p.circle(128, 28, 9, WHITE);
  p.circle(128, 28, 7, LIGHT);
  p.line(128, 28, 128, 22, BLACK);
  p.line(128, 28, 132, 30, BLACK);
  // the flag
  p.line(128, 0, 128, 12, LIGHT);
  p.rect(129, 0, 10, 6, WHITE);
  p.line(129, 3, 138, 3, MID);
  // re-election banners hanging between the columns, one torn
  for (const [x, torn] of [
    [20, false],
    [212, true],
  ] as const) {
    p.rect(x, 74, 26, 34, WHITE);
    p.rect(x + 2, 76, 22, 30, LIGHT);
    drawText(p, x + 4, 80, 'RE', BLACK);
    drawText(p, x + 4, 89, 'ELE', BLACK);
    drawText(p, x + 4, 98, 'CT', BLACK);
    if (torn)
      p.poly(
        [
          [x + 14, 96],
          [x + 26, 90],
          [x + 26, 108],
          [x + 18, 108],
        ],
        -1
      );
  }
  // steps
  for (let i = 0; i < 3; i++) p.rect(66 - i * 4, H - 12 + i * 4, 124 + i * 8, 4, i % 2 ? MID : LIGHT);
  floodDamage(p, 60, 112, 12);
  void W;
  p.outline(BLACK);
  return p;
}

/** The Bank of Saltwash (10x7). */
export function bank(): PC {
  const p = building({ w: 10, h: 7, roofRows: 3, roof: 'flat', siding: 'stone', doors: [], windows: [{ x: 1 }, { x: 8 }], seed: 610 });
  p.rect(20, 10, 120, 24, BLACK);
  p.rect(22, 12, 116, 20, LIGHT);
  drawText(p, 44, 16, 'BANK', BLACK, 3);
  for (const x of [34, 54, 98, 118]) {
    p.rect(x, 40, 8, 66, LIGHT);
    p.rect(x, 40, 2, 66, WHITE);
    p.rect(x - 2, 38, 12, 3, WHITE);
  }
  door16(p, 64, 84, 25, 'iron');
  door16(p, 80, 84, 25, 'iron');
  // a sandbag wall stacked against the front
  for (let x = 2; x < 158; x += 9) {
    p.ellipse(x + 4, 107, 4, 2, LIGHT);
    if (x < 50 || x > 110) p.ellipse(x + 8, 103, 4, 2, MID);
  }
  floodDamage(p, 40, 90, 21);
  p.outline(BLACK);
  return p;
}

/** The technician's shop: scrap, a satellite on a pole, a hand-written sign (8x6). */
export function techShop(): PC {
  const p = building({ w: 8, h: 6, roofRows: 2, roof: 'flat', siding: 'brick', doors: [4], windows: [{ x: 1, lit: true }], seed: 720 });
  p.rect(6, 4, 116, 20, BLACK);
  p.rect(8, 6, 112, 16, MID);
  drawText(p, 14, 11, 'TECH REPAIR', WHITE);
  // window crammed with machinery
  p.rect(18, 50, 10, 4, LIGHT);
  p.circle(24, 46, 3, WHITE);
  // a pile of scrap and a satellite dish outside
  p.ellipse(110, 84, 12, 6, DARK);
  p.rect(102, 76, 8, 6, MID);
  p.circle(116, 78, 4, LIGHT);
  p.ellipse(100, 36, 10, 6, LIGHT);
  p.ellipse(100, 36, 7, 4, MID);
  p.rect(98, 40, 3, 12, DARK);
  // open sign
  p.rect(88, 46, 16, 9, BLACK);
  drawText(p, 89, 47, 'OPEN', WHITE, 0);
  floodDamage(p, 30, 78, 31);
  p.outline(BLACK);
  return p;
}

/** Rick's Rides: a glass showroom with bikes behind the windows and pennants (14x7). */
export function dealership(): PC {
  const W = 224;
  const H = 112;
  const p = building({ w: 14, h: 7, roofRows: 2, roof: 'flat', siding: 'plaster', doors: [], windows: [], seed: 830 });
  // the big sign
  p.rect(28, 0, 168, 28, BLACK);
  p.rect(30, 2, 164, 24, WHITE);
  drawText(p, 44, 6, "RICK'S RIDES", BLACK, 2);
  drawText(p, 58, 17, 'NO MONEY DOWN*', MID);
  // a strip of lightbulbs around the sign
  for (let x = 30; x < 194; x += 6) {
    p.px(x, 1, LIGHT);
    p.px(x, 27, LIGHT);
  }
  // showroom glass
  p.rect(6, 40, W - 12, 64, BLACK);
  p.rect(8, 42, W - 16, 60, LIGHT);
  p.dither(8, 42, W - 16, 60, WHITE, 0.3);
  for (let x = 8; x < W - 8; x += 44) p.rect(x, 42, 2, 60, DARK);
  // bikes on display
  for (const x of [30, 160]) motorbikeSide(p, x, 92, false);
  // glass doors
  p.rect(98, 70, 28, 38, BLACK);
  p.rect(100, 72, 11, 34, WHITE);
  p.rect(113, 72, 11, 34, WHITE);
  p.dither(100, 72, 24, 34, LIGHT, 0.3);
  // pennant strings
  for (let x = 0; x < W; x += 8) p.poly([[x, 30], [x + 6, 30], [x + 3, 36]], x % 16 ? WHITE : MID);
  p.line(0, 30, W, 30, DARK);
  // a big flood stain, partly mopped off
  floodDamage(p, 40, 94, 8);
  p.outline(BLACK);
  void H;
  return p;
}

/** A simple side-view motorbike drawn into another image. */
export function motorbikeSide(p: PC, x: number, y: number, flip: boolean) {
  const s = flip ? -1 : 1;
  const X = (v: number) => x + v * s;
  p.ring(X(-10), y - 6, 6, 6, BLACK);
  p.ring(X(-10), y - 6, 5, 5, DARK);
  p.ring(X(12), y - 6, 6, 6, BLACK);
  p.ring(X(12), y - 6, 5, 5, DARK);
  p.circle(X(-10), y - 6, 1, MID);
  p.circle(X(12), y - 6, 1, MID);
  p.poly(
    [
      [X(-8), y - 12],
      [X(8), y - 14],
      [X(10), y - 8],
      [X(-4), y - 6],
    ],
    MID
  );
  p.rect(Math.min(X(-6), X(2)), y - 17, 8, 3, BLACK); // seat
  p.line(X(8), y - 14, X(12), y - 6, LIGHT);
  p.line(X(8), y - 14, X(6), y - 20, LIGHT); // handlebar
  p.line(X(4), y - 20, X(8), y - 20, LIGHT);
  p.rect(Math.min(X(-14), X(-8)), y - 11, 6, 2, LIGHT); // exhaust
  p.px(X(10), y - 15, WHITE);
}

/** The grocery store, closed by emergency order (12x7). */
export function grocery2(open: boolean): PC {
  const p = building({ w: 12, h: 7, roofRows: 2, roof: 'flat', siding: 'brick', doors: [], windows: [], seed: 940 });
  const W = 192;
  const H = 112;
  p.rect(30, 4, 132, 22, BLACK);
  p.rect(32, 6, 128, 18, LIGHT);
  drawText(p, 42, 11, 'FRESH MART', BLACK, 2);
  // one letter has fallen off
  p.rect(110, 10, 12, 12, LIGHT);
  for (const x0 of [10, 120]) {
    p.rect(x0, 50, 62, 38, BLACK);
    p.rect(x0 + 2, 52, 58, 34, MID);
    // boarded
    for (let k = 0; k < 3; k++) p.thick(x0, 56 + k * 12, x0 + 62, 52 + k * 12 + 6, LIGHT, 2);
  }
  p.rect(78, H - 34, 36, 31, BLACK);
  if (!open) {
    // chained doors and a notice
    p.rect(80, H - 32, 32, 29, DARK);
    p.line(80, H - 22, 112, H - 12, LIGHT);
    p.line(80, H - 12, 112, H - 22, LIGHT);
    p.rect(88, H - 30, 16, 10, WHITE);
    drawText(p, 89, H - 28, 'NO', BLACK, 0);
  } else {
    p.rect(80, H - 32, 15, 29, BLACK);
    p.rect(97, H - 32, 15, 29, BLACK);
    p.rect(84, H - 32, 3, 29, DARK);
  }
  floodDamage(p, 30, 90, 5);
  p.outline(BLACK);
  return p;
}

/** The evacuation point: a painted helipad (4x4 tiles, drawn on the ground). */
export function helipad(): PC {
  const p = new PC(64, 64);
  p.circle(32, 32, 30, DARK);
  p.circle(32, 32, 28, MID);
  p.ring(32, 32, 26, 26, WHITE);
  p.rect(20, 18, 5, 28, WHITE);
  p.rect(39, 18, 5, 28, WHITE);
  p.rect(20, 30, 24, 5, WHITE);
  p.dither(4, 4, 56, 56, DARK, 0.1, true);
  return p;
}

// ------------------------------------------------------------------ stranded vehicles & street props

/** A fishing boat beached in the middle of the street, listing to one side (3x2). */
export function strandedBoat(seed: number): PC {
  const p = new PC(56, 40);
  const r = artRng(seed);
  p.poly(
    [
      [2, 18],
      [54, 14],
      [46, 34],
      [10, 36],
    ],
    MID
  );
  p.poly(
    [
      [4, 18],
      [52, 15],
      [50, 20],
      [6, 23],
    ],
    LIGHT
  );
  for (let x = 8; x < 48; x += 6) p.line(x, 22, x - 2, 34, DARK);
  p.rect(22, 6, 14, 10, DARK); // wheelhouse
  p.rect(24, 8, 4, 4, BLACK);
  p.rect(30, 8, 4, 4, BLACK);
  p.line(30, 0, 34, 6, LIGHT); // mast
  drawText(p, 12, 26, r() < 0.5 ? 'MOLLY' : 'GRETA', WHITE, 0);
  // seaweed hanging off the keel
  for (let x = 12; x < 44; x += 5) p.line(x, 34, x + 1, 38, DARK);
  p.outline(BLACK);
  return p;
}

/** A car (2x2 tiles), tipped and dented, sometimes upside down. */
export function wreckedCar(v: number): PC {
  const p = new PC(32, 28);
  const flipped = v === 2;
  const body = v === 1 ? LIGHT : MID;
  if (flipped) {
    p.rect(2, 8, 28, 10, body);
    p.rect(6, 18, 20, 6, DARK);
    p.rect(8, 19, 7, 4, BLACK);
    p.rect(17, 19, 7, 4, BLACK);
    for (const x of [6, 24]) {
      p.circle(x, 6, 4, BLACK);
      p.circle(x, 6, 2, DARK);
    }
  } else {
    p.rect(2, 12, 28, 10, body);
    p.rect(7, 5, 18, 8, body);
    p.rect(9, 6, 6, 6, DARK);
    p.rect(17, 6, 6, 6, DARK);
    p.px(10, 7, LIGHT);
    p.px(18, 7, LIGHT);
    for (const x of [8, 24]) {
      p.circle(x, 22, 4, BLACK);
      p.circle(x, 22, 2, DARK);
    }
    p.rect(2, 15, 3, 2, WHITE); // headlight
    p.line(12, 14, 18, 19, DARK); // dent
    if (v === 1) p.dither(2, 16, 28, 6, DARK, 0.35); // tide-stained
  }
  p.outline(BLACK);
  return p;
}

/** A broken streetlight, bent over at the middle. */
export function brokenLamp(): PC {
  const p = new PC(24, 32);
  p.rect(10, 16, 2, 15, DARK);
  p.rect(9, 29, 4, 3, DARK);
  p.thick(11, 16, 20, 8, DARK, 2);
  p.rect(17, 7, 7, 5, BLACK);
  p.rect(18, 8, 5, 3, DARK);
  p.line(19, 12, 21, 15, MID); // dangling wire
  p.outline(BLACK);
  return p;
}

/** A dead, wind-bent palm (3x3). */
export function deadPalm(seed: number): PC {
  const p = new PC(48, 48);
  const r = artRng(seed);
  for (let y = 46; y > 12; y--) {
    const x = 20 + Math.round(Math.sin((46 - y) * 0.06) * 10);
    p.rect(x, y, 4, 1, y % 3 ? DARK : MID);
  }
  const tx = 30;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI + (r() - 0.5) * 0.3;
    const len = 12 + r() * 6;
    for (let k = 0; k < len; k++) {
      const x = tx + Math.cos(a) * k;
      const y = 12 + Math.sin(a) * k * 0.5 + (k * k) / 40;
      p.px(x, y, k % 3 ? MID : DARK);
      if (k > 3 && k % 2 === 0) p.px(x, y + 1, DARK);
    }
  }
  p.outline(BLACK);
  return p;
}

/** A billboard: ALL DEVELOPMENT HALTED (5x3). */
export function billboard(text1: string, text2: string): PC {
  const p = new PC(80, 48);
  p.rect(14, 30, 3, 18, DARK);
  p.rect(62, 30, 3, 18, DARK);
  p.rect(2, 2, 76, 30, BLACK);
  p.rect(4, 4, 72, 26, WHITE);
  drawText(p, 40 - text1.length * 3, 9, text1, BLACK);
  drawText(p, 40 - text2.length * 3, 19, text2, MID);
  // peeling corner, a watermark
  p.poly(
    [
      [66, 4],
      [76, 4],
      [76, 14],
    ],
    MID
  );
  p.rect(4, 26, 72, 3, DARK);
  p.outline(BLACK);
  return p;
}

/** An abandoned construction crane (4x8). */
export function crane(): PC {
  const p = new PC(64, 128);
  for (let y = 20; y < 124; y += 8) {
    p.line(24, y, 32, y + 8, MID);
    p.line(32, y, 24, y + 8, MID);
  }
  p.rect(23, 16, 2, 110, LIGHT);
  p.rect(32, 16, 2, 110, LIGHT);
  p.rect(0, 14, 64, 3, LIGHT);
  for (let x = 0; x < 64; x += 6) p.line(x, 14, x + 3, 8, MID);
  p.line(0, 8, 64, 8, MID);
  p.rect(36, 18, 10, 8, DARK); // cab
  p.line(56, 17, 56, 60, MID); // hook cable
  p.rect(53, 60, 6, 3, LIGHT);
  p.rect(16, 122, 26, 6, DARK);
  p.outline(BLACK);
  return p;
}

/** A gull. Two frames. */
export function gull(f: number): PC {
  const p = new PC(10, 6);
  if (f === 0) {
    p.line(0, 1, 4, 3, WHITE);
    p.line(5, 3, 9, 1, WHITE);
  } else {
    p.line(0, 4, 4, 3, WHITE);
    p.line(5, 3, 9, 4, WHITE);
  }
  p.px(4, 3, LIGHT);
  return p;
}

// ------------------------------------------------------------------ interior set pieces

/** The submarine, top-down, filling the inventor's garage (8x4 tiles). */
export function subTop(stage: number): PC {
  const p = new PC(128, 64);
  // hull
  p.ellipse(60, 34, 54, 22, MID);
  p.shade((x, y) => (Math.hypot((x - 60) / 54, (y - 34) / 22) < 1 ? 0.9 - (y - 12) / 50 - Math.abs(x - 60) / 300 : null), [DARK, MID, LIGHT]);
  // rivet seams
  for (const x of [28, 48, 72, 92]) for (let y = 16; y < 54; y += 4) if (p.get(x, y) >= 0) p.px(x, y, DARK);
  // conning tower + hatch
  p.ellipse(58, 26, 14, 9, LIGHT);
  p.ellipse(58, 25, 8, 5, DARK);
  p.ring(58, 25, 8, 5, WHITE);
  // periscope
  p.rect(66, 4, 2, 20, DARK);
  p.rect(66, 4, 6, 3, LIGHT);
  // portholes
  for (const x of [20, 40, 80, 98]) {
    p.circle(x, 36, 4, BLACK);
    p.circle(x, 36, 3, stage >= 4 ? WHITE : DARK);
    p.px(x - 1, 35, LIGHT);
  }
  // propeller
  p.rect(112, 30, 8, 8, DARK);
  p.line(120, 26, 124, 42, LIGHT);
  p.line(124, 26, 120, 42, LIGHT);
  // unfinished bits: open panels, wires spilling out
  if (stage < 1) {
    p.rect(30, 44, 12, 6, BLACK);
    p.line(34, 50, 30, 58, DARK);
  }
  if (stage < 2) {
    p.rect(84, 44, 10, 6, BLACK);
    p.line(88, 50, 92, 60, DARK);
  }
  if (stage < 3) {
    p.rect(104, 28, 6, 12, BLACK);
  }
  // scaffolding on the near side
  for (const x of [8, 116]) {
    p.rect(x, 50, 2, 14, LIGHT);
  }
  p.line(8, 54, 118, 54, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A side-view submarine for the underwater journey. */
export function subSide(f: number): PC {
  const p = new PC(72, 34);
  p.ellipse(34, 20, 30, 11, MID);
  p.shade((x, y) => (Math.hypot((x - 34) / 30, (y - 20) / 11) < 1 ? 0.95 - (y - 9) / 26 : null), [DARK, MID, LIGHT]);
  p.rect(26, 4, 16, 8, MID);
  p.rect(26, 4, 16, 2, LIGHT);
  p.rect(36, 0, 2, 5, DARK);
  p.rect(36, 0, 5, 2, DARK);
  for (const x of [16, 28, 40, 52]) {
    p.circle(x, 20, 3, BLACK);
    p.circle(x, 20, 2, WHITE);
  }
  // the propeller turns
  p.rect(64, 17, 3, 6, DARK);
  if (f % 2 === 0) p.rect(67, 13, 2, 14, LIGHT);
  else p.rect(66, 18, 5, 4, LIGHT);
  // a jar of peanut butter strapped to the hull, proudly
  p.rect(8, 10, 5, 6, LIGHT);
  p.rect(8, 9, 5, 1, WHITE);
  p.outline(BLACK);
  return p;
}

/** The emergency room screens: an island map with a target ring. */
export function bigScreen(): PC {
  const p = new PC(96, 40);
  p.rect(0, 0, 96, 40, DARK);
  p.rect(2, 2, 92, 36, BLACK);
  p.ellipse(40, 22, 20, 10, MID);
  p.dither(20, 12, 40, 20, DARK, 0.3, true);
  for (let r = 6; r < 40; r += 8) p.ring(78, 20, r, r * 0.6, r % 16 ? MID : LIGHT);
  drawText(p, 6, 4, 'SALTWASH', LIGHT, 0);
  drawText(p, 58, 30, 'ANOMALY', WHITE, 0);
  return p;
}

// ------------------------------------------------------------------ the evacuation

/** A rescue helicopter, side view (rotor animates over 2 frames). */
export function helicopter(f: number): PC {
  const p = new PC(72, 30);
  // body
  p.ellipse(28, 18, 18, 9, LIGHT);
  p.shade((x, y) => (Math.hypot((x - 28) / 18, (y - 18) / 9) < 1 ? 0.95 - (y - 9) / 22 : null), [MID, LIGHT, WHITE]);
  p.ellipse(18, 16, 8, 5, DARK); // windscreen
  p.px(15, 14, WHITE);
  // tail boom
  p.rect(44, 15, 22, 4, LIGHT);
  p.rect(64, 9, 4, 10, MID);
  if (f === 0) p.line(62, 8, 70, 18, WHITE);
  else p.line(70, 8, 62, 18, WHITE);
  // a big cross-free rescue stripe
  p.rect(30, 14, 12, 3, DARK);
  // skids
  p.line(14, 28, 42, 28, DARK);
  p.line(20, 26, 20, 28, DARK);
  p.line(36, 26, 36, 28, DARK);
  // mast + rotor
  p.rect(27, 6, 3, 4, DARK);
  if (f === 0) p.rect(2, 4, 54, 2, WHITE);
  else {
    p.rect(14, 4, 30, 2, MID);
    p.px(28, 3, WHITE);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ the tsunami

/** The great wave: a wall of water with a curling, foaming crest. */
export function bigWave(w: number, h: number): PC {
  const p = new PC(w, h);
  const r = artRng(9);
  for (let x = 0; x < w; x++) {
    const top = Math.round(h * 0.18 + Math.sin(x * 0.02) * h * 0.08 + Math.sin(x * 0.07) * 4);
    for (let y = top; y < h; y++) {
      // a dark, glassy face that lightens toward the crest
      const t = (y - top) / (h - top);
      const v = 0.95 - t * 0.85 + Math.sin(x * 0.05 + y * 0.03) * 0.1 + (t > 0.85 ? (t - 0.85) * 3 : 0);
      const c = v > 0.78 ? LIGHT : v > 0.45 ? MID : v > 0.12 ? DARK : BLACK;
      p.px(x, y, c);
    }
    // foam crest curling forward
    for (let k = 0; k < 6; k++) p.px(x, top - k + Math.round(Math.sin(x * 0.3) * 2), k < 4 ? WHITE : LIGHT);
    if (r() < 0.2) p.px(x, top - 7 - Math.floor(r() * 6), WHITE);
  }
  // streaks of spray running down the face
  for (let i = 0; i < w / 6; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(h * 0.3 + r() * h * 0.4);
    p.line(x, y, x + 3, y + 10, LIGHT);
  }
  return p;
}

// ------------------------------------------------------------------ the deep

/** Huge rock silhouettes for the abyss (parallax layers). */
export function deepRocks(w: number, h: number, seed: number, c: number): PC {
  const p = new PC(w, h);
  const r = artRng(seed);
  let y = h * 0.5;
  for (let x = 0; x < w; x++) {
    y += (r() - 0.5) * 4;
    if (x % 70 < 10) y -= 2;
    y = Math.max(h * 0.15, Math.min(h * 0.85, y));
    p.rect(x, Math.round(y), 1, h - Math.round(y), c);
  }
  // arches and spires
  for (let i = 0; i < w / 90; i++) {
    const x = Math.floor(r() * w);
    const top = Math.floor(r() * h * 0.4);
    p.poly(
      [
        [x - 10, h],
        [x, top],
        [x + 10, h],
      ],
      c
    );
  }
  return p;
}

/** A sunken ship broken in two. */
export function sunkenShip(): PC {
  const p = new PC(120, 60);
  p.poly(
    [
      [0, 40],
      [50, 36],
      [54, 58],
      [6, 58],
    ],
    DARK
  );
  p.poly(
    [
      [64, 30],
      [118, 26],
      [110, 58],
      [66, 58],
    ],
    DARK
  );
  p.thick(28, 36, 40, 2, MID, 2);
  p.thick(88, 28, 80, 8, MID, 2);
  p.line(40, 4, 50, 20, DARK);
  for (const x of [14, 26, 78, 94]) p.circle(x, 46, 2, BLACK);
  p.outline(BLACK);
  return p;
}

/** Something impossibly large: one eye in the dark, larger than the submarine. */
export function giantEye(open: number): PC {
  const p = new PC(120, 60);
  const ry = Math.max(1, Math.round(26 * open));
  p.ellipse(60, 30, 58, ry, DARK);
  if (open > 0.2) {
    p.ellipse(60, 30, 40, Math.max(1, ry - 6), MID);
    p.ellipse(60, 30, 8, Math.max(1, ry - 4), BLACK); // slit pupil
    p.px(52, 22, WHITE);
    p.px(53, 22, WHITE);
  }
  p.ring(60, 30, 58, ry, BLACK);
  return p;
}

/** Kelp strand (animated by swaying the image). */
export function kelp(h: number, seed: number): PC {
  const p = new PC(12, h);
  const r = artRng(seed);
  for (let y = 0; y < h; y++) {
    const x = 6 + Math.round(Math.sin(y * 0.15 + seed) * 3);
    p.rect(x, y, 2, 1, DARK);
    if (r() < 0.15) p.line(x, y, x + (r() < 0.5 ? -4 : 4), y - 3, DARK);
  }
  return p;
}

export function bubble(s: number): PC {
  const p = new PC(s * 2 + 2, s * 2 + 2);
  p.ring(s + 1, s + 1, s, s, LIGHT);
  p.px(s, s - 1, WHITE);
  return p;
}

/** A motorcycle on display in the showroom (the hero bike gleams). */
export function bikeProp(hero: boolean): PC {
  const p = new PC(36, 26);
  motorbikeSide(p, 18, 24, false);
  if (hero) {
    // chrome, a price tag, a little shine
    p.px(14, 11, WHITE);
    p.px(26, 9, WHITE);
    p.rect(2, 2, 12, 7, WHITE);
    p.rect(3, 4, 8, 1, BLACK);
    p.line(8, 9, 10, 13, LIGHT);
  }
  p.outline(BLACK);
  return p;
}
