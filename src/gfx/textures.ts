import Phaser from 'phaser';
import { PC, sheet, LIGHT, WHITE, MID } from './pixel';
import { creatureFrames, umbrawlBodyFrames, fist, CREATURE_FRAMES } from './artCreatures';
import * as B from './artBoss';
import * as Wd from './artWorld';
import { icon12, icon7, ICON12_KEYS, ICON7_KEYS } from './artIcons';
import { CREATURES } from '../engine/creatures';
import { tileset, seaTile, TILE_SLOTS } from './artTiles';
import * as P from './artProps';
import * as Pe from './artPeople';
import * as Ce from './artCellar';
import * as Is from './artIsland';
import * as Pk from './artPark';
import * as Gd from './artGods';
import * as Rk from './artRick';
import { coasterTrack } from '../world/coaster';
import * as Sh from './artShops';
import * as Kr from './artKraken';
import * as Tm from './artTemples';
import { creatureFrames2, miniSheet2, W2_CREATURE_IDS } from './artCreatures2';
import * as Ti from './artTitans';
import * as Pa from './artParty';
import { buildW4Textures } from './texturesW4';
import { buildW5Textures } from './texturesW5';
import { buildFinalTextures } from './texturesFinal';
import { buildVoyageTextures } from './texturesVoyage';

// Paints every texture in the game at boot. No image files are loaded:
// all art is generated from code in /src/gfx.

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

