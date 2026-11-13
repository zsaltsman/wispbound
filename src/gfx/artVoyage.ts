import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer, type Pt } from './pixel';
import { G } from './fontData';

// The title screen and the voyages between islands: the WISPBOUND logo, the night sky and
// the far islands behind it, the little sailboat (from the side and from behind), the four
// islands as you see them from the water, and the things you pass on the way.

const tri = (p: PC, a: Pt, b: Pt, c: Pt, col: number) => p.poly([a, b, c], col);

// ================================================================== the logo

/** WISPBOUND in big bevelled block letters, with a drop shadow. The I has no dot: a wisp burns there. */
export function logo(): PC {
  const word = 'WISPBOUND';
  const k = 6; // each font pixel becomes a 6x6 block
  const gap = 5;
  const lw = 5 * k;
  const pad = 6;
  const W0 = word.length * lw + (word.length - 1) * gap + pad * 2;
  const H0 = 7 * k + pad * 2 + 4;
  const on = (ch: string, gx: number, gy: number) => {
    if (gx < 0 || gy < 0 || gx > 4 || gy > 6) return false;
    // the I loses its top bar: the wisp sits there instead
    if (ch === 'I' && gy === 0) return false;
    return G[ch].split(' ')[gy][gx] === '1';
  };
  const face = new PC(W0, H0);
  [...word].forEach((ch, i) => {
    const ox = pad + i * (lw + gap);
    for (let gy = 0; gy < 7; gy++)
      for (let gx = 0; gx < 5; gx++) {
        if (!on(ch, gx, gy)) continue;
        for (let y = 0; y < k; y++)
          for (let x = 0; x < k; x++) {
            const py = pad + gy * k + y;
            // a cold gradient down the letters: white at the top, into grey
            const v = 1 - (py - pad) / (7 * k);
            let c = v > 0.62 ? WHITE : v > 0.3 ? (bayer(x, py) < (v - 0.3) / 0.32 ? WHITE : LIGHT) : bayer(x, py) < v / 0.3 ? LIGHT : MID;
            // bevel: lit top edges, shaded bottom edges
            if (y === 0 && !on(ch, gx, gy - 1)) c = WHITE;
            if (y === k - 1 && !on(ch, gx, gy + 1)) c = DARK;
            if (x === k - 1 && !on(ch, gx + 1, gy)) c = c === WHITE ? LIGHT : c === LIGHT ? MID : c;
            face.px(ox + gx * k + x, py, c);
          }
      }
  });
  face.outline(BLACK, true);
  face.outline(BLACK);
  const out = new PC(W0 + 4, H0 + 4);
  // the shadow
  for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) if (face.get(x, y) >= 0) out.px(x + 4, y + 4, DARK);
  out.blit(face, 0, 0);
  return out;
}

/** Where the wisp sits on the logo (over the I), in logo pixels. */
export function logoWispSpot(): { x: number; y: number } {
  const k = 6, gap = 5, pad = 6;
  return { x: pad + 1 * (5 * k + gap) + 2.5 * k, y: pad + k };
}

/** A wisp: a small spirit flame with a white heart (frames 0-3 flicker). */
export function wisp(f: number, big = false): PC {
  const s = big ? 2 : 1;
  const p = new PC(12 * s, 16 * s);
  const sw = [0, 1, 0, -1][f % 4];
  const cx = 6 * s;
  p.ellipse(cx, 11 * s, 4 * s, 4 * s, LIGHT);
  tri(p, [cx - 4 * s, 10 * s], [cx + 4 * s, 10 * s], [cx + sw * s, 1], LIGHT);
  tri(p, [cx - 3 * s, 9 * s], [cx - 1 * s, 8 * s], [cx - 4 * s + sw * s, 4 * s], LIGHT);
  p.ellipse(cx, 11 * s, 2 * s, 3 * s, WHITE);
  tri(p, [cx - 2 * s, 10 * s], [cx + 2 * s, 10 * s], [cx + sw * s, 4 * s], WHITE);
  p.outline(MID);
  return p;
}

// ================================================================== the title backdrop

