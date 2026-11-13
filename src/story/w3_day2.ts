import Phaser from 'phaser';
import { isSet } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, cam, camPx, bars, titleCard, cut } from './w2_fx';
import { T } from '../world/tiles';
import { blockedStatic } from '../world/mapdef';
import { w3Stage } from './w3_state';
import { AYLA, AVA, MILO, P_AYLA, P_AVA, P_MILO, ayla, hideAll } from './w3_main';
import { BARREL_TAP, CLUB } from '../world/maps/w3maps';

// World 3, Day 2: the boy behind the Titans, Ayla joins you, Avalena behind the
// bar, the jug from the Great Barrel, the clinic, Mr. Grimsby's last shot, the
// window, Widowmaker, and a night in the club's hotel.

type Dir = 'up' | 'down' | 'left' | 'right';
const f = (w: W, k: string) => isSet(w.state, k);
const A = (w: W, s: string) => w.say(s, AVA, { pitch: P_AVA });
const Y = (w: W, s: string) => w.say(s, AYLA, { pitch: P_AYLA });
const M = (w: W, s: string) => w.say(s, MILO, { pitch: P_MILO });

/** A spark shower in the hideout (the welding torch). */
function sparks(w: W, x: number, y: number, n = 8) {
  const s = scene(w);
  for (let i = 0; i < n; i++) {
    const p = w.image('fx_px', x, y, 9800).setScale(2).setTint(i % 2 ? 0xffffff : 0xcccccc);
    s.tweens.add({ targets: p, x: x + (Math.random() - 0.5) * 40, y: y + Math.random() * 20 - 14, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => p.destroy() });
  }
}

/** Put a Titan in the hideout as a big sprite (frame 3 of each sheet is the battered look). */
function titan(w: W, key: string, x: number, y: number, frame: number, flip = false) {
  return w.sprite(key, x * 16 + 8, y * 16 + 16, y * 16 + 16).setOrigin(0.5, 1).setFrame(frame).setFlipX(flip);
}

/** Where you stand to watch the barrel: on the plaza, just south-west of it. */
const SPOT = { x: 80, y: 41 };
const RUN = 120;

/** Shortest walkable route between two tiles (cutscene walks follow real streets). */
export function pathTo(w: W, from: { x: number; y: number }, tx: number, ty: number): Dir[] {
  const m = w.map;
  const key = (x: number, y: number) => y * m.w + x;
  const prev = new Map<number, [number, Dir]>();
  const q: [number, number][] = [[from.x, from.y]];
  prev.set(key(from.x, from.y), [-1, 'down']);
  const V: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === tx && y === ty) break;
    for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
      const nx = x + V[d][0];
      const ny = y + V[d][1];
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || prev.has(key(nx, ny))) continue;
      if (!(nx === tx && ny === ty) && blockedStatic(m, nx, ny, w.state)) continue;
      prev.set(key(nx, ny), [key(x, y), d]);
      q.push([nx, ny]);
    }
  }
  const out: Dir[] = [];
  let k = key(tx, ty);
  if (!prev.has(k)) return out;
  while (prev.get(k)![0] >= 0) {
    const [pk, d] = prev.get(k)!;
    out.unshift(d);
    k = pk;
  }
  return out;
}

/** Booze spraying out of the barrel from a point, arcing off roughly one way. */
function spray(w: W, x: number, y: number, n: number, dirX: number, spread = 60) {
  const s = scene(w);
  for (let i = 0; i < n; i++) {
    const b = w.image(i % 2 ? 'bubble0' : 'bubble1', x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 9200);
    const tx = b.x + dirX * (20 + Math.random() * spread) + (Math.random() - 0.5) * 20;
    s.tweens.add({ targets: b, x: tx, duration: 650 + Math.random() * 300, ease: 'Sine.easeOut' });
    s.tweens.add({
      targets: b,
      y: b.y - 10 - Math.random() * 14,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => s.tweens.add({ targets: b, y: b.y + 50 + Math.random() * 40, alpha: 0, duration: 520, ease: 'Quad.easeIn', onComplete: () => b.destroy() }),
    });
  }
}

