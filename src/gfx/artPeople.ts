import { PC, BLACK, DARK, MID, LIGHT, WHITE } from './pixel';
import { W3_ICON_ROWS } from './artIcons3items';

// Overworld characters: 16x20 frames. Sheet order is
// [down0, down1, down2, up0, up1, up2, left0, left1, left2] (right = mirrored left).

export const CW = 16;
export const CH = 20;
export type Facing = 'down' | 'up' | 'left';

export interface Look {
  hair?: 'short' | 'long' | 'bun' | 'bald' | 'spiky' | 'bow' | 'slick' | 'messy' | 'wild' | 'pomp' | 'pigtails' | 'afro' | 'mohawk' | 'ponytail' | 'swirl';
  hairC?: number;
  hat?: 'top' | 'cap' | 'straw' | 'beanie' | 'sou' | 'scarf' | 'bowler' | 'hood' | 'beret' | 'party' | 'crown' | 'chef' | 'visor' | 'headphones' | 'captain';
  hatC?: number;
  body: number;
  legs?: number;
  apron?: boolean;
  overalls?: boolean;
  beard?: number;
  glasses?: boolean;
  round?: boolean;
  small?: boolean;
  cape?: boolean;
  earrings?: boolean;
  shawl?: number;
  lantern?: boolean;
  sweat?: boolean;
  stripes?: boolean;
  dress?: boolean;
  pale?: boolean;
  rod?: boolean;
  // World 2
  goggles?: boolean;
  tie?: boolean;
  coat?: boolean; // lab coat over the body
  sash?: boolean;
  shades?: boolean;
  bag?: boolean; // carrying belongings (evacuation)
  phone?: boolean; // glued to a phone, head down
  broom?: boolean; // pretending to be busy
  // World 3
  drink?: boolean; // a cup in hand, always
  beads?: boolean; // party beads round the neck
  gown?: boolean; // a hospital gown
  bigcoat?: boolean; // a long coat, far too big
  camera?: boolean; // a tourist's camera
  mustache?: boolean;
  tray?: boolean; // carrying a tray of glasses
  vest?: number; // a waistcoat over the shirt
  headmirror?: boolean; // the doctor's reflector
  paint?: boolean; // paint splotches all over
  flowers?: boolean; // a loud flowered shirt
}