export function buildTextures(scene: Phaser.Scene) {
  // creatures
  for (const c of CREATURES) {
    addSheet(scene, 'cr_' + c.id, creatureFrames(c.id));
    anim(scene, `cr_${c.id}_idle`, 'cr_' + c.id, [0, 1, 2, 3], c.id === 'tickraith' ? 3 : 5);
  }
  void CREATURE_FRAMES;
  // the temple creatures of World 2
  for (const id of W2_CREATURE_IDS) {
    addSheet(scene, 'cr_' + id, creatureFrames2(id));
    anim(scene, `cr_${id}_idle`, 'cr_' + id, [0, 1, 2, 3], 5);
  }
  // World 3: the first-stage Titans, the Titans themselves, Milo, and their arenas
  for (const id of Ti.W3_CREATURE_IDS) {
    addSheet(scene, 'cr_' + id, Ti.creatureFrames3(id));
    anim(scene, `cr_${id}_idle`, 'cr_' + id, [0, 1, 2, 3], 5);
  }
  addSheet(scene, 'sv_body', [0, 1, 2, 3].map((f) => Ti.scorvexBody(f)));
  addSheet(scene, 'sv_sting', [0, 1].map((f) => Ti.scorvexStinger(f)));
  addSheet(scene, 'wm_body', [0, 1, 2, 3].map((f) => Ti.widowBody(f)));
  addSheet(scene, 'ic_body', [0, 1, 2, 3].map((f) => Ti.ironBody(f)));
  add(scene, 'ic_arm', Ti.ironArm());
  addSheet(scene, 'ic_hammer', [0, 1].map((f) => Ti.ironHammer(f)));
  add(scene, 'ic_plate', Ti.ironPlate());
  addSheet(scene, 'milo_b', [0, 1, 2, 3].map((f) => Ti.miloBattle(f)));
  add(scene, 'ta_club', Ti.clubBackdrop(false));
  add(scene, 'ta_clubhole', Ti.clubBackdrop(true));
  add(scene, 'ta_street', Ti.streetFloor(false));
  add(scene, 'ta_flood', Ti.streetFloor(true));
  add(scene, 'ta_barrel', Ti.barrelBackdrop(false));
  add(scene, 'ta_barrel_broken', Ti.barrelBackdrop(true));
  addSheet(scene, 'ow_scorvex', [0, 1, 2, 3].map((f) => Ti.owScorvex(f)));
  anim(scene, 'ow_scorvex_walk', 'ow_scorvex', [0, 1], 4);
  addSheet(scene, 'ow_widow', [0, 1, 2, 3].map((f) => Ti.owWidow(f)));
  anim(scene, 'ow_widow_walk', 'ow_widow', [0, 1], 5);
  addSheet(scene, 'ow_ironclad', [0, 1, 2, 3, 4, 5, 6].map((f) => Ti.owIronclad(f)));
  anim(scene, 'ow_ironclad_walk', 'ow_ironclad', [0, 1], 2);
  // the Kraken
  addSheet(scene, 'kr', [0, 1, 2, 3, 4, 5, 6].map((f) => Kr.krakenHead(f)));
  anim(scene, 'kr_idle', 'kr', [0, 1], 2);
  anim(scene, 'kr_idle2', 'kr', [4, 5], 4);
  add(scene, 'k_bg', Kr.krakenBackdrop());
  add(scene, 'k_floor', Kr.krakenFloor());
  add(scene, 'k_rays', Kr.lightRays());
  add(scene, 'fx_ink', Kr.inkCloud());
  add(scene, 'k_tip', Kr.tentacleTip());
  // the god temples
  for (const t of ['S', 'L', 'T']) for (let r = 0; r < 4; r++) for (const lit of [0, 1]) add(scene, `zc_${t}${r}${lit}`, Tm.conductor(t, r, !!lit));
  add(scene, 'z_source', Tm.lightningSource(false));
  add(scene, 'z_source_lit', Tm.lightningSource(true));
  addSheet(scene, 'z_barrier', [0, 1].map((f) => Tm.stormBarrier(false, f)));
  anim(scene, 'z_barrier_buzz', 'z_barrier', [0, 1], 10);
  add(scene, 'z_barrier_open', Tm.stormBarrier(true, 0));
  add(scene, 't_hammer', Tm.thorHammer(true, false));
  add(scene, 't_hammer_lit', Tm.thorHammer(true, true));
  add(scene, 't_hammer_gone', Tm.thorHammer(false, false));
  for (let n = 0; n < 3; n++) for (const lit of [0, 1]) add(scene, `t_rune${n}${lit}`, Tm.runeStone(n, !!lit));
  for (const k of ['block', 'orb', 'crate'] as const) add(scene, 'push_' + k, Tm.pushable(k));
  add(scene, 't_gong', Tm.gong());
  add(scene, 't_bolt', Tm.boltSymbol(false));
  add(scene, 't_bolt_lit', Tm.boltSymbol(true));
  add(scene, 't_crackwall', Tm.crackedWall(false));
  add(scene, 't_rubble', Tm.crackedWall(true));
  add(scene, 'p_tide_lo', Tm.tideWheel(false));
  add(scene, 'p_tide_hi', Tm.tideWheel(true));
  add(scene, 'p_sluice_shut', Tm.sluiceLever(false));
  add(scene, 'p_sluice_open', Tm.sluiceLever(true));
  for (let k = 0; k < 3; k++) add(scene, `p_seastatue${k}`, Tm.seaStatue(k));
  add(scene, 'p_seagate', Tm.seaGate(false));
  add(scene, 'p_seagate_open', Tm.seaGate(true));
  for (const a of Tm.ANIMALS) for (const lit of [0, 1]) add(scene, `a_${a}${lit}`, Tm.animalStatue(a, !!lit));
  add(scene, 'a_lectern', Tm.lectern());
  add(scene, 'a_door', Tm.athenaDoor(false));
  add(scene, 'a_door_open', Tm.athenaDoor(true));
  add(scene, 'a_bookcase', Tm.bookcase());
  add(scene, 'e_boulders', Tm.boulders());
  add(scene, 'g_door_open', Tm.openGodDoor());
  addSheet(scene, 'cr_umbrawlB', umbrawlBodyFrames());
  anim(scene, 'cr_umbrawlB_idle', 'cr_umbrawlB', [0, 1, 2, 3], 5);
  addSheet(scene, 'u_fist', [0, 1, 2].map((f) => fist(f)));

  // boss
  add(scene, 'b_hull', B.hull(1));
  add(scene, 'b_hull2', B.hull(2));
  add(scene, 'b_glow', B.windowGlow());
  add(scene, 'b_masts', B.masts());
  B.SAILS.forEach(([, , w, h, seed, emblem], i) => {
    addSheet(scene, `b_sail${i}`, [0, 1, 2].map((f) => B.sail(w, h, f, seed, false, emblem)));
    addSheet(scene, `b_sailG${i}`, [0, 1, 2].map((f) => B.sail(w, h, f, seed, true, emblem)));
    anim(scene, `b_sail${i}_wave`, `b_sail${i}`, [0, 1, 2, 1], 4 + (i % 3));
    anim(scene, `b_sailG${i}_wave`, `b_sailG${i}`, [0, 1, 2, 1], 6 + (i % 3));
  });
  addSheet(scene, 'b_flag', [0, 1, 2, 3].map((f) => B.flag(f)));
  anim(scene, 'b_flag_wave', 'b_flag', [0, 1, 2, 3], 8);
  addSheet(scene, 'b_captain', [0, 1, 2].map((f) => B.captain(f, false)));
  addSheet(scene, 'b_captain2', [0, 1, 2].map((f) => B.captain(f, true)));
  anim(scene, 'b_captain_idle', 'b_captain', [0, 1], 2);
  anim(scene, 'b_captain2_idle', 'b_captain2', [0, 1], 3);
  add(scene, 'b_cannon', B.cannon());
  addSheet(scene, 'b_chain', [0, 1].map((f) => B.chain(34, f)));
  addSheet(scene, 'b_foam', [0, 1, 2].map((f) => B.foam(f)));
  anim(scene, 'b_foam_roll', 'b_foam', [0, 1, 2], 6);
  add(scene, 'b_aura', B.aura());

  // world
  add(scene, 'sky', Wd.sky());
  add(scene, 'moon', Wd.moon());
  add(scene, 'clouds_far', Wd.clouds(31, 512, 70, true));
  add(scene, 'clouds_near', Wd.clouds(57, 512, 60, false));
  [0, 1, 2].forEach((i) => add(scene, `bolt${i}`, Wd.lightningBolt(400 + i * 17)));
  add(scene, 'sea_base', Wd.seaBase());
  add(scene, 'sea_far', Wd.seaStrip(1, 512, 14, 1.5, 1, 0.12));
  add(scene, 'sea_mid', Wd.seaStrip(2, 512, 22, 3, 1, 0.16));
  add(scene, 'sea_near', Wd.seaStrip(3, 512, 30, 4, 2, 0.18));
  add(scene, 'sea_front', Wd.seaStrip(4, 512, 44, 7, 3, 0.16));
  add(scene, 'raft', Wd.raft());
  add(scene, 'd_barrel', Wd.barrel());
  add(scene, 'd_plank', Wd.plank());
  add(scene, 'd_crate', Wd.crate());
  add(scene, 'd_mast', Wd.brokenMast());
  add(scene, 'rocks', Wd.rockSilhouette());

  // effects
  add(scene, 'fx_ball', Wd.ghostBall());
  addSheet(scene, 'fx_puff', [0, 1, 2].map((f) => Wd.puff(f)));
  addSheet(scene, 'fx_puffL', [0, 1, 2].map((f) => Wd.puff(f, 28)));
  addSheet(scene, 'fx_boom', [0, 1, 2, 3, 4].map((f) => Wd.boom(f)));
  anim(scene, 'fx_boom', 'fx_boom', [0, 1, 2, 3, 4], 16, 0);
  addSheet(scene, 'fx_splash', [0, 1, 2, 3].map((f) => Wd.splash(f)));
  anim(scene, 'fx_splash', 'fx_splash', [0, 1, 2, 3], 12, 0);
  add(scene, 'fx_spark', Wd.spark());
  add(scene, 'fx_ring', Wd.ring(48, 2));
  add(scene, 'fx_ringL', Wd.ring(96, 3, LIGHT));
  add(scene, 'fx_shield', Wd.shieldBubble());
  add(scene, 'fx_hex', Wd.hexagon());
  add(scene, 'fx_rune', Wd.rune());
  add(scene, 'fx_arc', Wd.wailArc());
  add(scene, 'fx_bolt', Wd.ghostBolt());
  add(scene, 'fx_skull', Wd.bigSkull());
  add(scene, 'fx_moon', Wd.moonFx());
  add(scene, 'fx_kernel', Wd.kernel());
  add(scene, 'fx_plus', Wd.plus());
  add(scene, 'fx_hand', Wd.strawHand());
  addSheet(scene, 'fx_gear', [0, 1].map((f) => Wd.gear(f)));
  add(scene, 'fx_clock', Wd.clockFace());
  add(scene, 'fx_handL', Wd.clockHand(26));
  add(scene, 'fx_handS', Wd.clockHand(16));
  add(scene, 'fx_canopy', Wd.canopyFx());
  add(scene, 'fx_slash', Wd.slash());
  addSheet(scene, 'fx_spin', [0, 1, 2, 3].map((f) => Wd.spinRing(f)));
  anim(scene, 'fx_spin', 'fx_spin', [0, 1, 2, 3], 18);
  add(scene, 'fx_anchor', Wd.anchor());
  addSheet(scene, 'fx_sailor', [0, 1].map((f) => Wd.sailor(f)));
  add(scene, 'fx_wave', Wd.tidalWave());
  addSheet(scene, 'fx_whirl', [0, 1, 2, 3].map((f) => Wd.whirl(f)));
  anim(scene, 'fx_whirl', 'fx_whirl', [0, 1, 2, 3], 10);
  add(scene, 'fx_bigcannon', Wd.bigCannon());
  add(scene, 'fx_beam', Wd.beam());
  [0, 1, 2].forEach((i) => add(scene, `fx_fog${i}`, Wd.fogCloud(70 + i)));
  add(scene, 'fx_link', Wd.chainLink());
  add(scene, 'fx_soul', Wd.soulOrb());
  add(scene, 'fx_rain', Wd.rainStreak());
  add(scene, 'fx_dot', Wd.dot(WHITE, 2));
  add(scene, 'fx_dotM', Wd.dot(MID, 2));
  add(scene, 'fx_px', Wd.dot(WHITE, 1));
  add(scene, 'fx_warn', Wd.warnBang());
  add(scene, 'ui_cursor', Wd.cursor());

  // World 4: the Forgotten Island
  buildW4Textures(scene);
  buildW5Textures(scene);
  buildFinalTextures(scene);
  buildVoyageTextures(scene);

  // icons
  for (const k of ICON12_KEYS) add(scene, k, icon12(k));
  for (const k of ICON7_KEYS) add(scene, k, icon7(k));
}

