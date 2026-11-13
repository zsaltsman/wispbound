import Phaser from 'phaser';
import type { Script, Gate, W } from './helpers';
import { scene, camPx, camFollow, bars, pop, cut } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { T } from '../world/tiles';
import { W4, G3, G2 } from '../world/maps/w4maps';
import { route4 } from './w4_state';
import { f, px, py, carlo, CARLO, P_CARLO, who, hideAll4, old } from './w4_fx';

// World 4, route B: the airship. Its keys in the dark passenger cabin (and something
// else in there with them); its steering wheel, in the hands of a boy who lives alone
// in the castle; its fuel, at the top of the mast, under a very large bird. Then the
// start-up, the flight, the giant tree and its seven floors, top to bottom.

type Dir = 'up' | 'down' | 'left' | 'right';
const DIRV: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const C_ = (w: W, l: string) => w.say(l, CARLO, { pitch: P_CARLO });

// ================================================================== the panel minigame

/**
 * One step of starting the airship. 'time': stop the moving needle inside the lit
 * zone. 'mash': press A fast enough to fill the gauge before it drains.
 */
async function panelStep(w: W, label: string, kind: 'time' | 'mash', speed = 1, zone = 0.22): Promise<boolean> {
  const s = scene(w);
  const c = w.ui(s.add.container(0, 0).setDepth(86));
  const panel = s.add.image(SW / 2, 104, 'w4_panel').setScale(1.5);
  const t = txt(s, SW / 2, 26, label, { outline: true, origin: [0.5, 0] });
  const hint = txt(s, SW / 2, 186, kind === 'time' ? 'PRESS SPACE WHEN THE NEEDLE IS IN THE LIGHT' : 'PRESS SPACE AS FAST AS YOU CAN!', { color: C.light, origin: [0.5, 0] });
  const g = s.add.graphics();
  c.add([panel, t, hint, g]);
  const BX = SW / 2 - 80;
  const BY = 168;
  const BW = 160;
  const z0 = 0.5 + (Math.random() - 0.5) * (0.6 - zone);
  let pos = 0;
  let dirn = 1;
  let fill = 0.15;
  let left = 4000;
  const draw = () => {
    g.clear();
    g.fillStyle(C.black, 1).fillRect(BX - 2, BY - 2, BW + 4, 12);
    if (kind === 'time') {
      g.fillStyle(C.mid, 1).fillRect(BX + (z0 - zone / 2) * BW, BY, zone * BW, 8);
      g.fillStyle(C.white, 1).fillRect(BX + pos * BW - 1, BY - 3, 3, 14);
    } else {
      g.fillStyle(C.light, 1).fillRect(BX, BY, fill * BW, 8);
      g.fillStyle(C.white, 1).fillRect(BX + BW * 0.92, BY - 3, 2, 14);
    }
  };
  const ok = await new Promise<boolean>((done) => {
    const upd = (_: number, dt: number) => {
      if (kind === 'time') {
        pos += dirn * dt * 0.0011 * speed;
        if (pos > 1) (pos = 1), (dirn = -1);
        if (pos < 0) (pos = 0), (dirn = 1);
      } else {
        fill = Math.max(0, fill - dt * 0.00025 * speed);
        left -= dt;
        if (left <= 0) finish(false);
      }
      draw();
    };
    const finish = (r: boolean) => {
      s.events.off('update', upd);
      w.keyHook = null;
      done(r);
    };
    s.events.on('update', upd);
    w.keyHook = (b) => {
      if (b !== 'a') return;
      if (kind === 'time') finish(Math.abs(pos - z0) <= zone / 2);
      else {
        fill += 0.11;
        w.sfx('tick');
        if (fill >= 0.92) finish(true);
      }
    };
  });
  w.sfx(ok ? 'right' : 'wrong');
  await w.wait(400);
  c.destroy();
  return ok;
}

/** All five steps; each one can be retried. */
async function startEngine(w: W) {
  const steps: [string, 'time' | 'mash', number, number, string][] = [
    ['1. INSERT THE KEY', 'time', 0.8, 0.26, 'The key slides in and turns with a CLUNK.'],
    ['2. PRIME THE ENGINE', 'mash', 1, 0, 'The fuel pump wheezes. Gasoline gurgles into the lines.'],
    ['3. PULL THE STARTER LEVER', 'time', 1.2, 0.22, 'The starter lever slams down. Something deep inside goes WHUMP.'],
    ['4. ADJUST THE STEERING', 'time', 1.4, 0.16, 'The wheel locks into place, dead centre.'],
    ['5. FINAL IGNITION', 'time', 1.8, 0.16, ''],
  ];
  for (const [label, kind, sp, zone, done] of steps) {
    while (!(await panelStep(w, label, kind, sp, zone))) await w.say(kind === 'mash' ? 'Not fast enough! The gauge drains away. Try again.' : 'Missed! Try again.');
    if (done) await w.say(done);
  }
}

