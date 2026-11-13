import Phaser from 'phaser';
import { isSet } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, cam, camPx, bars, titleCard, blackout, cut } from './w2_fx';
import { iris } from './s_endgame';
import { pickTitan } from './w3_pick';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { getCreature } from '../engine/creatures';
import { w3Stage } from './w3_state';
import { AYLA, AVA, MILO, P_AYLA, P_AVA, P_MILO, ayla, hideAll } from './w3_main';
import { CLUB } from '../world/maps/w3maps';

// World 3, Day 3 and the end: the plan on Milo's wall, the quiet town, the
// business research, Ironclad, the story of Milo's father, the town's vote, the
// young Titans, the final choice, and Ayla's last word.

type Dir = 'up' | 'down' | 'left' | 'right';
const f = (w: W, k: string) => isSet(w.state, k);
const A = (w: W, s: string) => w.say(s, AVA, { pitch: P_AVA });
const Y = (w: W, s: string) => w.say(s, AYLA, { pitch: P_AYLA });
const M = (w: W, s: string, p = P_MILO) => w.say(s, MILO, { pitch: p });
const BIZ = ['buffet', 'lobster', 'cafe', 'dough', 'froyo'] as const;
const BIZ_NAMES: Record<string, string> = {
  buffet: 'EAT LIKE PIG BUFFET',
  lobster: 'BLUE LOBSTER SEAFOOD',
  cafe: "LEX THE BEAR QUEEN'S CAFE",
  dough: 'THE FROSTED DOUGH SHACK',
  froyo: "MR. FROFRO'S FROYO",
};

/** A soft "memory" frame: a dotted vignette around the screen during the flashback. */
function memoryFrame(w: W) {
  const s = scene(w);
  const g = w.ui(s.add.graphics().setDepth(87));
  for (let i = 0; i < 18; i++) {
    g.fillStyle(C.black, 0.07 * (18 - i));
    g.fillRect(0, i, SW, 1);
    g.fillRect(0, SH - 1 - i, SW, 1);
    g.fillRect(i, 0, 1, SH);
    g.fillRect(SW - 1 - i, 0, 1, SH);
  }
  return g;
}

/** A plain caption on a black card ("ONE YEAR LATER"). */
async function caption(w: W, text: string, hold = 1500) {
  const s = scene(w);
  const black = blackout(w, 0, 93);
  const t = w.ui(txt(s, SW / 2, SH / 2 - 4, text, { color: C.light, origin: [0.5, 0.5] }).setDepth(94).setAlpha(0));
  await w.tw({ targets: black, alpha: 1, duration: 500 });
  await w.tw({ targets: t, alpha: 1, duration: 500 });
  await w.wait(hold);
  await w.tw({ targets: t, alpha: 0, duration: 400 });
  return async () => {
    await w.tw({ targets: black, alpha: 0, duration: 600 });
    black.destroy();
    t.destroy();
  };
}

