import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng, bayer, type Pt } from '../../gfx/pixel';
import { upscale, stand } from '../../gfx/artW5';
import { halo, edges, bbox } from '../../gfx/artFinal';

// ROGUELIKE: the evolved forms of the six spirits the story never supercharges (Flamora and
// the dungeon's own five). Same rules as the story's evolved forms (gfx/artEvo): native 56x52,
// standing on the bottom edge, facing right, frames 0-3 idle, 4 attack, 5 hurt. Each one is
// the little creature grown: the same idea, bigger, older, far more dangerous. In battle they
// wear the Reaper's domain on them: a pale soul-fire, and souls rising off them.

const EW = 56;
const EH = 52;

type Pose = { atk: boolean; hurt: boolean; ph: number; bob: number };
const poseOf = (f: number, bobs = [0, -1, -2, -1]): Pose => ({ atk: f === 4, hurt: f === 5, ph: f % 4, bob: f === 4 ? -1 : f === 5 ? 1 : bobs[f % 4] });
const tri = (p: PC, a: Pt, b: Pt, c: Pt, col: number) => p.poly([a, b, c], col);

/** A glowing eye: a black socket with a white light in it (a slit when hurt). */
function glow(p: PC, x: number, y: number, w: number, h: number, hurt: boolean) {
  if (hurt) return void p.line(x - w, y, x + w, y + 1, BLACK);
  p.ellipse(x, y, w, h, BLACK);
  p.px(x, y, WHITE);
  if (h > 1) p.px(x, y - 1, WHITE);
}