// ================================================================== the airship's parts

const SHIP: Record<string, Script> = {
  async w4_keys(w) {
    w.set('w4_keys');
    await w.say('Something glints under a broken seat: a heavy ring of keys.');
    await w.give('keys', 1, 'GOT THE AIRSHIP KEYS!');
    w.refresh();
    await allParts(w);
    w.save();
  },
  async w4_cabin_dark(w) {
    if (route4(w.state) === 'A') return;
    w.set('w4_viper_seen');
    const s = scene(w);
    await w.wait(300);
    w.setDark(0.85, 600);
    await w.wait(600);
    w.sfx('hiss');
    await w.say('Something moves in the dark.');
    // from behind the broken wall, a long shape made of wind rises up
    const v = w.sprite('ow_viperwind', px(8), py(3) + 10, 9000).setOrigin(0.5, 1).setAlpha(0);
    await w.camPan(7, 3, 500, 2.2);
    s.tweens.add({ targets: v, alpha: 1, y: py(3) - 4, duration: 900, ease: 'Sine.easeOut' });
    await w.wait(1200);
    w.sfx('hiss');
    v.setFrame(1);
    w.emote('follower', '!', 800);
    w.emote('follower2', '!', 800);
    await w.wait(1200);
    await w.say('A serpent, as long as the cabin, with fins like kites. It stares at you without blinking, and hisses.');
    v.setFrame(2);
    w.sfx('whoosh');
    await w.tw({ targets: v, x: v.x + 140, y: v.y - 40, alpha: 0, duration: 800, ease: 'Quad.easeIn' });
    v.destroy();
    await w.say('It pours itself out through a split in the hull and is gone.');
    w.setDark(w.map.dark, 600);
    await w.camReturn(500);
  },
  async w4_cabin_wall(w) {
    await w.say('Something has torn a great ragged hole in the cabin wall. Cold air whistles through it.');
  },
  async w4_shipmap(w) {
    await w.say('A map of the island, pinned to the wall. Someone has drawn a careful circle around the giant tree... and another around the tower.');
  },
  async w4_brokenwheel_s(w) {
    await w.say('The ship\'s wheel, snapped clean in half. This airship isn\'t steering anywhere with that.');
  },
  async w4_chair_s(w) {
    await w.say('An old captain\'s chair. The leather has split and curled like dry leaves.');
  },

  /** The first time you come up to the wreck: the panel, the ladder and the door, one by one. */
  async w4_wreck_look(w) {
    if (route4(w.state)) return;
    const off = bars(w);
    await w.say('The old airship, lying on its side on the rocks. Up close, it looks almost in one piece.');
    await w.camPan(75.5, 79, 600, 2);
    await w.say('On the side of the hull, an ENGINE PANEL. Under the rust it reads: IGNITION KEY: MISSING.  STEERING WHEEL: MISSING.  FUEL: EMPTY.');
    w.set('w4_engine_seen');
    await w.camPan(78, 76, 600, 2);
    await w.say('A rope ladder hangs down the side of the mast, all the way up to a CROW\'S NEST.');
    await w.camPan(72.5, 78, 600, 2);
    await w.say('And a hole torn in the hull leads inside the wreck.');
    await w.say('Keys, a wheel and fuel... and maybe this thing could fly again.');
    await w.camReturn(600);
    await off();
    w.save();
  },

  // ---------------------------------------------------------------- the engine
  async w4_engine(w) {
    if (route4(w.state) === 'A') return void (await w.say('The airship\'s engine is cold and silent. Whatever life it had left, the island seems to have chosen to spend elsewhere.'));
    if (!f(w, 'w4_engine_seen')) {
      w.set('w4_engine_seen');
      await w.say('An engine panel, set into the side of the wreck. Under the rust, the labels are still readable:');
      await w.say('IGNITION KEY: MISSING.  STEERING WHEEL: MISSING.  FUEL: EMPTY.');
      await w.say('The engine itself looks... surprisingly fine.');
      w.save();
    }
    const need = (['keys', 'wheel', 'gas'] as const).filter((k) => !w.has(k));
    if (need.length) {
      const nm: Record<string, string> = { keys: 'THE KEYS', wheel: 'A STEERING WHEEL', gas: 'FUEL' };
      await w.say(`Still missing: ${need.map((k) => nm[k]).join(', ')}.`);
      const hint: Record<string, string> = {
        keys: 'The keys might still be inside the wreck. Its door is the hole in the hull.',
        wheel: f(w, 'w4_carlo_met') ? 'The boy in the castle has a steering wheel. A real one, off an airship.' : 'Somebody up at the castle was making engine noises...',
        gas: 'The fuel can is up the rope ladder, in the crow\'s nest at the top of the mast.',
      };
      for (const k of need) await w.say(hint[k]);
      return;
    }
    if (!(await w.confirm('Everything is here. Try to start the airship?'))) return;
    w.take('keys');
    w.take('wheel');
    w.take('gas');
    w.set('w4_route', 'B');
    w.save();
    await startEngine(w);
    w.sfx('sputter');
    w.shake(1200, 0.006);
    await w.wait(1300);
    await carlo(w, 'Uh...');
    await carlo(w, 'Is it supposed to do that?');
    while (!(await panelStep(w, 'TRY THE IGNITION AGAIN', 'time', 2, 0.14))) await w.say('It coughs and dies. Again!');
    w.sfx('engine');
    w.shake(1600, 0.01);
    await w.wait(800);
    await carlo(w, 'IT WORKED!', 'heart');
    await SCRIPTS_B.w4_fly(w);
  },

  /** 8B: up and away, across the island, and into the giant tree. */
  async w4_fly(w) {
    const s = scene(w);
    w.set('w4_flown');
    w.save();
    hideAll4(w, true);
    w.refresh();
    const ship = w.sprite('w4_ship', px(74), py(76), 9500).setOrigin(0.5, 1).setScale(0.55);
    ship.play('w4_ship_fly');
    const off = bars(w);
    camFollow(w, ship, 0.08, 1.6);
    w.sfx('engine');
    await w.tw({ targets: ship, y: ship.y - 60, duration: 1800, ease: 'Sine.easeInOut' });
    w.music('w4_island');
    s.tweens.add({ targets: ship, x: px(64), y: py(30), duration: 6000, ease: 'Sine.easeInOut' });
    await w.wait(2600);
    await carlo(w, 'Wait...');
    await carlo(w, 'I know that tree!');
    await carlo(w, 'I used to come here all the time with Viperwind. He\'d fly me up, and then he\'d vanish inside it for hours.');
    await carlo(w, 'People always said there was a sanctuary in there somewhere. Right in the middle of the tree.');
    await w.wait(800);
    // the wind takes the ship
    w.sfx('whoosh');
    w.shake(1600, 0.012);
    s.tweens.killTweensOf(ship);
    s.tweens.add({ targets: ship, angle: { from: -8, to: 8 }, duration: 260, yoyo: true, repeat: 6 });
    await carlo(w, 'WHOA!');
    await carlo(w, 'WHAT\'S HAPPENING?!');
    w.sfx('whoosh');
    await w.tw({ targets: ship, x: px(61), y: py(10), scale: 0.25, duration: 1600, ease: 'Quad.easeIn' });
    w.flash(0.6);
    w.sfx('crash');
    ship.destroy();
    await off();
    await w.fade(true, 500);
    cut(w, 'w4_g7', 8, 7, 'down');
    hideAll4(w, false);
    await w.fade(false, 600);
    await SCRIPTS_B.w4_reunion(w);
  },
};

