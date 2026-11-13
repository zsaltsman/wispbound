import Phaser from 'phaser';
import { PC, sheet } from './pixel';
import * as V from './artVoyage';

// The title screen and the voyages between islands. Painted at boot.

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

export function buildVoyageTextures(scene: Phaser.Scene) {
  add(scene, 'ti_logo', V.logo());
  add(scene, 'ti_sky', V.titleSky());
  add(scene, 'ti_far', V.farIslands());
  addSheet(scene, 'ti_wisp', range(4).map((f) => V.wisp(f)));
  addSheet(scene, 'ti_wispbig', range(4).map((f) => V.wisp(f, true)));
  anim(scene, 'ti_wisp_burn', 'ti_wisp', [0, 1, 2, 3], 8);
  anim(scene, 'ti_wispbig_burn', 'ti_wispbig', [0, 1, 2, 3], 7);
  addSheet(scene, 'ti_boat', range(2).map((f) => V.sideBoat(f)));
  for (let v = 0; v < 3; v++) {
    add(scene, 'ti_cloud' + v, V.cloud(v));
    add(scene, 'ti_cloudb' + v, V.cloud(v, true));
  }
  addSheet(scene, 'ti_gull', range(3).map((f) => V.gull(f)));
  addSheet(scene, 'ti_gullw', range(3).map((f) => V.gull(f, false)));
  anim(scene, 'ti_gull_flap', 'ti_gull', [0, 1, 2, 1], 7);
  anim(scene, 'ti_gullw_flap', 'ti_gullw', [0, 1, 2, 1], 7);
  // at sea
  for (const n of [false, true]) {
    addSheet(scene, 'sea_stern' + (n ? 'N' : ''), range(2).map((f) => V.sternBack(f, n)));
    add(scene, 'sea_rail' + (n ? 'N' : ''), V.sternFront(n));
  }
  for (const id of ['hollowhaven', 'saltwash', 'bacchus', 'forgotten']) add(scene, 'sea_isle_' + id, V.islandArt(id));
  add(scene, 'sea_rock0', V.seaRock(0));
  add(scene, 'sea_rock1', V.seaRock(1));
  addSheet(scene, 'sea_buoy', range(2).map((f) => V.buoy(f)));
  add(scene, 'sea_dutchman', V.oldShip(true));
  add(scene, 'sea_mast', V.oldShip(false));
  addSheet(scene, 'sea_fish', range(3).map((f) => V.leapFish(f)));
}
