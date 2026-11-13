import { departPrompt } from './voyage';
import type Phaser from 'phaser';
import { isSet } from './state';
import { P_HIGH, type Script, type Gate, type W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, camPx, titleCard, bars } from './w2_fx';
import { C } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { W4 } from '../world/maps/w4maps';
import { route4 } from './w4_state';
import { f, px, py, catAt, catRun, catGone, pawSparkle, narrate, inscription, fireflies, hideAll4, who, carlo, old, type Dir } from './w4_fx';

// World 4: THE FORGOTTEN ISLAND, acts 1 and 2. A quiet night at the foot of a
// mountain; the black cat; the monument at the summit and the island's story; the
// abandoned village; the first warning; the two guardians; and the two ways forward
// (the tower's gemstones, or the airship), found by exploring and never offered as a menu.

/** the cat currently on the island map, if any */
let cat: Phaser.GameObjects.Sprite | null = null;
const catLive = () => (cat && cat.active ? cat : null);

/** Where each glimpse of the cat on the way up runs to before it vanishes. */
const TRAIL_STEPS: Dir[][] = [
  ['right', 'up', 'up', 'up', 'up', 'up'],
  ['left', 'up', 'up', 'up', 'up'],
  ['up', 'up', 'up', 'up', 'up'],
  ['up', 'up', 'up', 'right', 'up'],
];

/** The top of the monument, where the cat sits (pixels). */
const MON_TOP = { x: W4.monument.x * 16 + 28, y: W4.monument.y * 16 + 14 };
/** The rim of the well. */
const WELL_RIM = { x: W4.well.x * 16 + 18, y: W4.well.y * 16 + 14 };

// ================================================================== arrival

const ARRIVAL: Record<string, Script> = {
  /** Teddy sees you off from Bacchus Key. */
  async w4_offer(w) {
    if (isSet(w.state, 'w4_started')) return;
    await w.say('The wind has changed. It smells of grass and stone, and of somewhere very far away.');
    await w.say('No tours go where you are going. I checked. Twice. Here, take a brochure anyway.', 'TOUR GUIDE TEDDY', { pitch: P_HIGH });
    await departPrompt(w, 'w4', 'TOUR GUIDE TEDDY', P_HIGH);
  },

  async w4_title(w) {
    w.set('w4_started');
    w.set('w3_ayla_follow', false);
    w.save();
    hideAll4(w, true);
    w.music(null);
    await camPx(w, px(W4.spawn.x), py(W4.spawn.y) - 40, 0, 2);
    await titleCard(w, '', 'THE FORGOTTEN ISLAND', 2800);
    w.music('w4_island');
    // the night: the meadow, the flowers, the trail winding up the mountain into the dark
    await camPx(w, px(24), py(56), 5200, 1.4);
    await w.wait(600);
    await camPx(w, px(W4.spawn.x), py(W4.spawn.y) - 8, 3000, 2);
    hideAll4(w, false);
    w.face('player', 'up');
    await w.camReturn(400);
    await w.wait(1400);
    // a black cat, sitting in the grass, staring at you
    const c = catAt(w, W4.catStart.x, W4.catStart.y, 0);
    w.sfx('meow');
    await w.camPan(W4.catStart.x - 2, W4.catStart.y, 700);
    await w.wait(1600);
    c.setFrame(1);
    await w.wait(500);
    // ...and then it runs up the mountain, far too fast
    w.sfx('whoosh');
    await catRun(w, c, Array(14).fill('up'), 42);
    w.set('w4_cat_seen');
    await w.camReturn(500);
    if (await w.confirm('A strange cat ran up the mountain. Follow it?')) w.set('w4_following');
    else await w.say('The trail winds up the mountain into the dark.');
    w.save();
  },

  decorate_w4_isl(w) {
    cat = null;
    fireflies(w, 1, 79, 35, 10, 16);
    fireflies(w, 97, 49, 12, 11, 10);
    fireflies(w, 84, 10, 24, 30, 10);
    if (f(w, 'w4_warning') || f(w, 'w4_captured')) return Promise.resolve();
    // the cat waits on the monument until you have read it
    if (f(w, 'w4_cat_seen') && !f(w, 'w4_summit_done')) cat = w.sprite('w4_cat', MON_TOP.x, MON_TOP.y, 9000).setOrigin(0.5, 1);
    // the gemstone trail, one step at a time
    else if (f(w, 'w4_tower_seen') && !f(w, 'w4_cat_storage')) cat = catAt(w, 71, 54, 0);
    else if (f(w, 'w4_storage_read') && !f(w, 'w4_cat_house2')) cat = catAt(w, 71, 41, 0);
    else if (f(w, 'w4_house2_read') && !f(w, 'w4_gem1')) cat = w.sprite('w4_cat', WELL_RIM.x, WELL_RIM.y, 9000).setOrigin(0.5, 1);
    return Promise.resolve();
  },

  async enter_w4_isl(w) {
    // out of the house with the carving: something on the roof
    if (f(w, 'w4_warn_read') && !f(w, 'w4_roof_seen') && w.player.x === W4.doors.warn.x && w.player.y === W4.doors.warn.y + 1) return SCRIPTS.w4_roof_cat(w);
    // out of the barn with the carving: the cat is waiting, and shows you the next house
    if (f(w, 'w4_storage_read') && !f(w, 'w4_cat_house2') && w.player.x === W4.doors.storage.x && w.player.y === W4.doors.storage.y + 1) return SCRIPTS.w4_cat_lead(w);
    if (who(w) === 'carlo' && Math.random() < 0.25) await SCRIPTS.w4_carlo_muse(w);
  },
};

