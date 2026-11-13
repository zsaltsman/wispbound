import { stayHere } from './voyage';
import Phaser from 'phaser';
import { isSet, has, ITEMS } from './state';
import { staged, P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { SCRIPTS } from './registry';
import { roxieReunion } from './s_shops';
import { HULL_W, HULL_H, MASTS, MAST_TOP, SAILS } from '../gfx/artBoss';
import { C } from '../ui/ui';
import { W as SW, H as SH } from '../constants';

// The second half: the vision, the bell, fishing, the cellar, the Dutchman,
// the mayor's return and the ending. Plus the townsfolk who live indoors.

const PSY = 'MADAME ORACLE';
type Dir = 'up' | 'down' | 'left' | 'right';

// ------------------------------------------------------------------ the ghost ship, assembled for cutscenes

function buildShip(w: W, x: number, y: number, scale: number) {
  const s = w as unknown as Phaser.Scene;
  const c = s.add.container(x, y);
  const left = -HULL_W / 2;
  const top = -HULL_H + 10;
  const deck = top + 25;
  c.add(s.add.image(left, deck - (MAST_TOP + 25), 'b_masts').setOrigin(0, 0));
  SAILS.forEach(([mi, yi, sw], i) => {
    const m = MASTS[mi];
    const t = deck - m.h;
    const b = m.x >= 150 ? deck - 18 : deck;
    const yy = Math.round(t + (b - t) * m.yards[yi]);
    const sp = s.add.sprite(left + m.x, yy + 1, `b_sail${i}`).setOrigin((4 + sw / 2) / (sw + 8), 0);
    sp.play({ key: `b_sail${i}_wave`, startFrame: i % 3 });
    c.add(sp);
  });
  const cap = s.add.sprite(left + 180, top + 9, 'b_captain').setOrigin(0.5, 1);
  cap.play('b_captain_idle');
  c.add(cap);
  c.add(s.add.image(left, top, 'b_hull').setOrigin(0, 0));
  c.add(s.add.image(left, top, 'b_glow').setOrigin(0, 0).setAlpha(0.7));
  const foam = s.add.sprite(-120, -4, 'b_foam').setOrigin(0, 0);
  foam.play('b_foam_roll');
  c.add(foam);
  c.setScale(scale);
  c.setDepth(8000);
  w.worldLayer.add(c);
  return c;
}

/** Fog banks rolling over the sea for the arrival. */
function seaFog(w: W, cx: number, cy: number, n: number) {
  const list: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < n; i++) {
    const f = w.image('fx_fog' + (i % 3), cx + (Math.random() - 0.5) * 420, cy + (Math.random() - 0.5) * 200, 8500);
    f.setAlpha(0).setScale(1.5 + Math.random());
    w.tw({ targets: f, alpha: 0.55, duration: 2000 + Math.random() * 1500 });
    list.push(f);
  }
  return list;
}

// ================================================================== the vision

const VISION: Record<string, Script> = {
  async vision(w) {
    // "back again" only if you have actually been here (the Tickraith scene or an earlier visit)
    const met = isSet(w.state, 'psychic_scene') || isSet(w.state, 'psychic_met');
    w.set('psychic_met');
    if (met) await w.say('Back again? With a little friend, I see. How sweet. Revolting, but sweet.', PSY, { pitch: P_MID });
    else await w.say('Well, well. A visitor. With a little friend, I see. How sweet. Revolting, but sweet.', PSY, { pitch: P_MID });
    await w.say('You want to know where the mayor is, hm?', PSY, { pitch: P_MID });
    await w.emote('player', '...');
    await w.say('Well, I suppose I could take a look...', PSY, { pitch: P_MID });
    await w.say("That'll be $500.", PSY, { pitch: P_LOW });
    await w.wait(700);
    await w.emote('player', '...', 1000);
    await w.wait(400);
    await w.say("Ah, well. That's alright.", PSY, { pitch: P_MID });
    await w.say("Let's just say you owe me.", PSY, { pitch: P_LOW });
    // the crystal ball
    w.music(null);
    w.sfx('crystal');
    await w.camPan(6, 3, 900, 4);
    w.setDark(0.95, 800);
    w.extraLights.push({ x: 6 * 16 + 8, y: 3 * 16 + 6, r: 30 });
    await w.wait(900);
    const ship = buildShip(w, 6 * 16 + 8, 3 * 16 + 10, 0.07);
    ship.setAlpha(0);
    await w.tw({ targets: ship, alpha: 0.85, duration: 900 });
    w.sfx('ghost');
    await w.wait(700);
    await w.say('Inside the glass, a ship sails through black water. And from somewhere on board...');
    w.sfx('bark');
    await w.say('"WOOF."');
    w.sfx('bark');
    await w.wait(180);
    w.sfx('bark');
    await w.say('"WOOF WOOF."');
    await w.tw({ targets: ship, alpha: 0, duration: 700 });
    ship.destroy();
    w.extraLights.length = 0;
    w.setDark(w.map.dark, 600);
    await w.camReturn(500);
    await w.wait(400);
    w.faceTo('psychic', 'player');
    await w.say('...', PSY, { pitch: P_LOW });
    await w.wait(900);
    await w.say("I don't know if you knew this, but...", PSY, { pitch: P_LOW });
    await w.wait(800);
    w.shake(200, 0.004);
    await w.say('The mayor is a DOG.', PSY, { pitch: P_MID });
    await w.emote('player', '!', 900);
    await w.emote('follower', '!', 600);
    await w.say('Now me personally, I don\'t really care about the mayor.', PSY, { pitch: P_MID });
    await w.say("There's millions of other dogs in the world.", PSY, { pitch: P_MID });
    await w.say('Why should we give privileges to this one?', PSY, { pitch: P_MID });
    // somebody overheard
    w.sfx('slam');
    w.shake(300, 0.008);
    const fan = w.spawn('fan_burst', 'man_round', 6, 8, 'up');
    // around the table, right up beside Madame Oracle (clear of the dialogue box)
    await w.move('fan_burst', ['up', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'left'], 120);
    w.faceTo('fan_burst', 'psychic');
    await w.emote('fan_burst', 'anger');
    await w.say('HOW DARE YOU TALK BAD ABOUT THE MAYOR!', 'BERNARD', { pitch: P_HIGH });
    await w.say("YOU'RE JUST A NASTY OLD HA-", 'BERNARD', { pitch: P_HIGH });
    w.sfx('poof');
    w.flash(0.9);
    const puff = w.sprite('fx_puffL', fan.sprite.x, fan.sprite.y - 10, 9999);
    w.tw({ targets: puff, alpha: 0, scale: 2, duration: 600 }).then(() => puff.destroy());
    w.remove('fan_burst');
    w.set('bernard_poofed');
    await w.wait(900);
    await w.say('Anyways.', PSY, { pitch: P_LOW });
    await w.say("If you want to find the mayor, you're going to need a ship.", PSY, { pitch: P_MID });
    await w.wait(700);
    await w.say('So... you can have fun with that.', PSY, { pitch: P_MID });
    w.set('vision_done');
    w.music('psychic');
    w.sfx('quest');
  },
};

