import { PC, BLACK, DARK, MID, LIGHT, WHITE, type Pt } from '../../gfx/pixel';

// ROGUELIKE: everything that fights back in the dungeon. Bottom-centred, facing LEFT (the
// party stands on the left of a battle). Four poses each: 0 at rest, 1 winding up,
// 2 striking, 3 hurt. In battle the body breathes and sways on its own, so "at rest"
// is a single frame.

type Pose = { lean: number; lift: number; hurt: boolean; wind: boolean; hit: boolean };
const pose = (f: number): Pose => ({ lean: f === 1 ? 3 : f === 2 ? -5 : f === 3 ? 4 : 0, lift: f === 1 ? -3 : f === 3 ? 2 : 0, hurt: f === 3, wind: f === 1, hit: f === 2 });

/** Eyes that glow out of a dark face; crossed out when hurt. */
function eyes(p: PC, x: number, y: number, gap: number, hurt: boolean, big = false) {
  for (const ex of [x, x + gap]) {
    if (hurt) {
      p.line(ex - 1, y - 1, ex + 1, y + 1, WHITE);
      p.line(ex - 1, y + 1, ex + 1, y - 1, WHITE);
    } else {
      p.rect(ex - 1, y - 1, 2 + (big ? 1 : 0), 2 + (big ? 1 : 0), WHITE);
      p.px(ex - 1, y, BLACK);
    }
  }
}

/** A ragged, wispy lower edge (ghosts and smoke). */
function hem(p: PC, x0: number, x1: number, y: number, c: number, depth = 4, seed = 0) {
  for (let x = x0; x <= x1; x++) {
    const d = Math.round(Math.abs(Math.sin(x * 0.9 + seed)) * depth);
    for (let j = 0; j <= d; j++) p.px(x, y + j, c);
  }
}

// ------------------------------------------------------------------ ASHBITER
// A low soot-hound with ember cracks down its back and a jaw too big for it.