// ================================================================== the castle and Carlo

const CASTLE: Record<string, Script> = {
  async enter_w4_castle(w) {
    if (f(w, 'w4_carlo_met')) return;
    await w.wait(300);
    w.sfx('vroom');
    await w.say('VRRRRM! VRRRM! Somebody in here is making engine noises. Very committed engine noises.');
  },
  async w4_carlo(w) {
    if (!f(w, 'w4_carlo_met')) {
      w.set('w4_carlo_met');
      await w.emote('carlo', '!', 500);
      w.face('carlo', 'down');
      w.sfx('scream');
      await C_(w, 'AH!');
      await C_(w, 'WHO ARE YOU?!');
      await C_(w, '...You\'re a person. A real one. Nobody comes here. Nobody comes ANYWHERE here.');
      await C_(w, 'I\'m Carlo. This is my castle. I live here by myself. That\'s fine. I\'m very busy.');
      await w.say('He is sitting in a cardboard box with a steering wheel jammed into the front. A real one. From an airship.');
      if (f(w, 'w4_engine_seen')) {
        await C_(w, 'What? This? This is my car. You can\'t have it.');
        await C_(w, 'No. Absolutely not. Go and find your own steering wheel.');
      }
      w.save();
      return;
    }
    if (route4(w.state) === 'A') return void (await C_(w, 'Vroom. ...Don\'t look at me like that. You look busy. Go on.'));
    if (!f(w, 'w4_engine_seen')) return void (await C_(w, 'VRRRRM. Shh, I\'m driving.'));
    await C_(w, '...You really need it, huh? For that old airship on the rocks?');
    await w.wait(400);
    await C_(w, 'Well... if you let me come with you, I\'ll give it to you.');
    await C_(w, 'I\'ve been stuck here forever.');
    await C_(w, 'And you look like you actually go places.');
    w.set('w4_carlo_joined');
    w.set('w4_carlo_follow');
    w.set('w4_wheel');
    w.refresh();
    await w.give('wheel', 1, 'GOT THE STEERING WHEEL!');
    w.sfx('recruit');
    await w.say('CARLO JOINED YOU!');
    w.spawnCompanion();
    await allParts(w);
    w.save();
  },
  async w4_carlo_talk(w) {
    w.set('w4_carlo_follow');
    await C_(w, 'There you are! Let\'s go!');
    w.spawnCompanion();
  },
};