// ================================================================== the dock bell and the blocker

/**
 * The Bell Fish rings: it swings from its hook like a real bell (one strike, then a
 * slow swing that dies away with the note) and a few soft rings of sound spread
 * from it, in time with the chime. The post stays put; only the fish moves.
 */
async function ringBellFish(w: W, amp = 16, sfx = 'bell') {
  const post = w.prop('p_bellfish_bell');
  if (!post) return w.sfx(sfx);
  const s = w as unknown as Phaser.Scene;
  const hx = post.x + 8;
  const hy = post.y + 4;
  const fish = w.image('p_bellfish_only', hx, hy, post.depth + 0.1).setOrigin(8 / 16, 4 / 32);
  post.setTexture('p_bell_empty');
  const period = 760;
  const total = 2800;
  w.sfx(sfx);
  // ripples of sound, one per swing, fading with the note
  for (let i = 0; i < 3; i++) {
    s.time.delayedCall(i * (period / 2), () => {
      const g = s.add.graphics().setDepth(post.depth + 0.2);
      w.worldLayer.add(g);
      const st = { r: 4, a: 0.8 - i * 0.22 };
      s.tweens.add({
        targets: st,
        r: 26,
        a: 0,
        duration: 900,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          g.clear();
          g.lineStyle(1, C.white, st.a).strokeEllipse(hx, hy + 12, st.r * 2, st.r * 1.3);
        },
        onComplete: () => g.destroy(),
      });
    });
  }
  const t = { v: 0 };
  await w.tw({
    targets: t,
    v: total,
    duration: total,
    ease: 'Linear',
    onUpdate: () => fish.setAngle(amp * Math.exp(-t.v / 900) * Math.sin((t.v / period) * Math.PI * 2)),
  });
  fish.destroy();
  post.setTexture('p_bellfish_bell');
}

