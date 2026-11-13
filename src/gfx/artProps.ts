import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';
import { drawText } from './fontData';
import { skull } from './artBoss';

// Buildings and large props for Hollowhaven, drawn in a 3/4 overhead view:
// the roof takes the top of the footprint and the front wall faces the player.

export interface PropMeta {
  ox?: number;
  oy?: number;
}
export const PROP_META: Record<string, PropMeta> = {
  p_tree: { ox: -16 },
  p_well: {},
};

export interface Win {
  x: number; // tile column
  lit?: boolean;
  broken?: boolean;
  boarded?: boolean;
}

export interface BuildingOpts {
  w: number;
  h: number;
  roofRows: number; // tiles of roof
  roof: 'gable' | 'flat' | 'gambrel' | 'dome' | 'mansard';
  siding: 'wood' | 'stone' | 'brick' | 'plaster' | 'tudor';
  doors: number[]; // tile columns
  windows: Win[];
  crooked?: number; // roof skew in px
  chimney?: number; // tile column
  seed?: number;
  dark?: boolean; // gloomier palette
}

export function window16(p: PC, x: number, y: number, w: Win, tall = false) {
  const h = tall ? 12 : 9;
  p.rect(x + 2, y, 12, h + 2, BLACK);
  p.rect(x + 3, y + 1, 10, h, w.lit ? LIGHT : BLACK);
  if (w.lit) {
    p.dither(x + 3, y + 1, 10, h, WHITE, 0.35);
    p.rect(x + 3, y + h - 2, 10, 2, MID); // a silhouette on the sill
  } else p.px(x + 11, y + 2, MID);
  p.rect(x + 8, y + 1, 1, h, DARK);
  p.rect(x + 3, y + Math.floor(h / 2), 10, 1, DARK);
  if (w.broken) {
    p.poly(
      [
        [x + 9, y + 1],
        [x + 13, y + 1],
        [x + 13, y + 6],
        [x + 10, y + 4],
      ],
      BLACK
    );
    p.line(x + 9, y + 1, x + 11, y + 5, MID);
  }
  if (w.boarded) {
    p.line(x + 2, y + 2, x + 14, y + h - 1, MID);
    p.line(x + 2, y + h - 1, x + 14, y + 2, MID);
    p.line(x + 2, y + 3, x + 14, y + h, LIGHT);
  }
  p.rect(x + 1, y + h + 1, 14, 1, MID); // sill
}

export function door16(p: PC, x: number, y: number, h: number, style: 'wood' | 'glass' | 'iron' = 'wood') {
  p.rect(x + 2, y, 12, h, BLACK);
  if (style === 'glass') {
    p.rect(x + 3, y + 1, 10, h - 1, LIGHT);
    p.dither(x + 3, y + 1, 10, h - 1, WHITE, 0.4);
    p.rect(x + 8, y + 1, 1, h - 1, DARK);
    return;
  }
  p.rect(x + 3, y + 1, 10, h - 1, style === 'iron' ? DARK : MID);
  p.rect(x + 3, y + 1, 10, 1, LIGHT);
  for (let yy = y + 4; yy < y + h; yy += 4) p.rect(x + 4, yy, 8, 1, DARK);
  p.px(x + 11, y + Math.floor(h / 2), WHITE);
}

