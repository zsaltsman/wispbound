import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';
import { building, window16, door16 } from './artProps';
import { bigText } from './artTitans';

// World 3: Bacchus Key. Club Forever, the Great Barrel, the shops and hotels of
// the strip, party decorations, and the furniture of the club, the clinic, the
// art shop, Ayla's cave and Milo's hideout. All in the same four greys.

/** A sign plate with centred text. */
function sign(p: PC, x: number, y: number, w: number, text: string, inv = false, scale = 1) {
  const h = scale === 1 ? 11 : 9 * scale + 4;
  p.rect(x, y, w, h, BLACK);
  p.rect(x + 1, y + 1, w - 2, h - 2, inv ? WHITE : DARK);
  const tw = text.length * 6 * scale;
  if (scale === 1) drawText(p, x + Math.floor((w - tw) / 2) + 1, y + 2, text, inv ? BLACK : WHITE, 1);
  else bigText(p, x + Math.floor((w - tw) / 2) + 1, y + 2, text, scale, inv ? BLACK : WHITE);
}

/** A striped shop awning across the top of the wall. */
function awning(p: PC, y: number, x0 = 0, x1 = p.w) {
  for (let x = x0; x < x1; x++) p.rect(x, y, 1, 7, Math.floor((x - x0) / 6) % 2 ? WHITE : MID);
  for (let x = x0; x < x1; x += 6) p.ellipse(x + 3, y + 7, 3, 1, Math.floor((x - x0) / 6) % 2 ? WHITE : MID);
  p.rect(x0, y, x1 - x0, 1, BLACK);
}

/** String lights strung across a facade. */
function bulbs(p: PC, y: number, x0 = 0, x1 = p.w, sag = 3) {
  for (let x = x0; x < x1; x++) {
    const yy = y + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI * 3) * sag);
    p.px(x, yy, DARK);
    if ((x - x0) % 6 === 3) {
      p.px(x, yy + 1, WHITE);
      p.px(x, yy + 2, LIGHT);
    }
  }
}

export type Theme = 'art' | 'buffet' | 'lobster' | 'cafe' | 'donut' | 'froyo' | 'karaoke' | 'arcade' | 'souvenir' | 'costume' | 'diner' | 'house' | 'hotel' | 'club_annex';

/**
 * A shop on the strip: the shared building, a lit sign, an awning, and a little
 * picture of what it sells. `closed` boards it up with a FOR SALE sign.
 */
