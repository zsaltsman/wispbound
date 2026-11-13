import Phaser from 'phaser';
import type { Script, W } from './helpers';
import { scene, bars, pop, blackout, camPx } from './w2_fx';
import { C } from '../ui/ui';
import { T } from '../world/tiles';
import { P3 } from '../world/maps/w5maps';
import { f, px, py, G, gName, gSound, w2, crName, spiritRecovered, setBadge, glow, type Dir } from './w5_fx';

// The mess hall: a food fight that never really stops, ten prisoners with ten stories,
// a locked kitchen, a key thrown somewhere disgusting, your temple creature in a cage
// over the pot... and supper, when HE comes down to eat.

const MESS = ['m_chef', 'm_twins', 'm_skel', 'm_ghost', 'm_imp', 'm_lady', 'm_big', 'm_quiet', 'm_old', 'm_rat'];

// ------------------------------------------------------------------ the food fight

function throwFood(w: W) {
  const s = scene(w);
  const here = MESS.filter((id) => w.actor(id) && !w.actor(id)!.hidden);
  if (here.length < 2) return;
  const a = w.actor(Phaser.Utils.Array.GetRandom(here))!;
  const atYou = Math.random() < 0.12;
  const b = atYou ? w.player : w.actor(Phaser.Utils.Array.GetRandom(here.filter((id) => w.actor(id) !== a)))!;
  if (!b) return;
  const x0 = a.sprite.x;
  const y0 = a.sprite.y - 12;
  const x1 = b.sprite.x + Phaser.Math.Between(-4, 4);
  const y1 = b.sprite.y - 10;
  const dist = Phaser.Math.Distance.Between(x0, y0, x1, y1);
  if (dist > 200) return;
  const food = s.add.image(x0, y0, 'p5_food' + Phaser.Math.Between(0, 3)).setDepth(9500);
  w.worldLayer.add(food);
  const t = { k: 0 };
  s.tweens.add({
    targets: t,
    k: 1,
    duration: 300 + dist * 2.4,
    onUpdate: () => {
      food.x = x0 + (x1 - x0) * t.k;
      food.y = y0 + (y1 - y0) * t.k - Math.sin(t.k * Math.PI) * (14 + dist * 0.18);
      food.rotation += 0.25;
    },
    onComplete: () => {
      food.destroy();
      if (atYou) {
        w.sfx('splash');
        pop(w, x1, y1 - 10, 'SPLAT!', C.white, 700);
        return;
      }
      if (Math.random() < 0.4) w.sfx('splash');
      if (Math.random() < 0.35) {
        const who = MESS.find((id) => w.actor(id) === b);
        if (who) void w.emote(who, Math.random() < 0.5 ? 'anger' : 'note', 600);
      }
    },
  });
}

function foodFight(w: W) {
  let t = 0;
  w.onTick = (dt) => {
    t += dt;
    if (t < 650) return;
    t = Math.random() * 250;
    throwFood(w);
  };
}

// ------------------------------------------------------------------ ten prisoners