const DOCK: Record<string, Script> = {
  async dock_bell(w) {
    const st = w.state;
    if (!isSet(st, 'vision_done')) return w.say('An old bell at the very end of the dock. Its clapper is rusted solid. It has not rung in years.');
    if (!isSet(st, 'bell_replaced')) {
      if (has(st, 'bellfish')) {
        if (!(await w.confirm('Replace the rusty bell with the BELL FISH?'))) return;
        const old = w.prop('p_bell');
        w.sfx('bell_dud');
        if (old) {
          await w.tw({ targets: old, y: old.y + 6, duration: 200 });
          await w.tw({ targets: old, y: old.y + 40, alpha: 0, angle: 30, duration: 600, ease: 'Quad.easeIn' });
        }
        w.sfx('splash');
        await w.say('With a wrench and some swearing, the rusty old bell drops into the sea. Ploop.');
        w.take('bellfish');
        w.set('bell_replaced');
        w.refresh();
        const nb = w.prop('p_bellfish_bell');
        if (nb) {
          nb.setAlpha(0);
          await w.tw({ targets: nb, alpha: 1, duration: 400 });
        }
        await ringBellFish(w, 7, 'bellfish');
        await w.say('The BELL FISH hangs from the post, gleaming. It looks thrilled about this. Sort of.');
        return;
      }
      if (!isSet(st, 'bell_seen')) {
        w.sfx('bell_dud');
        await w.say('This bell is too rusty...');
        await w.say('It needs to be replaced.');
        w.set('bell_seen');
        w.sfx('quest');
        return;
      }
      w.sfx('bell_dud');
      return w.say('CLUNK. The rusty bell refuses. It needs replacing.');
    }
    if (isSet(st, 'dutchman_beaten')) return w.say('The Bell Fish snores gently. Its work is done.');
    // ring the bell
    if (!(await w.confirm('Ring the bell?'))) return;
    const n = (Number(w.flag('bell_rings')) || 0) + 1;
    w.set('bell_rings', n);
    w.shake(250, 0.002);
    await ringBellFish(w, 16, 'bell');
    // a lost fight (or a fight abandoned by closing the game) is a rematch
    if (isSet(st, 'dutchman_lost') || isSet(st, 'dutchman_arrived')) return SCRIPTS.arrival(w, true);
    if (n === 1) return w.say('...');
    if (n === 2) {
      await w.say('Nothing happened.');
      return w.say('Maybe you should try again?');
    }
    return SCRIPTS.arrival(w, false);
  },
  async blocker(w) {
    if (!isSet(w.state, 'bell_seen')) {
      await w.say("Nope. Nobody goes in. I'm waiting for the shopkeeper.", 'DUNCAN', { pitch: P_LOW });
      await w.say('He said he was going out for milk. That was four days ago. I am FIRST IN LINE.', 'DUNCAN', { pitch: P_LOW });
      await w.say("I've been first in line for four days. Do you know how hard it is to be first for four days?", 'DUNCAN', { pitch: P_LOW });
      return;
    }
    await w.say("Still waiting. Still first. Nobody is getting past-", 'DUNCAN', { pitch: P_LOW });
    w.sfx('door');
    await w.say('OPEN FOR BUSINESS! SORRY, I WAS IN THE BACK THE WHOLE TIME!', 'VOICE INSIDE', { pitch: P_MID });
    await w.emote('blocker', '!');
    await w.say('...The whole time?! FOUR DAYS?!', 'DUNCAN', { pitch: P_HIGH });
    await w.say("You know what. You go first. I need to sit down.", 'DUNCAN', { pitch: P_LOW });
    await w.move('blocker', ['right', 'right', 'down'], 200);
    w.face('blocker', 'left');
    w.set('blocker_moved');
    w.remove('blocker');
    w.refresh();
  },
  async blocker_side(w) {
    await w.say('Four days. FOUR DAYS. He was right there. I could have just KNOCKED.', 'DUNCAN', { pitch: P_LOW });
  },
};

// ================================================================== fishing shop + fishing

const KEEP = 'SHOPKEEP';
const FISHING: Record<string, Script> = {
  async shopkeep(w) {
    const st = w.state;
    if (has(st, 'bait')) {
      await w.say('BAIT! Beautiful, wriggling, disgusting bait!', KEEP, { pitch: P_MID });
      w.take('bait');
      w.set('bait_delivered');
      await w.say('Thanks! Here, take this.', KEEP, { pitch: P_MID });
      await w.give('rod');
      await w.say('Have fun.', KEEP, { pitch: P_MID });
      await w.say('Oh, and: fish from any shore on the island. Face the water and press SPACE. When the bobber jerks, reel in FAST.', KEEP, { pitch: P_MID });
      return;
    }
    if (has(st, 'rod') && !isSet(st, 'bell_replaced')) {
      if (has(st, 'bellfish')) return w.say("A BELL FISH! Don't let it ring in here, it'll shatter my jars. Go hang it on the dock!", KEEP, { pitch: P_HIGH });
      return w.say('No luck yet? Bell Fish are shy. Keep at it. About one in four bites, if the old stories are true.', KEEP, { pitch: P_MID });
    }
    if (isSet(st, 'bait_asked')) return w.say('Grocery store. Bait. I would go myself but I am terrified of that place.', KEEP, { pitch: P_MID });
    if (isSet(st, 'bell_seen')) {
      await w.say('Welcome to the Salty Hook! A new bell, you say? Ha! Nobody has made a dock bell on this island in fifty years.', KEEP, { pitch: P_MID });
      await w.say("But there's always the BELL FISH. It rings like a church bell every time it breathes. Hang one on the dock!", KEEP, { pitch: P_MID });
      await w.say("I'd lend you a rod, but I'm out of bait. Fetch me some from the grocery store?", KEEP, { pitch: P_MID });
      w.set('bait_asked');
      w.sfx('quest');
      return;
    }
    await w.say('Welcome to the Salty Hook. We sell hooks. Mostly salty.', KEEP, { pitch: P_MID });
  },
  async fishshop_rack(w) {
    await w.say('Dried fish on a rack. One of them winks. Probably a reflection.');
  },
  async fishshop_poster(w) {
    await w.say('A faded poster: HAVE YOU SEEN THIS FISH? It is a drawing of a bell with fins. REWARD: BRAGGING RIGHTS.');
  },
  async fish(w) {
    for (;;) {
      const got = await w.fishOnce();
      if (got === null) {
        await w.say('...It got away.');
      } else if (got === 'bellfish') {
        w.sfx('bellfish');
        w.flash(0.7);
        await w.give('bellfish', 1, '!!! A BELL FISH! It rings softly in your hands. DONNNG.');
        if (!isSet(w.state, 'first_bellfish')) {
          w.set('first_bellfish');
          await w.say('This is it. The perfect replacement for the rusty dock bell.');
          return;
        }
      } else {
        await w.give(got, 1, `You caught ${got === 'eel' ? 'an' : 'a'} ${ITEMS[got].name}!`);
      }
      if (!(await w.confirm('Keep fishing?'))) return;
    }
  },
};