/** Night sky over the sea: dithered dark, a big moon with rings of haze, a scatter of stars. */
export function titleSky(): PC {
  const p = new PC(400, 196);
  for (let y = 0; y < 196; y++)
    for (let x = 0; x < 400; x++) {
      const v = y / 196;
      p.px(x, y, bayer(x, y) < v * 1.1 - 0.15 ? DARK : BLACK);
    }
  const r = artRng(4242);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * 400), y = Math.floor(r() * 150);
    p.px(x, y, r() < 0.2 ? WHITE : r() < 0.6 ? LIGHT : MID);
  }
  // the moon, low over the sea on the right
  const mx = 318, my = 62;
  for (let i = 3; i >= 1; i--) for (let a = 0; a < Math.PI * 2; a += 0.01) {
    const x = mx + Math.cos(a) * (26 + i * 9), y = my + Math.sin(a) * (26 + i * 9);
    if (bayer(Math.round(x), Math.round(y)) < 0.5 / i) p.px(x, y, i === 1 ? MID : DARK);
  }
  p.sphere(mx, my, 24, 24, [MID, LIGHT, WHITE, WHITE], [-0.5, -0.4]);
  for (const [cx, cy, cr] of [[-8, -6, 5], [7, 4, 6], [-3, 11, 3], [10, -9, 3], [-12, 6, 2]] as [number, number, number][]) {
    p.ellipse(mx + cx, my + cy, cr, cr, LIGHT);
    p.px(mx + cx + 1, my + cy + 1, MID);
  }
  return p;
}

/** The islands on the horizon, left to right: Hollowhaven and its lighthouse, the party
 * island's glow, a far shape in the haze, and the Forgotten Island's mountain. */
export function farIslands(): PC {
  const p = new PC(400, 44);
  const base = 43;
  const r = artRng(77);
  // Hollowhaven: crooked roofs, a church spire, the lighthouse
  p.poly([[8, base], [22, base - 10], [60, base - 14], [104, base - 9], [126, base]], DARK);
  for (let i = 0; i < 7; i++) {
    const x = 28 + i * 10, h = 6 + Math.floor(r() * 7);
    p.rect(x, base - 14 - h, 8, h, DARK);
    tri(p, [x - 1, base - 14 - h], [x + 9, base - 14 - h], [x + 4, base - 19 - h], DARK);
    if (r() < 0.6) p.px(x + 3, base - 12 - h + 2, LIGHT);
  }
  p.rect(84, base - 34, 3, 20, DARK);
  tri(p, [82, base - 34], [89, base - 34], [85.5, base - 42], DARK);
  // the lighthouse (its lamp is lit in the scene)
  p.poly([[110, base - 8], [114, base - 38], [118, base - 38], [122, base - 8]], MID);
  for (let y = base - 34; y < base - 8; y += 6) p.rect(111, y, 11, 2, DARK);
  p.rect(112, base - 42, 8, 4, DARK);
  tri(p, [111, base - 42], [121, base - 42], [116, base - 46], DARK);
  // Bacchus Key, far off: a low island and a glow over its barrel
  p.poly([[176, base], [190, base - 6], [214, base - 8], [236, base]], DARK);
  p.ellipse(205, base - 10, 5, 4, DARK);
  for (let i = 0; i < 6; i++) p.px(194 + i * 6, base - 6, i % 2 ? WHITE : LIGHT);
  // a far shape in the haze
  p.poly([[250, base], [262, base - 4], [276, base]], MID);
  // the Forgotten Island: a mountain, and a monument on the summit
  p.poly([[292, base], [318, base - 18], [342, base - 32], [356, base - 26], [380, base - 12], [398, base]], DARK);
  p.rect(340, base - 38, 3, 7, DARK);
  p.rect(338, base - 39, 7, 2, DARK);
  for (let i = 0; i < 10; i++) {
    const x = 300 + Math.floor(r() * 90);
    p.rect(x, base - 6 - Math.floor(r() * 6), 2, 6, BLACK);
  }
  return p;
}