type Lines = { who: string; pitch: number; a: string[]; b?: string[] };
const TALK: Record<string, Lines> = {
  m_chef: {
    who: 'FORMER CHEF',
    pitch: 760,
    a: ['I was a real chef once. Three stars.', "Then I told HIM the soup needed salt. That's why I'm in here.", 'Never tell a man in a hood his soup needs salt.'],
    b: ['They cook in that kitchen with the door locked. Afraid we\'ll steal the recipe. THE RECIPE IS SLOP.'],
  },
  m_twins: {
    who: 'TWINS',
    pitch: 1000,
    a: ["We've been in here forty years.", '...Thirty-nine. You always round up.', 'You always round DOWN.'],
    b: ['We counted the food fights once. It is one. It has never stopped.'],
  },
  m_skel: {
    who: 'SKELETON',
    pitch: 420,
    a: ["They say he was a person once. Before the hood.", 'They say if you look under it, there\'s nothing there. Just more hood.', "They say a lot of things. I mostly say 'ow'. Someone keeps throwing beans at my ribs."],
  },
  m_ghost: {
    who: 'GHOST',
    pitch: 1180,
    a: ['They bring spirits in here in cages. Strong ones. The guards upstairs fight with them. For fun.', 'They do something to them first. Make them bigger. Angrier.', 'When they bring them back down... the poor things can hardly lift their heads.'],
  },
  m_imp: {
    who: 'IMP',
    pitch: 1350,
    a: ["The guards upstairs? Ha! They can't see anything that isn't right in front of their noses.", 'Walk behind them, hide behind a crate - they\'ll never know.', "Walk in FRONT of them, though... well. Then you're back here for supper."],
  },
  m_lady: {
    who: 'OLD LADY',
    pitch: 880,
    a: ['The top floor. HIGH SECURITY. He keeps just one prisoner up there.', 'The lock has three wheels. Nobody knows the numbers. All of them, anyway.', "Staff forget things, dear. They write them down. On boards. On walls. On desks."],
  },
  m_big: {
    who: 'BIG LOU',
    pitch: 480,
    a: ['DUCK!', '...Ha! Missed you. This is the only fun anybody gets in here. Grab a potato.'],
    b: ['FOOD FIGHT! FOOD FIGHT! IT IS ALWAYS FOOD FIGHT!'],
  },
  m_quiet: {
    who: 'QUIET ONE',
    pitch: 640,
    a: ['...', 'The clock. Every night at eight it stops ticking. Just for a second.', 'Like it\'s holding its breath.'],
  },
  m_old: {
    who: 'OLD-TIMER',
    pitch: 540,
    a: ["Supper's at eight. Always eight.", "And once in a while, at supper... HE comes down in that elevator.", "Don't stand in the middle of the room when he does. Don't stand anywhere."],
  },
  m_rat: {
    who: 'WEASEL',
    pitch: 1240,
    a: ["Looking for something? Everybody in here's looking for something.", "The kitchen? It's locked. Cook threw a tantrum and the key went flying."],
  },
};