// ================================================================== the cellar + the fisherman

const CELLAR: Record<string, Script> = {
  async enter_cellar(w) {
    if (isSet(w.state, 'cellar_visited')) return;
    w.set('cellar_visited');
    await w.wait(300);
    await w.say('The light switch does nothing. The air smells like a thousand forgotten lunches.');
    await w.say('Rusty shelves tower into the dark in every direction. Somewhere in here: bait.');
  },
  async cellar_door(w) {
    if (isSet(w.state, 'bait_cellar')) return;
    w.sfx('locked');
    await w.say('CELLAR. STAFF ONLY. A padlock, and a smell.');
  },
  async cellar_sign1(w) {
    await w.say('A sign, scrawled in marker: "IF YOU CAN READ THIS, YOU ARE LOST. -GARY"');
  },
  async cellar_sign2(w) {
    await w.say('"GARY AGAIN. STILL LOST. THE CANNED BEANS ARE NOT FOOD. THEY ARE LANDMARKS."');
  },
  async cellar_sign3(w) {
    await w.say('"THIS IS GARY\'S SIGN. GARY HAS ACCEPTED THE CELLAR. THE CELLAR HAS ACCEPTED GARY."');
  },
  async cellar_junk(w) {
    const lines = ['A can labeled SOUP? The question mark is printed on the label.', 'A box of rotten cabbages, arranged into a smiley face.', 'An old fridge. Something inside knocks twice. You do not knock back.', 'A pile of mops, braided together like a nest.'];
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async cellar_bait(w) {
    if (isSet(w.state, 'fisher_beaten')) {
      await w.say('The bucket of bait. Hard-won.');
      await w.give('bait');
      return;
    }
    await w.say('A bucket of bait! Old, but very much alive. Wriggling, even.');
    await w.say('As you reach for it...');
    w.sfx('step');
    await w.wait(400);
    w.sfx('step');
    await w.wait(400);
    w.sfx('step');
    w.set('fisher_appeared');
    w.refresh();
    w.playerLight = true;
    w.extraLights.push({ x: w.actor('fisherman')!.sprite.x, y: w.actor('fisherman')!.sprite.y - 10, r: 30 });
    w.faceTo('player', 'fisherman');
    await w.emote('fisherman', 'anger');
    w.shake(300, 0.008);
    await w.say('HEY! THAT\'S MY BAIT!', 'OLD GRUNDY', { pitch: P_LOW });
    await w.say("Six years I've been guarding that bucket in the dark! SIX YEARS!", 'OLD GRUNDY', { pitch: P_LOW });
    await w.say('Nobody touches Old Grundy\'s bait! Not the clerk! Not Gary! And not YOU!', 'OLD GRUNDY', { pitch: P_LOW });
    await w.say('Put up your dukes, kid! Or your spooks! Whatever that is!', 'OLD GRUNDY', { pitch: P_HIGH });
    w.extraLights.length = 0;
    await w.startBattle('fisherman');
  },
  async fisherman(w) {
    await SCRIPTS.cellar_bait(w);
  },
  async cellar_mark() {
    /* a marker tile for the fisherman's entrance */
  },
  async after_fisherman(w, result) {
    if (result === 'victory') {
      w.set('fisher_beaten');
      w.refresh();
      await w.wait(400);
      await w.say('Old Grundy sits down hard on a crate of rotten turnips.');
      await w.say("Fine. FINE. Take it. I didn't even like fishing. I just liked having something.", 'OLD GRUNDY', { pitch: P_LOW });
      await w.say('...Tell the shopkeep I said hi. He owes me a hat.', 'OLD GRUNDY', { pitch: P_LOW });
      w.sfx('quest');
      await w.give('bait');
      await w.say('Now, back to the fishing shop. And out of this smell.');
    } else {
      w.set('fisher_appeared', false);
      w.refresh();
      await w.wait(400);
      await w.say('You come to beside the bait bucket. Your companion nudges you awake.');
      await w.say('Old Grundy has stomped off into the dark... for now. The bait is still here.');
    }
  },
};

// ================================================================== the Flying Dutchman arrives

const ARRIVAL: Record<string, Script> = {
  async arrival(w, retry) {
    w.music(null);
    // the bell echoes across the island
    if (!retry) {
      for (let i = 0; i < 3; i++) {
        w.sfx('bell');
        w.flash(0.3 - i * 0.08);
        await w.wait(1100);
      }
    }
    w.sfx('heartbeat');
    w.setRain(100000);
    w.music('dread');
    await w.say(retry ? 'The sea goes still again. It remembers you.' : 'The bell stops. So does the wind.');
    if (!retry) await w.say('The waves fall flat. The ocean is as still as glass.');
    // the camera drifts out over the water
    await w.camPan(48, 82, retry ? 1500 : 3200, 1);
    w.setDark(0.75, 2500);
    const fog = seaFog(w, 48 * 16, 86 * 16, 14);
    await w.wait(retry ? 600 : 1800);
    const ship = buildShip(w, 48 * 16 + 8, 88 * 16, 0.32);
    ship.setAlpha(0);
    w.tw({ targets: ship, alpha: 0.35, duration: 1600 });
    await w.wait(1000);
    w.sfx('horn');
    await w.say('Far out in the fog, a silhouette. Masts. Sails like torn shrouds.');
    // it comes
    w.sfx('creak');
    w.tw({ targets: ship, y: 86 * 16, scale: 0.75, alpha: 1, duration: retry ? 3000 : 6500, ease: 'Sine.easeIn' });
    await w.camPan(48, 84, retry ? 2600 : 6000, 1.2);
    w.flash(0.9);
    w.sfx('thunder');
    await w.wait(300);
    if (!retry) {
      // the town panics
      await w.camPan(48, 42, 1800, 1.4);
      const runners: [string, string, number, number, Dir[]][] = [
        ['r1', 'woman', 44, 44, ['left', 'left', 'left', 'left', 'up', 'up', 'up', 'up', 'left', 'left']],
        ['r2', 'man_cap', 52, 42, ['right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up']],
        ['r3', 'old_man', 49, 45, ['down', 'down', 'right', 'right', 'right', 'right', 'right']],
        ['r4', 'kid_girl', 46, 37, ['left', 'left', 'left', 'left', 'left', 'left', 'down']],
      ];
      for (const [id, spr, x, y] of runners) w.spawn(id, spr, x, y, 'down');
      for (const [id] of runners) w.emote(id, '!', 600);
      w.sfx('scream');
      await w.wait(500);
      await Promise.all(runners.map(([id, , , , path]) => w.move(id, path, 120).then(() => w.remove(id))));
      for (let i = 0; i < 4; i++) {
        w.sfx('slam');
        w.shake(120, 0.004);
        await w.wait(260);
      }
      w.set('lights_out');
      // the lamps go out one by one
      w.lightsOff();
      for (let i = 0; i < 5; i++) {
        w.sfx('tickclock');
        await w.wait(220);
      }
      w.setDark(0.85, 1200);
      await w.wait(900);
      w.sfx('scream');
      await w.wait(1200);
      await w.camPan(48, 84, 2400, 1.2);
    }
    // it arrives at the dock
    await w.tw({ targets: ship, y: 84 * 16 + 4, duration: 1600, ease: 'Sine.easeOut' });
    w.shake(900, 0.01);
    w.sfx('boom');
    w.flash(0.8);
    w.sfx('thunder');
    await w.wait(600);
    await w.camPan(48, 80, 1500, 2.2);
    w.sfx('horn');
    await w.wait(800);
    await w.say('WHO...', 'THE CAPTAIN', { pitch: 200 });
    await w.say('RINGS...', 'THE CAPTAIN', { pitch: 180 });
    await w.say('MY BELL?', 'THE CAPTAIN', { pitch: 160 });
    fog.forEach((f) => f.destroy());
    w.set('dutchman_arrived');
    w.set('dutchman_lost', false);
    await w.startBattle('dutchman');
  },
  async after_dutchman(w, result) {
    if (result !== 'victory') {
      w.set('dutchman_lost');
      w.set('bell_rings', 2);
      w.lightsOff();
      w.setDark(0.8);
      w.music('dread');
      await w.wait(500);
      await w.say('You wash up on the dock, coughing seawater. Your companion is beside you, dripping.');
      await w.say('The Dutchman has slipped back into the fog. But the Bell Fish still hangs on its post, waiting.');
      await w.say('Ring the bell again when you are ready.');
      return;
    }
    w.set('dutchman_beaten');
    w.set('dutchman_lost', false);
    w.lightsOff();
    w.setDark(0.6);
    w.music(null);
    // the wreck, sinking beside the dock
    const ship = buildShip(w, 48 * 16 + 8, 84 * 16 + 4, 0.75);
    ship.setRotation(0.12);
    await w.camPan(48, 80, 600, 2);
    await w.wait(600);
    await w.say('The Flying Dutchman lists in the water, sails in tatters, its curse spent.');
    w.sfx('creak');
    await w.wait(500);
    // something jumps off the ship
    const dog = w.spawn('mayor_jump', 'mayor', 48, 82, 'up');
    dog.sprite.setPosition(48 * 16 + 8, 82 * 16);
    w.sfx('bark');
    await w.emote('mayor_jump', '!');
    await w.tw({ targets: dog.sprite, x: 48 * 16 + 8, y: 78 * 16 + 16, duration: 700, ease: 'Sine.easeOut' });
    dog.x = 48;
    dog.y = 78;
    w.sfx('step');
    w.shake(150, 0.003);
    await w.wait(300);
    dog.sprite.setFrame(9);
    w.sfx('bark');
    await w.wait(300);
    dog.sprite.setFrame(0);
    await w.say('A small dog lands on the dock. It is wearing a tiny top hat and a sash that reads MAYOR.');
    await w.wait(400);
    dog.sprite.setFrame(9);
    w.sfx('bark');
    await w.wait(250);
    w.sfx('bark');
    dog.sprite.setFrame(0);
    w.face('player', 'down');
    await w.emote('player', '!');
    // ...and it bolts
    w.hide('player', false);
    await w.camReturn(500);
    await w.move('mayor_jump', ['left', 'up', 'up', 'right', 'up', 'up', 'up', 'up', 'up', 'up'], 90);
    w.remove('mayor_jump');
    await w.say('...and the mayor sprints straight past you, up the dock, toward town.');
    await w.say('He did not say thank you. He is a dog.');
    // the ship sinks, the fog lifts
    w.sfx('wave');
    await w.camPan(48, 82, 800, 1.5);
    await w.tw({ targets: ship, y: ship.y + 120, alpha: 0, angle: 20, duration: 3000, ease: 'Quad.easeIn' });
    ship.destroy();
    w.sfx('splash');
    w.set('lights_out', false);
    w.lightsOn();
    w.setDark(0.3, 2500);
    await w.camReturn(800);
    w.set('mayor_ran');
    w.music('celebrate');
    await w.say("The fog is lifting. Lights blink on all over Hollowhaven. Somewhere, people are cheering.");
    await w.say("Better follow the mayor back to his office.");
  },
  async dock_return() {
    /* unused trigger */
  },
};

// ================================================================== the ending

export async function iris(w: W, sx: number, sy: number, ms: number) {
  const s = w as unknown as Phaser.Scene;
  const rt = w.ui(s.add.renderTexture(0, 0, SW, SH).setOrigin(0, 0).setDepth(95));
  if (!s.textures.exists('disc')) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(128, 128, 127, 0, Math.PI * 2);
    ctx.fill();
    s.textures.addCanvas('disc', cv);
  }
  const disc = s.make.image({ x: 0, y: 0, key: 'disc', add: false }).setOrigin(0.5);
  const st = { r: 260 };
  await new Promise<void>((res) =>
    s.tweens.add({
      targets: st,
      r: 0,
      duration: ms,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        rt.clear();
        rt.fill(C.black, 1);
        if (st.r > 0.5) {
          disc.setScale((st.r * 2) / 256);
          rt.erase(disc, sx, sy);
        }
      },
      onComplete: () => {
        rt.clear();
        rt.fill(C.black, 1);
        res();
      },
    })
  );
  return rt;
}