// ================================================================== the crow's nest

const NEST: Record<string, Script> = {
  /** The crow will not fight you for it. It wants something, and it is not the fuel. */
  async w4_crow_meet(w) {
    const s = scene(w);
    w.music('menace');
    let cr: Phaser.GameObjects.Sprite;
    if (!f(w, 'q_crow_met')) {
      w.set('q_crow_met');
      await w.say('At the top of the mast, a can of gasoline, wedged in among a nest of twigs, wire and bones.');
      w.sfx('caw');
      w.shake(500, 0.006);
      cr = w.sprite('ow_crow', px(6), -20, 9500).setOrigin(0.5, 1).setFrame(1);
      await w.camPan(6, 3, 500, 2);
      await w.tw({ targets: cr, y: py(2), duration: 900, ease: 'Quad.easeOut' });
      cr.setFrame(0);
      w.sfx('screech');
      w.shake(800, 0.01);
      s.tweens.add({ targets: cr, scaleX: 1.05, duration: 120, yoyo: true, repeat: 3 });
      await w.say('A crow the size of a cart drops onto the nest. Its feathers are patchy and its eyes are wrong.');
      await w.say('It hunches over the gasoline can and glares at you. It is not going to move.');
      await w.say('Woven into its nest, between the twigs: bottle caps, a spoon, a cracked mirror, a dozen buttons. Anything that shines.');
    } else {
      cr = w.sprite('ow_crow', px(6), py(2), 9500).setOrigin(0.5, 1).setFrame(0);
      await w.camPan(6, 3, 400, 2);
      w.sfx('caw');
      await w.say('The crow is still hunched over the gasoline can, watching you with its wrong eyes.');
    }
    for (;;) {
      const c = await w.ask('What do you do?', ['SHOO IT AWAY', 'OFFER IT SOMETHING SHINY', 'CLIMB BACK DOWN']);
      if (c === 0) {
        cr.setFrame(1);
        w.sfx('screech');
        w.shake(700, 0.012);
        await w.tw({ targets: cr, scaleX: 1.25, scaleY: 1.15, duration: 160, yoyo: true });
        cr.setFrame(0);
        await w.say('You wave your arms and shout. The crow spreads its wings, wider than the whole platform, and SCREECHES right back.');
        await w.say('You nearly go over the rail. It settles down again on the can, very pleased with itself.');
        continue;
      }
      if (c === 2) {
        await w.say('You back away toward the ladder. The crow fluffs up and stays exactly where it is.');
        cr.destroy();
        await w.camReturn(400);
        return;
      }
      break;
    }
    // a shiny button off your coat, tossed across the platform
    await w.say('You pull a brass button off your coat and hold it up. It catches the moonlight.');
    cr.setFrame(1);
    w.sfx('caw');
    await w.wait(500);
    await w.say('The crow\'s head tilts. Then tilts the other way. It has not taken its eyes off the button.');
    const bt = w.image('fx_px', w.player.sprite.x, w.player.sprite.y - 20, 9600).setScale(2);
    w.sfx('whoosh');
    await w.tw({ targets: bt, x: px(10) + 8, y: py(3) + 8, duration: 600, ease: 'Quad.easeOut' });
    w.sfx('tick');
    cr.setFrame(0);
    await w.tw({ targets: cr, x: px(10) + 8, y: py(3) + 10, duration: 500, ease: 'Quad.easeIn' });
    bt.destroy();
    w.sfx('caw');
    await w.wait(400);
    await w.say('It hops off the can, snatches up the button, and gives you one long look...');
    cr.setFrame(1);
    w.sfx('whoosh');
    await w.tw({ targets: cr, x: cr.x + 260, y: cr.y - 140, duration: 1400, ease: 'Quad.easeIn' });
    cr.destroy();
    await w.say('...and flaps off into the night, to hide its new treasure somewhere nobody will find it.');
    w.set('crow_beaten');
    w.save();
    w.music(w.map.music);
    await w.camReturn(500);
  },
  async w4_gas(w) {
    w.set('w4_gas');
    await w.give('gas', 1, 'GOT A CAN OF GASOLINE!');
    w.refresh();
    await allParts(w);
    w.save();
  },
};