export function building(o: BuildingOpts): PC {
  const W = o.w * 16;
  const H = o.h * 16;
  const p = new PC(W, H);
  const r = artRng(o.seed ?? 5);
  const roofH = o.roofRows * 16;
  const wallTop = roofH - 4;
  // ---- front wall
  const wallC = o.dark ? DARK : MID;
  p.rect(0, wallTop, W, H - wallTop, wallC);
  if (o.siding === 'wood') {
    for (let y = wallTop + 3; y < H; y += 4) p.rect(0, y, W, 1, o.dark ? BLACK : DARK);
    for (let i = 0; i < W / 3; i++) p.px(Math.floor(r() * W), wallTop + Math.floor(r() * (H - wallTop)), o.dark ? MID : LIGHT);
  } else if (o.siding === 'stone') {
    for (let y = wallTop; y < H; y += 6)
      for (let x = ((y - wallTop) / 6) % 2 ? 0 : 5; x < W; x += 10) {
        p.rect(x, y, 9, 5, o.dark ? DARK : MID);
        p.rect(x, y, 9, 1, o.dark ? MID : LIGHT);
        p.rect(x + 9, y, 1, 6, BLACK);
        p.rect(x, y + 5, 10, 1, BLACK);
      }
  } else if (o.siding === 'brick') {
    for (let y = wallTop; y < H; y += 4) {
      p.rect(0, y, W, 1, BLACK);
      for (let x = ((y - wallTop) / 4) % 2 ? 3 : 0; x < W; x += 7) p.rect(x, y, 1, 4, BLACK);
    }
    p.dither(0, wallTop, W, H - wallTop, DARK, 0.15);
  } else if (o.siding === 'plaster') {
    p.rect(0, wallTop, W, H - wallTop, LIGHT);
    p.dither(0, wallTop, W, H - wallTop, MID, 0.2);
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * (W - 10));
      const y = wallTop + 4 + Math.floor(r() * (H - wallTop - 8));
      p.line(x, y, x + 4, y + 3, MID); // cracks
    }
  } else if (o.siding === 'tudor') {
    p.rect(0, wallTop, W, H - wallTop, LIGHT);
    p.dither(0, wallTop, W, H - wallTop, MID, 0.25);
    for (let x = 0; x < W; x += 16) p.rect(x, wallTop, 2, H - wallTop, BLACK);
    p.rect(0, wallTop + 2, W, 2, BLACK);
    for (let x = 0; x < W - 16; x += 32) {
      p.thick(x, wallTop + 4, x + 16, H - 18, BLACK, 2);
      p.thick(x + 32, wallTop + 4, x + 16, H - 18, BLACK, 2);
    }
  }
  // foundation
  p.rect(0, H - 3, W, 3, DARK);
  p.rect(0, H - 3, W, 1, BLACK);

  // ---- roof
  const k = o.crooked ?? 0;
  const shingles = (x0: number, y0: number, w: number, h: number, base: number) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (p.get(x, y) < 0) continue;
        const row = Math.floor((y - y0) / 3);
        const c = (y - y0) % 3 === 2 ? BLACK : (x + row * 2) % 6 === 0 ? BLACK : base;
        p.px(x, y, c);
      }
  };
  if (o.roof === 'gable' || o.roof === 'gambrel') {
    const pts: Pt[] =
      o.roof === 'gable'
        ? [
            [-2, roofH],
            [W / 2 - W * 0.18 + k, 2],
            [W / 2 + W * 0.18 + k, 2],
            [W + 2, roofH],
          ]
        : [
            [-2, roofH],
            [4, roofH * 0.45],
            [W * 0.3, 2],
            [W * 0.7, 2],
            [W - 4, roofH * 0.45],
            [W + 2, roofH],
          ];
    p.poly(pts, o.dark ? BLACK : DARK);
    shingles(0, 0, W, roofH, o.dark ? DARK : MID);
    // lit edge along the eave
    p.rect(0, roofH - 1, W, 1, LIGHT);
    p.rect(0, roofH, W, 2, BLACK);
  } else if (o.roof === 'flat') {
    p.rect(0, roofH - 10, W, 10, DARK);
    p.rect(0, roofH - 10, W, 2, MID);
    p.rect(0, roofH, W, 2, BLACK);
  } else if (o.roof === 'mansard') {
    p.poly(
      [
        [-2, roofH],
        [6, 6],
        [W - 6, 6],
        [W + 2, roofH],
      ],
      BLACK
    );
    shingles(0, 6, W, roofH - 6, DARK);
    p.rect(4, 4, W - 8, 3, DARK);
    p.rect(0, roofH - 1, W, 1, MID);
  } else if (o.roof === 'dome') {
    p.rect(0, roofH - 8, W, 8, DARK);
    p.ellipse(W / 2, roofH - 8, W / 2 - 6, roofH - 12, DARK);
    p.shade((x, y) => (y < roofH - 2 ? 0.9 - Math.abs(x - W / 2 + 8) / W - y / (roofH * 2) : null), [BLACK, DARK, MID, LIGHT]);
    p.line(W / 2, 0, W / 2, 6, LIGHT);
    p.circle(W / 2, 0, 1, WHITE);
  }
  if (o.chimney !== undefined) {
    const cx = o.chimney * 16 + 4;
    p.rect(cx, 0, 8, roofH * 0.6, DARK);
    p.rect(cx - 1, 0, 10, 3, MID);
    p.rect(cx + 1, 1, 6, 1, BLACK);
  }

  // ---- windows + doors on the front wall
  const winY = wallTop + Math.max(6, Math.floor((H - wallTop - 14) / 2) - 2);
  for (const w of o.windows) window16(p, w.x * 16, winY, w);
  for (const d of o.doors) door16(p, d * 16, H - 20, 17);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ named buildings