// ================================================================== overworld


function addFrames(scene: Phaser.Scene, key: string, frames: PC[]) {
  addSheet(scene, key, frames);
}

/** Soft circular light used to cut holes in the darkness overlay. */
function lightTexture(scene: Phaser.Scene) {
  if (scene.textures.exists('light')) return;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.3)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  scene.textures.addCanvas('light', cv);
}

export function buildWorldTextures(scene: Phaser.Scene) {
  const ts = tileset();
  add(scene, 'tiles', ts);
  [0, 1, 2, 3].forEach((f) => add(scene, 'sea' + f, seaTile(f)));
  lightTexture(scene);

  // buildings
  [0, 1, 2, 3].forEach((v) => add(scene, `b_house${v + 1}`, P.house(v)));
  add(scene, 'b_office', P.office());
  add(scene, 'b_psychic', P.psychic());
  add(scene, 'b_mansion', P.mansion());
  add(scene, 'b_store', P.store());
  add(scene, 'b_fishshop', P.fishshop());
  add(scene, 'b_farmhouse', P.farmhouse());
  add(scene, 'b_barn', P.barn());
  add(scene, 'b_tavern', P.tavern());
  // props
  add(scene, 'p_clocktower', P.clocktower());
  add(scene, 'p_well', P.well());
  add(scene, 'p_lamp', P.lamp(true));
  add(scene, 'p_lamp_off', P.lamp(false));
  add(scene, 'p_tree', P.deadTree(3));
  add(scene, 'p_tree2', P.deadTree(8));
  add(scene, 'p_swings', P.swings());
  add(scene, 'p_slide', P.slide());
  add(scene, 'p_cave', P.caveMouth());
  add(scene, 'p_tape', P.tape());
  add(scene, 'p_bell', P.bellPost(false));
  add(scene, 'p_bellfish_bell', P.bellPost(true));
  add(scene, 'p_bellfish_only', P.bellFishHanging());
  add(scene, 'p_bell_empty', P.bellPostEmpty());
  add(scene, 'p_boat', P.boat());
  add(scene, 'p_stall', P.stall(4));
  add(scene, 'p_uglyclock', P.uglyClock());
  add(scene, 'p_door_cellar', P.lockedDoor('cellar'));
  add(scene, 'p_door_closet', P.lockedDoor('closet'));
  add(scene, 'p_door_master', P.lockedDoor('master'));
  add(scene, 'p_shelf_gap', P.shelfGap());
  add(scene, 'p_pedestal', P.pedestal(false));
  add(scene, 'p_pedestal_key', P.pedestal(true));
  add(scene, 'p_bait', P.baitBucket());
  add(scene, 'p_wellkey', P.wellKey());

  // characters
  for (const [k, look] of Object.entries(Pe.LOOKS)) addFrames(scene, 'ch_' + k, Pe.personSheet(look));
  for (const k of ['chicken', 'pig', 'piglet', 'cat', 'cow'] as const) addFrames(scene, 'ch_' + k, Pe.animalSheet(k));
  addFrames(scene, 'ch_lex', Pe.bearSheet('lex'));
  addFrames(scene, 'ch_cub', Pe.bearSheet('cub'));
  addFrames(scene, 'ch_mayor', Pe.dogSheet());
  addFrames(scene, 'ch_ghost', Pe.ghostSheet());
  for (const c of CREATURES) addFrames(scene, 'ch_mini_' + c.id, Pe.miniSheet(c.id));
  for (const id of W2_CREATURE_IDS) addFrames(scene, 'ch_mini_' + id, miniSheet2(id));
  for (const id of Ti.W3_CREATURE_IDS) addFrames(scene, 'ch_mini_' + id, Ti.miniSheet3(id));
  add(scene, 'grandclock', Pe.grandClock());
  add(scene, 'wreck', Pe.wreck());
  for (const k of ['cod', 'salmon', 'squid', 'eel', 'boot', 'bellfish']) add(scene, 'fish_' + k, Pe.fishArt(k));
  for (const k of Pe.ITEM_ICON_KEYS) add(scene, k, Pe.itemIcon(k));
  for (const k of Pe.EMOTES) add(scene, 'em_' + k, Pe.emote(k));

  // the cellar battle
  add(scene, 'c_wall', Ce.cellarWall());
  add(scene, 'c_floor', Ce.cellarFloor());
  add(scene, 'c_crates', Ce.crates());
  add(scene, 'c_bulb', Ce.bulb());
  add(scene, 'c_bucket', Ce.bigBucket());
  add(scene, 'fx_hook', Ce.hook());
  addFrames(scene, 'fm', [0, 1, 2, 3, 4, 5, 6, 7].map((f) => Ce.fisherman(f)));
  anim(scene, 'fm_idle', 'fm', [0, 1], 2);
  anim(scene, 'fm_idle2', 'fm', [5, 6], 4);
  buildWorld2Textures(scene);
  // the tileset doubles as a sprite sheet (frame index = tile id)
  const tex = scene.textures.get('tiles');
  for (let i = 0; i < TILE_SLOTS; i++) tex.add('t' + i, 0, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16);
}