function person(o: Look, dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const dy = o.small ? 3 : 0;
  const step = f === 1 ? 1 : f === 2 ? -1 : 0;
  const bw = o.round ? 10 : o.small ? 6 : 8;
  const bx = 8 - bw / 2;
  const by = 10 + dy;
  const skin = o.pale ? WHITE : LIGHT;
  // legs
  const legC = o.legs ?? DARK;
  if (dir === 'left') {
    p.rect(6 + step, 16 + dy, 2, 4 - dy, legC);
    p.rect(9 - step, 16 + dy, 2, 4 - dy, legC);
  } else {
    p.rect(5, 16 + dy + (step > 0 ? -1 : 0), 2, 4 - dy, legC);
    p.rect(9, 16 + dy + (step < 0 ? -1 : 0), 2, 4 - dy, legC);
  }
  // body
  if (o.dress) p.poly([[bx, by], [bx + bw, by], [bx + bw + 2, 18 + dy], [bx - 2, 18 + dy]], o.body);
  else p.rect(bx, by, bw, 7, o.body);
  if (o.stripes) for (let y = by + 1; y < by + 7; y += 2) p.rect(bx, y, bw, 1, o.body === MID ? LIGHT : MID);
  if (o.overalls) {
    p.rect(bx + 1, by + 2, bw - 2, 5, MID);
    p.px(bx + 2, by + 1, MID);
    p.px(bx + bw - 3, by + 1, MID);
  }
  if (o.apron && dir !== 'up') p.rect(bx + 1, by + 2, bw - 2, 6, WHITE);
  if (o.coat) {
    p.rect(bx - 1, by, bw + 2, 9, WHITE);
    if (dir === 'down') p.rect(7, by + 1, 2, 8, o.body);
    p.rect(bx - 1, by + 8, bw + 2, 1, LIGHT);
  }
  if (o.tie && dir === 'down') {
    p.rect(7, by, 2, 1, WHITE);
    p.rect(7, by + 1, 2, 4, LIGHT);
    p.px(7, by + 5, LIGHT);
  }
  if (o.sash && dir !== 'up') p.line(bx, by, bx + bw - 1, by + 6, WHITE);
  if (o.gown) {
    p.rect(bx - 1, by, bw + 2, 9, WHITE);
    for (let y = by + 2; y < by + 9; y += 3) p.px(bx + 1 + (y % 2), y, MID);
  }
  if (o.bigcoat) {
    p.rect(bx - 2, by, bw + 4, 10, o.body);
    if (dir === 'down') p.line(8, by + 1, 8, by + 9, BLACK);
    p.rect(bx - 2, by, bw + 4, 1, MID);
  }
  if (o.vest !== undefined && dir !== 'up') {
    p.rect(bx, by, 2, 7, o.vest);
    p.rect(bx + bw - 2, by, 2, 7, o.vest);
  }
  if (o.flowers) for (const [x, y] of [[bx + 1, by + 1], [bx + bw - 3, by + 3], [bx + 2, by + 5]]) {
    p.px(x, y, WHITE);
    p.px(x + 1, y + 1, LIGHT);
  }
  if (o.paint && dir !== 'up') for (const [x, y] of [[bx + 1, by + 3], [bx + bw - 2, by + 5], [bx + 3, by + 6]]) p.px(x, y, (x + y) % 2 ? WHITE : DARK);
  if (o.beads && dir !== 'up') for (let x = bx + 1; x < bx + bw - 1; x += 2) p.px(x, by + 1 + (x % 4 === 0 ? 1 : 0), WHITE);
  if (o.camera && dir !== 'up') {
    p.rect(dir === 'left' ? bx - 1 : 6, by + 2, 4, 3, BLACK);
    p.px(dir === 'left' ? bx : 7, by + 3, WHITE);
  }
  if (o.shawl !== undefined) p.rect(bx - 1, by, bw + 2, 3, o.shawl);
  if (o.cape) {
    if (dir === 'up') p.rect(bx - 1, by - 1, bw + 2, 9, BLACK);
    else {
      p.rect(bx - 2, by - 1, 2, 9, BLACK);
      p.rect(bx + bw, by - 1, 2, 9, BLACK);
      p.px(bx - 1, by, LIGHT);
    }
  }
  // arms
  const armY = by + 1 + (dir === 'left' ? 0 : 0);
  if (dir === 'left') {
    p.rect(8 - step, armY, 2, 5, o.body === DARK ? MID : DARK);
  } else {
    p.rect(bx - 2, armY + (step > 0 ? 1 : 0), 2, 5, o.body);
    p.rect(bx + bw, armY + (step < 0 ? 1 : 0), 2, 5, o.body);
    p.px(bx - 2, armY + 5 + (step > 0 ? 1 : 0), skin);
    p.px(bx + bw + 1, armY + 5 + (step < 0 ? 1 : 0), skin);
  }
  if (o.lantern) {
    const lx = dir === 'left' ? 4 : 13;
    p.rect(lx, by + 4, 3, 4, WHITE);
    p.px(lx + 1, by + 3, MID);
  }
  if (o.broom) {
    const gx = dir === 'left' ? 3 : 13;
    p.line(gx, by - 2, gx + (dir === 'left' ? -1 : 1), 19, MID);
    p.rect(gx - 1, 17, 3, 3, LIGHT);
  }
  if (o.bag) {
    const gx = dir === 'left' ? 2 : 11;
    p.rect(gx, by + 3, 4, 5, LIGHT);
    p.rect(gx + 1, by + 2, 2, 1, MID);
  }
  if (o.rod) p.line(dir === 'left' ? 3 : 13, by + 6, dir === 'left' ? 1 : 15, 1 + dy, MID);
  if (o.drink) {
    const gx = dir === 'left' ? 3 : 13;
    p.rect(gx, by + 2, 2, 3, WHITE);
    p.px(gx, by + 1, LIGHT);
  }
  if (o.tray) {
    const gx = dir === 'left' ? 1 : 11;
    p.rect(gx, by + 1, 5, 1, LIGHT);
    p.px(gx + 1, by, WHITE);
    p.px(gx + 3, by, WHITE);
  }
  // head
  const hx = dir === 'left' ? 7 : 8;
  const hy = 6 + dy;
  p.ellipse(hx, hy, 4, 4, skin);
  // hair
  const hc = o.hairC ?? DARK;
  const hair = o.hair ?? 'short';
  if (hair !== 'bald') {
    if (dir === 'up') p.ellipse(hx, hy, 4, 4, hc);
    else {
      p.rect(hx - 4, hy - 4, 9, 3, hc);
      if (hair === 'long' || hair === 'bow') {
        p.rect(hx - 4, hy - 2, 2, 6, hc);
        if (dir !== 'left') p.rect(hx + 3, hy - 2, 2, 6, hc);
      }
      if (hair === 'spiky') for (let x = hx - 3; x <= hx + 3; x += 2) p.px(x, hy - 5, hc);
      if (hair === 'messy') {
        p.px(hx - 4, hy - 5, hc);
        p.px(hx + 1, hy - 5, hc);
        p.px(hx + 4, hy - 4, hc);
      }
      if (hair === 'slick') p.line(hx - 4, hy - 2, hx + 4, hy - 4, BLACK);
      if (hair === 'pomp') {
        p.ellipse(hx + 1, hy - 5, 4, 2, hc);
        p.px(hx + 3, hy - 6, WHITE);
      }
      if (hair === 'pigtails') {
        p.ellipse(hx - 5, hy + 1, 2, 3, hc);
        if (dir !== 'left') p.ellipse(hx + 5, hy + 1, 2, 3, hc);
        p.px(hx - 5, hy - 2, BLACK);
        if (dir !== 'left') p.px(hx + 5, hy - 2, BLACK);
      }
      if (hair === 'afro') p.ellipse(hx, hy - 3, 6, 4, hc);
      if (hair === 'mohawk') p.rect(hx - 1, hy - 7, 3, 4, hc);
      if (hair === 'ponytail' && dir === 'left') p.rect(hx + 3, hy - 2, 2, 6, hc);
      if (hair === 'swirl') {
        // a towering soft-serve swirl of hair
        p.ellipse(hx, hy - 5, 5, 2, hc);
        p.ellipse(hx, hy - 7, 4, 2, hc);
        p.ellipse(hx, hy - 9, 2, 2, hc);
        p.px(hx + 1, hy - 11, hc);
        p.px(hx - 2, hy - 7, WHITE);
      }
    }
    if (hair === 'bun') p.circle(hx, hy - 5, 2, hc);
    if (hair === 'ponytail' && dir === 'up') p.rect(hx - 1, hy + 2, 2, 5, hc);
    if (hair === 'pigtails' && dir === 'up') {
      p.ellipse(hx - 5, hy + 1, 2, 3, hc);
      p.ellipse(hx + 5, hy + 1, 2, 3, hc);
    }
    // black hair would melt into the black outline: give it a dark sheen and bright
    // hair ties so it still reads as hair (and as pigtails) rather than a dark blot
    if (hc === BLACK && hair === 'pigtails') {
      if (dir === 'up') {
        p.line(hx, hy - 3, hx, hy + 2, DARK);
        p.px(hx - 2, hy - 2, DARK);
        p.px(hx + 2, hy - 2, DARK);
      } else {
        p.line(hx - 2, hy - 3, hx + 1, hy - 3, DARK);
        p.px(hx + 2, hy - 4, DARK);
      }
      for (const sx of dir === 'left' ? [-5] : [-5, 5]) {
        p.px(hx + sx, hy - 2, WHITE);
        p.px(hx + sx + (sx < 0 ? -1 : 1), hy - 2, LIGHT);
        p.px(hx + sx + (sx < 0 ? 0 : 0), hy + 1, DARK);
        p.px(hx + sx, hy + 2, DARK);
      }
    }
    if (hair === 'wild') {
      // an explosion of white hair: the inventor
      p.ellipse(hx - 5, hy - 1, 2, 3, hc);
      if (dir !== 'left') p.ellipse(hx + 5, hy - 1, 2, 3, hc);
      p.ellipse(hx, hy - 5, 5, 2, hc);
      p.px(hx - 6, hy - 4, hc);
      p.px(hx + 6, hy - 4, hc);
      p.px(hx - 2, hy - 8, hc);
      p.px(hx + 3, hy - 8, hc);
    }
    if (hair === 'bow') {
      p.rect(hx - 3, hy - 6, 2, 2, WHITE);
      p.rect(hx + 2, hy - 6, 2, 2, WHITE);
      p.px(hx, hy - 5, WHITE);
    }
  } else if (dir === 'up') p.px(hx, hy - 2, WHITE);
  // face
  if (dir === 'down') {
    p.px(hx - 2, hy, BLACK);
    p.px(hx + 2, hy, BLACK);
    if (o.glasses) {
      p.ring(hx - 2, hy, 1, 1, BLACK);
      p.ring(hx + 2, hy, 1, 1, BLACK);
    }
  } else if (dir === 'left') {
    p.px(hx - 2, hy, BLACK);
    p.px(hx - 5, hy + 1, skin);
    if (o.glasses) p.ring(hx - 2, hy, 1, 1, BLACK);
  }
  if (o.phone && dir !== 'up') {
    // a phone held up close, its glow lighting the face
    const px0 = dir === 'left' ? hx - 5 : hx - 1;
    p.rect(px0, hy + 2, 3, 4, BLACK);
    p.rect(px0 + 1, hy + 3, 1, 2, WHITE);
    p.px(px0 - 1, hy + 4, skin);
  }
  if (o.shades && dir !== 'up') {
    if (dir === 'down') p.rect(hx - 3, hy - 1, 7, 2, BLACK);
    else p.rect(hx - 4, hy - 1, 3, 2, BLACK);
  }
  if (o.goggles) {
    p.rect(hx - 4, hy - 3, 9, 1, BLACK);
    if (dir !== 'up') {
      p.ring(hx - 2, hy - 3, 1, 1, BLACK);
      p.px(hx - 2, hy - 3, WHITE);
      if (dir === 'down') {
        p.ring(hx + 2, hy - 3, 1, 1, BLACK);
        p.px(hx + 2, hy - 3, WHITE);
      }
    }
  }
  if (o.mustache && dir !== 'up') {
    if (dir === 'down') {
      p.rect(hx - 3, hy + 2, 3, 1, BLACK);
      p.rect(hx + 1, hy + 2, 3, 1, BLACK);
    } else p.rect(hx - 5, hy + 2, 3, 1, BLACK);
  }
  if (o.headmirror && dir !== 'up') {
    p.circle(dir === 'left' ? hx - 2 : hx, hy - 3, 1, WHITE);
    p.rect(hx - 4, hy - 4, 9, 1, DARK);
  }
  if (o.beard !== undefined && dir !== 'up') {
    p.rect(hx - (dir === 'left' ? 4 : 3), hy + 2, dir === 'left' ? 5 : 7, 3, o.beard);
    p.px(hx, hy + 5, o.beard);
  }
  if (o.earrings && dir !== 'up') {
    p.px(hx - 4, hy + 2, WHITE);
    if (dir === 'down') p.px(hx + 4, hy + 2, WHITE);
  }
  // hats
  const hatC = o.hatC ?? DARK;
  switch (o.hat) {
    case 'top':
      p.rect(hx - 5, hy - 4, 11, 1, hatC);
      p.rect(hx - 3, hy - 10, 7, 6, hatC);
      p.rect(hx - 3, hy - 6, 7, 1, MID);
      break;
    case 'bowler':
      p.rect(hx - 5, hy - 4, 11, 1, hatC);
      p.ellipse(hx, hy - 6, 3, 2, hatC);
      break;
    case 'cap':
      p.ellipse(hx, hy - 4, 4, 2, hatC);
      if (dir === 'down') p.rect(hx - 3, hy - 3, 7, 1, hatC);
      if (dir === 'left') p.rect(hx - 7, hy - 3, 4, 1, hatC);
      break;
    case 'straw':
      p.rect(hx - 7, hy - 4, 15, 2, LIGHT);
      p.ellipse(hx, hy - 6, 4, 2, LIGHT);
      p.rect(hx - 4, hy - 5, 9, 1, DARK);
      break;
    case 'beanie':
      p.ellipse(hx, hy - 4, 4, 3, hatC);
      p.rect(hx - 4, hy - 3, 9, 1, MID);
      p.px(hx, hy - 8, hatC);
      break;
    case 'sou':
      p.ellipse(hx, hy - 4, 5, 3, hatC);
      p.rect(hx - 6, hy - 3, 13, 2, hatC);
      if (dir === 'left') p.rect(hx + 3, hy - 1, 4, 2, hatC);
      break;
    case 'scarf':
      p.ellipse(hx, hy - 2, 5, 4, hatC);
      if (dir !== 'up') p.ellipse(hx, hy + 1, 3, 3, skin);
      for (const [x, y] of [
        [hx - 3, hy - 4],
        [hx + 2, hy - 5],
        [hx, hy - 3],
      ])
        p.px(x, y, WHITE);
      if (dir === 'down') {
        p.px(hx - 2, hy, BLACK);
        p.px(hx + 2, hy, BLACK);
      } else if (dir === 'left') p.px(hx - 2, hy, BLACK);
      break;
    case 'beret':
      p.ellipse(hx + (dir === 'left' ? -1 : 1), hy - 4, 5, 2, hatC);
      p.px(hx + 1, hy - 7, hatC);
      break;
    case 'party':
      p.poly([[hx - 3, hy - 4], [hx + 3, hy - 4], [hx, hy - 11]], hatC);
      p.px(hx, hy - 12, WHITE);
      p.line(hx - 2, hy - 6, hx + 2, hy - 7, WHITE);
      break;
    case 'crown':
      p.rect(hx - 3, hy - 6, 7, 2, hatC);
      for (const x of [hx - 3, hx, hx + 3]) p.px(x, hy - 7, hatC);
      p.px(hx, hy - 6, WHITE);
      break;
    case 'chef':
      p.rect(hx - 3, hy - 6, 7, 2, WHITE);
      p.ellipse(hx, hy - 8, 4, 3, WHITE);
      break;
    case 'visor':
      p.rect(hx - 4, hy - 4, 9, 1, hatC);
      if (dir === 'down') p.rect(hx - 3, hy - 3, 7, 1, hatC);
      if (dir === 'left') p.rect(hx - 7, hy - 3, 4, 1, hatC);
      break;
    case 'headphones':
      p.line(hx - 4, hy - 2, hx - 2, hy - 5, hatC);
      p.line(hx - 2, hy - 5, hx + 2, hy - 5, hatC);
      p.line(hx + 2, hy - 5, hx + 4, hy - 2, hatC);
      p.rect(hx - 5, hy - 1, 2, 3, hatC);
      if (dir !== 'left') p.rect(hx + 4, hy - 1, 2, 3, hatC);
      break;
    case 'captain':
      p.ellipse(hx, hy - 4, 5, 2, hatC);
      p.rect(hx - 4, hy - 3, 9, 1, BLACK);
      p.px(hx, hy - 5, WHITE);
      break;
    case 'hood':
      p.ellipse(hx, hy - 1, 5, 5, hatC);
      if (dir === 'down') {
        p.ellipse(hx, hy + 1, 3, 3, skin);
        p.px(hx - 1, hy + 1, BLACK);
        p.px(hx + 2, hy + 1, BLACK);
      } else if (dir === 'left') {
        p.ellipse(hx - 2, hy + 1, 2, 3, skin);
        p.px(hx - 3, hy + 1, BLACK);
      }
      p.px(hx - 2, hy - 5, WHITE);
      break;
  }
  if (o.sweat && dir !== 'up') {
    p.px(hx + 5, hy - 2, WHITE);
    p.px(hx + 5, hy - 1, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** World 3: Lex the Bear Queen and her cubs (16x20 directional sheets like the people). */
function bear(kind: 'lex' | 'cub', dir: Facing, f: number): PC {
  const cub = kind === 'cub';
  // the Bear Queen stands taller than a person: her frame has room above the head
  // for her ears and the whole crown (feet stay on the bottom row, like everyone's)
  const fh = cub ? CH : CH + 8;
  const p = new PC(CW, fh);
  const s = cub ? 0.6 : 1;
  const ox = 8;
  const oy = fh;
  const step = f === 1 ? 1 : f === 2 ? -1 : 0;
  const R = (x: number, y: number, w: number, h: number, c: number) => p.rect(Math.round(ox + x * s), Math.round(oy + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c);
  // legs
  R(-6, -5 + (step > 0 ? -1 : 0), 4, 5, DARK);
  R(2, -5 + (step < 0 ? -1 : 0), 4, 5, DARK);
  // a round furry body
  p.ellipse(ox, oy - 10 * s, 7 * s, 7 * s, MID);
  if (!cub && dir !== 'up') p.rect(ox - 4, oy - 13, 8, 7, WHITE); // her apron
  // head, ears, snout
  const hy = oy - 19 * s;
  p.ellipse(ox, hy, 5 * s, 4.5 * s, MID);
  p.circle(ox - 4 * s, hy - 4 * s, 1.6 * s, MID);
  p.circle(ox + 4 * s, hy - 4 * s, 1.6 * s, MID);
  if (dir === 'down') {
    p.ellipse(ox, hy + 2 * s, 2 * s, 1.5 * s, LIGHT);
    p.px(ox, hy + 1 * s, BLACK);
    p.px(ox - 2 * s, hy - 1 * s, BLACK);
    p.px(ox + 2 * s, hy - 1 * s, BLACK);
  } else if (dir === 'left') {
    p.ellipse(ox - 4 * s, hy + 1 * s, 2 * s, 1.5 * s, LIGHT);
    p.px(ox - 6 * s, hy, BLACK);
    p.px(ox - 2 * s, hy - 1 * s, BLACK);
  }
  if (!cub) {
    // the Bear Queen's crown
    p.rect(ox - 3, hy - 6, 7, 2, WHITE);
    for (const x of [ox - 3, ox, ox + 3]) p.px(x, hy - 7, WHITE);
  }
  p.outline(BLACK);
  return p;
}

export function bearSheet(kind: 'lex' | 'cub'): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(bear(kind, d, f));
  return out;
}

export function personSheet(o: Look): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(person(o, d, f));
  return out;
}

export const LOOKS: Record<string, Look> = {
  player: { hat: 'hood', hatC: LIGHT, body: LIGHT, legs: DARK, lantern: true },
  man_hat: { hat: 'top', body: DARK, beard: MID },
  old_lady: { hair: 'bun', hairC: WHITE, body: MID, shawl: DARK, dress: true },
  man_cap: { hat: 'cap', hatC: MID, body: MID, stripes: true },
  woman: { hair: 'long', hairC: DARK, body: LIGHT, dress: true },
  old_man: { hair: 'bald', body: DARK, beard: WHITE },
  woman_bun: { hair: 'bun', hairC: BLACK, body: DARK, apron: true, dress: true },
  kid_boy: { hair: 'spiky', hairC: BLACK, body: MID, small: true },
  kid_boy2: { hat: 'cap', hatC: DARK, body: LIGHT, small: true, stripes: true },
  kid_girl: { hair: 'bow', hairC: DARK, body: LIGHT, small: true, dress: true },
  man_beard: { hair: 'short', hairC: BLACK, body: DARK, beard: BLACK },
  man_round: { hair: 'messy', hairC: DARK, body: MID, round: true },
  farmer: { hat: 'straw', body: DARK, overalls: true, beard: MID },
  assistant: { hair: 'slick', hairC: BLACK, body: BLACK, glasses: true, sweat: true },
  psychic: { hat: 'scarf', hatC: DARK, body: DARK, shawl: MID, earrings: true, dress: true },
  gerald: { hair: 'bald', body: MID, round: true, stripes: true, glasses: true },
  count: { hair: 'slick', hairC: BLACK, body: BLACK, cape: true, pale: true },
  clerk: { hat: 'cap', hatC: WHITE, body: MID, apron: true },
  fisher_keeper: { hat: 'beanie', hatC: DARK, body: MID, apron: true, beard: DARK },
  twin: { hair: 'bow', hairC: BLACK, body: MID, dress: true },
  fisherman: { hat: 'sou', hatC: LIGHT, body: DARK, beard: WHITE, rod: true, round: true },
  // ---- World 2: the flooded island
  inventor: { hair: 'wild', hairC: WHITE, body: MID, legs: DARK, coat: true, goggles: true },
  rick: { hair: 'pomp', hairC: BLACK, body: DARK, legs: BLACK, tie: true, shades: true },
  mayor2: { hat: 'top', hatC: BLACK, body: BLACK, legs: DARK, sash: true, round: true, sweat: true },
  employee: { hat: 'cap', hatC: WHITE, body: MID, stripes: true },
  banker: { hair: 'short', hairC: DARK, body: DARK, tie: true, glasses: true },
  techie: { hat: 'beanie', hatC: MID, body: LIGHT, overalls: true, glasses: true },
  official: { hair: 'slick', hairC: BLACK, body: BLACK, tie: true },
  official2: { hair: 'bald', body: DARK, tie: true, glasses: true, round: true },
  scientist: { hair: 'bun', hairC: DARK, body: LIGHT, coat: true, glasses: true },
  scientist2: { hair: 'messy', hairC: BLACK, body: LIGHT, coat: true },
  local: { hat: 'cap', hatC: DARK, body: MID, legs: DARK, beard: DARK, sweat: true },
  surfer: { hair: 'long', hairC: LIGHT, body: WHITE, stripes: true },
  grandpa2: { hat: 'bowler', hatC: DARK, body: MID, beard: WHITE },
  woman2: { hair: 'bun', hairC: MID, body: MID, dress: true, glasses: true },
  woman3: { hair: 'long', hairC: BLACK, body: DARK, earrings: true },
  man2: { hair: 'short', hairC: MID, body: LIGHT, overalls: true },
  kid3: { hair: 'messy', hairC: DARK, body: WHITE, small: true, stripes: true },
  evac1: { hair: 'long', hairC: DARK, body: LIGHT, dress: true, bag: true },
  evac2: { hat: 'cap', hatC: MID, body: MID, bag: true },
  evac3: { hair: 'bald', body: DARK, beard: MID, bag: true },
  // Mad Pies (World 1) and Luke & Grace's Thrift (World 2)
  maddie: { hair: 'bun', hairC: DARK, body: MID, apron: true, dress: true },
  morgan: { hair: 'messy', hairC: BLACK, hat: 'beanie', hatC: DARK, body: DARK, phone: true },
  morgan_busy: { hair: 'messy', hairC: BLACK, hat: 'beanie', hatC: DARK, body: DARK, broom: true },
  luke: { hair: 'long', hairC: MID, body: LIGHT, stripes: true, glasses: true },
  // ---- World 3: Bacchus Key, the party island
  guide: { hat: 'visor', hatC: WHITE, body: MID, flowers: true, beads: true, legs: LIGHT },
  bouncer: { hair: 'bald', body: BLACK, legs: BLACK, round: true, shades: true },
  avalena: { hair: 'bun', hairC: DARK, hat: 'beret', hatC: BLACK, body: LIGHT, apron: true, paint: true },
  avalena_bar: { hair: 'bun', hairC: DARK, body: WHITE, vest: BLACK, legs: BLACK },
  ayla: { hair: 'pigtails', hairC: BLACK, body: DARK, legs: BLACK, bag: true },
  ayla_pack: { hair: 'pigtails', hairC: BLACK, body: DARK, legs: BLACK, bag: true, sweat: true },
  sal: { hair: 'bald', body: WHITE, vest: DARK, legs: BLACK, beard: WHITE, round: true },
  milo: { hair: 'messy', hairC: BLACK, body: DARK, legs: BLACK, bigcoat: true, goggles: true },
  milo_kid: { hair: 'messy', hairC: BLACK, body: LIGHT, small: true, stripes: true },
  milo_dad: { hair: 'short', hairC: DARK, body: MID, legs: DARK, mustache: true },
  milo_dad_sick: { hair: 'messy', hairC: MID, body: DARK, legs: DARK, mustache: true, pale: true },
  doctor: { hair: 'short', hairC: MID, body: LIGHT, coat: true, glasses: true, headmirror: true },
  nurse: { hair: 'bun', hairC: DARK, body: WHITE, dress: true },
  patient: { hair: 'messy', hairC: MID, body: WHITE, gown: true, legs: LIGHT },
  patient2: { hair: 'bald', body: WHITE, gown: true, legs: LIGHT, beard: MID },
  grimsby: { hair: 'wild', hairC: WHITE, body: WHITE, gown: true, legs: LIGHT, mustache: true },
  dj: { hair: 'afro', hairC: BLACK, hat: 'headphones', hatC: WHITE, body: BLACK, shades: true },
  receptionist: { hair: 'slick', hairC: BLACK, body: DARK, tie: true },
  partier1: { hair: 'long', hairC: LIGHT, hat: 'party', hatC: WHITE, body: DARK, drink: true, dress: true },
  partier2: { hair: 'spiky', hairC: BLACK, body: WHITE, shades: true, drink: true, beads: true },
  partier3: { hair: 'ponytail', hairC: DARK, body: MID, earrings: true, drink: true },
  partier4: { hair: 'mohawk', hairC: WHITE, body: BLACK, legs: DARK, beads: true },
  partier5: { hair: 'afro', hairC: DARK, body: LIGHT, flowers: true, drink: true },
  partier6: { hat: 'party', hatC: LIGHT, hair: 'short', hairC: BLACK, body: MID, round: true, drink: true },
  tourist: { hat: 'straw', body: LIGHT, flowers: true, camera: true },
  tourist2: { hat: 'visor', hatC: MID, hair: 'bun', hairC: WHITE, body: WHITE, camera: true, dress: true },
  waiter: { hair: 'slick', hairC: BLACK, body: WHITE, vest: BLACK, tray: true },
  performer: { hat: 'top', hatC: WHITE, body: BLACK, stripes: true, pale: true },
  lin: { hair: 'bun', hairC: MID, body: MID, apron: true, glasses: true },
  kevin: { hair: 'short', hairC: BLACK, body: LIGHT, apron: true },
  morty: { hat: 'captain', hatC: WHITE, body: DARK, beard: LIGHT, round: true },
  dottie: { hair: 'pigtails', hairC: DARK, hat: 'visor', hatC: WHITE, body: LIGHT, apron: true },
  baker: { hat: 'chef', body: WHITE, apron: true, round: true },
  frofro: { hair: 'swirl', hairC: WHITE, body: WHITE, mustache: true, tie: true },
  // World 4: the Forgotten Island
  oldman4: { hair: 'wild', hairC: WHITE, body: MID, legs: DARK, beard: WHITE, bigcoat: true },
  carlo: { hair: 'messy', hairC: DARK, body: LIGHT, legs: DARK, small: true, goggles: true, stripes: true },
  local3: { hair: 'short', hairC: MID, body: DARK, drink: true },
  local4: { hair: 'long', hairC: BLACK, body: LIGHT, dress: true, sweat: true },
  grace: { hair: 'bun', hairC: BLACK, body: DARK, earrings: true, glasses: true, shawl: MID },
};

// ------------------------------------------------------------------ animals

function animal(kind: 'chicken' | 'pig' | 'piglet' | 'cat' | 'cow', dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = f === 1 ? -1 : 0;
  const side = dir === 'left';
  if (kind === 'chicken') {
    p.ellipse(8, 14 + bob, 4, 3, WHITE);
    p.ellipse(side ? 5 : 8, 10 + bob, 2, 2, WHITE);
    p.rect(side ? 4 : 7, 7 + bob, 2, 2, MID); // comb
    if (dir !== 'up') p.px(side ? 3 : 8, 10 + bob, BLACK);
    p.px(side ? 2 : 8, 11 + bob, side ? MID : LIGHT);
    p.rect(7, 17, 1, 3, MID);
    p.rect(9, 17, 1, 3, MID);
    if (side) p.line(12, 12 + bob, 13, 10 + bob, LIGHT);
  } else if (kind === 'pig' || kind === 'piglet') {
    const s = kind === 'piglet' ? 0.7 : 1;
    const cy = 13 + (kind === 'piglet' ? 2 : 0);
    p.ellipse(8, cy + bob, Math.round(6 * s), Math.round(4 * s), LIGHT);
    p.shade((x, y) => 0.9 - y / 40 - (x > 9 ? 0.2 : 0), [MID, LIGHT, WHITE]);
    if (dir === 'down') {
      p.ellipse(8, cy + 1 + bob, 2, 1, MID);
      p.px(7, cy + 1 + bob, BLACK);
      p.px(9, cy + 1 + bob, BLACK);
      p.px(6, cy - 2 + bob, BLACK);
      p.px(10, cy - 2 + bob, BLACK);
    } else if (side) {
      p.rect(1, cy - 1 + bob, 3, 3, MID);
      p.px(1, cy + bob, BLACK);
      p.px(4, cy - 2 + bob, BLACK);
      p.line(13, cy - 2, 14, cy - 3, MID); // curly tail
    }
    p.rect(4, cy + Math.round(3 * s), 2, 2, MID);
    p.rect(10, cy + Math.round(3 * s), 2, 2, MID);
  } else if (kind === 'cat') {
    p.ellipse(8, 15 + bob, 4, 3, BLACK);
    p.ellipse(side ? 5 : 8, 10 + bob, 3, 3, BLACK);
    p.px(side ? 3 : 6, 7 + bob, BLACK);
    p.px(side ? 6 : 10, 7 + bob, BLACK);
    if (dir !== 'up') {
      p.px(side ? 4 : 7, 10 + bob, WHITE);
      if (!side) p.px(9, 10 + bob, WHITE);
    }
    p.line(12, 15, 14, 10 + bob, BLACK);
  } else if (kind === 'cow') {
    p.ellipse(8, 13 + bob, 7, 5, WHITE);
    p.ellipse(5, 12 + bob, 2, 2, DARK);
    p.ellipse(10, 15 + bob, 2, 1, DARK);
    p.ellipse(side ? 2 : 8, 9 + bob, 3, 3, WHITE);
    if (dir !== 'up') {
      p.px(side ? 1 : 7, 9 + bob, BLACK);
      if (!side) p.px(9, 9 + bob, BLACK);
      p.rect(side ? 0 : 6, 11 + bob, side ? 2 : 5, 2, LIGHT);
    }
    p.px(side ? 4 : 5, 6 + bob, LIGHT);
    p.px(side ? 5 : 11, 6 + bob, LIGHT);
    for (const x of [3, 6, 10, 13]) p.rect(x, 17, 1, 3, MID);
  }
  p.outline(BLACK);
  return p;
}

export function animalSheet(kind: 'chicken' | 'pig' | 'piglet' | 'cat' | 'cow'): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(animal(kind, d, f === 2 ? 0 : f));
  return out;
}

// ------------------------------------------------------------------ the mayor (a dog)

function dog(dir: Facing, f: number, bark = false): PC {
  const p = new PC(CW, CH);
  const bob = f === 1 ? -1 : 0;
  const side = dir === 'left';
  // body + legs
  p.ellipse(8, 15 + bob, side ? 5 : 4, 3, LIGHT);
  for (const x of side ? [4, 6, 10, 12] : [5, 10]) p.rect(x, 17, 1, 3 - (f === 1 && x % 4 === 0 ? 1 : 0), MID);
  // tail wagging
  p.line(side ? 13 : 12, 14, side ? 15 : 14, 11 + (f === 1 ? -1 : 1), LIGHT);
  // head
  const hx = side ? 4 : 8;
  p.ellipse(hx, 10 + bob, 3, 3, LIGHT);
  p.rect(hx - 4, 8 + bob, 2, 4, MID); // floppy ears
  if (!side) p.rect(hx + 3, 8 + bob, 2, 4, MID);
  if (dir === 'down') {
    p.px(hx - 1, 10 + bob, BLACK);
    p.px(hx + 1, 10 + bob, BLACK);
    p.px(hx, 12 + bob, BLACK);
    if (bark) p.rect(hx - 1, 13 + bob, 3, 2, BLACK);
  } else if (side) {
    p.rect(hx - 4, 11 + bob, 2, 2, LIGHT); // snout
    p.px(hx - 4, 11 + bob, BLACK);
    p.px(hx - 1, 9 + bob, BLACK);
    if (bark) p.rect(hx - 4, 13 + bob, 3, 1, BLACK);
  }
  // the mayoral sash and tiny top hat
  if (dir !== 'up') p.line(5, 13 + bob, 11, 17 + bob, WHITE);
  p.rect(hx - 2, 6 + bob, 5, 1, BLACK);
  p.rect(hx - 1, 3 + bob, 3, 3, BLACK);
  p.px(hx, 4 + bob, MID);
  p.outline(BLACK);
  return p;
}

export function dogSheet(): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(dog(d, f === 2 ? 0 : f));
  out.push(dog('down', 0, true)); // 9: bark
  out.push(dog('left', 0, true)); // 10: bark sideways
  return out;
}