export function house(variant: number): PC {
  const v = [
    { roof: 'gable', siding: 'wood', windows: [{ x: 1, lit: true }, { x: 5 }], crooked: 5, chimney: 5 },
    { roof: 'gambrel', siding: 'plaster', windows: [{ x: 1 }, { x: 5, lit: true }], crooked: -3, chimney: 1 },
    { roof: 'gable', siding: 'stone', windows: [{ x: 1, boarded: true }, { x: 5, broken: true }], crooked: 2, dark: true },
    { roof: 'mansard', siding: 'brick', windows: [{ x: 1, lit: true }, { x: 5, lit: true }], chimney: 4 },
  ][variant] as Partial<BuildingOpts>;
  return building({ w: 7, h: 5, roofRows: 3, doors: [3], seed: 10 + variant, ...(v as any) });
}

export function office(): PC {
  const p = building({
    w: 12,
    h: 7,
    roofRows: 3,
    roof: 'mansard',
    siding: 'stone',
    doors: [],
    windows: [{ x: 1, lit: true }, { x: 3 }, { x: 8 }, { x: 10, lit: true }],
    seed: 41,
  });
  const W = 192;
  const H = 112;
  // pediment + columns
  p.poly(
    [
      [64, 50],
      [96, 30],
      [128, 50],
    ],
    LIGHT
  );
  p.poly(
    [
      [70, 48],
      [96, 34],
      [122, 48],
    ],
    MID
  );
  for (const x of [66, 80, 108, 120]) {
    p.rect(x, 50, 6, H - 56, LIGHT);
    p.rect(x, 50, 1, H - 56, WHITE);
    p.rect(x + 5, 50, 1, H - 56, MID);
  }
  // big clock above the door
  p.circle(96, 42, 6, WHITE);
  p.ring(96, 42, 6, 6, DARK);
  p.line(96, 42, 96, 37, BLACK);
  p.line(96, 42, 99, 44, BLACK);
  // name board
  p.rect(70, 52, 52, 9, BLACK);
  drawText(p, 74, 53, 'MAYOR', WHITE);
  // double door + steps
  p.rect(82, H - 26, 28, 23, BLACK);
  p.rect(84, H - 24, 11, 21, MID);
  p.rect(97, H - 24, 11, 21, MID);
  p.px(93, H - 14, WHITE);
  p.px(99, H - 14, WHITE);
  for (let i = 0; i < 3; i++) p.rect(76 - i * 2, H - 4 + i, 40 + i * 4, 1, i % 2 ? MID : LIGHT);
  // flagpole on the roof
  p.rect(140, 0, 1, 26, LIGHT);
  p.poly(
    [
      [141, 1],
      [156, 4],
      [141, 9],
    ],
    MID
  );
  p.px(147, 4, WHITE);
  void W;
  return p;
}

export function psychic(): PC {
  const p = building({
    w: 9,
    h: 6,
    roofRows: 3,
    roof: 'dome',
    siding: 'plaster',
    doors: [4],
    windows: [{ x: 1, lit: true }, { x: 7, lit: true }],
    seed: 77,
    dark: true,
  });
  // crescent moon + stars on the dome
  p.circle(72, 22, 6, WHITE);
  p.circle(75, 20, 5, -1);
  p.circle(75, 20, 5, DARK);
  for (const [x, y] of [
    [40, 18],
    [104, 16],
    [56, 34],
    [94, 34],
  ]) {
    p.px(x, y, WHITE);
    p.px(x - 1, y, LIGHT);
    p.px(x + 1, y, LIGHT);
    p.px(x, y - 1, LIGHT);
    p.px(x, y + 1, LIGHT);
  }
  // the eye sign over the door
  p.rect(52, 48, 40, 10, BLACK);
  p.ellipse(72, 53, 7, 3, LIGHT);
  p.circle(72, 53, 2, BLACK);
  p.px(72, 52, WHITE);
  // curtains in the windows
  for (const x of [16, 112]) {
    p.rect(x + 3, 56, 3, 12, DARK);
    p.rect(x + 10, 56, 3, 12, DARK);
  }
  // hanging charms
  for (const x of [8, 136]) {
    p.line(x, 46, x, 56, MID);
    p.circle(x, 58, 2, LIGHT);
  }
  return p;
}

