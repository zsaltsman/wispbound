import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';

// The Kraken and its arena: a drowned temple far beneath Saltwash. Its
// tentacles are drawn live in the arena; these are the parts that hold still.

/**
 * The head and mantle, 220x170, facing left toward the party.
 * 0-1 idle (breathing), 2 roar (beak open), 3 hurt, 4-5 enraged, 6 defeated.
 */
export function krakenHead(f: number): PC {
  const W = 220;
  const H = 170;
  const p = new PC(W, H);
  const r = artRng(31);
  const breathe = f === 1 || f === 5 ? 3 : 0;
  const dead = f === 6;
  const mad = f === 4 || f === 5;
  const cx = 116;
  const top = 8 + (dead ? 18 : 0);
  // the mantle: a vast, ridged dome leaning back
  p.ellipse(cx + 10, top + 58 - breathe, 82, 60 + breathe, MID);
  p.poly(
    [
      [cx - 40, top + 70],
      [cx + 70, top + 30],
      [cx + 100, top + 120],
      [cx - 20, top + 140],
    ],
    MID
  );
  p.shade((x, y) => (p.get(x, y) === MID ? 1.0 - (x - cx + 70) / 260 - (y - top) / 420 : null), [BLACK, DARK, MID, LIGHT]);
  // ridges and barnacled scars
  for (let i = 0; i < 7; i++) {
    const x0 = cx - 30 + i * 18;
    for (let y = top + 10 + i * 2; y < top + 110; y += 2) if (p.get(x0 + Math.round(Math.sin(y * 0.08 + i) * 4), y) >= 0) p.px(x0 + Math.round(Math.sin(y * 0.08 + i) * 4), y, DARK);
  }
  for (let i = 0; i < 28; i++) {
    const x = cx - 50 + Math.floor(r() * 140);
    const y = top + 20 + Math.floor(r() * 90);
    if (p.get(x, y) >= 0) p.circle(x, y, 1 + Math.floor(r() * 2), r() < 0.5 ? LIGHT : DARK);
  }
  // the head proper, low and forward
  p.ellipse(cx - 40, top + 112, 52, 38, MID);
  p.shade((x, y) => (Math.hypot((x - cx + 40) / 52, (y - top - 112) / 38) < 1 ? 0.95 - (x - cx + 92) / 200 - (y - top - 74) / 160 : null), [DARK, MID, LIGHT]);
  // the great eye
  const ex = cx - 52;
  const ey = top + 100;
  const open = dead ? 0 : f === 3 ? 0.35 : mad ? 1.25 : f === 1 ? 0.8 : 1;
  const ery = Math.max(1, Math.round(13 * open));
  p.ellipse(ex, ey, 20, ery + 3, BLACK);
  if (open > 0.1) {
    p.ellipse(ex, ey, 18, ery, mad ? WHITE : LIGHT);
    p.ellipse(ex - 2, ey, 4, Math.max(1, ery - 2), BLACK); // slit pupil
    p.px(ex - 8, ey - Math.floor(ery / 2), WHITE);
    p.px(ex - 7, ey - Math.floor(ery / 2), WHITE);
    if (mad) for (let a = 0; a < 6; a++) p.line(ex + Math.cos(a) * 18, ey + Math.sin(a) * ery, ex + Math.cos(a) * 24, ey + Math.sin(a) * (ery + 5), WHITE);
  } else p.line(ex - 16, ey, ex + 16, ey, DARK);
  // brow ridge
  p.thick(ex - 22, ey - ery - 6 + (mad ? 4 : 0), ex + 20, ey - ery - 10, DARK, 3);
  // the maw: a wide crescent under the eye, rimmed with hooked teeth, the beak deep in the throat.
  // It curls up toward the back of the head, so it reads as part of the face, not a slot cut into it.
  const mx = cx - 60;
  const my = top + 136;
  const mw = 24;
  const gape = dead ? 1 : f === 2 || mad ? 13 : f === 3 ? 6 : f === 1 ? 3 : 2;
  const curve = (x: number) => (x / mw) ** 2 * 4 + x * 0.12;
  const up = (x: number) => my - 1 - gape * 0.45 * (1 - (x / mw) ** 2) - curve(x);
  const lo = (x: number) => my + 1 + gape * 0.55 * (1 - (x / mw) ** 2) - curve(x);
  // a heavy fold of flesh over the upper jaw
  for (let x = -mw - 2; x < mw + 2; x++) p.thick(mx + x, up(Math.max(-mw, Math.min(mw, x))) - 4, mx + x + 1, up(Math.max(-mw, Math.min(mw, x + 1))) - 4, DARK, 2);
  // the gullet
  for (let x = -mw; x <= mw; x++) for (let y = Math.round(up(x)); y <= Math.round(lo(x)); y++) p.px(mx + x, y, BLACK);
  if (gape > 6) p.ellipse(mx + 7, my + 1, 10, Math.round(gape * 0.28), DARK); // the throat, going down
  if (gape > 4) {
    // the hooked beak, glinting far back in the dark
    p.poly([[mx + 1, my - 2], [mx + 10, my - 4], [mx + 6, my + 3]], MID);
    p.px(mx + 2, my - 2, LIGHT);
  }
  // teeth: long hooked fangs at the front, smaller toward the corners
  for (let x = -mw + 3; x <= mw - 3; x += 5) {
    const len = Math.round(2 + (1 - Math.abs(x) / mw) * (gape > 6 ? 5 : 2));
    const ty = up(x);
    p.poly([[mx + x - 1.5, ty], [mx + x + 1.5, ty], [mx + x, ty + len]], (x / 5) % 2 ? WHITE : LIGHT);
    if (gape > 3) {
      const ly = lo(x + 2);
      p.poly([[mx + x + 0.5, ly], [mx + x + 3.5, ly], [mx + x + 2, ly - len + 1]], LIGHT);
    }
  }
  // lips: a dark crease above, a pale wet rim below
  for (let x = -mw; x < mw; x++) {
    p.line(mx + x, up(x) - 1, mx + x + 1, up(x + 1) - 1, DARK);
    p.line(mx + x, lo(x) + 1, mx + x + 1, lo(x + 1) + 1, LIGHT);
  }
  // creases fanning out from the corners of the mouth
  p.line(mx - mw - 1, up(-mw), mx - mw - 6, up(-mw) + 5, DARK);
  p.line(mx + mw + 1, up(mw) - 1, mx + mw + 7, up(mw) - 7, DARK);
  p.line(mx + mw, lo(mw) + 2, mx + mw + 6, lo(mw) + 5, DARK);
  // the roots of the arms, spreading out of frame (the rest are drawn live)
  for (let i = 0; i < 6; i++) {
    const x = cx - 70 + i * 22;
    p.ellipse(x, top + 150, 14, 12, i % 2 ? DARK : MID);
    for (let k = 0; k < 3; k++) p.circle(x - 4 + k * 4, top + 156, 1, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** The drowned temple behind the fight: broken columns and steps under the sea. */
export function krakenBackdrop(): PC {
  const W = 680;
  const H = 210;
  const p = new PC(W, H);
  const r = artRng(5);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = y / H;
      p.px(x, y, ((x + y * 3) % 5 === 0 && t > 0.3) || ((x * 7 + y) % 11 === 0 && t > 0.6) ? DARK : BLACK);
    }
  // ruined columns at different depths
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 76 + Math.floor(r() * 20);
    const h = 70 + Math.floor(r() * 110);
    const w = 14 + (i % 3) * 4;
    const c = i % 2 ? DARK : MID;
    p.rect(x, H - h, w, h, c);
    for (let k = x + 3; k < x + w; k += 4) p.rect(k, H - h, 1, h, BLACK);
    p.rect(x - 3, H - h, w + 6, 5, c);
    if (r() < 0.5) p.poly([[x, H - h], [x + w, H - h], [x + w / 2, H - h - 10]], BLACK); // snapped top
  }
  // a colossal toppled head of a statue, half-buried
  p.ellipse(560, 188, 60, 34, DARK);
  p.ellipse(540, 180, 8, 5, BLACK);
  p.ellipse(578, 182, 8, 5, BLACK);
  // fish skeletons, weed
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(r() * W);
    for (let y = H - 1; y > H - 20 - Math.floor(r() * 30); y--) p.px(x + Math.round(Math.sin(y * 0.3 + i) * 2), y, DARK);
  }
  return p;
}