/** The little sailboat from the side, facing right (frame 1: the sail fills). */
export function sideBoat(f: number): PC {
  const p = new PC(72, 64);
  const by = 50;
  // the hull
  p.poly([[4, by - 6], [66, by - 8], [60, by + 4], [12, by + 4]], DARK);
  p.rect(4, by - 8, 62, 2, MID);
  p.shade((x, y) => (y >= by - 8 && y <= by + 4 ? 0.85 - (y - by + 8) / 14 : null), [BLACK, DARK, MID]);
  for (let x = 10; x < 60; x += 8) p.line(x, by - 3, x + 4, by - 3, BLACK);
  // a lantern on the stern post
  p.line(8, by - 8, 8, by - 16, MID);
  p.rect(6, by - 19, 5, 4, WHITE);
  // the mast and the sail
  p.rect(34, by - 46, 2, 38, MID);
  const belly = f % 2 ? 6 : 3;
  p.poly([[36, by - 44], [36, by - 12], [60 + belly / 2, by - 12], [52 + belly, by - 28]], LIGHT);
  p.poly([[33, by - 40], [33, by - 14], [16 - belly / 2, by - 14], [22 - belly / 2, by - 26]], MID);
  p.shade((x, y) => (y > by - 46 && y < by - 10 && x > 12 ? (x > 36 ? 0.95 - (x - 36) / 40 : 0.55) : null), [MID, LIGHT, WHITE]);
  for (let y = by - 38; y < by - 12; y += 7) p.line(37, y, 52, y + 2, MID);
  // the pennant
  p.poly([[35, by - 46], [43, by - 45 + (f % 2)], [35, by - 43]], WHITE);
  p.outline(BLACK);
  return p;
}

/** A soft cloud (three sizes). */
export function cloud(v: number, bright = false): PC {
  const w = [70, 46, 30][v], h = [20, 14, 10][v];
  const p = new PC(w, h);
  const r = artRng(500 + v * 13);
  for (let i = 0; i < 6; i++) {
    const cx = 8 + r() * (w - 16), cy = h * 0.55 + (r() - 0.5) * h * 0.3;
    const rx = 6 + r() * (w / 4), ry = 3 + r() * (h / 3);
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue;
        const X = Math.round(cx + x), Y = Math.round(cy + y);
        const top = y < -ry * 0.2;
        p.px(X, Y, bright ? (top ? WHITE : LIGHT) : top ? MID : DARK);
      }
  }
  // dithered edges so it sits softly on the sky
  p.remap((c, x, y) => (p.get(x, y - 1) < 0 || p.get(x, y + 1) < 0 ? (bayer(x, y) < 0.5 ? c : bright ? LIGHT : DARK) : c));
  return p;
}

/** A gull, flapping (frames 0-2). */
export function gull(f: number, dark = true): PC {
  const p = new PC(11, 6);
  const c = dark ? BLACK : WHITE;
  const wy = [0, 2, 4][f % 3];
  p.line(0, wy, 4, 3, c);
  p.line(10, wy, 6, 3, c);
  p.rect(4, 3, 3, 2, c);
  return p;
}

// ================================================================== at sea

/** The boat from behind, as you sail it: the sail and mast (back) and the stern rail (front).
 * The player and spirits stand between the two. Frames 0-1: the sail breathes. */
export function sternBack(f: number, night: boolean): PC {
  const p = new PC(84, 90);
  const cx = 42;
  // the sail, seen from behind, bellied out ahead of you
  const b = f % 2 ? 3 : 1;
  p.rect(cx - 1, 6, 3, 70, MID);
  p.poly([[cx - 22 - b, 14], [cx + 22 + b, 14], [cx + 26 + b, 56], [cx - 26 - b, 56]], LIGHT);
  p.shade((x, y) => (y >= 14 && y <= 56 ? (night ? 0.62 : 0.92) - Math.abs(x - cx) / 70 - (y - 14) / 140 : null), [DARK, MID, LIGHT, WHITE]);
  for (let y = 22; y < 56; y += 8) p.line(cx - 22, y, cx + 22, y, MID);
  p.rect(cx - 27, 55, 54, 2, MID);
  p.rect(cx - 23, 12, 46, 2, MID);
  // the deck and the hull's sides, running away from you
  p.poly([[cx - 30, 74], [cx + 30, 74], [cx + 14, 60], [cx - 14, 60]], DARK);
  p.shade((x, y) => (y >= 60 && y <= 74 ? 0.6 - (74 - y) / 30 : null), [BLACK, DARK, MID]);
  for (let x = cx - 24; x <= cx + 24; x += 6) p.line(cx + (x - cx) * 0.5, 61, x, 73, BLACK);
  p.outline(BLACK);
  return p;
}