export function mansion(): PC {
  const W = 320;
  const H = 192;
  const p = new PC(W, H);
  const r = artRng(666);
  const body = building({
    w: 20,
    h: 12,
    roofRows: 4,
    roof: 'mansard',
    siding: 'stone',
    doors: [],
    windows: [
      { x: 2, broken: true },
      { x: 4 },
      { x: 6, boarded: true },
      { x: 13 },
      { x: 15, broken: true },
      { x: 17, lit: true },
    ],
    seed: 66,
    dark: true,
  });
  p.blit(body, 0, 0);
  // second row of windows
  for (const [x, w] of [
    [2, { x: 0 }],
    [4, { x: 0, broken: true }],
    [6, { x: 0 }],
    [13, { x: 0, boarded: true }],
    [15, { x: 0 }],
    [17, { x: 0, broken: true }],
  ] as [number, Win][])
    window16(p, x * 16, 112, w, true);
  // towers
  for (const tx of [0, W - 48]) {
    p.rect(tx, 22, 48, H - 22, DARK);
    for (let y = 26; y < H; y += 6) p.rect(tx, y, 48, 1, BLACK);
    p.poly(
      [
        [tx - 4, 30],
        [tx + 24, -2],
        [tx + 52, 30],
      ],
      BLACK
    );
    for (let y = 4; y < 30; y += 3) p.line(tx + 24 - (y - 2) * 0.9, y, tx + 24 + (y - 2) * 0.9, y, DARK);
    p.line(tx + 24, -2, tx + 24, 4, LIGHT);
    window16(p, tx + 16, 44, { x: 0, lit: tx > 0 }, true);
    window16(p, tx + 16, 100, { x: 0, broken: tx === 0 }, true);
    p.rect(tx + 47, 22, 1, H - 22, BLACK);
    p.rect(tx, 22, 1, H - 22, MID);
  }
  // central gable with a round window
  p.poly(
    [
      [116, 64],
      [160, 22],
      [204, 64],
    ],
    BLACK
  );
  p.poly(
    [
      [124, 62],
      [160, 30],
      [196, 62],
    ],
    DARK
  );
  p.circle(160, 48, 9, BLACK);
  p.circle(160, 48, 7, LIGHT);
  p.line(153, 48, 167, 48, BLACK);
  p.line(160, 41, 160, 55, BLACK);
  p.dither(156, 44, 8, 8, WHITE, 0.3);
  // great arched door
  p.rect(140, H - 46, 40, 44, BLACK);
  p.ellipse(160, H - 46, 20, 12, BLACK);
  p.rect(144, H - 42, 15, 40, DARK);
  p.rect(161, H - 42, 15, 40, DARK);
  p.ellipse(160, H - 44, 16, 9, DARK);
  for (const x of [148, 168]) {
    p.ring(x + 2, H - 22, 2, 2, LIGHT); // knockers
  }
  skull(p, 160, H - 56, 5, MID, false);
  // steps
  for (let i = 0; i < 3; i++) p.rect(132 - i * 3, H - 3 + i - 2, 56 + i * 6, 1, MID);
  // ivy creeping up the walls
  for (let i = 0; i < 12; i++) {
    let x = Math.floor(r() * W);
    let y = H - 4;
    for (let k = 0; k < 40; k++) {
      if (p.get(x, y) >= 0) p.px(x, y, r() < 0.3 ? BLACK : DARK);
      if (r() < 0.3 && p.get(x + 1, y) >= 0) p.px(x + 1, y, MID);
      x += r() < 0.5 ? 1 : -1;
      y -= r() < 0.8 ? 1 : 0;
    }
  }
  // gargoyles on the eaves
  for (const x of [56, 260]) {
    p.ellipse(x, 62, 5, 4, MID);
    p.px(x - 2, 61, BLACK);
    p.px(x + 2, 61, BLACK);
    p.poly(
      [
        [x - 6, 58],
        [x - 3, 54],
        [x - 2, 59],
      ],
      MID
    );
    p.poly(
      [
        [x + 6, 58],
        [x + 3, 54],
        [x + 2, 59],
      ],
      MID
    );
  }
  p.outline(BLACK);
  return p;
}