/** The last of the three parts: say so, and where to take them. */
export async function allParts(w: W) {
  if (route4(w.state) === 'A' || !(['keys', 'wheel', 'gas'] as const).every((k) => w.has(k))) return;
  if (f(w, 'q_parts_all')) return;
  w.set('q_parts_all');
  w.sfx('chime');
  await w.say('That\'s everything the airship needs: the keys, the steering wheel and the fuel.');
  await w.say('Take them to the ENGINE PANEL on the side of the wreck, and try to start it up.');
}

// ================================================================== the giant tree, top to bottom

const TREE: Record<string, Script> = {
  /** 7F: the reunion. */
  async w4_reunion(w) {
    if (f(w, 'w4_reunion')) return;
    w.set('w4_reunion');
    w.save();
    await w.wait(500);
    await w.say('The airship has come to rest in a great hollow inside the tree. Wood all around. Wind whistling far above.');
    w.sfx('hiss');
    const v = w.sprite('ow_viperwind', px(8), -10, 9000).setOrigin(0.5, 1);
    await w.camPan(8, 4, 500, 2);
    await w.tw({ targets: v, y: py(4), duration: 700, ease: 'Quad.easeOut' });
    v.setFrame(1);
    w.sfx('hiss');
    w.shake(400, 0.006);
    await w.wait(900);
    v.setFrame(0);
    await w.wait(500);
    // ...and then it sees Carlo
    await carlo(w, 'VIPERWIND!', '!');
    if (w.companion) await w.tw({ targets: w.companion.sprite, x: v.x + 12, y: v.y + 4, duration: 500 });
    v.setFrame(3);
    w.sfx('purr');
    await w.emote('inventor', 'heart', 900);
    await w.say('Carlo throws his arms around the serpent. Viperwind coils round and round him, happily.');
    await carlo(w, 'I thought I\'d never see you again!');
    await w.wait(400);
    await carlo(w, 'Viperwind, look! These are my friends. They got the airship flying!');
    v.setFrame(1);
    w.sfx('hiss');
    w.shake(300, 0.006);
    await w.wait(700);
    v.setFrame(2);
    w.sfx('whoosh');
    await w.tw({ targets: v, y: v.y - 120, alpha: 0, duration: 700, ease: 'Quad.easeIn' });
    v.destroy();
    await w.wait(500);
    await carlo(w, '...I guess he doesn\'t like you.');
    w.spawnCompanion();
    await w.camReturn(500);
  },

  /** 6F: the Ancient Tree Guardian. */
  async w4_squirrel_scene(w) {
    const s = scene(w);
    w.music('menace');
    for (let i = 0; i < 5; i++) {
      const n = w.image('fx_nut', px(3 + Math.random() * 11), -10, 9200);
      s.tweens.add({ targets: n, y: py(7) - Math.random() * 30, angle: 360, duration: 600, delay: i * 120, ease: 'Quad.easeIn', onComplete: () => n.destroy() });
    }
    w.sfx('creak');
    await w.wait(800);
    await carlo(w, 'Uh oh. I know what lives on this floor.');
    const sq = w.sprite('ow_squirrel', px(14), py(2), 9300).setOrigin(0.5, 1).setFrame(1);
    await w.camPan(10, 4, 400, 2);
    w.sfx('swish');
    await w.tw({ targets: sq, x: px(9), y: py(4), duration: 400, ease: 'Quad.easeIn' });
    sq.setFrame(0);
    w.sfx('impact');
    w.shake(600, 0.012);
    await w.say('A squirrel the size of a house leaps down off the wall, its tail bristling!');
    await w.startBattle('squirrel');
  },
  async after_squirrel(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You wake up buried in nutshells. The Tree Guardian is chattering angrily from the wall.');
      while (!(await w.confirm('Fight the Ancient Tree Guardian again?'))) await w.say('The only way down is past it.');
      return w.startBattle('squirrel');
    }
    w.set('squirrel_beaten');
    w.save();
    const sq = w.sprite('ow_squirrel', px(9), py(4), 9300).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(9, 4, 500, 2);
    await w.wait(700);
    sq.setFrame(0);
    w.sfx('swish');
    await w.tw({ targets: sq, x: px(15), y: -30, duration: 700, ease: 'Quad.easeIn' });
    sq.destroy();
    await carlo(w, 'It was only guarding the tree. Like Viperwind does. ...Did, I mean. Does.');
    await w.camReturn(500);
  },

  /** 5F: the treehouse. */
  async w4_drawing(w) {
    await w.say('A drawing pinned to the wall, in crayon: a little boy, holding hands with a long green serpent.');
    if (who(w) !== 'carlo') return;
    await carlo(w, 'Hey...');
    await carlo(w, 'That\'s me.');
    await carlo(w, 'I used to come here all the time.');
    await carlo(w, 'And that\'s Viperwind.');
    await w.wait(700);
    await w.emote('inventor', '...', 1200);
  },
  async w4_drawing_other(w) {
    await w.say(w.player.x < 6 ? 'A drawing of the giant tree, with a tiny house up in its branches and a sun with a face.' : 'A drawing of an airship. Underneath, in big wobbly letters: ONE DAY.');
  },
  async w4_scope_s(w) {
    await w.say('A brass telescope on a stand, pointed at the sky through a knothole. The lens is cracked down the middle.');
  },
  async w4_toys(w) {
    await w.say(['Wooden blocks, a ball, and a little carved snake with paint for eyes.', 'A box of notes. Most of them say things like MEET HERE TOMORROW and BRING SNACKS.', 'A toy airship, its propeller long since snapped off.'][Math.floor(Math.random() * 3)]);
  },

  /** 4F: the botanical chamber. */
  async enter_w4_g4(w) {
    if (f(w, 'q_w4_g4')) return;
    w.set('q_w4_g4');
    await w.wait(300);
    await w.say('A whole garden, growing inside the tree. Glowing flowers. Moss. The air is warm and smells of rain.');
    await carlo(w, 'It\'s still here. All of it. I thought it would have died like everything else.');
  },
  async w4_botany(w) {
    await w.say('Little wooden signs stand among the plants, in a child\'s handwriting: GLOWY ONE. SPIKY ONE. DO NOT EAT (I ATE IT).');
  },

  /** 3F: Carlo's mushroom melody. */
  decorate_w4_g3(w) {
    if (f(w, 'w4_g3_done')) for (const [x, y] of G3.gap) w.setGround(x, y, T.W4_ROOTFLOOR);
    else for (const [x, y] of G3.gap) w.setGround(x, y, T.W4_GAP);
    mel = 0;
    return Promise.resolve();
  },
  async enter_w4_g3(w) {
    if (f(w, 'q_w4_g3')) return;
    w.set('q_w4_g3');
    await w.wait(400);
    await carlo(w, 'The singing mushrooms! Viperwind and I used to play them for hours.');
    await carlo(w, 'If you play the right song, the big one in the middle grows. Listen! It goes like this:');
    await playMelody(w);
    await carlo(w, 'Your turn!');
  },
  async w4_mush(w) {
    if (f(w, 'w4_g3_done')) return void (await w.say('The mushroom hums softly to itself.'));
    const [dx, dy] = DIRV[w.player.dir as Dir];
    const k = G3.mush.findIndex((m) => m.x === w.player.x + dx && m.y === w.player.y + dy);
    if (k < 0) return;
    await sing(w, k);
    if (MELODY[mel] === k) {
      mel++;
      if (mel < MELODY.length) return;
      w.set('w4_g3_done');
      await w.wait(300);
      await w.camPan(G3.big.x, G3.big.y, 600);
      w.sfx('grow');
      w.shake(900, 0.008);
      w.refresh();
      for (const [x, y] of G3.gap) w.setGround(x, y, T.W4_ROOTFLOOR);
      await w.say('The giant mushroom swells and swells, until its cap stretches right across the gap!');
      await carlo(w, 'You did it! You played it perfectly! ...Well, nearly as good as me.');
      await w.camReturn(500);
      w.save();
      return;
    }
    mel = 0;
    w.sfx('wrong');
    await carlo(w, 'No, no! Like this:');
    await playMelody(w);
  },

  /** 2F: the jump. */
  async w4_jump(w) {
    const up = w.player.y > G2.jump.from.y;
    if (!(await w.confirm('Jump across the gap?'))) return;
    const p = w.player.sprite;
    const to = up ? G2.jump.from : G2.jump.to;
    w.sfx('whoosh');
    await w.tw({ targets: p, y: p.y + (up ? -16 : 16) - 10, duration: 160, ease: 'Quad.easeOut' });
    await w.tw({ targets: p, y: py(to.y), duration: 160, ease: 'Quad.easeIn' });
    await w.warp('w4_g2', w.player.x, to.y, up ? 'up' : 'down');
  },
  decorate_w4_g2(w) {
    if (!g2Orig) g2Orig = [...w.map.ground];
    w.map.ground.forEach((t, i) => {
      if (t !== g2Orig![i]) w.setGround(i % w.map.w, Math.floor(i / w.map.w), g2Orig![i]);
    });
    g2Running = false;
    if (f(w, 'w4_g2_done')) for (let y = G2.run.y0 - 1; y <= G2.run.y1; y++) for (let x = 1; x < G2.run.x1; x++) w.setGround(x, y, T.W4_GAP);
    return Promise.resolve();
  },
  async w4_collapse(w) {
    if (f(w, 'w4_g2_done') || g2Running) return;
    g2Running = true;
    w.sfx('creak');
    w.shake(600, 0.006);
    await carlo(w, 'The floor is cracking! RUN!', '!');
    const r = await collapseRun(w);
    g2Running = false;
    if (r === 'fell') {
      w.sfx('heavy');
      w.flash(0.5);
      await w.say('The floor gives way under you! You grab a root just in time and haul yourself back up.');
      await w.warp('w4_g2', G2.jump.from.x, G2.jump.from.y, 'down');
      return;
    }
    w.set('w4_g2_done');
    w.save();
    await carlo(w, 'Too close. Way, way too close.');
  },

  /** 1F: the flute. */
  async w4_flute_scene(w) {
    const s = scene(w);
    await carlo(w, 'Wait! Before you go!');
    await w.say('Carlo pulls a little wooden flute out of his pocket.');
    w.sfx('flute');
    w.emote('inventor', 'note', 2600);
    await w.wait(1200);
    const v = w.sprite('ow_viperwind', px(8), -10, 9000).setOrigin(0.5, 1);
    await w.camPan(8, 4, 500, 2);
    await w.tw({ targets: v, y: py(4), duration: 800, ease: 'Sine.easeOut' });
    v.play('ow_viperwind_idle');
    s.tweens.add({ targets: v, angle: { from: -6, to: 6 }, duration: 400, yoyo: true, repeat: 4 });
    w.sfx('flute');
    await w.wait(2800);
    v.stop().setFrame(4);
    await w.say('Viperwind sways and loops through the air to the music, like a ribbon in the wind.');
    await carlo(w, 'Why don\'t you like him?');
    await carlo(w, 'He\'s actually a pretty good guy, you know.');
    await carlo(w, 'I think he\'d make a great friend.');
    v.setFrame(0);
    await w.tw({ targets: v, x: px(w.player.x), y: py(w.player.y - 1) - 4, duration: 900, ease: 'Sine.easeInOut' });
    await w.wait(900);
    v.setFrame(1);
    w.sfx('hiss');
    await w.wait(400);
    v.setFrame(2);
    w.sfx('whoosh');
    await w.tw({ targets: v, x: px(8), y: py(12), alpha: 0, duration: 600, ease: 'Quad.easeIn' });
    v.destroy();
    await carlo(w, 'HEY!');
    await carlo(w, 'Where are you going?!');
    await w.wait(500);
    await carlo(w, 'He went outside! He always goes to the clearing in the forest when he\'s grumpy. Come on!');
    await w.camReturn(500);
    w.save();
  },

  async after_viperwind(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('The wind drops you in a heap in the grass. Viperwind circles the clearing overhead.');
      while (!(await w.confirm('Face Viperwind again?'))) await w.say('He keeps circling. He is waiting for you.');
      return w.startBattle('viperwind');
    }
    w.set('viperwind_beaten');
    w.save();
    const c = W4.clearing;
    const v = w.sprite('ow_viperwind', px(c.x), py(c.y), py(c.y)).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(c.x, c.y - 1, 600, 2);
    await w.wait(1000);
    v.setFrame(0);
    await w.wait(700);
    await w.say('Viperwind uncoils, looks you up and down, and is clearly not impressed.');
    w.sfx('whoosh');
    await w.tw({ targets: v, y: v.y - 100, alpha: 0, duration: 900, ease: 'Quad.easeIn' });
    v.destroy();
    await carlo(w, 'Well...');
    await carlo(w, 'I guess he still needs some time.');
    await w.camReturn(600);
    await carlo(w, 'Let\'s go back to the village. I don\'t really want to be out here on my own right now.');
    // the fight's last tremor shakes the vines off the hillside: the research facility
    await w.run('w4_lab_found');
  },
};

