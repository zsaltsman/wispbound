import Phaser from 'phaser';
import { isSet } from './state';
import type { W } from './helpers';
import { scene } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { sound } from '../audio/audio';
import { getCreature } from '../engine/creatures';
import { floorOpen, FLOOR_LOCK, CODE } from './w5_state';
import { FLOOR_MAPS, FLOOR_NAMES, LIFT } from '../world/maps/w5maps';

// Shared pieces for the prison: the guardian (it walks with you, it never fights),
// your three creatures and where they are, the SPIRIT RECOVERED card, the elevator
// panel and the combination lock.

export const f = (w: W, k: string) => isSet(w.state, k);
export const px = (t: number) => t * 16 + 8;
export const py = (t: number) => t * 16 + 16;
export type Dir = 'up' | 'down' | 'left' | 'right';

/** The guardian actor (WorldScene's companion slot answers to 'inventor'). */
export const G = 'inventor';
export const gid = (w: W) => (w.state.flags.w4_route === 'B' ? 'viperwind' : 'wispmane');
export const gKey = (w: W) => 'ow_' + gid(w);
export const gName = (w: W) => (gid(w) === 'viperwind' ? 'VIPERWIND' : 'WISPMANE');
export const gCry = (w: W) => (gid(w) === 'viperwind' ? 'hiss' : 'roar');
/** Who you came with: Carlo (route B) or the old man (route A). */
export const friend = (w: W) => (w.state.flags.w4_route === 'B' ? 'carlo' : 'old');
export const friendName = (w: W) => (friend(w) === 'carlo' ? 'CARLO' : 'OLD MAN');
export const friendPitch = (w: W) => (friend(w) === 'carlo' ? 1260 : 560);
export const friendSprite = (w: W) => (friend(w) === 'carlo' ? 'carlo' : 'oldman4');

/** Your three creatures: the first spirit, the temple creature, the Titan cub. */
export const w1 = (w: W) => w.state.creature ?? 'booheet';
export const w2 = (w: W) => w.state.creature2 ?? 'glowbell';
export const w3 = (w: W) => (w.state.extra ?? [])[0] ?? 'ironbud';
export const crName = (id: string) => getCreature(id).name;

/** The guardian growls / hisses. */
export function gSound(w: W) {
  w.sfx(gCry(w));
}