export function store(): PC {
  const p = building({ w: 12, h: 7, roofRows: 2, roof: 'flat', siding: 'brick', doors: [], windows: [], seed: 90 });
  const W = 192;
  const H = 112;
  // sign board
  p.rect(30, 4, 132, 22, BLACK);
  p.rect(32, 6, 128, 18, LIGHT);
  drawText(p, 54, 11, 'GROCERY', BLACK, 2);
  p.px(36, 9, WHITE);
  p.px(156, 20, WHITE);
  // striped awning
  for (let x = 4; x < W - 4; x++) {
    const stripe = Math.floor((x - 4) / 8) % 2 === 0;
    for (let y = 36; y < 46; y++) p.px(x, y, stripe ? WHITE : DARK);
    if (x % 8 === 4) p.px(x, 46, stripe ? LIGHT : DARK);
  }
  p.rect(4, 35, W - 8, 1, BLACK);
  // display windows with shelves of goods visible
  for (const x0 of [10, 120]) {
    p.rect(x0, 52, 62, 36, BLACK);
    p.rect(x0 + 2, 54, 58, 32, LIGHT);
    p.dither(x0 + 2, 54, 58, 32, WHITE, 0.35);
    for (const y of [64, 76]) {
      p.rect(x0 + 2, y, 58, 2, DARK);
      for (let x = x0 + 4; x < x0 + 58; x += 5) p.rect(x, y - 5, 3, 5, x % 2 ? MID : DARK);
    }
  }
  // glass double door
  p.rect(78, H - 34, 36, 31, BLACK);
  p.rect(80, H - 32, 15, 29, LIGHT);
  p.rect(97, H - 32, 15, 29, LIGHT);
  p.dither(80, H - 32, 32, 29, WHITE, 0.4);
  p.rect(84, H - 22, 7, 5, DARK);
  drawText(p, 84, H - 22, 'O', WHITE);
  p.outline(BLACK);
  return p;
}

export function fishshop(): PC {
  const p = building({ w: 8, h: 6, roofRows: 3, roof: 'gable', siding: 'wood', doors: [3], windows: [{ x: 1, lit: true }, { x: 6 }], crooked: -4, seed: 55 });
  // fish-shaped sign
  p.ellipse(64, 46, 18, 6, LIGHT);
  p.poly(
    [
      [82, 46],
      [92, 39],
      [92, 53],
    ],
    LIGHT
  );
  p.circle(52, 45, 1, BLACK);
  drawText(p, 50, 43, '', BLACK);
  p.rect(60, 40, 1, 2, MID);
  // nets on the wall
  for (let x = 96; x < 124; x += 4) {
    p.line(x, 50, x + 6, 74, DARK);
    p.line(x + 6, 50, x, 74, DARK);
  }
  p.line(96, 50, 126, 50, MID);
  p.outline(BLACK);
  return p;
}

export function farmhouse(): PC {
  const p = building({ w: 8, h: 6, roofRows: 3, roof: 'gable', siding: 'wood', doors: [4], windows: [{ x: 1, lit: true }, { x: 2 }, { x: 6, lit: true }], chimney: 6, seed: 12 });
  // porch
  p.rect(48, 70, 64, 2, LIGHT);
  for (const x of [50, 108]) p.rect(x, 70, 2, 24, MID);
  p.rect(48, 94, 64, 2, MID);
  p.outline(BLACK);
  return p;
}

export function barn(): PC {
  const p = building({ w: 9, h: 7, roofRows: 3, roof: 'gambrel', siding: 'wood', doors: [], windows: [], seed: 19, dark: true });
  const H = 112;
  // hay loft
  p.rect(60, 30, 24, 16, BLACK);
  p.rect(62, 32, 20, 12, DARK);
  p.line(62, 32, 81, 43, MID);
  p.line(81, 32, 62, 43, MID);
  p.rect(62, 40, 20, 4, LIGHT); // hay poking out
  // big X doors
  p.rect(44, H - 46, 56, 44, BLACK);
  for (const x0 of [46, 73]) {
    p.rect(x0, H - 44, 25, 42, MID);
    p.frame(x0, H - 44, 25, 42, LIGHT);
    p.thick(x0 + 1, H - 43, x0 + 23, H - 4, LIGHT, 2);
    p.thick(x0 + 23, H - 43, x0 + 1, H - 4, LIGHT, 2);
  }
  p.outline(BLACK);
  return p;
}