const MESS_TALK: Record<string, Script> = {
  async p3_talk(w, id: string) {
    const l = TALK[id];
    if (!l) return;
    w.faceTo(id, 'player');
    const seen = f(w, 'w5_t_' + id);
    w.set('w5_t_' + id);
    const lines = seen && l.b ? l.b : l.a;
    for (const line of lines) await w.say(line, l.who, { pitch: l.pitch });
    // the key: two of them argue about where it went
    if ((id === 'm_rat' || id === 'm_big') && f(w, 'w5_kitchen_seen') && !f(w, 'w5_key_hint')) await keyHint(w);
    // everyone else sends you to the one who hears everything
    else if (f(w, 'w5_kitchen_seen') && !f(w, 'w5_key_hint')) {
      await w.say('The kitchen key? Ask WEASEL. The skinny one, leaning on the wall by the kitchen door. He hears everything.', l.who, { pitch: l.pitch });
      w.emote('m_rat', '!', 1200);
    }
  },

  decorate_p_mess(w) {
    setBadge(w, null);
    if (f(w, 'w5_kitchen_open')) w.setGround(P3.door.x, P3.door.y, T.W5_KITCHEN);
    if (!f(w, 'w5_got2')) {
      const c = w.spawn('cage_cr', 'raw:ch_mini_' + w2(w), P3.cage.x - 1, P3.cage.y, 'down');
      c.sprite.y -= 6;
    }
    if (!f(w, 'w5_massacre')) foodFight(w);
    return Promise.resolve();
  },

  async p3_door(w) {
    if (f(w, 'w5_kitchen_open')) return;
    if (w.has('k_key')) {
      w.sfx('unlock');
      await w.say('You turn the kitchen key. It is still sticky. The heavy door swings open.');
      w.take('k_key');
      w.set('w5_kitchen_open');
      w.setGround(P3.door.x, P3.door.y, T.W5_KITCHEN);
      w.sfx('door');
      w.refresh();
      w.save();
      return;
    }
    w.sfx('locked');
    await w.say('A heavy iron door: KITCHEN. STAFF ONLY. Locked.');
    if (!f(w, 'w5_kitchen_seen')) {
      w.set('w5_kitchen_seen');
      w.sfx('cry');
      await w.wait(400);
      await w.say(`Through the keyhole: steam, a huge pot... and a small, familiar cry. ${crName(w2(w))}!`);
      w.emote(G, '!', 900);
      gSound(w);
      await w.say('Someone in here must know where the key went.');
      w.emote('m_rat', '?', 1200);
      await w.say('The skinny prisoner leaning on the wall beside the door - WEASEL, the others call him - is watching you very closely.');
      w.save();
    }
  },

  async p3_trough(w) {
    if (f(w, 'w5_key_found')) return w.say('The slop trough. You have already had your arm in there once. Once is plenty.');
    if (!f(w, 'w5_key_hint')) return w.say('The slop trough. It is very full, and very grey. You would need a very good reason to touch it.');
    if (!(await w.confirm('Put your arm into the slop trough, up to the shoulder?'))) return;
    w.sfx('splash');
    w.shake(200, 0.003);
    await w.say('Squelch. Squelch. Something bites your finger. Something else holds your hand for a moment.');
    w.set('w5_trough_dug');
    w.refresh();
    w.sfx('splash');
    await w.wait(500);
    w.set('w5_key_found');
    w.refresh();
    await w.give('k_key');
    await w.say('...You will never be clean again. But you have the kitchen key.');
    w.save();
  },

  async p3_garbage(w) {
    if (!f(w, 'w5_key_hint') || f(w, 'w5_key_found')) return w.say('Garbage. Old trays, bones, a single shoe.');
    w.sfx('rattle');
    await w.say('You dig through the garbage. A fish skeleton. A tooth. Somebody\'s diary: DAY 9000. SLOP AGAIN.');
    await w.say('No key. Somewhere even more disgusting, then.');
  },
  async p3_garbage2(w) {
    if (!f(w, 'w5_key_hint') || f(w, 'w5_key_found')) return w.say('A garbage pile. It is watching you.');
    await w.say('Something in the garbage pile hisses at you. You decide the key is not in there.');
  },
  async p3_drain(w) {
    if (!f(w, 'w5_key_hint') || f(w, 'w5_key_found')) return w.say('A drain in the floor. Gravy goes in. Something comes back up.');
    w.sfx('drip');
    await w.say('You peer into the drain. The drain peers back. No key - just a smell that will follow you around all day.');
  },
  async p3_toilet(w) {
    if (!f(w, 'w5_key_hint') || f(w, 'w5_key_found')) return w.say('The mess hall toilet. In the middle of the mess hall. Nobody knows why.');
    w.sfx('flush');
    await w.say("You check the toilet. It's disgusting, but it's not THE most disgusting thing in this room.");
    await w.say("What do they ALL eat out of, every single day?");
  },
  async p3_menu(w) {
    await w.say("TODAY'S MENU: SLOP. TOMORROW: SLOP. FRIDAY: SURPRISE! (IT IS SLOP.)");
  },
  async p3_scrawl(w) {
    await w.say('Scratched into the wall, very small: WHEEL TWO = THE HOUR HE COMES DOWN.');
    if (!f(w, 'w5_massacre')) await w.say("Underneath, in someone else's writing: WHO IS 'HE'?");
  },
  async p3_clock(w) {
    if (!f(w, 'w5_massacre')) return w.say("A big clock over the hall. It ticks very loudly. Painted under it: SUPPER AT 8.");
    const first = !f(w, 'w5_d2');
    w.set('w5_d2');
    w.sfx('item');
    await w.say('The clock has stopped. Both hands point at EIGHT. The hour he came down.');
    if (first) {
      pop(w, w.player.sprite.x, w.player.sprite.y - 26, 'CLUE: WHEEL TWO = 8', C.white, 1600);
      await w.say('WHEEL TWO: 8. You will not forget it.');
    }
    w.save();
  },
  async p3_shelf(w) {
    await w.say('Kitchen jars. EYE OF NEWT. EYE OF FROG. EYE OF EYE. Just... a lot of eyes.');
  },

  /** Your temple creature, in a cage over the pot. */
  async p3_cage(w) {
    if (f(w, 'w5_got2')) return;
    const id = w2(w);
    w.emote('cage_cr', '!', 700);
    w.sfx('cry');
    await w.say(`${crName(id)} is shut in a cage hanging over the boiling pot! It rattles the bars when it sees you.`);
    await w.say('The cage only has a latch. They locked the KITCHEN, not the cage. Nobody in here was ever meant to get this far.');
    w.sfx('unlock');
    w.refresh();
    const cage = w.prop('cage');
    if (cage) cage.setTexture('p5_cage_open');
    const c = w.actor('cage_cr');
    if (c) {
      await w.tw({ targets: c.sprite, y: py(P3.cage.y + 4), x: w.player.sprite.x - 14, duration: 500, ease: 'Quad.easeIn' });
      w.sfx('bump');
      await w.emote('cage_cr', 'heart', 900);
    }
    await spiritRecovered(w, id);
    w.remove('cage_cr');
    w.set('w5_got2');
    w.save();
    w.respawnParty();
    await w.wait(300);
    await w.say(`${crName(id)} shakes the steam out of its ears and won't leave your side.`);
    await w.wait(600);
    await SCRIPTS_MASSACRE.w5_massacre(w);
  },
};

