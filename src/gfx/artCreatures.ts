import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';

// The five champions. Every sprite is 48x48, bottom-centred, facing right.
// Frames 0-3: idle loop. Frame 4: action pose. Frame 5: hurt pose.

export const CREATURE_FRAMES = 6;

const S = 48;

function eye(p: PC, x: number, y: number, w = 3, h = 4, glint = true) {
  p.ellipse(x, y, Math.floor(w / 2), Math.floor(h / 2), BLACK);
  if (glint) p.px(x - 1 + (w > 3 ? 1 : 0), y - 1, WHITE);
}

// ------------------------------------------------------------------ BOOHEET

function booheet(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -2 : pose === 5 ? 1 : [0, -1, -2, -1][ph];
  const lean = pose === 4 ? 3 : pose === 5 ? -2 : 0;
  const cx = 23;
  const top = 9 + bob;
  // tiny feet first so the sheet overlaps them
  p.ellipse(cx - 5 + lean, 44, 2, 1, DARK);
  p.ellipse(cx + 5 + lean, 44, 2, 1, DARK);
  // head dome
  p.ellipse(cx + Math.round(lean / 2), top + 11, 12, 11, WHITE);
  // flaring sheet
  p.poly(
    [
      [cx - 12 + lean / 2, top + 10],
      [cx + 12 + lean / 2, top + 10],
      [cx + 16 + lean, top + 31],
      [cx - 16 + lean, top + 31],
    ],
    WHITE
  );
  // little arms lifting the sheet
  p.ellipse(cx - 14 + lean, top + 22, 3, 3, WHITE);
  p.ellipse(cx + 14 + lean, top + 20 - (pose === 4 ? 4 : 0), 3, 3, WHITE);
  // wavy hem
  for (let x = cx - 16 + lean; x <= cx + 16 + lean; x++) {
    const wy = top + 32 + Math.round(Math.sin(x * 0.75 + ph * 1.6) * 1.6 + 1);
    for (let y = top + 28; y <= wy; y++) p.px(x, y, WHITE);
  }
  // soft shading: light from upper-left
  p.shade((x, y) => {
    const nx = (x - cx - lean / 2) / 15;
    const ny = (y - top) / 36;
    return 1.02 - Math.max(0, nx) * 0.75 - Math.max(0, ny - 0.55) * 0.9;
  }, [MID, LIGHT, WHITE]);
  // folds
  for (const fx of [-10, -4, 3, 9]) {
    for (let y = top + 21 + (Math.abs(fx) % 3); y < top + 34; y++) {
      const x = cx + fx + lean + (y % 5 === 0 ? 1 : 0);
      if (p.get(x, y) >= 0) p.px(x, y, fx > 0 ? MID : LIGHT);
    }
  }
  // eyes peering out (toward the boss)
  const ex = cx + 2 + Math.round(lean / 2);
  if (pose === 5) {
    // squeezed shut
    p.line(ex - 1, top + 10, ex + 2, top + 11, BLACK);
    p.line(ex + 6, top + 11, ex + 9, top + 10, BLACK);
  } else {
    const big = pose === 4 ? 1 : 0;
    eye(p, ex, top + 10, 3, 5 + big * 2);
    eye(p, ex + 8, top + 10, 3, 5 + big * 2);
  }
  if (pose === 4) p.ellipse(ex + 4, top + 17, 2, 2, BLACK); // wailing mouth
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ SHIPWRAITH

function shipwraith(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 1 : [0, -1, -1, 0][ph];
  const tilt = pose === 4 ? -2 : 0; // recoil when firing
  const by = 31 + bob;
  const rng = artRng(77);
  // spectral wake / tail
  for (let i = 0; i < 12; i++) {
    const y = by + 8 + i;
    if (y >= S - 1) break;
    const w = Math.max(1, 13 - i);
    const x0 = 24 + Math.round(Math.sin(i * 0.7 + ph * 1.5) * 2);
    for (let x = x0 - w; x <= x0 + w; x++) if ((x + y + ph) % (i < 5 ? 2 : 3) === 0) p.px(x, y, i < 4 ? LIGHT : MID);
  }
  // hull, bow on the right
  const hull: Pt[] = [
    [6, by - 1],
    [15, by - 1],
    [15, by + 1 + tilt / 2],
    [35, by + tilt],
    [44, by - 4 + tilt],
    [41, by + 8],
    [13, by + 9],
    [7, by + 5],
  ];
  p.poly(hull, DARK);
  p.rect(6, by - 7, 10, 7, DARK); // stern castle
  p.rect(7, by - 9, 8, 2, MID);
  p.shade((x, y) => (y < by + 1 ? 0.72 : y < by + 5 ? 0.45 : 0.18), [BLACK, DARK, MID]);
  for (let x = 8; x < 42; x += 6) p.line(x, by + 2, x + 2, by + 2, BLACK);
  for (let x = 11; x < 40; x += 7) p.line(x, by + 6, x + 3, by + 6, BLACK);
  // glowing portholes
  for (const x of [19, 26, 33]) {
    p.circle(x, by + 4, 1, WHITE);
  }
  p.px(10, by - 4, WHITE);
  p.px(12, by - 4, WHITE);
  // barnacles
  for (let i = 0; i < 6; i++) p.px(10 + Math.floor(rng() * 30), by + 7 + Math.floor(rng() * 2), LIGHT);
  // mast + yard
  p.rect(24, by - 27, 2, 27, MID);
  p.rect(16, by - 23, 18, 1, MID);
  // ghost-face sail
  const sway = pose === 4 ? -1 : Math.round(Math.sin(ph * 1.57));
  const sail: Pt[] = [
    [16, by - 22],
    [34, by - 22],
    [36 + sway, by - 14],
    [35 + sway, by - 6],
    [15, by - 6],
    [14 + sway, by - 14],
  ];
  p.poly(sail, LIGHT);
  p.shade((x, y) => (x > 30 + sway ? 0.4 : 0.85), [MID, LIGHT, WHITE]);
  // ragged hem + holes
  for (let x = 14; x <= 36; x++) if (rng() < 0.5) p.px(x, by - 6, -1);
  for (let x = 14; x <= 36; x += 3) if (rng() < 0.6) p.px(x, by - 7, -1);
  p.px(18, by - 10, -1);
  p.px(31, by - 18, -1);
  // the drowned sailor's face in the sail
  eye(p, 22, by - 15, 3, 4);
  eye(p, 29, by - 15, 3, 4);
  p.line(21, by - 10, 30, by - 10, BLACK);
  for (let x = 22; x < 30; x += 2) p.px(x, by - 11, BLACK);
  // tattered pennant
  const fl = ph % 2;
  p.poly(
    [
      [25, by - 27],
      [31, by - 26 + fl],
      [28, by - 25],
      [32, by - 24 - fl],
      [25, by - 23],
    ],
    DARK
  );
  // bowsprit + cannon
  p.line(44, by - 4 + tilt, 47, by - 7 + tilt, MID);
  p.rect(38, by + 1, 5, 2, BLACK);
  if (pose === 4) {
    p.px(44, by + 1, WHITE);
    p.px(45, by + 2, LIGHT);
  }
  // dripping seaweed
  for (const x of [14, 22, 30, 37]) p.line(x, by + 9, x + (ph % 2), by + 11 + (x % 3), MID);
  p.outline(BLACK);
  if (pose === 5) p.remap((c, x, y) => (c === WHITE && (x + y) % 2 ? LIGHT : c));
  return p;
}

// ------------------------------------------------------------------ HAUNTCORN

function hauntcorn(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const sway = pose === 4 ? -3 : pose === 5 ? 2 : [0, 1, 0, -1][ph];
  const cx = 24;
  // pole
  p.rect(cx - 1, 26, 3, 22, DARK);
  p.px(cx - 1, 47, MID);
  // arm stick
  const ay = 24 + (pose === 4 ? -3 : 0);
  p.line(7, ay + sway, 41, ay - sway, MID);
  p.line(7, ay + 1 + sway, 41, ay + 1 - sway, DARK);
  // straw fans at both hands
  const fan = (hx: number, hy: number, dir: number) => {
    for (let k = -3; k <= 3; k++) {
      const len = 5 + (k % 2 === 0 ? 2 : 0) + (pose === 4 && dir > 0 ? 4 : 0);
      p.line(hx, hy, hx + dir * len, hy + k * 1.6, k % 2 === 0 ? LIGHT : MID);
    }
  };
  fan(7, ay + sway, -1);
  fan(41, ay - sway, 1);
  // ragged shirt
  p.poly(
    [
      [15, 20],
      [33, 20],
      [37, 37],
      [32, 35],
      [28, 39],
      [23, 35],
      [18, 39],
      [11, 37],
    ],
    DARK
  );
  p.shade((x, y) => (x < 20 ? 0.7 : x > 30 ? 0.25 : 0.5), [BLACK, DARK, MID]);
  // patch + stitches
  p.rect(26, 27, 5, 5, MID);
  p.dither(26, 27, 5, 5, LIGHT, 0.3);
  p.line(26, 26, 31, 26, BLACK);
  for (let y = 27; y < 32; y += 2) p.px(25, y, LIGHT);
  // rope belt + buttons
  p.line(13, 31, 35, 31, LIGHT);
  p.px(23, 24, LIGHT);
  p.px(23, 28, LIGHT);
  // straw poking from collar and hem
  for (const [x, y, d] of [
    [17, 20, -1],
    [31, 20, 1],
    [14, 37, -1],
    [34, 37, 1],
    [24, 37, 0],
  ] as const)
    p.line(x, y, x + d * 2, y + (y > 30 ? 3 : -2), LIGHT);
  // pumpkin head
  const hx = cx + (pose === 4 ? 1 : 0);
  const hy = 13 + (pose === 5 ? 1 : 0);
  p.sphere(hx, hy, 10, 8, [DARK, MID, LIGHT]);
  for (const rx of [-6, -2, 3, 7]) {
    for (let y = -7; y <= 7; y++) {
      const x = hx + Math.round(rx * Math.sqrt(1 - (y / 8.5) ** 2));
      if (p.get(x, hy + y) >= 0) p.px(x, hy + y, DARK);
    }
  }
  // stem + curl leaf
  p.rect(hx - 1, hy - 11, 3, 4, DARK);
  p.px(hx + 2, hy - 11, MID);
  p.line(hx + 2, hy - 10, hx + 5, hy - 12, MID);
  // carved, glowing face
  const glow = pose === 5 ? LIGHT : WHITE;
  const tri = (x: number, y: number, flip: boolean) => {
    p.poly(
      flip
        ? [
            [x - 3, y + 2],
            [x + 3, y + 2],
            [x, y - 2],
          ]
        : [
            [x - 3, y - 2],
            [x + 3, y - 2],
            [x, y + 2],
          ],
      BLACK
    );
    p.px(x, y, glow);
    p.px(x - 1, y + (flip ? 1 : -1), glow);
    p.px(x + 1, y + (flip ? 1 : -1), glow);
  };
  tri(hx - 2, hy - 2, pose === 4);
  tri(hx + 5, hy - 2, pose === 4);
  // jagged grin
  const my = hy + 4;
  p.rect(hx - 4, my - 1, 11, 3, BLACK);
  for (let x = hx - 3; x <= hx + 5; x++) p.px(x, my, glow);
  for (let x = hx - 3; x <= hx + 5; x += 2) p.px(x, my - 1, glow);
  if (pose === 4) for (let x = hx - 2; x <= hx + 4; x += 2) p.px(x, my + 1, glow);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ UMBRAWL

function umbrawl(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 2 : [0, -1, -2, -1][ph];
  const cx = 24;
  const cy = 19 + bob;
  if (pose === 4) {
    // folded closed: a spear of black canvas
    p.rect(cx - 1, cy - 2, 2, 23, MID);
    p.poly(
      [
        [cx, cy - 17],
        [cx + 5, cy + 5],
        [cx + 2, cy + 8],
        [cx - 2, cy + 8],
        [cx - 5, cy + 5],
      ],
      DARK
    );
    p.shade((x) => (x < cx ? 0.75 : 0.3), [BLACK, DARK, MID]);
    p.line(cx - 2, cy - 6, cx - 3, cy + 6, MID);
    p.line(cx + 1, cy - 8, cx + 2, cy + 6, BLACK);
    p.line(cx, cy - 22, cx, cy - 17, LIGHT);
    // band and fierce eye
    p.rect(cx - 4, cy + 1, 9, 1, LIGHT);
    p.ellipse(cx + 1, cy - 4, 2, 1, WHITE);
    p.px(cx + 2, cy - 4, BLACK);
    p.line(cx - 2, cy - 7, cx + 3, cy - 6, BLACK);
  } else {
    // shaft
    p.rect(cx - 1, cy, 2, 22, MID);
    p.px(cx - 1, cy + 4, LIGHT);
    // canopy dome with scalloped edge
    const R = 19;
    const H = 13;
    const flap = ph;
    for (let x = -R; x <= R; x++) {
      const topY = cy - Math.round(Math.sqrt(1 - (x / (R + 0.5)) ** 2) * H);
      const seg = (x + R) / ((2 * R) / 5);
      const scallop = Math.abs(Math.sin(seg * Math.PI));
      const botY = cy + 2 - Math.round(scallop * 3) + ((Math.floor(seg) + flap) % 2 === 0 ? 1 : 0);
      for (let y = topY; y <= botY; y++) p.px(cx + x, y, DARK);
    }
    p.shade((x, y) => {
      const nx = (x - cx) / R;
      const ny = (y - (cy - H)) / H;
      return 0.75 - nx * 0.5 - Math.max(0, ny - 0.6) * 0.6;
    }, [BLACK, DARK, MID, LIGHT]);
    // ribs
    for (let k = 0; k <= 5; k++) {
      const rx = cx - R + k * ((2 * R) / 5);
      p.line(cx, cy - H, rx, cy + 1, k < 3 ? MID : BLACK);
    }
    // torn holes
    p.px(cx - 12, cy - 2, -1);
    p.px(cx - 11, cy - 1, -1);
    p.px(cx + 14, cy - 3, -1);
    // tip
    p.line(cx, cy - H - 5, cx, cy - H, LIGHT);
    p.px(cx, cy - H - 6, WHITE);
    // the one hungry eye
    const ex = cx + 4;
    const ey = cy - 6;
    p.ellipse(ex, ey, 4, 2, pose === 5 ? LIGHT : WHITE);
    p.rect(ex + 1, ey - 1, 2, 3, BLACK);
    p.px(ex + 1, ey - 1, WHITE);
    p.line(ex - 4, ey - 4, ex + 4, ey - 2, BLACK);
  }
  // J handle
  const hy = cy + 22;
  p.rect(cx - 1, hy - 1, 2, 3, DARK);
  p.line(cx - 1, hy + 2, cx - 4, hy + 4, DARK);
  p.line(cx - 1, hy + 3, cx - 4, hy + 5, MID);
  p.line(cx - 5, hy + 3, cx - 6, hy + 1, DARK);
  p.px(cx - 6, hy, LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ TICKRAITH

function tickraith(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const cx = 24;
  const lean = pose === 4 ? 1 : 0;
  // bonnet / hood with finials
  p.poly(
    [
      [12, 11],
      [36, 11],
      [35, 7],
      [29, 3],
      [24, 2],
      [19, 3],
      [13, 7],
    ],
    DARK
  );
  p.circle(13, 6, 1, LIGHT);
  p.circle(35, 6, 1, LIGHT);
  p.circle(24, 1, 1, LIGHT);
  // cabinet
  p.rect(14, 11, 21, 31, DARK);
  p.rect(14, 11, 2, 31, MID);
  p.rect(33, 11, 2, 31, BLACK);
  p.rect(12, 41, 25, 4, DARK);
  p.rect(12, 41, 25, 1, MID);
  p.shade((x, y) => (x < 20 ? 0.72 : x > 30 ? 0.25 : 0.5), [BLACK, DARK, MID]);
  // wood grain
  for (const [x, y] of [
    [18, 13],
    [31, 16],
    [19, 38],
    [30, 37],
  ])
    p.line(x, y, x, y + 2, BLACK);
  // feet
  p.rect(12, 45, 4, 3, DARK);
  p.rect(33, 45, 4, 3, DARK);
  // dial
  const dx = cx + lean;
  const dy = 15;
  p.circle(dx, dy, 7, LIGHT);
  p.circle(dx, dy, 6, WHITE);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.px(dx + Math.round(Math.cos(a) * 6), dy + Math.round(Math.sin(a) * 6), k % 3 === 0 ? BLACK : MID);
  }
  // furious eyes on the dial
  if (pose === 5) {
    p.line(dx - 4, dy - 2, dx - 2, dy - 2, BLACK);
    p.line(dx + 2, dy - 2, dx + 4, dy - 2, BLACK);
  } else {
    p.rect(dx - 4, dy - 3, 2, 2, BLACK);
    p.rect(dx + 2, dy - 3, 2, 2, BLACK);
    p.line(dx - 5, dy - 5, dx - 2, dy - 4, BLACK);
    p.line(dx + 5, dy - 5, dx + 2, dy - 4, BLACK);
  }
  // hands spin backwards
  const a1 = -Math.PI / 2 - ph * (Math.PI / 2) - (pose === 4 ? Math.PI : 0);
  const a2 = -Math.PI / 2 - ph * (Math.PI / 8);
  p.line(dx, dy + 1, dx + Math.round(Math.cos(a1) * 4), dy + 1 + Math.round(Math.sin(a1) * 4), BLACK);
  p.line(dx, dy + 1, dx + Math.round(Math.cos(a2) * 3), dy + 1 + Math.round(Math.sin(a2) * 3), DARK);
  p.px(dx, dy + 1, BLACK);
  // pendulum window
  p.rect(18, 25, 13, 14, BLACK);
  p.line(19, 37, 22, 26, DARK);
  const sw = pose === 4 ? 0.7 : Math.sin(ph * (Math.PI / 2)) * 0.38;
  const bx = 24 + Math.round(Math.sin(sw) * 9);
  const byy = 26 + Math.round(Math.cos(sw) * 9);
  p.line(24, 26, bx, byy, MID);
  p.circle(bx, byy, 2, LIGHT);
  p.px(bx - 1, byy - 1, WHITE);
  p.rect(17, 24, 15, 1, MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ UMBRAWL'S FISTS

// Front-facing fists: knuckles up, fingers curled, thumb across the front,
// and no wrist - it dissolves into a ghostly wisp.
const FIST_CLOSED = [
  '.00.00.00.00.',
  '0340340340330',
  '0330330330320',
  '0320320320220',
  '0222222222220',
  '0300000000210',
  '0034443330210',
  '0222222222210',
  '.02222222210.',
  '..000000000..',
  '...2.1.2.1...',
];
const FIST_OPEN = [
  '.00.00.00.00.',
  '0340340340330',
  '0330330330320',
  '0330330330320',
  '0320320320220',
  '0222222222220',
  '0322222222210',
  '0322222222210',
  '.02222222210.',
  '..000000000..',
  '...2.1.2.1...',
];

/** One of Umbrawl's two floating fists. f: 0 = clenched, 1 = punching (speed lines), 2 = open hand. */
export function fist(f: number): PC {
  const p = new PC(16, 12);
  p.stamp(f === 2 ? FIST_OPEN : FIST_CLOSED, 3, 0);
  if (f === 1) {
    p.line(0, 2, 1, 2, LIGHT);
    p.line(0, 5, 1, 5, WHITE);
    p.line(0, 8, 1, 8, LIGHT);
  }
  return p;
}

/** Fist placement around Umbrawl in its 48x48 frame (centres), per frame index. */
export const FIST_SPOTS = (f: number): { l: [number, number]; r: [number, number] } => {
  const ph = f % 4;
  const bob = f === 5 ? 2 : [0, -1, -2, -1][ph];
  const cy = 19 + bob;
  if (f === 4) return { l: [11, cy + 6], r: [36, cy + 2] }; // wound up to strike
  if (f === 5) return { l: [8, cy + 17], r: [39, cy + 15] }; // knocked back
  const lb = [1, 0, -1, 0][ph];
  const rb = [0, -1, 0, 1][ph];
  return { l: [11, cy + 16 + lb], r: [37, cy + 14 + rb] };
};

function withFists(body: PC, f: number): PC {
  const p = body.copy();
  const { l, r } = FIST_SPOTS(f);
  const pose = f === 4 ? 1 : 0;
  p.blit(fist(pose), l[0] - 9, l[1] - 6);
  p.blit(fist(pose), r[0] - 9, r[1] - 6);
  return p;
}

const DRAW: Record<string, (f: number) => PC> = { booheet, shipwraith, hauntcorn, umbrawl, tickraith };

/** Full character frames (menus and portraits). Umbrawl includes its fists. */
export function creatureFrames(id: string): PC[] {
  const d = DRAW[id];
  return Array.from({ length: CREATURE_FRAMES }, (_, i) => (id === 'umbrawl' ? withFists(d(i), i) : d(i)));
}

/** Umbrawl's umbrella alone: in battle its fists are separate sprites that move freely. */
export function umbrawlBodyFrames(): PC[] {
  return Array.from({ length: CREATURE_FRAMES }, (_, i) => umbrawl(i));
}
