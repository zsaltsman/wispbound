import { PC, BLACK, DARK, MID, LIGHT, WHITE, artRng } from './pixel';
import { drawText } from './fontData';
import type { TrackPt } from '../world/coaster';

// Thrill Harbor: the island's rundown amusement park. Everything here was built
// to be cheerful, then left out in the salt and the floods.

/** The park entrance arch (10x6 tiles). */
export function parkGate(): PC {
  const W = 160;
  const H = 96;
  const p = new PC(W, H);
  // two towers
  for (const x of [0, 128]) {
    p.rect(x, 20, 32, 76, MID);
    for (let y = 24; y < 96; y += 6) p.rect(x, y, 32, 1, DARK);
    p.poly(
      [
        [x - 2, 22],
        [x + 16, 0],
        [x + 34, 22],
      ],
      LIGHT
    );
    for (let y = 4; y < 22; y += 3) p.line(x + 16 - y * 0.8, y, x + 16 + y * 0.8, y, MID);
    p.rect(x + 10, 40, 12, 16, BLACK);
    p.rect(x + 12, 42, 8, 12, DARK);
    drawText(p, x + 8, 62, 'TIX', WHITE);
  }
  // the arch and the sign
  for (let x = 30; x < 130; x++) {
    const y = 26 - Math.round(Math.sin(((x - 30) / 100) * Math.PI) * 18);
    p.rect(x, y, 1, 26, DARK);
    p.px(x, y, LIGHT);
    if (x % 6 === 0) p.px(x, y + 2, WHITE); // bulbs
  }
  p.rect(30, 22, 100, 22, BLACK);
  p.rect(32, 24, 96, 18, WHITE);
  drawText(p, 37, 26, 'THRILL', BLACK, 2);
  drawText(p, 37, 34, 'HARBOR', BLACK, 2);
  // half the bulbs have gone out; a sign hangs off one chain
  for (let x = 34; x < 128; x += 9) p.px(x, 23, x % 2 ? MID : WHITE);
  p.rect(58, 58, 44, 14, LIGHT);
  p.line(58, 58, 62, 46, MID);
  p.line(102, 58, 98, 50, MID);
  drawText(p, 60, 62, 'REOPENING', DARK, 0);
  p.outline(BLACK);
  return p;
}

/** The coaster track painted onto a map-sized image. */
export function coasterArt(track: TrackPt[], w: number, h: number): PC {
  const p = new PC(w, h);
  // supports first (behind the rails)
  track.forEach((t, i) => {
    if (i % 4 !== 0 || t.h < 6) return;
    const x = Math.round(t.x);
    p.rect(x - 1, Math.round(t.y - t.h), 3, Math.round(t.h), t.broken ? DARK : MID);
    p.rect(x - 1, Math.round(t.y - t.h), 1, Math.round(t.h), LIGHT);
    p.px(x, Math.round(t.y - t.h), LIGHT);
    if (i % 10 === 0 && t.h > 24) for (let k = 8; k < t.h - 6; k += 16) p.line(x - 4, t.y - k, x + 6, t.y - k - 10, DARK);
    p.rect(x - 1, Math.round(t.y), 4, 2, DARK);
  });
  // ties and two heavy rails
  track.forEach((t, i) => {
    const n = track[(i + 1) % track.length];
    const ang = Math.atan2(n.y - n.h - (t.y - t.h), n.x - t.x);
    const nx = -Math.sin(ang) * 4;
    const ny = Math.cos(ang) * 4;
    const sx = t.x;
    const sy = t.y - t.h;
    const ex = n.x;
    const ey = n.y - n.h;
    if (t.broken && i % 3 === 0) return; // gaps in the broken stretch
    if (i % 2 === 0) p.thick(sx - nx, sy - ny, sx + nx, sy + ny, DARK, 2);
    p.thick(sx - nx, sy - ny, ex - nx, ey - ny, LIGHT, 2);
    p.thick(sx + nx, sy + ny, ex + nx, ey + ny, WHITE, 2);
  });
  // the station platform with its sign
  const s = track[0];
  p.rect(s.x - 26, s.y - 10, 52, 16, DARK);
  p.rect(s.x - 26, s.y - 10, 52, 2, LIGHT);
  p.rect(s.x - 24, s.y - 28, 48, 12, BLACK);
  p.rect(s.x - 23, s.y - 27, 46, 10, WHITE);
  drawText(p, s.x - 21, s.y - 25, 'WIPEOUT', BLACK, 0);
  p.outline(BLACK);
  return p;
}