// ================================================================== up the mountain

const MOUNTAIN: Record<string, Script> = {
  async w4_summit(w) {
    const c = catLive();
    await w.camPan(W4.monument.x + 2, W4.monument.y + 3, 1200, 1.6);
    await w.say('At the top of the mountain, right at the edge of the cliff, stands an enormous stone monument.');
    if (c) {
      w.sfx('meow');
      await w.wait(400);
      await w.say('The cat is sitting on top of it, watching you.');
      c.setFrame(1);
    }
    await w.camReturn(900);
    w.save();
  },

  async w4_monument(w) {
    const lines = [
      'Long ago, this island was home to countless people.',
      'Villages flourished, the forests were full of life, and the land provided everything its inhabitants needed.',
      'But today, this island is nothing more than a shell of what it once was.',
    ];
    if (f(w, 'w4_summit_done')) return inscription(w, 'w4_monument', lines, 1.5);
    w.face('player', 'up');
    await inscription(w, 'w4_monument', lines, 1.5);
    // the island's story: the camera drifts down over the cliff to the village below
    w.music(null);
    const off = bars(w);
    await w.camPan(60, 44, 3200, 1.5);
    const c = catLive();
    if (c) {
      c.destroy();
      cat = null;
    }
    w.music('w4_island');
    for (const l of [
      'Once, this island was considered one of the most prosperous places in the world.',
      'Its people lived in harmony with nature...',
      'But something changed.',
      'The soil gradually lost its ability to support plant life. Crops stopped growing, the trees began dying...',
      'At first, they survived by relying on the animals.',
      'But the animals began dying too...',
      'Eventually, the people had no choice but to leave.',
    ])
      await w.say(l);
    // to the forest, and the giant tree
    await w.camPan(61, 12, 2600, 1.3);
    await w.say('Only two remained to watch over what was left.');
    await w.camPan(96, 20, 2200, 1.3);
    await w.say('Two guardian spirits, entrusted with protecting the island and preserving what remained of its former glory.');
    await off();
    // two carvings: a lion among trees, a serpent in the wind
    const s = scene(w);
    const shade = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(85).setAlpha(0));
    const a = w.ui(s.add.image(SW / 2 - 70, 96, 'w4_stele0').setScale(2.5).setDepth(86).setAlpha(0));
    const b = w.ui(s.add.image(SW / 2 + 70, 96, 'w4_stele1').setScale(2.5).setDepth(86).setAlpha(0));
    s.tweens.add({ targets: shade, alpha: 0.8, duration: 600 });
    await w.tw({ targets: a, alpha: 1, duration: 800 });
    await w.say('A lion, carved among trees.');
    await w.tw({ targets: b, alpha: 1, duration: 800 });
    await w.say('A serpent, carved in the wind.');
    await w.tw({ targets: [shade, a, b], alpha: 0, duration: 600 });
    [shade, a, b].forEach((o) => o.destroy());
    await w.camReturn(1200);
    w.set('w4_summit_done');
    w.save();
    await w.say('When you look up, the cat is gone.');
  },
};
for (let i = 0; i < 4; i++)
  MOUNTAIN['w4_cat' + i] = async (w) => {
    const at = W4.catTrail[i].cat;
    const c = catAt(w, at.x, at.y, 0);
    await w.camPan(at.x, at.y, 600);
    w.sfx('meow');
    await w.wait(800);
    await catRun(w, c, TRAIL_STEPS[i], 55);
    await w.camReturn(500);
  };