export function sternFront(night: boolean): PC {
  const p = new PC(84, 24);
  const cx = 42;
  p.poly([[cx - 34, 2], [cx + 34, 2], [cx + 28, 18], [cx - 28, 18]], DARK);
  p.rect(cx - 34, 1, 68, 3, MID);
  p.shade((x, y) => (y >= 4 && y <= 18 ? 0.7 - (y - 4) / 22 : null), [BLACK, DARK, MID]);
  for (let y = 7; y < 18; y += 4) p.line(cx - 30 + (y - 7) / 2, y, cx + 30 - (y - 7) / 2, y, BLACK);
  // the stern lantern
  p.rect(cx - 2, 6, 5, 5, night ? WHITE : LIGHT);
  p.px(cx, 8, WHITE);
  p.outline(BLACK);
  return p;
}

/** The islands as you see them from the water, each with its dock reaching out toward you. */
export function islandArt(id: string): PC {
  const p = new PC(240, 110);
  const base = 96;
  const r = artRng(id.length * 101 + id.charCodeAt(0));
  const dock = (x: number, light: boolean) => {
    // planks running toward you and a lamp at the end
    p.poly([[x - 6, base - 4], [x + 6, base - 4], [x + 14, base + 12], [x - 14, base + 12]], MID);
    for (let y = base - 2; y < base + 12; y += 3) p.line(x - 6 - (y - base + 4) / 2, y, x + 6 + (y - base + 4) / 2, y, DARK);
    for (const s of [-1, 1]) p.rect(x + s * 14 - 1, base + 6, 2, 8, DARK);
    p.line(x + 12, base + 10, x + 12, base - 2, DARK);
    p.rect(x + 10, base - 5, 5, 4, light ? WHITE : LIGHT);
  };
  if (id === 'hollowhaven') {
    p.poly([[4, base], [20, base - 18], [80, base - 30], [150, base - 26], [214, base - 14], [236, base]], DARK);
    for (let i = 0; i < 11; i++) {
      const x = 30 + i * 15, h = 10 + Math.floor(r() * 12);
      p.rect(x, base - 26 - h, 12, h + 6, i % 3 ? DARK : MID);
      tri(p, [x - 2, base - 26 - h], [x + 14, base - 26 - h], [x + 6, base - 34 - h], DARK);
      if (r() < 0.7) p.rect(x + 4, base - 22 - h, 3, 3, r() < 0.5 ? WHITE : LIGHT);
    }
    p.rect(120, base - 70, 4, 34, DARK);
    tri(p, [117, base - 70], [127, base - 70], [122, base - 84], DARK);
    p.poly([[196, base - 14], [201, base - 64], [207, base - 64], [212, base - 14]], MID);
    for (let y = base - 58; y < base - 14; y += 8) p.rect(197, y, 15, 3, DARK);
    p.rect(199, base - 70, 10, 6, WHITE);
    dock(100, true);
  } else if (id === 'saltwash') {
    // the flooded island: rooftops in the water, a tall civic tower, the professor's mast
    p.poly([[10, base], [30, base - 14], [120, base - 22], [200, base - 16], [232, base]], DARK);
    for (let i = 0; i < 9; i++) {
      const x = 24 + i * 22, h = 18 + Math.floor(r() * 26);
      p.rect(x, base - h, 16, h, i % 2 ? MID : DARK);
      for (let w = 0; w < 3; w++) for (let v = 0; v < Math.floor(h / 9); v++) if (r() < 0.45) p.rect(x + 3 + w * 4, base - h + 4 + v * 8, 2, 3, r() < 0.4 ? WHITE : LIGHT);
    }
    p.rect(110, base - 74, 18, 60, MID);
    p.rect(108, base - 78, 22, 5, DARK);
    p.circle(119, base - 64, 5, LIGHT);
    p.px(119, base - 66, BLACK);
    p.px(120, base - 64, BLACK);
    // water lapping halfway up the walls
    for (let x = 10; x < 232; x++) if (bayer(x, base - 6) < 0.5) p.px(x, base - 6 + ((x >> 2) % 2), LIGHT);
    dock(70, false);
  } else if (id === 'bacchus') {
    // the party island: palms, the club with its lights, the great barrel
    p.poly([[6, base], [40, base - 10], [200, base - 12], [234, base]], DARK);
    p.rect(90, base - 40, 60, 30, MID);
    p.rect(86, base - 44, 68, 5, DARK);
    for (let i = 0; i < 9; i++) p.rect(92 + i * 6, base - 34, 3, 3, i % 2 ? WHITE : LIGHT);
    p.ellipse(176, base - 30, 18, 22, MID);
    for (const dy of [-16, 0, 14]) p.rect(158, base - 30 + dy, 36, 2, DARK);
    for (const px of [30, 60, 214]) {
      p.thick(px, base - 6, px + 4, base - 40, DARK, 2);
      for (const [dx, dy] of [[-14, 6], [14, 6], [-10, -4], [12, -2], [0, -10]] as Pt[]) p.thick(px + 4, base - 40, px + 4 + dx, base - 40 + dy, DARK, 2);
    }
    // a string of lanterns along the harbour
    for (let x = 14; x < 226; x += 9) p.px(x, base - 8 + Math.round(Math.sin(x * 0.2) * 2), x % 2 ? WHITE : LIGHT);
    dock(120, true);
  } else {
    // the Forgotten Island: a great dark mountain, the monument on the cliff, a still forest
    p.poly([[2, base], [40, base - 22], [90, base - 58], [118, base - 82], [134, base - 76], [170, base - 48], [214, base - 24], [238, base]], DARK);
    p.poly([[118, base - 82], [134, base - 76], [128, base - 64], [112, base - 70]], MID);
    p.rect(124, base - 96, 5, 16, MID);
    p.rect(120, base - 98, 13, 3, MID);
    for (let i = 0; i < 26; i++) {
      const x = 8 + Math.floor(r() * 222), h = 6 + Math.floor(r() * 10);
      tri(p, [x - 4, base - 2], [x + 4, base - 2], [x, base - 2 - h], BLACK);
    }
    // the wreck of an airship on the rocks
    p.ellipse(186, base - 12, 20, 6, MID);
    p.rect(176, base - 22, 3, 12, MID);
    dock(80, false);
  }
  p.outline(BLACK);
  return p;
}

