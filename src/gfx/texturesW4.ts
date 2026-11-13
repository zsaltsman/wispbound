import Phaser from 'phaser';
import { PC, sheet } from './pixel';
import * as M from './artW4';
import { deadTree } from './artProps';
import { buildLabTextures } from './artLab';

// World 4 textures: the Forgotten Island's set pieces, its spirits (overworld and
// battle), the cinematic sky pieces and the five battle arenas. Painted at boot.

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

/** Battle bodies, sized for the arena (frames are poses: see artW4beasts). */
export const W4_BODIES: Record<string, { k: number; frames: number }> = {
  champion: { k: 2.2, frames: 4 },
  wispmane: { k: 2.4, frames: 5 },
  crow: { k: 2.2, frames: 4 },
  squirrel: { k: 2.0, frames: 4 },
  viperwind: { k: 2.4, frames: 5 },
  reaper: { k: 2.0, frames: 5 },
  flamora: { k: 1.6, frames: 4 },
};

function body(id: string, k: number, f: number): PC {
  switch (id) {
    case 'champion':
      return M.gorilla(k, f);
    case 'wispmane':
      return M.wispmane(k, f);
    case 'crow':
      return M.crow(k, f);
    case 'squirrel':
      return f >= 4 ? M.squirrel(k, f - 4, true) : M.squirrel(k, f);
    case 'viperwind':
      return M.viperwind(k, f);
    case 'reaper':
      return M.reaper(k, f);
    default:
      return M.flamora(k, f);
  }
}