// ------------------------------------------------------------------ ghosts + companions (overworld minis)

function ghost(dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = [0, -1, 0][f];
  p.ellipse(8, 7 + bob, 5, 5, LIGHT);
  p.rect(3, 7 + bob, 11, 9, LIGHT);
  for (let x = 3; x < 14; x++) if ((x + f) % 3 !== 0) p.px(x, 16 + bob, LIGHT);
  p.dither(3, 2, 11, 15, MID, 0.25);
  if (dir !== 'up') {
    p.ellipse(dir === 'left' ? 5 : 6, 7 + bob, 1, 2, BLACK);
    if (dir !== 'left') p.ellipse(10, 7 + bob, 1, 2, BLACK);
    p.ellipse(dir === 'left' ? 5 : 8, 12 + bob, 1, 1, BLACK);
  }
  p.outline(BLACK);
  return p;
}

function mini(id: string, dir: Facing, f: number): PC {
  const p = new PC(CW, CH);
  const bob = [0, -1, -1][f];
  const side = dir === 'left';
  switch (id) {
    case 'booheet': {
      p.ellipse(8, 9 + bob, 5, 5, WHITE);
      p.poly([[3, 9 + bob], [13, 9 + bob], [15, 17 + bob], [1, 17 + bob]], WHITE);
      p.shade((x) => (x > 9 ? 0.4 : 0.9), [MID, LIGHT, WHITE]);
      for (let x = 1; x < 16; x += 3) p.px(x, 17 + bob, -1);
      p.rect(5, 18, 2, 1, DARK);
      p.rect(9, 18, 2, 1, DARK);
      if (dir !== 'up') {
        const ex = side ? 4 : 6;
        p.rect(ex, 8 + bob, 1, 2, BLACK);
        p.rect(ex + 3, 8 + bob, 1, 2, BLACK);
        p.px(ex, 8 + bob, WHITE);
      }
      break;
    }
    case 'shipwraith': {
      p.poly([[1, 13 + bob], [15, 13 + bob], [13, 18 + bob], [3, 18 + bob]], DARK);
      p.rect(7, 2 + bob, 1, 11, MID);
      p.poly([[3, 4 + bob], [12, 4 + bob], [13, 11 + bob], [2, 11 + bob]], LIGHT);
      if (dir !== 'up') {
        p.px(5, 7 + bob, BLACK);
        p.px(9, 7 + bob, BLACK);
        p.line(5, 9 + bob, 9, 9 + bob, BLACK);
      }
      p.px(5, 15 + bob, WHITE);
      p.px(10, 15 + bob, WHITE);
      p.dither(3, 18, 10, 2, LIGHT, 0.4);
      break;
    }
    case 'hauntcorn': {
      // the whole scarecrow hops on its pole together; the arms rock one way, then the other
      const tilt = [0, 1, -1][f];
      p.rect(7, 11 + bob, 2, 9 - bob, DARK);
      p.line(1, 12 + bob + tilt, 15, 12 + bob - tilt, MID);
      p.rect(4, 11 + bob, 8, 6, DARK);
      p.ellipse(8, 6 + bob, 5, 4, MID);
      p.shade((x, y) => (y < 11 + bob ? 0.9 - x / 25 : null), [DARK, MID, LIGHT]);
      p.rect(7, 1 + bob, 2, 2, DARK);
      if (dir !== 'up') {
        p.px(side ? 4 : 6, 5 + bob, WHITE);
        if (!side) p.px(10, 5 + bob, WHITE);
        p.line(side ? 3 : 6, 8 + bob, side ? 7 : 10, 8 + bob, WHITE);
      }
      break;
    }
    case 'umbrawl': {
      for (let x = -6; x <= 6; x++) {
        const top = 6 + bob - Math.round(Math.sqrt(1 - (x / 6.5) ** 2) * 5);
        for (let y = top; y <= 6 + bob; y++) p.px(8 + x, y, DARK);
      }
      p.shade((x, y) => (y <= 6 + bob ? 0.8 - (x - 2) / 14 : null), [BLACK, DARK, MID]);
      p.rect(7, 6 + bob, 1, 9, MID);
      p.line(7, 15 + bob, 5, 16 + bob, MID);
      if (dir !== 'up') {
        p.rect(side ? 4 : 8, 3 + bob, 3, 1, WHITE);
        p.px(side ? 4 : 9, 3 + bob, BLACK);
      }
      // the two floating fists
      p.rect(1, 10 + (f === 1 ? 0 : 1), 3, 3, MID);
      p.px(1, 10 + (f === 1 ? 0 : 1), LIGHT);
      p.rect(12, 9 + (f === 2 ? 0 : 1), 3, 3, MID);
      p.px(12, 9 + (f === 2 ? 0 : 1), LIGHT);
      break;
    }
    case 'tickraith': {
      p.rect(4, 3, 8, 16, DARK);
      p.rect(4, 3, 1, 16, MID);
      p.poly([[3, 4], [8, 0], [13, 4]], DARK);
      p.circle(8, 6, 3, WHITE);
      p.line(8, 6, 8 + [0, 2, -2][f], 4, BLACK);
      if (dir !== 'up') {
        p.px(7, 5, BLACK);
        p.px(9, 5, BLACK);
      }
      p.rect(6, 11, 4, 6, BLACK);
      p.line(8, 11, 8 + [0, 1, -1][f], 15, MID);
      p.px(8 + [0, 1, -1][f], 16, LIGHT);
      break;
    }
  }
  p.outline(BLACK);
  return p;
}

