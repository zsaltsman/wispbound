import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, type Pt } from './pixel';

// The EVOLVED forms of your twelve spirits: what each one becomes when it is pushed past its
// limits. Each is its own design, grown out of the little creature you know: the same idea,
// bigger, older and far more dangerous. Native 56x52, standing on the bottom edge, facing
// right, frames 0-3 idle, 4 attack, 5 hurt. The aura (fire, deep-water glow, steam) is added
// on top of these by artW5 / artFinal.

const EW = 56;
const EH = 52;

type Pose = { f: number; atk: boolean; hurt: boolean; ph: number; bob: number };
const poseOf = (f: number, bobs = [0, -1, -2, -1]): Pose => ({
  f,
  atk: f === 4,
  hurt: f === 5,
  ph: f % 4,
  bob: f === 4 ? -1 : f === 5 ? 1 : bobs[f % 4],
});

/** A glowing eye: a black socket with a white light in it (squeezed to a slit when hurt). */
function glow(p: PC, x: number, y: number, w: number, h: number, hurt: boolean) {
  if (hurt) {
    p.line(x - w, y, x + w, y + 1, BLACK);
    return;
  }
  p.ellipse(x, y, w, h, BLACK);
  p.px(x, y, WHITE);
  if (h > 1) p.px(x, y - 1, WHITE);
  if (w > 1) p.px(x + 1, y, LIGHT);
}

const tri = (p: PC, a: Pt, b: Pt, c: Pt, col: number) => p.poly([a, b, c], col);

// ------------------------------------------------------------------ BANSHEET (booheet)
// The little sheet ghost, grown into a hooded wailing wraith: long clawed sleeves, a crown of
// cold flame, and a hem torn into streamers that trail behind it as it floats.
function bansheet(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -2, -1]);
  const lean = s.atk ? 3 : s.hurt ? -2 : 0;
  const top = 6 + s.bob;
  const cx = 27 + lean;
  // streamers of the hem, swept back (left) and fluttering
  for (let i = 0; i < 9; i++) {
    const x0 = cx - 15 + i * 3.6;
    const len = 6 + ((i * 7) % 5) + (i < 4 ? 4 : 0);
    const sw = Math.sin(i * 1.3 + s.ph * 1.6) * 2 - (i < 5 ? 3 : 1);
    tri(p, [x0 - 2, top + 34], [x0 + 2.5, top + 34], [x0 + sw, top + 34 + len], i % 2 ? LIGHT : WHITE);
  }
  // the body, flaring out from narrow shoulders
  p.poly([[cx - 8, top + 12], [cx + 8, top + 12], [cx + 15, top + 36], [cx - 17, top + 36]], WHITE);
  // the far sleeve, reaching back
  p.thick(cx - 7, top + 15, cx - 16, top + 25, LIGHT, 4);
  for (let k = 0; k < 3; k++) p.line(cx - 16, top + 27, cx - 20 + k * 2, top + 32, MID);
  // the hood
  p.ellipse(cx + 1, top + 9, 10, 10, WHITE);
  tri(p, [cx - 9, top + 6], [cx - 15, top + 1], [cx - 6, top + 1], WHITE);
  // the near sleeve, long, reaching for the enemy
  const hx = cx + (s.atk ? 26 : 18);
  const hy = top + (s.atk ? 12 : 22);
  p.thick(cx + 6, top + 15, hx - 2, hy, WHITE, 5);
  p.ellipse(hx - 3, hy + 2, 4, 3, LIGHT);
  for (let k = -1; k <= 1; k++) p.line(hx, hy + 2, hx + 5, hy + 2 + k * 3 + (s.atk ? -1 : 2), LIGHT);
  // a broken shackle on the wrist
  p.ring(hx - 6, hy + 2, 2, 3, MID);
  // shading: light from upper left
  p.shade((x, y) => {
    const nx = (x - cx) / 18;
    const ny = (y - top) / 46;
    return 1.05 - Math.max(0, nx) * 0.6 - Math.max(0, ny - 0.45) * 0.9;
  }, [MID, LIGHT, WHITE]);
  // folds down the robe
  for (const fx of [-11, -5, 2, 8]) for (let y = top + 20 + (Math.abs(fx) % 3); y < top + 36; y++) if (p.get(cx + fx + (y % 6 === 0 ? 1 : 0), y) >= 0) p.px(cx + fx + (y % 6 === 0 ? 1 : 0), y, fx > 0 ? MID : LIGHT);
  // the face is a hollow under the hood
  p.ellipse(cx + 4, top + 10, 6, 6, BLACK);
  p.ellipse(cx + 4, top + 11, 5, 5, DARK);
  glow(p, cx + 2, top + 9, 1, 2, s.hurt);
  glow(p, cx + 7, top + 9, 1, 2, s.hurt);
  if (s.atk) p.ellipse(cx + 5, top + 14, 2, 2, BLACK);
  else p.line(cx + 3, top + 14, cx + 7, top + 14, BLACK);
  // the crown of cold flame on the hood
  for (let k = 0; k < 3; k++) {
    const fx = cx - 3 + k * 5;
    const fh = 5 + (k === 1 ? 3 : 0) + ((s.ph + k) % 2);
    tri(p, [fx - 2, top + 1], [fx + 2, top + 1], [fx + (k - 1), top + 1 - fh], k === 1 ? WHITE : LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ DREADHULL (shipwraith)
// The little haunted ship, grown into a ghost galleon: two masts, a skull figurehead, two
// decks of cannon, a stern lantern, and drowned tentacles dragging in its wake.
function dreadhull(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -1, 0]);
  const tilt = s.atk ? -2 : 0;
  const by = 34 + s.bob;
  const r = artRng(91);
  // tentacles in the wake, curling under the hull
  for (let t = 0; t < 3; t++) {
    let x = 14 + t * 11;
    let y = by + 8;
    for (let i = 0; i < 10; i++) {
      const nx = x + Math.sin(i * 0.8 + t + s.ph) * 1.6 - 0.4;
      const ny = y + 1;
      if (ny < EH - 1) p.thick(x, y, nx, ny, i < 5 ? MID : DARK, i < 4 ? 2 : 1);
      x = nx;
      y = ny;
    }
  }
  // the hull, bow on the right
  p.poly([[2, by - 5], [15, by - 5], [15, by - 1], [40, by - 1 + tilt / 2], [53, by - 7 + tilt], [48, by + 8], [12, by + 10], [3, by + 4]], DARK);
  p.rect(2, by - 13, 13, 9, DARK); // stern castle
  p.rect(3, by - 15, 11, 2, MID);
  p.shade((x, y) => (y < by ? 0.75 : y < by + 5 ? 0.45 : 0.15), [BLACK, DARK, MID]);
  // planks, two decks of cannon (white flashes when it fires)
  for (let x = 6; x < 46; x += 6) p.line(x, by + 3, x + 3, by + 3, BLACK);
  for (const [x, yy] of [[18, 1], [25, 1], [32, 1], [39, 0], [21, 6], [29, 6], [37, 5]] as Pt[]) {
    p.rect(x, by + yy, 3, 2, BLACK);
    if (s.atk) p.px(x + 3, by + yy, WHITE);
  }
  // the stern lantern and windows
  p.rect(4, by - 10, 2, 2, WHITE);
  p.rect(8, by - 10, 2, 2, WHITE);
  p.line(1, by - 17, 1, by - 13, MID);
  p.rect(0, by - 13, 3, 3, WHITE);
  // barnacles
  for (let i = 0; i < 8; i++) p.px(8 + Math.floor(r() * 38), by + 7 + Math.floor(r() * 2), LIGHT);
  // masts and yards
  p.rect(20, by - 32, 2, 31, MID);
  p.rect(34, by - 27, 2, 26, MID);
  p.rect(12, by - 29, 18, 1, MID);
  p.rect(28, by - 24, 14, 1, MID);
  // sails: the big one wears the drowned captain's face
  const sw = s.atk ? -1 : Math.round(Math.sin(s.ph * 1.57));
  const sail = (x0: number, x1: number, y0: number, y1: number) =>
    p.poly([[x0, y0], [x1, y0], [x1 + 2 + sw, (y0 + y1) / 2], [x1 + 1 + sw, y1], [x0 - 1, y1], [x0 - 2 + sw, (y0 + y1) / 2]], LIGHT);
  sail(12, 30, by - 28, by - 9);
  sail(28, 42, by - 23, by - 8);
  p.shade((x, y) => (y > by - 30 && y < by - 7 && x > 10 ? (x > 38 ? 0.35 : 0.85) : null), [MID, LIGHT, WHITE]);
  for (let x = 10; x <= 44; x++) if (r() < 0.45) p.px(x, by - 9 + (x > 27 ? 1 : 0), -1);
  p.px(16, by - 13, -1);
  p.px(39, by - 18, -1);
  // the skull in the main sail
  p.ellipse(21, by - 19, 5, 5, WHITE);
  glow(p, 19, by - 20, 1, 1, s.hurt);
  glow(p, 23, by - 20, 1, 1, s.hurt);
  for (let x = 18; x <= 24; x += 2) p.px(x, by - 15, BLACK);
  p.line(13, by - 12, 29, by - 26, MID);
  p.line(13, by - 26, 29, by - 12, MID);
  // the skull figurehead on the bow
  p.line(50, by - 6 + tilt, 55, by - 10 + tilt, MID);
  p.circle(50, by - 9 + tilt, 3, WHITE);
  p.px(51, by - 10 + tilt, BLACK);
  p.px(49, by - 10 + tilt, BLACK);
  // a black flag at the masthead
  const fl = s.ph % 2;
  p.poly([[21, by - 32], [29, by - 31 + fl], [26, by - 30], [30, by - 28 - fl], [21, by - 28]], BLACK);
  p.px(24, by - 30, WHITE);
  p.outline(BLACK);
  // the spectral wake, a soft glow under the keel
  for (let i = 0; i < 6; i++)
    for (let x = 10 + i * 2; x < 46 - i * 2; x++)
      if ((x + i * 2 + s.ph) % 4 === 0 && by + 12 + i < EH && p.get(x, by + 12 + i) < 0) p.px(x, by + 12 + i, i < 2 ? LIGHT : MID);
  if (s.hurt) p.remap((c, x, y) => (c === WHITE && (x + y) % 2 ? LIGHT : c));
  return p;
}