// ================================================================== World 2: the flooded island

export const PARK_W = 60;
export const PARK_H = 48;

function buildWorld2Textures(scene: Phaser.Scene) {
  // buildings
  for (let v = 0; v < 6; v++) add(scene, `b2_house${v}`, Is.floodHouse(v));
  add(scene, 'b2_ruin0', Is.ruinHouse(3));
  add(scene, 'b2_ruin1', Is.ruinHouse(8));
  add(scene, 'b2_inventor', Is.inventorHouse());
  add(scene, 'b2_cityhall', Is.cityHall());
  add(scene, 'b2_bank', Is.bank());
  // World 3: Bacchus Key
  add(scene, 'b3_club', Pa.clubFront(false));
  add(scene, 'b3_club_wrecked', Pa.clubFront(true));
  add(scene, 'b3_barrel', Pa.greatBarrel(false));
  add(scene, 'b3_barrel_broken', Pa.greatBarrel(true));
  add(scene, 'b3_barrel_crack1', Pa.barrelCracks(1));
  add(scene, 'b3_barrel_crack2', Pa.barrelCracks(2));
  add(scene, 'b3_barrel_top', Pa.barrelTop());
  add(scene, 'p3_stave', Pa.barrelStave());
  const shops: [string, number, number, string, Pa.Theme, number, number, boolean?][] = [
    ['b3_art', 7, 5, "AVALENA'S ART", 'art', 3, 301],
    ['b3_art_closed', 7, 5, "AVALENA'S ART", 'art', 3, 301, true],
    ['b3_buffet', 9, 6, 'EAT LIKE PIG BUFFET', 'buffet', 4, 302],
    ['b3_lobster', 8, 6, 'BLUE LOBSTER', 'lobster', 4, 303],
    ['b3_cafe', 8, 6, "LEX'S CAFE", 'cafe', 4, 304],
    ['b3_dough', 8, 7, 'FROSTED DOUGH', 'donut', 4, 305],
    ['b3_froyo', 8, 7, "MR. FROFRO'S", 'froyo', 4, 306],
    ['b3_karaoke', 7, 6, 'KARAOKE', 'karaoke', 3, 307],
    ['b3_arcade', 7, 6, 'ARCADE', 'arcade', 3, 308],
    ['b3_souvenir', 6, 5, 'SOUVENIRS', 'souvenir', 2, 309],
    ['b3_costume', 6, 5, 'COSTUMES', 'costume', 3, 310],
    ['b3_diner', 8, 5, 'NITE OWL DINER', 'diner', 4, 311],
    ['b3_hotel1', 9, 9, 'HOTEL TIPSY', 'hotel', 4, 312],
    ['b3_hotel2', 9, 10, 'SUNSET INN', 'hotel', 4, 313],
    ['b3_house0', 6, 5, '', 'house', 2, 314],
    ['b3_house1', 6, 5, '', 'house', 3, 315],
    ['b3_house2', 6, 5, '', 'house', 2, 316],
  ];
  for (const [k, w, h, name, theme, door, seed, closed] of shops) add(scene, k, Pa.shopfront(w, h, name, theme, door, seed, !!closed));
  for (const [k, seed] of [['p3_palm0', 3], ['p3_palm1', 8], ['p3_palm2', 14]] as const) add(scene, k, Pa.palm(seed));
  add(scene, 'p3_lamp', Pa.partyLamp());
  add(scene, 'p3_bunting0', Pa.bunting(1));
  add(scene, 'p3_bunting1', Pa.bunting(2));
  add(scene, 'p3_balloons', Pa.balloons(4));
  add(scene, 'p3_stage', Pa.streetStage());
  add(scene, 'p3_photobooth', Pa.photoBooth());
  add(scene, 'p3_cave', Pa.caveMouth());
  add(scene, 'p3_forsale', Pa.forSale());
  add(scene, 'p3_dj', Pa.djBooth());
  add(scene, 'p3_speaker', Pa.speaker());
  add(scene, 'p3_disco', Pa.discoBall());
  add(scene, 'p3_bottles', Pa.bottleShelf(false));
  add(scene, 'p3_bottles_empty', Pa.bottleShelf(true));
  add(scene, 'p3_jug', Pa.jug(false));
  add(scene, 'p3_jug_full', Pa.jug(true));
  add(scene, 'p3_elevator', Pa.elevator());
  add(scene, 'p3_backdoor', Pa.clubBackDoor(false));
  add(scene, 'p3_backdoor_open', Pa.clubBackDoor(true));
  add(scene, 'p3_bed', Pa.clinicBed());
  add(scene, 'p3_froyo', Pa.froyoMachine());
  add(scene, 'p3_donuts', Pa.donutCase(true));
  add(scene, 'p3_donuts_empty', Pa.donutCase(false));
  add(scene, 'p3_buffet', Pa.buffetLine());
  add(scene, 'p3_tank', Pa.lobsterTank());
  add(scene, 'p3_arcade0', Pa.arcadeCab(0));
  add(scene, 'p3_arcade1', Pa.arcadeCab(1));
  for (let k = 0; k < 3; k++) add(scene, 'p3_easel' + k, Pa.easel(k));
  for (let k = 0; k < 6; k++) add(scene, 'p3_canvas' + k, Pa.canvasPic(k));
  add(scene, 'p3_workbench', Pa.workbench());
  add(scene, 'p3_checklist', Pa.checklistBoard());
  add(scene, 'ui_fakeid', Pa.fakeIdCard());
  add(scene, 'b2_tech', Is.techShop());
  add(scene, 'b2_dealer', Is.dealership());
  add(scene, 'b2_grocery', Is.grocery2(false));
  add(scene, 'b2_grocery_open', Is.grocery2(true));
  // street props
  add(scene, 'p2_helipad', Is.helipad());
  add(scene, 'p2_boat0', Is.strandedBoat(1));
  add(scene, 'p2_boat1', Is.strandedBoat(2));
  for (let v = 0; v < 3; v++) add(scene, `p2_car${v}`, Is.wreckedCar(v));
  add(scene, 'p2_lampbroken', Is.brokenLamp());
  add(scene, 'p2_palm0', Is.deadPalm(4));
  add(scene, 'p2_palm1', Is.deadPalm(9));
  add(scene, 'p2_billboard', Is.billboard('ALL DEVELOPMENT', 'HALTED'));
  add(scene, 'p2_billboard2', Is.billboard('RE-ELECT MAYOR', 'BRANDO BIGGS'));
  add(scene, 'p2_crane', Is.crane());
  add(scene, 'p2_bike', Is.bikeProp(false));
  add(scene, 'p2_bike_hero', Is.bikeProp(true));
  addSheet(scene, 'gull', [0, 1].map((f) => Is.gull(f)));
  anim(scene, 'gull_flap', 'gull', [0, 1], 4);
  // the workshop + cutscenes
  for (let st = 0; st <= 4; st++) add(scene, `subtop${st}`, Is.subTop(st));
  addSheet(scene, 'subside', [0, 1].map((f) => Is.subSide(f)));
  anim(scene, 'subside_go', 'subside', [0, 1], 10);
  add(scene, 'bigscreen', Is.bigScreen());
  addSheet(scene, 'heli', [0, 1].map((f) => Is.helicopter(f)));
  anim(scene, 'heli_spin', 'heli', [0, 1], 16);
  add(scene, 'bigwave', Is.bigWave(720, 260));
  add(scene, 'deep_rocks0', Is.deepRocks(1600, 160, 3, 1));
  add(scene, 'deep_rocks1', Is.deepRocks(1600, 200, 7, 0));
  add(scene, 'sunkenship', Is.sunkenShip());
  addSheet(scene, 'eye', [0.05, 0.5, 1].map((o) => Is.giantEye(o)));
  for (let k = 0; k < 3; k++) add(scene, `kelp${k}`, Is.kelp(40 + k * 16, k + 3));
  add(scene, 'bubble0', Is.bubble(2));
  add(scene, 'bubble1', Is.bubble(4));
  // Thrill Harbor
  add(scene, 'p3_gate', Pk.parkGate());
  add(scene, 'p3_coaster', Pk.coasterArt(coasterTrack(), PARK_W * 16, PARK_H * 16));
  add(scene, 'p3_car', Pk.coasterCar());
  add(scene, 'p3_ferris', Pk.ferrisFrame());
  add(scene, 'p3_wheel', Pk.ferrisWheel());
  add(scene, 'p3_gondola', Pk.gondola(false));
  add(scene, 'p3_gondolaP', Pk.gondola(true));
  add(scene, 'p3_sling', Pk.slingTowers());
  add(scene, 'p3_ball', Pk.slingBall());
  addSheet(scene, 'p3_carousel', [0, 1].map((f) => Pk.carousel(f)));
  anim(scene, 'p3_carousel_go', 'p3_carousel', [0, 1], 2);
  add(scene, 'p3_bumper', Pk.bumperCars());
  add(scene, 'p3_funhouse', Pk.funhouse());
  add(scene, 'p3_haunted', Pk.hauntedRide());
  add(scene, 'p3_food1', Pk.foodStand('CORN DOGS'));
  add(scene, 'p3_food2', Pk.foodStand('COTTON'));
  add(scene, 'p3_booth', Pk.gameBooth());
  add(scene, 'p3_tix', Pk.ticketBooth());
  add(scene, 'sky2', Pk.launchSky(480, 900));
  // the Cave of the Gods
  for (const g of Gd.GODS) {
    add(scene, `g_statue_${g}`, Gd.statue(g));
    add(scene, `g_door_${g}`, Gd.godDoor(g, false));
    add(scene, `g_door_${g}_lit`, Gd.godDoor(g, true));
  }
  add(scene, 'g_shaft', Gd.lightShaft(64, 220));
  add(scene, 'g_subwreck', Gd.subWreck());
  // Slick Rick
  addFrames(scene, 'rk', [0, 1, 2, 3, 4, 5, 6, 7].map((f) => Rk.rickFrame(f)));
  anim(scene, 'rk_idle', 'rk', [0, 1], 6);
  anim(scene, 'rk_idle2', 'rk', [5, 6], 8);
  addSheet(scene, 'rickbike', [0, 1].map((f) => Rk.rickBike(f)));
  anim(scene, 'rickbike_ride', 'rickbike', [0, 1], 10);
  add(scene, 's_wall', Rk.storeWall());
  add(scene, 's_floor', Rk.storeFloor());
  add(scene, 's_tube', Rk.tube());
  add(scene, 'fx_oil', Rk.oilBlob());
  add(scene, 'fx_card', Rk.businessCard());
  ['DEAL!', 'SIGN!', '0% APR!', 'TODAY!', 'BUY!'].forEach((wd, i) => add(scene, `fx_pitch${i}`, Rk.pitchBubble(wd)));
  // the two shops
  add(scene, 'b_madpies', Sh.madPiesShop());
  add(scene, 'b2_thrift', Sh.thriftShop());
  add(scene, 'p_piecase', Sh.pieCase());
  for (let f = 0; f < 6; f++) add(scene, `p_pie${f}`, Sh.pie(f));
  add(scene, 'p_piebig', Sh.pie(2, true));
  for (const k of Sh.JUNK_KINDS) add(scene, `p_junk_${k}`, Sh.junk(k));
  addFrames(scene, 'ch_roxie', Sh.roxieSheet());
}