export function ghostSheet(): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(ghost(d, f));
  return out;
}

export function miniSheet(id: string): PC[] {
  const out: PC[] = [];
  for (const d of ['down', 'up', 'left'] as Facing[]) for (let f = 0; f < 3; f++) out.push(mini(id, d, f));
  return out;
}

/** A plain grandfather clock... or rather, the hideous clock on a stool (replacement for Tickraith). */
export function grandClock(): PC {
  const p = new PC(48, 48);
  p.rect(18, 30, 12, 2, MID);
  p.rect(19, 32, 2, 16, DARK);
  p.rect(27, 32, 2, 16, DARK);
  p.poly([[16, 30], [17, 16], [24, 10], [31, 16], [32, 30]], DARK);
  p.circle(24, 21, 5, LIGHT);
  p.circle(22, 19, 1, WHITE);
  p.circle(27, 20, 1, WHITE);
  p.px(22, 20, BLACK);
  p.px(27, 21, BLACK);
  p.line(21, 25, 27, 24, BLACK);
  p.outline(BLACK);
  return p;
}

/** What is left of the little wreck in the cave once Shipwraith has left. */
export function wreck(): PC {
  const p = new PC(48, 48);
  p.poly([[6, 40], [40, 36], [36, 46], [10, 46]], DARK);
  p.line(22, 38, 30, 18, MID);
  p.poly([[24, 22], [34, 24], [30, 32]], MID);
  p.dither(6, 36, 34, 10, BLACK, 0.4);
  p.outline(BLACK);
  return p;
}