/** A big card: SPIRIT RECOVERED, the creature, its name. */
export async function spiritRecovered(w: W, id: string, sub = 'SPIRIT RECOVERED') {
  const s = scene(w);
  const shade = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(85).setAlpha(0));
  const ring = w.ui(s.add.image(SW / 2, 104, 'fx_ring').setDepth(86).setScale(0.2).setAlpha(0));
  const sp = w.ui(s.add.sprite(SW / 2, 150, 'cr_' + id, 0).setOrigin(0.5, 1).setDepth(87).setScale(1).setAlpha(0));
  if (s.anims.exists(`cr_${id}_idle`)) sp.play(`cr_${id}_idle`);
  const t1 = w.ui(txt(s, SW / 2, 172, sub, { outline: true, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  const t2 = w.ui(txt(s, SW / 2, 190, crName(id), { color: C.light, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  await w.tw({ targets: shade, alpha: 0.92, duration: 450 });
  w.sfx('recruit');
  s.tweens.add({ targets: ring, alpha: { from: 1, to: 0 }, scale: 3, duration: 1000, repeat: 1 });
  await w.tw({ targets: sp, alpha: 1, scale: 2, duration: 600, ease: 'Back.easeOut' });
  await w.tw({ targets: [t1, t2], alpha: 1, duration: 450 });
  await w.wait(2200);
  await w.tw({ targets: [shade, ring, sp, t1, t2], alpha: 0, duration: 500 });
  [shade, ring, sp, t1, t2].forEach((o) => o.destroy());
}

/** A small badge in the corner of the screen (DISGUISED). Returns a remover. */
export function badge(w: W, label: string) {
  const s = scene(w);
  const bg = w.ui(s.add.rectangle(SW - 8, 8, 92, 16, C.black, 0.85).setOrigin(1, 0).setDepth(60));
  bg.setStrokeStyle(1, C.light);
  const t = w.ui(txt(s, SW - 54, 11, label, { color: C.white, origin: [0.5, 0] }).setDepth(61));
  const pulse = s.tweens.add({ targets: t, alpha: 0.55, duration: 700, yoyo: true, repeat: -1 });
  return () => {
    pulse.stop();
    bg.destroy();
    t.destroy();
  };
}

let badgeOff: (() => void) | null = null;
/** The one corner badge (DISGUISED on the guard floor); null takes it away. */
export function setBadge(w: W, label: string | null) {
  badgeOff?.();
  badgeOff = label ? badge(w, label) : null;
}

/** A cold glow that follows a sprite through the dark (the Reaper must always be seen). Returns a remover. */
export function glow(w: W, o: { x: number; y: number; displayHeight: number }, r = 40) {
  const l = { x: o.x, y: o.y - o.displayHeight / 2, r };
  w.extraLights.push(l);
  const s = scene(w);
  const upd = () => {
    l.x = o.x;
    l.y = o.y - o.displayHeight / 2;
  };
  s.events.on('update', upd);
  return () => {
    s.events.off('update', upd);
    w.extraLights = w.extraLights.filter((x) => x !== l);
  };
}

// ------------------------------------------------------------------ the elevator

/** The panel: five buttons, lit or dark. Returns the floor chosen (1-5) or 0. */
export async function liftPanel(w: W, here: number): Promise<number> {
  const s = scene(w);
  const D = 70;
  const box = w.ui(s.add.rectangle(SW / 2, SH / 2 - 20, 262, 170, C.black, 0.94).setDepth(D));
  box.setStrokeStyle(2, C.light);
  const title = w.ui(txt(s, SW / 2, SH / 2 - 98, 'THE ELEVATOR', { color: C.light, origin: [0.5, 0] }).setDepth(D + 1));
  const rows: Phaser.GameObjects.GameObject[] = [box, title];
  const lines: Phaser.GameObjects.BitmapText[] = [];
  const lamps: Phaser.GameObjects.Arc[] = [];
  for (let n = 5; n >= 1; n--) {
    const y = SH / 2 - 78 + (5 - n) * 22;
    const lit = floorOpen(w.state, n);
    const lamp = w.ui(s.add.circle(SW / 2 - 108, y + 6, 5, lit ? C.white : C.dark).setDepth(D + 1));
    lamp.setStrokeStyle(1, C.mid);
    const t = w.ui(txt(s, SW / 2 - 96, y, `${n}  ${lit ? FLOOR_NAMES[n - 1] : '- - - - - -'}${n === here ? ' (HERE)' : ''}`, { color: lit ? C.white : C.mid }).setDepth(D + 1));
    lamps.push(lamp);
    lines.push(t);
    rows.push(lamp, t);
  }
  const hint = w.ui(txt(s, SW / 2, SH / 2 + 46, 'UP/DOWN: CHOOSE   SPACE: GO   X: CANCEL', { color: C.mid, origin: [0.5, 0] }).setDepth(D + 1));
  rows.push(hint);
  let sel = 5 - here; // index into lines (0 = floor 5)
  const draw = () => lines.forEach((t, i) => t.setText((i === sel ? '> ' : '  ') + t.text.replace(/^(> |  )?/, '')));
  lines.forEach((t) => t.setText('  ' + t.text));
  draw();
  const pick = await new Promise<number>((done) => {
    w.keyHook = (b) => {
      if (b === 'up') sel = (sel + 4) % 5;
      else if (b === 'down') sel = (sel + 1) % 5;
      else if (b === 'b') done(0);
      else if (b === 'a') done(5 - sel);
      else return;
      if (b === 'up' || b === 'down') {
        sound.play('move');
        draw();
      }
    };
  });
  w.keyHook = null;
  rows.forEach((o) => o.destroy());
  return pick;
}

/** Ride the elevator from one floor to another: the doors shut, the car shudders, the floor changes. */
export async function rideLift(w: W, to: number) {
  const map = FLOOR_MAPS[to - 1];
  const l = LIFT[map];
  const lift = w.prop('lift');
  lift?.setTexture('p5_lift_open');
  w.sfx('creakmetal');
  await w.wait(300);
  w.hide('player');
  w.hide('follower');
  w.hide('follower2');
  w.hide(G);
  lift?.setTexture('p5_lift');
  w.sfx('slam');
  await w.wait(300);
  const s = scene(w);
  const b = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(80).setAlpha(0));
  await w.tw({ targets: b, alpha: 1, duration: 400 });
  for (let i = 0; i < 3; i++) {
    w.sfx('rumble');
    w.shake(260, 0.003);
    await w.wait(380);
  }
  w.sfx('bell');
  w.loadMap(map, l.x, l.y + 1, 'down');
  w.prop('lift')?.setTexture('p5_lift_open');
  await w.tw({ targets: b, alpha: 0, duration: 400 });
  b.destroy();
  await w.wait(250);
  w.prop('lift')?.setTexture('p5_lift');
  w.sfx('slam');
}

/** Using the elevator: the panel, the reasons a button is dark, and the ride. */
export async function useLift(w: W) {
  const here = FLOOR_MAPS.indexOf(w.map.id) + 1;
  for (;;) {
    const n = await liftPanel(w, here);
    if (!n) return;
    if (n === here) {
      await w.say('You are already on this floor.');
      continue;
    }
    if (!floorOpen(w.state, n)) {
      sound.play('deny');
      await w.say(FLOOR_LOCK[n - 1] || 'Dark.');
      continue;
    }
    await rideLift(w, n);
    return;
  }
}

// ------------------------------------------------------------------ the lock

/** Three wheels, 0-9. Returns true if the code is right (false if you step away). */
export async function comboLock(w: W): Promise<boolean> {
  const s = scene(w);
  const D = 70;
  const vals = [0, 0, 0];
  let sel = 0;
  const box = w.ui(s.add.rectangle(SW / 2, SH / 2 - 20, 220, 150, C.black, 0.94).setDepth(D));
  box.setStrokeStyle(2, C.light);
  const title = w.ui(txt(s, SW / 2, SH / 2 - 88, 'THREE WHEELS. ONE NUMBER EACH.', { color: C.light, origin: [0.5, 0] }).setDepth(D + 1));
  const wheels = [0, 1, 2].map((i) => {
    const x = SW / 2 - 50 + i * 50;
    const r = w.ui(s.add.rectangle(x, SH / 2 - 26, 34, 44, C.dark).setDepth(D + 1));
    r.setStrokeStyle(2, C.mid);
    const t = w.ui(txt(s, x, SH / 2 - 38, '0', { color: C.white, outline: true, origin: [0.5, 0] }).setDepth(D + 2).setScale(2));
    return { r, t };
  });
  const hint = w.ui(txt(s, SW / 2, SH / 2 + 14, 'LEFT/RIGHT: WHEEL   UP/DOWN: TURN', { color: C.mid, origin: [0.5, 0] }).setDepth(D + 1));
  const hint2 = w.ui(txt(s, SW / 2, SH / 2 + 28, 'SPACE: PULL THE LOCK   X: STEP AWAY', { color: C.mid, origin: [0.5, 0] }).setDepth(D + 1));
  const draw = () =>
    wheels.forEach((wh, i) => {
      wh.t.setText(String(vals[i]));
      wh.r.setStrokeStyle(2, i === sel ? C.white : C.mid);
    });
  draw();
  const result = await new Promise<boolean | null>((done) => {
    w.keyHook = (b) => {
      if (b === 'left') sel = (sel + 2) % 3;
      else if (b === 'right') sel = (sel + 1) % 3;
      else if (b === 'up') vals[sel] = (vals[sel] + 1) % 10;
      else if (b === 'down') vals[sel] = (vals[sel] + 9) % 10;
      else if (b === 'b') return done(null);
      else if (b === 'a') return done(vals.every((v, i) => v === CODE[i]));
      else return;
      sound.play(b === 'up' || b === 'down' ? 'tick' : 'move');
      draw();
    };
  });
  w.keyHook = null;
  [box, title, hint, hint2, ...wheels.flatMap((x) => [x.r, x.t])].forEach((o) => o.destroy());
  if (result === null) return false;
  if (!result) {
    w.sfx('locked');
    w.shake(150, 0.003);
    await w.say('You heave on the lock. It does not move. Wrong numbers.');
  }
  return result;
}