export function tavern(): PC {
  const p = building({ w: 7, h: 6, roofRows: 3, roof: 'gable', siding: 'tudor', doors: [3], windows: [{ x: 1, lit: true }, { x: 5, lit: true }], crooked: 3, chimney: 1, seed: 31 });
  // hanging sign with a mug
  p.rect(84, 44, 20, 1, BLACK);
  p.line(88, 44, 88, 48, BLACK);
  p.line(100, 44, 100, 48, BLACK);
  p.rect(84, 48, 20, 14, DARK);
  p.rect(89, 51, 8, 9, LIGHT);
  p.ring(98, 55, 2, 3, LIGHT);
  p.rect(89, 51, 8, 2, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ town props

export function clocktower(): PC {
  const p = new PC(48, 112);
  p.rect(6, 30, 36, 82, MID);
  for (let y = 34; y < 112; y += 6)
    for (let x = ((y - 34) / 6) % 2 ? 6 : 12; x < 42; x += 12) {
      p.rect(x, y, 11, 1, DARK);
      p.rect(x + 11, y, 1, 6, DARK);
    }
  p.shade((x) => (x < 20 ? 0.75 : x > 34 ? 0.3 : 0.55), [DARK, MID, LIGHT]);
  p.poly(
    [
      [2, 32],
      [24, 0],
      [46, 32],
    ],
    BLACK
  );
  for (let y = 6; y < 32; y += 3) p.line(24 - y * 0.68, y, 24 + y * 0.68, y, DARK);
  // the clock face, stopped at a strange hour
  p.circle(24, 46, 10, WHITE);
  p.ring(24, 46, 10, 10, DARK);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.px(24 + Math.round(Math.cos(a) * 8), 46 + Math.round(Math.sin(a) * 8), BLACK);
  }
  p.line(24, 46, 24, 38, BLACK);
  p.line(24, 46, 30, 49, BLACK);
  // door at the base
  p.rect(18, 92, 12, 20, BLACK);
  p.rect(19, 94, 10, 18, DARK);
  p.rect(4, 108, 40, 4, DARK);
  p.outline(BLACK);
  return p;
}

export function well(): PC {
  const p = new PC(32, 48);
  // roof
  p.poly(
    [
      [0, 12],
      [16, 0],
      [32, 12],
    ],
    DARK
  );
  for (let y = 3; y < 12; y += 3) p.line(16 - y * 1.3, y, 16 + y * 1.3, y, BLACK);
  p.rect(3, 12, 2, 18, MID);
  p.rect(27, 12, 2, 18, MID);
  p.rect(4, 15, 24, 1, LIGHT); // crank
  p.rect(15, 16, 1, 8, LIGHT); // rope
  p.rect(13, 23, 5, 4, MID); // bucket
  // stone ring
  p.ellipse(16, 34, 15, 6, MID);
  p.ellipse(16, 33, 11, 3, BLACK);
  p.rect(1, 34, 30, 12, MID);
  for (let y = 36; y < 46; y += 4)
    for (let x = (y / 4) % 2 ? 1 : 5; x < 31; x += 8) {
      p.rect(x, y, 7, 3, (x + y) % 3 ? MID : LIGHT);
      p.rect(x + 7, y, 1, 4, DARK);
    }
  p.rect(1, 46, 30, 2, DARK);
  p.outline(BLACK);
  return p;
}

export function lamp(lit = true): PC {
  const p = new PC(16, 32);
  p.rect(7, 8, 2, 23, DARK);
  p.rect(6, 29, 4, 3, DARK);
  p.rect(4, 2, 8, 7, BLACK);
  p.rect(5, 3, 6, 5, lit ? WHITE : DARK);
  if (lit) p.rect(5, 6, 6, 2, LIGHT);
  p.rect(3, 1, 10, 1, MID);
  p.px(8, 0, MID);
  p.outline(BLACK);
  return p;
}

export function deadTree(seed: number): PC {
  const p = new PC(48, 48);
  const r = artRng(seed);
  p.rect(22, 30, 5, 18, DARK);
  p.rect(22, 30, 1, 18, MID);
  const branch = (x: number, y: number, ang: number, len: number, w: number) => {
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    p.thick(x, y, x2, y2, DARK, w);
    if (len > 5) {
      branch(x2, y2, ang - 0.5 - r() * 0.3, len * 0.65, Math.max(1, w - 1));
      branch(x2, y2, ang + 0.4 + r() * 0.3, len * 0.6, Math.max(1, w - 1));
    }
  };
  branch(24, 32, -Math.PI / 2 - 0.3, 14, 3);
  branch(24, 34, -Math.PI / 2 + 0.5, 12, 2);
  // roots
  p.line(21, 47, 16, 47, DARK);
  p.line(27, 47, 32, 47, DARK);
  p.outline(BLACK);
  return p;
}

export function swings(): PC {
  const p = new PC(48, 32);
  p.thick(2, 30, 8, 2, MID, 2);
  p.thick(46, 30, 40, 2, MID, 2);
  p.rect(6, 2, 36, 2, LIGHT);
  for (const x of [14, 30]) {
    p.line(x, 4, x, 22, LIGHT);
    p.line(x + 6, 4, x + 6, 22, LIGHT);
    p.rect(x - 1, 22, 9, 2, DARK);
  }
  p.outline(BLACK);
  return p;
}

export function slide(): PC {
  const p = new PC(32, 32);
  p.rect(4, 4, 2, 28, MID);
  for (let y = 8; y < 30; y += 5) p.rect(4, y, 8, 1, LIGHT);
  p.rect(10, 4, 2, 28, MID);
  p.thick(12, 4, 30, 28, LIGHT, 3);
  p.rect(4, 2, 8, 2, DARK);
  p.outline(BLACK);
  return p;
}

export function caveMouth(): PC {
  const p = new PC(80, 64);
  const r = artRng(9);
  p.poly(
    [
      [0, 64],
      [2, 22],
      [14, 8],
      [30, 2],
      [52, 4],
      [70, 14],
      [80, 30],
      [80, 64],
    ],
    MID
  );
  p.shade((x, y) => 0.85 - x / 160 - y / 140 + (r() - 0.5) * 0.15, [BLACK, DARK, MID, LIGHT]);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * 70);
    const y = 10 + Math.floor(r() * 44);
    p.line(x, y, x + 6, y + 3, BLACK);
  }
  // the opening (column 3 of the prop = the door tile)
  p.ellipse(56, 60, 10, 16, BLACK);
  p.rect(46, 50, 20, 14, BLACK);
  p.dither(46, 44, 20, 8, DARK, 0.4);
  p.outline(BLACK);
  return p;
}