// ------------------------------------------------------------------ fish, items, emotes

export function fishArt(kind: string): PC {
  const p = new PC(32, 20);
  if (kind === 'squid') {
    p.ellipse(10, 9, 8, 5, LIGHT);
    for (let i = 0; i < 5; i++) p.line(17, 6 + i * 2, 30, 4 + i * 3, MID);
    p.circle(8, 8, 1, BLACK);
  } else if (kind === 'eel') {
    for (let x = 2; x < 30; x++) {
      const y = 10 + Math.round(Math.sin(x * 0.4) * 4);
      p.rect(x, y - 1, 1, 3, DARK);
      p.px(x, y - 1, MID);
    }
    p.px(4, 9, WHITE);
  } else if (kind === 'boot') {
    p.rect(8, 2, 8, 12, DARK);
    p.rect(8, 12, 18, 6, DARK);
    p.rect(8, 2, 8, 2, MID);
    p.px(22, 13, LIGHT);
  } else if (kind === 'bellfish') {
    p.ellipse(16, 8, 7, 7, LIGHT);
    p.poly([[9, 13], [16, 19], [23, 13]], WHITE);
    p.shade((x, y) => 1 - x / 50 - y / 40, [MID, LIGHT, WHITE]);
    p.circle(13, 6, 1, BLACK);
    p.circle(19, 6, 1, BLACK);
    p.line(12, 11, 20, 11, MID);
    p.px(11, 3, WHITE);
    p.line(16, 0, 16, 2, LIGHT);
  } else {
    // cod / salmon
    p.ellipse(14, 10, 10, 5, kind === 'salmon' ? LIGHT : MID);
    p.poly([[23, 10], [30, 4], [30, 16]], kind === 'salmon' ? MID : DARK);
    p.circle(7, 9, 1, BLACK);
    p.line(5, 12, 9, 12, DARK);
    if (kind === 'cod') for (let x = 9; x < 22; x += 3) p.px(x, 8, DARK);
    else p.line(8, 13, 22, 13, WHITE);
  }
  p.outline(BLACK);
  return p;
}