export function shopfront(w: number, h: number, name: string, theme: Theme, door: number, seed: number, closed = false): PC {
  const siding = theme === 'lobster' || theme === 'diner' ? 'wood' : theme === 'art' || theme === 'cafe' ? 'brick' : 'plaster';
  const p = building({ w, h, roofRows: 2, roof: theme === 'house' ? 'gable' : 'flat', siding, doors: [door], windows: [{ x: door > 1 ? door - 2 : door + 2, lit: !closed }, ...(w > 6 ? [{ x: door < w - 3 ? door + 2 : 1, lit: !closed }] : [])], seed });
  const W = w * 16;
  if (theme !== 'house') {
    sign(p, 6, 3, W - 12, name);
    if (!closed) awning(p, 30, 4, W - 4);
  }
  const cx = door * 16 + 8;
  const pic = (fn: () => void) => fn();
  switch (theme) {
    case 'art':
      pic(() => {
        // an easel by the door, a palette on the sign
        const ex = cx + 22;
        p.line(ex, 52, ex - 5, 78, DARK);
        p.line(ex, 52, ex + 5, 78, DARK);
        p.rect(ex - 7, 50, 14, 12, WHITE);
        p.circle(ex - 2, 55, 2, MID);
        p.line(ex - 4, 59, ex + 4, 53, DARK);
        p.ellipse(14, 8, 4, 3, LIGHT);
        for (const [x, y] of [[13, 7], [15, 9], [16, 7]]) p.px(x, y, BLACK);
      });
      break;
    case 'buffet':
      pic(() => {
        // a cheerful pig in a chef's hat on the sign, steam from a tray
        p.circle(W - 18, 8, 4, LIGHT);
        p.px(W - 19, 8, BLACK);
        p.px(W - 17, 8, BLACK);
        p.rect(W - 21, 2, 7, 3, WHITE);
        for (let i = 0; i < 3; i++) p.line(cx - 20 + i * 6, 46, cx - 22 + i * 6, 40, LIGHT);
      });
      break;
    case 'lobster':
      pic(() => {
        p.ellipse(W - 16, 8, 5, 3, WHITE);
        p.line(W - 21, 6, W - 24, 3, WHITE);
        p.line(W - 11, 6, W - 8, 3, WHITE);
        p.rect(4, 44, 12, 10, DARK); // a net hung by the door
        for (let x = 4; x < 16; x += 3) p.line(x, 44, x + 3, 54, LIGHT);
      });
      break;
    case 'cafe':
      pic(() => {
        // a paw print and a little cup
        p.circle(14, 9, 2, WHITE);
        for (const x of [11, 14, 17]) p.px(x, 5, WHITE);
        p.rect(W - 20, 6, 6, 5, WHITE);
        p.ring(W - 13, 8, 1, 2, WHITE);
      });
      break;
    case 'donut':
      pic(() => {
        // a giant donut on the roof
        p.ring(W / 2, -0 + 10, 12, 7, BLACK);
        p.ellipse(W / 2, 8, 11, 6, LIGHT);
        p.ellipse(W / 2, 8, 4, 2, BLACK);
        for (const [x, y] of [[-6, -2], [4, -3], [7, 2], [-4, 3]]) p.px(W / 2 + x, 8 + y, WHITE);
        sign(p, 6, 18, W - 12, name);
      });
      break;
    case 'froyo':
      pic(() => {
        // a soft-serve swirl on the roof
        p.poly([[W / 2 - 6, 14], [W / 2 + 6, 14], [W / 2, 26]], MID);
        p.ellipse(W / 2, 12, 7, 3, WHITE);
        p.ellipse(W / 2, 8, 5, 3, WHITE);
        p.ellipse(W / 2, 4, 3, 2, WHITE);
        sign(p, 6, 18, W - 12, name);
      });
      break;
    case 'karaoke':
      pic(() => {
        p.rect(W - 16, 4, 3, 6, WHITE);
        p.line(W - 15, 10, W - 15, 14, LIGHT);
        for (let i = 0; i < 3; i++) p.px(W - 10 + i * 2, 4 + (i % 2) * 2, WHITE);
      });
      break;
    case 'arcade':
      pic(() => {
        for (let x = 6; x < W - 6; x += 4) p.px(x, 16, (x / 4) % 2 ? WHITE : LIGHT);
        p.circle(14, 8, 2, WHITE);
      });
      break;
    case 'souvenir':
      pic(() => {
        p.rect(cx + 18, 50, 10, 14, WHITE); // a rack of postcards
        for (let y = 52; y < 64; y += 4) p.rect(cx + 19, y, 8, 1, MID);
      });
      break;
    case 'costume':
      pic(() => {
        p.circle(14, 8, 3, WHITE); // a mask on the sign
        p.px(13, 7, BLACK);
        p.px(15, 7, BLACK);
      });
      break;
    case 'diner':
      pic(() => {
        p.rect(4, 22, W - 8, 3, WHITE);
        drawText(p, W - 34, 46, 'OPEN', WHITE, 0);
        drawText(p, W - 34, 54, '24H', LIGHT, 0);
      });
      break;
    case 'hotel':
      pic(() => {
        for (let y = 36; y < h * 16 - 30; y += 14) for (let x = 6; x < W - 6; x += 16) window16(p, x, y, { x: 0, lit: ((x + y) / 2) % 3 !== 0 });
      });
      break;
  }
  if (closed) {
    // boarded up, a FOR SALE board leaning in the window
    for (const x of [cx - 24, cx + 8]) for (let y = 40; y < 64; y += 5) p.rect(x, y, 16, 3, MID);
    p.rect(cx - 10, 42, 20, 12, WHITE);
    drawText(p, cx - 9, 44, 'FOR', BLACK, 0);
    drawText(p, cx - 9, 50, 'SALE', BLACK, 0);
  }
  if (theme !== 'house') bulbs(p, 26, 0, W, 2);
  p.outline(BLACK);
  return p;
}