export function tape(): PC {
  const p = new PC(16, 16);
  p.rect(0, 3, 16, 3, LIGHT);
  p.rect(0, 10, 16, 3, LIGHT);
  for (let x = 0; x < 16; x += 4) {
    p.rect(x, 3, 2, 3, BLACK);
    p.rect(x + 2, 10, 2, 3, BLACK);
  }
  p.outline(BLACK);
  return p;
}

/** The Bell Fish on its own, hung from the hook at (8, 4) (for swinging it as it rings). */
export function bellFishHanging(): PC {
  const p = bellPost(true);
  // keep only the fish and its cord: everything left of/right of it on the post goes
  p.remap((c, x, y) => {
    if (y < 5) return -1; // the crossbar
    if (y < 7) return x >= 7 && x <= 9 ? c : -1; // just the cord
    if (y > 23 && x >= 6 && x <= 9) return -1; // the post below the fish
    return c;
  });
  return p;
}
/** The post with an empty hook (what is left behind while the fish swings). */
export function bellPostEmpty(): PC {
  const p = new PC(16, 32);
  p.rect(2, 2, 12, 2, DARK);
  p.rect(7, 2, 2, 30, DARK);
  p.rect(7, 2, 1, 30, MID);
  p.outline(BLACK);
  return p;
}