/** The coaster car, seen from the 3/4 view. */
export function coasterCar(): PC {
  const p = new PC(20, 14);
  p.rect(1, 4, 18, 8, LIGHT);
  p.rect(1, 4, 18, 2, WHITE);
  p.rect(3, 6, 6, 3, BLACK);
  p.rect(11, 6, 6, 3, BLACK);
  for (const x of [4, 15]) p.circle(x, 12, 2, DARK);
  p.rect(0, 9, 2, 2, MID);
  p.outline(BLACK);
  return p;
}

/** A-frame stand for the Ferris wheel (8x10 tiles). */
export function ferrisFrame(): PC {
  const p = new PC(128, 160);
  const cx = 64;
  const cy = 54;
  for (const s of [-1, 1]) {
    p.thick(cx, cy, cx + s * 44, 152, MID, 3);
    p.thick(cx, cy, cx + s * 30, 152, DARK, 2);
    for (let y = 70; y < 150; y += 16) p.line(cx + s * ((y - cy) * 0.46), y, cx + s * ((y - cy) * 0.3), y + 10, DARK);
  }
  p.circle(cx, cy, 5, LIGHT);
  p.circle(cx, cy, 2, BLACK);
  // the operator booth
  p.rect(96, 128, 26, 24, DARK);
  p.rect(98, 132, 10, 8, LIGHT);
  p.rect(96, 126, 26, 3, LIGHT);
  p.rect(0, 150, 128, 10, DARK);
  p.rect(0, 150, 128, 2, LIGHT);
  p.outline(BLACK);
  return p;
}

/** The wheel itself: rim and spokes (rotated in game). */
export function ferrisWheel(): PC {
  const p = new PC(160, 160);
  const c = 80;
  p.ring(c, c, 74, 74, LIGHT);
  p.ring(c, c, 72, 72, MID);
  p.ring(c, c, 50, 50, DARK);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.line(c, c, c + Math.cos(a) * 73, c + Math.sin(a) * 73, MID);
    p.circle(c + Math.cos(a) * 73, c + Math.sin(a) * 73, 2, WHITE);
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    p.px(c + Math.cos(a) * 62, c + Math.sin(a) * 62, WHITE);
  }
  p.circle(c, c, 7, LIGHT);
  p.circle(c, c, 3, DARK);
  return p;
}

export function gondola(occupied: boolean): PC {
  const p = new PC(16, 16);
  p.line(8, 0, 8, 4, LIGHT);
  p.rect(2, 4, 12, 2, WHITE);
  p.rect(3, 6, 10, 8, MID);
  p.rect(4, 7, 8, 4, BLACK);
  if (occupied) {
    p.circle(8, 8, 2, LIGHT); // a hooded head, peeking out
    p.px(7, 8, BLACK);
    p.px(9, 8, BLACK);
  }
  p.rect(2, 13, 12, 2, LIGHT);
  p.outline(BLACK);
  return p;
}

/** Two towers and the launch frame of the slingshot (8x12 tiles). */
export function slingTowers(): PC {
  const p = new PC(128, 192);
  for (const x of [12, 108]) {
    p.rect(x, 8, 8, 176, MID);
    p.rect(x, 8, 2, 176, LIGHT);
    for (let y = 16; y < 180; y += 12) {
      p.line(x - 6, y, x + 14, y + 10, DARK);
      p.rect(x - 2, y, 12, 1, DARK);
    }
    p.rect(x - 4, 2, 16, 8, LIGHT);
    p.px(x + 4, 1, WHITE);
    p.rect(x - 6, 180, 20, 12, DARK);
  }
  // the launch pad
  p.rect(40, 168, 48, 18, DARK);
  p.rect(40, 168, 48, 3, LIGHT);
  drawText(p, 44, 175, 'SLING', LIGHT, 0);
  p.outline(BLACK);
  return p;
}

/** The slingshot's passenger ball (with the player inside). */
export function slingBall(): PC {
  const p = new PC(24, 24);
  p.circle(12, 12, 10, MID);
  p.ring(12, 12, 10, 10, LIGHT);
  p.line(2, 12, 22, 12, LIGHT);
  p.line(12, 2, 12, 22, DARK);
  p.circle(12, 12, 5, BLACK);
  p.circle(12, 11, 2, LIGHT); // the rider
  p.px(11, 11, BLACK);
  p.px(13, 11, BLACK);
  p.outline(BLACK);
  return p;
}

