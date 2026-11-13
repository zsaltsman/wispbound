import Phaser from 'phaser';
import { PC, sheet } from './pixel';
import * as F from './artFinal';
import { SC_IDS } from '../engine/creaturesFinal';

// The last battle's textures: the Reaper's three forms (and the steps between them), the
// wings, the crown and the scythes he drops, your supercharged spirits, the guardian at full
// size, the two arenas, and the cat's last secret. Painted at boot.

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

export function buildFinalTextures(scene: Phaser.Scene) {
  // ---- the Reaper in battle
  addSheet(scene, 'sp_gr1', range(7).map((f) => F.reaperFull(2.3, f)));
  addSheet(scene, 'sp_gr2', range(7).map((f) => F.buffReaper(1.3, f)));
  addSheet(scene, 'sp_grow', [0.12, 0.38, 0.68].map((m) => F.buffReaper(1.3, 0, m)));
  const tf = range(8).map((f) => F.trueReaper(1.2, f));
  addSheet(scene, 'sp_gr3', tf);
  addSheet(scene, 'sp_gr4', tf);
  addSheet(scene, 'fb_wings', range(4).map((a) => F.wings(1, a)));
  add(scene, 'fb_crown', F.crownAlone(1.2));
  add(scene, 'fb_scythe', F.scytheAlone(1.2));
  // ---- the Reaper in the prison
  addSheet(scene, 'ow_reaper_full', range(7).map((f) => F.reaperFull(0.42, f)));
  addSheet(scene, 'ow_reaper_buff', range(7).map((f) => F.buffReaper(0.3, f)));
  addSheet(scene, 'ow_reaper_true', range(8).map((f) => F.trueReaperOw(0.28, f)));
  add(scene, 'ow_flamora_dim', F.flamoraDim(1));
  // ---- your spirits, supercharged, and the guardian at full size
  for (const id of SC_IDS) {
    addSheet(scene, 'cr_x_' + id, F.scFrames(id));
    anim(scene, `cr_x_${id}_idle`, 'cr_x_' + id, [0, 1, 2, 3], 6);
  }
  for (const id of ['wispmane', 'viperwind']) {
    addSheet(scene, 'cr_gd_' + id, F.guardianFrames(id));
    anim(scene, `cr_gd_${id}_idle`, 'cr_gd_' + id, [0, 1, 2, 3], id === 'viperwind' ? 3 : 4);
  }
  // ---- the arenas
  add(scene, 'fb_hall', F.hallBack());
  add(scene, 'fb_domain', F.domainBack());
  add(scene, 'ff_domain', F.domainFloor());
  // ---- the cat
  add(scene, 'fin_catshadow', F.catShadow());
  addSheet(scene, 'fin_cateyes', range(4).map((f) => F.catEyes(f)));
}