const ICON_ROWS: Record<string, string[]> = {
  it_key: ['............', '.444........', '4..4........', '4..444444...', '4..4...4.4..', '.444...4.4..', '............'],
  it_keybig: ['..4444......', '.4....4.....', '.4.44.4.....', '.4....44444.', '..4444..4.4.', '........4.4.', '............'],
  it_bucket: ['............', '..44444444..', '.4........4.', '.4.333333.4.', '..4333333.4.', '..4......4..', '...444444...'],
  it_planks: ['............', '333333333333', '222222222222', '............', '333333333333', '222222222222', '............'],
  it_book: ['.4444444....', '.43333334...', '.43....34...', '.43333334...', '.43....34...', '.43333334...', '.4444444....'],
  it_clock: ['...4444.....', '..433334....', '.43.4..34...', '.43.44.34...', '.43....34...', '..433334....', '...4444.....'],
  it_rod: ['.........4..', '........4.4.', '.......4..4.', '......4...4.', '.....4....4.', '...44.....3.', '..44.......3'],
  it_bellfish: ['....444.....', '...44444....', '..4404044...', '..4444444...', '...44444....', '....444.....', '.....4......'],
  it_fish: ['............', '..3333...3..', '.33033333...', '333333333...', '.3333333.3..', '..3333......', '............'],
  it_squid: ['..3333......', '.330333.....', '.3333333....', '..33333.....', '..3.3.3.....', '.3..3..3....', '............'],
  it_eel: ['............', '.2......22..', '222...22..2.', '...2222.....', '............', '............', '............'],
  it_boot: ['..222.......', '..222.......', '..222.......', '..222222....', '..2222222...', '............', '............'],
  it_eye: ['....444.....', '..4444444...', '.443000344..', '.44300034...', '..4444444...', '....444.....', '............'],
  it_tooth: ['..444444....', '.44444444...', '.44444444...', '..44..44....', '..4....4....', '..4....4....', '............'],
  it_sandwich: ['............', '..33333333..', '.2222222222.', '.4444444444.', '.2222222222.', '..33333333..', '............'],
  it_doll: ['....444.....', '...40404....', '....444.....', '...44444....', '....444.....', '....4.4.....', '............'],
  it_coin: ['...44444....', '..4333334...', '.433040334..', '.433333334..', '..4303034...', '...44444....', '............'],
  it_spoon: ['.....444....', '....44444...', '.....444....', '......4.....', '......4.....', '......4.....', '......4.....'],
  it_bone: ['............', '.44......44.', '..44444444..', '.44......44.', '............', '............', '............'],
  it_feather: ['.........44.', '........444.', '.......444..', '.....4444...', '...4444.....', '..44........', '.4..........'],
  // World 2: the submarine parts
  it_transducer: ['..44444444..', '.4.3.3.3.34.', '.4333333334.', '44.2.2.2.244', '.4333333334.', '.4.3.3.3.34.', '..44444444..'],
  it_deflector: ['.....44.....', '...443344...', '..43344334..', '.4334..4334.', '..43344334..', '...443344...', '.....44.....'],
  it_turbo: ['...4444.....', '..433334....', '.43.44.3444.', '.434..43444.', '.43.44.34...', '..433334....', '...4444.....'],
  it_pb: ['...444444...', '...333333...', '..44444444..', '..42222224..', '..42444424..', '..42222224..', '..44444444..'],
  it_cash: ['............', '.4444444444.', '.4.3333333..', '.433.44.334.', '.4.3333333..', '.4444444444.', '............'],
  it_list: ['..44444444..', '..4......4..', '..4.333..4..', '..4......4..', '..4.333..4..', '..4......4..', '..44444444..'],
};