/** Club Forever (28x15 tiles): the hotel above, the clinic wing, the sign on the roof. */
export function clubFront(wrecked: boolean): PC {
  const W = 28 * 16;
  const H = 15 * 16;
  const p = new PC(W, H);
  const r = artRng(wrecked ? 91 : 90);
  // the hotel tower behind
  p.rect(48, 0, W - 96, 70, DARK);
  for (let y = 8; y < 64; y += 14) for (let x = 60; x < W - 60; x += 18) {
    p.circle(x, y, 4, BLACK);
    p.circle(x, y, 3, r() < 0.7 ? LIGHT : MID);
  }
  // the main block
  p.rect(0, 64, W, H - 64, BLACK);
  p.rect(2, 66, W - 4, H - 68, DARK);
  for (let x = 8; x < W; x += 10) p.rect(x, 70, 2, H - 74, BLACK);
  // the sign on the roof line
  p.rect(70, 40, W - 140, 34, BLACK);
  p.frame(70, 40, W - 140, 34, LIGHT);
  for (let x = 74; x < W - 70; x += 6) {
    p.px(x, 42, WHITE);
    p.px(x, 71, WHITE);
  }
  bigText(p, Math.floor(W / 2) - 72, 46, 'CLUB FOREVER', 2, WHITE);
  drawText(p, Math.floor(W / 2) - 33, 64, 'EST. ALWAYS', LIGHT, 1);
  // the marquee over the doors
  const dx = W / 2 - 32;
  p.rect(dx - 10, 168, 84, 12, LIGHT);
  for (let x = dx - 8; x < dx + 72; x += 4) p.px(x, 172, WHITE);
  drawText(p, dx + 2, 170, 'TONIGHT: EVERYTHING', BLACK, 0);
  // double doors, a spill of light, the velvet rope
  p.rect(dx + 8, 184, 48, H - 184, BLACK);
  p.rect(dx + 10, 186, 20, H - 186, MID);
  p.rect(dx + 34, 186, 20, H - 186, MID);
  p.dither(dx + 10, 186, 44, H - 186, LIGHT, 0.3);
  // the hotel entrance (left) and the clinic (right wing)
  sign(p, 16, 96, 56, 'HOTEL', true);
  p.rect(28, 184, 32, H - 184, BLACK);
  p.rect(30, 186, 28, H - 186, LIGHT);
  p.dither(30, 186, 28, H - 186, WHITE, 0.3);
  sign(p, W - 72, 96, 56, 'CLINIC', true);
  p.rect(W - 54, 104, 4, 12, BLACK); // a cross on the sign is behind the text; a second one big
  p.rect(W - 46, 128, 14, 4, WHITE);
  p.rect(W - 41, 123, 4, 14, WHITE);
  // big round club windows with dancers in them
  for (const x of [110, 150, W - 150, W - 110]) {
    p.circle(x, 132, 12, BLACK);
    p.circle(x, 132, 10, LIGHT);
    p.dither(x - 10, 122, 20, 20, WHITE, 0.3, true);
    p.rect(x - 3, 130, 2, 8, DARK);
    p.rect(x + 2, 128, 2, 10, DARK);
  }
  bulbs(p, 82, 0, W, 4);
  bulbs(p, 158, 0, W, 2);
  if (wrecked) {
    // a ragged hole punched right through the front
    const hx = W / 2 + 90;
    p.ellipse(hx, 150, 44, 40, BLACK);
    p.ellipse(hx, 154, 34, 30, DARK);
    for (let i = 0; i < 30; i++) p.px(hx - 30 + Math.floor(r() * 60), 130 + Math.floor(r() * 40), r() < 0.5 ? WHITE : LIGHT);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.thick(hx + Math.cos(a) * 36, 150 + Math.sin(a) * 34, hx + Math.cos(a) * 50, 150 + Math.sin(a) * 46, MID, 2);
    }
    p.line(W - 80, 40, W - 60, 60, BLACK);
  }
  p.outline(BLACK);
  return p;
}