const DAY3: Record<string, Script> = {
  // ---------------------------------------------------------------- the hideout, the second time
  async w3_villain2(w) {
    cut(w, 'w3_hideout', 10, 9, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    w.music('hideout');
    const s = scene(w);
    // the two beaten Titans either side of the room, both turned in toward the boy
    // (the art faces left: Scorvex on the west side is flipped, Widowmaker isn't)
    const sv = w.sprite('ow_scorvex', 5 * 16, 8 * 16, 8 * 16).setOrigin(0.5, 1).setFrame(3).setFlipX(true);
    const wm = w.sprite('ow_widow', 15 * 16, 8 * 16, 8 * 16).setOrigin(0.5, 1).setFrame(3);
    const ic = w.sprite('ow_ironclad', 10 * 16 + 8, 6 * 16, 6 * 16).setOrigin(0.5, 1).setFrame(0);
    w.spawn('milo_h', 'milo', 9, 2, 'up');
    await camPx(w, 10 * 16, 4 * 16, 0, 2);
    await w.fade(false, 900);
    await w.wait(700);
    await w.say('A list is pinned to the wall. A boy in a coat far too big for him reads it aloud.');
    await M(w, 'DAY 1: KILL THE BARTENDER.');
    w.sfx('quest');
    await M(w, 'DAY 2: DESTROY THE BOOZE SOURCE.');
    w.sfx('quest');
    await M(w, 'DAY 3...');
    await w.wait(900);
    await M(w, 'DESTROY...');
    await w.wait(600);
    await M(w, 'THE...');
    await w.wait(600);
    w.sfx('slam');
    w.shake(300, 0.005);
    await M(w, 'BAR!', P_HIGH);
    w.face('milo_h', 'down');
    await camPx(w, 10 * 16, 6 * 16, 900, 1.6);
    await M(w, 'How does that sound, crew?');
    w.sfx('cheer');
    await w.wait(300);
    await M(w, 'Ha... ha ha ha!');
    await w.wait(800);
    w.music('menace');
    await M(w, "Don't you understand why I'm doing this, you fools?", 700);
    await M(w, "I'M HELPING YOU!", 900);
    await M(w, "I'M HELPING ALL OF YOU!", 900);
    await M(w, "YOU JUST DON'T REALIZE IT!", 900);
    ic.setFrame(2);
    w.sfx('horn');
    w.shake(500, 0.006);
    await w.wait(900);
    await w.fade(true, 1000);
    void sv;
    void wm;
    void s;
    await SCRIPTS.w3_morning3(w);
  },

  // ---------------------------------------------------------------- the quiet third day
  async w3_morning3(w) {
    w.set('w3_day3');
    w.save();
    cut(w, 'w3_hotel', 14, 4, 'down');
    hideAll(w, false);
    w.hide('inventor', true);
    cam(w).resetFX();
    w.music('club_quiet');
    await titleCard(w, '', 'DAY 3', 1600, false);
    await w.wait(300);
    w.spawn('ayla_wake', 'ayla', 20, 7, 'down');
    await w.move('ayla_wake', ['down', 'down'], 260);
    w.faceTo('ayla_wake', 'player');
    await Y(w, 'Morning! I slept for eleven hours. Is that allowed?');
    w.remove('ayla_wake');
    w.hide('inventor', false);
    (w as any).spawnCompanion();
    w.save();
  },
  async w3_club_d3(w) {
    if (!f(w, 'q_w3_d3club')) {
      w.set('q_w3_d3club');
      await ayla(w, 'Nobody is here. Nobody at all.');
    }
  },
  async w3_avalena_d3(w) {
    if (!f(w, 'w3_research')) {
      await A(w, "Two customers all morning. One of them was lost.");
      await A(w, "People stopped coming. No barrel, no booze, no party. And no party, no club.");
      await A(w, "Maybe it's time we sold something else. Could you look around town and see what businesses are actually doing well?");
      await A(w, 'Maybe we need to start selling something different.');
      await ayla(w, 'I can help! I know everybody. Well. I know where everybody keeps their stuff. I mean... I can help!');
      w.set('w3_research');
      w.save();
      return;
    }
    if (f(w, 'w3_research_done')) return A(w, 'Donuts and froyo. In a nightclub. I love it. Now go, I have to make a menu.');
    const seen = BIZ.filter((k) => f(w, 'w3_seen_' + k)).length;
    if (seen < 2) return A(w, 'Have a look inside the shops on Food Row first. Count the customers, not the signs.');
    const pick = (q: string, from: string[]) => w.ask(q, [...from.map((k) => BIZ_NAMES[k]), 'NOT SURE YET'], AVA, { cancel: from.length });
    const a = await pick('Which business has the most customers?', [...BIZ]);
    if (a >= BIZ.length) return A(w, 'Take your time. Go and look again.');
    const rest = BIZ.filter((_, i) => i !== a);
    const b = await pick('And the second busiest?', rest);
    if (b >= rest.length) return A(w, 'Take your time. Go and look again.');
    const chosen = new Set([BIZ[a], rest[b]]);
    if (!(chosen.has('dough') && chosen.has('froyo'))) {
      await A(w, 'Hmm... are you sure? That place looked pretty empty when I walked past.');
      await A(w, 'Have another look. The busy ones have queues out the door.');
      return;
    }
    await A(w, "The donut shack and the froyo place! Of course. There's a queue down the street for both of them.");
    await A(w, "Okay. We stop selling booze we don't have, and start selling donuts and frozen yogurt. In a nightclub.");
    await w.emote('inventor', '!', 500);
    await Y(w, 'I can help!');
    await Y(w, 'I know a place where we could borrow some sto—');
    await A(w, 'NO.');
    await A(w, 'WE ARE NOT STEALING.');
    await w.emote('inventor', '...', 800);
    await Y(w, '...right. Buying. I meant buying.');
    w.set('w3_research_done');
    w.save();
  },

  // ---------------------------------------------------------------- the businesses
  async enter_w3_buffet(w) {
    if (!f(w, 'w3_research') || f(w, 'w3_seen_buffet')) return;
    w.set('w3_seen_buffet');
    await w.say('Rows and rows of steaming trays. One customer. Every other table is empty.');
  },
  async enter_w3_lobster(w) {
    if (!f(w, 'w3_research') || f(w, 'w3_seen_lobster')) return;
    w.set('w3_seen_lobster');
    await w.say('A lobster tank, nets on the walls, and one lonely diner pushing a shrimp around his plate.');
  },
  async enter_w3_cafe(w) {
    if (!f(w, 'w3_research') || f(w, 'w3_seen_cafe')) return;
    w.set('w3_seen_cafe');
    await w.say('A handful of customers, a bear in a crown behind the counter, and bear cubs. A lot of bear cubs.');
  },
  async enter_w3_dough(w) {
    if (!f(w, 'w3_research') || f(w, 'w3_seen_dough')) return;
    w.set('w3_seen_dough');
    await w.say('It is PACKED. The queue snakes right round the shop and out of the door.');
    await ayla(w, 'Okay, this place is doing great.');
  },
  async enter_w3_froyo(w) {
    if (!f(w, 'w3_research') || f(w, 'w3_seen_froyo')) return;
    w.set('w3_seen_froyo');
    await w.say('Every table full. Every machine whirring. People leaving with cups taller than their heads.');
  },

  // ---------------------------------------------------------------- IRONCLAD
  async w3_ironclad(w) {
    w.set('w3_iron_met');
    w.save();
    w.music(null);
    const s = scene(w);
    // set the whole square up out of sight first, so nobody pops in or slides into place
    await w.fade(true, 300);
    cut(w, 'w3_isl', 49, 24, 'down');
    hideAll(w, false);
    cam(w).resetFX();
    const remove = bars(w);
    const boy = w.spawn('milo_now', 'milo', 51, 27, 'up');
    // it waits at the bottom of the square, south-east of the club doors
    const ic = w.sprite('ow_ironclad', 59 * 16, 29 * 16, 9100).setOrigin(0.5, 1).setFlipX(true).setFrame(0);
    const town: [string, number, number][] = [
      ['avalena_bar', 44, 26],
      ['local3', 41, 25],
      ['partier3', 63, 23],
      ['tourist', 62, 25],
      ['guide', 42, 28],
    ];
    town.forEach(([look, x, y], i) => w.spawn('town' + i, look, x, y, 'down'));
    w.faceTo('milo_now', 'player');
    // a wide shot that holds all of it: the club front, you, the boy and the whole of
    // Ironclad, hammer and all
    await camPx(w, 53 * 16, 23 * 16, 0, 1.3);
    await w.fade(false, 600);
    w.sfx('rumble');
    w.shake(900, 0.006);
    await w.wait(900);
    await w.say('Something enormous is waiting in the square. And beside it, a boy in a coat far too big for him.');
    for (let i = 0; i < town.length; i++) w.faceTo('town' + i, 'milo_now');
    await M(w, 'ATTENTION, LOCALS!');
    await M(w, 'THE BAR WILL NOW BE CLOSED PERMANENTLY!');
    await M(w, "I'VE HAD ENOUGH OF THIS PLACE!");
    w.music('iron3');
    // it walks to the club: one heavy foot at a time, each one landing like a small earthquake
    const dust = (x: number, y: number) => {
      for (let k = 0; k < 6; k++) {
        const d = w.image(k % 2 ? 'fx_dot' : 'fx_dotM', x + (k - 2.5) * 5, y - 2, 9101);
        s.tweens.add({ targets: d, x: d.x + (k - 2.5) * 6, y: d.y - 4 - Math.random() * 5, alpha: 0, duration: 520 + Math.random() * 200, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
      }
    };
    for (let i = 0; i < 4; i++) {
      // lift: the foot comes up and the body leans into the stride
      ic.setFrame(i % 2 ? 6 : 5);
      w.sfx('creak');
      await w.tw({ targets: ic, x: ic.x - 10, y: ic.y - 18, duration: 300, ease: 'Sine.easeOut' });
      // plant: the weight comes down on it, sinking a little past where it lands
      await w.tw({ targets: ic, x: ic.x - 6, y: ic.y + 6, duration: 170, ease: 'Quad.easeIn' });
      ic.setFrame(0);
      w.sfx('boom');
      w.shake(380, 0.011);
      dust(ic.x + (i % 2 ? 10 : -10), ic.y);
      // the impact runs up through it: a short squash, then it straightens out of the dip
      await w.tw({ targets: ic, scaleY: 0.96, duration: 70, ease: 'Quad.easeOut' });
      await w.tw({ targets: ic, y: ic.y - 2, duration: 110, ease: 'Sine.easeOut' });
      await w.tw({ targets: ic, scaleY: 1, duration: 140, ease: 'Sine.easeOut' });
      // everyone flinches at each step
      if (i === 1) for (let k = 0; k < town.length; k++) w.emote('town' + k, '!', 500);
      await w.wait(320);
    }
    await w.wait(300);
    ic.setFrame(2);
    w.sfx('creak');
    await w.wait(500);
    w.face('inventor', 'right');
    await Y(w, 'WAIT!');
    w.faceTo('milo_now', 'inventor');
    await Y(w, "Please! Don't! People LIVE in there. Avalena works in there. It's the only thing this town has left!");
    await Y(w, "They don't deserve this. Nobody deserves this.");
    await M(w, "You don't know anything about what this town deserves.");
    await w.wait(500);
    await M(w, 'Ironclad.');
    w.sfx('whoosh');
    await w.tw({ targets: ic, y: ic.y + 3, duration: 90, ease: 'Quad.easeIn' });
    ic.setFrame(3);
    w.sfx('crash');
    w.sfx('boom');
    w.flash(1);
    w.shake(1600, 0.02);
    w.set('w3_club_smashed');
    w.refresh();
    for (let i = 0; i < 30; i++) {
      const d = w.image(i % 3 ? 'fx_dot' : 'fx_dotM', 55 * 16, 18 * 16, 9300);
      s.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 220, y: d.y + Math.random() * 140, alpha: 0, duration: 900 + Math.random() * 500, onComplete: () => d.destroy() });
    }
    w.sfx('scream');
    for (let i = 0; i < town.length; i++) w.emote('town' + i, '!', 600);
    await w.wait(900);
    await w.tw({ targets: ic, y: ic.y - 3, duration: 300, ease: 'Sine.easeOut' });
    ic.setFrame(0);
    await w.say('The front of Club Forever caves in. Glass and plaster rain down onto the square.');
    w.faceTo('inventor', 'player');
    await Y(w, 'Please...');
    await Y(w, "You're the only one who can stop him.");
    // you step up to the boy (and the thing behind him)
    w.face('player', 'down');
    await w.move('player', ['down'], 300);
    w.faceTo('player', 'milo_now');
    w.faceTo('milo_now', 'player');
    await M(w, 'Ha.');
    await M(w, "I'm sure you've got plenty of experience battling, kid.");
    await M(w, 'But tell me something...');
    await M(w, 'Have you ever gone up against a fellow Spirit Tamer?');
    w.sfx('horn');
    await remove();
    town.forEach((_, i) => w.remove('town' + i));
    void boy;
    w.save();
    await w.startBattle('ironclad');
  },
  async after_ironclad(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await M(w, 'Go home, kid. This is not your island.');
      while (!(await w.confirm('Fight Ironclad again?'))) await ayla(w, "Please. We can't just let him.");
      return w.startBattle('ironclad');
    }
    w.set('w3_iron_beaten');
    w.save();
    await SCRIPTS.w3_aftermath(w);
  },

  // ---------------------------------------------------------------- the boy, and his father
  async w3_aftermath(w) {
    const s = scene(w);
    cut(w, 'w3_isl', 50, 25, 'up');
    cam(w).resetFX();
    w.music(null);
    const ic = w.sprite('ow_ironclad', 55 * 16, 27 * 16, 9100).setOrigin(0.5, 1).setFrame(4).setFlipX(true).setAngle(-80);
    ic.y += 10;
    const boy = w.spawn('milo_now', 'milo', 51, 23, 'down');
    w.face('player', 'up');
    await w.camPan(52, 24, 800, 2.2);
    await w.wait(900);
    await w.say('Ironclad is down. It does not get up.');
    await w.wait(800);
    boy.sprite.y += 3;
    await w.emote('milo_now', '...', 1200);
    await w.say('The boy falls to his knees.');
    await w.wait(900);
    await w.emote('milo_now', 'tear', 1200);
    await M(w, 'I...', 640);
    await w.wait(900);
    await M(w, 'I failed you.', 640);
    await w.wait(1400);
    w.music('memory');
    await M(w, "You want to know why? Fine. You can know why.", 700);
    await w.fade(true, 1400);
    void ic;
    void s;
    await SCRIPTS.w3_memories(w);
  },
  async w3_memories(w) {
    // ---- 1. how it was
    const close = await caption(w, 'SEVEN YEARS AGO', 1600);
    cut(w, 'w3_memhome', 9, 8, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    const kid = w.spawn('kid', 'milo_kid', 4, 6, 'right');
    const dad = w.spawn('dad', 'milo_dad', 8, 5, 'left');
    await camPx(w, 6 * 16 + 8, 6 * 16, 0, 2.6);
    const frame = memoryFrame(w);
    await close();
    w.music('memory');
    await w.wait(600);
    await w.move('kid', ['right', 'right', 'right'], 230);
    await w.emote('kid', 'heart', 700);
    // up he goes: Dad swings him round
    w.sfx('cheer');
    await w.tw({ targets: kid.sprite, y: kid.sprite.y - 14, duration: 300, ease: 'Quad.easeOut' });
    await w.tw({ targets: kid.sprite, angle: 360, duration: 700 });
    kid.sprite.setAngle(0);
    await w.tw({ targets: kid.sprite, y: kid.sprite.y + 14, duration: 300, ease: 'Bounce.easeOut' });
    await w.emote('dad', 'heart', 700);
    await M(w, "He was my hero. He made pancakes shaped like the island. He taught me to whistle. He was the funniest person I ever knew.", 700);
    // catch: a ball thrown back and forth
    await w.move('kid', ['left', 'left'], 230);
    w.face('kid', 'right');
    const ball = w.image('fx_dotM', dad.sprite.x, dad.sprite.y - 10, 9500).setScale(2);
    for (let i = 0; i < 4; i++) {
      const to = i % 2 ? dad.sprite : kid.sprite;
      w.sfx('swish');
      await w.tw({ targets: ball, x: to.x, duration: 420, ease: 'Sine.easeInOut' });
      await w.tw({ targets: ball, y: ball.y - 8, duration: 120, yoyo: true });
    }
    ball.destroy();
    await w.wait(500);
    await w.say("Son, I'm just going to pop down to the club after work. Just the one.", 'DAD', { pitch: P_LOW });
    await w.move('dad', ['down', 'down', 'left', 'left', 'down', 'down'], 260);
    w.remove('dad');
    w.sfx('door');
    w.face('kid', 'down');
    await w.wait(600);
    await M(w, 'Just the one.', 700);
    await w.wait(800);

    // ---- 2. later and later
    w.music('memory_sad');
    let next = await caption(w, 'A YEAR LATER', 1400);
    w.setDark(0.7);
    kid.x = 5;
    kid.y = 7;
    kid.place();
    kid.face('down');
    await next();
    w.sfx('tickclock');
    await w.wait(900);
    w.sfx('tickclock');
    await w.emote('kid', 'zzz', 800);
    w.sfx('door');
    const dad2 = w.spawn('dad2', 'milo_dad', 5, 8, 'up');
    await w.wait(300);
    w.face('kid', 'down');
    await w.emote('kid', '!', 500);
    await w.say('Dad! I drew you something! It is the two of us on the—', 'MILO, AGED NINE', { pitch: P_HIGH });
    await w.say('Not now, Milo.', 'DAD', { pitch: P_LOW });
    await w.move('dad2', ['right', 'up', 'up', 'up'], 380);
    w.remove('dad2');
    await w.emote('kid', '...', 1000);
    await M(w, 'He started going every night. Then he started going in the afternoons. He stopped laughing. He got mean. Not all at once. Just a bit more every week.', 700);
    await w.wait(600);
    next = await caption(w, 'THREE YEARS LATER', 1400);
    w.setDark(0.35);
    const sick = w.spawn('sick', 'milo_dad_sick', 8, 5, 'down');
    kid.x = 7;
    kid.y = 8;
    kid.place();
    kid.face('up');
    await next();
    await w.wait(500);
    w.sfx('creak');
    await w.tw({ targets: sick.sprite, y: sick.sprite.y + 1, duration: 200, yoyo: true, repeat: 3 });
    await w.say('*cough* *cough*', 'DAD', { pitch: 420 });
    // a glass of water, carried very carefully
    const cup = w.image('it_shot', kid.sprite.x, kid.sprite.y - 18, 9500);
    await w.move('kid', ['up', 'up'], 360);
    cup.setPosition(kid.sprite.x, kid.sprite.y - 18);
    await w.wait(300);
    cup.destroy();
    await w.say('Here, Dad. Water. The nurse said water.', 'MILO, AGED TWELVE', { pitch: 1000 });
    await w.wait(700);
    await w.say("...Thanks, kid.", 'DAD', { pitch: 420 });
    await w.wait(500);
    // he gets up to go out again, slowly
    await w.say('Dad, please stay home tonight. Please.', 'MILO, AGED TWELVE', { pitch: 1000 });
    await w.move('sick', ['left'], 700);
    await w.wait(500);
    await w.move('sick', ['down'], 700);
    await w.say('...Just one more.', 'DAD', { pitch: 420 });
    await w.move('sick', ['down', 'left', 'left', 'down'], 760);
    w.remove('sick');
    w.sfx('door');
    await w.wait(900);
    w.remove('kid');

    // ---- 3. the last shot
    next = await caption(w, 'THAT NIGHT', 1300);
    cut(w, 'w3_club', CLUB.bar.x, CLUB.bar.y + 3, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    for (const a of [...(w as any).actors.keys()]) if (String(a).startsWith('w3c_') || a === 'avalena_bar' || a === 'w3_dj' || a === 'w3_receptionist') w.hide(a, true);
    w.hide('sal', true);
    w.spawn('sal_then', 'sal', CLUB.bar.x, CLUB.bar.y, 'down');
    const dad3 = w.spawn('dad3', 'milo_dad_sick', CLUB.bar.x, CLUB.bar.y + 2, 'up');
    w.setDark(0.75);
    await camPx(w, CLUB.bar.x * 16 + 8, (CLUB.bar.y + 1) * 16, 0, 2.6);
    w.music(null);
    await next();
    await w.wait(900);
    await w.say('One more, Sal.', 'DAD', { pitch: 420 });
    await w.wait(600);
    await w.say('...just one more.', 'DAD', { pitch: 400 });
    await w.wait(1200);
    await w.emote('sal_then', '...', 1600);
    await w.wait(1000);
    await w.say('...Last one. Alright?', 'SAL', { pitch: P_LOW });
    w.sfx('item');
    // the glass, and the long slide across the counter
    const shot = w.image('it_shot', CLUB.bar.x * 16 + 8, (CLUB.bar.y + 1) * 16 + 2, 9600).setScale(1.4);
    await camPx(w, shot.x, shot.y, 1400, 4.5);
    await w.wait(900);
    w.sfx('swish');
    await w.tw({ targets: shot, y: shot.y + 12, duration: 1800, ease: 'Sine.easeOut' });
    await w.wait(1500);
    shot.destroy();
    await w.wait(800);
    await w.fade(true, 1800);
    void dad3;

    // ---- 4. waiting
    cut(w, 'w3_memhome', 9, 8, 'up');
    hideAll(w, true);
    cam(w).resetFX();
    w.setDark(0.8);
    w.spawn('kid2', 'milo_kid', 5, 7, 'down');
    await camPx(w, 5 * 16 + 8, 7 * 16, 0, 3);
    await w.fade(false, 1400);
    for (let i = 0; i < 3; i++) {
      w.sfx('tickclock');
      await w.wait(1100);
    }
    await w.emote('kid2', 'zzz', 1400);
    await w.wait(1000);
    w.setDark(0.25, 2400);
    await w.wait(2600);
    w.face('kid2', 'left');
    await w.wait(600);
    w.face('kid2', 'right');
    await w.wait(800);
    await M(w, 'He never came home.', 620);
    await w.wait(1800);
    frame.destroy();
    await w.fade(true, 1600);
    await SCRIPTS.w3_reckoning(w);
  },

  // ---------------------------------------------------------------- the town decides
  async w3_reckoning(w) {
    cut(w, 'w3_isl', 50, 25, 'up');
    hideAll(w, false);
    cam(w).resetFX();
    const s = scene(w);
    const ic = w.sprite('ow_ironclad', 55 * 16, 27 * 16, 9100).setOrigin(0.5, 1).setFrame(4).setFlipX(true).setAngle(-80);
    ic.y += 10;
    const boy = w.spawn('milo_now', 'milo', 51, 23, 'down');
    boy.sprite.y += 3;
    await w.camPan(51, 24, 0, 2.2);
    await w.fade(false, 1200);
    w.music('grief');
    await M(w, 'I watched that place eat my dad alive. A drink at a time. And everybody just kept dancing.', 700);
    await M(w, "Nobody stopped it. Nobody even thought there was anything to stop. So I decided I would.", 700);
    await M(w, 'I learned to tame spirits. I found three that were strong enough. I made them stronger.', 700);
    await M(w, 'First the bartender. Then the barrel. Then the club. No more last shots for anybody.', 700);
    await M(w, 'I was SAVING you. All of you.', 760);
    await w.wait(1000);
    // the town has heard everything
    const town: [string, string, number, number, Dir][] = [
      ['t_ava', 'avalena_bar', 46, 25, 'right'],
      ['t_guide', 'guide', 45, 23, 'right'],
      ['t_bouncer', 'bouncer', 56, 23, 'left'],
      ['t_lin', 'lin', 57, 25, 'left'],
      ['t_dottie', 'dottie', 47, 27, 'up'],
      ['t_morty', 'morty', 55, 27, 'up'],
      ['t_frofro', 'frofro', 44, 26, 'right'],
      ['t_doc', 'doctor', 58, 24, 'left'],
    ];
    for (const [id, look, x, y, d] of town) w.spawn(id, look, x, y, d);
    await w.camPan(51, 25, 800, 1.6);
    await w.say('The town has come out. They heard all of it.');
    w.faceTo('inventor', 'milo_now');
    await w.emote('inventor', 'tear', 900);
    const T = (id: string, who: string, line: string, p = P_MID) => w.emote(id, '...', 300).then(() => w.say(line, who, { pitch: p }));
    await T('t_ava', AVA, "I'm sorry about your dad. I really am. But Sal didn't make anyone drink. And you killed him for it.", P_AVA);
    await T('t_bouncer', 'BOUNCER', 'You smashed up the only supply this island had. People got hurt. Real people.', P_LOW);
    await T('t_lin', 'LIN', "You attacked people in the street. We aren't the ones who did this to your father.", P_MID);
    await T('t_doc', 'DR. FIZZ', "...But he isn't entirely wrong about us, either. I've told a lot of people to have another one.", P_MID);
    await T('t_guide', 'TOUR GUIDE TEDDY', '"Come for the party, stay for the party." That was the slogan. That was the whole slogan.', P_HIGH);
    await T('t_morty', 'CAPTAIN MORTY', 'None of that makes what he did right.', P_LOW);
    await w.wait(600);
    await w.say('The town has to decide what to do with him.', 'BOUNCER', { pitch: P_LOW });
    await w.say('All in favour of sending him off the island, for good?', 'BOUNCER', { pitch: P_LOW });
    for (const id of ['t_bouncer', 't_lin', 't_morty', 't_dottie']) await w.emote(id, '!', 350);
    await w.say('All against?', 'BOUNCER', { pitch: P_LOW });
    for (const id of ['t_ava', 't_guide', 't_doc', 't_frofro']) await w.emote(id, '!', 350);
    await w.wait(600);
    await w.say("...Four and four. It's a tie.", 'BOUNCER', { pitch: P_LOW });
    for (const [id] of town) w.faceTo(id, 'player');
    w.faceTo('inventor', 'player');
    await w.wait(800);
    await w.say('Everyone turns to look at you.');
    await w.wait(500);
    // before you decide: his spirits
    w.faceTo('milo_now', 'player');
    await M(w, 'Wait. Before you say anything.', 700);
    await M(w, "If they send me away, I can't take them with me. Not on a little boat. Not where I'd be going.", 700);
    await M(w, "They weren't always like that. I made them like that. This is what they really are.", 700);
    w.sfx('horn');
    await w.wait(400);
    const kids: [string, number][] = [
      ['scorvlet', 49],
      ['widowling', 51],
      ['ironbud', 53],
    ];
    for (const [id, x] of kids) {
      const a = w.spawn('young_' + id, 'cr_' + id, x, 21, 'down');
      a.sprite.setAlpha(0);
      w.tw({ targets: a.sprite, alpha: 1, duration: 500 });
      w.sfx('poof');
      await w.wait(300);
    }
    await w.camPan(51, 21, 700, 2.4);
    await w.say('Three small spirits blink at you: a steel pup with a smoking tail, a clockwork spiderling, and a little knight dragging a hammer.');
    await M(w, "Scorvlet. Widowling. Ironbud. Pick one. I don't want them to be alone.", 700);
    const id = await pickTitan(w);
    const cr = getCreature(id);
    const blurb: Record<string, string> = {
      scorvlet: "Scorvlet puffs a smoke ring at you and wags its tail. The tail is on fire. It does not seem to mind.",
      widowling: 'Widowling clicks its eight little feet, winds the key on its back twice, and climbs onto your shoe.',
      ironbud: 'Ironbud salutes. Its helmet falls over its eyes. It salutes again.',
    };
    await w.say(blurb[id]);
    w.sfx('recruit');
    w.flash(0.5);
    w.state.extra = [...(w.state.extra ?? []).filter((x) => !['scorvlet', 'widowling', 'ironbud'].includes(x)), id];
    w.set('w3_titan', id);
    w.save();
    await w.say(`${cr.name} JOINED YOU!`, undefined, { portrait: 'cr_' + id });
    for (const [other] of kids) if (other !== id) w.tw({ targets: w.actor('young_' + other)!.sprite, alpha: 0, duration: 600 }).then(() => w.remove('young_' + other));
    await M(w, 'Look after it. Better than I did.', 700);
    w.remove('young_' + id);
    await w.camPan(51, 24, 700, 1.8);
    // the choice
    w.music(null);
    await w.wait(600);
    const c = await w.ask('What should happen to Milo?', ['BANISH HIM', 'LET HIM STAY']);
    if (c === 0) await SCRIPTS.w3_banish(w);
    else await SCRIPTS.w3_stay(w);
    void s;
    void ic;
  },
  async w3_banish(w) {
    w.set('w3_banished');
    w.save();
    await w.say("He goes.", 'BOUNCER', { pitch: P_LOW });
    w.music('grief');
    await w.wait(500);
    await M(w, '...Okay.', 640);
    await M(w, "I understand. I still think I was trying to help. But I hurt people. I know that.", 660);
    await M(w, 'I know that.', 640);
    await w.fade(true, 900);
    // the end of the dock at sunset, a little boat, everyone watching
    cut(w, 'w3_isl', 50, 74, 'down');
    cam(w).resetFX();
    w.setDark(0.35);
    const boy = w.spawn('milo_go', 'milo', 50, 77, 'down');
    for (const [id, look, x, y] of [['g_ava', 'avalena_bar', 48, 73], ['g_bouncer', 'bouncer', 52, 73], ['g_guide', 'guide', 47, 74]] as const) w.spawn(id, look, x, y, 'down');
    const boat = w.image('p2_boat0', 50 * 16 + 8, 79 * 16 + 4, 79 * 16);
    await camPx(w, 50 * 16 + 8, 77 * 16, 0, 2.2);
    await w.fade(false, 1000);
    await w.wait(900);
    await w.move('milo_go', ['down'], 600);
    boy.sprite.setDepth(80 * 16);
    await w.wait(500);
    w.faceTo('inventor', 'milo_go');
    await Y(w, '...Bye, Milo.');
    w.face('milo_go', 'up');
    await w.wait(700);
    w.face('milo_go', 'down');
    w.sfx('wave');
    await w.tw({ targets: [boat, boy.sprite], y: '+=120', alpha: 0, duration: 5200, ease: 'Sine.easeIn' });
    w.remove('milo_go');
    await w.wait(800);
    await w.say("Nobody says anything for a long time.");
    await SCRIPTS.w3_moving_on(w);
  },
  async w3_stay(w) {
    w.set('w3_stayed');
    w.save();
    await w.say('He stays. But not for free.', 'BOUNCER', { pitch: P_LOW });
    await A(w, "You broke it. You help fix it. The club, the barrel, the street. Every splinter.");
    await w.wait(500);
    await M(w, '...Yes.', 640);
    await M(w, "I'll fix it. All of it. I don't know how to fix the rest. But I'll fix that.", 660);
    w.sfx('item');
    await w.say('Avalena hands him a broom. He looks at it for a long time. Then he starts sweeping.');
    await w.move('milo_now', ['right', 'right'], 400);
    await w.emote('milo_now', '...', 800);
    await w.move('milo_now', ['left'], 400);
    await w.wait(600);
    w.faceTo('inventor', 'milo_now');
    await Y(w, "...He missed a bit.");
    await SCRIPTS.w3_moving_on(w);
  },
  async w3_moving_on(w) {
    w.set('w3_resolved');
    w.save();
    await w.fade(true, 900);
    cut(w, 'w3_isl', 49, 27, 'up');
    cam(w).resetFX();
    w.setDark(0.35);
    w.music('w3_end');
    const group: [string, string, number, number, Dir][] = [
      ['e_ava', 'avalena_bar', 47, 25, 'down'],
      ['e_guide', 'guide', 52, 25, 'down'],
      ['e_dottie', 'dottie', 45, 26, 'down'],
      ['e_frofro', 'frofro', 54, 26, 'down'],
      ['e_lex', 'lex', 56, 27, 'left'],
      ['e_cub', 'cub', 57, 28, 'left'],
    ];
    if (f(w, 'w3_stayed')) group.push(['e_milo', 'milo', 50, 24, 'down']);
    for (const [id, look, x, y, d] of group) w.spawn(id, look, x, y, d);
    await w.camPan(50, 26, 0, 1.8);
    await w.fade(false, 1200);
    await A(w, "No barrel. No Sal. A hole in the front of the club.");
    await w.say("We can't go back to how it was. Every night, all night. Maybe we shouldn't.", 'TOUR GUIDE TEDDY', { pitch: P_HIGH });
    await A(w, 'Club Forever is staying open. Donuts, froyo, music. Fewer last shots. A lot fewer.');
    await w.say('We will throw a party for the reopening. A small one. In the afternoon. With fruit.', 'MR. FROFRO', { pitch: P_MID });
    await w.wait(800);
    // Ayla
    w.faceTo('inventor', 'player');
    w.faceTo('player', 'inventor');
    await w.wait(500);
    await Y(w, 'Hey. Thanks. For following me. Even though it was super creepy.');
    await Y(w, "I'm not going to steal anymore. I mean it. I've got a whole cave full of art now. Legally. Mostly legally.");
    await Y(w, 'I promise.');
    await w.wait(1000);
    await w.emote('inventor', '...', 800);
    await Y(w, 'Well...');
    w.sfx('cheer');
    await Y(w, '*giggle* I probably won\'t.');
    await w.wait(900);
    w.set('w3_end');
    w.save();
    // the last shot of the island: the iris closes on Ayla
    const a = w.actor('inventor');
    if (a) {
      await w.camPan(a.x, a.y, 1400, 4);
      await w.wait(500);
      const c = cam(w);
      const sx = (a.sprite.x - c.worldView.x) * c.zoom;
      const sy = (a.sprite.y - 10 - c.worldView.y) * c.zoom;
      a.face('down');
      let hop = true;
      (async () => {
        while (hop) {
          await w.tw({ targets: a.sprite, y: a.sprite.y - 3, duration: 160, yoyo: true });
          await w.wait(420);
        }
      })();
      w.music(null);
      await iris(w, sx, sy, 3600);
      hop = false;
    } else await w.fade(true, 1600);
    await w.wait(1200);
    w.leave('credits', { creature: w.state.creature, world: 3 });
  },
};

export const W3_DAY3: Record<string, Script> = DAY3;
void Phaser;
void titleCard;