// ================================================================== the village

const VILLAGE: Record<string, Script> = {
  async w4_vmonument(w) {
    await w.say('A worn stone marker in the middle of the square. A paw print is carved deep into its face.');
    if (f(w, 'w4_paw_seen')) await w.say('The same paw print is burned into the ground in front of it.');
  },
  async w4_boarded(w) {
    await w.say('The door is boarded shut. Whoever lived here meant to come back. They never did.');
  },
  async w4_ruin(w) {
    await w.say('This house has fallen in on itself. A child\'s shoe sticks out from under a beam, grey with dust.');
  },
  async w4_animal(w, id: string) {
    w.sfx(id === 'w4_pig' ? 'oink' : 'cluck');
    await w.say(id === 'w4_pig' ? 'A thin, quiet pig. It barely looks up.' : 'A scrawny hen pecks at the dead ground. There is nothing there to eat.');
  },
  async w4_forest_animal(w, id: string) {
    w.sfx(id === 'w4_deer' ? 'moo' : 'oink');
    await w.say(id === 'w4_deer' ? 'A wild cow grazes between the trees, sleek and healthy. Out here, the grass is still green.' : 'A wild piglet roots around in the moss. It looks very well fed.');
  },
  async w4_stele0(w) {
    await inscription(w, 'w4_stele0', ['WISPMANE, GUARDIAN OF THE LAND.', 'Where it walks, the forests grow. Every root, every leaf and every blade of grass on this island answers to it.'], 2.5);
    w.set('w4_stele0_read');
    await steleBoth(w);
  },
  async w4_stele1(w) {
    await inscription(w, 'w4_stele1', ['VIPERWIND, GUARDIAN OF THE SKY.', 'It rides the winds and steers the rain. It carries the seeds and the pollen from one end of the island to the other.'], 2.5);
    w.set('w4_stele1_read');
    await steleBoth(w);
  },

  // ---------------------------------------------------------------- the first warning
  async w4_carving(w) {
    await inscription(w, 'w4_carving', ['A carving, scratched deep into the wall: a small hooded figure, holding a blade taller than itself.', 'Underneath it, words:', 'When the land falls silent and the sky loses its light, the Collector shall return.'], 3);
    w.set('w4_warn_read');
    w.save();
  },
  async w4_roof_cat(w) {
    w.set('w4_roof_seen');
    // it is on the roof behind you; by the time you look up, it is not
    const c = catAt(w, W4.roofs.warn.x, W4.roofs.warn.y, 0, false, 9000);
    await w.wait(900);
    await w.say('You feel like something is watching you.');
    w.face('player', 'up');
    await w.camPan(W4.roofs.warn.x, W4.roofs.warn.y + 1, 500);
    await catGone(w, c, 120);
    await w.wait(700);
    await w.say('There is nothing on the roof.');
    await w.camReturn(500);
    w.save();
  },

  // ---------------------------------------------------------------- the engine in the castle
  async w4_engine_noise(w) {
    w.sfx('vroom');
    await w.wait(500);
    w.sfx('vroom');
    await w.say('From somewhere inside the castle: VRRRM. VRRRRRRM.');
    await w.say('...An engine? Out here?');
  },

  // ---------------------------------------------------------------- the forest
  async w4_forest_roar(w) {
    // a roar from deep in the forest; everything stops
    w.music('menace');
    w.sfx('roar');
    w.shake(1400, 0.012);
    for (const id of ['w4_deer', 'w4_fcat']) w.actor(id) && w.emote(id, '!', 900);
    w.emote('follower', '!', 900);
    await w.wait(1500);
    w.sfx('crash');
    await w.wait(400);
    w.sfx('creak');
    await w.say('A roar rolls out of the forest. The ground shakes. Every creature in sight freezes.');
    await w.say('Far off between the trees, branches snap, one after another... and then nothing.');
    w.music('w4_island');
  },

  async w4_companion_talk(w) {
    if (who(w) === 'carlo') return SCRIPTS.w4_carlo_muse(w);
    const lines = ['These old legs have climbed that tower every day for sixty years. They can manage a walk.', 'Wispmane will come round. He always does. Eventually.', 'Look at the stars tonight. Clear as glass.'];
    await old(w, lines[Math.floor(Math.random() * lines.length)]);
  },
  async w4_carlo_muse(w) {
    if (who(w) !== 'carlo') return;
    const lines = ['Do you think there are other people out there?', 'I wonder what it feels like to have a proper adventure.', 'Not that I\'m scared or anything. I just... prefer being prepared.'];
    const n = ((w.state.flags.w4_muse as number) ?? 0) % lines.length;
    w.set('w4_muse', n + 1);
    await carlo(w, lines[n]);
  },
};