/** The Great Barrel (8x13 tiles), tap and all. `broken`: burst wide open. */
export function greatBarrel(broken: boolean): PC {
  const W = 8 * 16;
  const H = 13 * 16;
  const p = new PC(W, H);
  if (!broken) {
    p.ellipse(W / 2, 16, W / 2 - 2, 12, MID);
    p.rect(2, 16, W - 4, H - 30, MID);
    p.ellipse(W / 2, H - 14, W / 2 - 2, 10, MID);
    for (let x = 10; x < W - 4; x += 12) p.line(x, 20, x, H - 12, DARK);
    p.shade((x, y) => (p.get(x, y) === MID ? 1.2 - x / W : null), [DARK, MID, LIGHT]);
    for (const y of [36, 90, 150]) {
      p.rect(0, y, W, 8, DARK);
      p.rect(0, y, W, 2, LIGHT);
    }
    p.ellipse(W / 2, 16, W / 2 - 8, 7, DARK);
    sign(p, 18, 104, W - 36, 'THE GREAT', true);
    sign(p, 24, 118, W - 48, 'BARREL', true);
    // the tap, low on the front, a drip forming
    p.rect(W / 2 - 4, H - 46, 8, 6, LIGHT);
    p.rect(W / 2 - 2, H - 40, 4, 8, MID);
    p.px(W / 2, H - 30, WHITE);
    p.outline(BLACK);
    return p;
  }
  // ---- the wreck: a jagged stump of splayed staves standing in its own spilt booze,
  // the top caved in and lying in pieces round it, the hoops fallen, the lid tipped over
  const r = artRng(33);
  const G = H - 12; // ground line
  // the spill: a wide shallow pool, glinting
  p.ellipse(W / 2, G, W / 2 - 1, 11, LIGHT);
  p.dither(4, G - 10, W - 8, 20, MID, 0.25, true);
  for (let i = 0; i < 18; i++) p.px(8 + r() * (W - 16), G - 8 + r() * 16, WHITE);
  // the dark inside of the stump, seen over the front staves
  p.ellipse(W / 2, G - 46, 46, 12, BLACK);
  p.rect(W / 2 - 46, G - 46, 92, 40, BLACK);
  // staves: back row first (inner wall), then the front row splayed outward
  const staves = 9;
  for (let i = 0; i < staves; i++) {
    const t = i / (staves - 1) - 0.5; // -0.5 .. 0.5
    const bx = W / 2 + t * 88;
    const lean = t * 26 + (r() - 0.5) * 4;
    const top = G - 34 - Math.floor(r() * 46) - (Math.abs(t) < 0.2 ? 0 : 6);
    const w2 = 6;
    const pts: [number, number][] = [
      [bx - w2, G],
      [bx + w2, G],
      [bx + w2 + lean, top + 3 + Math.floor(r() * 5)],
      [bx + lean + 1, top],
      [bx - w2 + lean, top + 5 + Math.floor(r() * 6)],
    ];
    p.poly(pts, i % 2 ? MID : LIGHT);
    p.line(bx + lean * 0.5, G - 2, bx + lean, top + 6, DARK); // the grain
    p.px(bx + lean + 1, top, WHITE); // a splinter tip
    p.px(bx + lean - 2, top + 3, WHITE);
  }
  p.shade((x, y) => (p.get(x, y) === MID || p.get(x, y) === LIGHT ? 1.25 - x / W + (y > G - 20 ? -0.15 : 0) : null), [DARK, MID, LIGHT]);
  // the one hoop still on, bent where it was hit, and one dropped to the ground
  for (let x = 14; x < W - 14; x++) {
    const y = G - 24 + Math.round(Math.sin((x / W) * Math.PI) * 5) + (x > W * 0.7 ? Math.round((x - W * 0.7) * 0.35) : 0);
    p.rect(x, y, 1, 5, DARK);
    p.px(x, y, LIGHT);
  }
  p.ring(26, G + 2, 20, 6, DARK);
  p.ring(26, G + 1, 20, 6, MID);
  // the lid, tipped over and leaning on the right of the stump
  p.ellipse(W - 22, G - 20, 14, 20, MID);
  for (let k = -12; k <= 12; k += 6) p.line(W - 22 + k * 0.4, G - 38, W - 22 + k * 0.4, G - 2, DARK);
  p.ring(W - 22, G - 20, 14, 20, DARK);
  // big curved planks from the top, lying across the spill
  for (const [x0, y0, x1, y1] of [
    [6, G - 4, 40, G - 22],
    [44, G + 6, 78, G - 2],
    [84, G + 8, 120, G + 2],
    [18, G + 8, 30, G - 12],
  ])
    p.thick(x0, y0, x1, y1, MID, 5), p.line(x0, y0, x1, y1, LIGHT);
  // what is left of the sign, face up in the booze
  sign(p, 40, G - 6, 44, 'BARREL', true);
  p.outline(BLACK);
  return p;
}

/** Cracks spreading over the Great Barrel (same size as the barrel; drawn on top).
 *  Level 1: the first blow, on the right side.  Level 2: split staves, a bulge, leaks. */
export function barrelCracks(level: 1 | 2): PC {
  const W = 8 * 16;
  const H = 13 * 16;
  const p = new PC(W, H);
  const r = artRng(40 + level);
  const crack = (x: number, y: number, steps: number, dx: number, dy: number) => {
    for (let i = 0; i < steps; i++) {
      const nx = x + dx * (3 + r() * 4) + (r() - 0.5) * 6;
      const ny = y + dy * (4 + r() * 5);
      p.line(x, y, nx, ny, BLACK);
      p.line(x + 1, y, nx + 1, ny, LIGHT);
      if (r() < 0.35) {
        const bx = nx + (r() - 0.5) * 14;
        p.line(nx, ny, bx, ny + (r() - 0.5) * 10, BLACK);
      }
      x = nx;
      y = ny;
    }
  };
  // the impact point, high on the right where the blades went in
  crack(104, 92, 6, -0.6, -1);
  crack(104, 96, 7, -0.3, 1);
  crack(108, 94, 3, 0.4, -0.6);
  if (level === 2) {
    crack(98, 60, 8, -0.5, 1);
    crack(80, 140, 6, -0.6, -1);
    crack(112, 150, 5, -0.2, 1);
    // a split down one stave, gaping
    p.poly([[96, 52], [102, 52], [104, 150], [98, 150]], BLACK);
    p.line(103, 52, 105, 150, WHITE);
    // a stave bulging out past the hoops
    p.thick(114, 70, 122, 120, LIGHT, 3);
    p.line(122, 70, 125, 120, BLACK);
    // booze running out of the cracks
    for (const [x, y, l] of [[100, 152, 30], [86, 144, 34], [110, 160, 26], [98, 100, 14]]) {
      p.rect(x, y, 2, l, WHITE);
      p.px(x, y + l + 1, WHITE);
    }
  }
  return p;
}

