import Phaser from 'phaser';
import type { W } from './helpers';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { BOX_Y, BOX_H } from '../scenes/world/Dialog';

// Small cinematic tools shared by the World 2 scenes.

export const PIP = 'PIPWICK';
export const P_PIP = 980;

export const scene = (w: W) => w as unknown as Phaser.Scene;
export const cam = (w: W) => scene(w).cameras.main;

/** The professor says something, if he is with you. */
export async function pip(w: W, line: string, emote?: string) {
  if (!w.companion && !w.actor('pipwick')) return;
  const id = w.companion ? 'inventor' : 'pipwick';
  if (emote) await w.emote(id, emote, 500);
  await w.say(line, PIP, { pitch: P_PIP });
}

/** Pan the camera to a pixel position (bounds off), optionally zooming. */
export function camPx(w: W, x: number, y: number, ms: number, zoom?: number, ease = 'Sine.easeInOut') {
  const c = cam(w);
  c.stopFollow();
  c.removeBounds();
  return new Promise<void>((r) => {
    if (ms <= 0) {
      c.centerOn(x, y);
      if (zoom) c.setZoom(zoom);
      r();
      return;
    }
    c.pan(x, y, ms, ease, true, (_c, p) => p === 1 && r());
    if (zoom) c.zoomTo(zoom, ms, ease, true);
  });
}

/** Follow any world object with the camera (cutscenes). */
export function camFollow(w: W, obj: Phaser.GameObjects.GameObject & { x: number; y: number }, lerp = 0.12, zoom?: number) {
  const c = cam(w);
  c.removeBounds();
  c.startFollow(obj, false, lerp, lerp);
  if (zoom) c.zoomTo(zoom, 600, 'Sine.easeInOut', true);
}

/** A word that pops up in the world and floats away (ride screams, engine noises). */
export function pop(w: W, x: number, y: number, s: string, color: number = C.white, ms = 900) {
  const t = txt(scene(w), x, y, s, { color, outline: true, origin: [0.5, 1] });
  t.setDepth(9900);
  w.worldLayer.add(t);
  scene(w).tweens.add({ targets: t, y: y - 18, alpha: 0, duration: ms, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  return t;
}

/** How far the dialogue box rises while the letterbox bars are down (box bottom sits 2px above the bar). */
const BAR_LIFT = BOX_Y + BOX_H + 2 - (SH - 24);

/** Letterbox bars for big cinematic moments. Returns a remover. */
export function bars(w: W, on = true) {
  const s = scene(w);
  const top = w.ui(s.add.rectangle(0, -24, SW, 24, C.black).setOrigin(0, 0).setDepth(88));
  const bot = w.ui(s.add.rectangle(0, SH, SW, 24, C.black).setOrigin(0, 0).setDepth(88));
  if (on) {
    s.tweens.add({ targets: top, y: 0, duration: 400 });
    s.tweens.add({ targets: bot, y: SH - 24, duration: 400 });
    // keep every line of dialogue clear of the bottom bar
    w.dialog.lift(BAR_LIFT);
  }
  return async () => {
    w.dialog.lift(0);
    await new Promise<void>((r) => {
      s.tweens.add({ targets: top, y: -24, duration: 300 });
      s.tweens.add({ targets: bot, y: SH, duration: 300, onComplete: () => r() });
    });
    top.destroy();
    bot.destroy();
  };
}

/** A full-screen black card with a big title (WORLD 2, THE CAVE OF THE GODS). */
export async function titleCard(w: W, small: string, big: string, hold = 2600, keepBlack = false) {
  const s = scene(w);
  const black = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(95));
  const t1 = w.ui(txt(s, SW / 2, 104, small, { color: C.mid, origin: [0.5, 0] }).setDepth(96).setAlpha(0));
  const t2 = w.ui(txt(s, SW / 2, 122, big, { color: C.white, outline: true, origin: [0.5, 0] }).setDepth(96).setAlpha(0));
  const sc = Math.min(3, Math.floor((SW - 30) / Math.max(1, t2.width)));
  t2.setScale(Math.max(1, sc));
  // a slow wave line under the title
  const g = w.ui(s.add.graphics().setDepth(96).setAlpha(0));
  const ph = { t: 0 };
  const wave = s.tweens.add({
    targets: ph,
    t: Math.PI * 2,
    duration: 2400,
    repeat: -1,
    onUpdate: () => {
      g.clear();
      g.lineStyle(1, C.light, 1);
      g.beginPath();
      for (let x = 60; x <= SW - 60; x += 4) {
        const y = 122 + t2.height * t2.scaleY + 10 + Math.sin(x * 0.05 + ph.t) * 3;
        if (x === 60) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    },
  });
  await w.wait(400);
  await w.tw({ targets: [t1, t2, g], alpha: 1, duration: 1100 });
  await w.wait(hold);
  await w.tw({ targets: [t1, t2, g], alpha: 0, duration: 900 });
  wave.stop();
  t1.destroy();
  t2.destroy();
  g.destroy();
  if (keepBlack) return black;
  await w.tw({ targets: black, alpha: 0, duration: 1200 });
  black.destroy();
  return null;
}

/** Fade a full-screen black cover in or out over the UI (keeps dialog readable). */
export function blackout(w: W, alpha = 1, depth = 80) {
  const s = scene(w);
  return w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(depth).setAlpha(alpha));
}

/** Hide the player and both followers (cutscene sets where you are only watching). */
export function hideParty(w: W, v = true) {
  w.hide('player', v);
  w.hide('follower', v);
  w.hide('inventor', v);
}

/** Load a map instantly (no fade, no enter script): cutscenes cut between sets. */
export function cut(w: W, map: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right' = 'down') {
  w.loadMap(map, x, y, dir);
}