const ENDING: Record<string, Script> = {
  async ending(w) {
    // the whole town, packed into the office
    const guests: [string, string, number, number, Dir][] = [
      ['g_mayor', 'mayor', 6, 4, 'down'],
      ['g_mabel', 'old_lady', 2, 5, 'right'],
      ['g_gerald', 'gerald', 11, 5, 'left'],
      ['g_farmer', 'farmer', 3, 7, 'up'],
      ['g_psychic', 'psychic', 10, 7, 'up'],
      ['g_kid', 'kid_girl', 8, 6, 'up'],
      ['g_father', 'man_beard', 4, 6, 'up'],
      ['g_tom', 'old_man', 9, 4, 'left'],
      ['g_bernard', 'man_round', 1, 7, 'up'],
      ['g_maddie', 'maddie', 8, 7, 'up'],
      ['g_roxie', 'roxie', 7, 7, 'up'],
    ];
    for (const [id, spr, x, y, d] of guests) w.spawn(id, spr, x, y, d);
    w.face('assistant', 'right');
    w.music('celebrate');
    await w.wait(500);
    w.sfx('cheer');
    const confetti = (w as unknown as Phaser.Scene).add.particles(0, 0, 'fx_px', {
      x: { min: 16, max: 13 * 16 },
      y: 24,
      lifespan: 2200,
      speedY: { min: 20, max: 50 },
      speedX: { min: -15, max: 15 },
      frequency: 40,
      alpha: { start: 1, end: 0.4 },
    });
    confetti.setDepth(9000);
    w.worldLayer.add(confetti);
    await w.say('YOU DID IT!', 'MABEL', { pitch: P_HIGH });
    await w.say('THE MAYOR IS BACK!', 'FARMER HOLT', { pitch: P_LOW });
    await w.say('I KNEW SOMEONE WOULD FIND HIM!', 'LUCY', { pitch: P_HIGH });
    await w.say('WE CAN\'T THANK YOU ENOUGH!', 'GERALD', { pitch: P_LOW });
    await w.say('I was a teapot for three days. Totally worth it.', 'BERNARD', { pitch: P_HIGH });
    await w.say('You still owe me five hundred dollars.', PSY, { pitch: P_MID });
    // reunion
    await w.move('assistant', ['right'], 200);
    w.face('assistant', 'right');
    await w.emote('assistant', 'heart', 900);
    await w.say('MY CUTE BOY! YOU\'RE HOME!', 'ASSISTANT', { pitch: P_HIGH });
    w.sfx('bark');
    w.actor('g_mayor')!.sprite.setFrame(9);
    await w.wait(250);
    w.actor('g_mayor')!.sprite.setFrame(0);
    await w.say("I'll never let you out of my sight again! Not even for walkies!", 'ASSISTANT', { pitch: P_HIGH });
    if (w.state.creature) await w.emote('follower', 'heart', 900);
    await roxieReunion(w);
    w.sfx('cheer');
    await w.wait(600);
    // the mayor looks at you. at the camera.
    const dog = w.actor('g_mayor')!;
    w.face('g_mayor', 'down');
    await w.camPan(6, 4, 1400, 5);
    await w.wait(500);
    const cam = (w as unknown as Phaser.Scene).cameras.main;
    const sx = (dog.sprite.x - cam.worldView.x) * cam.zoom;
    const sy = (dog.sprite.y - 9 - cam.worldView.y) * cam.zoom;
    let barking = true;
    (async () => {
      while (barking) {
        dog.sprite.setFrame(9);
        w.sfx('bark');
        await w.wait(220);
        dog.sprite.setFrame(0);
        await w.wait(380 + Math.random() * 300);
      }
    })();
    w.music(null);
    const rt = await iris(w, sx, sy, 3600);
    barking = false;
    w.set('ending_done');
    w.save();
    await w.wait(1200);
    // the island is yours now: the black fades back into town, and you leave when you choose to
    stayHere(w, 'stay_w1');
    void rt;
  },
};