/** The top of the Great Barrel, broken off at a jagged line (for the collapse). */
export function barrelTop(): PC {
  const p = greatBarrel(false);
  const r = artRng(50);
  const cut: number[] = [];
  for (let x = 0; x < p.w; x++) cut.push(118 + Math.round(Math.sin(x * 0.5) * 3 + (x % 12 < 2 ? -6 : 0) + r() * 4));
  p.remap((c, x, y) => (y > cut[x] ? -1 : y > cut[x] - 2 ? WHITE : c));
  return p;
}

/** A broken stave flying off the barrel (8x30). */
export function barrelStave(): PC {
  const p = new PC(8, 30);
  p.poly([[1, 3], [6, 0], [7, 27], [4, 30], [1, 26]], MID);
  p.line(4, 2, 4, 26, DARK);
  p.line(2, 4, 2, 24, LIGHT);
  p.px(6, 0, WHITE);
  p.px(4, 29, WHITE);
  p.outline(BLACK);
  return p;
}

/** A palm tree in good health (32x48), for once. */
export function palm(seed: number): PC {
  const p = new PC(32, 48);
  const r = artRng(seed);
  const lean = Math.floor(r() * 5) - 2;
  for (let y = 16; y < 48; y++) p.rect(15 + Math.round(((48 - y) / 32) * lean), y, 3, 1, (y % 3 === 0 ? DARK : MID));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.3;
    for (let k = 0; k < 14; k++) {
      const x = 16 + lean + Math.cos(a) * k;
      const y = 14 + Math.sin(a) * k * 0.6 + (k * k) / 28;
      p.px(x, y, k % 3 === 0 ? LIGHT : MID);
      p.px(x, y + 1, DARK);
    }
  }
  p.circle(16 + lean, 16, 2, DARK);
  p.outline(BLACK);
  return p;
}

/** A street lamp hung with bunting (16x48). */
export function partyLamp(): PC {
  const p = new PC(16, 48);
  p.rect(7, 10, 2, 38, DARK);
  p.rect(5, 44, 6, 4, MID);
  p.rect(4, 4, 8, 7, LIGHT);
  p.rect(5, 5, 6, 5, WHITE);
  p.rect(3, 3, 10, 2, DARK);
  for (const [x, y] of [[1, 14], [12, 16], [2, 22]]) p.poly([[x, y], [x + 3, y], [x + 1, y + 4]], (x + y) % 2 ? WHITE : LIGHT);
  p.outline(BLACK);
  return p;
}

/** Bunting strung between two poles (64x16), drawn over everything. */
export function bunting(seed: number): PC {
  const p = new PC(64, 16);
  const r = artRng(seed);
  for (let x = 0; x < 64; x++) p.px(x, 2 + Math.round(Math.sin((x / 64) * Math.PI) * 5), DARK);
  for (let x = 2; x < 62; x += 6) {
    const y = 2 + Math.round(Math.sin((x / 64) * Math.PI) * 5);
    p.poly([[x, y], [x + 4, y], [x + 2, y + 5]], r() < 0.5 ? WHITE : LIGHT);
  }
  return p;
}