// ================================================================== the clearing (both routes)

const CLEARING: Record<string, Script> = {
  async w4_clearing(w) {
    const c = W4.clearing;
    const s = scene(w);
    const isA = route4(w.state) === 'A';
    const key = isA ? 'ow_wispmane' : 'ow_viperwind';
    w.music('menace');
    const g = w.sprite(key, px(c.x), py(c.y), py(c.y)).setOrigin(0.5, 1).setFlipX(true);
    await w.camPan(c.x, c.y - 1, 900, 1.8);
    await w.say(isA ? 'In the middle of the clearing, a great lion stands with its back to you.' : 'Something long and pale hangs in the air over the clearing, its back to you.');
    await w.wait(700);
    g.setFlipX(false);
    await w.wait(500);
    g.setFrame(1);
    w.sfx(isA ? 'roar' : 'hiss');
    w.shake(1200, isA ? 0.02 : 0.012);
    s.tweens.add({ targets: g, scale: 1.08, duration: 160, yoyo: true, repeat: 2 });
    if (isA) await old(w, 'Wispmane! Easy, now...');
    else await carlo(w, 'Viperwind! Wait!');
    await w.wait(500);
    await w.startBattle(isA ? 'wispmane' : 'viperwind');
  },
};

// ================================================================== helpers for the tree