/**
 * Widowmaker breaks the Great Barrel: two blade strikes crack it open (the cracks
 * spread and booze sprays out of them), the third caves the top in. The top half
 * sags into the stump and topples into the street, staves fly, and what is left
 * standing is a wreck in a lake of booze.
 */
async function smashBarrel(w: W, wm: Phaser.GameObjects.Sprite) {
  const s = scene(w);
  const BX = 78 * 16;
  const BY = 24 * 16;
  const barrel = w.prop('b3_barrel');
  const depth = (barrel?.depth ?? 600) + 0.5;
  const cracks: Phaser.GameObjects.Image[] = [];
  const hit = (k: number) => {
    w.sfx('impact');
    w.sfx('crash');
    w.flash(0.3);
    w.shake(320, 0.009);
    const c = w.image(k === 0 ? 'b3_barrel_crack1' : 'b3_barrel_crack2', BX, BY, depth).setOrigin(0, 0).setAlpha(0);
    cracks.push(c);
    s.tweens.add({ targets: c, alpha: 1, duration: 120 });
    // the barrel (and its cracks) shudders from the blow
    for (const t of [barrel, ...cracks]) if (t) s.tweens.add({ targets: t, x: t.x - 3, duration: 50, yoyo: true, repeat: 2 });
    spray(w, BX + 104, BY + 94 + k * 30, k === 0 ? 8 : 16, 1, 50);
    if (k === 1) spray(w, BX + 98, BY + 150, 10, -0.4, 30);
  };
  for (let k = 0; k < 2; k++) {
    w.sfx('whoosh');
    await w.tw({ targets: wm, x: wm.x - 14, y: wm.y + 6, duration: 130, ease: 'Quad.easeIn' });
    wm.setFrame(0);
    hit(k);
    await w.wait(380);
    wm.setFrame(2);
    w.sfx('creak');
    await w.tw({ targets: wm, x: wm.x + 14, y: wm.y - 6, duration: 320, ease: 'Sine.easeOut' });
    await w.wait(k === 0 ? 350 : 200);
  }
  // the barrel groans under its own weight
  w.sfx('creak');
  await w.wait(400);
  // the final blow, all eight legs at once
  w.sfx('wail');
  await w.wait(250);
  w.sfx('whoosh');
  await w.tw({ targets: wm, x: wm.x - 22, y: wm.y + 6, duration: 150, ease: 'Quad.easeIn' });
  wm.setFrame(0);
  w.sfx('crash');
  w.sfx('boom');
  w.flash(0.7);
  w.shake(600, 0.014);
  // swap to the wreck, with the broken-off top still standing over it for a moment
  const top = w.image('b3_barrel_top', BX + 64, BY + 124, depth + 1).setOrigin(0.5, 1);
  cracks.forEach((c) => c.destroy());
  w.set('w3_barrel_gone');
  w.refresh();
  spray(w, BX + 64, BY + 150, 24, 1, 90);
  spray(w, BX + 64, BY + 150, 18, -1, 90);
  // it sags straight down into the stump, then topples over to the west
  await w.tw({ targets: top, y: top.y + 26, scaleY: 0.9, duration: 260, ease: 'Quad.easeIn' });
  w.sfx('crash');
  w.shake(260, 0.008);
  await w.tw({ targets: top, angle: -62, x: top.x - 44, y: top.y + 58, duration: 560, ease: 'Quad.easeIn' });
  // it hits the ground and bursts apart
  w.sfx('boom');
  w.sfx('wave');
  w.flash(0.5);
  w.shake(1200, 0.016);
  const gx = top.x;
  const gy = top.y;
  top.destroy();
  for (let i = 0; i < 12; i++) {
    const st = w.image('p3_stave', gx + (Math.random() - 0.5) * 50, gy - 20 - Math.random() * 30, depth + 2).setAngle(Math.random() * 360);
    const dx = (i % 2 ? 1 : -1) * (30 + Math.random() * 70);
    const land = BY + 196 + Math.random() * 24;
    s.tweens.add({ targets: st, x: st.x + dx, angle: st.angle + (Math.random() - 0.5) * 540, duration: 700, ease: 'Sine.easeOut' });
    s.tweens.add({
      targets: st,
      y: st.y - 30 - Math.random() * 30,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () =>
        s.tweens.add({
          targets: st,
          y: land,
          duration: 440,
          ease: 'Quad.easeIn',
          onComplete: () => s.tweens.add({ targets: st, alpha: 0, delay: 2200, duration: 600, onComplete: () => st.destroy() }),
        }),
    });
  }
  spray(w, gx, gy, 30, -1, 120);
  spray(w, gx, gy, 20, 1, 120);
  await flood(w);
  // it backs off the wreck to admire its work
  await w.tw({ targets: wm, x: wm.x + 16, duration: 500, ease: 'Sine.easeOut' });
}