/** The sea floor the party stands on: pale sand, ripples, rubble. */
export function krakenFloor(): PC {
  const W = 720;
  const H = 140;
  const p = new PC(W, H);
  const r = artRng(9);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ripple = Math.sin(x * 0.06 + y * 0.4 + Math.sin(x * 0.01) * 3) > 0.7;
      p.px(x, y, y < 6 ? DARK : ripple ? LIGHT : (x + y) % 3 === 0 ? MID : DARK);
    }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * W);
    const y = 10 + Math.floor(r() * (H - 12));
    p.rect(x, y, 3 + Math.floor(r() * 6), 2 + Math.floor(r() * 3), r() < 0.5 ? MID : BLACK);
  }
  return p;
}

/** A cloud of ink: soft-edged, nearly black, with a dark fringe. */
export function inkCloud(): PC {
  const p = new PC(64, 48);
  for (let i = 0; i < 9; i++) p.ellipse(16 + (i % 3) * 16, 12 + Math.floor(i / 3) * 12, 14, 11, BLACK);
  p.dither(0, 0, 64, 48, DARK, 0.18, true);
  return p;
}

/** Long shafts of light from the surface, far above. */
export function lightRays(): PC {
  const p = new PC(400, 220);
  for (const x0 of [60, 150, 230, 330]) {
    for (let y = 0; y < 220; y++) {
      const half = 6 + y * 0.12;
      for (let x = Math.round(x0 + y * 0.25 - half); x < x0 + y * 0.25 + half; x++) if ((x + y * 2) % 4 === 0) p.px(x, y, y < 80 ? LIGHT : MID);
    }
  }
  return p;
}

/** A sucker-lined tentacle tip, for close-ups in the attack animations. */
export function tentacleTip(): PC {
  const p = new PC(40, 120);
  for (let y = 0; y < 120; y++) {
    const w = 2 + (y / 120) * 16;
    const x = 20 + Math.sin(y * 0.05) * 6;
    p.rect(Math.round(x - w), y, Math.round(w * 2), 1, y % 7 === 0 ? DARK : MID);
    if (y % 9 === 4 && y > 10) p.circle(Math.round(x - w / 2), y, Math.max(1, Math.round(w / 5)), LIGHT);
  }
  p.outline(BLACK);
  return p;
}
