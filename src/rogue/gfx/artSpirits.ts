import { PC, BLACK, DARK, MID, LIGHT, WHITE, type Pt } from '../../gfx/pixel';

// ROGUELIKE: the five spirits found only in the dungeon. Same rules as every other creature:
// 48x48, bottom-centred, facing right. Frames 0-3: idle loop. Frame 4: action pose. Frame 5: hurt.

const S = 48;
export const ROGUE_SPIRIT_IDS = ['sootwick', 'tintrick', 'mourningbell', 'stitchwraith', 'nullcrown'];

// ------------------------------------------------------------------ SOOTWICK
// A scrap of soot under a cracked chimney pot, with one ember keeping it lit. It hops.

function sootwick(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  // a little hop: up, hang, down, squash
  const hop = pose === 4 ? -3 : pose === 5 ? 2 : [0, -3, -5, -2][ph];
  const squash = pose === 5 ? 2 : ph === 0 && pose < 0 ? 1 : 0;
  const lean = pose === 4 ? 3 : pose === 5 ? -2 : 0;
  const cx = 23 + lean;
  const by = 36 + hop; // body centre

  // smoke trailing up and back from the pot (drawn first, so it sits behind)
  for (let i = 0; i < 4; i++) {
    const t = (i + ph * 0.5) % 4;
    const sx = cx - 3 - t * 4 - (pose === 4 ? 3 : 0);
    const sy = by - 22 - t * 4 + Math.round(Math.sin(t * 1.7 + i) * 1.5);
    const r = 2 + Math.round(t * 0.8);
    p.ellipse(sx, sy, r, r - (t > 2 ? 1 : 0), t > 2.4 ? DARK : MID);
    if (t < 2) p.px(sx - 1, sy - 1, LIGHT);
  }

  // the sooty body: a soft dark blob with a ragged hem
  p.ellipse(cx, by, 9 + squash, 8 - squash, DARK);
  for (let x = cx - 9 - squash; x <= cx + 9 + squash; x++) {
    const wy = by + 7 - squash + Math.round(Math.sin(x * 0.9 + ph * 1.5) * 1.5);
    for (let y = by + 3; y <= wy; y++) p.px(x, y, DARK);
  }
  // rim light so it reads against dark rooms
  p.shade((x, y) => {
    if (y < by - 9) return null;
    const nx = (x - cx) / 10;
    const ny = (y - by) / 9;
    return 0.42 - nx * 0.25 - ny * 0.3;
  }, [BLACK, DARK, MID]);
  // stubby arms
  p.ellipse(cx - 10 - squash, by + 1, 2, 2, DARK);
  p.ellipse(cx + 10 + squash, by - (pose === 4 ? 3 : 0), 2, 2, DARK);

  // eyes: two bright coals
  if (pose === 5) {
    p.line(cx + 1, by - 1, cx + 3, by, WHITE);
    p.line(cx + 6, by, cx + 8, by - 1, WHITE);
  } else {
    p.ellipse(cx + 2, by - 1, 1, 2, WHITE);
    p.ellipse(cx + 7, by - 1, 1, 2, WHITE);
    p.px(cx + 2, by, BLACK);
    p.px(cx + 7, by, BLACK);
  }
  if (pose === 4) p.ellipse(cx + 5, by + 4, 2, 1, BLACK); // puffing

  // the chimney pot: a tapered clay tube with a fat rim, tipped as it leans
  const px0 = cx - 6 + Math.round(lean / 2);
  const top = by - 21;
  for (let y = 0; y < 13; y++) {
    const w = 11 + Math.round(y / 4);
    const x0 = px0 + 1 - Math.round(y / 8) + Math.round((lean * (12 - y)) / 14);
    for (let x = 0; x < w; x++) {
      const v = x / w;
      p.px(x0 + x, top + y, v < 0.25 ? WHITE : v < 0.7 ? LIGHT : MID);
    }
  }
  const rimX = px0 - 1 + Math.round((lean * 12) / 14);
  p.rect(rimX, top - 2, 15, 3, WHITE);
  p.rect(rimX + 10, top - 2, 5, 3, LIGHT);
  p.rect(rimX + 2, top - 1, 11, 1, BLACK); // the mouth of the pot
  // banding and the crack
  p.rect(px0 + 1, top + 8, 12, 1, MID);
  const crack: Pt[] = [[px0 + 9, top + 1], [px0 + 7, top + 4], [px0 + 9, top + 6], [px0 + 8, top + 9], [px0 + 10, top + 12]];
  for (let i = 0; i < crack.length - 1; i++) p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], BLACK);
  p.px(px0 + 6, top + 5, BLACK);

  // the ember, flickering over the pot
  const ex = rimX + 7;
  const ey = top - 5 - (ph % 2);
  const big = pose === 4 ? 1 : 0;
  if (pose !== 5) {
    p.ellipse(ex, ey, 2 + big, 2 + big, LIGHT);
    p.ellipse(ex, ey, 1 + big, 1 + big, WHITE);
    p.px(ex, ey - 3 - big, ph % 2 ? WHITE : LIGHT);
    if (ph === 1 || ph === 3) p.px(ex + 2 + big, ey - 2, LIGHT);
  } else p.px(ex, ey + 1, MID);

  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ TINTRICK