/** The carousel (6x5 tiles). Two frames: the horses bob. */
export function carousel(f: number): PC {
  const p = new PC(96, 80);
  // roof
  p.poly(
    [
      [48, 0],
      [94, 24],
      [2, 24],
    ],
    LIGHT
  );
  for (let x = 4; x < 92; x += 8) p.poly([[x, 24], [x + 8, 24], [x + 4, 30]], (x / 8) % 2 ? WHITE : MID);
  for (let i = 1; i < 6; i++) p.line(48, 0, 48 + (i - 3) * 16, 24, MID);
  p.circle(48, 0, 2, WHITE);
  // platform
  p.ellipse(48, 66, 46, 12, DARK);
  p.ellipse(48, 64, 44, 10, MID);
  // poles and horses
  for (let i = 0; i < 5; i++) {
    const x = 12 + i * 18;
    const bob = ((i + f) % 2) * 4;
    p.rect(x, 30, 2, 34, LIGHT);
    p.ellipse(x + 1, 46 + bob, 7, 4, WHITE);
    p.rect(x - 6, 42 + bob, 3, 5, WHITE); // head
    p.line(x - 3, 50 + bob, x - 5, 56 + bob, LIGHT);
    p.line(x + 5, 50 + bob, x + 7, 56 + bob, LIGHT);
    p.px(x - 6, 43 + bob, BLACK);
  }
  // one horse has fallen off and lies on the platform
  p.ellipse(74, 68, 7, 3, LIGHT);
  p.outline(BLACK);
  return p;
}

/** The bumper car floor with a few cars piled in a corner (7x5). */
export function bumperCars(): PC {
  const p = new PC(112, 80);
  p.rect(0, 10, 112, 70, DARK);
  p.rect(2, 12, 108, 66, BLACK);
  for (let x = 2; x < 110; x += 8) for (let y = 12; y < 78; y += 8) p.px(x, y, DARK);
  // the electrified ceiling grid on posts
  for (const x of [2, 108]) p.rect(x, 0, 2, 12, LIGHT);
  p.rect(0, 0, 112, 3, MID);
  drawText(p, 30, 2, 'BUMPERS', WHITE, 0);
  const car = (x: number, y: number, c: number) => {
    p.ellipse(x, y, 9, 6, c);
    p.ellipse(x, y - 2, 5, 3, BLACK);
    p.line(x, y - 2, x, y - 9, LIGHT);
    p.ring(x, y, 10, 7, DARK);
  };
  car(20, 34, LIGHT);
  car(46, 60, MID);
  car(88, 64, WHITE);
  car(96, 52, LIGHT);
  car(78, 30, MID);
  p.outline(BLACK);
  return p;
}

/** The funhouse: a giant grinning clown face for a door (7x6). */
export function funhouse(): PC {
  const p = new PC(112, 96);
  p.rect(0, 20, 112, 76, MID);
  for (let x = 0; x < 112; x += 14) p.rect(x, 20, 7, 76, LIGHT);
  p.poly([[0, 22], [56, 0], [112, 22]], DARK);
  drawText(p, 30, 10, 'FUNHOUSE', WHITE, 0);
  // the clown
  p.circle(56, 56, 30, WHITE);
  p.ellipse(42, 46, 6, 8, BLACK);
  p.ellipse(70, 46, 6, 8, BLACK);
  p.px(43, 44, WHITE);
  p.px(71, 44, WHITE);
  p.circle(56, 58, 6, LIGHT);
  p.rect(36, 70, 40, 20, BLACK); // the mouth is the door
  for (let x = 38; x < 76; x += 6) p.rect(x, 70, 4, 4, WHITE);
  p.line(28, 40, 34, 34, DARK);
  p.line(78, 34, 84, 40, DARK);
  // the paint has run in the flood
  for (const x of [30, 48, 64, 80]) p.line(x, 76, x, 90, DARK);
  p.outline(BLACK);
  return p;
}