/** A sea stack (two shapes). */
export function seaRock(v: number): PC {
  const p = new PC(40, 36);
  if (v === 0) p.poly([[2, 34], [8, 12], [16, 2], [26, 6], [34, 20], [38, 34]], DARK);
  else p.poly([[4, 34], [10, 20], [20, 16], [30, 22], [36, 34]], DARK);
  p.shade((x, y) => 0.85 - x / 50 - y / 120, [BLACK, DARK, MID, LIGHT]);
  for (let x = 2; x < 38; x++) if (p.get(x, 33) >= 0 && bayer(x, 33) < 0.6) p.px(x, 33, WHITE);
  p.outline(BLACK);
  return p;
}

/** A bell buoy (frames 0-1 rock; its light blinks in the scene). */
export function buoy(f: number): PC {
  const p = new PC(16, 26);
  const s = f % 2 ? 1 : -1;
  p.poly([[3, 24], [13, 24], [11, 18], [5, 18]], MID);
  p.line(8 + s, 4, 5, 18, DARK);
  p.line(8 + s, 4, 11, 18, DARK);
  p.ellipse(8 + s, 12, 2, 2, LIGHT);
  p.rect(7 + s, 1, 3, 3, WHITE);
  p.outline(BLACK);
  return p;
}

/** Something old in the water: a drowned ship's mast and torn sail (the fog), or the
 * Flying Dutchman far away, listing (the storm). */
export function oldShip(dutchman: boolean): PC {
  const p = new PC(70, 60);
  if (dutchman) {
    p.poly([[4, 50], [60, 44], [56, 56], [10, 58]], DARK);
    p.thick(24, 50, 18, 10, DARK, 2);
    p.thick(42, 47, 40, 14, DARK, 2);
    p.poly([[18, 12], [32, 16], [30, 36], [16, 34]], MID);
    p.px(22, 22, -1);
    p.px(26, 28, -1);
    p.poly([[40, 16], [52, 20], [50, 34], [40, 32]], MID);
  } else {
    p.thick(30, 58, 34, 6, DARK, 2);
    p.thick(20, 22, 48, 18, DARK, 1);
    p.poly([[36, 20], [50, 22], [44, 40], [36, 38]], MID);
    for (let i = 0; i < 6; i++) p.px(38 + i * 2, 30 + (i % 2) * 4, -1);
  }
  p.outline(BLACK);
  return p;
}

/** A leaping fish (frames 0-2 along its arc). */
export function leapFish(f: number): PC {
  const p = new PC(14, 8);
  const tilt = [-2, 0, 2][f % 3];
  p.ellipse(7, 4, 5, 2, LIGHT);
  tri(p, [1, 4 + tilt], [-1, 1 + tilt], [-1, 7 + tilt], LIGHT);
  p.px(10, 3, BLACK);
  p.outline(BLACK);
  return p;
}
