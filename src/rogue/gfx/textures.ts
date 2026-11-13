import Phaser from 'phaser';
import { PC, sheet } from '../../gfx/pixel';
import { ROGUE_SPIRIT_IDS, rogueSpiritFrames } from './artSpirits';
import { FOE_ART, foeFrames } from './artFoes';
import * as D from './artDungeon';
import { ROGUE_EVO_IDS, rogueSuperFrames } from './artEvoRogue';

// ROGUELIKE: paints the mode's own textures at boot, beside the story's (nothing is loaded from files).

export function addTex(scene: Phaser.Scene, key: string, pc: PC) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.toCanvas());
}

export function addSheet(scene: Phaser.Scene, key: string, frames: PC[]) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, sheet(frames).toCanvas())!;
  frames.forEach((f, i) => tex.add(i, 0, i * f.w, 0, f.w, f.h));
}

export function addAnim(scene: Phaser.Scene, key: string, tex: string, frames: number[], rate: number, repeat = -1) {
  if (scene.anims.exists(key)) return;
  scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat });
}

export function buildRogueTextures(scene: Phaser.Scene) {
  // the five spirits found only in the dungeon (same sheet layout as every other creature)
  for (const id of ROGUE_SPIRIT_IDS) {
    addSheet(scene, 'cr_' + id, rogueSpiritFrames(id));
    addAnim(scene, `cr_${id}_idle`, 'cr_' + id, [0, 1, 2, 3], id === 'tintrick' ? 4 : 5);
  }
  // their evolved forms (and Flamora's), met only in the Grim Reaper's last fight
  for (const id of ROGUE_EVO_IDS) {
    addSheet(scene, 'cr_x_' + id, rogueSuperFrames(id));
    addAnim(scene, `cr_x_${id}_idle`, 'cr_x_' + id, [0, 1, 2, 3], 6);
  }
  // the dungeon's enemies and its three bosses: battle bodies, like the island's spirits (0 rest, 1 wind-up, 2 strike, 3 hurt)
  for (const id of Object.keys(FOE_ART)) addSheet(scene, 'sp_' + id, foeFrames(id));
  // the dungeon itself: three floors of tiles, and the furniture of its rooms
  for (let t = 0; t < 3; t++) {
    for (let v = 0; v < 4; v++) addTex(scene, `rg_floor${t}_${v}`, D.floorTile(t, v));
    addTex(scene, `rg_wall${t}_0`, D.wallTile(t, 0));
    addTex(scene, `rg_wall${t}_1`, D.wallTile(t, 1));
    addTex(scene, `rg_pillar${t}`, D.pillar(t));
    addTex(scene, `rg_pit${t}`, D.pit(t));
  }
  addTex(scene, 'rg_rubble', D.rubble());
  addSheet(scene, 'rg_door', [D.door(0), D.door(1)]);
  addSheet(scene, 'rg_chest', [D.chest(0), D.chest(1)]);
  addSheet(scene, 'rg_fire', [0, 1, 2, 3].map((f) => D.fire(f)));
  addAnim(scene, 'rg_fire_burn', 'rg_fire', [0, 1, 2, 1], 7);
  addSheet(scene, 'rg_plate', [D.plate(0), D.plate(1)]);
  addTex(scene, 'rg_block', D.block());
  addSheet(scene, 'rg_sym', [0, 1, 2, 3, 4, 5].flatMap((i) => [D.symbol(i, 0), D.symbol(i, 1)]));
  addTex(scene, 'rg_obelisk', D.obelisk());
  addSheet(scene, 'rg_lamp', [D.lamp(0), D.lamp(1)]);
  addSheet(scene, 'rg_mirror', [D.mirror(0), D.mirror(1)]);
  addTex(scene, 'rg_emitter', D.emitter());
  addSheet(scene, 'rg_crystal', [D.crystal(0), D.crystal(1)]);
  addSheet(scene, 'rg_switch', [D.floorSwitch(0), D.floorSwitch(1)]);
}
