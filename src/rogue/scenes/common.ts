import Phaser from 'phaser';
import { GBPipeline } from '../../gfx/GBPipeline';
import { txt, box, C } from '../../ui/ui';
import { W, H } from '../../constants';
import { sound } from '../../audio/audio';
import { net } from '../net/client';
import type { Phase } from '../shared/protocol';
import type { Rarity } from '../shared/config';
import { RogueBattleView } from '../battle/view';

// ROGUELIKE: what every screen of the mode shares: following the room's state from one
// scene to the next, the little notices, the reconnecting overlay, and the rarity frames.

/** The traveller sprites players can pick to stand for them. */
export const LOOKS = ['ch_player', 'ch_ayla', 'ch_carlo', 'ch_maddie', 'ch_luke', 'ch_morgan', 'ch_kid_girl', 'ch_grace'];

/** Which scene shows which phase of a run. */
export const SCENE_FOR: Record<Phase, string> = {
  lobby: 'rogue-lobby',
  draft: 'rogue-draft',
  dungeon: 'rogue-dungeon',
  battle: 'battle',
  reward: 'rogue-dungeon',
  summary: 'rogue-summary',
};

export type Key = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'alt';

export abstract class RogueScene extends Phaser.Scene {
  private offNet: (() => void) | null = null;
  private toasts: Phaser.GameObjects.Container[] = [];
  private veil: Phaser.GameObjects.Container | null = null;
  /** Set while the scene is on its way out, so nothing reacts twice. */
  protected leaving = false;

  /** Call first thing in create(). */
  protected setup() {
    this.leaving = false;
    this.toasts = [];
    this.veil = null;
    const cam = this.cameras.main;
    cam.setPostPipeline(GBPipeline);
    cam.setBackgroundColor('#000000');
    cam.fadeIn(300, 0, 0, 0);
    this.offNet = net.on((ev) => {
      if (this.leaving) return;
      if (ev.t === 'note') this.toast(ev.text);
      else if (ev.t === 'error') this.onError(ev.msg, ev.code);
      else if (ev.t === 'status') {
        this.drawVeil();
        this.onStatus();
      } else if (!this.follow()) this.refresh();
    });
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.leaving) return;
      if (this.typing(e)) return;
      const k = keyOf(e);
      if (k) this.key(k, e);
    });
    this.events.once('shutdown', () => {
      this.offNet?.();
      this.offNet = null;
      kb.off('keydown');
      this.input.off('pointerdown');
      this.input.off('pointermove');
    });
    this.drawVeil();
  }

  /** The room's state changed and this scene still owns the phase: redraw. */
  protected abstract refresh(): void;
  protected abstract key(k: Key, e: KeyboardEvent): void;
  /** Raw key presses first go here (text fields); return true to swallow one. */
  protected typing(_e: KeyboardEvent): boolean {
    return false;
  }
  protected onError(msg: string, _code: string) {
    sound.play('deny');
    this.toast(msg);
  }
  protected onStatus() {}

  /** If the run has moved to a phase another scene shows, go there. Returns true when leaving. */
  protected follow(): boolean {
    const st = net.state;
    if (!st) {
      // the room is gone (left, lost, or closed): back to the roguelike menu
      if (this.scene.key !== 'rogue-lobby') return this.go('rogue-lobby');
      return false;
    }
    const want = SCENE_FOR[st.phase];
    // a fight is shown by the story's battle screen, which needs the fight's feed handed to it
    if (st.phase === 'battle') return net.feed ? this.go('battle', { rogue: new RogueBattleView() }) : false;
    if (want !== this.scene.key) return this.go(want);
    return false;
  }

  protected go(key: string, data: object = {}): boolean {
    if (this.leaving) return true;
    this.leaving = true;
    // (every camera: the dungeon keeps its HUD on a second one)
    for (const cam of this.cameras.cameras) if (cam !== this.cameras.main) cam.fadeOut(220, 0, 0, 0);
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
    return true;
  }

  /** A short notice at the top of the screen (who joined, who dropped, why a button did nothing). */
  toast(text: string) {
    const c = this.add.container(W / 2, 4).setDepth(900);
    const t = txt(this, 0, 4, text, { origin: [0.5, 0], maxW: W - 40, align: 'center' });
    const g = this.add.graphics();
    const w = Math.min(W - 16, t.width + 16);
    box(g, -w / 2, 0, w, t.height + 9, 'dark');
    c.add([g, t]);
    for (const o of this.toasts) o.y += t.height + 12;
    this.toasts.push(c);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: c,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          this.toasts = this.toasts.filter((x) => x !== c);
          c.destroy();
        },
      });
    });
  }

  /** While the line is down: say so, and keep the run on screen behind it. */
  private drawVeil() {
    this.veil?.destroy();
    this.veil = null;
    if (net.status !== 'reconnecting') return;
    const c = this.add.container(0, 0).setDepth(950);
    const g = this.add.graphics();
    g.fillStyle(C.black, 0.7).fillRect(0, 0, W, H);
    box(g, W / 2 - 110, H / 2 - 24, 220, 48, 'dark');
    const a = txt(this, W / 2, H / 2 - 14, 'CONNECTION LOST', { outline: true, origin: [0.5, 0] });
    const b = txt(this, W / 2, H / 2 + 4, 'RECONNECTING...', { color: C.light, origin: [0.5, 0] });
    c.add([g, a, b]);
    this.tweens.add({ targets: b, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    this.veil = c;
  }
}

function keyOf(e: KeyboardEvent): Key | null {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'up';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'down';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    case ' ':
    case 'Enter':
    case 'x':
    case 'X':
    case 'z':
    case 'Z':
      return 'ok';
    case 'Escape':
    case 'Backspace':
      return 'back';
    case 'v':
    case 'V':
    case 'Tab':
      return 'alt';
  }
  return null;
}