export function buildW4Textures(scene: Phaser.Scene) {
  // ---- battle bodies
  for (const [id, b] of Object.entries(W4_BODIES)) addSheet(scene, 'sp_' + id, range(b.frames + (id === 'squirrel' ? 4 : 0)).map((f) => body(id, b.k, f)));
  // ---- overworld bodies (not directional: they flip to face right)
  addSheet(scene, 'ow_wispmane', range(5).map((f) => M.wispmane(0.75, f)));
  addSheet(scene, 'ow_viperwind', range(5).map((f) => M.viperwind(0.7, f)));
  addSheet(scene, 'ow_champion', range(4).map((f) => M.gorilla(0.8, f)));
  addSheet(scene, 'ow_crow', range(4).map((f) => M.crow(0.6, f)));
  addSheet(scene, 'ow_squirrel', range(4).map((f) => M.squirrel(0.6, f)));
  addSheet(scene, 'ow_flamora', range(4).map((f) => M.flamora(1, f)));
  addSheet(scene, 'ow_reaper', range(5).map((f) => M.reaper(0.42, f)));
  addSheet(scene, 'w4_cat', range(3).map((f) => M.blackCat(f)));
  anim(scene, 'ow_flamora_idle', 'ow_flamora', [0, 1], 3);
  anim(scene, 'ow_viperwind_idle', 'ow_viperwind', [0, 3, 0, 4], 2);

  // ---- the island
  add(scene, 'w4_monument', M.monument());
  add(scene, 'w4_vmonument', M.villageMonument());
  add(scene, 'w4_stele0', M.stele(0));
  add(scene, 'w4_stele1', M.stele(1));
  add(scene, 'w4_carving', M.reaperCarving());
  add(scene, 'w4_paw', M.groundPaw(false));
  add(scene, 'w4_paw_glow', M.groundPaw(true));
  addSheet(scene, 'w4_sparkle', [0, 1].map((f) => M.pawSparkle(f)));
  anim(scene, 'w4_sparkle_twinkle', 'w4_sparkle', [0, 1], 4);
  for (let v = 0; v < 3; v++) add(scene, `w4_house${v}`, M.oldHouse(v));
  add(scene, 'w4_storage', M.storage());
  add(scene, 'w4_ruin0', M.collapsed(611));
  add(scene, 'w4_ruin1', M.collapsed(612));
  for (let v = 0; v < 3; v++) add(scene, `w4_dtree${v}`, M.deadTree4(620 + v));
  for (let v = 0; v < 3; v++) add(scene, `w4_ltree${v}`, M.liveTree(630 + v));
  add(scene, 'w4_bush0', M.bush4(640));
  add(scene, 'w4_bush1', M.bush4(641));
  void deadTree;
  for (let g = 0; g < 3; g++) add(scene, `w4_tower${g}`, M.tower(g, false));
  add(scene, 'w4_tower_open', M.tower(2, true));
  add(scene, 'w4_bigtree', M.giantTree());
  add(scene, 'w4_wreck', M.wreck(false));
  add(scene, 'w4_wreck_fixed', M.wreck(true));
  add(scene, 'w4_ropeladder', M.ropeLadder());
  add(scene, 'w4_nestsign', M.nestSign());
  add(scene, 'w4_engpanel0', M.hullPanel(false));
  add(scene, 'w4_engpanel1', M.hullPanel(true));
  add(scene, 'w4_castle', M.castle());

  // ---- puzzle pieces and furniture
  for (let r = 0; r < 4; r++) add(scene, `w4_switch${r}`, M.vineSwitch(r));
  for (let bits = 1; bits < 16; bits++) for (const lit of [0, 1]) add(scene, `w4_vine${bits}_${lit}`, M.vineTile(bits, !!lit));
  add(scene, 'w4_stump', M.bigStump(false));
  add(scene, 'w4_stump_open', M.bigStump(true));
  add(scene, 'w4_socket', M.wallSocket(false));
  add(scene, 'w4_socket_lit', M.wallSocket(true));
  for (let need = 1; need <= 4; need++) for (let st = 0; st < 3; st++) add(scene, `w4_wtree${need}_${st}`, M.waterTree(st, need));
  add(scene, 'w4_waterwheel', M.waterWheel());
  add(scene, 'w4_gem', M.gem());
  for (let k = 0; k < 3; k++) {
    add(scene, `push_sacred${k}`, M.sacredStone(k));
    add(scene, `w4_plate${k}`, M.sacredPlate(k));
  }
  add(scene, 'w4_hangvine', M.hangVine(80));
  add(scene, 'w4_fountain', M.fountain());
  add(scene, 'w4_window', M.plantWindow());
  add(scene, 'w4_bowl', M.bowl(true));
  add(scene, 'w4_bowl_empty', M.bowl(false));
  add(scene, 'w4_brokenwheel', M.brokenWheel());
  add(scene, 'w4_chair', M.captainChair());
  add(scene, 'w4_map', M.islandMap());
  add(scene, 'w4_toycar', M.toyCar(true));
  add(scene, 'w4_toycar_empty', M.toyCar(false));
  add(scene, 'w4_panel', M.enginePanel());
  for (let k = 0; k < 4; k++) for (const lit of [0, 1]) add(scene, `w4_mush${k}_${lit}`, M.mushroom(k, !!lit));
  add(scene, 'w4_bigmush', M.bigMushroom(false));
  add(scene, 'w4_bigmush_grown', M.bigMushroom(true));
  for (let k = 0; k < 3; k++) add(scene, `w4_drawing${k}`, M.drawing(k));
  add(scene, 'w4_scope', M.telescope());
  add(scene, 'w4_flute', M.flute());
  for (let k = 0; k < 3; k++) add(scene, `w4_lava${k}`, M.lavaCrack(650 + k));

  // ---- the sky and the cage
  add(scene, 'w4_sky', M.nightSky(480, 320, 660));
  add(scene, 'w4_sky_dark', M.nightSky(480, 320, 661, true));
  add(scene, 'w4_hills', M.farHills(640, 90, 662));
  addSheet(scene, 'w4_ship', [0, 1].map((f) => M.shipFly(f)));
  anim(scene, 'w4_ship_fly', 'w4_ship', [0, 1], 12);
  add(scene, 'w4_half0', M.shipHalf(0));
  add(scene, 'w4_half1', M.shipHalf(1));
  add(scene, 'w4_islefar', M.islandFar());
  add(scene, 'w4_volcano', M.volcanoIsland());
  add(scene, 'w4_cage', M.cage());
  add(scene, 'fx_darkblade', M.darkBlade());

  // ---- battle arenas and effects
  add(scene, 'w4b_clearing', M.clearingBack());
  add(scene, 'w4b_tower', M.towerBack());
  add(scene, 'w4b_nest', M.nestBack());
  add(scene, 'w4b_tree', M.treeBack());
  add(scene, 'w4b_volc', M.volcBack());
  add(scene, 'w4f_grass', M.grassFloor());
  add(scene, 'w4f_stone', M.stoneFloor());
  add(scene, 'w4f_deck', M.deckFloor());
  add(scene, 'w4f_bark', M.barkFloor());
  add(scene, 'w4f_volc', M.volcFloor());
  add(scene, 'fx_root', M.rootFx());
  add(scene, 'fx_gust', M.gustFx());
  add(scene, 'fx_nut', M.nutFx());
  add(scene, 'fx_feather', M.featherFx());
  add(scene, 'fx_darkhand', M.darkHand());
  // the spirit research facility in the hillside
  buildLabTextures(scene);
}