function ashbiter(f: number): PC {
  const W = 44, H = 36;
  const p = new PC(W, H);
  const o = pose(f);
  const bx = 24 + o.lean, by = 22 + o.lift;
  // smoke tail curling up behind
  for (let i = 0; i < 5; i++) p.ellipse(bx + 12 + i * 2, by - 4 - i * 3, 3 - Math.floor(i / 2), 2, i > 2 ? DARK : MID);
  // legs
  for (const lx of [-9, -3, 5, 10]) p.rect(bx + lx, by + 5, 3, H - by - 6, lx % 2 ? DARK : BLACK);
  // body and head
  p.ellipse(bx, by, 13, 8, DARK);
  p.ellipse(bx - 13 + (o.hit ? -2 : 0), by - 2, 8, 7, DARK);
  p.shade((x, y) => 0.4 - (y - by) * 0.05 - (x - bx) * 0.01, [BLACK, DARK, MID]);
  // ember cracks
  for (const [cx, cy] of [[bx - 2, by - 5], [bx + 4, by - 4], [bx + 9, by - 2]] as Pt[]) {
    p.line(cx, cy, cx + 2, cy + 3, WHITE);
    p.px(cx + 1, cy + 4, LIGHT);
  }
  // the jaw
  const jx = bx - 19 + (o.hit ? -2 : 0);
  const open = o.hit ? 6 : o.wind ? 3 : 1;
  p.rect(jx, by - 1, 9, 1, BLACK);
  p.poly([[jx, by], [jx + 9, by], [jx + 8, by + open + 2], [jx + 1, by + open + 1]], BLACK);
  for (let i = 0; i < 4; i++) {
    p.px(jx + 1 + i * 2, by, WHITE);
    if (open > 1) p.px(jx + 2 + i * 2, by + open, WHITE);
  }
  eyes(p, bx - 15 + (o.hit ? -2 : 0), by - 5, 5, o.hurt);
  // ears
  p.poly([[bx - 10, by - 8], [bx - 8, by - 13], [bx - 6, by - 8]], DARK);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ BONE RUNNER
// All legs and elbows. It never stands still, even at rest.

function bonerunner(f: number): PC {
  const W = 44, H = 52;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 24 + o.lean, top = 8 + o.lift;
  // legs mid-stride
  const hip: Pt = [cx, top + 26];
  const stride = o.hit ? 9 : o.wind ? 3 : 6;
  p.thick(hip[0], hip[1], cx - stride, top + 34, LIGHT, 2);
  p.thick(cx - stride, top + 34, cx - stride - 2, H - 3, WHITE, 2);
  p.thick(hip[0], hip[1], cx + stride, top + 33, LIGHT, 2);
  p.thick(cx + stride, top + 33, cx + stride + 4, H - 3, WHITE, 2);
  p.rect(cx - stride - 5, H - 3, 5, 2, WHITE);
  p.rect(cx + stride + 3, H - 3, 5, 2, WHITE);
  // spine and ribs
  p.thick(cx, top + 12, hip[0], hip[1], LIGHT, 2);
  for (let i = 0; i < 4; i++) {
    const y = top + 14 + i * 3;
    p.line(cx - 6 + i, y, cx + 5 - i, y, WHITE);
    p.px(cx - 7 + i, y + 1, LIGHT);
  }
  p.rect(cx - 4, hip[1] - 1, 9, 3, WHITE); // pelvis
  // arms: long bone blades
  const reach = o.hit ? -16 : o.wind ? 6 : -6;
  p.thick(cx - 5, top + 14, cx - 9, top + 20, LIGHT, 2);
  p.line(cx - 9, top + 20, cx - 9 + reach, top + (o.wind ? 8 : 24), WHITE);
  p.line(cx - 9, top + 21, cx - 9 + reach, top + (o.wind ? 9 : 25), LIGHT);
  p.thick(cx + 5, top + 14, cx + 10, top + 21, LIGHT, 2);
  p.line(cx + 10, top + 21, cx + 13, top + 30, WHITE);
  // skull
  const sx = cx - 3 + (o.hit ? -3 : 0);
  p.ellipse(sx, top + 6, 6, 6, WHITE);
  p.rect(sx - 5, top + 9, 8, 4, WHITE);
  p.rect(sx + 3, top + 2, 3, 8, LIGHT);
  p.rect(sx - 4, top + 12, 7, 1, BLACK);
  for (let i = 0; i < 3; i++) p.px(sx - 3 + i * 2, top + 13, WHITE);
  if (o.hurt) {
    p.line(sx - 4, top + 4, sx - 2, top + 6, BLACK);
    p.line(sx + 1, top + 4, sx + 3, top + 6, BLACK);
  } else {
    p.rect(sx - 4, top + 4, 3, 3, BLACK);
    p.rect(sx + 1, top + 4, 3, 3, BLACK);
    p.px(sx - 3, top + 5, LIGHT);
    p.px(sx + 2, top + 5, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ MIRELING (and the Mirelets it bursts into)
// A scoop of swamp that learned to stand up.

function mireling(f: number, small = false): PC {
  const W = small ? 28 : 44, H = small ? 26 : 42;
  const k = small ? 0.6 : 1;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = W / 2 + o.lean * k, by = H - 2;
  const hgt = (small ? 17 : 28) + (o.wind ? 3 : o.hurt ? -4 : 0);
  const wid = (small ? 10 : 17) + (o.hurt ? 3 : 0);
  // the mound: wide at the base, drooping at the top
  for (let y = 0; y <= hgt; y++) {
    const t = y / hgt;
    const w = Math.round(wid * Math.sqrt(t) * (0.75 + 0.25 * t));
    const sx = Math.round(o.lean * k * (1 - t));
    for (let x = -w; x <= w; x++) p.px(cx + x + sx, by - hgt + y, MID);
  }
  p.shade((x, y) => 0.55 + (cx - x) * 0.02 - (by - y) * 0.004 + ((x * 3 + y * 5) % 7 === 0 ? -0.2 : 0), [DARK, MID, LIGHT]);
  // drips
  for (const dx of [-wid + 2, -4, 6, wid - 3]) {
    const X = Math.round(cx + dx * 0.8);
    for (let j = 0; j < 3; j++) p.px(X, by - Math.round(hgt * 0.45) + j, DARK);
  }
  // a twig and a leaf stuck in its head
  if (!small) {
    p.line(cx + 2, by - hgt - 1, cx + 6, by - hgt - 7, DARK);
    p.ellipse(cx + 8, by - hgt - 8, 3, 2, LIGHT);
  }
  // face
  const fy = by - Math.round(hgt * 0.62);
  const fx = cx - Math.round(4 * k) + Math.round(o.lean * k * 0.5);
  if (o.hurt) {
    p.rect(fx - 3, fy, 3, 1, BLACK);
    p.rect(fx + 3, fy, 3, 1, BLACK);
  } else {
    p.ellipse(fx - 2, fy, small ? 1 : 2, small ? 2 : 3, BLACK);
    p.ellipse(fx + (small ? 3 : 5), fy, small ? 1 : 2, small ? 2 : 3, BLACK);
    p.px(fx - 2, fy - 1, WHITE);
    p.px(fx + (small ? 3 : 5), fy - 1, WHITE);
  }
  const mw = small ? 4 : 8;
  p.ellipse(fx + 1, fy + (small ? 4 : 7), mw / 2 + (o.hit ? 1 : 0), o.hit ? (small ? 2 : 4) : 1, BLACK);
  // an arm of mud, thrown forward on the strike
  if (o.hit || o.wind) {
    const ax = cx - wid + 1;
    p.thick(ax, fy + 6, ax - (o.hit ? 9 : -2) * k, fy + (o.wind ? -8 : 4), MID, small ? 2 : 4);
    p.ellipse(ax - (o.hit ? 10 : -2) * k, fy + (o.wind ? -9 : 4), small ? 2 : 3, small ? 2 : 3, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ SHARD MOTH
// Wings of broken mirror. Folded shut, they are a wall.

function shardmoth(f: number): PC {
  const W = 52, H = 48;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 26 + o.lean, cy = 22 + o.lift;
  const fold = o.wind ? 0.35 : o.hurt ? 0.6 : 1;
  const wing = (dir: number, back: boolean) => {
    const sx = dir * Math.round(20 * fold);
    const top: Pt[] = [[cx, cy - 2], [cx + sx, cy - 16], [cx + sx + dir * 2, cy - 2], [cx + dir * 3, cy + 2]];
    const bot: Pt[] = [[cx, cy + 2], [cx + sx - dir * 3, cy + 15], [cx + dir * 4, cy + 12]];
    p.poly(top, back ? LIGHT : WHITE);
    p.poly(bot, back ? MID : LIGHT);
    // facets: the cracks between the shards
    p.line(cx, cy - 2, cx + sx, cy - 16, BLACK);
    p.line(cx + dir * 3, cy + 2, cx + sx + dir * 2, cy - 2, MID);
    p.line(cx + Math.round(sx * 0.5), cy - 9, cx + Math.round(sx * 0.8), cy - 2, MID);
    p.line(cx + dir * 2, cy + 4, cx + sx - dir * 3, cy + 15, DARK);
    p.px(cx + Math.round(sx * 0.7), cy - 10, WHITE);
  };
  wing(1, true);
  wing(-1, false);
  // body
  p.ellipse(cx, cy + 2, 3, 8, DARK);
  p.ellipse(cx, cy - 6, 3, 3, DARK);
  for (let i = 0; i < 3; i++) p.rect(cx - 2, cy + i * 3, 5, 1, BLACK);
  eyes(p, cx - 2, cy - 6, 3, o.hurt);
  // antennae
  p.line(cx - 1, cy - 9, cx - 5, cy - 15, LIGHT);
  p.line(cx + 1, cy - 9, cx + 5, cy - 15, LIGHT);
  p.px(cx - 6, cy - 16, WHITE);
  p.px(cx + 6, cy - 16, WHITE);
  if (o.hit) for (let i = 0; i < 4; i++) p.poly([[cx - 18 - i * 3, cy - 6 + i * 5], [cx - 22 - i * 3, cy - 4 + i * 5], [cx - 19 - i * 3, cy - 2 + i * 5]], WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ LATCHLING
// A padlock with legs, and the key it will not give up.

function latchling(f: number): PC {
  const W = 40, H = 46;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 21 + o.lean, top = 16 + o.lift;
  // legs
  p.rect(cx - 6, top + 22, 3, H - top - 24, DARK);
  p.rect(cx + 4, top + 22, 3, H - top - 24, DARK);
  p.rect(cx - 8, H - 3, 5, 2, BLACK);
  p.rect(cx + 3, H - 3, 5, 2, BLACK);
  // the shackle: closed at rest, swung open when it goes to latch on
  const open = o.wind || o.hit;
  if (open) {
    p.ring(cx + 7, top - 6, 6, 8, LIGHT);
    p.rect(cx + 1, top - 6, 13, 9, -1 as unknown as number);
    for (let y = top - 14; y < top; y++) for (let x = cx; x < cx + 16; x++) if (p.get(x, y) === LIGHT && y > top - 6 && x < cx + 4) p.px(x, y, -1);
    p.rect(cx + 12, top - 6, 2, 8, LIGHT);
  } else {
    p.ring(cx, top - 4, 7, 8, LIGHT);
    p.ring(cx, top - 4, 6, 7, WHITE);
    for (let y = top; y < top + 6; y++) for (let x = cx - 9; x <= cx + 9; x++) if (p.get(x, y) >= 0 && y >= top) p.px(x, y, -1);
  }
  // the body of the lock
  p.rect(cx - 10, top, 21, 23, LIGHT);
  p.rect(cx - 10, top, 3, 23, WHITE);
  p.rect(cx + 7, top, 4, 23, MID);
  p.rect(cx - 10, top + 20, 21, 3, MID);
  for (const [rx, ry] of [[cx - 8, top + 2], [cx + 7, top + 2], [cx - 8, top + 18], [cx + 7, top + 18]] as Pt[]) p.px(rx, ry, DARK); // rivets
  // the keyhole is its face
  p.ellipse(cx - 1, top + 9, 3, 3, BLACK);
  p.poly([[cx - 3, top + 10], [cx + 1, top + 10], [cx + 2, top + 17], [cx - 4, top + 17]], BLACK);
  if (!o.hurt) p.px(cx - 2, top + 8, WHITE);
  // a small arm and the key, held like a sword
  const kx = cx - 12, ky = top + 12;
  const tipX = o.hit ? kx - 12 : o.wind ? kx - 2 : kx - 7;
  const tipY = o.hit ? ky + 1 : o.wind ? ky - 15 : ky - 9;
  p.thick(cx - 10, ky, kx, ky, DARK, 2);
  p.line(kx, ky, tipX, tipY, WHITE);
  p.line(kx, ky + 1, tipX, tipY + 1, LIGHT);
  p.ring(kx + 1, ky + 2, 2, 2, WHITE);
  p.px(tipX + 1, tipY + 2, WHITE);
  p.px(tipX + 2, tipY + 3, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ HOLLOW GUARD
// Nobody is inside the armor. The shield is real enough.

function hollowguard(f: number): PC {
  const W = 56, H = 68;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 31 + o.lean, top = 6 + o.lift;
  // the halberd behind it
  const hx = cx + 12 + (o.hit ? -20 : 0);
  if (o.hit) {
    p.line(cx + 10, top + 20, cx - 24, top + 34, LIGHT);
    p.poly([[cx - 24, top + 30], [cx - 30, top + 36], [cx - 22, top + 40]], WHITE);
  } else {
    p.rect(hx, top - 4 + (o.wind ? -2 : 0), 2, 60, MID);
    p.poly([[hx + 1, top - 6], [hx - 6, top + 4], [hx + 1, top + 8]], WHITE);
    p.poly([[hx + 1, top - 6], [hx + 5, top + 1], [hx + 1, top + 5]], LIGHT);
  }
  // body: breastplate fading into a ragged ghost below
  p.poly([[cx - 10, top + 18], [cx + 10, top + 18], [cx + 12, top + 44], [cx - 12, top + 44]], MID);
  p.rect(cx - 9, top + 19, 5, 22, LIGHT);
  p.rect(cx - 12, top + 34, 25, 2, DARK);
  hem(p, cx - 12, cx + 12, top + 44, DARK, 12, f);
  hem(p, cx - 9, cx + 9, top + 44, MID, 7, f + 2);
  // pauldrons
  p.ellipse(cx - 11, top + 19, 5, 4, LIGHT);
  p.ellipse(cx + 11, top + 19, 5, 4, MID);
  // helmet: a dark slit and two lights
  p.ellipse(cx, top + 9, 8, 9, LIGHT);
  p.rect(cx - 8, top + 9, 17, 8, LIGHT);
  p.rect(cx + 3, top + 2, 5, 15, MID);
  p.rect(cx - 7, top + 8, 13, 4, BLACK);
  p.rect(cx - 1, top + 12, 2, 5, BLACK);
  eyes(p, cx - 5, top + 10, 6, o.hurt);
  p.rect(cx - 1, top - 3, 3, 4, WHITE); // crest
  p.px(cx, top - 4, LIGHT);
  // the tower shield, out in front
  const sx = cx - 22 + (o.wind ? 3 : 0), sy = top + 16;
  p.poly([[sx, sy], [sx + 14, sy], [sx + 14, sy + 26], [sx + 7, sy + 33], [sx, sy + 26]], LIGHT);
  p.poly([[sx + 2, sy + 2], [sx + 6, sy + 2], [sx + 6, sy + 28], [sx + 2, sy + 24]], WHITE);
  p.rect(sx + 6, sy + 8, 2, 14, DARK);
  p.rect(sx + 2, sy + 13, 10, 2, DARK);
  p.line(sx + 9, sy + 3, sx + 12, sy + 9, MID); // an old dent
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE CINDER MATRON
// Mother of the Ashbiters: a hunched furnace with a mane of smoke.

function cindermatron(f: number): PC {
  const W = 84, H = 86;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 46 + o.lean, by = H - 4;
  // mane of smoke and flame rising off the back
  for (let i = 0; i < 9; i++) {
    const x = cx + 4 + i * 3;
    const hh = 14 + Math.round(Math.abs(Math.sin(i * 1.3 + f)) * 12);
    p.poly([[x - 3, by - 44], [x, by - 44 - hh], [x + 3, by - 44]], i % 2 ? MID : LIGHT);
  }
  // hind legs
  p.rect(cx + 6, by - 20, 9, 20, DARK);
  p.rect(cx + 18, by - 22, 8, 22, BLACK);
  // the hunched body
  p.ellipse(cx + 8, by - 34, 24, 20, DARK);
  p.ellipse(cx - 12, by - 40 + o.lift, 15, 14, DARK);
  p.shade((x, y) => 0.5 - (y - (by - 40)) * 0.012 + (cx - x) * 0.006 + ((x * 5 + y * 3) % 9 === 0 ? 0.2 : 0), [DARK, MID, LIGHT]);
  // furnace cracks glowing across the ribs
  for (const [x0, y0, x1, y1] of [[cx - 2, by - 46, cx + 4, by - 36], [cx + 10, by - 48, cx + 14, by - 34], [cx + 20, by - 44, cx + 22, by - 30], [cx + 2, by - 30, cx + 12, by - 24]]) {
    p.line(x0, y0, x1, y1, WHITE);
    p.line(x0 + 1, y0, x1 + 1, y1, LIGHT);
  }
  // front claws: one planted, one raised
  const up = o.wind ? -22 : o.hit ? -2 : -8;
  p.thick(cx - 14, by - 30, cx - 22, by - 14, DARK, 6);
  p.thick(cx - 22, by - 14, cx - 24, by - 2, DARK, 5);
  for (let i = 0; i < 3; i++) p.line(cx - 27 + i * 3, by - 2, cx - 29 + i * 3, by + 1, WHITE);
  p.thick(cx - 18, by - 36, cx - 30 + (o.hit ? -6 : 0), by - 34 + up, DARK, 6);
  for (let i = 0; i < 3; i++) p.line(cx - 33 + (o.hit ? -6 : 0), by - 36 + up + i * 3, cx - 39 + (o.hit ? -6 : 0), by - 34 + up + i * 3, WHITE);
  // head: low, heavy, with the same jaw as her children
  const hx = cx - 22 + (o.hit ? -3 : 0), hy = by - 46 + o.lift;
  p.ellipse(hx, hy, 11, 9, DARK);
  p.poly([[hx - 4, hy - 8], [hx - 1, hy - 17], [hx + 3, hy - 8]], DARK);
  p.poly([[hx + 4, hy - 8], [hx + 8, hy - 15], [hx + 10, hy - 6]], BLACK);
  const open = o.hit ? 8 : o.wind ? 4 : 2;
  p.poly([[hx - 11, hy + 2], [hx + 3, hy + 2], [hx + 1, hy + open + 3], [hx - 9, hy + open + 2]], BLACK);
  for (let i = 0; i < 5; i++) {
    p.px(hx - 10 + i * 3, hy + 2, WHITE);
    p.px(hx - 9 + i * 3, hy + open + 1, WHITE);
  }
  if (o.hit) p.ellipse(hx - 5, hy + 5, 3, 2, WHITE); // fire in the throat
  eyes(p, hx - 7, hy - 3, 7, o.hurt, true);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE GAOLER
// Keeper of every lock. He carries the great key the way other men carry an axe.

function gaoler(f: number): PC {
  const W = 76, H = 92;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 40 + o.lean, top = 12 + o.lift;
  // the great key
  if (o.hit) {
    p.thick(cx + 8, top + 26, cx - 30, top + 54, LIGHT, 3);
    p.rect(cx - 36, top + 54, 4, 10, WHITE);
    p.rect(cx - 30, top + 56, 3, 7, WHITE);
    p.ring(cx + 12, top + 22, 6, 6, WHITE);
  } else {
    const ky = top - 8 + (o.wind ? -3 : 0);
    p.thick(cx + 16, top + 40, cx + 16, ky + 8, LIGHT, 3);
    p.rect(cx + 8, ky, 4, 11, WHITE);
    p.rect(cx + 12, ky + 2, 3, 7, WHITE);
    p.rect(cx + 8, ky, 10, 3, WHITE);
    p.ring(cx + 17, top + 46, 6, 6, WHITE);
  }
  // robe: wide shoulders, ragged hem, no feet
  p.poly([[cx - 18, top + 22], [cx + 18, top + 22], [cx + 22, top + 66], [cx - 22, top + 66]], DARK);
  hem(p, cx - 22, cx + 22, top + 66, DARK, 10, f);
  p.shade((x, y) => (y > top + 20 ? 0.36 + (cx - x) * 0.008 + ((x - cx + 40) % 7 === 0 ? 0.2 : 0) : null), [BLACK, DARK, MID]);
  // a wide belt hung with keys
  p.rect(cx - 19, top + 44, 39, 4, MID);
  p.rect(cx - 3, top + 43, 6, 6, LIGHT);
  for (let i = 0; i < 6; i++) {
    const kx = cx - 16 + i * 6;
    p.ring(kx, top + 51, 1, 1, WHITE);
    p.rect(kx, top + 53, 1, 4 + (i % 2), LIGHT);
    p.px(kx + 1, top + 56 + (i % 2), LIGHT);
  }
  // chains across the chest
  for (let i = 0; i < 9; i++) p.rect(cx - 16 + i * 4, top + 26 + i * 2, 3, 2, i % 2 ? LIGHT : MID);
  // arms
  p.thick(cx - 17, top + 26, cx - 24, top + 40 + (o.wind ? -8 : 0), DARK, 6);
  p.ellipse(cx - 25, top + 42 + (o.wind ? -8 : 0), 4, 4, LIGHT);
  p.thick(cx + 17, top + 26, cx + 17, top + 40, DARK, 6);
  p.ellipse(cx + 17, top + 41, 4, 4, MID);
  // the hood: a flat executioner's mask with two holes
  p.poly([[cx - 10, top + 22], [cx - 9, top + 4], [cx, top - 2], [cx + 9, top + 4], [cx + 10, top + 22]], MID);
  p.poly([[cx - 8, top + 20], [cx - 7, top + 6], [cx - 2, top + 2], [cx - 2, top + 20]], LIGHT);
  p.rect(cx - 7, top + 9, 4, 4, BLACK);
  p.rect(cx + 2, top + 9, 4, 4, BLACK);
  if (o.hurt) {
    p.rect(cx - 7, top + 11, 4, 1, WHITE);
    p.rect(cx + 2, top + 11, 4, 1, WHITE);
  } else {
    p.px(cx - 6, top + 10, WHITE);
    p.px(cx + 3, top + 10, WHITE);
  }
  for (let y = top + 15; y < top + 21; y += 2) p.rect(cx - 2, y, 4, 1, DARK); // a stitched mouth
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE BROOD MIRE
// A bog with too many eyes, growing its own company.

function broodmire(f: number): PC {
  const W = 92, H = 78;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 48 + o.lean, by = H - 3;
  const hgt = 52 + (o.wind ? 6 : o.hurt ? -6 : 0);
  for (let y = 0; y <= hgt; y++) {
    const t = y / hgt;
    const w = Math.round(38 * Math.sqrt(t) * (0.7 + 0.3 * t));
    const sx = Math.round(o.lean * (1 - t) * 1.5);
    for (let x = -w; x <= w; x++) p.px(cx + x + sx, by - hgt + y, MID);
  }
  // lumps on its back: the next ones, not yet hatched
  for (const [lx, ly, r] of [[18, -hgt + 6, 8], [30, -hgt + 20, 7], [6, -hgt - 2, 6]]) {
    p.ellipse(cx + lx, by + ly, r, r, MID);
    p.ellipse(cx + lx - 2, by + ly - 1, 1, 2, BLACK);
    p.ellipse(cx + lx + 2, by + ly - 1, 1, 2, BLACK);
  }
  p.shade((x, y) => 0.5 + (cx - x) * 0.008 - (by - y) * 0.002 + ((x * 3 + y * 7) % 11 === 0 ? -0.22 : 0), [DARK, MID, LIGHT]);
  // root arms
  const arm = (dir: number, raise: number) => {
    const sx = cx + dir * 30;
    const pts: Pt[] = [[sx, by - 26], [sx + dir * 10, by - 34 + raise], [sx + dir * 18 + (dir < 0 && o.hit ? -8 : 0), by - 24 + raise * 1.5]];
    p.thick(pts[0][0], pts[0][1], pts[1][0], pts[1][1], DARK, 5);
    p.thick(pts[1][0], pts[1][1], pts[2][0], pts[2][1], DARK, 4);
    for (let i = -1; i <= 1; i++) p.line(pts[2][0], pts[2][1], pts[2][0] + dir * 5, pts[2][1] + i * 4, DARK);
  };
  arm(1, 0);
  arm(-1, o.wind ? -18 : o.hit ? 8 : -4);
  // drips and reeds
  for (const dx of [-26, -10, 12, 28]) for (let j = 0; j < 4; j++) p.px(cx + dx, by - 22 + j, DARK);
  p.line(cx - 6, by - hgt, cx - 10, by - hgt - 10, DARK);
  p.line(cx - 3, by - hgt, cx - 2, by - hgt - 12, DARK);
  p.ellipse(cx - 11, by - hgt - 12, 2, 3, MID);
  // face: three eyes that do not agree, and a mouth like a sinkhole
  const fy = by - Math.round(hgt * 0.55);
  const fx = cx - 14 + Math.round(o.lean * 0.6);
  for (const [ex, ey, r] of [[0, 0, 4], [12, -4, 3], [5, -12, 2]]) {
    if (o.hurt) p.rect(fx + ex - r, fy + ey, r * 2, 1, BLACK);
    else {
      p.ellipse(fx + ex, fy + ey, r, r + 1, BLACK);
      p.px(fx + ex - 1, fy + ey - 1, WHITE);
    }
  }
  p.ellipse(fx + 4, fy + 14, o.hit ? 13 : 9, o.hit ? 9 : o.wind ? 5 : 2, BLACK);
  if (o.hit) for (let i = 0; i < 5; i++) p.px(fx - 5 + i * 5, fy + 8, WHITE);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE GLASS REGENT
// Tall, elegant, and made of what is left of a hall of mirrors.

function glassregent(f: number): PC {
  const W = 104, H = 132;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 56 + o.lean, top = 22 + o.lift;
  // shards that hang in the air around it
  for (const [sx, sy, s] of [[-40, 30, 5], [36, 18, 4], [-34, 70, 4], [40, 62, 6], [-22, 4, 3], [30, 96, 4]]) {
    const y = top + sy + (f % 2 ? 2 : 0);
    p.poly([[cx + sx, y - s * 2], [cx + sx + s, y], [cx + sx, y + s * 2], [cx + sx - s, y]], LIGHT);
    p.line(cx + sx, y - s * 2, cx + sx, y + s * 2, WHITE);
  }
  // the robe: long facets fanning out to the floor
  const hemY = H - 4;
  const sh = top + 30;
  const fan: Pt[] = [[cx - 12, sh], [cx + 12, sh], [cx + 26, hemY], [cx - 26, hemY]];
  p.poly(fan, MID);
  for (let i = -3; i <= 3; i++) {
    const tx = cx + i * 3.5;
    const bx = cx + i * 8.5;
    p.poly([[tx, sh], [tx + 3, sh], [bx + 7, hemY], [bx, hemY]], i % 2 ? LIGHT : WHITE);
    p.line(Math.round(tx), sh, Math.round(bx), hemY, DARK);
  }
  for (let x = cx - 26; x <= cx + 26; x += 4) p.poly([[x, hemY - 6], [x + 2, hemY + 1], [x + 4, hemY - 6]], -1 as unknown as number);
  p.remap((c, x, y) => (y > hemY - 7 && (x - (cx - 26)) % 4 === 2 && y > hemY - 4 ? c : c));
  // shoulders and arms: thin, angular
  p.poly([[cx - 18, sh - 2], [cx + 18, sh - 2], [cx + 12, sh + 6], [cx - 12, sh + 6]], LIGHT);
  const armL: Pt[] = o.hit ? [[cx - 17, sh], [cx - 30, sh + 4], [cx - 46, sh - 2]] : o.wind ? [[cx - 17, sh], [cx - 28, sh - 12], [cx - 24, sh - 30]] : [[cx - 17, sh], [cx - 26, sh + 18], [cx - 22, sh + 36]];
  const armR: Pt[] = [[cx + 17, sh], [cx + 25, sh + 18], [cx + 22, sh + 36]];
  for (const a of [armL, armR]) {
    p.thick(a[0][0], a[0][1], a[1][0], a[1][1], LIGHT, 3);
    p.thick(a[1][0], a[1][1], a[2][0], a[2][1], WHITE, 2);
    for (let i = -1; i <= 1; i++) p.line(a[2][0], a[2][1], a[2][0] + (a === armL ? -4 : 1) + i, a[2][1] + 5, WHITE);
  }
  // the lance of glass it throws
  if (o.hit) {
    p.poly([[cx - 46, sh - 4], [cx - 70 > 0 ? cx - 56 : 0, sh - 2], [cx - 46, sh]], WHITE);
    p.line(cx - 46, sh - 2, 2, sh - 2, LIGHT);
  }
  // neck and the face: a flat oval mirror, cracked from one corner
  p.rect(cx - 2, top + 22, 5, 8, MID);
  const fy = top + 12;
  p.ellipse(cx, fy, 10, 13, WHITE);
  p.shade((x, y) => (Math.abs(x - cx) <= 10 && Math.abs(y - fy) <= 13 ? 0.95 - Math.max(0, x - cx) * 0.05 - Math.max(0, y - fy) * 0.02 : null), [MID, LIGHT, WHITE]);
  const crack: Pt[] = [[cx + 8, fy - 9], [cx + 2, fy - 3], [cx + 4, fy + 2], [cx - 3, fy + 5], [cx - 1, fy + 11]];
  for (let i = 0; i < crack.length - 1; i++) p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], BLACK);
  p.line(cx + 2, fy - 3, cx - 6, fy - 6, BLACK);
  p.line(cx + 4, fy + 2, cx + 9, fy + 4, BLACK);
  p.line(cx - 3, fy + 5, cx - 8, fy + 2, DARK);
  // where eyes should be: two dark slivers, at slightly different heights
  if (o.hurt) {
    p.rect(cx - 6, fy - 1, 4, 1, BLACK);
    p.rect(cx + 3, fy - 3, 4, 1, BLACK);
  } else {
    p.poly([[cx - 7, fy - 2], [cx - 2, fy - 1], [cx - 6, fy + 1]], BLACK);
    p.poly([[cx + 2, fy - 4], [cx + 7, fy - 5], [cx + 4, fy - 1]], BLACK);
  }
  // a crown of broken glass
  for (const [dx, hh] of [[-9, 9], [-5, 14], [-1, 11], [3, 17], [7, 10], [10, 6]]) p.poly([[cx + dx - 2, fy - 11], [cx + dx, fy - 11 - hh], [cx + dx + 2, fy - 11]], dx % 2 ? WHITE : LIGHT);
  p.rect(cx - 10, fy - 12, 21, 2, LIGHT);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE MIRE MATRIARCH
// The swamp, standing up: a face of knotted roots, arms that reach across the room.

function mirematriarch(f: number): PC {
  const W = 136, H = 124;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 74 + o.lean, by = H - 3;
  const hgt = 96 + (o.wind ? 6 : o.hurt ? -6 : 0);
  // the mound of her body
  for (let y = 0; y <= hgt; y++) {
    const t = y / hgt;
    const w = Math.round(46 * Math.sqrt(t) * (0.62 + 0.38 * t));
    const sx = Math.round(o.lean * (1 - t) * 2);
    for (let x = -w; x <= w; x++) p.px(cx + x + sx, by - hgt + y, DARK);
  }
  // (lit from the left, and never darker than the night behind her)
  p.shade((x, y) => 0.5 + (cx - x) * 0.007 - (by - y) * 0.0015 + ((x * 7 + y * 3) % 13 === 0 ? 0.2 : 0) + ((x + y * 2) % 17 === 0 ? -0.18 : 0), [DARK, MID, LIGHT]);
  // moss and hanging weed across the shoulders
  for (let x = cx - 40; x <= cx + 40; x += 3) {
    const yy = by - Math.round(hgt * 0.72) + Math.round(Math.abs(x - cx) * 0.35);
    const len = 4 + ((x * 7) % 9);
    for (let j = 0; j < len; j++) if (p.get(x, yy + j) >= 0) p.px(x, yy + j, j % 3 === 0 ? LIGHT : MID);
  }
  // smaller things growing out of her back
  for (const [lx, ly, r] of [[30, -hgt + 22, 9], [42, -hgt + 46, 8], [14, -hgt + 4, 7]]) {
    p.ellipse(cx + lx, by + ly, r, r, MID);
    p.ellipse(cx + lx - 3, by + ly - 1, 1, 2, BLACK);
    p.ellipse(cx + lx + 2, by + ly - 1, 1, 2, BLACK);
    p.rect(cx + lx - 2, by + ly + 3, 5, 1, BLACK);
  }
  // long root limbs
  const limb = (dir: number, raise: number, reach: number) => {
    const sx = cx + dir * 34, sy = by - Math.round(hgt * 0.62);
    const elbow: Pt = [sx + dir * 20, sy - 10 + raise];
    const hand: Pt = [sx + dir * (34 + reach), sy + 30 + raise * 1.6];
    p.thick(sx, sy, elbow[0], elbow[1], MID, 7);
    p.thick(elbow[0], elbow[1], hand[0], hand[1], MID, 5);
    p.line(sx, sy - 2, elbow[0], elbow[1] - 3, LIGHT);
    for (let i = -2; i <= 2; i++) p.line(hand[0], hand[1], hand[0] + dir * 6 + i, hand[1] + 9 - Math.abs(i) * 2, i % 2 ? DARK : MID);
  };
  limb(1, 0, 0);
  limb(-1, o.wind ? -30 : o.hit ? 6 : -6, o.hit ? 16 : 0);
  // the face: a knot of roots with hollows for eyes
  const fy = by - Math.round(hgt * 0.78);
  const fx = cx - 6 + Math.round(o.lean * 0.8);
  p.ellipse(fx, fy, 19, 17, DARK);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x1 = fx + Math.round(Math.cos(a) * 19), y1 = fy + Math.round(Math.sin(a) * 17);
    p.line(fx + Math.round(Math.cos(a + 0.5) * 6), fy + Math.round(Math.sin(a + 0.5) * 6), x1, y1, i % 2 ? MID : BLACK);
  }
  for (let i = 0; i < 5; i++) p.line(fx - 14 + i * 7, fy - 16, fx - 18 + i * 9, fy - 30 - ((i * 5) % 7), DARK); // root antlers
  if (o.hurt) {
    p.rect(fx - 12, fy - 3, 7, 2, BLACK);
    p.rect(fx + 3, fy - 3, 7, 2, BLACK);
  } else {
    p.ellipse(fx - 8, fy - 3, 4, 5, BLACK);
    p.ellipse(fx + 6, fy - 3, 4, 5, BLACK);
    p.rect(fx - 9, fy - 4, 2, 3, WHITE);
    p.rect(fx + 5, fy - 4, 2, 3, WHITE);
  }
  p.ellipse(fx - 1, fy + 9, o.hit ? 10 : 7, o.hit ? 6 : 2, BLACK);
  for (let i = 0; i < 5; i++) p.line(fx - 8 + i * 4, fy + 7, fx - 8 + i * 4, fy + (o.hit ? 15 : 11), i % 2 ? DARK : MID);
  // black water round her base
  for (let x = cx - 50; x <= cx + 50; x++) if ((x * 3) % 5 !== 0) p.px(x, by + 1 - (Math.abs(x - cx) > 40 ? 0 : 1), MID);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ ROOT GROWTH
// One of the Matriarch's: a swollen bulb on a thorned stalk, pulsing.

function rootgrowth(f: number): PC {
  const W = 36, H = 52;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 18, by = H - 2;
  const swell = o.wind || o.hit ? 2 : 0;
  // roots gripping the floor
  for (const dx of [-12, -6, 6, 12]) p.thick(cx, by - 6, cx + dx, by, DARK, 2);
  // the stalk, with thorns
  for (let y = by - 30; y <= by - 4; y++) {
    const x = cx + Math.round(Math.sin(y * 0.25) * 2) + Math.round(o.lean * 0.3);
    p.rect(x - 2, y, 4, 1, y % 5 === 0 ? MID : DARK);
    if (y % 6 === 0) p.px(x - 3, y, LIGHT);
    if (y % 6 === 3) p.px(x + 2, y, LIGHT);
  }
  // the bulb
  const byy = by - 36 + o.lift;
  p.ellipse(cx + Math.round(o.lean * 0.5), byy, 9 + swell, 10 + swell, MID);
  p.shade((x, y) => (y < byy + 12 ? 0.6 + (cx - x) * 0.03 - (y - byy) * 0.02 : null), [DARK, MID, LIGHT]);
  for (let i = -1; i <= 1; i++) p.line(cx + i * 4, byy - 9 - swell, cx + i * 5, byy + 8, DARK); // veins
  // a slit that opens when it feeds
  if (o.hurt) p.rect(cx - 4, byy, 8, 1, BLACK);
  else {
    p.ellipse(cx, byy + 1, 4, 1 + swell, BLACK);
    if (swell) p.px(cx, byy + 1, WHITE);
  }
  p.poly([[cx - 3, byy - 10 - swell], [cx, byy - 16 - swell], [cx + 3, byy - 10 - swell]], LIGHT); // a bud tip
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ THE PALE HUNTSMAN
// Antlers, a mask with nothing behind it, and a spear that has never missed twice.

function palehuntsman(f: number): PC {
  const W = 112, H = 132;
  const p = new PC(W, H);
  const o = pose(f);
  const cx = 62 + o.lean, top = 30 + o.lift;
  const hemY = H - 4;
  // the cloak: tattered, trailing back and to the right
  const cloak: Pt[] = [[cx - 14, top + 26], [cx + 14, top + 26], [cx + 34, hemY - 8], [cx + 20, hemY], [cx - 18, hemY]];
  p.poly(cloak, DARK);
  for (let x = cx - 18; x <= cx + 34; x++) {
    const d = Math.round(Math.abs(Math.sin(x * 0.6 + f)) * 9);
    for (let j = 0; j < d; j++) p.px(x, hemY - (x > cx + 20 ? Math.round((x - cx - 20) * 0.6) : 0) + j - 6, (x + j) % 3 ? DARK : -1);
  }
  p.shade((x, y) => (y > top + 24 ? 0.34 + (cx - x) * 0.006 + ((x - cx + 60) % 9 === 0 ? 0.24 : 0) - (y - top) * 0.001 : null), [BLACK, DARK, MID]);
  // a pale fur mantle across the shoulders
  for (let x = cx - 17; x <= cx + 17; x++) {
    const y = top + 24 + Math.round(Math.abs(x - cx) * 0.25);
    for (let j = 0; j < 5 + ((x * 3) % 3); j++) p.px(x, y + j, j > 3 ? LIGHT : WHITE);
  }
  // the spear
  if (o.hit) {
    p.line(cx + 20, top + 40, 4, top + 52, LIGHT);
    p.line(cx + 20, top + 41, 4, top + 53, MID);
    p.poly([[10, top + 48], [0, top + 53], [10, top + 57]], WHITE);
  } else {
    const sx = cx - 24 + (o.wind ? 6 : 0);
    p.rect(sx, top - 26 + (o.wind ? -4 : 0), 2, hemY - top + 26, LIGHT);
    p.poly([[sx - 3, top - 24], [sx + 1, top - 38 + (o.wind ? -4 : 0)], [sx + 5, top - 24]], WHITE);
    p.rect(sx - 2, top - 22, 6, 2, MID);
    for (let j = 0; j < 3; j++) p.line(sx + 2, top - 18 + j * 3, sx + 7, top - 14 + j * 3, MID); // feathers tied below the head
  }
  // arms: long and thin, one on the spear
  const hand: Pt = o.hit ? [cx - 20, top + 46] : [cx - 23 + (o.wind ? 6 : 0), top + 44];
  p.thick(cx - 13, top + 30, cx - 20, top + 38, MID, 3);
  p.thick(cx - 20, top + 38, hand[0], hand[1], LIGHT, 3);
  p.ellipse(hand[0], hand[1] + 1, 3, 3, WHITE);
  p.thick(cx + 13, top + 30, cx + 16, top + 50, MID, 3);
  // the mask: a long deer skull
  const mx = cx - 2 + (o.hit ? -3 : 0), my = top + 8;
  p.poly([[mx - 8, my - 8], [mx + 8, my - 8], [mx + 6, my + 6], [mx + 2, my + 18], [mx - 5, my + 18], [mx - 8, my + 6]], WHITE);
  p.shade((x, y) => (y >= my - 8 && y <= my + 18 && Math.abs(x - mx) <= 9 ? 0.95 - Math.max(0, x - mx) * 0.07 : null), [LIGHT, WHITE]);
  p.rect(mx - 3, my + 14, 5, 1, BLACK);
  p.px(mx - 3, my + 16, BLACK);
  p.px(mx + 1, my + 16, BLACK);
  if (o.hurt) {
    p.rect(mx - 7, my - 1, 5, 1, BLACK);
    p.rect(mx + 2, my - 1, 5, 1, BLACK);
  } else {
    p.ellipse(mx - 5, my - 1, 2, 3, BLACK);
    p.ellipse(mx + 4, my - 1, 2, 3, BLACK);
    p.px(mx - 5, my - 1, o.wind ? WHITE : LIGHT);
    p.px(mx + 4, my - 1, o.wind ? WHITE : LIGHT);
  }
  p.line(mx, my - 6, mx - 1, my + 8, LIGHT);
  // the hood behind the mask
  p.poly([[mx - 11, my + 10], [mx - 10, my - 10], [mx, my - 14], [mx + 11, my - 10], [mx + 13, my + 12]], DARK);
  p.poly([[mx - 8, my - 8], [mx + 8, my - 8], [mx + 6, my + 6], [mx + 2, my + 18], [mx - 5, my + 18], [mx - 8, my + 6]], -1 as unknown as number);
  // (redraw the mask over the hood)
  p.poly([[mx - 8, my - 8], [mx + 8, my - 8], [mx + 6, my + 6], [mx + 2, my + 18], [mx - 5, my + 18], [mx - 8, my + 6]], WHITE);
  for (let y = my - 8; y <= my + 18; y++) for (let x = mx + 2; x <= mx + 8; x++) if (p.get(x, y) === WHITE && (x + y) % 2 === 0) p.px(x, y, LIGHT);
  p.rect(mx - 3, my + 14, 5, 1, BLACK);
  if (o.hurt) {
    p.rect(mx - 7, my - 1, 5, 1, BLACK);
    p.rect(mx + 2, my - 1, 5, 1, BLACK);
  } else {
    p.ellipse(mx - 5, my - 1, 2, 3, BLACK);
    p.ellipse(mx + 4, my - 1, 2, 3, BLACK);
    p.px(mx - 5, my - 2, o.wind ? WHITE : MID);
    p.px(mx + 4, my - 2, o.wind ? WHITE : MID);
  }
  p.line(mx, my - 6, mx - 1, my + 6, LIGHT);
  // antlers: two branching beams
  const antler = (dir: number) => {
    const bx = mx + dir * 6, byy = my - 10;
    const pts: Pt[] = [[bx, byy], [bx + dir * 8, byy - 12], [bx + dir * 12, byy - 26], [bx + dir * 8, byy - 38]];
    for (let i = 0; i < pts.length - 1; i++) p.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i === 0 ? LIGHT : WHITE, 2);
    p.line(pts[1][0], pts[1][1], pts[1][0] + dir * 9, pts[1][1] - 6, WHITE);
    p.line(pts[2][0], pts[2][1], pts[2][0] + dir * 8, pts[2][1] - 3, WHITE);
    p.line(pts[2][0], pts[2][1] + 6, pts[2][0] - dir * 6, pts[2][1] - 2, LIGHT);
  };
  antler(1);
  antler(-1);
  p.outline(BLACK);
  return p;
}

export const FOE_ART: Record<string, (f: number) => PC> = {
  ashbiter,
  bonerunner,
  mireling: (f) => mireling(f),
  mirelet: (f) => mireling(f, true),
  shardmoth,
  latchling,
  hollowguard,
  cindermatron,
  gaoler,
  broodmire,
  glassregent,
  mirrorcopy: (f) => glassregent(f).flipX().flipX(),
  mirematriarch,
  rootgrowth,
  palehuntsman,
};

export function foeFrames(id: string): PC[] {
  return [0, 1, 2, 3].map((f) => FOE_ART[id](f));
}