// ------------------------------------------------------------------ SCARECROWN (hauntcorn)
// The scarecrow, grown into the king of the harvest: a crowned sack head with a stitched grin,
// a long ragged coat, a crow on its arm, and a great scythe.
function scarecrown(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, 0, 1]);
  const sway = s.atk ? -2 : s.hurt ? 2 : [0, 1, 0, -1][s.ph];
  const cx = 26;
  const top = 4 + Math.max(0, s.bob);
  // the scythe, behind it (raised high to strike)
  const sx = s.atk ? cx + 24 : cx + 19;
  const sy0 = s.atk ? top + 2 : top + 6;
  p.thick(s.atk ? cx + 10 : cx + 17, EH - 4, sx, sy0, DARK, 2);
  const bl: Pt[] = s.atk
    ? [[sx, sy0], [sx + 8, sy0 + 4], [sx + 10, sy0 + 13], [sx + 5, sy0 + 6]]
    : [[sx, sy0], [sx - 10, sy0 - 1], [sx - 16, sy0 + 5], [sx - 8, sy0 + 2]];
  p.poly(bl, WHITE);
  p.line(bl[0][0], bl[0][1], bl[2][0], bl[2][1], LIGHT);
  // the pole and straw legs
  p.rect(cx - 1, top + 30, 3, EH - top - 31, DARK);
  for (let k = -2; k <= 2; k++) p.line(cx, top + 36, cx + k * 2, top + 42, k % 2 ? MID : LIGHT);
  // arms on the crossbar, with straw spilling from the cuffs
  const ay = top + 20;
  p.thick(cx - 21, ay + sway, cx + 19, ay - sway, MID, 2);
  const fan = (hx: number, hy: number, dir: number) => {
    for (let k = -3; k <= 3; k++) p.line(hx, hy, hx + dir * (5 + (k % 2 === 0 ? 3 : 0)), hy + k * 1.8, k % 2 === 0 ? LIGHT : MID);
  };
  fan(cx - 21, ay + sway, -1);
  fan(cx + 19, ay - sway, 1);
  // the long coat, tattered at the hem
  p.poly([[cx - 10, top + 16], [cx + 10, top + 16], [cx + 14, top + 40], [cx - 15, top + 40]], DARK);
  for (let x = cx - 15; x <= cx + 14; x += 3) tri(p, [x, top + 39], [x + 3, top + 39], [x + 1, top + 43 + ((x * 3) % 4)], DARK);
  p.shade((x, y) => (y > top + 15 && y < top + 46 ? (x < cx - 3 ? 0.7 : 0.4) : null), [BLACK, DARK, MID]);
  // buttons and patches
  for (let y = top + 20; y < top + 38; y += 5) p.px(cx + 1, y, LIGHT);
  p.rect(cx - 9, top + 28, 4, 4, MID);
  p.line(cx - 9, top + 28, cx - 6, top + 31, BLACK);
  // the crow on its far arm
  const kx = cx - 17, ky = ay + sway - 4;
  p.ellipse(kx, ky, 3, 2, BLACK);
  p.circle(kx + 2, ky - 2, 2, BLACK);
  tri(p, [kx + 4, ky - 2], [kx + 7, ky - 1], [kx + 4, ky - 1], MID);
  p.px(kx + 2, ky - 3, WHITE);
  tri(p, [kx - 3, ky], [kx - 7, ky - 1 + (s.ph % 2)], [kx - 3, ky + 2], BLACK);
  // the sack head
  p.ellipse(cx + 1, top + 10, 9, 8, LIGHT);
  p.shade((x, y) => (y < top + 19 && y > top + 1 ? 1 - Math.max(0, (x - cx) / 12) * 0.6 : null), [MID, LIGHT, WHITE]);
  // tied at the neck
  p.rect(cx - 4, top + 16, 10, 2, MID);
  p.px(cx - 5, top + 18, LIGHT);
  // the face: stitched grin, glowing eyes
  glow(p, cx + 1, top + 9, 2, 2, s.hurt);
  glow(p, cx + 7, top + 9, 2, 2, s.hurt);
  p.line(cx - 1, top + 14, cx + 9, top + 13, BLACK);
  for (let x = cx; x <= cx + 8; x += 2) p.line(x, top + 12, x, top + 15, BLACK);
  // the crown
  p.rect(cx - 6, top + 1, 14, 3, LIGHT);
  for (let k = 0; k < 4; k++) tri(p, [cx - 6 + k * 4, top + 1], [cx - 2 + k * 4, top + 1], [cx - 4 + k * 4, top - 3], WHITE);
  p.px(cx + 1, top + 2, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ STORMBRAWL (umbrawl)
// The umbrella with fists, grown into the storm: a canopy of thundercloud, a handle forged
// from a lightning bolt, rain falling from its rim, and two huge iron-knuckled fists.
function stormbrawl(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -2, -1]);
  const top = 8 + s.bob;
  const cx = 26 + (s.atk ? 2 : s.hurt ? -2 : 0);
  // rain from the rim
  for (let x = cx - 16; x <= cx + 16; x += 3)
    for (let k = 0; k < 3; k++) {
      const y = top + 16 + ((x * 5 + k * 7 + s.ph * 3) % 18);
      p.line(x, y, x - 1, y + 2, MID);
    }
  // the handle: a lightning bolt
  const bolt: Pt[] = [[cx, top + 12], [cx - 3, top + 22], [cx + 2, top + 22], [cx - 2, top + 34], [cx + 1, top + 40]];
  for (let i = 0; i + 1 < bolt.length; i++) p.thick(bolt[i][0], bolt[i][1], bolt[i + 1][0], bolt[i + 1][1], WHITE, 2);
  p.ring(cx + 4, top + 40, 3, 3, LIGHT);
  // the canopy, scalloped
  p.poly([[cx - 20, top + 16], [cx - 12, top + 2], [cx, top - 2], [cx + 12, top + 2], [cx + 20, top + 16]], DARK);
  for (let k = 0; k < 5; k++) p.ellipse(cx - 16 + k * 8, top + 16, 4, 2, DARK);
  // cloud billowing on top
  for (const [dx, dy, rr] of [[-10, 2, 6], [-2, -2, 7], [8, 1, 6], [14, 6, 4], [-15, 7, 4]] as [number, number, number][]) p.ellipse(cx + dx, top + dy, rr, rr - 1, MID);
  p.shade((x, y) => (y < top + 20 ? 1 - (y - top + 6) / 26 - Math.max(0, x - cx) / 40 : null), [DARK, MID, LIGHT]);
  // the ribs
  for (const dx of [-12, -4, 4, 12]) p.line(cx, top + 1, cx + dx * 1.4, top + 16, BLACK);
  // its angry face under the cloud
  glow(p, cx + 3, top + 10, 2, 2, s.hurt);
  glow(p, cx + 10, top + 10, 2, 2, s.hurt);
  p.line(cx + 1, top + 7, cx + 5, top + 8, BLACK);
  p.line(cx + 8, top + 8, cx + 12, top + 7, BLACK);
  // a spark of the storm on its point
  p.line(cx, top - 2, cx, top - 6, WHITE);
  p.px(cx - 1, top - 4, LIGHT);
  p.px(cx + 1, top - 5, LIGHT);
  // the fists: spiked gauntlets
  const fist = (fx: number, fy: number, big: number, col: number) => {
    p.rect(fx - 5 - big, fy - 4 - big, 10 + big * 2, 9 + big * 2, col);
    for (let k = 0; k < 4; k++) p.rect(fx - 4 - big + k * (3 + big / 2), fy - 4 - big, 2, 2, LIGHT);
    p.rect(fx - 5 - big, fy + 2 + big, 10 + big * 2, 2, BLACK);
    for (let k = 0; k < 3; k++) tri(p, [fx - 3 + k * 3, fy - 4 - big], [fx - 1 + k * 3, fy - 4 - big], [fx - 2 + k * 3, fy - 7 - big], WHITE);
  };
  fist(cx - 20, top + 28 + (s.ph % 2), 0, DARK);
  fist(s.atk ? cx + 26 : cx + 20, s.atk ? top + 20 : top + 27 - (s.ph % 2), s.atk ? 2 : 1, MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ DOOMCLOCK (tickraith)
// The grandfather clock, grown into a clock tower: a bell in its spire, a dial with a skull's
// grin, gears turning in its sides, clock-hand arms, and a pendulum that is a blade.
function doomclock(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, 0, -1, -1]);
  const cx = 26;
  const top = 4 + s.bob;
  const sw = s.atk ? 12 : [-4, -1, 4, 1][s.ph];
  // the clock-hand arms
  p.thick(cx - 9, top + 22, cx - 20, top + 30, MID, 2);
  tri(p, [cx - 20, top + 30], [cx - 24, top + 34], [cx - 18, top + 32], WHITE);
  const ax = s.atk ? cx + 26 : cx + 20;
  const ay = s.atk ? top + 14 : top + 30;
  p.thick(cx + 9, top + 22, ax, ay, MID, 2);
  tri(p, [ax - 1, ay - 2], [ax + 5, ay + (s.atk ? -3 : 3)], [ax + 1, ay + 2], WHITE);
  // gears in its sides
  const gear = (gx: number, gy: number, rr: number, rot: number) => {
    for (let k = 0; k < 8; k++) {
      const a = rot + (k / 8) * Math.PI * 2;
      p.rect(gx + Math.cos(a) * (rr + 1) - 1, gy + Math.sin(a) * (rr + 1) - 1, 2, 2, LIGHT);
    }
    p.circle(gx, gy, rr, MID);
    p.circle(gx, gy, 1, BLACK);
  };
  gear(cx - 11, top + 15, 4, s.ph * 0.4);
  gear(cx + 11, top + 37, 4, -s.ph * 0.4);
  // the case
  p.rect(cx - 9, top + 10, 18, 38, DARK);
  p.rect(cx - 11, top + 46, 22, 3, MID);
  p.rect(cx - 10, top + 10, 2, 36, MID);
  p.rect(cx + 8, top + 10, 2, 36, BLACK);
  // claw feet
  for (const dx of [-10, 7]) tri(p, [cx + dx, top + 48], [cx + dx + 4, top + 48], [cx + dx + (dx < 0 ? -2 : 6), EH - 1], LIGHT);
  // the spire with its bell
  p.poly([[cx - 10, top + 10], [cx, top - 2], [cx + 10, top + 10]], DARK);
  p.line(cx - 10, top + 10, cx, top - 2, MID);
  p.ellipse(cx, top + 5, 3, 3, LIGHT);
  p.rect(cx - 3, top + 7, 7, 1, MID);
  p.px(cx, top + 9, WHITE);
  // the dial: a skull's face
  p.circle(cx, top + 18, 7, WHITE);
  p.ring(cx, top + 18, 7, 7, MID);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.px(cx + Math.cos(a) * 6, top + 18 + Math.sin(a) * 6, k % 3 === 0 ? BLACK : MID);
  }
  glow(p, cx - 3, top + 16, 2, 2, s.hurt);
  glow(p, cx + 3, top + 16, 2, 2, s.hurt);
  for (let x = cx - 3; x <= cx + 3; x += 2) p.line(x, top + 21, x, top + 22, BLACK);
  p.line(cx - 4, top + 20, cx + 4, top + 20, BLACK);
  // the window and the pendulum blade
  p.rect(cx - 6, top + 27, 12, 17, BLACK);
  const bx = cx + Math.round(sw * 0.4), by = top + 40;
  p.line(cx, top + 27, bx, by - 3, LIGHT);
  p.poly([[bx - 5, by - 3], [bx + 5, by - 3], [bx + 3, by + 2], [bx, by + 3], [bx - 3, by + 2]], WHITE);
  p.line(bx - 4, by - 2, bx + 4, by - 2, MID);
  if (s.atk) for (let k = 0; k < 3; k++) p.line(cx + 8 + k * 3, top + 30 + k, cx + 14 + k * 3, top + 38 + k, LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ GLOWQUEEN (glowbell)
// The little jellyfish, grown into the queen of the deep: a crowned bell, a frilled skirt,
// glowing spots, and a curtain of long stinging tentacles.
function glowqueen(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -2, -1]);
  const cx = 26 + (s.atk ? 2 : 0);
  const top = 6 + s.bob;
  // tentacles, long and drifting (whipping forward when it strikes)
  for (let t = 0; t < 9; t++) {
    let x = cx - 13 + t * 3.3;
    let y = top + 20;
    for (let i = 0; i < 26; i++) {
      const wav = Math.sin(i * 0.4 + t * 0.9 + s.ph * 1.3) * 0.9;
      const nx = x + wav + (s.atk ? 0.7 : -0.15);
      const ny = y + 1;
      if (ny < EH - 1) p.px(nx, ny, i < 8 ? LIGHT : i < 18 ? MID : DARK);
      if (i % 6 === 3 && t % 2 === 0) p.px(nx, ny, WHITE);
      x = nx;
      y = ny;
    }
  }
  // two frilled oral arms
  for (const d of [-1, 1]) {
    let x = cx + d * 3, y = top + 20;
    for (let i = 0; i < 18; i++) {
      const nx = x + Math.sin(i * 0.5 + d + s.ph) * 1.5;
      p.thick(x, y, nx, y + 1, i < 9 ? WHITE : LIGHT, 2);
      x = nx;
      y += 1;
    }
  }
  // the bell
  p.ellipse(cx, top + 12, 16, 11, LIGHT);
  p.rect(cx - 16, top + 12, 33, 6, LIGHT);
  for (let k = 0; k < 8; k++) p.ellipse(cx - 14 + k * 4, top + 19, 2, 2, LIGHT);
  p.shade((x, y) => (y < top + 22 ? 1.05 - Math.hypot((x - cx + 6) / 22, (y - top - 4) / 18) : null), [MID, LIGHT, WHITE]);
  // the glowing heart inside it
  p.ellipse(cx, top + 12, 6, 4, WHITE);
  p.ring(cx, top + 12, 8, 5, MID);
  // spots of light round the rim
  for (let k = 0; k < 7; k++) p.px(cx - 12 + k * 4, top + 17, WHITE);
  // eyes
  glow(p, cx + 6, top + 8, 1, 2, s.hurt);
  glow(p, cx + 11, top + 9, 1, 2, s.hurt);
  // the crown of spines
  for (let k = 0; k < 5; k++) {
    const fx = cx - 8 + k * 4;
    tri(p, [fx - 1.5, top + 3 - Math.abs(k - 2)], [fx + 1.5, top + 3 - Math.abs(k - 2)], [fx, top - 3 - (k === 2 ? 3 : 0) + Math.abs(k - 2)], WHITE);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ ANVILJAW (hammerfin)
// The hammerhead, grown into an iron-headed brute: a hammer of riveted steel, a jaw full of
// teeth, a towering scarred fin.
function anviljaw(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -1, 0]);
  const lunge = s.atk ? 4 : s.hurt ? -3 : 0;
  const cy = 30 + s.bob;
  const tw = [0, 2, 0, -2][s.ph];
  // the tail, a crescent
  p.poly([[8 + lunge, cy - 1], [1 + lunge, cy - 14 + tw], [5 + lunge, cy], [1 + lunge, cy + 11 + tw], [8 + lunge, cy + 2]], MID);
  // the far pectoral fin
  tri(p, [26 + lunge, cy + 4], [20 + lunge, cy + 15], [31 + lunge, cy + 6], DARK);
  // the body
  p.ellipse(25 + lunge, cy, 18, 9, MID);
  // the dorsal fin, tall, with a notch torn out of it
  p.poly([[18 + lunge, cy - 7], [24 + lunge, cy - 24], [31 + lunge, cy - 7]], MID);
  p.px(23 + lunge, cy - 15, -1);
  p.px(24 + lunge, cy - 15, -1);
  p.px(23 + lunge, cy - 14, -1);
  // belly
  p.ellipse(28 + lunge, cy + 4, 13, 4, LIGHT);
  p.shade((x, y) => (y > cy - 26 && y < cy + 10 && x > lunge ? 0.9 - (y - cy + 9) / 26 : null), [DARK, MID, LIGHT]);
  p.ellipse(28 + lunge, cy + 5, 11, 3, LIGHT);
  // gills and scars
  for (let k = 0; k < 3; k++) p.line(36 + lunge + k * 2, cy - 4, 35 + lunge + k * 2, cy + 2, BLACK);
  p.line(16 + lunge, cy - 4, 22 + lunge, cy - 1, LIGHT);
  p.line(17 + lunge, cy - 1, 21 + lunge, cy - 4, LIGHT);
  // the near pectoral fin
  tri(p, [30 + lunge, cy + 3], [26 + lunge, cy + 14], [36 + lunge, cy + 5], MID);
  // the anvil head: a wide bar of iron
  const hx = 44 + lunge;
  p.poly([[hx - 3, cy - 13], [hx + 5, cy - 13], [hx + 8, cy - 9], [hx + 5, cy - 6], [hx + 5, cy + 6], [hx + 8, cy + 9], [hx + 5, cy + 13], [hx - 3, cy + 13], [hx - 1, cy + 6], [hx - 1, cy - 6]], DARK);
  p.rect(hx - 2, cy - 13, 7, 2, LIGHT);
  for (const dy of [-10, -4, 4, 10]) p.px(hx + 2, cy + dy, LIGHT);
  // eyes at both ends of the hammer
  glow(p, hx + 4, cy - 10, 1, 1, s.hurt);
  glow(p, hx + 4, cy + 10, 1, 1, s.hurt);
  // the jaw, open when it bites
  const open = s.atk ? 4 : 1;
  p.rect(hx - 6, cy + 2, 10, open + 2, BLACK);
  for (let x = hx - 5; x < hx + 4; x += 2) {
    tri(p, [x, cy + 2], [x + 2, cy + 2], [x + 1, cy + 4], WHITE);
    tri(p, [x, cy + 4 + open], [x + 2, cy + 4 + open], [x + 1, cy + 2 + open], WHITE);
  }
  if (s.atk) for (let k = 0; k < 3; k++) p.line(hx + 10, cy - 8 + k * 8, hx + 14, cy - 9 + k * 8, LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ GEYSERLOTL (bubblotl)
// The axolotl, grown into a hot-spring beast: a crown of frilled gills, a glowing lure,
// four sturdy legs, and a geyser spouting from its back.
function geyserlotl(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, 0, 1]);
  const lean = s.atk ? 2 : s.hurt ? -2 : 0;
  const cy = 36 + Math.max(-1, s.bob);
  // the geyser from its back (huge when it strikes)
  const gh = s.atk ? 30 : 14 + (s.ph % 2) * 3;
  for (let y = 0; y < gh; y++) {
    const w = 1 + Math.round(y / 6);
    for (let x = -w; x <= w; x++) if ((x + y + s.ph) % 3 !== 0 || y < 4) p.px(11 + lean + x + Math.sin(y * 0.5), cy - 6 - y, y > gh - 5 ? WHITE : (x + y) % 2 ? LIGHT : WHITE);
  }
  for (let k = 0; k < 5; k++) p.px(6 + k * 3 + lean, cy - 6 - gh + ((k * 5) % 6), WHITE);
  // the tail, finned, curling up behind
  p.poly([[10 + lean, cy - 2], [2 + lean, cy - 10 + s.ph % 2], [0 + lean, cy - 4], [8 + lean, cy + 4]], LIGHT);
  p.line(2 + lean, cy - 9, 9 + lean, cy, MID);
  // legs
  for (const [lx, d] of [[14, 0], [32, 0], [18, 1], [36, 1]] as Pt[]) {
    p.rect(lx + lean, cy + 4, 4, 10 - d, d ? MID : LIGHT);
    for (let k = 0; k < 3; k++) p.px(lx + lean + k * 2, cy + 14 - d, d ? MID : LIGHT);
  }
  // the body
  p.ellipse(22 + lean, cy, 15, 8, LIGHT);
  // the head
  p.ellipse(40 + lean, cy - 6, 10, 8, LIGHT);
  p.shade((x, y) => (y > cy - 15 && y < cy + 9 ? 1.05 - (y - cy + 12) / 24 : null), [MID, LIGHT, WHITE]);
  // spots down the back
  for (let k = 0; k < 5; k++) p.px(12 + k * 5 + lean, cy - 4 + (k % 2), MID);
  // the gills: three great frilled fronds, like a crown
  for (let k = 0; k < 3; k++) {
    const gx = 35 + lean - k * 2, gy = cy - 12 + k * 4;
    const tx = gx - 9 - k * 2, ty = gy - 10 + k * 5;
    p.thick(gx, gy, tx, ty, MID, 2);
    for (let u = 0.3; u <= 1; u += 0.25) p.px(gx + (tx - gx) * u - 1, gy + (ty - gy) * u - 1, WHITE);
  }
  // the lure, arcing out over its face
  p.line(42 + lean, cy - 14, 48 + lean, cy - 20, MID);
  p.line(48 + lean, cy - 20, 52 + lean, cy - 17, MID);
  p.circle(52 + lean, cy - 15, 2, WHITE);
  p.ring(52 + lean, cy - 15, 3 + (s.ph % 2), 3 + (s.ph % 2), LIGHT);
  // face: a wide grin and glowing eyes
  glow(p, 43 + lean, cy - 8, 1, 2, s.hurt);
  p.line(41 + lean, cy - 2, 49 + lean, cy - 3, BLACK);
  if (s.atk) p.ellipse(46 + lean, cy - 1, 3, 1, BLACK);
  // steam off its skin
  for (let k = 0; k < 3; k++) p.px(26 + k * 6 + lean, cy - 10 - ((s.ph + k) % 3), LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ ECLIPSERAY (glidray)
// The ray, grown into a living eclipse: vast wings scattered with stars, a black sun with a
// burning ring on its back, curled horns and a long barbed tail.
function eclipseray(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -2, -1]);
  const cx = 26 + (s.atk ? 3 : s.hurt ? -2 : 0);
  const cy = 26 + s.bob;
  // the wingbeat: tips lift and fall (seen from above, the wings fold toward each other)
  const fl = s.atk ? 4 : s.hurt ? -2 : [0, 2, 3, 1][s.ph];
  // the tail, long, whipping behind
  let tx = cx - 10, ty = cy;
  for (let i = 0; i < 16; i++) {
    const nx = tx - 1.3;
    const ny = ty + Math.sin(i * 0.5 + s.ph) * 0.9;
    p.px(nx, ny, i < 8 ? MID : DARK);
    p.px(nx, ny + 1, DARK);
    tx = nx;
    ty = ny;
  }
  tri(p, [tx, ty - 2], [tx - 5, ty], [tx, ty + 3], WHITE);
  // the wings: a broad diamond, leading edges curved forward
  const wing = (d: number) => {
    const tipY = cy + d * (22 - fl);
    p.poly([[cx + 12, cy], [cx + 8, cy + d * 8], [cx + 1, cy + d * 14], [cx - 7, tipY], [cx - 8, cy + d * (14 - fl)], [cx - 12, cy + d * 3], [cx - 12, cy]], d < 0 ? MID : DARK);
  };
  wing(1);
  wing(-1);
  // the body down the middle
  p.ellipse(cx, cy, 12, 5, MID);
  p.shade((x, y) => (Math.abs(y - cy) < 24 ? 0.95 - (y - cy + 22) / 44 - Math.max(0, cx - 6 - x) / 40 : null), [DARK, MID, LIGHT]);
  // stars scattered over the wings
  const r = artRng(333);
  for (let k = 0; k < 16; k++) {
    const x = Math.round(cx - 10 + r() * 22), y = Math.round(cy - 20 + r() * 40);
    if (Math.abs(y - cy) > 5 && p.get(x, y) >= DARK) p.px(x, y, k % 3 ? LIGHT : WHITE);
  }
  // a pale edge on the leading edges
  p.line(cx + 12, cy - 1, cx + 2, cy - 15, LIGHT);
  p.line(cx + 1, cy - 14, cx - 7, cy - 22 + fl, WHITE);
  // the eclipse on its back: a black sun with a burning ring
  p.circle(cx - 3, cy, 4, BLACK);
  p.ring(cx - 3, cy, 5, 5, WHITE);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + s.ph * 0.3;
    p.px(cx - 3 + Math.cos(a) * 7, cy + Math.sin(a) * 7, LIGHT);
  }
  // the horns, curling forward from the head
  for (const d of [-1, 1]) {
    p.line(cx + 11, cy + d * 3, cx + 17, cy + d * 5, LIGHT);
    p.line(cx + 17, cy + d * 5, cx + 18, cy + d * 2, LIGHT);
  }
  // eyes on the front corners
  glow(p, cx + 10, cy - 3, 1, 1, s.hurt);
  glow(p, cx + 10, cy + 3, 1, 1, s.hurt);
  if (s.atk) {
    p.rect(cx + 17, cy - 1, 7, 2, WHITE);
    p.px(cx + 25, cy, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ SCORCHION (scorvlet)
// The little scorpion, grown into a walking furnace: plates split by magma, two crushing
// pincers, and a tail arched high over its back with a white-hot stinger.
function scorchion(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, 0, -1, -1]);
  const cy = 40 + Math.max(-1, s.bob);
  const lean = s.atk ? 3 : s.hurt ? -2 : 0;
  // legs: four a side
  for (let k = 0; k < 4; k++) {
    const lx = 14 + k * 6 + lean;
    const st = (k + s.ph) % 2;
    p.line(lx, cy, lx - 4, cy + 4 - st, MID);
    p.line(lx - 4, cy + 4 - st, lx - 5, EH - 2, MID);
    p.line(lx + 2, cy + 1, lx + 5, cy + 5, DARK);
    p.line(lx + 5, cy + 5, lx + 6, EH - 2, DARK);
  }
  // the tail, segment by segment, arching up and over
  const tip: Pt = s.atk ? [46 + lean, cy - 18] : [36 + lean, cy - 30 - (s.ph % 2)];
  const b0: Pt = [10 + lean, cy - 2];
  const ctl: Pt = [-2 + lean, cy - 40];
  for (let i = 10; i >= 0; i--) {
    const u = i / 10;
    const x = (1 - u) * (1 - u) * b0[0] + 2 * (1 - u) * u * ctl[0] + u * u * tip[0];
    const y = (1 - u) * (1 - u) * b0[1] + 2 * (1 - u) * u * ctl[1] + u * u * tip[1];
    p.circle(Math.round(x), Math.round(y), Math.round(4.5 - u * 1.8), i % 2 ? MID : LIGHT);
    if (i % 2 === 0) p.px(Math.round(x), Math.round(y), WHITE);
  }
  // the stinger: a white-hot hook
  p.poly([[tip[0] - 2, tip[1] - 3], [tip[0] + 5, tip[1] - 1], [tip[0] + 8, tip[1] + 5], [tip[0] + 2, tip[1] + 2]], WHITE);
  // the body plates
  p.ellipse(24 + lean, cy - 3, 14, 6, DARK);
  p.ellipse(36 + lean, cy - 4, 8, 6, DARK);
  p.shade((x, y) => (y < cy + 3 && y > cy - 11 ? 0.9 - (y - cy + 9) / 14 : null), [BLACK, DARK, MID]);
  // magma cracks between the plates
  for (let k = 0; k < 4; k++) p.line(14 + k * 6 + lean, cy - 8, 15 + k * 6 + lean, cy + 1, k % 2 ? WHITE : LIGHT);
  p.line(30 + lean, cy - 9, 33 + lean, cy - 6, WHITE);
  // eyes on its head
  glow(p, 40 + lean, cy - 7, 1, 1, s.hurt);
  glow(p, 37 + lean, cy - 8, 1, 1, s.hurt);
  // the pincers (wide open to strike)
  const claw = (ax: number, ay: number, cx2: number, cy2: number, col: number) => {
    p.thick(ax, ay, cx2 - 3, cy2, col, 2);
    p.ellipse(cx2, cy2, 4, 3, col);
    const o = s.atk ? 4 : 2;
    tri(p, [cx2 + 2, cy2 - 2], [cx2 + 9, cy2 - 3 - o], [cx2 + 4, cy2], col === MID ? LIGHT : col);
    tri(p, [cx2 + 2, cy2 + 1], [cx2 + 9, cy2 + 2 + o], [cx2 + 4, cy2 + 2], col === MID ? LIGHT : col);
  };
  claw(38 + lean, cy - 1, 44 + lean + (s.atk ? 3 : 0), cy - 10, DARK);
  claw(40 + lean, cy, 46 + lean + (s.atk ? 3 : 0), cy - 2, MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ STEELWIDOW (widowling)
// The round little spider, grown into a steel widow: legs like sword blades, a white
// hourglass on its back, six burning eyes and fangs.
function steelwidow(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -1, 0]);
  const lean = s.atk ? 3 : s.hurt ? -2 : 0;
  const cy = 28 + s.bob;
  // eight bladed legs (the front pair rises to strike)
  const leg = (hx: number, hy: number, kx: number, ky: number, fx: number, near: boolean) => {
    p.thick(hx, hy, kx, ky, near ? MID : DARK, 2);
    p.line(kx, ky, fx, EH - 3, near ? LIGHT : MID);
    tri(p, [fx - 1, EH - 6], [fx + 2, EH - 6], [fx, EH - 1], near ? WHITE : LIGHT);
    p.px(kx, ky, near ? WHITE : LIGHT);
  };
  for (let k = 0; k < 4; k++) {
    const st = (k + s.ph) % 2;
    const hx = 30 + lean + k * 2;
    if (k === 3 && s.atk) {
      p.thick(hx, cy, hx + 10, cy - 18, MID, 2);
      tri(p, [hx + 9, cy - 18], [hx + 12, cy - 19], [hx + 16, cy - 26], WHITE);
      continue;
    }
    leg(hx, cy + 1, 10 + k * 12 + lean - (k < 2 ? 4 : 0), cy - 14 + Math.abs(k - 1.5) * 3 - st, 4 + k * 14 + lean, k % 2 === 1);
  }
  // the abdomen
  p.ellipse(20 + lean, cy - 2, 14, 11, DARK);
  p.shade((x, y) => (x < 36 + lean && y < cy + 10 ? 0.95 - Math.hypot((x - 14 - lean) / 18, (y - cy + 10) / 16) : null), [BLACK, DARK, MID]);
  // the hourglass
  tri(p, [15 + lean, cy - 8], [25 + lean, cy - 8], [20 + lean, cy - 2], WHITE);
  tri(p, [15 + lean, cy + 4], [25 + lean, cy + 4], [20 + lean, cy - 2], WHITE);
  // steel ridges along its back
  for (let k = 0; k < 4; k++) tri(p, [10 + k * 5 + lean, cy - 11 + Math.abs(k - 1.5)], [13 + k * 5 + lean, cy - 11 + Math.abs(k - 1.5)], [11 + k * 5 + lean, cy - 15 + Math.abs(k - 1.5)], LIGHT);
  // the head
  p.ellipse(36 + lean, cy + 2, 7, 6, MID);
  p.ellipse(35 + lean, cy, 5, 3, LIGHT);
  // six eyes
  for (const [ex, ey] of [[37, -1], [41, 0], [38, 2], [42, 3], [34, 1], [40, -3]] as Pt[]) {
    if (s.hurt) p.px(ex + lean, cy + ey, BLACK);
    else {
      p.px(ex + lean, cy + ey, WHITE);
      p.px(ex + lean - 1, cy + ey, BLACK);
    }
  }
  // fangs
  tri(p, [39 + lean, cy + 6], [42 + lean, cy + 6], [42 + lean, cy + 11 + (s.atk ? 1 : 0)], WHITE);
  tri(p, [36 + lean, cy + 7], [38 + lean, cy + 7], [38 + lean, cy + 11], LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ IRONBLOOM (ironbud)
// The little knight, grown into a champion in full plate: a flower blooming from its helm,
// petal pauldrons, a tower shield with a rose on it, and a great flanged mace.
function ironbloom(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, 0, -1, -1]);
  const cx = 24 + (s.atk ? 2 : s.hurt ? -2 : 0);
  const top = 6 + s.bob;
  // the cape, behind
  p.poly([[cx - 6, top + 14], [cx + 4, top + 14], [cx + 2, top + 40], [cx - 13, top + 42 + (s.ph % 2)]], DARK);
  // the mace, over its shoulder (brought down when it strikes)
  const mx = s.atk ? cx + 26 : cx - 12;
  const my = s.atk ? top + 30 : top + 2;
  p.thick(cx - 3, top + 22, mx, my, MID, 2);
  p.circle(mx, my, 5, MID);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    tri(p, [mx + Math.cos(a) * 3 - 1, my + Math.sin(a) * 3], [mx + Math.cos(a) * 3 + 1, my + Math.sin(a) * 3], [mx + Math.cos(a) * 8, my + Math.sin(a) * 8], LIGHT);
  }
  p.px(mx - 1, my - 1, WHITE);
  // legs in greaves
  p.rect(cx - 6, top + 32, 5, 12, MID);
  p.rect(cx + 2, top + 32, 5, 12, MID);
  p.rect(cx - 7, top + 43, 7, 3, LIGHT);
  p.rect(cx + 2, top + 43, 8, 3, LIGHT);
  p.rect(cx - 6, top + 36, 5, 1, DARK);
  p.rect(cx + 2, top + 36, 5, 1, DARK);
  // the breastplate
  p.poly([[cx - 9, top + 14], [cx + 9, top + 14], [cx + 8, top + 30], [cx, top + 34], [cx - 8, top + 30]], MID);
  p.shade((x, y) => (y > top + 13 && y < top + 35 && Math.abs(x - cx) < 10 ? 1 - (x - cx + 9) / 20 : null), [DARK, MID, LIGHT, WHITE]);
  p.line(cx, top + 15, cx, top + 32, DARK);
  p.rect(cx - 8, top + 28, 17, 2, DARK);
  // petal pauldrons
  for (const [px0, d] of [[cx - 9, -1], [cx + 9, 1]] as Pt[]) {
    for (let k = 0; k < 3; k++) p.ellipse(px0 + d * (k - 1) * 2, top + 13 + k * 2, 4 - k, 2, k === 0 ? LIGHT : MID);
  }
  // the helm
  p.ellipse(cx, top + 8, 7, 7, MID);
  p.rect(cx - 7, top + 8, 15, 5, MID);
  p.shade((x, y) => (y < top + 14 && y > top && Math.abs(x - cx) < 9 ? 1 - (x - cx + 6) / 16 : null), [DARK, MID, LIGHT, WHITE]);
  // the visor: a slit with burning eyes
  p.rect(cx - 1, top + 7, 9, 3, BLACK);
  if (!s.hurt) {
    p.px(cx + 2, top + 8, WHITE);
    p.px(cx + 6, top + 8, WHITE);
  } else p.line(cx, top + 8, cx + 7, top + 8, DARK);
  for (let k = 0; k < 3; k++) p.px(cx + 2 + k * 2, top + 11, BLACK);
  // the flower blooming from the crest
  const fx = cx - 1, fy = top - 1;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    p.ellipse(Math.round(fx + Math.cos(a) * 3), Math.round(fy + Math.sin(a) * 3), 2, 2, WHITE);
  }
  p.circle(fx, fy, 1, MID);
  p.line(fx, fy + 2, fx, top + 2, DARK);
  // the tower shield, in front, with a rose
  const shx = cx + 10, shy = top + 16;
  p.poly([[shx, shy], [shx + 9, shy], [shx + 9, shy + 18], [shx + 4.5, shy + 24], [shx, shy + 18]], s.atk ? DARK : LIGHT);
  p.rect(shx, shy, 10, 2, WHITE);
  p.line(shx + 9, shy, shx + 9, shy + 18, MID);
  p.circle(shx + 5, shy + 9, 3, MID);
  p.ring(shx + 5, shy + 9, 3, 3, WHITE);
  p.px(shx + 5, shy + 9, WHITE);
  p.line(shx + 5, shy + 12, shx + 5, shy + 18, MID);
  p.px(shx + 4, shy + 15, MID);
  p.outline(BLACK);
  return p;
}

const EVO: Record<string, (f: number) => PC> = {
  booheet: bansheet,
  shipwraith: dreadhull,
  hauntcorn: scarecrown,
  umbrawl: stormbrawl,
  tickraith: doomclock,
  glowbell: glowqueen,
  hammerfin: anviljaw,
  bubblotl: geyserlotl,
  glidray: eclipseray,
  scorvlet: scorchion,
  widowling: steelwidow,
  ironbud: ironbloom,
};

const cache = new Map<string, PC[]>();

/** The evolved form's six frames (0-3 idle, 4 attack, 5 hurt), 56x52, facing right. */
export function evoFrames(id: string): PC[] | null {
  const d = EVO[id];
  if (!d) return null;
  let c = cache.get(id);
  if (!c) {
    c = [0, 1, 2, 3, 4, 5].map((f) => d(f));
    cache.set(id, c);
  }
  return c;
}