export function bellPost(fish: boolean): PC {
  const p = new PC(16, 32);
  p.rect(2, 2, 12, 2, DARK);
  p.rect(7, 2, 2, 30, DARK);
  p.rect(7, 2, 1, 30, MID);
  if (!fish) {
    // a bell eaten through by rust
    p.poly(
      [
        [3, 18],
        [5, 7],
        [11, 7],
        [13, 18],
      ],
      MID
    );
    p.dither(3, 7, 11, 11, DARK, 0.5);
    p.rect(2, 18, 12, 2, DARK);
    p.px(8, 20, DARK);
    p.px(5, 12, BLACK);
    p.px(10, 15, BLACK);
  } else {
    // the Bell Fish, hanging mouth-down, gleaming
    p.ellipse(8, 13, 5, 6, LIGHT);
    p.poly(
      [
        [4, 18],
        [8, 22],
        [12, 18],
      ],
      WHITE
    );
    p.px(6, 10, BLACK);
    p.px(10, 10, BLACK);
    p.line(5, 14, 11, 14, MID);
    p.px(6, 8, WHITE);
    p.line(8, 4, 8, 7, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

export function boat(): PC {
  const p = new PC(48, 16);
  p.poly(
    [
      [0, 4],
      [48, 4],
      [42, 13],
      [6, 13],
    ],
    MID
  );
  p.rect(4, 4, 40, 3, DARK);
  p.rect(0, 4, 48, 1, LIGHT);
  p.rect(20, 5, 2, 6, LIGHT);
  p.line(30, 2, 44, 0, DARK); // oar
  p.outline(BLACK);
  return p;
}

export function stall(seed: number): PC {
  const p = new PC(48, 32);
  const r = artRng(seed);
  for (let x = 0; x < 48; x++) for (let y = 0; y < 8; y++) p.px(x, y, Math.floor(x / 6) % 2 ? LIGHT : DARK);
  p.rect(2, 8, 2, 24, MID);
  p.rect(44, 8, 2, 24, MID);
  p.rect(2, 20, 44, 10, MID);
  p.rect(2, 20, 44, 1, LIGHT);
  for (let i = 0; i < 8; i++) p.ellipse(6 + Math.floor(r() * 36), 18, 2, 1, r() < 0.5 ? LIGHT : WHITE);
  p.outline(BLACK);
  return p;
}

export function uglyClock(): PC {
  const p = new PC(16, 16);
  p.poly(
    [
      [2, 15],
      [3, 4],
      [8, 0],
      [13, 4],
      [14, 15],
    ],
    DARK
  );
  p.circle(8, 8, 4, LIGHT);
  // googly eyes and a frowning mouth: truly hideous
  p.circle(6, 6, 1, WHITE);
  p.circle(10, 7, 1, WHITE);
  p.px(6, 7, BLACK);
  p.px(11, 7, BLACK);
  p.line(6, 11, 10, 10, BLACK);
  p.px(3, 3, MID);
  p.px(13, 2, MID);
  p.outline(BLACK);
  return p;
}

export function lockedDoor(kind: 'cellar' | 'closet' | 'master'): PC {
  const p = new PC(16, 16);
  p.rect(1, 0, 14, 16, kind === 'master' ? DARK : MID);
  p.frame(1, 0, 14, 16, BLACK);
  p.rect(2, 1, 12, 1, LIGHT);
  if (kind === 'closet') drawText(p, 3, 4, '', BLACK);
  if (kind === 'cellar') {
    p.rect(3, 3, 10, 4, LIGHT);
    p.line(4, 5, 11, 5, DARK);
  }
  if (kind === 'master') {
    skull(p, 8, 5, 3, MID, false);
  }
  // padlock
  p.rect(9, 9, 5, 4, LIGHT);
  p.ring(11, 8, 1, 1, LIGHT);
  p.px(11, 10, BLACK);
  p.outline(BLACK);
  return p;
}

export function shelfGap(): PC {
  const p = new PC(16, 32);
  p.rect(0, 0, 16, 32, DARK);
  for (const y of [1, 9, 17, 25]) {
    for (let x = 1; x < 15; x += 2) if (!(y === 9 && x >= 5 && x <= 9)) p.rect(x, y, 1, 6, x % 4 ? MID : LIGHT);
    p.rect(0, y + 6, 16, 1, BLACK);
  }
  p.rect(5, 9, 5, 6, BLACK); // the gap where a book belongs
  p.frame(0, 0, 16, 32, BLACK);
  return p;
}

export function pedestal(withKey: boolean): PC {
  const p = new PC(16, 16);
  p.rect(4, 7, 8, 9, MID);
  p.rect(3, 6, 10, 2, LIGHT);
  p.rect(3, 14, 10, 2, DARK);
  if (withKey) {
    p.ring(6, 3, 2, 2, WHITE);
    p.rect(8, 3, 5, 1, WHITE);
    p.px(12, 4, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** The office key, half-sunk in the mud at the bottom of the well. */
export function wellKey(): PC {
  const p = new PC(16, 16);
  p.ellipse(8, 12, 6, 2, DARK); // the mud it is lying in
  p.ring(5, 9, 2, 2, WHITE);
  p.rect(7, 9, 6, 1, WHITE);
  p.px(11, 10, WHITE);
  p.px(13, 10, WHITE);
  p.outline(BLACK);
  // a little glint
  p.px(12, 5, WHITE);
  p.px(11, 6, LIGHT);
  p.px(13, 6, LIGHT);
  p.px(12, 7, LIGHT);
  p.px(12, 4, LIGHT);
  return p;
}

export function baitBucket(): PC {
  const p = new PC(16, 16);
  p.poly(
    [
      [3, 6],
      [13, 6],
      [11, 15],
      [5, 15],
    ],
    MID
  );
  p.ellipse(8, 6, 5, 2, BLACK);
  for (const [x, y] of [
    [6, 5],
    [8, 4],
    [10, 6],
  ])
    p.line(x, y, x + 1, y - 2, LIGHT); // wriggling
  p.ring(8, 3, 5, 3, LIGHT);
  drawText(p, 6, 9, '', DARK);
  p.outline(BLACK);
  return p;
}