/** A bunch of balloons tied to a post (16x32). */
export function balloons(seed: number): PC {
  const p = new PC(16, 32);
  const r = artRng(seed);
  for (const [x, y] of [[5, 6], [10, 5], [8, 10]]) {
    p.line(x, y + 4, 8, 30, DARK);
    p.ellipse(x, y, 3, 4, r() < 0.5 ? WHITE : LIGHT);
    p.px(x - 1, y - 2, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** A small street stage for performers (48x32). */
export function streetStage(): PC {
  const p = new PC(48, 32);
  p.rect(0, 18, 48, 14, DARK);
  p.rect(0, 18, 48, 3, LIGHT);
  for (let x = 2; x < 48; x += 8) p.rect(x, 22, 1, 10, BLACK);
  p.rect(2, 0, 3, 18, MID);
  p.rect(43, 0, 3, 18, MID);
  p.rect(2, 0, 44, 4, WHITE);
  bulbs(p, 6, 4, 44, 1);
  p.outline(BLACK);
  return p;
}

/** The photo booth on the promenade (32x40). */
export function photoBooth(): PC {
  const p = new PC(32, 40);
  p.rect(2, 4, 28, 36, MID);
  p.rect(2, 4, 28, 3, LIGHT);
  sign(p, 3, 8, 26, 'FOTO', true);
  p.rect(6, 20, 20, 20, BLACK);
  for (let x = 7; x < 25; x += 3) p.rect(x, 20, 2, 20, DARK); // the curtain
  p.outline(BLACK);
  return p;
}

/** The mouth of Ayla's little cave in the cliffs (48x40). */
export function caveMouth(): PC {
  const p = new PC(48, 40);
  p.ellipse(24, 26, 24, 18, MID);
  p.shade((x, y) => (p.get(x, y) === MID ? 1.1 - y / 50 - Math.abs(x - 24) / 80 : null), [DARK, MID, LIGHT]);
  p.ellipse(24, 32, 12, 12, BLACK);
  p.rect(12, 32, 24, 8, BLACK);
  for (const [x, y] of [[8, 12], [36, 14], [20, 6]]) p.circle(x, y, 2, DARK);
  p.outline(BLACK);
  return p;
}

/** A big FOR SALE board stuck in the ground (16x24). */
export function forSale(): PC {
  const p = new PC(16, 24);
  p.rect(7, 12, 2, 12, DARK);
  p.rect(0, 2, 16, 12, WHITE);
  p.frame(0, 2, 16, 12, BLACK);
  drawText(p, 2, 3, 'FOR', BLACK, 0);
  drawText(p, 1, 8, 'SALE', BLACK, 0);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ interiors

/** The DJ booth on its stage (48x32). */
export function djBooth(): PC {
  const p = new PC(48, 32);
  p.rect(0, 14, 48, 18, BLACK);
  p.rect(2, 16, 44, 14, DARK);
  for (const x of [8, 32]) {
    p.ellipse(x + 4, 12, 7, 3, MID);
    p.ellipse(x + 4, 12, 2, 1, WHITE);
  }
  for (let x = 4; x < 44; x += 4) p.rect(x, 20, 2, 6, (x / 4) % 2 ? WHITE : LIGHT);
  p.outline(BLACK);
  return p;
}

/** A stack of speakers (16x32). */
export function speaker(): PC {
  const p = new PC(16, 32);
  p.rect(1, 2, 14, 30, BLACK);
  p.rect(2, 3, 12, 28, DARK);
  for (const [y, r] of [[10, 5], [24, 4]]) {
    p.circle(8, y, r, MID);
    p.circle(8, y, r - 2, BLACK);
    p.px(8, y, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** The mirror ball over the dance floor (16x24). */
export function discoBall(): PC {
  const p = new PC(16, 24);
  p.line(8, 0, 8, 6, DARK);
  p.circle(8, 14, 7, MID);
  for (let y = 8; y < 21; y += 2) for (let x = 2; x < 15; x += 2) if (p.get(x, y) >= 0) p.px(x, y, (x + y) % 4 ? LIGHT : WHITE);
  p.outline(BLACK);
  return p;
}

/** Shelves of bottles behind the bar (32x32). */
export function bottleShelf(empty: boolean): PC {
  const p = new PC(32, 32);
  p.rect(0, 0, 32, 32, DARK);
  for (const y of [9, 20, 31]) p.rect(0, y, 32, 1, BLACK);
  if (!empty)
    for (const y of [1, 12, 23])
      for (let x = 2; x < 30; x += 4) {
        const h = 6 + ((x + y) % 3);
        p.rect(x, y + 8 - h, 3, h, (x + y) % 2 ? LIGHT : MID);
        p.rect(x + 1, y + 7 - h, 1, 2, DARK);
        p.px(x, y + 9 - h, WHITE);
      }
  else for (const [x, y] of [[6, 4], [22, 15]]) p.rect(x, y, 3, 5, MID);
  p.outline(BLACK);
  return p;
}

/** The great jug for the bar (16x20). `full` sloshes. */
export function jug(full: boolean): PC {
  const p = new PC(16, 20);
  p.ellipse(8, 13, 6, 6, MID);
  p.rect(6, 2, 4, 6, MID);
  p.ring(13, 10, 2, 3, MID);
  if (full) {
    p.ellipse(8, 14, 4, 4, LIGHT);
    p.px(6, 12, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** The hotel elevator doors (32x32). */
export function elevator(): PC {
  const p = new PC(32, 32);
  p.rect(0, 0, 32, 32, MID);
  p.rect(3, 6, 26, 26, LIGHT);
  p.rect(15, 6, 2, 26, DARK);
  p.rect(10, 1, 12, 4, BLACK);
  drawText(p, 12, 1, 'UP', WHITE, 0);
  p.outline(BLACK);
  return p;
}

/** The club's back door (32x32): a steel staff door under a sign. Shut, the sign
 *  says STAFF and a chain hangs across it; propped open, a bright EXIT sign, a
 *  wedge in the gap and a strip of street light leaking through. */
export function clubBackDoor(open: boolean): PC {
  const p = new PC(32, 32);
  // the sign
  p.rect(3, 0, 26, 8, BLACK);
  if (open) {
    p.rect(3, 0, 26, 8, WHITE); // lit up: a bright border round it
    p.rect(4, 1, 24, 6, BLACK);
    drawText(p, 6, 1, 'EXIT', WHITE, 0);
  } else {
    p.rect(4, 1, 24, 6, DARK);
    drawText(p, 3, 1, 'STAFF', MID, 0);
  }
  // frame and slab
  p.rect(7, 9, 18, 23, BLACK);
  p.rect(8, 10, 16, 22, MID);
  if (open) {
    // swung in a crack: the far edge shows the night outside
    p.rect(19, 10, 5, 22, BLACK);
    p.rect(21, 10, 1, 22, LIGHT);
    p.rect(17, 29, 4, 3, LIGHT); // the wedge
    p.rect(17, 29, 4, 1, WHITE);
    p.rect(10, 18, 2, 4, LIGHT);
  } else {
    p.rect(9, 12, 14, 4, LIGHT); // STAFF ONLY plate
    p.rect(10, 13, 12, 2, DARK);
    p.rect(19, 19, 3, 2, LIGHT); // push bar
    p.line(8, 22, 23, 26, DARK); // a chain across it
    p.line(8, 26, 23, 22, DARK);
    p.rect(14, 23, 3, 3, LIGHT); // the padlock
  }
  p.outline(BLACK);
  return p;
}

/** A clinic bed (16x32), with a drip stand. */
export function clinicBed(): PC {
  const p = new PC(16, 32);
  p.rect(1, 6, 13, 24, MID);
  p.rect(2, 7, 11, 20, WHITE);
  p.rect(2, 7, 11, 5, LIGHT);
  p.rect(1, 28, 2, 4, DARK);
  p.rect(12, 28, 2, 4, DARK);
  p.line(15, 2, 15, 30, DARK);
  p.rect(13, 0, 3, 5, LIGHT);
  p.outline(BLACK);
  return p;
}

/** Frozen yogurt machine (32x32): three handles, a swirl in the window. */
export function froyoMachine(): PC {
  const p = new PC(32, 32);
  p.rect(1, 4, 30, 28, LIGHT);
  p.rect(1, 4, 30, 3, WHITE);
  for (const x of [6, 14, 22]) {
    p.rect(x, 12, 4, 8, MID);
    p.rect(x + 1, 8, 2, 4, DARK);
    p.ellipse(x + 2, 24, 3, 2, WHITE);
  }
  p.outline(BLACK);
  return p;
}

/** A glass case of donuts (32x16). */
export function donutCase(full: boolean): PC {
  const p = new PC(32, 16);
  p.rect(0, 2, 32, 14, DARK);
  p.rect(1, 3, 30, 8, LIGHT);
  if (full) for (let x = 3; x < 30; x += 6) {
    p.ring(x + 2, 7, 2, 2, WHITE);
    p.px(x + 2, 6, MID);
  }
  p.outline(BLACK);
  return p;
}

/** The buffet line (48x16): steaming trays, most of them untouched. */
export function buffetLine(): PC {
  const p = new PC(48, 16);
  p.rect(0, 6, 48, 10, MID);
  p.rect(0, 6, 48, 2, LIGHT);
  for (let x = 2; x < 46; x += 11) {
    p.rect(x, 2, 9, 6, LIGHT);
    p.rect(x + 1, 3, 7, 3, x % 2 ? WHITE : MID);
  }
  p.outline(BLACK);
  return p;
}

/** A lobster tank (32x32), one lobster, deeply unimpressed. */
export function lobsterTank(): PC {
  const p = new PC(32, 32);
  p.rect(1, 6, 30, 26, BLACK);
  p.rect(2, 7, 28, 22, DARK);
  p.dither(2, 7, 28, 22, MID, 0.2);
  p.ellipse(14, 22, 5, 3, LIGHT);
  p.line(9, 20, 6, 16, LIGHT);
  p.line(19, 20, 22, 16, LIGHT);
  for (const [x, y] of [[24, 12], [8, 10]]) p.circle(x, y, 1, WHITE);
  p.outline(BLACK);
  return p;
}

/** An arcade cabinet (16x32). */
export function arcadeCab(seed: number): PC {
  const p = new PC(16, 32);
  p.rect(1, 2, 14, 30, DARK);
  p.rect(3, 6, 10, 9, BLACK);
  p.dither(3, 6, 10, 9, seed % 2 ? WHITE : LIGHT, 0.4);
  p.rect(2, 18, 12, 3, MID);
  p.circle(5, 19, 1, WHITE);
  p.px(10, 19, WHITE);
  p.outline(BLACK);
  return p;
}

/** An easel with a canvas (16x32). `kind` picks the picture. */
export function easel(kind: number): PC {
  const p = new PC(16, 32);
  p.line(8, 4, 2, 31, DARK);
  p.line(8, 4, 14, 31, DARK);
  p.line(8, 4, 8, 30, MID);
  p.rect(1, 6, 14, 14, WHITE);
  if (kind === 0) {
    p.circle(8, 12, 3, MID);
    p.rect(2, 16, 12, 3, LIGHT);
  } else if (kind === 1) for (let x = 2; x < 14; x++) p.px(x, 13 + Math.round(Math.sin(x) * 2), DARK);
  else {
    p.rect(4, 9, 3, 8, MID);
    p.rect(9, 11, 3, 6, DARK);
  }
  p.outline(BLACK);
  return p;
}

/** A painting leaning against the wall (16x16), for the art shop and Ayla's cave. */
export function canvasPic(kind: number): PC {
  const p = new PC(16, 16);
  p.rect(0, 0, 16, 16, DARK);
  p.rect(1, 1, 14, 14, kind % 2 ? WHITE : LIGHT);
  if (kind % 3 === 0) p.circle(8, 8, 4, MID);
  else if (kind % 3 === 1) for (let x = 2; x < 14; x++) p.px(x, 9 + Math.round(Math.sin(x * 0.8) * 3), DARK);
  else p.poly([[3, 13], [8, 4], [13, 13]], MID);
  p.outline(BLACK);
  return p;
}

/** Milo's workbench, tools hung above (48x32). */
export function workbench(): PC {
  const p = new PC(48, 32);
  p.rect(0, 14, 48, 6, MID);
  p.rect(0, 14, 48, 2, LIGHT);
  p.rect(2, 20, 4, 12, DARK);
  p.rect(42, 20, 4, 12, DARK);
  for (const [x, w] of [[6, 2], [14, 6], [26, 3], [36, 5]]) p.rect(x, 2, w, 10, DARK);
  p.rect(18, 8, 12, 6, WHITE); // a sheet of blueprints
  p.outline(BLACK);
  return p;
}

/** The checklist on Milo's wall (32x32): three days, two crossed off. */
export function checklistBoard(): PC {
  const p = new PC(32, 32);
  p.rect(0, 0, 32, 32, MID);
  p.rect(2, 2, 28, 28, WHITE);
  for (let y = 6; y < 28; y += 7) {
    p.rect(4, y, 3, 3, BLACK);
    p.rect(9, y + 1, 18, 1, DARK);
  }
  p.line(4, 6, 7, 9, BLACK);
  p.line(4, 13, 7, 16, BLACK);
  p.outline(BLACK);
  return p;
}

/** Avalena's "official" ID, drawn mid-robbery (120x76, shown full screen). */
export function fakeIdCard(): PC {
  const p = new PC(120, 76);
  p.rect(0, 0, 120, 76, WHITE);
  p.frame(0, 0, 120, 76, BLACK);
  p.frame(2, 2, 116, 72, MID);
  drawText(p, 8, 6, 'OFISHUL ID CARD', BLACK, 1);
  // the photo: a wobbly stick figure with a huge grin
  p.frame(8, 18, 34, 42, BLACK);
  p.ring(25, 30, 7, 7, BLACK);
  p.px(22, 29, BLACK);
  p.px(28, 29, BLACK);
  p.line(21, 33, 29, 33, BLACK);
  p.line(25, 37, 25, 50, BLACK);
  p.line(25, 42, 17, 38, BLACK);
  p.line(25, 42, 34, 46, BLACK);
  p.line(25, 50, 19, 58, BLACK);
  p.line(25, 50, 31, 58, BLACK);
  drawText(p, 48, 20, 'NAME: YOU', BLACK, 1);
  drawText(p, 48, 31, 'AGE: 21', BLACK, 1);
  drawText(p, 48, 39, '(PROMISE)', DARK, 1);
  drawText(p, 48, 50, 'REAL: YES', BLACK, 1);
  // a squiggle of a signature and a crayon smudge where the pen slipped
  for (let x = 50; x < 110; x++) p.px(x, 64 + Math.round(Math.sin(x * 0.6) * 2), DARK);
  p.line(84, 20, 110, 12, MID);
  return p;
}

export { W3_ICON_ROWS } from './artIcons3items';
