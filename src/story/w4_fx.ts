import Phaser from 'phaser';
import { isSet } from './state';
import type { W } from './helpers';
import { scene, bars } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { route4 } from './w4_state';

// World 4 shared pieces: the black cat, the two companions, the guardian of your
// route, the visions, and small effects used across the chapter.

export const OLD = 'OLD MAN';
export const P_OLD = 560;
export const CARLO = 'CARLO';
export const P_CARLO = 1260;

export const f = (w: W, k: string) => isSet(w.state, k);
export const px = (t: number) => t * 16 + 8;
export const py = (t: number) => t * 16 + 16;
export type Dir = 'up' | 'down' | 'left' | 'right';

/** Which companion is with you: Carlo (route B) or the old man (route A). */
export function who(w: W): 'carlo' | 'old' | null {
  if (f(w, 'w4_carlo_follow')) return 'carlo';
  if (f(w, 'w4_old_follow')) return 'old';
  return null;
}
export async function carlo(w: W, line: string, emote?: string) {
  if (emote) await w.emote(w.companion ? 'inventor' : 'carlo', emote, 450);
  await w.say(line, CARLO, { pitch: P_CARLO });
}
export async function old(w: W, line: string, emote?: string) {
  if (emote) await w.emote(w.companion ? 'inventor' : 'oldman', emote, 450);
  await w.say(line, OLD, { pitch: P_OLD });
}
/** Whoever is with you says it. */
export async function comp(w: W, line: string, emote?: string) {
  return who(w) === 'old' ? old(w, line, emote) : carlo(w, line, emote);
}

/** The guardian of your route. */
export const guardian = (w: W) => (route4(w.state) === 'B' ? 'viperwind' : 'wispmane');
export const gName = (w: W) => (guardian(w) === 'viperwind' ? 'VIPERWIND' : 'WISPMANE');
export const gCry = (w: W) => (guardian(w) === 'viperwind' ? 'hiss' : 'roar');

// ------------------------------------------------------------------ the black cat

/** The cat, as a world sprite (it never blocks the path). Sits facing left unless told. */
export function catAt(w: W, x: number, y: number, frame = 0, right = false, depth?: number) {
  const s = w.sprite('w4_cat', px(x), py(y), depth ?? py(y)).setOrigin(0.5, 1).setFrame(frame).setFlipX(right);
  return s;
}
/** Run the cat along tile steps (fast), then let it vanish. */
export async function catRun(w: W, cat: Phaser.GameObjects.Sprite, steps: Dir[], ms = 70, vanish = true) {
  cat.setFrame(2);
  for (const d of steps) {
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
    if (dx) cat.setFlipX(dx > 0);
    await w.tw({ targets: cat, x: cat.x + dx * 16, y: cat.y + dy * 16, duration: ms, onUpdate: () => cat.setDepth(cat.y) });
  }
  if (vanish) await catGone(w, cat);
  else cat.setFrame(0);
}
export async function catGone(w: W, cat: Phaser.GameObjects.Sprite, ms = 220) {
  await w.tw({ targets: cat, alpha: 0, duration: ms });
  cat.destroy();
}
/** A little paw-shaped sparkle left where the cat was. */
export function pawSparkle(w: W, x: number, y: number, ms = 2600) {
  const s = w.sprite('w4_sparkle', x, y, 9500).setOrigin(0.5, 1);
  s.play('w4_sparkle_twinkle');
  w.sfx('sparkle');
  scene(w).tweens.add({ targets: s, alpha: 0, duration: 800, delay: ms, onComplete: () => s.destroy() });
  return s;
}

// ------------------------------------------------------------------ cinematic text

/** Story narration under letterbox bars: no speaker, slow and even. */
export async function narrate(w: W, lines: string[], keepBars = false) {
  const off = bars(w);
  for (const l of lines) await w.say(l);
  if (!keepBars) await off();
  return off;
}

/** An inscription, shown close up: the carving's picture over the screen, then its words. */
export async function inscription(w: W, key: string | null, lines: string[], scale = 3) {
  const s = scene(w);
  const shade = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(85).setAlpha(0));
  let img: Phaser.GameObjects.Image | null = null;
  if (key) img = w.ui(s.add.image(SW / 2, 96, key).setScale(scale).setDepth(86).setAlpha(0));
  if (img) s.tweens.add({ targets: img, alpha: 1, duration: 400 });
  await w.tw({ targets: shade, alpha: 0.75, duration: 400 });
  for (const l of lines) await w.say(l);
  await w.tw({ targets: img ? [shade, img] : [shade], alpha: 0, duration: 300 });
  shade.destroy();
  img?.destroy();
}

/** Flamora speaks only in visions: the screen washes white and an image of what is coming forms. */
export async function vision(w: W, lines: string[]) {
  const s = scene(w);
  w.sfx('cry');
  const wash = w.ui(s.add.rectangle(0, 0, SW, SH, C.white).setOrigin(0, 0).setDepth(85).setAlpha(0));
  await w.tw({ targets: wash, alpha: 0.65, duration: 500 });
  const sky = w.ui(s.add.image(SW / 2, 90, 'w4_sky_dark').setDepth(86).setAlpha(0).setScale(0.6));
  const isle = w.ui(s.add.image(SW / 2, 120, 'w4_islefar').setDepth(87).setAlpha(0));
  const fig = w.ui(s.add.image(SW / 2 + 60, 70, 'ow_reaper', 0).setDepth(88).setAlpha(0).setScale(2.5));
  await w.tw({ targets: [sky, isle], alpha: 0.8, duration: 500 });
  w.sfx('heartbeat');
  await w.tw({ targets: fig, alpha: 0.7, duration: 700 });
  for (const l of lines) await w.say(l);
  await w.tw({ targets: [wash, sky, isle, fig], alpha: 0, duration: 500 });
  [wash, sky, isle, fig].forEach((o) => o.destroy());
}

/** Big red-letter words across the screen for a moment (TO BE CONTINUED, etc.). */
export async function bigWords(w: W, line: string, sub?: string, hold = 2400) {
  const s = scene(w);
  const t = w.ui(txt(s, SW / 2, 120, line, { outline: true, origin: [0.5, 0] }).setDepth(97).setAlpha(0));
  t.setScale(Math.max(1, Math.min(3, Math.floor((SW - 30) / Math.max(1, t.width)))));
  const t2 = sub ? w.ui(txt(s, SW / 2, 160, sub, { color: C.light, origin: [0.5, 0] }).setDepth(97).setAlpha(0)) : null;
  await w.tw({ targets: t2 ? [t, t2] : [t], alpha: 1, duration: 1200 });
  await w.wait(hold);
  return () => {
    t.destroy();
    t2?.destroy();
  };
}

/** Fireflies drifting over a patch of the island. */
export function fireflies(w: W, x0: number, y0: number, wTiles: number, hTiles: number, n: number) {
  const s = scene(w);
  for (let i = 0; i < n; i++) {
    const x = (x0 + Math.random() * wTiles) * 16;
    const y = (y0 + Math.random() * hTiles) * 16;
    const ff = w.image('fx_px', x, y, 9400).setScale(1).setAlpha(0);
    s.tweens.add({ targets: ff, alpha: { from: 0, to: 0.9 }, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 2000 });
    s.tweens.add({ targets: ff, x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 30, duration: 3000 + Math.random() * 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}

/** Hide (or show) the player, both creatures and the companion. */
export function hideAll4(w: W, v = true) {
  for (const id of ['player', 'follower', 'follower2', 'inventor']) w.hide(id, v);
}