const MELODY = [0, 2, 1, 3, 2, 0];
let mel = 0;
let g2Orig: number[] | null = null;
let g2Running = false;

async function sing(w: W, k: number) {
  const m = w.prop('mush' + k) as Phaser.GameObjects.Image | undefined;
  m?.setTexture(`w4_mush${k}_1`);
  w.sfx('mush' + k);
  if (m) scene(w).tweens.add({ targets: m, scaleY: 1.1, duration: 120, yoyo: true });
  await w.wait(520);
  m?.setTexture(`w4_mush${k}_0`);
}
async function playMelody(w: W) {
  await w.camPan(8, 6, 400);
  for (const k of MELODY) await sing(w, k);
  await w.camReturn(400);
}

/** The floor of 2F crumbles from the left; reach the far side before it reaches you. */
async function collapseRun(w: W): Promise<'safe' | 'fell'> {
  const s = scene(w);
  const Y0 = G2.run.y0 - 1;
  let front = 0.5;
  let t = 0;
  const done = new Set<number>();
  const r = await w.freeRun((dt) => {
    t += dt;
    // starts a little slower than walking, then catches up: running is safest
    front += (dt / 1000) * (3.4 + Math.min(1.6, t / 2500));
    const p = w.player;
    for (let x = 1; x < Math.min(G2.run.x1, Math.floor(front)); x++) {
      if (done.has(x)) continue;
      done.add(x);
      for (let y = Y0; y <= G2.run.y1; y++) {
        w.setGround(x, y, T.W4_GAP);
        const d = w.image('fx_dotM', px(x), py(y) - 8, 9000);
        s.tweens.add({ targets: d, y: d.y + 30, alpha: 0, duration: 400, onComplete: () => d.destroy() });
      }
      if (x % 3 === 0) {
        w.sfx('crash');
        w.shake(160, 0.004);
      }
    }
    if (p.x >= G2.run.x1) return 'safe';
    if (p.y >= Y0 && p.y <= G2.run.y1 && p.x < Math.floor(front)) return 'fell';
    return null;
  });
  return r as 'safe' | 'fell';
}

const TREE_GATES: Record<string, Gate> = {
  async w4_wreck_door(w) {
    if (f(w, 'w4_flown')) {
      await w.say('The airship is gone from the rocks. Only scraps of its old hull are left.');
      return false;
    }
    return true;
  },
  async w4_ladder_gate(w) {
    if (route4(w.state) === 'A') {
      await w.say('The rungs up the mast are rotten through. It isn\'t worth the climb any more.');
      return false;
    }
    if (f(w, 'w4_gas') && f(w, 'crow_beaten')) {
      await w.say('Nothing left up there but the empty nest.');
      return false;
    }
    return true;
  },
  async w4_g7_down() {
    return true;
  },
  async w4_g6_down(w) {
    if (f(w, 'squirrel_beaten')) return true;
    await w.say('Something big is moving up in the branches. It isn\'t letting you past.');
    return false;
  },
  async w4_g1_out() {
    return true;
  },
};

const SCRIPTS_B: Record<string, Script> = { ...SHIP, ...CASTLE, ...NEST, ...TREE, ...CLEARING };
export const W4_ROUTE_B = SCRIPTS_B;
export const W4_ROUTE_B_GATES = TREE_GATES;
export { panelStep };
void SH;
void camPx;
void pop;
void C_;