// ------------------------------------------------------------------ rarity

export const RARITY_PIPS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

/**
 * A frame that says how rare something is without leaning on colour: one plain line for
 * COMMON, a doubled line for RARE, cut corners and studs for EPIC, and a heavy ornamented
 * frame with a crest for LEGENDARY.
 */
export function rarityFrame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: Rarity, lit = false) {
  x = Math.round(x);
  y = Math.round(y);
  const edge = lit ? C.white : r === 'common' ? C.mid : C.light;
  const line = (inset: number, col: number) => {
    g.fillStyle(col, 1);
    g.fillRect(x + inset + 1, y + inset, w - inset * 2 - 2, 1);
    g.fillRect(x + inset + 1, y + h - inset - 1, w - inset * 2 - 2, 1);
    g.fillRect(x + inset, y + inset + 1, 1, h - inset * 2 - 2);
    g.fillRect(x + w - inset - 1, y + inset + 1, 1, h - inset * 2 - 2);
  };
  g.fillStyle(C.black, 1).fillRect(x, y, w, h);
  line(0, edge);
  if (r === 'common') return;
  line(2, r === 'rare' ? C.mid : edge);
  if (r === 'rare') {
    // notched corners
    g.fillStyle(edge, 1);
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]]) g.fillRect(cx, cy, 1, 1);
    return;
  }
  // epic and legendary: studs along the top and bottom, and solid corner pieces
  g.fillStyle(edge, 1);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]] as number[][]) {
    for (let i = 0; i < 5; i++) g.fillRect(cx + (sx > 0 ? 0 : -(4 - i)), cy + sy * i, 5 - i, 1);
  }
  for (let i = 10; i < w - 10; i += 6) {
    g.fillRect(x + i, y + 1, 2, 1);
    g.fillRect(x + i, y + h - 2, 2, 1);
  }
  if (r === 'epic') return;
  // legendary: a third line, side studs, and a crest breaking the top edge
  line(4, C.mid);
  g.fillStyle(edge, 1);
  for (let i = 10; i < h - 10; i += 6) {
    g.fillRect(x + 1, y + i, 1, 2);
    g.fillRect(x + w - 2, y + i, 1, 2);
  }
  const mx = x + Math.round(w / 2);
  g.fillStyle(C.black, 1).fillRect(mx - 9, y - 3, 19, 8);
  g.fillStyle(C.white, 1);
  g.fillRect(mx - 8, y + 2, 17, 2);
  for (const [dx, hh] of [[-8, 4], [-4, 3], [0, 6], [4, 3], [8, 4]]) {
    g.fillRect(mx + dx, y + 2 - hh, 1, hh);
    if (Math.abs(dx) !== 8) g.fillRect(mx + dx - 1, y + 1, 3, 1);
  }
  g.fillRect(mx - 1, y - 4, 3, 1);
}

/** The small diamonds under a name: one to four of them. */
export function rarityPips(scene: Phaser.Scene, x: number, y: number, r: Rarity, center = true): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const n = RARITY_PIPS[r];
  const x0 = Math.round(center ? x - (n * 8 - 2) / 2 : x);
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * 8 + 3;
    g.fillStyle(r === 'common' ? C.mid : C.white, 1);
    g.fillRect(cx, y, 1, 1);
    g.fillRect(cx - 1, y + 1, 3, 1);
    g.fillRect(cx - 2, y + 2, 5, 1);
    g.fillRect(cx - 1, y + 3, 3, 1);
    g.fillRect(cx, y + 4, 1, 1);
    if (r === 'legendary') g.fillStyle(C.black, 1).fillRect(cx, y + 2, 1, 1);
  }
  return g;
}

/** A light that walks round a legendary frame. Returns the object so the caller can destroy it with the card. */
export function legendarySpark(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const sp = scene.add.image(x, y, 'fx_px').setScale(2);
  const per = (w + h) * 2;
  const o = { t: 0 };
  scene.tweens.add({
    targets: o,
    t: 1,
    duration: 3600,
    repeat: -1,
    onUpdate: () => {
      if (!sp.active) return;
      let d = o.t * per;
      if (d < w) sp.setPosition(x + d, y);
      else if ((d -= w) < h) sp.setPosition(x + w - 1, y + d);
      else if ((d -= h) < w) sp.setPosition(x + w - 1 - d, y + h - 1);
      else sp.setPosition(x, y + h - 1 - (d - w));
      sp.setAlpha(0.55 + 0.45 * Math.sin(o.t * 40));
    },
  });
  return sp;
}

/** A row of five squares, `n` of them filled. */
export function statPips(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number, size = 5) {
  for (let i = 0; i < 5; i++) {
    g.fillStyle(i < n ? C.white : C.dark, 1).fillRect(x + i * (size + 2), y, size, size);
    if (i < n) g.fillStyle(C.light, 1).fillRect(x + i * (size + 2), y + size - 1, size, 1);
  }
}

/** A small framed button label; `on` = under the cursor. */
export function button(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, label: string, on: boolean, dim = false) {
  box(g, x, y, w, 13, on ? 'light' : 'dark');
  const t = txt(scene, x + w / 2, y + 3, label, { origin: [0.5, 0], color: on ? C.black : dim ? C.dark : C.light });
  return t;
}