async function steleBoth(w: W) {
  if (!f(w, 'w4_stele0_read') || !f(w, 'w4_stele1_read') || f(w, 'w4_balance')) return;
  w.set('w4_balance');
  await w.say('Under both carvings, the same line has been cut into the stone:');
  await w.say('NEITHER CAN KEEP THE ISLAND ALIVE ALONE.');
  await w.say('The land and the sky, in balance. When the balance broke, the island began to die.');
  await w.say('The stone does not say what broke it.');
}

// ================================================================== the gemstone trail (route A)

const GEMS: Record<string, Script> = {
  async w4_cat_storage(w) {
    const c = catLive() ?? catAt(w, 71, 54, 0);
    await w.camPan(70, 53, 500);
    w.sfx('meow');
    await w.wait(600);
    await catRun(w, c, ['left', 'left', 'up'], 90, false);
    await w.say('The cat squeezes through a gap under the door of the old storage barn.');
    await catGone(w, c, 160);
    cat = null;
    await w.camReturn(500);
  },
  /** Straight out of the barn: the cat waits for you, then runs all the way to the next house. */
  async w4_cat_lead(w) {
    if (f(w, 'w4_cat_house2')) return;
    catLive()?.destroy();
    const c = catAt(w, W4.doors.storage.x + 2, W4.doors.storage.y + 1, 0);
    const off = bars(w);
    await w.camPan(W4.doors.storage.x + 1, W4.doors.storage.y + 1, 400, 2);
    w.sfx('meow');
    await w.wait(500);
    await w.say('The black cat is sitting right outside the barn, as if it has been waiting for you.');
    w.sfx('meow');
    // it runs north through the village, and the camera goes with it
    const h = W4.doors.house2;
    const ups = W4.doors.storage.y + 1 - (h.y + 2);
    const steps: Dir[] = [...Array(ups).fill('up'), ...Array(Math.max(0, W4.doors.storage.x + 2 - h.x)).fill('left')];
    const run = catRun(w, c, steps, 90, false);
    await w.wait(150);
    await w.camPan(h.x, h.y + 2, ups * 90 + 300, 2);
    await run;
    c.setFrame(2);
    await w.tw({ targets: c, x: c.x + 24, y: c.y - 16, alpha: 0, duration: 260 });
    c.destroy();
    cat = null;
    w.set('w4_cat_house2');
    w.sfx('creak');
    await w.say('It runs all the way to the house at the north end of the village, and slips round the back. The front door creaks open.');
    await w.camReturn(700);
    await off();
    w.save();
  },
  async w4_cat_house2(w) {
    const c = catLive() ?? catAt(w, 71, 41, 0);
    await w.camPan(70, 40, 500);
    w.sfx('meow');
    await w.wait(600);
    await catRun(w, c, ['right', 'right', 'up', 'up', 'up'], 80);
    cat = null;
    w.sfx('creak');
    await w.say('It runs round the back of the house. The front door creaks open in the breeze.');
    await w.camReturn(500);
  },
  async w4_storage_text(w) {
    await inscription(w, null, [
      'Words are carved across the back wall of the barn:',
      'OUR THANKS TO THE GUARDIANS, WHO KEEP THE LAND GREEN AND THE SKIES KIND.',
      'TWO GEMSTONES OPEN THE TOWER OF THE GUARDIAN OF THE LAND.',
      'ONE WE KEEP SAFE BENEATH THE VILLAGE. THE OTHER SAILS WITH THE CAPTAIN, WHEREVER HE GOES.',
    ]);
    w.set('w4_storage_read');
    w.save();
  },
  async w4_house2_text(w) {
    await inscription(w, null, [
      'Something has been carved into the wall of the back room, low down, the way a child would:',
      'WE LOVE WISPMANE. EVERY SPRING HE WALKS THROUGH THE FIELDS AND THE WHEAT GROWS AS TALL AS DAD.',
      'Under it, in a grown-up hand:',
      'WHEN THE LAND BEGAN TO DIE, WISPMANE SHUT HIMSELF IN HIS TOWER. WE STILL LEAVE FOOD AT THE DOOR.',
    ]);
    w.set('w4_house2_read');
    w.save();
  },
  async w4_well(w) {
    if (f(w, 'w4_gem1') || f(w, 'w4_well_found')) {
      await w.say('The hidden steps lead down inside the well.');
      return w.warp('w4_cellar', 5, 2, 'down');
    }
    if (!f(w, 'w4_house2_read')) return void (await w.say('An old stone well, dry as dust. A cold draught rises from somewhere far below.'));
    const c = catLive();
    if (c) {
      await w.say('The cat is sitting on the rim of the well, staring down into it.');
      c.setFrame(2);
      await w.tw({ targets: c, y: c.y + 12, alpha: 0, duration: 260 });
      c.destroy();
      cat = null;
      await w.say('It hops inside.');
    }
    await w.say('You lean over the edge. Some of the stones inside the well stick out like steps...');
    await w.say('A hidden passage!');
    w.set('w4_well_found');
    w.sfx('ladder');
    await w.warp('w4_cellar', 5, 2, 'down');
  },
  async w4_gem1(w) {
    w.set('w4_gem1');
    await w.give('gem', 1, 'GOT A GUARDIAN GEMSTONE!');
    w.refresh();
    // the cat, at the foot of the ladder, for just a moment
    const c = catAt(w, 5, 1, 0);
    w.sfx('meow');
    await w.wait(900);
    await catGone(w, c, 300);
    pawSparkle(w, px(5), py(1));
    await w.wait(600);
    w.save();
  },
  async w4_gem2(w) {
    w.set('w4_gem2');
    await w.say('Tucked behind the captain\'s chair, wrapped in an old flag: a green stone.');
    await w.give('gem', 1, 'GOT A GUARDIAN GEMSTONE!');
    w.refresh();
    w.save();
  },
};

