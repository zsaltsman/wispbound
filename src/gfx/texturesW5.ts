import Phaser from 'phaser';
import { PC, sheet } from './pixel';
import { personSheet } from './artPeople';
import * as B from './artW5';
import * as M from './artW5world';

// The final world's textures: the three great spirits as creatures, the prison's foes
// in battle, the arenas, the people of the prison and its fixtures. Painted at boot.

function add(scene: Phaser.Scene, key: string, pc: PC) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.toCanvas());
}
function addSheet(scene: Phaser.Scene, key: string, frames: PC[]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, sheet(frames).toCanvas())!;
  frames.forEach((f, i) => tex.add(i, 0, i * f.w, 0, f.w, f.h));
}
function anim(scene: Phaser.Scene, key: string, tex: string, frames: number[], rate: number, repeat = -1) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat });
}
const range = (n: number) => [...Array(n).keys()];

/** Which starters can be supercharged (all five). */
export const SC_STARTERS = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'];

export function buildW5Textures(scene: Phaser.Scene) {
  // ---- the three spirits as creatures
  for (const id of B.W5_BATTLE_IDS) {
    addSheet(scene, 'cr_' + id, B.creatureFrames5(id));
    anim(scene, `cr_${id}_idle`, 'cr_' + id, [0, 1, 2, 3], id === 'viperwind' ? 3 : 4);
    addSheet(scene, 'ch_mini_' + id, B.miniSheet5(id));
  }
  // ---- the prison's foes in battle
  addSheet(scene, 'sp_skelwarden', range(5).map((f) => B.skelWarden(1.4, f)));
  for (const s of SC_STARTERS) addSheet(scene, 'sp_sc_' + s, range(5).map((f) => B.superBody(s, f)));
  add(scene, 'w5b_post', B.postBack());
  add(scene, 'w5b_guard', B.guardBack());
  add(scene, 'w5f_stone', B.prisonFloor());

  // ---- people
  for (const [k, look] of Object.entries(M.LOOKS5)) addSheet(scene, 'ch_' + k, personSheet(look));
  addSheet(scene, 'ch_skel', M.skeletonSheet({ stripes: true }));
  addSheet(scene, 'ch_skelbare', M.skeletonSheet({}));
  addSheet(scene, 'ch_skelguard', M.skeletonSheet({ cap: true, coat: true }));
  addSheet(scene, 'ch_imp', M.impSheet());
  addSheet(scene, 'ow_skelwarden', range(5).map((f) => M.wardenOw(f)));

  // ---- fixtures
  add(scene, 'p5_lift', M.elevator(false));
  add(scene, 'p5_lift_open', M.elevator(true));
  add(scene, 'p5_slop', M.slopTray());
  add(scene, 'p5_trough', M.trough(false));
  add(scene, 'p5_trough_key', M.trough(true));
  add(scene, 'p5_pot', M.bigPot());
  add(scene, 'p5_kdoor', M.kitchenDoor());
  add(scene, 'p5_cage', M.potCage(false));
  add(scene, 'p5_cage_open', M.potCage(true));
  add(scene, 'p5_clock', M.wallClock(false));
  add(scene, 'p5_clock_stopped', M.wallClock(true));
  add(scene, 'p5_lock', M.comboLock(false));
  add(scene, 'p5_lock_open', M.comboLock(true));
  add(scene, 'p5_portcullis', M.portcullis());
  add(scene, 'p5_rack', M.uniformRack(true));
  add(scene, 'p5_rack_empty', M.uniformRack(false));
  for (let v = 0; v < 4; v++) add(scene, 'p5_dust' + v, M.dustPile(v));
  add(scene, 'p5_soul', M.soulWisp());
  for (let k = 0; k < 4; k++) add(scene, 'p5_food' + k, M.foodFx(k));
  add(scene, 'p5_key', M.filthyKey());
  add(scene, 'p5_sign', M.specimenSign());
}