export function itemIcon(key: string): PC {
  const p = new PC(12, 12);
  const rows = ICON_ROWS[key] ?? ICON_ROWS.it_key;
  rows.forEach((r, y) => {
    for (let x = 0; x < 12; x++) {
      const c = r[x];
      if (c === '.') continue;
      p.px(x, y + 2, Number(c));
    }
  });
  p.outline(BLACK);
  return p;
}
Object.assign(ICON_ROWS, W3_ICON_ROWS);
export const ITEM_ICON_KEYS = Object.keys(ICON_ROWS);

export function emote(kind: string): PC {
  const p = new PC(14, 14);
  p.ellipse(7, 6, 6, 5, WHITE);
  p.poly([[4, 10], [7, 13], [8, 10]], WHITE);
  switch (kind) {
    case '!':
      p.rect(6, 2, 2, 5, BLACK);
      p.rect(6, 8, 2, 2, BLACK);
      break;
    case '?':
      p.rect(5, 2, 4, 1, BLACK);
      p.px(9, 3, BLACK);
      p.px(8, 4, BLACK);
      p.rect(6, 5, 2, 2, BLACK);
      p.rect(6, 8, 2, 2, BLACK);
      break;
    case '...':
      for (const x of [3, 6, 9]) p.rect(x, 6, 2, 2, BLACK);
      break;
    case 'note':
      p.rect(8, 2, 1, 6, BLACK);
      p.rect(9, 2, 2, 1, BLACK);
      p.ellipse(6, 8, 2, 1, BLACK);
      break;
    case 'heart':
      p.circle(5, 5, 2, BLACK);
      p.circle(9, 5, 2, BLACK);
      p.poly([[3, 6], [11, 6], [7, 10]], BLACK);
      break;
    case 'anger':
      p.line(3, 3, 6, 6, BLACK);
      p.line(11, 3, 8, 6, BLACK);
      p.line(3, 9, 6, 6, BLACK);
      p.line(11, 9, 8, 6, BLACK);
      break;
    case 'zzz':
      p.line(3, 3, 7, 3, BLACK);
      p.line(7, 3, 3, 7, BLACK);
      p.line(3, 7, 7, 7, BLACK);
      p.px(10, 6, BLACK);
      break;
    case 'tear':
      p.poly([[7, 2], [9, 6], [5, 6]], DARK);
      p.circle(7, 7, 2, DARK);
      p.px(6, 6, WHITE);
      break;
    case 'tick':
      p.ring(7, 6, 3, 3, BLACK);
      p.line(7, 6, 7, 4, BLACK);
      p.line(7, 6, 9, 6, BLACK);
      break;
  }
  p.outline(BLACK);
  return p;
}
export const EMOTES = ['!', '?', '...', 'note', 'heart', 'anger', 'zzz', 'tick', 'tear'];