const DOORS: Record<string, Gate> = {
  async w4_storage_door(w) {
    if (f(w, 'w4_cat_storage')) return true;
    await w.say('The big door is warped shut.');
    return false;
  },
  async w4_house2_door(w) {
    if (f(w, 'w4_cat_house2')) return true;
    await w.say('The door is locked tight.');
    return false;
  },
  async w4_castle_door() {
    return true;
  },
  async w4_root_gate(w) {
    await w.say('Roots as thick as your body are woven over the opening. There is no way in from down here.');
    return false;
  },

  // ---------------------------------------------------------------- the tower door
  async w4_tower_door(w) {
    if (route4(w.state) === 'B') {
      await w.say('Roots have grown up over the door and sealed it tight. The tower has closed itself to you.');
      return false;
    }
    if (f(w, 'w4_tower_open')) return true;
    if (!f(w, 'w4_tower_seen')) {
      w.set('w4_tower_seen');
      w.face('player', 'up');
      // the camera climbs the tower: vines, roots, and a stone lion at the very top
      await w.camPan(W4.doors.tower.x, W4.doors.tower.y - 1, 500, 2);
      await w.say('A tower, choked in vines and roots.');
      await w.camPan(W4.doors.tower.x, 3, 2400, 2);
      await w.say('At its very top, a stone lion crouches, staring out over the island.');
      await w.camPan(W4.doors.tower.x, W4.doors.tower.y - 1, 1400, 2);
      await w.camReturn(400);
      await w.say('The door has two round sockets in it, both empty.');
      w.save();
      w.refresh();
      return false;
    }
    const n = w.count('gem');
    if (n < 2) {
      await w.say(n === 1 ? 'Your gemstone would fit one socket. The other stays empty.' : 'Two empty sockets.');
      return false;
    }
    if (!(await w.confirm('Press the two gemstones into the sockets?'))) return false;
    w.take('gem', 2);
    const door = w.prop('tower') as Phaser.GameObjects.Image | undefined;
    w.sfx('crystal');
    door?.setTexture('w4_tower1');
    await w.wait(700);
    w.sfx('crystal');
    door?.setTexture('w4_tower2');
    w.flash(0.4);
    await w.wait(600);
    await w.say('The sockets glow green.');
    w.sfx('rumble');
    w.shake(1600, 0.008);
    w.sfx('grow');
    w.set('w4_route', 'A');
    w.set('w4_tower_open');
    w.refresh();
    await w.wait(900);
    await w.say('The vines pull back from the walls like living things. Slowly, the door grinds open.');
    await w.say('Inside, stone stairs lead down into darkness.');
    w.save();
    return true;
  },
};

export const W4_ACT1: Record<string, Script> = { ...ARRIVAL, ...MOUNTAIN, ...VILLAGE, ...GEMS };
export const W4_ACT1_GATES: Record<string, Gate> = DOORS;
void isSet;
