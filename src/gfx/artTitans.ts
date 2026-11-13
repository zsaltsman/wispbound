import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';
import { CW, CH, type Facing } from './artPeople';

// World 3: the Titans (battle parts, overworld sprites), their first-stage
// creature forms, Milo the Spirit Tamer in battle, and the arenas outside
// Club Forever and the Great Barrel. Everything faces left in battle (toward
// your creature), creatures face right, like the rest of the game.

const S = 48;

/** Text drawn at an integer scale (signs, marquees). */
export function bigText(p: PC, x: number, y: number, s: string, scale: number, c: number) {
  const t = new PC(s.length * 6 + 2, 9);
  drawText(t, 0, 0, s, c, 1);
  for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) if (t.get(i, j) >= 0) p.rect(x + i * scale, y + j * scale, scale, scale, t.get(i, j));
}

// ================================================================== the first-stage creatures (48x48, facing right)

/** A little four-legged steel pup with a furnace in its tail. */
function scorvlet(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -1 : pose === 5 ? 2 : [0, -1, -1, 0][ph];
  const lean = pose === 4 ? 4 : pose === 5 ? -3 : 0;
  const by = 30 + bob;
  // legs: two pairs, little steel paws
  for (const [x, k] of [
    [14, 0],
    [19, 1],
    [29, 0],
    [34, 1],
  ] as const) {
    const lift = ph % 2 === k && pose < 0 ? 1 : 0;
    p.rect(x + lean / 2, by + 4, 3, 9 - lift - bob, k ? DARK : MID);
    p.rect(x - 1 + lean / 2, by + 12 - lift - bob, 5, 2, DARK);
  }
  // the tail: rising from the back, curling forward over the body, a furnace bulb at the end
  const sway = [0, 1, 2, 1][ph];
  const tip = pose === 4 ? { x: 40, y: 10 } : { x: 18 + sway, y: 6 };
  const segs = 7;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = 10 + (tip.x - 10) * t + Math.sin(t * Math.PI) * (pose === 4 ? -6 : -8);
    const y = by - 2 + (tip.y - by + 2) * t - Math.sin(t * Math.PI) * 6;
    p.circle(x, y, 3.2 - t * 1.2, i % 2 ? MID : LIGHT);
  }
  p.circle(tip.x, tip.y, 5, DARK);
  p.circle(tip.x, tip.y, 3, pose === 4 ? WHITE : LIGHT);
  p.px(tip.x, tip.y, WHITE);
  p.poly([[tip.x + 3, tip.y + 2], [tip.x + 8, tip.y + 6], [tip.x + 3, tip.y + 5]], WHITE); // the little stinger
  // body: a boxy steel chassis with riveted plates
  p.ellipse(24 + lean, by, 14, 7, MID);
  p.rect(12 + lean, by - 4, 24, 6, MID);
  p.rect(13 + lean, by - 5, 22, 2, LIGHT);
  for (let x = 15; x < 34; x += 5) p.px(x + lean, by - 2, DARK);
  // a glowing grille on its flank
  for (let x = 17; x < 29; x += 3) p.rect(x + lean, by + 1, 2, 3, ph === 2 || pose === 4 ? WHITE : LIGHT);
  // head: a blunt steel snout, two slit eyes, a tiny jaw
  const hx = 37 + lean;
  const hy = by - 3;
  p.ellipse(hx, hy, 7, 6, MID);
  p.rect(hx, hy - 1, 8, 6, MID);
  p.rect(hx - 4, hy - 6, 8, 2, LIGHT);
  if (pose === 5) {
    p.line(hx - 1, hy - 1, hx + 2, hy, BLACK);
    p.line(hx + 4, hy, hx + 7, hy - 1, BLACK);
  } else {
    p.rect(hx - 1, hy - 1, 3, 2, WHITE);
    p.rect(hx + 4, hy - 1, 3, 2, WHITE);
  }
  p.line(hx + 1, hy + 4, hx + 7, hy + 4, BLACK);
  if (pose === 4) p.rect(hx + 2, hy + 4, 5, 2, BLACK); // a hot little roar
  // smoke rings drifting up on the late idle frames
  if (ph >= 2 && pose < 0) p.ring(tip.x - 2, tip.y - 6 - (ph - 2) * 3, 2, 1, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A clockwork spiderling no bigger than a teapot, with a winding key on its back. */
function widowling(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 4 ? -3 : pose === 5 ? 1 : [0, 0, -1, 0][ph];
  const cx = 22;
  const cy = 30 + bob;
  // eight legs: four each side, drawn as bent wires; they tap in turn
  for (let i = 0; i < 4; i++) {
    const tap = ph === i && pose < 0 ? -2 : 0;
    const curl = pose === 5 ? 4 : 0;
    const ax = cx + 2 + i * 4;
    // far side (darker)
    p.line(ax, cy - 1, ax - 4 + i * 2, cy - 9 + curl, DARK);
    p.line(ax - 4 + i * 2, cy - 9 + curl, ax - 8 + i * 5, 44 + tap, DARK);
    // near side
    const front = pose === 4 && i === 3;
    const kx = ax + 2 + i * 2;
    p.line(ax, cy + 1, kx, cy - 7 + curl + (front ? -10 : 0), LIGHT);
    p.line(kx, cy - 7 + curl + (front ? -10 : 0), front ? kx + 10 : ax - 2 + i * 6, front ? cy - 14 : 45 + tap, LIGHT);
    p.px(front ? kx + 10 : ax - 2 + i * 6, front ? cy - 14 : 45 + tap, WHITE);
  }
  // abdomen: a round clockwork body with plate seams
  p.ellipse(cx - 2, cy, 11, 9, MID);
  p.ring(cx - 2, cy, 7, 6, DARK);
  p.line(cx - 12, cy, cx + 8, cy, DARK);
  p.px(cx - 6, cy - 5, WHITE);
  // the winding key, turning
  const kr = [0, 1, 2, 1][ph];
  p.rect(cx - 3, cy - 13, 2, 4, LIGHT);
  p.ellipse(cx - 2, cy - 15, 4 - kr, 2, LIGHT);
  p.ring(cx - 2, cy - 15, 4 - kr, 2, DARK);
  // thorax and head, with a cluster of eyes
  const hx = cx + 12;
  p.ellipse(hx, cy + 1, 6, 5, DARK);
  p.ellipse(hx + 1, cy, 4, 3, MID);
  if (pose === 5) {
    p.line(hx, cy - 1, hx + 3, cy, BLACK);
  } else {
    p.circle(hx + 1, cy - 1, 1, WHITE);
    p.circle(hx + 4, cy - 1, 1, WHITE);
    p.px(hx - 1, cy - 2, LIGHT);
    p.px(hx + 5, cy + 1, LIGHT);
  }
  // fangs
  p.line(hx + 4, cy + 3, hx + 5, cy + 6, WHITE);
  p.line(hx + 2, cy + 4, hx + 2, cy + 6, LIGHT);
  p.outline(BLACK);
  return p;
}

/** A stubby little suit of armor dragging a hammer twice its size. */
function ironbud(f: number): PC {
  const p = new PC(S, S);
  const pose = f >= 4 ? f : -1;
  const ph = f % 4;
  const bob = pose === 5 ? 2 : [0, -1, -1, 0][ph];
  const cx = 20;
  const top = 12 + bob;
  // the hammer: dragged behind on the ground, or swung up overhead
  if (pose === 4) {
    p.thick(cx + 6, top + 16, cx + 18, top - 8, MID, 2);
    p.rect(cx + 12, top - 18, 16, 12, LIGHT);
    p.rect(cx + 12, top - 18, 16, 2, WHITE);
    p.rect(cx + 12, top - 8, 16, 2, MID);
  } else {
    p.thick(cx + 6, top + 18, cx + 20, 40, MID, 2);
    p.rect(cx + 18, 34, 14, 10, LIGHT);
    p.rect(cx + 18, 34, 14, 2, WHITE);
    p.rect(cx + 18, 42, 14, 2, MID);
    if (ph === 1) p.px(cx + 33, 44, WHITE); // a scrape spark
  }
  // feet and legs
  p.rect(cx - 7, 40, 6, 4, DARK);
  p.rect(cx + 2, 40, 6, 4, DARK);
  p.rect(cx - 5, 34 + bob, 4, 7, MID);
  p.rect(cx + 2, 34 + bob, 4, 7, MID);
  // the round little body, riveted
  p.ellipse(cx, top + 18, 9, 8, MID);
  p.rect(cx - 9, top + 17, 19, 2, LIGHT);
  for (const x of [-6, 0, 6]) p.px(cx + x, top + 21, DARK);
  // a little round shield on its left arm
  p.circle(cx - 10, top + 18, 5, LIGHT);
  p.ring(cx - 10, top + 18, 5, 5, DARK);
  p.px(cx - 10, top + 18, WHITE);
  // the big helmet, a visor slit with two determined eyes
  p.ellipse(cx, top + 4, 10, 9, MID);
  p.rect(cx - 10, top + 3, 21, 5, MID);
  p.rect(cx - 7, top + 3, 15, 4, BLACK);
  if (pose === 5) {
    p.line(cx - 4, top + 5, cx - 1, top + 4, WHITE);
    p.line(cx + 2, top + 4, cx + 5, top + 5, WHITE);
  } else {
    p.rect(cx - 3, top + 4, 2, 2, WHITE);
    p.rect(cx + 3, top + 4, 2, 2, WHITE);
  }
  p.rect(cx - 1, top - 6, 3, 3, LIGHT); // the plume nub
  p.px(cx - 5, top - 2, WHITE);
  p.outline(BLACK);
  return p;
}

export function creatureFrames3(id: string): PC[] {
  const fn = id === 'scorvlet' ? scorvlet : id === 'widowling' ? widowling : ironbud;
  return [0, 1, 2, 3, 4, 5].map((f) => fn(f));
}
export const W3_CREATURE_IDS = ['scorvlet', 'widowling', 'ironbud'];

/** Overworld followers (16x20, the usual 9-frame directional sheet). */
function mini(id: string, dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = [0, -1, -1][f];
  const side = dir === 'left';
  if (id === 'scorvlet') {
    for (const x of side ? [3, 6, 10, 13] : [3, 5, 10, 12]) p.rect(x, 15 + (f && x % 2 ? -1 : 0), 2, 4, DARK);
    p.ellipse(8, 13 + bob, 6, 3, MID);
    p.rect(2, 10 + bob, 12, 2, LIGHT);
    // tail over the back
    p.line(side ? 12 : 3, 11 + bob, side ? 11 : 4, 5 + bob, MID);
    p.circle(side ? 9 : 6, 4 + bob, 2, LIGHT);
    p.px(side ? 9 : 6, 4 + bob, WHITE);
    if (dir !== 'up') {
      p.rect(side ? 1 : 5, 10 + bob, 2, 1, WHITE);
      if (!side) p.rect(9, 10 + bob, 2, 1, WHITE);
    }
  } else if (id === 'widowling') {
    for (let i = 0; i < 4; i++) {
      const l = 3 + i * 3;
      p.line(l, 13 + bob, l - 2 + (f === 1 && i % 2 ? 1 : 0), 18, DARK);
    }
    p.ellipse(8, 12 + bob, 5, 4, MID);
    p.rect(7, 6 + bob, 2, 3, LIGHT);
    p.ellipse(8, 6 + bob, 2 + (f % 2), 1, LIGHT);
    if (dir !== 'up') {
      p.px(side ? 3 : 6, 12 + bob, WHITE);
      p.px(side ? 5 : 10, 12 + bob, WHITE);
    }
  } else {
    // ironbud
    p.rect(4, 16, 3, 3, DARK);
    p.rect(9, 16, 3, 3, DARK);
    p.ellipse(8, 13 + bob, 5, 4, MID);
    p.ellipse(8, 7 + bob, 5, 5, MID);
    if (dir !== 'up') {
      p.rect(4, 7 + bob, 8, 2, BLACK);
      p.px(side ? 5 : 6, 7 + bob, WHITE);
      if (!side) p.px(10, 7 + bob, WHITE);
    }
    p.rect(7, 1 + bob, 2, 2, LIGHT);
    // the hammer, dragged along
    p.line(side ? 12 : 13, 13 + bob, side ? 15 : 15, 18, MID);
    p.rect(side ? 13 : 13, 16, 3, 3, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

export function miniSheet3(id: string): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(mini(id, d, f));
  return out;
}

// ================================================================== Titans: battle parts

/**
 * Scorvex's chassis (150x90), facing left. Legs and tail are drawn live by the rig.
 * Frames: 0 idle, 1 furnace roaring, 2 hurt, 3 broken down.
 */
export function scorvexBody(f: number): PC {
  const p = new PC(150, 90);
  const dead = f === 3;
  // the hulking torso: a wedge of riveted plate, heavier at the back
  p.poly(
    [
      [30, 40],
      [70, 18],
      [128, 22],
      [146, 46],
      [130, 70],
      [40, 70],
    ],
    MID
  );
  p.shade((x, y) => (p.get(x, y) === MID ? 1.1 - (y - 18) / 70 - (x - 30) / 300 : null), [DARK, MID, LIGHT]);
  for (let x = 50; x < 140; x += 14) p.line(x, 24 + (x - 50) * 0.05, x - 8, 68, DARK); // plate seams
  for (let x = 48; x < 136; x += 7) p.px(x, 28, WHITE); // rivets
  // the furnace: a glowing grille along the flank
  const hot = f === 1 ? WHITE : dead ? DARK : LIGHT;
  p.rect(66, 44, 52, 16, BLACK);
  for (let x = 69; x < 116; x += 5) p.rect(x, 46, 3, 12, hot);
  if (f === 1) p.dither(60, 38, 64, 28, WHITE, 0.15, true);
  // smokestacks on the back
  for (const x of [104, 118]) {
    p.rect(x, 8, 8, 16, DARK);
    p.rect(x - 1, 6, 10, 3, MID);
  }
  // the head: low and heavy, a blunt steel muzzle with crushing jaws
  p.poly(
    [
      [4, 44],
      [20, 30],
      [44, 30],
      [50, 52],
      [38, 66],
      [10, 62],
    ],
    MID
  );
  p.rect(6, 52, 34, 4, DARK); // the jaw line
  for (let x = 8; x < 36; x += 5) p.poly([[x, 52], [x + 3, 52], [x + 1.5, 57]], dead ? MID : WHITE); // steel teeth
  // eyes: two furnace slits under a heavy brow
  p.thick(14, 36, 40, 33, DARK, 3);
  if (dead) {
    p.line(18, 41, 24, 41, BLACK);
    p.line(30, 40, 36, 40, BLACK);
  } else {
    p.rect(17, 39, 8, 3, f === 2 ? LIGHT : WHITE);
    p.rect(29, 38, 8, 3, f === 2 ? LIGHT : WHITE);
  }
  if (f === 2) for (const [x, y] of [[60, 30], [88, 26], [120, 40]]) p.line(x, y, x + 6, y + 8, WHITE); // sparks
  p.outline(BLACK);
  return p;
}

/** The furnace stinger at the end of Scorvex's tail (32x32). 0 normal, 1 white-hot. */
export function scorvexStinger(f: number): PC {
  const p = new PC(32, 32);
  p.circle(14, 14, 11, DARK);
  p.circle(14, 14, 8, f ? WHITE : LIGHT);
  for (let y = 9; y < 20; y += 3) p.rect(8, y, 12, 1, DARK);
  p.poly([[6, 20], [0, 31], [12, 22]], WHITE); // the hooked spike
  if (f) p.dither(2, 2, 26, 26, WHITE, 0.2, true);
  p.outline(BLACK);
  return p;
}

/** Widowmaker's body (140x100), facing left. Frames: 0 idle, 1 eyes blazing, 2 hurt, 3 dead. */
export function widowBody(f: number): PC {
  const p = new PC(140, 100);
  const dead = f === 3;
  // the abdomen: a huge armored bulb behind, plated like a beetle
  p.ellipse(92, 48, 44, 36, MID);
  p.shade((x, y) => (p.get(x, y) === MID ? 1.0 - (y - 12) / 90 - (x - 50) / 260 : null), [BLACK, DARK, MID, LIGHT]);
  for (let k = 0; k < 5; k++) p.ring(92, 48, 40 - k * 7, 32 - k * 6, DARK);
  // the hourglass mark, white on black
  p.poly([[86, 32], [100, 32], [93, 46]], WHITE);
  p.poly([[86, 60], [100, 60], [93, 46]], WHITE);
  // gears showing through a crack in the plating
  p.circle(116, 30, 6, DARK);
  p.ring(116, 30, 6, 6, LIGHT);
  p.px(116, 30, WHITE);
  // the thorax and head, low and forward
  p.ellipse(40, 58, 26, 18, DARK);
  p.ellipse(36, 56, 20, 13, MID);
  // a cluster of eight lenses
  const eye = (x: number, y: number, r: number) => {
    p.circle(x, y, r + 1, BLACK);
    if (!dead) {
      p.circle(x, y, r, f === 1 ? WHITE : f === 2 ? MID : LIGHT);
      p.px(x - 1, y - 1, WHITE);
    }
  };
  eye(26, 50, 4);
  eye(38, 50, 4);
  eye(20, 58, 2);
  eye(44, 58, 2);
  eye(30, 44, 2);
  eye(36, 44, 2);
  eye(24, 64, 1);
  eye(40, 64, 1);
  // mandible blades
  p.poly([[18, 66], [8, 82], [24, 70]], dead ? MID : WHITE);
  p.poly([[40, 70], [36, 86], [48, 70]], dead ? MID : LIGHT);
  if (f === 2) for (const [x, y] of [[70, 20], [104, 70], [60, 40]]) p.line(x, y, x + 7, y - 6, WHITE);
  p.outline(BLACK);
  return p;
}

/**
 * Ironclad's body (170x160), legs and torso and head, facing left; the arms are separate.
 * Frames: 0 full armor, 1 cracked, 2 armor torn away (the core shows), 3 fallen.
 */
export function ironBody(f: number): PC {
  const p = new PC(170, 160);
  const dead = f === 3;
  const r = artRng(13);
  const oy = dead ? 30 : 0;
  // legs: two pillars of iron with huge feet
  for (const x of [54, 104]) {
    p.rect(x, 104 + oy, 28, 44 - oy, DARK);
    p.rect(x + 2, 106 + oy, 6, 40 - oy, MID);
    p.rect(x - 6, 144, 40, 14, MID);
    p.rect(x - 6, 144, 40, 3, LIGHT);
  }
  // the hips
  p.rect(48, 96 + oy, 92, 16, DARK);
  // the torso: a barrel of armor plate
  p.poly(
    [
      [34, 40 + oy],
      [60, 18 + oy],
      [130, 18 + oy],
      [152, 44 + oy],
      [140, 100 + oy],
      [46, 100 + oy],
    ],
    MID
  );
  p.shade((x, y) => (p.get(x, y) === MID ? 1.15 - (y - 18 - oy) / 90 - (x - 34) / 280 : null), [DARK, MID, LIGHT, WHITE]);
  for (let y = 34; y < 96; y += 12) p.line(42, y + oy, 146, y + oy, DARK);
  for (let y = 40; y < 96; y += 12) for (let x = 50; x < 140; x += 10) p.px(x, y + oy, LIGHT);
  // shoulder plates
  p.ellipse(44, 34 + oy, 20, 14, MID);
  p.ellipse(140, 34 + oy, 20, 14, DARK);
  p.ring(44, 34 + oy, 20, 14, LIGHT);
  if (f >= 1) {
    // cracks in the plate
    for (let k = 0; k < 6; k++) {
      let x = 60 + Math.floor(r() * 80);
      let y = 30 + Math.floor(r() * 60) + oy;
      for (let s = 0; s < 6; s++) {
        const nx = x + Math.floor(r() * 9) - 4;
        const ny = y + Math.floor(r() * 7) - 1;
        p.line(x, y, nx, ny, BLACK);
        x = nx;
        y = ny;
      }
    }
  }
  if (f >= 2) {
    // the chest plate torn away: a white-hot core behind the bars
    p.ellipse(92, 60 + oy, 26, 22, BLACK);
    p.ellipse(92, 60 + oy, 18, 15, dead ? DARK : WHITE);
    for (let x = 72; x < 114; x += 7) p.rect(x, 42 + oy, 3, 36, DARK);
  }
  // the head: a great helm with a single visor slit
  const hy = 4 + oy;
  p.rect(62, hy, 46, 28, DARK);
  p.ellipse(85, hy + 4, 24, 10, DARK);
  p.rect(64, hy + 2, 42, 4, MID);
  p.rect(66, hy + 14, 38, 5, BLACK);
  if (!dead) {
    const glow = f === 2 ? WHITE : LIGHT;
    p.rect(70, hy + 15, 10, 3, glow);
    p.rect(88, hy + 15, 10, 3, glow);
  }
  for (const x of [72, 85, 98]) p.px(x, hy + 24, LIGHT);
  p.outline(BLACK);
  return p;
}

/** Ironclad's fist arm (40x78), hanging from a pivot at its top centre. */
export function ironArm(): PC {
  const p = new PC(40, 78);
  p.ellipse(20, 10, 14, 10, MID);
  p.rect(12, 14, 16, 40, DARK);
  p.rect(14, 16, 4, 36, MID);
  p.rect(6, 52, 28, 24, MID);
  p.rect(6, 52, 28, 3, LIGHT);
  for (let y = 58; y < 76; y += 6) p.rect(8, y, 24, 1, DARK);
  p.outline(BLACK);
  return p;
}

/**
 * Ironclad's hammer arm (60x150): the arm and the oversized hammer it grips, pointing
 * straight down from the shoulder pivot (top centre). Frame 1: the hammer glows (judgment).
 */
export function ironHammer(f: number): PC {
  const p = new PC(60, 150);
  p.ellipse(30, 10, 16, 10, MID);
  p.rect(22, 14, 16, 36, DARK);
  p.rect(18, 48, 24, 14, MID); // the fist round the haft
  p.rect(26, 60, 8, 50, DARK); // the haft
  p.rect(27, 60, 2, 50, MID);
  // the head: a block of iron as big as a person
  p.rect(2, 108, 56, 40, f ? WHITE : MID);
  p.rect(2, 108, 56, 4, LIGHT);
  p.rect(2, 144, 56, 4, DARK);
  for (const x of [10, 30, 48]) p.circle(x, 128, 3, DARK);
  if (f) p.dither(0, 104, 60, 46, LIGHT, 0.3, true);
  p.outline(BLACK);
  return p;
}

/** A plate of Ironclad's armor knocked loose (22x16). */
export function ironPlate(): PC {
  const p = new PC(22, 16);
  p.poly([[0, 4], [18, 0], [22, 12], [4, 16]], MID);
  p.line(2, 6, 18, 3, LIGHT);
  p.px(6, 9, LIGHT);
  p.px(15, 7, LIGHT);
  p.outline(BLACK);
  return p;
}

/**
 * Milo in battle (36x52): 0 standing, whistle up; 1 commanding (pointing); 2 furious;
 * 3 on his knees. His coat is far too big for him: it was his father's.
 */
export function miloBattle(f: number): PC {
  const p = new PC(36, 52);
  const kneel = f === 3;
  const oy = kneel ? 12 : 0;
  // legs
  if (!kneel) {
    p.rect(13, 38, 4, 12, BLACK);
    p.rect(20, 38, 4, 12, BLACK);
    p.rect(11, 48, 7, 3, DARK);
    p.rect(19, 48, 7, 3, DARK);
  } else {
    p.rect(10, 44, 18, 6, BLACK);
  }
  // the enormous coat, sleeves past his hands, hem dragging
  p.poly([[10, 18 + oy], [26, 18 + oy], [30, 46 + oy - (kneel ? 6 : 0)], [6, 46 + oy - (kneel ? 6 : 0)]], DARK);
  p.line(18, 20 + oy, 18, 44 + oy, BLACK);
  p.rect(10, 18 + oy, 16, 3, MID); // the collar turned up
  for (const y of [26, 32, 38]) p.px(16, y + oy, LIGHT); // buttons
  // arms
  if (f === 1) {
    p.thick(12, 22, 0, 18, DARK, 4); // pointing hard at you
    p.px(0, 18, LIGHT);
    p.thick(25, 22, 28, 34, DARK, 4);
  } else if (f === 2) {
    p.thick(12, 22, 10, 10, DARK, 4); // hands in his hair
    p.thick(25, 22, 27, 10, DARK, 4);
  } else if (kneel) {
    p.thick(12, 30, 10, 42, DARK, 4);
    p.thick(25, 30, 27, 42, DARK, 4);
  } else {
    p.thick(12, 22, 8, 30, DARK, 4);
    p.thick(25, 22, 24, 14, DARK, 4);
    p.rect(22, 10, 4, 3, WHITE); // the tamer's whistle
  }
  // head: messy dark hair, goggles pushed up, a sharp young face
  const hy = 10 + oy;
  p.ellipse(18, hy, 7, 7, LIGHT);
  p.ellipse(18, hy - 5, 8, 4, BLACK);
  for (const x of [11, 15, 21, 25]) p.px(x, hy - 8, BLACK);
  p.rect(11, hy - 3, 14, 2, DARK);
  p.ring(14, hy - 3, 2, 1, MID);
  p.ring(22, hy - 3, 2, 1, MID);
  if (kneel) {
    p.line(14, hy + 1, 16, hy + 1, BLACK);
    p.line(20, hy + 1, 22, hy + 1, BLACK);
    p.px(14, hy + 3, WHITE); // tears
    p.px(22, hy + 4, WHITE);
  } else if (f === 2) {
    p.line(13, hy - 1, 16, hy, BLACK);
    p.line(20, hy, 23, hy - 1, BLACK);
    p.rect(15, hy + 3, 6, 2, BLACK);
  } else {
    p.px(15, hy, BLACK);
    p.px(21, hy, BLACK);
    p.line(16, hy + 4, 20, hy + 3, BLACK); // a thin, certain smile
  }
  p.outline(BLACK);
  return p;
}

// ================================================================== Titans: overworld sprites

/**
 * Scorvex in the streets (84x60), facing left: 0-1 walking, 2 tail raised, 3 battered.
 * Built like its battle form so the front reads at a glance: a heavy steel head with
 * a brow, two furnace eyes and a row of teeth, pincers reaching forward, the furnace
 * grille and smokestacks on the back, and the tail curled up over the rear.
 */
export function owScorvex(f: number): PC {
  const p = new PC(84, 60);
  const step = f === 1 ? 2 : 0;
  const dead = f === 3;
  // far legs first (darker), then the near ones
  for (const [x, k, c] of [
    [30, 1, DARK],
    [62, 0, DARK],
    [24, 0, MID],
    [56, 1, MID],
  ] as const) {
    const s = k ? step : -step;
    p.thick(x, 36, x - 4 + s, 46, DARK, 3);
    p.thick(x - 4 + s, 46, x - 2 + s, 56, c, 3);
    p.rect(x - 6 + s, 55, 8, 3, DARK);
  }
  // the torso: a wedge of plate, heavier at the back
  p.poly([[22, 30], [36, 17], [70, 19], [80, 32], [70, 44], [24, 44]], MID);
  p.shade((x, y) => (y < 45 && x > 20 && p.get(x, y) === MID ? 1.15 - (y - 17) / 30 : null), [DARK, MID, LIGHT]);
  for (let x = 42; x < 76; x += 9) p.line(x, 21, x - 4, 42, DARK); // plate seams
  // the furnace grille along the flank
  p.rect(38, 30, 26, 8, BLACK);
  for (let x = 40; x < 62; x += 4) p.rect(x, 31, 2, 6, dead ? DARK : LIGHT);
  // smokestacks
  for (const x of [40, 48]) {
    p.rect(x, 10, 5, 9, DARK);
    p.rect(x - 1, 9, 7, 2, MID);
  }
  // the head: low, heavy, a blunt steel muzzle
  p.poly([[1, 34], [9, 23], [28, 23], [32, 36], [27, 46], [5, 45]], MID);
  p.rect(3, 39, 25, 2, DARK); // the jaw line
  for (let x = 4; x < 26; x += 4) p.poly([[x, 39], [x + 2, 39], [x + 1, 42]], dead ? MID : WHITE); // steel teeth
  // a heavy brow and two furnace eyes under it
  p.thick(5, 27, 27, 25, DARK, 2);
  if (dead) {
    p.line(8, 31, 12, 31, BLACK);
    p.line(17, 30, 21, 30, BLACK);
  } else {
    p.rect(7, 29, 6, 3, WHITE);
    p.rect(16, 28, 6, 3, WHITE);
    p.px(7, 29, LIGHT);
    p.px(16, 28, LIGHT);
  }
  // a pincer tucked under the jaw, opening when it rears
  const open = dead ? 0 : f === 2 ? 3 : 1;
  p.thick(16, 45, 7, 49, DARK, 3);
  p.poly([[8, 46], [1, 45 - open], [4, 49]], MID);
  p.poly([[8, 51], [1, 53 + open], [4, 49]], MID);
  // the tail
  const raised = f === 2;
  const pts = raised
    ? [[72, 22], [80, 9], [74, 1], [63, 2]]
    : [[72, 22], [81, 13], [81, 3], [71, 1]];
  for (let i = 0; i < pts.length - 1; i++) p.thick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], i % 2 ? LIGHT : MID, 4);
  const [sx, sy] = pts[pts.length - 1];
  p.circle(sx, sy + 3, 4, DARK);
  p.circle(sx, sy + 3, 2, dead ? MID : raised ? WHITE : LIGHT);
  if (dead) for (const [x, y] of [[40, 22], [56, 24], [68, 30]]) p.line(x, y, x + 4, y + 5, BLACK);
  p.outline(BLACK);
  return p;
}

/** Widowmaker in the streets (100x72): 0-1 walking, 2 rearing up, 3 battered. */
export function owWidow(f: number): PC {
  const p = new PC(100, 72);
  const step = f === 1 ? 3 : 0;
  const rear = f === 2 ? -8 : 0;
  for (let i = 0; i < 4; i++) {
    const s = i % 2 ? step : -step;
    const bx = 34 + i * 10;
    // far legs
    p.thick(bx, 36 + rear, bx - 14 + i * 4, 16 + rear, DARK, 2);
    p.thick(bx - 14 + i * 4, 16 + rear, bx - 24 + i * 12 + s, 70, DARK, 2);
    // near legs, blades at the tips
    p.thick(bx, 40 + rear, bx - 8 + i * 6, 20 + rear, MID, 3);
    p.thick(bx - 8 + i * 6, 20 + rear, bx - 16 + i * 14 - s, 70, MID, 3);
    p.px(bx - 16 + i * 14 - s, 70, WHITE);
  }
  p.ellipse(64, 34 + rear, 26, 20, MID);
  p.poly([[60, 24 + rear], [68, 24 + rear], [64, 33 + rear]], WHITE);
  p.poly([[60, 42 + rear], [68, 42 + rear], [64, 33 + rear]], WHITE);
  p.ellipse(28, 42 + rear, 14, 10, DARK);
  for (const [x, y] of [[22, 38], [30, 38], [18, 44], [34, 44]]) p.circle(x, y + rear, 1.5, f === 3 ? MID : WHITE);
  p.outline(BLACK);
  return p;
}

/**
 * Ironclad in the streets (80x104): 0-1 walking, 2 hammer raised, 3 hammer smashing
 * down, 4 battered, 5-6 a full stride (5: its left foot lifted clear of the ground,
 * 6: its right), for walks that plant one heavy foot at a time.
 */
export function owIronclad(f: number): PC {
  const p = new PC(80, 104);
  const step = f === 1 ? 2 : 0;
  const lift = (side: 0 | 1) => (f === 5 && side === 0) || (f === 6 && side === 1);
  for (const [x, side] of [[24, 0], [44, 1]] as const) {
    if (lift(side)) {
      // the lifted leg: knee bent, the foot up off the cobbles
      p.rect(x, 68, 12, 22, DARK);
      p.rect(x - 4, 88, 20, 6, MID);
    } else {
      const h = side ? 30 - step + 2 : 30 + step;
      p.rect(x, side ? 70 + step - 2 : 70 - step, 12, h, DARK);
      p.rect(x - 4, 98, 20, 6, MID);
    }
  }
  p.poly([[16, 32], [28, 22], [56, 22], [66, 34], [60, 72], [20, 72]], MID);
  for (let y = 36; y < 70; y += 8) p.line(20, y, 62, y, DARK);
  if (f === 4) for (const [x, y] of [[30, 40], [48, 50], [40, 30]]) p.line(x, y, x + 6, y + 6, BLACK);
  p.rect(30, 6, 22, 18, DARK);
  p.rect(32, 13, 18, 3, BLACK);
  p.rect(34, 13, 5, 2, LIGHT);
  p.rect(43, 13, 5, 2, LIGHT);
  // fist arm
  p.thick(20, 34, 12, 60, DARK, 6);
  p.rect(6, 58, 12, 10, MID);
  // hammer arm
  if (f === 2) {
    p.thick(60, 32, 66, 8, DARK, 6);
    p.rect(64, 0, 4, 12, DARK);
    p.rect(52, 0, 28, 14, LIGHT);
  } else if (f === 3) {
    p.thick(60, 34, 70, 60, DARK, 6);
    p.rect(68, 60, 4, 20, DARK);
    p.rect(56, 80, 24, 20, LIGHT);
  } else {
    p.thick(60, 34, 66, 58, DARK, 6);
    p.rect(65, 58, 4, 22, DARK);
    p.rect(56, 78, 22, 18, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

// ================================================================== arenas

/** The night sky over Bacchus Key: a few stars and the glow of the town. */
function nightSky(p: PC, h: number) {
  const r = artRng(41);
  for (let y = 0; y < h; y++) for (let x = 0; x < p.w; x++) p.px(x, y, y > h * 0.75 && (x + y) % 3 === 0 ? DARK : BLACK);
  for (let i = 0; i < 70; i++) p.px(Math.floor(r() * p.w), Math.floor(r() * h * 0.6), r() < 0.3 ? WHITE : MID);
}

/** Club Forever by night (680x210). `wrecked`: Ironclad has smashed a hole in the front. */
export function clubBackdrop(wrecked: boolean): PC {
  const W = 680;
  const H = 210;
  const p = new PC(W, H);
  const r = artRng(wrecked ? 7 : 3);
  nightSky(p, H);
  // the rest of the strip: hotels and bars, windows lit
  for (let i = 0; i < 10; i++) {
    const x = i * 72 + Math.floor(r() * 20) - 10;
    const h = 60 + Math.floor(r() * 70);
    const w = 50 + Math.floor(r() * 20);
    if (x > 170 && x < 470) continue;
    p.rect(x, H - h, w, h, DARK);
    for (let y = H - h + 6; y < H - 6; y += 9) for (let k = x + 5; k < x + w - 5; k += 8) if (r() < 0.6) p.rect(k, y, 4, 4, r() < 0.3 ? LIGHT : MID);
  }
  // the club: a vast black block with a marquee and the sign on the roof
  const cx = 160;
  const cw = 360;
  p.rect(cx, 52, cw, H - 52, DARK);
  p.rect(cx, 52, cw, 4, MID);
  for (let x = cx + 6; x < cx + cw; x += 8) p.rect(x, 58, 2, H - 58, BLACK); // ribbed facade
  // rows of portholes for the hotel floors
  for (let y = 66; y < 120; y += 16) for (let x = cx + 20; x < cx + cw - 20; x += 26) {
    p.circle(x, y, 4, BLACK);
    p.circle(x, y, 3, r() < 0.7 ? LIGHT : MID);
  }
  // the sign: CLUB FOREVER, in big lit letters, with bulbs around it
  p.rect(cx + 40, 14, 280, 34, BLACK);
  p.frame(cx + 40, 14, 280, 34, LIGHT);
  for (let x = cx + 44; x < cx + 318; x += 6) {
    p.px(x, 16, WHITE);
    p.px(x, 45, WHITE);
  }
  bigText(p, cx + 56, 20, 'CLUB FOREVER', 3, WHITE);
  // the entrance: a marquee, a velvet rope, a spill of light
  p.rect(cx + 130, 124, 100, 10, LIGHT);
  for (let x = cx + 132; x < cx + 228; x += 5) p.px(x, 128, WHITE);
  p.rect(cx + 150, 134, 60, H - 134, BLACK);
  p.dither(cx + 150, 134, 60, H - 134, MID, 0.3);
  if (wrecked) {
    // a ragged hole punched through the front, the dance floor lights showing inside
    const hx = cx + 250;
    p.ellipse(hx, 120, 56, 48, BLACK);
    p.ellipse(hx, 124, 46, 38, DARK);
    for (let i = 0; i < 40; i++) p.px(hx - 40 + Math.floor(r() * 80), 96 + Math.floor(r() * 50), r() < 0.5 ? WHITE : LIGHT);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      p.thick(hx + Math.cos(a) * 46, 120 + Math.sin(a) * 40, hx + Math.cos(a) * 60, 120 + Math.sin(a) * 52, MID, 2);
    }
    // the sign hangs crooked
    p.line(cx + 300, 48, cx + 320, 62, LIGHT);
  }
  // string lights across the street
  for (let k = 0; k < 3; k++) {
    for (let x = 0; x < W; x += 2) {
      const y = 70 + k * 18 + Math.round(Math.sin(x / 40 + k) * 6);
      if (x % 14 === 0) p.px(x, y, WHITE);
      else if (x % 2 === 0) p.px(x, y, DARK);
    }
  }
  return p;
}

/** The street outside the club (720x140): paving, confetti, a dropped cup or two. */
export function streetFloor(flooded: boolean): PC {
  const W = 720;
  const H = 140;
  const p = new PC(W, H);
  const r = artRng(flooded ? 19 : 17);
  for (let y = 0; y < H; y++) {
    const rowH = 6 + Math.floor(y / 14);
    for (let x = 0; x < W; x++) {
      const brick = (Math.floor(y / rowH) % 2 ? x + rowH : x) % (rowH * 3) === 0 || y % rowH === 0;
      p.px(x, y, brick ? BLACK : y < 10 ? DARK : (x + y) % 7 === 0 ? MID : DARK);
    }
  }
  if (flooded) {
    // the whole plaza is awash with booze: a dark sheet with ripples of light
    for (let y = 6; y < H; y++) for (let x = 0; x < W; x++) if ((x * 3 + y * 7) % 5 !== 0) p.px(x, y, BLACK);
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(r() * W);
      const y = 10 + Math.floor(r() * (H - 12));
      p.line(x, y, x + 6 + Math.floor(r() * 10), y, r() < 0.4 ? LIGHT : MID);
    }
  }
  for (let i = 0; i < 220; i++) p.px(Math.floor(r() * W), 6 + Math.floor(r() * (H - 6)), r() < 0.5 ? WHITE : LIGHT); // confetti
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(r() * W);
    const y = 20 + Math.floor(r() * 100);
    p.rect(x, y, 4, 5, LIGHT);
    p.px(x + 1, y + 1, WHITE);
  }
  return p;
}

/** The Great Barrel plaza (680x210). `broken`: staves burst outward, the town behind. */
export function barrelBackdrop(broken: boolean): PC {
  const W = 680;
  const H = 210;
  const p = new PC(W, H);
  const r = artRng(23);
  nightSky(p, H);
  for (let i = 0; i < 12; i++) {
    const x = i * 60 + Math.floor(r() * 16);
    const h = 50 + Math.floor(r() * 50);
    p.rect(x, H - h, 46, h, DARK);
    for (let y = H - h + 6; y < H - 4; y += 9) for (let k = x + 5; k < x + 40; k += 9) if (r() < 0.5) p.rect(k, y, 4, 4, MID);
  }
  // the barrel: a tower of staves and iron hoops, taller than the hotels
  const bx = 340;
  const bw = 150;
  if (!broken) {
    p.ellipse(bx, 40, bw / 2, 14, MID);
    p.rect(bx - bw / 2, 40, bw, H - 40, MID);
    for (let x = bx - bw / 2 + 8; x < bx + bw / 2; x += 12) p.line(x, 44, x, H, DARK);
    for (const y of [60, 110, 160]) p.rect(bx - bw / 2 - 2, y, bw + 4, 6, DARK);
    p.ellipse(bx, 40, bw / 2 - 6, 9, DARK);
  } else {
    // burst: jagged staves splayed out, hoops bent, the inside empty and dark
    p.rect(bx - bw / 2, 120, bw, H - 120, MID);
    for (let i = 0; i < 13; i++) {
      const x = bx - bw / 2 + i * 12;
      const top = 70 + Math.floor(r() * 50);
      const lean = (i - 6) * 3;
      p.thick(x, H, x + lean, top, i % 2 ? MID : LIGHT, 5);
    }
    p.ellipse(bx, 150, 50, 22, BLACK);
    p.thick(bx - 90, 160, bx + 90, 150, DARK, 4); // a hoop, snapped and twisted
    p.thick(bx + 80, 150, bx + 120, 190, DARK, 4);
  }
  bigText(p, bx - 54, broken ? 180 : 76, 'THE GREAT', 2, broken ? DARK : LIGHT);
  if (!broken) bigText(p, bx - 42, 96, 'BARREL', 2, LIGHT);
  return p;
}