// ================================================================== townsfolk who live indoors

const FOLK: Record<string, Script> = {
  async mabel(w) {
    await staged(
      w,
      'MABEL',
      [
        ['Oh! A visitor! Sit, sit. Tea? The tea is cold. It has been cold since 1956.', 'The mayor used to visit every evening. He would sit by the fire and I would scratch behind his ears.', '...That is a normal thing to do for a mayor.'],
        ['Out on an errand for the assistant? That young man worries too much. Mostly about the mayor. Exclusively about the mayor.'],
        ["What a darling spirit! My cat doesn't like it. My cat doesn't like anything."],
        ['A dog? Well, of course he is a dog. Who did you think was eating my sausages?'],
        null,
        ['He came by last night for his ear-scratches. Everything is right with the world.'],
      ],
      P_HIGH
    );
  },
  async mabel_cat(w) {
    w.sfx('meow');
    await w.say('The cat stares at you, then deliberately knocks something off a shelf.');
  },
  async mabel_painting(w) {
    await w.say('A painting of Mabel as a young woman. Her eyes follow you. The painted cat\'s eyes follow you twice as hard.');
  },
  async mabel_books(w) {
    await w.say('KNITTING FOR GHOSTS. KNITTING WITH GHOSTS. KNITTING: A GHOST STORY.');
  },
  async mabel_fire(w) {
    await w.say('A crackling fire. It is the warmest thing in Hollowhaven.');
  },
  async mabel_cabinet(w) {
    if (has(w.state, 'tooth')) return w.say("Mabel's good china. Very fragile. Very judgmental.");
    await w.say("Mabel's good china... and in a teacup, a single tooth. Lucky?");
    await w.give('tooth');
  },
  async count(w) {
    await staged(
      w,
      'THE COUNT',
      [
        ['Good evening. I am THE COUNT. I count things. Lamps, mostly. There are nine.', 'The mayor? Vanished at a quarter past midnight. I counted the minutes. There have been many.'],
        ['You seek the spirits? How delightful. I would join you, but sunlight, garlic, and also I do not want to.'],
        ['One companion. One! Ah ah ah!'],
        ['A ship, a bell, a fish. Three! Three requirements! Ah ah ah!'],
        null,
        ['One mayor, returned! The best number!'],
      ],
      P_LOW
    );
  },
  async coffin_box(w) {
    await w.say('A coffin. Inside: a pillow, a nightlight, and a teddy bear named NIGHTWING.');
  },
  async coffin_box2(w) {
    await w.say('The guest coffin. A card on the lid: "NO SHOES IN THE COFFIN."');
  },
  async coffin_barrel(w) {
    await w.say('A barrel labeled TOMATO JUICE. Definitely tomato juice. Absolutely tomato juice.');
  },
  async doug(w) {
    if (!has(w.state, 'spoon')) {
      await w.say("Welcome to my spoon collection. Two hundred and twelve spoons. Every one is special.", 'DOUG', { pitch: P_MID });
      await w.say('This one is the most special. The Golden Spoon. I want you to have it. Spoons should be shared.', 'DOUG', { pitch: P_MID });
      await w.give('spoon');
      await w.say('Do not tell the psychic. She sold me a haunted spoon once. It was just a spoon. I loved it anyway.', 'DOUG', { pitch: P_MID });
      return;
    }
    await staged(w, 'DOUG', [['The mayor loved spoons. Or he loved what was ON spoons. Gravy, mostly.'], null, null, ['A dog mayor would explain the teeth marks on spoon number forty.']], P_MID);
  },
  async spoons_display(w) {
    await w.say('Spoons. Rows and rows of spoons. Some of them are definitely forks in disguise.');
  },
  async twins(w) {
    await staged(
      w,
      'THE TWINS',
      [
        ['"We think the mayor..."', '"...ran away to sea!"', '"...or got eaten by the sea!"', '"...same thing, really!"'],
        ['"The psychic gave us a fortune once..."', '"...it said we would be twins..."', '"...WE WERE ALREADY TWINS."'],
        ['"Your friend is so..."', '"...spooky!"', '"...cute!"', '"...spooky-cute!"'],
        ['"A dog..."', '"...we KNEW it..."', '"...we did NOT know it..."', '"...we suspected it."'],
      ],
      P_HIGH
    );
  },
  async twins_mirror(w) {
    await w.say('A mirror. Only one of the twins shows up in it. They have never discussed this.');
  },
  async bernard(w) {
    if (isSet(w.state, 'bernard_poofed') && !isSet(w.state, 'ending_done')) return;
    await staged(
      w,
      'BERNARD',
      [
        ["I am the mayor's BIGGEST fan. President of the fan club. Only member of the fan club.", 'I have a shrine. Want to see it? You are already looking at it.'],
        null,
        ['The mayor would LOVE your little friend. He loves anything that will chase a stick.'],
        null,
        null,
        ['I was a teapot for three days. Do not insult the mayor in front of a witch.'],
      ],
      P_HIGH
    );
  },
  async fan_shrine(w) {
    await w.say("A shrine to the mayor: candles, flowers, and in the center, a polished silver food bowl. Interesting choice.");
  },
  async fan_portraits(w) {
    await w.say('Portraits of the mayor. In every single one, he is either sleeping or eating.');
  },
  async fan_cabinet(w) {
    await w.say('Mayor merchandise: a mug, a flag, a squeaky toy shaped like a newspaper.');
  },
  async barkeep(w) {
    await staged(
      w,
      'BARKEEP',
      [
        ['Welcome to the Drowned Rat. Best pub on the island. Only pub on the island.', "The mayor used to come in here every night. Never drank a thing. Just sat under the stool and begged for crisps."],
        ['They say there are spirits all over town now. The farm, the mansion, the cave. Pick a friend, they say. Only one ever sticks.'],
        ["That's a proper spook you've got there. Drinks on the house. For the spook. You get water."],
        ["The old shanties say ring the dock bell three times and the Dutchman comes. Nobody's been daft enough to try it."],
        null,
        ["Drinks on the house! Even for the dog. ESPECIALLY for the dog."],
      ],
      P_LOW
    );
  },
  async drunk(w) {
    await w.say('*hic* I saw a ship in the fog once. Big one. With a... *hic* ...with a dog on it. A DOG. Captain was a skeleton. Dog was in charge.', 'OLD SALT', { pitch: P_LOW });
  },
  async sailor(w) {
    await staged(w, 'SAILOR', [['Sea\'s been wrong lately. Flat as a plate at midnight. Then the fog.'], null, null, ['The Bell Fish! My grandad hung one on his boat. Ship never sank. Grandad never slept again.']], P_MID);
  },
  async cardplayer(w) {
    await w.say("Care for a game? Rules are simple. I win.", 'CARD SHARK', { pitch: P_HIGH });
  },
  async tavern_barrel(w) {
    await w.say('A barrel of something called BILGE BREW. It is bubbling. It should not be bubbling.');
  },
  // crowd outside, after the Dutchman
  async c_1(w) {
    w.sfx('cheer');
    await w.say('YOU DID IT!', 'PRUDENCE', { pitch: P_HIGH });
  },
  async c_2(w) {
    w.sfx('cheer');
    await w.say('THE MAYOR IS BACK! He ran straight into his office and won\'t come out!', 'BRUNO', { pitch: P_LOW });
  },
  async c_3(w) {
    await w.say('I KNEW SOMEONE WOULD FIND HIM!', 'TIMMY', { pitch: P_HIGH });
  },
  async c_4(w) {
    await w.say("WE CAN'T THANK YOU ENOUGH! Go on in, everyone's waiting!", 'OLD TOM', { pitch: P_LOW });
  },
  async ending_trigger(w) {
    w.sfx('cheer');
  },
  async mayor_desk(w) {
    w.sfx('bark');
    const a = w.actor('mayor_desk');
    a?.sprite.setFrame(9);
    await w.wait(250);
    a?.sprite.setFrame(0);
    await w.say('The mayor wags his tail, signs a decree with his paw, and goes back to sleep.');
    if (!isSet(w.state, 'w2_started')) await SCRIPTS.w2_offer(w);
  },
  async end_mabel(w) {
    await w.say('Every evening from now on, he gets his ear-scratches. Mayoral decree.', 'MABEL', { pitch: P_HIGH });
  },
  async end_gerald(w) {
    await w.say('I gave away my clock, the mayor came home, and the sun is almost up. Best week of my life.', 'GERALD', { pitch: P_LOW });
  },
  async end_farmer(w) {
    await w.say("Come by the farm sometime. Pumpkin wants to say thank you. In her own way. Loudly.", 'FARMER HOLT', { pitch: P_LOW });
  },
  async end_psychic(w) {
    await w.say("Five hundred dollars. I'll take it in installments. I'll take it in fish.", PSY, { pitch: P_MID });
  },
};

export const END_SCRIPTS: Record<string, Script> = { ...VISION, ...DOCK, ...FISHING, ...CELLAR, ...ARRIVAL, ...ENDING, ...FOLK };