// ------------------------------------------------------------------ SOLARIS (flamora)
// The fire bird, become a second sun: a burning disc behind its head, wings of flame feathers
// spread wide, and tail plumes that trail fire down to the floor.
function solaris(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f);
  const lean = s.atk ? 3 : s.hurt ? -2 : 0;
  const cx = 26 + lean;
  const cy = 28 + s.bob;
  // the sun disc behind it
  if (!s.hurt) {
    p.ring(cx + 2, cy - 8, 11, 11, LIGHT);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + s.ph * 0.13;
      const r0 = 12, r1 = k % 2 ? 15 : 17;
      p.line(Math.round(cx + 2 + Math.cos(a) * r0), Math.round(cy - 8 + Math.sin(a) * r0), Math.round(cx + 2 + Math.cos(a) * r1), Math.round(cy - 8 + Math.sin(a) * r1), k % 2 ? MID : LIGHT);
    }
  }
  // tail plumes, streaming down and back to the floor
  for (let k = 0; k < 4; k++) {
    const sw = Math.sin(s.ph * 1.5 + k) * 2;
    p.thick(cx - 4, cy + 10, cx - 14 - k * 4 + sw, EH - 2 - k, k % 2 ? LIGHT : WHITE, 2);
    tri(p, [cx - 16 - k * 4 + sw, EH - 4 - k], [cx - 12 - k * 4 + sw, EH - 4 - k], [cx - 18 - k * 4 + sw, EH - 9 - k], MID);
  }
  // the wings: raised high behind it (swept forward when it strikes, drooping when hurt), each a
  // solid fan whose trailing edge breaks into flame feathers
  const wing = (near: boolean) => {
    const up = s.atk ? 2 : s.hurt ? 9 : [0, -2, -3, -1][s.ph];
    const fwd = s.atk ? 14 : s.hurt ? -4 : 0;
    const sx = cx + (near ? 2 : -2), sy = cy + 2;
    const tip: Pt = [cx + (near ? -6 : -16) + fwd, cy - 22 + up + (near ? -2 : 0)];
    // the leading edge, then the feathers back down to the shoulder
    const feathers: Pt[] = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      feathers.push([Math.round(tip[0] - 4 + t * (sx - 6 - tip[0] + 4) - Math.sin(t * Math.PI) * 5), Math.round(tip[1] + t * (sy + 6 - tip[1]))]);
    }
    p.poly([[sx, sy], [sx + (near ? 1 : -1), sy - 8 + up / 2], tip, ...feathers], near ? WHITE : LIGHT);
    p.shade((x, y) => (Math.abs(x - (tip[0] + sx) / 2) < 14 && y < sy + 7 && y > tip[1] - 2 && p.get(x, y) === (near ? WHITE : LIGHT) ? (near ? 1 : 0.62) - (y - tip[1]) / 70 : null), [MID, LIGHT, WHITE]);
    for (const [x, y] of feathers.slice(0, 4)) tri(p, [x - 1, y - 1], [x + 1, y + 1], [x - 4, y + 1 + ((s.ph + x) % 2)], near ? LIGHT : MID);
    p.line(sx, sy, tip[0], tip[1], near ? WHITE : LIGHT);
  };
  wing(false);
  // the body, white-hot
  p.ellipse(cx, cy + 6, 7, 9, WHITE);
  p.shade((x, y) => (Math.hypot((x - cx) / 7, (y - cy - 6) / 9) <= 1 ? 1 - Math.max(0, (x - cx) / 9) - Math.max(0, (y - cy - 8) / 14) : null), [MID, LIGHT, WHITE]);
  // the near wing over it
  wing(true);
  // neck and head, with a crest of three flames
  const hx = cx + 6 + (s.atk ? 3 : 0), hy = cy - 6;
  p.thick(cx + 2, cy, hx, hy + 2, WHITE, 3);
  p.ellipse(hx, hy, 4, 4, WHITE);
  for (let k = 0; k < 3; k++) tri(p, [hx - 3 + k * 2, hy - 3], [hx - 1 + k * 2, hy - 3], [hx - 5 + k * 2, hy - 9 - (k === 1 ? 2 : 0) - ((s.ph + k) % 2)], k === 1 ? WHITE : LIGHT);
  // the beak, open to cry when it strikes
  tri(p, [hx + 3, hy - 1], [hx + 3, hy + 2], [hx + 9, hy + (s.atk ? -1 : 1)], LIGHT);
  if (s.atk) tri(p, [hx + 3, hy + 2], [hx + 3, hy + 3], [hx + 8, hy + 5], MID);
  glow(p, hx + 1, hy - 1, 1, 1, s.hurt);
  // talons
  p.line(cx - 2, cy + 15, cx - 3, cy + 19, MID);
  p.line(cx + 2, cy + 15, cx + 3, cy + 19, MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ SMOGLORD (sootwick)
// The scrap of soot under a chimney pot, become a smoke giant risen out of a brick chimney
// stack: shoulders of black cloud, two coal eyes, and a crown of fire where the ember was.
function smoglord(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, -1, -1, 0]);
  const lean = s.atk ? 3 : s.hurt ? -2 : 0;
  const cx = 26;
  // the chimney stack it stands in: bricks, a fat rim, a crack running down
  const sx = cx - 9, sy = 34;
  p.rect(sx, sy, 18, EH - sy, MID);
  for (let y = sy; y < EH; y++)
    for (let x = sx; x < sx + 18; x++) {
      const row = Math.floor((y - sy) / 3);
      if ((y - sy) % 3 === 0 || (x - sx + (row % 2) * 3) % 6 === 0) p.px(x, y, DARK);
      else if (x < sx + 4) p.px(x, y, LIGHT);
    }
  p.rect(sx - 2, sy - 3, 22, 3, LIGHT);
  p.rect(sx - 2, sy - 3, 22, 1, WHITE);
  p.line(sx + 13, sy, sx + 11, sy + 6, BLACK);
  p.line(sx + 11, sy + 6, sx + 13, sy + 11, BLACK);
  // the smoke body rising out of it: a pile of billows, widest at the shoulders
  const r = artRng(707);
  const blobs: [number, number, number][] = [[0, -6, 9], [-7, -12, 7], [7, -12, 7], [0, -18, 8], [-11, -20, 5], [11, -21, 5], [-4, -26, 5], [5, -26, 5]];
  for (const [dx, dy, rad] of blobs) {
    const wob = Math.round(Math.sin(s.ph * 1.4 + dx) * 1);
    p.ellipse(cx + dx + Math.round((lean * -dy) / 26), sy + dy + s.bob + wob, rad, rad - 1, DARK);
  }
  p.shade((x, y) => (y < sy ? 0.55 - (x - cx) / 40 - (y - sy + 30) / 120 + (r() < 0.04 ? 0.25 : 0) : null), [BLACK, DARK, MID]);
  // smoke arms, reaching (one flung forward to strike)
  const ay = sy - 16 + s.bob;
  p.thick(cx - 12, ay, cx - 20, ay + 10, DARK, 4);
  p.ellipse(cx - 21, ay + 11, 3, 3, MID);
  const hx = s.atk ? cx + 25 : cx + 18, hy = s.atk ? ay - 2 : ay + 9;
  p.thick(cx + 12 + lean, ay, hx, hy, DARK, 4);
  p.ellipse(hx + 1, hy, 4, 3, MID);
  for (let k = -1; k <= 1; k++) p.px(hx + 4, hy + k * 2, LIGHT);
  // the face: two coals and a furnace grin
  const fx = cx + 2 + lean, fy = sy - 19 + s.bob;
  if (s.hurt) {
    p.line(fx - 5, fy, fx - 2, fy + 1, WHITE);
    p.line(fx + 2, fy + 1, fx + 5, fy, WHITE);
  } else {
    p.ellipse(fx - 3, fy, 2, 2, WHITE);
    p.ellipse(fx + 4, fy, 2, 2, WHITE);
    p.px(fx - 3, fy + 1, LIGHT);
    p.px(fx + 4, fy + 1, LIGHT);
  }
  p.rect(fx - 3, fy + 5, 8, s.atk ? 3 : 1, s.atk ? WHITE : LIGHT);
  // the crown of fire
  const ty = sy - 33 + s.bob;
  for (let k = 0; k < 5; k++) {
    const x = cx - 8 + k * 4 + lean;
    const h = 5 + (k === 2 ? 4 : k % 2 ? 2 : 0) + ((s.ph + k) % 2);
    tri(p, [x - 2, ty + 3], [x + 2, ty + 3], [x, ty + 3 - h], k === 2 ? WHITE : LIGHT);
  }
  // embers drifting up
  for (let k = 0; k < 4; k++) p.px(cx - 10 + k * 7 + ((s.ph + k) % 3), ty - 6 - ((s.ph * 3 + k * 5) % 7), k % 2 ? WHITE : LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ TINGENERAL (tintrick)
// The little wind-up soldier, become a general of tin: a towering plumed shako, a greatcoat
// hung with medals, a cavalry sabre, and a key in its back the size of a ship's wheel.
function tingeneral(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f, [0, 0, -1, -1]);
  const tilt = s.atk ? 3 : s.hurt ? -3 : [0, 1, 0, -1][s.ph];
  const cx = 26;
  const feet = EH - 1;
  const hip = feet - 14;
  const sh = hip - 15;
  const tx = (y: number) => cx + Math.round((tilt * (feet - y)) / 36);
  // the great key in its back
  const kx = tx(sh + 6) - 12, ky = sh + 7;
  p.rect(kx + 3, ky - 1, 6, 3, LIGHT);
  const turn = s.atk ? 1 : s.hurt ? 0 : s.ph % 2;
  if (turn === 0) {
    p.ring(kx, ky - 5, 4, 4, WHITE);
    p.ring(kx, ky + 6, 4, 4, WHITE);
    p.rect(kx - 1, ky - 1, 3, 3, WHITE);
  } else {
    p.ellipse(kx, ky, 2, 9, WHITE);
    p.ellipse(kx, ky, 1, 7, MID);
  }
  // the greatcoat's tails, behind
  p.poly([[tx(hip) - 8, hip - 2], [tx(hip) + 2, hip - 2], [tx(hip) - 2, hip + 9], [tx(hip) - 12, hip + 10]], DARK);
  // legs and tall boots
  p.thick(tx(hip) - 4, hip, cx - 6 - (s.atk ? 5 : 0), feet - 4, LIGHT, 4);
  p.thick(tx(hip) + 4, hip, cx + 5 + (s.atk ? 6 : 1), feet - 4, MID, 4);
  p.rect(cx - 10 - (s.atk ? 5 : 0), feet - 5, 8, 5, BLACK);
  p.rect(cx + 3 + (s.atk ? 6 : 1), feet - 5, 8, 5, BLACK);
  p.px(cx - 9 - (s.atk ? 5 : 0), feet - 5, MID);
  // the coat
  for (let y = sh; y <= hip; y++) {
    const w = 8 + Math.round((y - sh) / 5);
    for (let x = -w; x <= w; x++) p.px(tx(y) + x, y, x > w - 4 ? MID : x < -w + 3 ? WHITE : LIGHT);
  }
  // a sash across it and a row of brass buttons
  for (let i = 0; i <= 14; i++) p.thick(tx(sh + i) - 8 + i, sh + i, tx(sh + i) - 7 + i, sh + i + 1, DARK, 1);
  for (let i = 0; i < 4; i++) p.px(tx(sh + 3 + i * 3) + 3, sh + 3 + i * 3, WHITE);
  // medals
  for (let i = 0; i < 3; i++) {
    p.rect(tx(sh + 4) - 6 + i * 3, sh + 3, 2, 3, i === 1 ? WHITE : LIGHT);
    p.px(tx(sh + 4) - 6 + i * 3, sh + 6, i % 2 ? MID : WHITE);
  }
  p.rect(tx(hip) - 9, hip - 1, 19, 2, DARK);
  // great fringed epaulettes
  for (const [dx, c] of [[-11, WHITE], [8, LIGHT]] as Pt[]) {
    p.rect(tx(sh) + dx, sh - 2, 5, 3, c);
    for (let k = 0; k < 5; k += 2) p.px(tx(sh) + dx + k, sh + 1, MID);
  }
  // head and the towering shako, plume and all
  const hx = tx(sh - 7), hy = sh - 7;
  p.ellipse(hx, hy, 6, 6, WHITE);
  p.rect(hx + 3, hy - 2, 3, 6, LIGHT);
  const hatTop = hy - 20;
  for (let y = hatTop; y <= hy - 4; y++) {
    const w = 6 + (y > hy - 8 ? 1 : 0) - (y < hatTop + 3 ? 1 : 0);
    for (let x = -w; x <= w; x++) p.px(tx(y - 4) + x, y, x > 3 ? BLACK : DARK);
  }
  p.rect(tx(hy - 8) - 7, hy - 6, 15, 2, WHITE);
  p.rect(tx(hy - 8) - 7, hatTop + 2, 14, 1, LIGHT);
  p.rect(tx(hy - 8) + 3, hy - 4, 6, 1, DARK);
  // the badge: a star
  p.stamp(['.4.', '444', '.4.'], tx(hatTop) - 1, hatTop + 6);
  // the plume, tall and nodding
  for (let k = 0; k < 7; k++) p.ellipse(tx(hatTop) + Math.round(Math.sin(k * 0.6 + s.ph) * 1) - Math.round(k / 3), hatTop - 2 - k, 2, 1, k % 2 ? LIGHT : WHITE);
  // a painted face: stern now
  if (s.hurt) {
    p.line(hx, hy - 1, hx + 2, hy, BLACK);
    p.line(hx + 4, hy, hx + 5, hy - 1, BLACK);
  } else {
    p.rect(hx + 1, hy - 1, 1, 2, BLACK);
    p.rect(hx + 4, hy - 1, 1, 2, BLACK);
    p.line(hx, hy - 3, hx + 2, hy - 2, BLACK);
    p.line(hx + 3, hy - 2, hx + 5, hy - 3, BLACK);
  }
  p.rect(hx + 1, hy + 3, s.atk ? 3 : 4, s.atk ? 2 : 1, BLACK);
  // a moustache, waxed
  p.line(hx, hy + 2, hx + 5, hy + 2, DARK);
  // the sabre: raised high, or brought down in a great cut
  const ax = tx(sh + 2) + 8, ay = sh + 3;
  if (s.atk) {
    p.thick(ax - 2, ay, ax + 6, ay + 6, LIGHT, 2);
    p.thick(ax + 6, ay + 6, ax + 26, ay + 10, WHITE, 2);
    p.rect(ax + 4, ay + 4, 3, 4, MID);
  } else {
    p.thick(ax - 2, ay, ax + 4, ay - 6, LIGHT, 2);
    const t = s.hurt ? 6 : 0;
    p.rect(ax + 2, ay - 9, 5, 2, MID);
    p.thick(ax + 4, ay - 9, ax + 10 + t, ay - 26 + t, WHITE, 2);
    p.px(ax + 11 + t, ay - 27 + t, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ REQUIEMBELL (mourningbell)
// The cracked bell, become a belfry that floats: a great bell hung in an arch of black stone,
// two small bells beside it, a ghost clapper the size of a person, and sound pouring out.
function requiembell(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f);
  const swing = s.atk ? 5 : s.hurt ? -3 : [0, 2, 0, -2][s.ph];
  const cx = 28;
  const top = 3 + s.bob;
  // the arch it hangs in
  p.rect(cx - 21, top + 4, 4, 34, DARK);
  p.rect(cx + 17, top + 4, 4, 34, DARK);
  for (let a = 0; a <= 20; a++) {
    const t = (a / 20) * Math.PI;
    const x = Math.round(cx - Math.cos(t) * 19);
    const y = Math.round(top + 5 - Math.sin(t) * 5);
    p.rect(x - 2, y - 1, 4, 3, DARK);
  }
  p.shade((x, y) => (y < top + 40 && (Math.abs(x - cx) > 15 || y < top + 7) ? 0.3 + (x < cx ? 0.35 : 0) : null), [BLACK, DARK, MID, LIGHT]);
  // a small bell hanging from each pillar
  for (const side of [-1, 1]) {
    const bx = cx + side * 19 + Math.round(swing / 2), by = top + 40;
    p.ellipse(bx, by, 3, 4, LIGHT);
    p.rect(bx - 4, by + 3, 9, 1, MID);
  }
  const lipY = top + 34;
  const bx = (y: number) => cx + Math.round((swing * (y - top)) / 34);
  // the clapper: a ghost hanging out of the mouth
  const gx = cx - Math.round(swing * 1.4), gy = lipY + 6;
  p.line(bx(lipY - 8), lipY - 8, gx, gy - 4, LIGHT);
  p.ellipse(gx, gy, 5, 6, WHITE);
  for (let x = gx - 5; x <= gx + 5; x++) {
    const wy = gy + 7 + Math.round(Math.sin(x * 1.2 + s.ph * 1.6) * 1.5);
    for (let y = gy + 2; y <= Math.min(EH - 1, wy); y++) p.px(x, y, WHITE);
  }
  if (s.hurt) p.line(gx - 2, gy - 1, gx + 2, gy - 1, BLACK);
  else {
    p.rect(gx - 2, gy - 2, 1, 3, BLACK);
    p.rect(gx + 2, gy - 2, 1, 3, BLACK);
  }
  if (s.atk) p.ellipse(gx, gy + 3, 1, 2, BLACK);
  // the great bell
  p.ring(bx(top + 3), top + 4, 3, 3, LIGHT);
  for (let y = top + 7; y <= lipY; y++) {
    const t = (y - top - 7) / (lipY - top - 7);
    const w = Math.round(7 + 7 * Math.sqrt(t) + (t > 0.8 ? (t - 0.8) * 30 : 0));
    for (let x = -w; x <= w; x++) p.px(bx(y) + x, y, MID);
  }
  p.shade((x, y) => {
    if (y < top + 7 || y > lipY || Math.abs(x - cx) > 22) return null;
    const t = (y - top - 7) / (lipY - top - 7);
    const w = 7 + 7 * Math.sqrt(t) + (t > 0.8 ? (t - 0.8) * 30 : 0);
    return 0.95 - Math.abs((x - bx(y)) / w + 0.35) * 0.75;
  }, [DARK, MID, LIGHT, WHITE]);
  for (const yy of [top + 12, top + 15, lipY - 6]) {
    const t = (yy - top - 7) / (lipY - top - 7);
    const w = Math.round(7 + 7 * Math.sqrt(t));
    p.rect(bx(yy) - w, yy, w * 2 + 1, 1, DARK);
  }
  p.rect(bx(lipY) - 19, lipY, 39, 1, DARK);
  p.rect(bx(lipY + 1) - 18, lipY + 1, 37, 1, BLACK);
  // engraved skulls on the band, and the old crack, wider now, glowing from inside
  for (const ex of [-6, 0, 6]) p.stamp(['.0.', '000', '.0.'], bx(top + 22) + ex - 1, top + 21);
  const c0 = bx(lipY) + 6;
  const crack: Pt[] = [[c0, lipY], [c0 - 3, lipY - 5], [c0 + 1, lipY - 10], [c0 - 2, lipY - 15], [c0 + 2, lipY - 20]];
  for (let i = 0; i < crack.length - 1; i++) {
    p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], BLACK);
    p.line(crack[i][0] + 1, crack[i][1], crack[i + 1][0] + 1, crack[i + 1][1], WHITE);
  }
  // eyes cast into the bronze
  glow(p, bx(top + 16) - 5, top + 16, 1, 2, s.hurt);
  glow(p, bx(top + 16) + 1, top + 16, 1, 2, s.hurt);
  // the toll: rings of sound
  if (s.atk || s.ph % 2 === 1) {
    for (let k = 0; k < (s.atk ? 3 : 2); k++) {
      const r = 4 + k * 4;
      for (let a = -4; a <= 4; a++) {
        const dx = Math.round(Math.sqrt(Math.max(0, r * r - a * a)) / 1.5);
        p.px(Math.min(EW - 1, cx + 23 + k * 3 + dx), lipY - 10 + a * 2, k ? MID : WHITE);
      }
    }
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ LOOMWRAITH (stitchwraith)
// The patchwork puppet, become the one who holds the strings: a tall wraith of quilted
// cloth under a wooden cross-bar, threads running from it to everything, needles for fingers.
function loomwraith(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f);
  const sway = s.atk ? 3 : s.hurt ? -3 : [0, 1, 0, -1][s.ph];
  const cx = 26 + Math.round(sway / 2);
  const headY = 15 + s.bob;
  const sh = headY + 8;
  const hem = EH - 3;
  // the cross-bar above it, and the threads it hangs from
  const barY = 3 + s.bob;
  p.rect(cx - 15, barY, 31, 3, MID);
  p.rect(cx - 15, barY, 31, 1, LIGHT);
  p.rect(cx - 2, barY - 3, 4, 9, DARK);
  for (const [x0, y0] of [[cx - 14, sh + 2], [cx + 14, sh + 2], [cx, headY - 7]] as Pt[]) {
    const tx = x0 < cx ? cx - 13 : x0 > cx ? cx + 13 : cx;
    for (let y = barY + 3; y < y0; y++) if (y % 3 !== 2) p.px(tx + Math.round(((x0 - tx) * (y - barY)) / (y0 - barY)), y, LIGHT);
  }
  // the long quilted body, flaring to a tattered hem
  for (let y = sh; y <= hem; y++) {
    const t = (y - sh) / (hem - sh);
    const w = Math.round(8 + t * 8);
    const mid = cx + Math.round(sway * t * 0.7);
    for (let x = -w; x <= w; x++) {
      const qx = Math.floor((x + 20) / 5), qy = Math.floor((y - sh) / 5);
      const patch = (qx * 7 + qy * 3) % 4;
      let c = [WHITE, LIGHT, MID, LIGHT][patch];
      if (patch === 2 && (x + y) % 2 === 0) c = DARK;
      if (patch === 3 && y % 3 === 0) c = MID;
      p.px(mid + x, y, c);
    }
  }
  // stitches along the quilt seams
  for (let y = sh + 5; y <= hem; y += 5) for (let x = cx - 14; x <= cx + 14; x += 2) if (p.get(x, y) >= 0) p.px(x, y, BLACK);
  for (let x = cx - 15; x <= cx + 16; x += 5) for (let y = sh; y <= hem; y += 2) if (p.get(x, y) >= 0) p.px(x, y, BLACK);
  // tattered hem
  for (let x = cx - 16; x <= cx + 18; x++) {
    const d = Math.round(Math.abs(Math.sin(x * 1.3 + s.ph)) * 3);
    if (d === 3) for (let y = hem - 2; y <= hem; y++) p.data[y * EW + x] = -1;
  }
  // arms: long, jointed, each finger a needle
  const arm = (side: number, reach: boolean) => {
    const a0: Pt = [cx + side * 9, sh + 1];
    const a1: Pt = reach ? [cx + side * 17, sh + 1] : [cx + side * 15, sh + 9];
    const a2: Pt = reach ? [cx + side * 23, sh - 4] : [cx + side * 16, sh + 18];
    p.thick(a0[0], a0[1], a1[0], a1[1], LIGHT, 2);
    p.thick(a1[0], a1[1], a2[0], a2[1], WHITE, 2);
    p.px(a1[0], a1[1], BLACK);
    for (let k = -1; k <= 1; k++) p.line(a2[0], a2[1], a2[0] + side * 4, a2[1] + k * 2 + (reach ? -1 : 3), k ? LIGHT : WHITE);
    if (reach) for (let k = -1; k <= 1; k++) p.line(a2[0] + side * 4, a2[1] + k * 2 - 1, side > 0 ? EW - 1 : 0, a2[1] + k * 7, MID);
  };
  arm(-1, false);
  arm(1, s.atk);
  // the head: a stuffed sack under a wide-brimmed cap of patchwork, one button eye blazing
  const hx = cx + Math.round(sway * 0.3);
  p.ellipse(hx, headY, 8, 7, WHITE);
  p.shade((x, y) => (Math.hypot((x - hx) / 8, (y - headY) / 7) <= 1 ? 0.95 - Math.max(0, x - hx) * 0.06 : null), [LIGHT, WHITE]);
  p.rect(hx - 10, headY - 6, 21, 2, DARK);
  p.poly([[hx - 7, headY - 6], [hx + 7, headY - 6], [hx + 2, headY - 13], [hx - 4, headY - 12]], MID);
  p.px(hx + 2, headY - 13, LIGHT);
  if (s.hurt) {
    p.stamp(['0.0', '.0.', '0.0'], hx + 1, headY - 2);
    p.stamp(['0.0', '.0.', '0.0'], hx - 5, headY - 2);
  } else {
    p.ellipse(hx + 3, headY - 1, 3, 3, BLACK);
    p.ellipse(hx + 3, headY - 1, 1, 1, WHITE);
    p.rect(hx - 6, headY - 1, 5, 1, BLACK);
    p.px(hx - 5, headY - 2, BLACK);
    p.px(hx - 3, headY, BLACK);
  }
  p.rect(hx - 3, headY + 4, s.atk ? 8 : 7, 1, BLACK);
  for (let x = hx - 3; x < hx + 4; x += 2) {
    p.px(x, headY + 3, BLACK);
    p.px(x, headY + 5, BLACK);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ VOIDTHRONE (nullcrown)
// The crown with no kingdom, become a king of nothing: a throne-back of shadow rising behind
// it, a mantle that fills the room, the crown mended with darkness, and a sceptre of void.
function voidthrone(f: number): PC {
  const p = new PC(EW, EH);
  const s = poseOf(f);
  const cx = 27;
  const face = 17 + s.bob;
  const collar = face + 10;
  // the throne-back: a tall spired silhouette behind everything
  for (let y = 4; y < EH - 4; y++) {
    const w = y < 10 ? 3 + Math.floor((y - 4) / 2) : 13;
    for (let x = -w; x <= w; x++) p.px(cx + x, y, BLACK);
  }
  for (const dx of [-13, 13]) tri(p, [cx + dx - 2, 12], [cx + dx + 2, 12], [cx + dx, 4], BLACK);
  p.shade((x, y) => (Math.abs(x - cx) === 12 || y === 10 ? 0.6 : 0.12), [BLACK, DARK]);
  // the mantle, spilling out across the floor
  for (let y = face - 1; y < EH; y++) {
    const t = (y - face) / (EH - face);
    const w = t < 0.12 ? 7 : Math.round(7 + 13 * Math.sin(Math.min(1, t * 2) * Math.PI * 0.5) + t * 4);
    const drift = Math.round(Math.sin(y * 0.3 + s.ph * 1.5) * (t * 2));
    for (let x = -w; x <= w; x++) {
      const X = cx + x + (t > 0.5 ? drift : 0);
      if (t > 0.7 && (X * 7 + y * 3) % 6 === 0) continue;
      p.px(X, y, DARK);
    }
  }
  p.shade((x, y) => {
    if (y < collar) return null;
    const d = Math.abs(x - cx);
    return 0.3 + ((x - cx + 20) % 5 === 0 ? 0.25 : 0) + (d > 17 ? 0.25 : 0) - Math.max(0, y - 38) * 0.012;
  }, [BLACK, DARK, MID]);
  // the ermine collar
  for (let x = cx - 12; x <= cx + 12; x++) {
    const y = collar + Math.round(Math.abs(x - cx) * 0.3);
    p.px(x, y, WHITE);
    p.px(x, y + 1, (x & 1) === 0 ? WHITE : LIGHT);
    if ((x & 3) === 1) p.px(x, y + 1, BLACK);
  }
  // the hollow and its eyes
  p.rect(cx - 6, face, 13, 9, BLACK);
  if (s.hurt) {
    p.rect(cx - 5, face + 4, 4, 1, LIGHT);
    p.rect(cx + 2, face + 4, 4, 1, LIGHT);
  } else {
    p.rect(cx - 5, face + 2 - (s.atk ? 1 : 0), 3, 4 + (s.atk ? 1 : 0), WHITE);
    p.rect(cx + 3, face + 2 - (s.atk ? 1 : 0), 3, 4 + (s.atk ? 1 : 0), WHITE);
  }
  // the crown, whole again: the broken point grown back out of darkness, a void gem in front
  const bandY = face - 5;
  for (let x = -10; x <= 10; x++) {
    const near = Math.min(...[-10, -5, 0, 5, 10].map((pk) => Math.abs(x - pk)));
    const h = x === 0 ? 10 : [7, 4, 2, 1][Math.min(3, near)];
    const dark = x >= 4 && x <= 6;
    for (let k = 1; k <= h; k++) p.px(cx + x, bandY - k, dark ? DARK : x > 6 ? LIGHT : WHITE);
    for (let y = 0; y < 4; y++) p.px(cx + x, bandY + y, y === 3 ? MID : x > 6 ? LIGHT : WHITE);
  }
  p.ellipse(cx, bandY + 1, 2, 2, BLACK);
  p.px(cx, bandY + 1, s.atk ? WHITE : MID);
  // the sceptre: a rod of shadow with a black star on top (thrust forward to strike)
  const hx = s.atk ? cx + 21 : cx + 17, hy = s.atk ? face + 6 : face + 16;
  p.ellipse(hx, hy, 3, 2, WHITE);
  const tx = s.atk ? hx + 10 : hx + 2, ty = s.atk ? hy - 6 : hy - 18;
  p.thick(hx, hy + 6, tx, ty, MID, 2);
  p.circle(tx, ty, 3, BLACK);
  p.ring(tx, ty, 4, 4, s.ph % 2 ? WHITE : LIGHT);
  // the other hand, open
  p.ellipse(cx - 18, face + 18 + [0, 1, 0, -1][s.ph], 3, 2, WHITE);
  if (s.atk)
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      if (a % 2 === 0) p.px(Math.round(tx + Math.cos(ang) * 8), Math.round(ty + Math.sin(ang) * 8), a % 4 ? LIGHT : WHITE);
    }
  p.outline(BLACK);
  return p;
}

const EVO: Record<string, (f: number) => PC> = { flamora: solaris, sootwick: smoglord, tintrick: tingeneral, mourningbell: requiembell, stitchwraith: loomwraith, nullcrown: voidthrone };
export const ROGUE_EVO_IDS = Object.keys(EVO);

/** The evolved form alone: six frames at 56x52. */
export function rogueEvoFrames(id: string): PC[] {
  return [0, 1, 2, 3, 4, 5].map((f) => EVO[id](f));
}

/**
 * The evolved form as it fights in the Reaper's domain: twice the size, its rim burning with
 * pale soul-fire, a dim halo behind it, and souls rising off it (six frames, facing right).
 */
export function rogueSuperFrames(id: string): PC[] {
  const W0 = 120, H0 = 112;
  return rogueEvoFrames(id).map((frame, f) => {
    const body = stand(upscale(frame, 2), W0, H0, 4);
    const r = artRng(9100 + f * 17 + id.length * 3);
    // the rim burns
    for (const [x, y] of edges(body)) if (bayer(x, y) < 0.55) body.px(x, y, body.get(x, y) === BLACK ? LIGHT : WHITE);
    const bb = bbox(body);
    const out = new PC(W0, H0);
    halo(out, bb.cx, bb.cy, (bb.right - bb.left) * 0.62, (bb.bot - bb.top) * 0.6, MID, 0.2);
    out.blit(body, 0, 0);
    // souls rising off it, each a small pale flame with a tail
    for (let i = 0; i < 7; i++) {
      const x = Math.round(bb.left + r() * (bb.right - bb.left));
      const span = bb.bot - bb.top + 16;
      const y = Math.round(bb.bot - ((r() * span + f * 7) % span));
      if (out.get(x, y) >= 0 && out.get(x, y) !== MID) continue;
      out.px(x, y, WHITE);
      out.px(x, y + 1, LIGHT);
      out.px(x + (i % 2 ? 1 : -1), y + 2, MID);
    }
    out.outline(BLACK);
    return out;
  });
}