/** TERROR TUNNEL: the haunted ride (8x5). */
export function hauntedRide(): PC {
  const p = new PC(128, 80);
  p.rect(0, 16, 128, 64, DARK);
  for (let y = 20; y < 80; y += 6) p.rect(0, y, 128, 1, BLACK);
  // a skull arch over the tunnel
  p.ellipse(64, 54, 28, 26, BLACK);
  p.rect(36, 54, 56, 26, BLACK);
  p.circle(64, 20, 16, LIGHT);
  p.ellipse(57, 18, 4, 5, BLACK);
  p.ellipse(71, 18, 4, 5, BLACK);
  p.rect(58, 28, 12, 6, MID);
  for (let x = 58; x < 70; x += 3) p.rect(x, 28, 1, 6, BLACK);
  p.rect(0, 0, 128, 10, BLACK);
  p.rect(2, 1, 124, 8, MID);
  drawText(p, 30, 2, 'TERROR TUNNEL', WHITE, 0);
  // track entering the dark
  p.line(52, 80, 60, 60, MID);
  p.line(76, 80, 68, 60, MID);
  // a cardboard ghost, slumped over
  p.ellipse(104, 58, 8, 10, WHITE);
  p.px(101, 55, BLACK);
  p.px(106, 55, BLACK);
  p.outline(BLACK);
  return p;
}

/** A food stand with a striped awning (3x3). */
export function foodStand(kind: string): PC {
  const p = new PC(48, 48);
  p.rect(4, 22, 40, 26, MID);
  p.rect(4, 22, 40, 2, LIGHT);
  for (let x = 0; x < 48; x++) {
    const stripe = Math.floor(x / 6) % 2 === 0;
    for (let y = 12; y < 22; y++) p.px(x, y, stripe ? WHITE : DARK);
  }
  p.rect(2, 0, 44, 12, BLACK);
  p.rect(3, 1, 42, 10, LIGHT);
  drawText(p, 24 - kind.length * 3, 3, kind, BLACK);
  p.rect(10, 28, 28, 10, BLACK);
  if (kind === 'CORN DOGS') {
    p.rect(14, 30, 2, 6, LIGHT);
    p.rect(20, 30, 2, 6, LIGHT);
  } else {
    p.circle(18, 32, 3, WHITE);
    p.circle(28, 32, 3, LIGHT);
  }
  p.outline(BLACK);
  return p;
}

/** A ring toss booth with sad, water-stained prizes (3x3). */
export function gameBooth(): PC {
  const p = new PC(48, 48);
  p.rect(2, 16, 44, 32, DARK);
  p.rect(2, 2, 44, 14, MID);
  drawText(p, 6, 5, 'RING', WHITE, 0);
  drawText(p, 26, 5, 'TOSS', WHITE, 0);
  for (const [x, y] of [
    [10, 24],
    [22, 22],
    [34, 25],
  ]) {
    p.circle(x, y, 4, LIGHT);
    p.circle(x - 3, y - 3, 1, LIGHT);
    p.circle(x + 3, y - 3, 1, LIGHT);
    p.px(x - 1, y, BLACK);
    p.px(x + 1, y, BLACK);
  }
  p.rect(4, 34, 40, 4, LIGHT);
  for (let x = 8; x < 42; x += 6) p.rect(x, 30, 2, 4, MID);
  p.outline(BLACK);
  return p;
}

export function ticketBooth(): PC {
  const p = new PC(32, 48);
  p.rect(2, 14, 28, 34, MID);
  p.poly([[0, 16], [16, 2], [32, 16]], LIGHT);
  p.rect(6, 20, 20, 12, BLACK);
  p.rect(8, 22, 16, 8, DARK);
  drawText(p, 6, 36, 'TIX', WHITE);
  p.outline(BLACK);
  return p;
}

/** The sky above the park, for the slingshot launch (tall, dithered, with clouds). */
export function launchSky(w: number, h: number): PC {
  const p = new PC(w, h);
  const r = artRng(77);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const t = y / h;
      const c = t < 0.3 ? (((x + y) & 3) === 0 ? DARK : BLACK) : t < 0.65 ? ((x * 3 + y) % 4 === 0 ? MID : DARK) : (x + y * 2) % 3 === 0 ? LIGHT : MID;
      p.px(x, y, c);
    }
  // cloud banks
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(r() * w);
    const cy = Math.floor(h * 0.25 + r() * h * 0.6);
    for (let k = 0; k < 5; k++) p.ellipse(cx + k * 9 - 18, cy + (k % 2) * 3, 10 + Math.floor(r() * 6), 4, cy > h * 0.6 ? WHITE : LIGHT);
  }
  // stars at the very top
  for (let i = 0; i < 60; i++) p.px(Math.floor(r() * w), Math.floor(r() * h * 0.25), WHITE);
  return p;
}