// A wind-up tin soldier. Stiff, a little crooked, and its key never stops turning.

function tintrick(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  // it ticks from side to side rather than breathing
  const tilt = pose === 4 ? 3 : pose === 5 ? -3 : [0, 1, 0, -1][ph];
  const drop = pose === 5 ? 1 : 0;
  const cx = 23;
  const feet = 45;
  const hip = feet - 12 + drop;
  const sh = hip - 13; // shoulders
  const tx = (y: number) => cx + Math.round((tilt * (feet - y)) / 30); // lean grows with height

  // the key in its back: a stem and a two-loop handle that turns
  const kx = tx(sh + 6) - 8;
  const ky = sh + 6;
  p.rect(kx, ky, 4, 2, LIGHT);
  const turn = pose === 4 ? 1 : pose === 5 ? 0 : ph % 2;
  if (turn === 0) {
    p.ring(kx - 2, ky - 3, 2, 2, WHITE);
    p.ring(kx - 2, ky + 4, 2, 2, WHITE);
    p.rect(kx - 2, ky - 1, 1, 4, WHITE);
  } else {
    p.ellipse(kx - 2, ky, 1, 5, WHITE);
    p.px(kx - 2, ky, MID);
  }

  // legs: two stiff tin tubes, one a touch crooked
  p.thick(tx(hip) - 3, hip, cx - 5 - (pose === 4 ? 4 : 0), feet - 2, MID, 3);
  p.thick(tx(hip) + 3, hip, cx + 4 + (pose === 4 ? 5 : 1), feet - 2, LIGHT, 3);
  p.rect(cx - 8 - (pose === 4 ? 4 : 0), feet - 2, 6, 3, BLACK);
  p.rect(cx + 2 + (pose === 4 ? 5 : 1), feet - 2, 6, 3, BLACK);

  // tunic
  for (let y = sh; y <= hip; y++) {
    const w = 6 + Math.round((y - sh) / 6);
    for (let x = -w; x <= w; x++) p.px(tx(y) + x, y, x > w - 3 ? MID : x < -w + 2 ? WHITE : LIGHT);
  }
  // crossed belts and buttons
  for (let i = 0; i <= 11; i++) {
    p.px(tx(sh + i) - 6 + i, sh + 1 + i, WHITE);
    p.px(tx(sh + i) + 6 - i, sh + 1 + i, DARK);
  }
  p.px(tx(sh + 5), sh + 5, BLACK);
  p.px(tx(sh + 9), sh + 9, BLACK);
  p.rect(tx(hip) - 7, hip - 1, 15, 2, DARK); // belt
  p.px(tx(hip), hip - 1, WHITE);
  // epaulettes
  p.rect(tx(sh) - 8, sh - 1, 4, 2, WHITE);
  p.rect(tx(sh) + 5, sh - 1, 4, 2, WHITE);

  // head and the tall shako
  const hx = tx(sh - 6);
  const hy = sh - 6;
  p.ellipse(hx, hy, 5, 5, WHITE);
  p.rect(hx + 3, hy - 2, 2, 5, LIGHT);
  const hatTop = hy - 15;
  for (let y = hatTop; y <= hy - 4; y++) {
    const w = 5 + (y > hy - 7 ? 1 : 0);
    for (let x = -w; x <= w; x++) p.px(tx(y - 4) + x, y, x > 2 ? BLACK : DARK);
  }
  p.rect(tx(hy - 8) - 6, hy - 5, 13, 2, WHITE); // hat band
  p.rect(tx(hy - 8) + 3, hy - 4, 5, 1, DARK); // peak
  p.px(tx(hatTop) , hatTop + 5, WHITE); // badge
  p.rect(tx(hatTop) - 1, hatTop - 4, 3, 5, LIGHT); // plume
  p.px(tx(hatTop), hatTop - 5, WHITE);
  // face: painted, and not quite straight
  if (pose === 5) {
    p.line(hx, hy - 1, hx + 1, hy, BLACK);
    p.line(hx + 3, hy, hx + 4, hy - 1, BLACK);
    p.rect(hx + 1, hy + 3, 3, 1, BLACK);
  } else {
    p.px(hx + 1, hy - 1, BLACK);
    p.px(hx + 1, hy, BLACK);
    p.px(hx + 4, hy - 1, BLACK);
    p.px(hx + 4, hy, BLACK);
    p.rect(hx + 1, hy + 3, pose === 4 ? 2 : 3, pose === 4 ? 2 : 1, BLACK);
    p.px(hx - 2, hy + 1, MID); // a painted cheek
  }

  // arms and the rifle with its bayonet
  const ax = tx(sh + 2);
  if (pose === 4) {
    // lunge: rifle levelled at the foe
    p.thick(ax + 5, sh + 3, ax + 12, sh + 6, LIGHT, 2);
    p.thick(ax - 5, sh + 3, ax + 4, sh + 7, MID, 2);
    p.rect(ax + 6, sh + 6, 14, 2, DARK);
    p.line(ax + 20, sh + 6, ax + 26, sh + 5, WHITE);
    p.line(ax + 20, sh + 7, ax + 25, sh + 6, LIGHT);
  } else {
    // shouldered: rifle upright along the front arm
    p.thick(ax + 6, sh + 2, ax + 8, sh + 10, LIGHT, 2);
    p.thick(ax - 6, sh + 2, ax - 8 - (pose === 5 ? 2 : 0), sh + 10, MID, 2);
    const rx = ax + 9;
    p.rect(rx, sh - 8, 2, 20, DARK);
    p.rect(rx, sh + 8, 3, 5, MID);
    p.line(rx, sh - 9, rx + 1, sh - 15, WHITE);
    p.px(rx + 1, sh - 16, WHITE);
  }

  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ MOURNINGBELL
// A cracked church bell that floats where it hung. Its clapper is a small ghost.

function mourningbell(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 2 : [0, -1, -2, -1][ph];
  // the bell swings one way and the clapper the other
  const swing = pose === 4 ? 4 : pose === 5 ? -3 : [0, 2, 0, -2][ph];
  const shake = pose === 4 ? (1 as number) : 0;
  const cx = 24;
  const top = 6 + bob;
  const lipY = top + 26;
  const bx = (y: number) => cx + Math.round((swing * (y - top)) / 26); // the mouth swings further than the crown

  // the ghostly clapper hangs below, swinging against the bell
  const gx = cx - Math.round(swing * 1.3);
  const gy = lipY + 5 - Math.abs(swing) / 2;
  p.line(bx(lipY - 6), lipY - 8, gx, gy - 4, LIGHT);
  p.ellipse(gx, gy, 4, 5, WHITE);
  for (let x = gx - 4; x <= gx + 4; x++) {
    const wy = gy + 5 + Math.round(Math.sin(x * 1.3 + ph * 1.6) * 1.2);
    for (let y = gy + 2; y <= wy; y++) p.px(x, y, WHITE);
  }
  p.shade((x, y) => (y > lipY + 1 ? 0.95 - Math.max(0, x - gx) * 0.12 : null), [LIGHT, WHITE]);
  if (pose === 5) p.line(gx - 1, gy - 1, gx + 2, gy - 1, BLACK);
  else {
    p.rect(gx - 1, gy - 2, 1, 2 + shake, BLACK);
    p.rect(gx + 2, gy - 2, 1, 2 + shake, BLACK);
  }
  if (pose === 4) p.ellipse(gx + 1, gy + 2, 1, 1, BLACK);

  // the hanging loop
  p.ring(bx(top) , top + 1, 3, 3, LIGHT);
  p.rect(bx(top) - 1, top - 1, 3, 1, WHITE);
  // the bell: shoulder, waist, and a flared lip
  for (let y = top + 4; y <= lipY; y++) {
    const t = (y - top - 4) / (lipY - top - 4);
    const w = Math.round(6 + 6 * Math.sqrt(t) + (t > 0.82 ? (t - 0.82) * 26 : 0));
    for (let x = -w; x <= w; x++) p.px(bx(y) + x, y, MID);
  }
  p.shade((x, y) => {
    if (y < top + 4 || y > lipY) return null;
    const t = (y - top - 4) / (lipY - top - 4);
    const w = 6 + 6 * Math.sqrt(t) + (t > 0.82 ? (t - 0.82) * 26 : 0);
    const nx = (x - bx(y)) / w;
    // a soft highlight left of centre, falling away to the right
    return 0.9 - Math.abs(nx + 0.35) * 0.75 - (t > 0.9 ? 0.15 : 0);
  }, [DARK, MID, LIGHT, WHITE]);
  // bands
  for (const yy of [top + 9, lipY - 5]) {
    const t = (yy - top - 4) / (lipY - top - 4);
    const w = Math.round(6 + 6 * Math.sqrt(t));
    p.rect(bx(yy) - w, yy, w * 2 + 1, 1, DARK);
  }
  p.rect(bx(lipY) - 15, lipY, 31, 1, DARK);
  p.rect(bx(lipY + 1) - 14, lipY + 1, 29, 1, BLACK); // the dark inside of the mouth
  // the crack: up from the lip, forking near the waist
  const c0 = bx(lipY) + 5;
  const crack: Pt[] = [[c0, lipY], [c0 - 2, lipY - 4], [c0 + 1, lipY - 8], [c0 - 1, lipY - 12], [c0 + 2, lipY - 16]];
  for (let i = 0; i < crack.length - 1; i++) p.line(crack[i][0], crack[i][1], crack[i + 1][0], crack[i + 1][1], BLACK);
  p.line(c0 + 1, lipY - 8, c0 + 4, lipY - 10, BLACK);
  p.line(c0 - 1, lipY - 12, c0 - 4, lipY - 13, BLACK);
  // two hollow eyes cast into the bronze
  if (pose !== 5) {
    p.ellipse(bx(top + 15) - 5, top + 15, 1, 2, BLACK);
    p.ellipse(bx(top + 15), top + 15, 1, 2, BLACK);
  } else {
    p.rect(bx(top + 15) - 6, top + 15, 3, 1, BLACK);
    p.rect(bx(top + 15) - 1, top + 15, 3, 1, BLACK);
  }

  // ringing: arcs of sound either side
  if (pose === 4 || ph === 1 || ph === 3) {
    const n = pose === 4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const r = 4 + k * 4;
      for (let a = -3; a <= 3; a++) {
        const yy = lipY - 8 + a * 2;
        const dx = Math.round(Math.sqrt(Math.max(0, r * r - a * a * 3)) / 2);
        p.px(cx + 17 + k * 3 + dx, yy, k ? MID : LIGHT);
        if (pose === 4) p.px(cx - 17 - k * 3 - dx, yy, k ? MID : LIGHT);
      }
    }
  }

  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ STITCHWRAITH
// A patchwork puppet sewn from scraps that never matched, hung from threads nobody holds.

function stitchwraith(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 2 : [0, -1, -2, -1][ph];
  const sway = pose === 4 ? 3 : pose === 5 ? -3 : [0, 1, 0, -1][ph];
  const cx = 23 + Math.round(sway / 2);
  const headY = 15 + bob;
  const sh = headY + 8;
  const hem = sh + 17;

  // the threads: up from the head, shoulders and hands to nowhere
  const thread = (x0: number, y0: number, drift: number, c: number) => {
    let x = x0;
    for (let y = y0; y >= 0; y--) {
      x = x0 + Math.round(Math.sin((y0 - y) * 0.22 + ph * 1.2 + drift) * (1 + (y0 - y) * 0.07)) + Math.round(((y0 - y) * drift) / 14);
      if (y % 3 !== 2) p.px(x, y, c);
    }
  };
  thread(cx - 1, headY - 7, -0.6, LIGHT);
  thread(cx - 8, sh, -1.4, MID);
  thread(cx + 8, sh, 1.2, MID);

  // the body: a sack of four patches that do not match
  for (let y = sh; y <= hem; y++) {
    const t = (y - sh) / (hem - sh);
    const w = Math.round(7 + t * 3);
    const mid = cx + Math.round(sway * t * 0.6);
    for (let x = -w; x <= w; x++) {
      const upper = y < sh + 8;
      const left = x < 0;
      let c = upper ? (left ? WHITE : MID) : left ? LIGHT : WHITE;
      // the patches carry their own cloth: checks, stripes, plain
      if (upper && !left && (x + y) % 2 === 0) c = DARK;
      if (!upper && left && y % 3 === 0) c = MID;
      if (!upper && !left && x % 4 === 2 && y % 4 === 2) c = LIGHT;
      p.px(mid + x, y, c);
    }
  }
  // ragged hem
  for (let x = cx - 10; x <= cx + 10 + Math.round(sway * 0.6); x++) {
    const d = Math.round(Math.abs(Math.sin(x * 1.1 + ph * 0.9)) * 3);
    for (let y = hem; y <= hem + d; y++) p.px(x, y, (x & 3) === 0 ? MID : LIGHT);
  }
  // seams: dashed black stitches between the patches
  for (let y = sh + 1; y <= hem; y += 2) p.px(cx + Math.round((sway * (y - sh)) / (hem - sh) * 0.6), y, BLACK);
  for (let x = cx - 8; x <= cx + 8; x += 2) p.px(x, sh + 8, BLACK);
  p.stamp(['0.0', '.0.', '0.0'], cx + 3, sh + 11); // a cross-stitch mending a tear

  // long arms, reaching nearly to the floor
  const armL: Pt[] = [[cx - 8, sh + 1], [cx - 13, sh + 9], [cx - 12 - (pose === 5 ? 2 : 0), sh + 19]];
  const armR: Pt[] = pose === 4 ? [[cx + 8, sh + 1], [cx + 15, sh + 2], [cx + 22, sh - 2]] : [[cx + 8, sh + 1], [cx + 13, sh + 9], [cx + 13 + (ph === 1 ? 1 : 0), sh + 19]];
  for (const arm of [armL, armR]) {
    p.thick(arm[0][0], arm[0][1], arm[1][0], arm[1][1], LIGHT, 2);
    p.thick(arm[1][0], arm[1][1], arm[2][0], arm[2][1], WHITE, 2);
    p.px(arm[1][0], arm[1][1], BLACK); // an elbow stitch
    p.ellipse(arm[2][0], arm[2][1] + 1, 2, 2, WHITE); // mitten hand
    p.px(arm[2][0] + 1, arm[2][1] + 2, MID);
  }
  if (pose === 4) {
    // threads thrown from the hand
    for (let k = -1; k <= 1; k++) p.line(armR[2][0] + 2, armR[2][1], S - 1, armR[2][1] + k * 5 - 2, k ? MID : WHITE);
  }

  // the head: a stuffed ball with one button eye and one sewn shut
  const hx = cx + Math.round(sway * 0.3);
  p.ellipse(hx, headY, 7, 7, WHITE);
  p.shade((x, y) => (y <= headY + 7 && y >= headY - 7 && Math.abs(x - hx) <= 7 ? 0.95 - Math.max(0, x - hx) * 0.07 - Math.max(0, y - headY) * 0.05 : null), [LIGHT, WHITE]);
  // a darker patch over one side of the head
  for (let y = headY - 7; y <= headY - 1; y++) for (let x = hx - 7; x <= hx - 2; x++) if (p.get(x, y) >= 0 && (x - hx) * (x - hx) + (y - headY) * (y - headY) <= 49) p.px(x, y, (x + y) % 2 ? MID : LIGHT);
  for (let y = headY - 6; y <= headY; y += 2) p.px(hx - 1, y, BLACK);
  if (pose === 5) {
    p.stamp(['0.0', '.0.', '0.0'], hx + 1, headY - 2);
    p.stamp(['0.0', '.0.', '0.0'], hx - 5, headY - 2);
  } else {
    // the button
    p.ellipse(hx + 3, headY - 1, 2, 2, BLACK);
    p.px(hx + 2, headY - 1, WHITE);
    p.px(hx + 4, headY - 1, WHITE);
    // the sewn eye
    p.rect(hx - 5, headY - 1, 4, 1, BLACK);
    p.px(hx - 4, headY - 2, BLACK);
    p.px(hx - 2, headY, BLACK);
  }
  // a stitched mouth
  const mw = pose === 4 ? 7 : 6;
  p.rect(hx - 2, headY + 4, mw, 1, BLACK);
  for (let x = hx - 2; x < hx - 2 + mw; x += 2) {
    p.px(x, headY + 3, BLACK);
    p.px(x, headY + 5, BLACK);
  }

  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ NULLCROWN
// A cursed crown that outlived its kingdom, and the shadow that still wears it.

function nullcrown(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 2 : [0, -1, -2, -1][ph];
  const cbob = pose === 5 ? 2 : [0, 1, 0, -1][ph]; // the crown drifts on its own
  const cx = 24;
  const face = 15 + bob; // top of the hollow where a face should be
  const collar = face + 9;

  // the mantle: a tall shadow, widest at the shoulders, breaking up toward the floor
  for (let y = face - 1; y < S - 1; y++) {
    const t = (y - face) / (S - face - 1);
    const w = t < 0.12 ? 6 : Math.round(6 + 8 * Math.sin(Math.min(1, t * 2.2) * Math.PI * 0.5) - t * 2.5);
    const drift = Math.round(Math.sin(y * 0.3 + ph * 1.5) * (1 + t * 2));
    for (let x = -w; x <= w; x++) {
      const X = cx + x + (t > 0.45 ? drift : 0);
      // dissolves into the dark near the hem
      if (t > 0.66 && ((X * 7 + y * 3) % 5 === 0 || (t > 0.84 && (X + y) % 2 === 0))) continue;
      p.px(X, y, DARK);
    }
  }
  // long folds and a pale rim, so the shape holds on a black floor
  p.shade((x, y) => {
    if (y < collar) return 0.3;
    const d = Math.abs(x - cx);
    const fold = (x - cx + 14) % 5 === 0 ? 0.22 : 0;
    return 0.26 + fold + (d > 10 ? 0.3 : 0) - Math.max(0, y - 34) * 0.012;
  }, [BLACK, DARK, MID]);
  // the collar: a ragged ermine edge
  for (let x = cx - 10; x <= cx + 10; x++) {
    const y = collar + Math.round(Math.abs(x - cx) * 0.3);
    p.px(x, y, WHITE);
    p.px(x, y + 1, (x & 1) === 0 ? WHITE : LIGHT);
    if ((x & 3) === 1) p.px(x, y + 1, BLACK);
  }

  // two eyes in the hollow
  p.rect(cx - 5, face, 11, 8, BLACK);
  const ey = face + 3;
  if (pose === 5) {
    p.rect(cx - 4, ey + 1, 3, 1, LIGHT);
    p.rect(cx + 2, ey + 1, 3, 1, LIGHT);
  } else {
    const flare = pose === 4 ? 1 : 0;
    p.rect(cx - 4, ey - flare, 2, 3 + flare, WHITE);
    p.rect(cx + 2, ey - flare, 2, 3 + flare, WHITE);
    p.px(cx - 4 + (ph === 2 ? 1 : 0), ey + 2, MID);
    p.px(cx + 2 + (ph === 2 ? 1 : 0), ey + 2, MID);
    if (flare) {
      p.rect(cx - 6, ey - 2, 2, 1, LIGHT);
      p.rect(cx + 4, ey - 2, 2, 1, LIGHT);
    }
  }

  // the crown: a solid band with five points, one of them snapped off
  const bandY = face - 5 + cbob - bob;
  const tiltC = pose === 5 ? 3 : 0;
  const by = (x: number) => bandY + Math.round((x * tiltC) / 9);
  for (let x = -9; x <= 9; x++) {
    // height of the point above this column: peaks every 4 or 5 pixels
    const near = Math.min(...[-9, -4, 0, 4, 9].map((pk) => Math.abs(x - pk)));
    let h = [6, 4, 2, 1][Math.min(3, near)];
    if (x === 0) h = 8;
    else if (Math.abs(x) === 1) h = 5;
    if (x >= 3 && x <= 5) h = Math.min(h, x === 4 ? 2 : 1); // the broken point
    for (let k = 1; k <= h; k++) p.px(cx + x, by(x) - k, x > 5 ? LIGHT : WHITE);
    for (let y = 0; y < 4; y++) p.px(cx + x, by(x) + y, y === 3 ? MID : x > 5 ? LIGHT : WHITE);
  }
  // pearls on the whole points, jewels on the band (one socket empty)
  for (const pk of [-9, -4, 0, 9]) {
    const hh = pk === 0 ? 8 : 6;
    p.px(cx + pk, by(pk) - hh - 1, WHITE);
    p.px(cx + pk, by(pk) - hh - 2, LIGHT);
  }
  for (const jx of [-7, -3, 1, 5]) p.rect(cx + jx, by(jx) + 1, 2, 2, jx === 5 ? BLACK : DARK);
  p.px(cx - 7, by(-7) + 1, MID);
  p.px(cx - 3, by(-3) + 1, MID);
  p.px(cx + 1, by(1) + 1, MID);
  // a dent and a crack in the band
  p.px(cx + 8, by(8) + 3, BLACK);
  p.line(cx - 6, by(-6), cx - 5, by(-5) + 2, DARK);

  // two pale hands, floating free of any arm
  const hand = (hx: number, hy: number, open: boolean, flip: number) => {
    p.ellipse(hx, hy, 3, 2, WHITE);
    for (let k = 0; k < 4; k++) {
      const fx = hx + flip * (k - 1);
      const len = open ? 4 - (k === 0 || k === 3 ? 1 : 0) : 2;
      for (let j = 1; j <= len; j++) p.px(fx + (open ? flip * Math.round(j / 3) : 0), hy - 1 - j, k % 2 ? LIGHT : WHITE);
    }
    p.px(hx - flip * 3, hy - 1, LIGHT); // thumb
    // a wisp trailing where the wrist would be
    for (let j = 1; j <= 4; j++) if (j % 2) p.px(hx - flip, hy + 2 + j, MID);
  };
  const drift = [0, 1, 0, -1][ph];
  if (pose === 4) {
    hand(cx + 18, face + 6, true, 1);
    hand(cx - 16, face + 2, true, -1);
    // the aura that comes with a decree
    for (let a = 0; a < 20; a++) {
      const ang = (a / 20) * Math.PI * 2;
      const X = cx + Math.round(Math.cos(ang) * 22);
      const Y = face + 8 + Math.round(Math.sin(ang) * 21);
      if (a % 2 === 0) p.px(X, Y, a % 4 === 0 ? WHITE : LIGHT);
    }
  } else {
    hand(cx + 17, face + 17 + drift, pose !== 5, 1);
    hand(cx - 17, face + 19 - drift, pose !== 5, -1);
  }

  p.outline(BLACK);
  return p;
}

const DRAW: Record<string, (f: number) => PC> = { sootwick, tintrick, mourningbell, stitchwraith, nullcrown };

export function rogueSpiritFrames(id: string): PC[] {
  return Array.from({ length: 6 }, (_, i) => DRAW[id](i));
}