// ------------------------------------------------------------------ supper

const SCRIPTS_MASSACRE: Record<string, Script> = {
  async w5_massacre(w) {
    const s = scene(w);
    w.set('w5_massacre_t');
    w.onTick = null;
    // if the game was closed during this, you are back in the kitchen
    if (w.map.id !== 'p_mess') return;
    if (w.player.x < 26) {
      w.loadMap('p_mess', 29, 7, 'up');
      w.onTick = null;
    }
    if (!f(w, 'w5_kitchen_open')) {
      w.set('w5_kitchen_open');
      w.setGround(P3.door.x, P3.door.y, T.W5_KITCHEN);
    }
    // the guardian goes stiff
    w.music(null);
    const off = bars(w);
    const g = w.actor(G);
    w.sfx('bell');
    await w.wait(600);
    if (g) {
      g.sprite.setFrame(2);
      w.emote(G, '!', 1200);
    }
    w.sfx('heartbeat');
    await w.wait(900);
    await w.say(`${gName(w)} drops low. Every hair on it is standing up. It shoves you toward the counter with its head.`);
    // hide behind the counter
    const path: Dir[] = [];
    let x = w.player.x;
    let y = w.player.y;
    while (y < P3.hide.y) {
      path.push('down');
      y++;
    }
    while (x !== P3.hide.x) {
      path.push(x < P3.hide.x ? 'right' : 'left');
      x += x < P3.hide.x ? 1 : -1;
    }
    await w.move('player', path, 150);
    w.face('player', 'up');
    w.set('w5_hiding');
    await w.say('You crouch behind the counter. Through the open kitchen door, you can just see the hall.');
    // the hall: the food stops in the air
    const beat = s.time.addEvent({ delay: 900, loop: true, callback: () => w.sfx('heartbeat') });
    await w.camPan(8, 6, 1800, 1.6);
    for (const id of MESS) {
      w.face(id, 'up');
      void w.emote(id, '!', 900);
    }
    await w.wait(700);
    await w.say('The food fight stops. A potato rolls across the floor, all on its own.');
    // the elevator comes down
    w.sfx('rumble');
    w.shake(1200, 0.004);
    await w.camPan(3, 3, 1200, 2);
    w.sfx('bell');
    const lift = w.prop('lift');
    lift?.setTexture('p5_lift_open');
    w.setDark(0.72, 1600);
    const rp = w.sprite('ow_reaper', px(2) + 8, py(1) - 6, 9400).setOrigin(0.5, 1).setAlpha(0).setFrame(0);
    const unglow = glow(w, rp, 34);
    s.tweens.add({ targets: rp, alpha: 1, duration: 1400 });
    await w.tw({ targets: rp, y: py(4), duration: 2600, ease: 'Sine.easeInOut' });
    const bob = s.tweens.add({ targets: rp, y: rp.y - 3, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    w.sfx('wail');
    await w.wait(900);
    await w.say('A small figure in a black hood floats out of the elevator. It holds a scythe. It does not touch the floor.');
    // they talk to him. he says nothing.
    const ask = async (id: string, who: string, pitch: number, line: string) => {
      w.faceTo(id, 'player');
      const a = w.actor(id);
      if (a) {
        const dx = rp.x - a.sprite.x;
        const dy = rp.y - a.sprite.y;
        a.face(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      }
      await w.say(line, who, { pitch });
    };
    await w.camPan(11, 7, 900, 1.3);
    await ask('m_chef', 'FORMER CHEF', 760, '...Evening. Is this about the soup?');
    await ask('m_big', 'BIG LOU', 480, 'WHAT DO YOU WANT?');
    await ask('m_twins', 'TWINS', 1000, 'Are you here for... us?');
    await ask('m_lady', 'OLD LADY', 880, 'Say something! For goodness sake, SAY SOMETHING!');
    await w.wait(800);
    await w.say('The Reaper says nothing.');
    // the scythe comes up. everyone rises.
    beat.remove();
    w.music('menace');
    rp.setFrame(3);
    w.sfx('ghost');
    w.flash(0.3);
    await w.wait(700);
    const lifted: { id: string; sp: Phaser.GameObjects.Sprite; tw: Phaser.Tweens.Tween }[] = [];
    for (const id of MESS) {
      const a = w.actor(id);
      if (!a) continue;
      a.face('down');
      const tw = s.tweens.add({ targets: a.sprite, y: a.sprite.y - 12, duration: 1600, ease: 'Sine.easeOut' });
      lifted.push({ id, sp: a.sprite, tw });
    }
    rp.setFrame(4);
    w.sfx('wail');
    w.shake(1800, 0.004);
    await w.wait(1800);
    await w.say('Every prisoner in the hall lifts off the floor - slowly, quietly, as if they weighed nothing at all.');
    const jit = s.time.addEvent({ delay: 60, loop: true, callback: () => lifted.forEach((l) => (l.sp.x += Phaser.Math.Between(-1, 1) * 0.6)) });
    await w.wait(1200);
    // their souls leave them, one by one, and go to him
    w.setDark(0.86, 900);
    for (const l of lifted) {
      const soul = s.add.image(l.sp.x, l.sp.y - 10, 'p5_soul').setDepth(9450).setAlpha(0);
      w.worldLayer.add(soul);
      s.tweens.add({ targets: soul, alpha: 1, duration: 200 });
      s.tweens.add({ targets: l.sp, alpha: 0, duration: 700 });
      w.sfx('ghost');
      s.tweens.add({ targets: soul, x: rp.x, y: rp.y - 22, scale: 0.4, duration: 900, ease: 'Sine.easeIn', onComplete: () => soul.destroy() });
      await w.wait(260);
    }
    jit.remove();
    await w.wait(900);
    w.flash(0.5);
    w.sfx('boom');
    w.set('w5_massacre');
    w.refresh();
    rp.setFrame(0);
    // the clock stops
    w.music(null);
    await w.camPan(P3.clock.x, P3.clock.y + 2, 1100, 2);
    w.sfx('tick');
    await w.wait(700);
    w.sfx('tick');
    await w.wait(1400);
    await w.say('The clock over the hall stops ticking.');
    await w.camPan(6, 6, 1200, 1.6);
    await w.say('Where every prisoner was standing, there is a little heap of grey dust and an empty set of clothes.');
    // he turns toward the kitchen: the camera keeps him and the kitchen door in view together
    const door = { x: px(P3.door.x) + 8, y: py(P3.door.y) + 8 };
    const mid = () => ({ x: (rp.x + door.x) / 2, y: (rp.y - 16 + door.y) / 2 });
    await camPx(w, mid().x, mid().y, 900, 1.6);
    w.sfx('heartbeat');
    rp.setFlipX(door.x > rp.x);
    await w.tw({ targets: rp, x: rp.x + 24, duration: 1200, ease: 'Sine.easeInOut' });
    w.sfx('heartbeat');
    await w.say('The hood turns, very slowly, toward the kitchen door.');
    w.sfx('heartbeat');
    await w.wait(700);
    // ...and away
    rp.setFlipX(false);
    void camPx(w, px(4), py(4), 1500, 1.6);
    await w.tw({ targets: rp, x: px(2) + 8, duration: 1600, ease: 'Sine.easeInOut' });
    bob.stop();
    await w.tw({ targets: rp, y: py(1) - 6, alpha: 0, duration: 2000, ease: 'Sine.easeIn' });
    unglow();
    rp.destroy();
    lift?.setTexture('p5_lift');
    w.sfx('slam');
    w.sfx('rumble');
    w.shake(900, 0.003);
    await w.wait(1200);
    w.setDark(0.35, 2000);
    // the guardian waits. then it is safe.
    await w.camPan(P3.hide.x, P3.hide.y - 1, 1000, 2);
    await w.wait(1500);
    if (g) {
      g.sprite.setFrame(0);
      w.emote(G, '...', 1000);
    }
    await w.wait(1400);
    gSound(w);
    await w.say(`For a long time, ${gName(w)} does not move. Then, at last, it lets out its breath and stands up.`);
    w.set('w5_hiding', false);
    await w.camReturn(700);
    await off();
    w.music('w5_high');
    w.save();
    w.sfx('chime');
    await w.say('Up by the elevator, a glass eye blinks open.');
  },
};

export const W5_MESS: Record<string, Script> = { ...MESS_TALK, ...SCRIPTS_MASSACRE };

/** The key hint: "That kitchen key?" "Yeah, I heard someone threw it somewhere disgusting." */
async function keyHint(w: W) {
  w.set('w5_key_hint');
  w.emote('m_rat', '?', 600);
  await w.say('That kitchen key?', 'WEASEL', { pitch: 1240 });
  w.faceTo('m_big', 'm_rat');
  await w.say('Yeah, I heard someone threw it somewhere disgusting.', 'BIG LOU', { pitch: 480 });
  w.save();
}
void blackout;