const DAY2: Record<string, Script> = {
  // ---------------------------------------------------------------- the hideout, the first time
  async w3_villain1(w) {
    w.set('w3_day1_done');
    w.save();
    cut(w, 'w3_hideout', 10, 9, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    w.music('hideout');
    const sv = titan(w, 'ow_scorvex', 12, 6, 3);
    const boy = w.spawn('milo_h', 'milo', 8, 6, 'right');
    await camPx(w, 10 * 16, 6 * 16, 0, 2.4);
    await w.fade(false, 900);
    await w.wait(800);
    w.sfx('creak');
    await w.wait(600);
    await M(w, 'What happened, Scorvex?');
    await M(w, "You're all bruised up.");
    await w.wait(500);
    await M(w, 'You killed the bartender, right?');
    w.sfx('rev');
    sv.setFrame(2);
    await w.wait(600);
    sv.setFrame(3);
    await M(w, 'Good, good.');
    await w.wait(500);
    await M(w, "Let's get you fixed up.");
    await w.move('milo_h', ['right'], 300);
    for (let i = 0; i < 5; i++) {
      w.sfx(i % 2 ? 'hammer' : 'clank');
      sparks(w, sv.x - 24, sv.y - 30);
      await w.wait(320);
    }
    await w.wait(400);
    await M(w, 'Whoever did this to you did some serious damage.');
    w.face('milo_h', 'down');
    await w.wait(700);
    await M(w, 'Doesn\'t matter. Tomorrow is a new day.');
    await w.fade(true, 1000);
    void boy;
    await SCRIPTS.w3_morning2(w);
  },

  // ---------------------------------------------------------------- morning in the cave
  async w3_morning2(w) {
    w.set('w3_day2');
    w.set('w3_shop_closed');
    w.set('w3_ayla_packed');
    w.save();
    cut(w, 'w3_aylacave', 3, 3, 'down');
    hideAll(w, false);
    cam(w).resetFX();
    w.remove('ayla_home');
    const a = w.spawn('ayla_morning', 'ayla_pack', 7, 6, 'up');
    w.music('ayla');
    await titleCard(w, '', 'DAY 2', 1600, false);
    await w.wait(400);
    await w.emote('player', 'zzz', 600);
    w.face('player', 'down');
    await w.wait(400);
    w.faceTo('ayla_morning', 'player');
    await w.say("Ayla is already up. Every painting is off the walls, stacked into one enormous bag.");
    await Y(w, "I'm going to return all of this stuff to Avalena.");
    await Y(w, "I think you're right.");
    await Y(w, "I'm doing the right thing.");
    await w.wait(400);
    await Y(w, 'Come with me? Just in case she throws a paint pot at my head.');
    w.sfx('recruit');
    await w.say('AYLA JOINED YOU!');
    w.remove('ayla_morning');
    w.set('w3_ayla_joined');
    w.set('w3_ayla_follow');
    w.refresh();
    (w as any).spawnCompanion();
    void a;
    w.save();
  },

  // ---------------------------------------------------------------- Avalena, the new bartender
  async w3_avalena_bar(w) {
    const st = w3Stage(w.state);
    if (st === 'd2' && !f(w, 'w3_avalena_found')) return SCRIPTS.w3_avalena_found(w);
    if (st === 'd2') {
      if (f(w, 'w3_jug_full') && !f(w, 'w3_jug_done')) return SCRIPTS.w3_jug_back(w);
      if (f(w, 'w3_grimsby_met') && !f(w, 'w3_shot') && !f(w, 'w3_grimsby_done')) return SCRIPTS.w3_get_shot(w);
      if (f(w, 'w3_jug_quest') && !f(w, 'w3_jug_full')) return A(w, 'The tap is at the bottom of the barrel. You cannot miss it. It is the size of a house.');
      if (f(w, 'w3_shot')) return A(w, 'Go on. The clinic is down the corridor, past the hotel desk.');
      return A(w, 'Business is... business. Thanks for the help.');
    }
    if (st === 'n2') return A(w, 'Go. Get some sleep. Both of you. I will lock up.');
    if (st === 'd3') return SCRIPTS.w3_avalena_d3(w);
    return A(w, 'Thank you. For everything. Go see Ayla.');
  },
  async w3_avalena_found(w) {
    w.set('w3_avalena_found');
    w.music('club_quiet');
    await A(w, 'Oh. Hi.');
    await A(w, "Yeah. I'm the bartender now. Shop's closed. I needed a real job, and they needed someone behind the bar. After Sal...");
    await A(w, "The club only ever has one bartender on duty. Today that's me. Every day, probably.");
    await w.wait(500);
    w.faceTo('inventor', 'avalena_bar');
    await Y(w, 'Avalena... it was me. I took your paintings. All of them.');
    await Y(w, "I'm so sorry. They're all here. Every single one. You can have them back.");
    await w.wait(900);
    await A(w, '...');
    await A(w, 'Keep them.');
    await w.emote('inventor', '!', 600);
    await Y(w, 'What?');
    await A(w, "Nobody ever wanted them before. You liked them enough to steal them. Honestly? That's the best review I ever got.");
    await w.emote('inventor', 'heart', 900);
    await Y(w, 'REALLY?! Thank you! Thank you thank you thank you!');
    w.set('w3_art_kept');
    w.set('w3_thief_quest_done');
    await w.wait(400);
    await A(w, 'Now. On the house. What can I get you two?');
    w.sfx('clank');
    await w.wait(500);
    await A(w, '...Oh no.');
    w.set('w3_bar_dry');
    w.refresh();
    await A(w, "We're nearly out. Of everything. Last night nobody did the run to the barrel.");
    await A(w, "Every drop on this island comes out of the Great Barrel. Could you fill this for me? I can't leave the bar.");
    w.sfx('item');
    await w.give('jug', 1, 'GOT AN EMPTY JUG!');
    w.set('w3_jug_quest');
    w.save();
  },
  async w3_tap(w) {
    if (f(w, 'w3_barrel_gone')) return w.say('The tap hangs from a splintered stave. Nothing comes out of it but drips.');
    if (!f(w, 'w3_jug_quest') || f(w, 'w3_jug_full')) return w.say('The great brass tap of the Great Barrel. A sign: ONE JUG PER BUSINESS PER DAY. HONOR SYSTEM.');
    w.face('player', 'up');
    w.sfx('water');
    await w.say('You hold the jug under the tap and pull the lever. It glugs for a very long time.');
    w.take('jug');
    w.sfx('item');
    await w.give('jugfull', 1, 'THE JUG IS FULL!');
    w.set('w3_jug_full');
    w.refresh();
    w.save();
  },
  async w3_milo_barrel(w) {
    w.faceTo('w3_milo_barrel', 'player');
    await w.wait(400);
    await w.say('What a lovely day it is to be sober today...', 'STRANGE BOY', { pitch: P_MILO });
    w.face('w3_milo_barrel', 'up');
  },
  async w3_jug_back(w) {
    w.take('jugfull');
    w.sfx('quest');
    await A(w, 'You are a lifesaver. Several lives, probably.');
    w.set('w3_jug_done');
    w.set('w3_clinic_open');
    w.refresh();
    await A(w, "Oh, and the clinic called up. They're short-handed. If you're wandering, they could use a friendly face.");
    w.save();
  },

  // ---------------------------------------------------------------- the clinic
  async w3_grimsby(w) {
    const G = (s: string) => w.say(s, 'MR. GRIMSBY', { pitch: P_LOW });
    if (f(w, 'w3_grimsby_done')) return G('Six. Six today. A personal best.');
    if (f(w, 'w3_shot')) {
      w.take('shot');
      await w.say('You hand Mr. Grimsby the shot. He holds it up to the light with trembling fingers.');
      await G('Ahh... thank you, child... thank you...');
      w.sfx('item');
      await w.wait(600);
      await G('THANKS!');
      await G("That's the fifth shot I've had today!");
      await G('SUCKER!');
      w.sfx('cheer');
      await w.emote('inventor', 'anger', 700);
      await Y(w, "I can't believe I fell for that. I'm a professional liar!");
      // through the wall: the whole club, shouting
      await w.wait(400);
      w.sfx('scream');
      w.shake(300, 0.003);
      w.face('inventor', 'down');
      await w.emote('inventor', '!', 600);
      await Y(w, "...What's all that shouting? It's coming from the club!");
      await Y(w, "Come on, let's get back out there!");
      w.set('w3_grimsby_done');
      w.save();
      return;
    }
    await G("I've got one day left to live...");
    await G("The doctor says I can't have any more booze.");
    await G('Could you please get me just ONE more shot before I... croak?');
    w.set('w3_grimsby_met');
    w.save();
  },
  async w3_get_shot(w) {
    await A(w, 'One shot for Mr. Grimsby?');
    await A(w, "He's been 'dying' in that clinic since before I was born. But fine. It's his last day. Again.");
    await ayla(w, 'Are we sure this is a good idea? He does live in a hospital.');
    w.sfx('item');
    await w.give('shot', 1, 'GOT ONE SHOT!');
    w.set('w3_shot');
    w.save();
  },
  async w3_doctor(w) {
    const D = (s: string) => w.say(s, 'DR. FIZZ', { pitch: P_MID });
    const lines = [
      "Doctor's orders: plenty of rest, plenty of water, and then I'd say get back out there and have another drink, you've earned it.",
      'Sprained ankle from dancing? Dance on the other one. Medicine!',
      "Your liver? Oh, it's still in there. Mostly. Off you go, the night is young.",
    ];
    if (f(w, 'w3_resolved')) return D("We're... rethinking some of our advice. It turns out 'have another one' is not a treatment.");
    await D(lines[Math.floor(Math.random() * lines.length)]);
  },
  async w3_nurse(w) {
    await w.say(f(w, 'w3_resolved') ? 'Fewer patients this week. A lot fewer. I could get used to that.' : 'Take a number. We are always busy. It is a clinic inside a nightclub.', 'NURSE', { pitch: P_HIGH });
  },
  async w3_patient(w, id: string) {
    const L: Record<string, string> = {
      w3_pat1: 'I danced so hard my knees turned around. The doctor turned them back. Then he told me to go dancing.',
      w3_pat2: 'I fell asleep in the karaoke booth. For three days. I was still singing.',
      w3_pat3: '*HONK*. I swallowed a party horn. *HONK*. It is fine. *HONK*.',
      w3_pat4: 'I am waiting for my friend. He tried to drink a whole jug in one go. Again.',
      w3_pat5: "My head hurts. I don't know why. I can't remember anything after Tuesday.",
    };
    await w.say(L[id] ?? 'Ow.', 'PATIENT', { pitch: P_MID });
  },
  async w3_clinic_desk(w) {
    await w.say('A sign-in sheet. The column marked REASON FOR VISIT just says PARTY over and over.');
  },
  async w3_clinic_cabinet(w) {
    await w.say('A medicine cabinet. Painkillers, bandages, and a suspicious number of bottle openers.');
  },

  // ---------------------------------------------------------------- the window and Widowmaker
  async w3_club_enter_later(w) {
    if (f(w, 'w3_grimsby_done') && !f(w, 'w3_barrel_gone')) return SCRIPTS.w3_window_crowd(w);
    if (w3Stage(w.state) === 'd3') return SCRIPTS.w3_club_d3(w);
    if (w3Stage(w.state) === 'd2' && !f(w, 'q_w3_d2club')) {
      w.set('q_w3_d2club');
      await ayla(w, "It's so empty. Last night you couldn't move in here.");
    }
  },
  async w3_window_crowd(w) {
    w.music(null);
    const crowd: [string, number, number][] = [
      ['partier1', 33, 3],
      ['local3', 34, 3],
      ['tourist2', 35, 3],
      ['partier4', 36, 3],
      ['local4', 37, 3],
      ['partier6', 34, 4],
      ['partier2', 36, 4],
    ];
    crowd.forEach(([look, x, y], i) => w.spawn('wc' + i, look, x, y, 'up'));
    await w.wait(400);
    w.sfx('scream');
    await w.say('Everyone in the club is packed against the big window, shouting and pointing.', undefined);
    // to the window, to see for yourself
    // (the reception counter fills 35-38 on that row: stand at the end of the crowd instead)
    await w.move('player', pathTo(w, w.actor('player')!, 33, 4), 150);
    w.face('player', 'up');
    await w.wait(300);
    await w.say('WHAT IS THAT?!', 'PARTYGOER', { pitch: P_HIGH });
    await w.say("It's going for the barrel! IT'S GOING FOR THE BARREL!", 'REGULAR', { pitch: P_MID });
    // and everybody bolts for the doors, you with them
    w.sfx('scream');
    // they stream out of the front doors ahead of you, a little faster, one after another
    crowd.forEach((_, i) => {
      const a = w.actor('wc' + i);
      if (!a) return;
      void w
        .wait(i * 160)
        .then(() => w.move('wc' + i, pathTo(w, a, 21 + (i % 2), 28), 100))
        .then(() => w.remove('wc' + i));
    });
    w.faceTo('inventor', 'player');
    await Y(w, 'Come on!');
    await w.move('player', pathTo(w, w.actor('player')!, 22, 27), RUN);
    w.sfx('door');
    await w.move('player', ['down'], RUN);
    await w.fade(true, 300);
    crowd.forEach((_, i) => w.remove('wc' + i));
    await SCRIPTS.w3_widow_barrel(w);
  },
  async w3_widow_barrel(w) {
    // where everyone ends up: in a ring on the plaza in front of the barrel
    const mob: [string, number, number][] = [
      ['bouncer', 76, 40],
      ['local3', 78, 40],
      ['partier4', 83, 40],
      ['tourist', 85, 41],
      ['partier2', 87, 40],
    ];
    const spawnMob = () => mob.forEach(([look, x, y], i) => w.spawn('mob' + i, look, x, y, 'up'));
    let wm: Phaser.GameObjects.Sprite;

    if (f(w, 'w3_barrel_gone')) {
      // picked up again after a reload: straight to the standoff
      cut(w, 'w3_isl', SPOT.x, SPOT.y, 'up');
      hideAll(w, false);
      cam(w).resetFX();
      spawnMob();
      wm = w.sprite('ow_widow', 84 * 16 + 8, 38 * 16, 9100).setOrigin(0.5, 1);
      await w.fade(false, 500);
    } else {
      // out of the front doors of the club, the crowd scattering ahead of you
      cut(w, 'w3_isl', 50, 23, 'down');
      hideAll(w, false);
      cam(w).resetFX();
      spawnMob(); // (they're already down at the barrel, well ahead of you)
      const runners = ['partier1', 'local4', 'tourist2'];
      runners.forEach((look, i) => w.spawn('run' + i, look, 49 + (i % 2), 22, 'down'));
      await w.fade(false, 300);
      runners.forEach((_, i) => {
        const side: Dir = i === 1 ? 'left' : 'right';
        void w.move('run' + i, ['down', 'down', side, side, side, 'down', 'down'], 110).then(() => w.remove('run' + i));
      });
      await w.wait(300);
      // down the Strip to the barrel plaza (the camera follows you all the way)
      await w.move('player', pathTo(w, w.actor('player')!, SPOT.x, SPOT.y), RUN);
      w.face('player', 'up');
      await w.wait(250);
      w.face('inventor', 'up');
      // pull back: you, the crowd, the barrel, and the empty street to the east
      const remove = bars(w);
      await camPx(w, 84 * 16, 33 * 16, 1000, 1.05);
      w.sfx('rumble');
      w.shake(1400, 0.004);
      await w.wait(700);
      for (let i = 0; i < mob.length; i++) w.face('mob' + i, 'right');
      // the art faces left: it comes in from the east, head toward the barrel
      wm = w.sprite('ow_widow', 102 * 16, 33 * 16, 9100).setOrigin(0.5, 1);
      wm.play('ow_widow_walk');
      for (let i = 0; i < 12; i++) {
        w.sfx('tick');
        if (i % 2) w.shake(90, 0.002);
        await w.tw({ targets: wm, x: wm.x - 18, y: wm.y + (i % 2 ? 1 : -1), duration: 240, ease: 'Sine.easeInOut' });
      }
      wm.stop().setFrame(0);
      await w.wait(400);
      // in close on the barrel: it sizes it up, then rears
      await camPx(w, 84 * 16, 30 * 16, 900, 1.55);
      w.sfx('tick');
      await w.tw({ targets: wm, x: wm.x + 6, duration: 200, yoyo: true });
      wm.setFrame(2);
      w.sfx('wail');
      await w.tw({ targets: wm, y: wm.y - 6, duration: 300, ease: 'Quad.easeOut' });
      await w.wait(500);
      await w.say('A towering machine on eight bladed legs. It rears up over the Great Barrel.');
      await smashBarrel(w, wm);
      await w.wait(900);
      await w.say("The Great Barrel caves in. The island's only supply pours out across the plaza in a slow, golden flood.");
      await w.wait(500);
      await w.say('All over town, people just stand and stare.');
      await w.wait(600);
      // it climbs down off the wreck, toward the crowd
      wm.play('ow_widow_walk');
      await w.tw({ targets: wm, x: 84 * 16 + 8, y: 38 * 16, duration: 1300, ease: 'Sine.easeInOut' });
      wm.stop().setFrame(0);
      for (let i = 0; i < mob.length; i++) w.face('mob' + i, 'up');
      await remove();
    }
    // the standoff, framed on the crowd and the Titan
    await camPx(w, 82 * 16, 38 * 16, 800, 1.6);
    w.music('town_quiet');
    await w.say('THAT WAS ALL OF IT! ALL OF IT!', 'REGULAR', { pitch: P_MID });
    await w.say('GET OFF OUR ISLAND!', 'BOUNCER', { pitch: P_LOW });
    // they charge it; it swats them like flies
    for (let i = 0; i < mob.length; i++) {
      const a = w.actor('mob' + i);
      if (!a) continue;
      // it turns to meet each one (the art faces left; flip for the ones to its east)
      const east = a.sprite.x > wm.x;
      wm.setFlipX(east);
      w.sfx('swish');
      await w.tw({ targets: a.sprite, x: a.sprite.x + (east ? -10 : 10), y: a.sprite.y - 12, duration: 180 });
      wm.setFrame(2);
      w.sfx('impact');
      w.shake(200, 0.006);
      await w.tw({ targets: a.sprite, y: a.sprite.y + 40, x: a.sprite.x + (east ? 40 : -40), angle: east ? 90 : -90, duration: 380, ease: 'Quad.easeOut' });
      wm.setFrame(0);
      await w.wait(120);
    }
    wm.setFlipX(false);
    await w.wait(500);
    await w.say('Nobody can get near it.');
    await w.wait(400);
    w.faceTo('inventor', 'player');
    await Y(w, 'HEY!');
    await Y(w, 'YOU!');
    await Y(w, 'YOU BEAT SCORVEX!');
    await Y(w, "LET'S SEE WHAT YOU CAN DO ABOUT THIS ONE!");
    w.face('inventor', 'right');
    w.sfx('tick');
    await w.tw({ targets: wm, x: wm.x - 10, duration: 220, ease: 'Quad.easeIn' });
    wm.setFrame(2);
    w.sfx('wail');
    w.shake(500, 0.006);
    await w.wait(300);
    await w.say('Widowmaker turns all eight of its eyes on you.');
    mob.forEach((_, i) => w.remove('mob' + i));
    w.save();
    await w.startBattle('widowmaker');
  },
  async after_widowmaker(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You come round in a puddle of booze. Widowmaker is still standing over the wreck of the barrel.');
      while (!(await w.confirm('Fight Widowmaker again?'))) await w.say('It is not going anywhere. Neither is the island.');
      return w.startBattle('widowmaker');
    }
    w.set('w3_widow_beaten');
    w.save();
    const s = scene(w);
    // battered, still facing you (the art faces left); then it turns tail and flees east
    const wm = w.sprite('ow_widow', 82 * 16 + 8, 38 * 16, 9100).setOrigin(0.5, 1).setFrame(3);
    await w.camPan(82, 36, 600, 1.8);
    w.sfx('tick');
    await w.tw({ targets: wm, y: wm.y + 3, duration: 400, yoyo: true, ease: 'Sine.easeInOut' });
    await w.wait(400);
    w.sfx('clank');
    wm.setFlipX(true);
    await w.wait(250);
    w.sfx('swish');
    wm.setFrame(0).play('ow_widow_walk');
    await w.tw({ targets: wm, x: wm.x + 320, duration: 1400, ease: 'Quad.easeIn' });
    wm.stop();
    wm.destroy();
    await w.camReturn(600);
    await w.wait(400);
    w.faceTo('inventor', 'player');
    await Y(w, 'Wow...');
    await Y(w, 'You really are strong.');
    await Y(w, "Let's get out of here!");
    await w.fade(true, 600);
    // back at the club: rooms on the house
    cut(w, 'w3_club', 6, 7, 'up');
    cam(w).resetFX();
    const locals: [string, string, number, number][] = [
      ['l1', 'local3', 3, 8],
      ['l2', 'partier3', 9, 8],
    ];
    for (const [id, look, x, y] of locals) w.spawn(id, look, x, y, 'up');
    await w.fade(false, 500);
    await A(w, "You're alive. Both of you. Oh thank goodness.");
    await A(w, "Here. Hotel rooms, upstairs, on the house. Don't argue. Sleep.");
    w.sfx('item');
    await w.say('Nobody knows where those things came from.', 'REGULAR', { pitch: P_MID });
    await w.say("Forty years I've lived here. Nothing like this has ever happened. Ever.", 'OLD LOCAL', { pitch: P_LOW });
    await w.say("Why would anyone go after the barrel? It's... it's just a barrel...", 'REGULAR', { pitch: P_MID });
    w.set('w3_hotel_night');
    w.save();
    await w.fade(true, 800);
    for (const [id] of locals) w.remove(id);
    cut(w, 'w3_hotel', 14, 4, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    w.music('club_quiet');
    await w.fade(false, 600);
    await w.say('Two rooms, side by side. Through the wall you can hear Ayla humming, then snoring.');
    await w.fade(true, 1000);
    void s;
    await SCRIPTS.w3_villain2(w);
  },

  async w3_bed_player(w) {
    await w.say('Your room. The pillow has a mint on it, and a tiny paper party hat.');
  },
  async w3_bed_ayla(w) {
    await w.say("Ayla's room. Her enormous bag of paintings is propped against the bed like a second person.");
  },
  async w3_bed_any(w) {
    await w.say('A guest room. Someone has left a disco ball on the nightstand. Just a small one. For the room.');
  },
  async w3_ayla_hotel(w) {
    await Y(w, 'I have never slept in a real bed before. It is so soft it is frightening.');
  },
  async w3_guest(w) {
    await w.say(w3Stage(w.state) === 'd3' ? "I'm checking out. First time in eleven years." : 'I live here. In the hotel. In the club. Rent is cheaper than you would think.', 'HOTEL GUEST', { pitch: P_MID });
  },
};

/** The booze floods out across the plaza, tile by tile. */
async function flood(w: W) {
  const tiles: [number, number][] = [];
  for (let y = 36; y < 44; y++) for (let x = 70; x < 93; x++) tiles.push([x, y]);
  tiles.sort((a, b) => Math.hypot(a[0] - BARREL_TAP.x, a[1] - BARREL_TAP.y) - Math.hypot(b[0] - BARREL_TAP.x, b[1] - BARREL_TAP.y));
  let n = 0;
  for (const [x, y] of tiles) {
    const g = w.map.ground[y * w.map.w + x];
    if (g === T.PROMENADE || g === T.PROMENADE2 || g === T.ASPHALT || g === T.ASPHALT2 || g === T.SIDEWALK || g === T.GRASS || g === T.GRASS2) {
      if (Math.hypot(x - BARREL_TAP.x, y - BARREL_TAP.y) < 9 + Math.random() * 3) w.setGround(x, y, T.BOOZE);
    }
    if (++n % 12 === 0) await w.wait(20);
  }
}
export { flood as w3Flood };

export const W3_DAY2: Record<string, Script> = DAY2;

void Phaser;
void P_HIGH;
void P_LOW;
void CLUB;
