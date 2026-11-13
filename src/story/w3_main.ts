import Phaser from 'phaser';
import { isSet, has } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type Gate, type W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, cam, camPx, bars, titleCard, blackout, cut } from './w2_fx';
import { C } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { getCreature } from '../engine/creatures';
import { w3Stage } from './w3_state';
import { W3_DOORS, BARREL_TAP, CLUB } from '../world/maps/w3maps';

// World 3: THE PARTY ISLAND. Day 1 and the first night: the arrival, the tour
// guide, the bouncer and the fake ID, Avalena's painting, the girl at the barrel,
// the club, the back door, the bartender, Scorvex, and following Ayla home.

type Dir = 'up' | 'down' | 'left' | 'right';
export const AYLA = 'AYLA';
export const AVA = 'AVALENA';
export const MILO = 'MILO';
export const P_AYLA = 1150;
export const P_AVA = 960;
export const P_MILO = 820;
const f = (w: W, k: string) => isSet(w.state, k);

/** Ayla says something, if she is with you (sparingly: she is a person, not a radio). */
export async function ayla(w: W, line: string, emote?: string) {
  if (!w.companion) return;
  if (emote) await w.emote('inventor', emote, 500);
  await w.say(line, AYLA, { pitch: P_AYLA });
}
/** Hide (or show) the player, both creatures and Ayla: for sets where you only watch. */
export function hideAll(w: W, v = true) {
  for (const id of ['player', 'follower', 'follower2', 'inventor']) w.hide(id, v);
}
/** Count one of the first night's little activities (the back door opens after four). */
async function act(w: W, k: string) {
  if (!f(w, 'w3_in_club') || f(w, 'w3_ayla_seen') || f(w, 'w3_act_' + k)) return;
  w.set('w3_act_' + k);
  const n = ['dance', 'dj', 'drink', 'talk', 'hotel', 'clinic', 'window', 'bartender'].filter((x) => f(w, 'w3_act_' + x)).length;
  if (n >= 4 && !f(w, 'w3_backdoor_open')) {
    w.set('w3_backdoor_open');
    w.refresh(); // the door behind the bar swaps to propped open, EXIT sign lit
    await w.wait(300);
    w.sfx('door');
    w.dialog.banner('THE BACK DOOR IS PROPPED OPEN');
  }
}
export { act as w3Act };

// ================================================================== arrival

const ARRIVE: Record<string, Script> = {
  /** Called from the end of World 2, right after the iris closes on the professor. */
  async w3_title(w) {
    w.set('w3_started');
    w.set('w2_inv_follow', false);
    w.save();
    hideAll(w, true);
    w.music(null);
    await camPx(w, 50 * 16 + 8, 84 * 16, 0, 2);
    w.sfx('wave');
    const s = scene(w);
    const black = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(94));
    await titleCard(w, '', 'BACCHUS KEY', 2800, false);
    black.destroy();
    w.music('party');
    // a slow glide in over the harbour: the music reaches you before the town does
    await camPx(w, 50 * 16 + 8, 30 * 16, 4200, 1.4);
    await w.wait(600);
    await camPx(w, 50 * 16 + 8, 72 * 16, 2600, 2);
    hideAll(w, false);
    w.face('player', 'up');
    await w.camReturn(400);
    await w.wait(500);
    await SCRIPTS.w3_guide_intro(w);
  },

  async w3_guide_intro(w) {
    if (f(w, 'w3_guide_met')) return;
    w.set('w3_guide_met');
    const G = (s: string) => w.say(s, 'TOUR GUIDE TEDDY', { pitch: P_HIGH });
    w.sfx('cheer');
    await w.emote('w3_guide', '!', 400);
    await G('HEY! Welcome to the island!');
    await G('You should DEFINITELY check out our world-famous club! That\'s why you came here, right?');
    await w.camPan(50, 15, 900, 1.6);
    await G('Club Forever! Up the Strip, you can\'t miss it. Seven nights a week, and the other nights too.');
    await w.camPan(82, 30, 900, 1.6);
    await G('And THAT is the Great Barrel. Every drop on Bacchus Key comes out of that one tap. Every. Single. Drop.');
    await w.camReturn(700);
    await G('Have fun! Everybody does!');
    w.save();
  },

  async w3_guide(w) {
    const st = w3Stage(w.state);
    const G = (s: string) => w.say(s, 'TOUR GUIDE TEDDY', { pitch: P_HIGH });
    if (!f(w, 'w3_guide_met')) return SCRIPTS.w3_guide_intro(w);
    if (st === 'd1' || st === 'n1') await G(f(w, 'w3_sal_dead') ? '...I don\'t have a tour for this.' : 'The club! The barrel! The FUN! Up the Strip!');
    else if (st === 'd2') await G('Business as usual! Mostly! Please do not ask me about last night.');
    else if (st === 'n2') await G('The barrel... I did forty tours a week of that barrel...');
    else if (st === 'd3') await G('Want a tour? Of anything? Please? I have so many brochures.');
    else {
      await G('New brochure: BACCHUS KEY. COME FOR THE PARTY. STAY FOR... US. It is a work in progress.');
      if (f(w, 'w3_end')) await SCRIPTS.w4_offer(w);
    }
  },

  /** The sun goes down while you are getting your ID. */
  async enter_w3_isl(w) {
    if (f(w, 'w3_id') && !f(w, 'q_w3_dusk')) {
      w.set('q_w3_dusk');
      await w.wait(300);
      w.sfx('cheer');
      await w.say('The sun has gone down. Up the Strip, Club Forever lights up like a firework.');
      return;
    }
    // back out of the back door: the girl from the barrel
    if (f(w, 'w3_backdoor_open') && !f(w, 'w3_ayla_seen') && w.map.id === 'w3_isl' && w.player.y <= 8) return SCRIPTS.w3_alley(w);
    // out of the front door on the third day: Ironclad is waiting
    if (f(w, 'w3_research_done') && !f(w, 'w3_iron_met') && w.player.y >= 23 && w.player.y <= 24) return SCRIPTS.w3_ironclad(w);
  },
};

// ================================================================== the bouncer and the fake ID

const IDQUEST: Record<string, Script> = {
  async w3_bouncer(w) {
    const B = (s: string) => w.say(s, 'BOUNCER', { pitch: P_LOW });
    if (f(w, 'w3_id')) return B('ID checks out. In you go.');
    if (!f(w, 'w3_bouncer_met')) return SCRIPTS.w3_bouncer_stop(w);
    await B('No ID, no party. Rules are rules, kid.');
  },
  async w3_bouncer_stop(w) {
    w.set('w3_bouncer_met');
    const B = (s: string) => w.say(s, 'BOUNCER', { pitch: P_LOW });
    w.faceTo('bouncer', 'player');
    await w.emote('bouncer', '!', 400);
    await B('WOAH, KID. SLOW YOUR ROLL.');
    await B('YOU NEED ID TO GET INTO THIS PARTY.');
    await B("AND TRUST ME, OF ALL THE PARTIES WE'VE HAD, THIS ONE'S GOING TO BE THE MOST WILD.");
    await w.emote('player', '...', 700);
    await w.say("You don't have an ID. You'll have to find someone who can... make one.");
    w.save();
  },

  async w3_avalena(w) {
    const A = (s: string) => w.say(s, AVA, { pitch: P_AVA });
    if (f(w, 'w3_id')) {
      await A(f(w, 'w3_thief_quest') ? "If you find out who took my art, come tell me. Please." : 'Go. Party. Be free. Somebody here should be.');
      return;
    }
    if (f(w, 'w3_painting') && !f(w, 'w3_sold')) return A('A hundred dollars! Somebody out there has taste. Probably. Try near the barrel, everybody goes there.');
    if (!f(w, 'w3_bouncer_met')) {
      await A('Welcome to my studio! Everything is for sale. Nothing has sold. Yet!');
      return;
    }
    // asking for a fake ID
    await w.say('You ask Avalena if she could make you an ID.');
    await w.emote('avalena', '!', 500);
    await A('WAIT...');
    await A('You want me to DRAW an ID?');
    await A("You know that's not going to work, right?");
    await w.wait(700);
    await A('Fine.');
    await A("But I'm not doing it for free. I barely get any customers as it is.");
    w.sfx('item');
    await A('Here. Sell this for me.');
    await w.give('painting', 1, 'GOT A PAINTING!');
    await A("That piece is worth... uh... $100. Get me the money and I'll make you your ID.");
    w.set('w3_painting');
    w.save();
  },

  /** The girl at the barrel: the art lover. (The art thief.) */
  async w3_ayla_buy(w) {
    const Y = (s: string) => w.say(s, 'GIRL', { pitch: P_AYLA });
    w.faceTo('w3_ayla_barrel', 'player');
    await w.emote('w3_ayla_barrel', '!', 500);
    await Y('OH MY GOSH!');
    await Y("That's probably the best piece of art I've ever seen!");
    w.sfx('register');
    w.take('painting');
    await w.give('money', 1, 'GOT $100!');
    await Y('Where did you get it?');
    await w.say('You say nothing. You just point toward the art shop.');
    await w.wait(400);
    await Y('Avalena, huh?');
    await Y('Okay, thanks!');
    w.set('w3_sold');
    w.sfx('swish');
    const a = w.actor('w3_ayla_barrel');
    if (a) await w.move('w3_ayla_barrel', ['left', 'left', 'down', 'down', 'left', 'left', 'left'], 140);
    w.remove('w3_ayla_barrel');
    w.save();
  },

  async enter_w3_art(w) {
    if (!f(w, 'w3_sold') || f(w, 'w3_robbed')) return;
    w.set('w3_robbed');
    w.refresh();
    const A = (s: string) => w.say(s, AVA, { pitch: P_AVA });
    await w.wait(300);
    w.face('avalena', 'down');
    await w.emote('avalena', 'anger', 600);
    w.shake(300, 0.004);
    await A('SOMEONE JUST CAME IN AND ROBBED ME!');
    await A('ALL MY ART!');
    await w.wait(400);
    await A('Did you have something to do with this?');
    await w.emote('player', '...', 900);
    await w.say('You say nothing. You hold out the $100.');
    w.take('money');
    await w.wait(500);
    await A('Ugh...');
    await A("I guess a deal's a deal.");
    await A("Here. I drew it while I was being robbed. Don't ask how.");
    // the card, in all its glory
    const s = scene(w);
    const card = w.ui(s.add.image(SW / 2, SH / 2 - 20, 'ui_fakeid').setScale(2).setDepth(90).setAngle(-4));
    w.sfx('item');
    await w.tw({ targets: card, angle: 3, duration: 300, yoyo: true });
    await w.wait(1400);
    card.destroy();
    await w.give('fakeid', 1, 'GOT A "FAKE" ID!');
    w.set('w3_id');
    await A('Could you please find out who robbed me? I had some really important drawings in there.');
    await A("I'll even give you your money back if you find out who did this!");
    w.set('w3_thief_quest');
    w.save();
  },

  async w3_art_piece(w) {
    await w.say(f(w, 'w3_robbed') ? 'An empty easel. Whoever it was even took the little tub of brushes.' : 'A painting of the Great Barrel at sunset. It is... honestly pretty good.');
  },
  async w3_art_wall(w) {
    await w.say(f(w, 'w3_robbed') ? 'A pale rectangle on the wall where a painting used to hang.' : 'Sketches pinned to the wall: dancers, the bouncer, a cat in a tiny party hat.');
  },
};

// ================================================================== the first night in the club

const NIGHT1: Record<string, Script> = {
  async enter_w3_club(w) {
    // straight in through the back door after the girl: the bartender
    if (f(w, 'w3_ayla_seen') && !f(w, 'w3_sal_dead')) return SCRIPTS.w3_bartender(w);
    if (f(w, 'w3_id') && !f(w, 'w3_in_club')) {
      w.set('w3_in_club');
      await w.wait(300);
      w.sfx('cheer');
      await w.say('The bass hits you like a wave. Hundreds of people, lights everywhere, a bar, a stage, a hotel lobby...');
      await w.say('Might as well enjoy yourself.');
      return;
    }
    return SCRIPTS.w3_club_enter_later?.(w);
  },
  async w3_dance(w) {
    if (f(w, 'w3_sal_dead') && !f(w, 'w3_day2')) return w.say('Nobody is dancing now.');
    w.sfx('note');
    for (let i = 0; i < 6; i++) {
      const d: Dir = (['down', 'left', 'down', 'right'] as Dir[])[i % 4];
      w.face('player', d);
      w.face('follower', d);
      w.face('follower2', d);
      await w.emote(i % 2 ? 'follower' : 'player', 'note', 220);
    }
    const c = w.state.creature ? getCreature(w.state.creature).name : '';
    await w.say(c ? `You dance. ${c} dances. It is not good dancing. Nobody minds.` : 'You dance. It is not good dancing. Nobody minds.');
    await act(w, 'dance');
  },
  async w3_dj(w) {
    const st = w3Stage(w.state);
    await w.say(st === 'n1' || st === 'd1' ? 'THIS ONE GOES OUT TO EVERYBODY WHO IS STILL STANDING!' : st === 'end' ? 'Slower songs now. People seem to like slower songs now.' : 'Nobody wants to dance. I play anyway. It is all I know.', 'DJ SPINZ', { pitch: P_MID });
    await act(w, 'dj');
  },
  async w3_djbooth(w) {
    await w.say('Two turntables and a laptop held together with tape.');
  },
  async w3_sal(w) {
    const S = (s: string) => w.say(s, 'SAL', { pitch: P_LOW });
    if (!f(w, 'w3_act_bartender')) {
      await S("New face! I'm Sal. I've been pouring drinks behind this bar for fifty-three years.");
      await S('Same stool, same towel, same bad jokes. What can I get you?');
      await act(w, 'bartender');
      return;
    }
    if (!f(w, 'w3_act_drink')) {
      const i = await w.ask('ORDER SOMETHING?', ['THE USUAL', 'SURPRISE ME', 'JUST WATER']);
      w.sfx('item');
      if (i === 0) await S('You have been here four minutes. But alright. One Shirley Temple, extra cherries.');
      else if (i === 1) await S('One SAL SPECIAL. It is fizzy, it is pink, and it is mostly juice. Do not tell anyone.');
      else await S("Water. You know, I respect that. Most nights I'm the only one drinking it.");
      await act(w, 'drink');
      return;
    }
    await S('Fifty-three years. You know the secret? Listen more than you pour.');
  },
  async w3_bar(w) {
    if (f(w, 'w3_sal_dead') && !f(w, 'w3_day2')) return w.say("Sal's towel lies folded on the counter where he left it.");
    await w.say('A long bar polished by fifty years of elbows.');
  },
  async w3_receptionist(w) {
    const R = (s: string) => w.say(s, 'RECEPTIONIST', { pitch: P_MID });
    const st = w3Stage(w.state);
    if (st === 'd1' || st === 'n1') {
      await R('Welcome to the Club Forever Hotel. Our guests never check out. They just keep extending.');
      await act(w, 'hotel');
    } else if (st === 'd3') await R('Most guests left this morning. The rooms are very... quiet.');
    else await R('Rooms are upstairs. The elevator plays music. You cannot turn it off.');
  },
  async w3_window(w) {
    if (f(w, 'w3_barrel_gone')) return w.say('The Great Barrel, split open like an egg. The plaza still shines with spilt booze.');
    await w.say('The whole town is lit up below: the Strip, the hotels, the Great Barrel glowing at the end of it all.');
    await act(w, 'window');
  },
  async w3_clinic_sign(w) {
    await w.say('THE CLINIC. OPEN ALL NIGHT. (FOR OBVIOUS REASONS.)');
    await act(w, 'clinic');
  },
};

// ================================================================== the back door, the bartender, Scorvex

const DEATH: Record<string, Script> = {
  async w3_alley(w) {
    w.set('w3_ayla_seen');
    w.music(null);
    const s = scene(w);
    const a = w.spawn('ayla_alley', 'ayla', 57, 6, 'left');
    await w.wait(400);
    w.sfx('rattle');
    await w.say('Someone is crouched behind the bins, going through a sack of... picture frames?');
    await w.camPan(56, 6, 500);
    w.face('ayla_alley', 'left');
    await w.emote('ayla_alley', '!', 600);
    await w.say("It's the girl from the barrel. The one who bought the painting.");
    w.face('player', 'right');
    await w.wait(300);
    w.sfx('swish');
    // she bolts: round the corner and in through the club's back door
    await w.move('ayla_alley', ['right', 'right', 'right', 'right', 'right'], 110);
    a.sprite.setVisible(false);
    w.remove('ayla_alley');
    w.sfx('door');
    await w.camReturn(400);
    await w.say('She ducked back into the club! Through the back door!');
    w.music('party');
    w.save();
    void s;
  },
  async w3_bartender(w) {
    w.set('w3_sal_dead_scene');
    hideAll(w, false);
    await w.wait(300);
    await w.say('You burst in behind the bar. She is gone, lost in the crowd.');
    // the lights go
    const s = scene(w);
    for (let i = 0; i < 6; i++) {
      w.setDark(i % 2 ? 0.95 : 0.4);
      w.sfx(i % 2 ? 'tick' : 'rattle');
      await w.wait(110 + i * 30);
    }
    w.music(null);
    w.setDark(0.92);
    await w.wait(1600);
    w.sfx('creak');
    await w.wait(1200);
    w.setDark(0.6, 1200);
    await w.wait(1300);
    // Sal
    const sal = w.actor('sal');
    if (sal) {
      sal.sprite.setAngle(90);
      sal.sprite.y += 6;
    }
    await w.camPan(CLUB.bar.x, CLUB.bar.y + 1, 900, 2.4);
    await w.wait(900);
    await w.say('Sal is on the floor behind the bar.');
    await w.wait(800);
    await w.say('He is not moving.');
    await w.wait(1200);
    // the crowd closes in
    const people: [string, string, number, number, Dir][] = [
      ['m1', 'local3', 3, 7, 'up'],
      ['m2', 'partier3', 5, 7, 'up'],
      ['m3', 'tourist', 8, 7, 'up'],
      ['m4', 'local4', 9, 8, 'up'],
      ['m5', 'partier6', 2, 8, 'up'],
    ];
    for (const [id, look, x, y, d] of people) w.spawn('mourn_' + id, look, x, y, d);
    await w.camReturn(700);
    w.music('grief');
    const P = (who: string, s: string, p = P_MID) => w.say(s, who, { pitch: p });
    await P('REGULAR', 'Sal? ...SAL?');
    await P('WOMAN', "He's not breathing. Somebody call... somebody...", P_HIGH);
    await w.emote('mourn_m2', 'tear', 900);
    await P('OLD REGULAR', 'Fifty-three years he stood back there. He poured my dad his first drink.', P_LOW);
    await P('OLD REGULAR', 'He knew everybody. Everybody.', P_LOW);
    await w.emote('mourn_m4', 'tear', 900);
    await w.wait(600);
    w.sfx('rumble');
    w.shake(900, 0.006);
    await w.wait(500);
    await P('BOUNCER', 'EVERYBODY OUT. NOW. SOMETHING IS OUTSIDE.', P_LOW);
    w.sfx('scream');
    for (const [id] of people) w.move('mourn_' + id, ['down', 'down', 'right', 'right', 'down', 'down'], 160);
    await w.wait(1100);
    for (const [id] of people) w.remove('mourn_' + id);
    w.set('w3_sal_dead');
    w.save();
    await w.fade(true, 500);
    await SCRIPTS.w3_scorvex(w);
    void s;
  },
  /** Outside: the thing that did it. */
  async w3_scorvex(w) {
    cut(w, 'w3_isl', 50, 24, 'up');
    hideAll(w, false);
    w.music(null);
    cam(w).resetFX();
    const s = scene(w);
    // a few people running out of the club, scattering down the Strip
    const run = ['local3', 'partier1', 'tourist2', 'partier4'];
    run.forEach((look, i) => w.spawn('flee' + i, look, 49 + (i % 2), 23, 'down'));
    await w.fade(false, 400);
    w.sfx('scream');
    await Promise.all(run.map((_, i) => w.move('flee' + i, ['down', 'down', i % 2 ? 'left' : 'right', 'down', 'down', 'down'], 150)));
    run.forEach((_, i) => w.remove('flee' + i));
    w.sfx('rumble');
    w.shake(800, 0.006);
    w.music('menace');
    await w.wait(600);
    // round the corner from the back of the club, heavy, hissing
    // (the art faces left, toward the club door and you: no flip)
    const sv = w.sprite('ow_scorvex', 68 * 16 + 8, 21 * 16, 9000).setOrigin(0.5, 1);
    sv.play('ow_scorvex_walk');
    // you (and anyone with you) turn at the sound of it
    w.face('player', 'right');
    // frame you and it together, so it's plain who it is staring at
    await w.camPan(55, 23, 700, 1.6);
    for (let i = 0; i < 5; i++) {
      w.sfx('slam');
      w.shake(150, 0.003);
      // each heavy step lands with a little squash
      await w.tw({ targets: sv, x: sv.x - 28, y: sv.y + 8, duration: 300, ease: 'Sine.easeInOut' });
      await w.tw({ targets: sv, scaleY: 0.94, scaleX: 1.04, duration: 60, yoyo: true });
    }
    sv.stop().setFrame(0);
    await w.wait(400);
    // it rears its tail and the furnace flares
    w.sfx('rev');
    sv.setFrame(2);
    await w.tw({ targets: sv, y: sv.y - 4, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    w.flash(0.4);
    w.shake(300, 0.004);
    await w.wait(700);
    await w.say("A four-legged machine of plated steel. Its scorpion's tail glows like a furnace door.");
    await w.say("Something hangs from one of its claws, swinging. A bar towel. Sal's towel.");
    await w.wait(500);
    w.spawn('witness', 'partier2', 44, 26, 'right');
    await w.say("It came in through the kitchen! It was AT THE BAR when the lights went out! I saw it!", 'PARTYGOER', { pitch: P_HIGH });
    w.move('witness', ['left', 'left', 'down', 'down', 'down'], 140).then(() => w.remove('witness'));
    await w.wait(600);
    w.sfx('horn');
    w.shake(700, 0.008);
    await w.tw({ targets: sv, x: sv.x - 10, duration: 220, ease: 'Quad.easeIn' });
    await w.say('The furnace in its tail roars. It turns toward you.');
    w.set('w3_scorvex_met');
    w.save();
    await w.startBattle('scorvex');
    void s;
  },
  async after_scorvex(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result !== 'victory') {
      await w.say('You come to on the cobbles. The steel beast is still prowling in front of the club.');
      w.spawn('ow_scorvex_npc', 'raw:ow_scorvex', 58, 25, 'left');
      return;
    }
    w.set('w3_scorvex_beaten');
    w.save();
    // it limps off into the dark
    // battered, slumped, still facing you; then it hauls itself round and limps off east
    const sv = w.sprite('ow_scorvex', 58 * 16, 26 * 16, 9000).setOrigin(0.5, 1).setFrame(3);
    w.face('player', 'right');
    sv.setScale(1, 0.9);
    await w.camPan(57, 24, 600, 1.8);
    w.sfx('creak');
    await w.tw({ targets: sv, scaleY: 1, duration: 700, ease: 'Sine.easeOut' });
    await w.wait(300);
    w.sfx('clank');
    sv.setFlipX(true); // now facing right, the way it's going
    await w.wait(300);
    for (let i = 0; i < 6; i++) {
      w.sfx(i % 2 ? 'creak' : 'slam');
      w.shake(100, 0.002);
      await w.tw({ targets: sv, x: sv.x + 36, angle: i % 2 ? 3 : -3, duration: 340, ease: 'Sine.easeInOut' });
    }
    await w.tw({ targets: sv, alpha: 0, x: sv.x + 30, duration: 300 });
    sv.destroy();
    await w.wait(500);
    // and someone saw everything
    w.spawn('ayla_watch', 'ayla', 60, 28, 'left');
    await w.camPan(58, 27, 700);
    await w.say("The square is empty. Everyone ran. Everyone except one person.");
    await w.wait(500);
    w.faceTo('ayla_watch', 'player');
    await w.emote('ayla_watch', '!', 700);
    await w.say("The girl from the barrel. She watched the whole fight. She is staring at you like you're the thing with the tail.");
    await w.wait(500);
    w.sfx('swish');
    await w.move('ayla_watch', ['down', 'left', 'left', 'left'], 140);
    w.remove('ayla_watch');
    await w.camReturn(600);
    await w.say('She is running. You could follow her. Quietly.');
    w.save();
    await SCRIPTS.w3_follow(w);
  },
};

// ================================================================== following Ayla home

/** Her route: across the plaza, down to Neon Lane, west along it, up the cliff path to her cave. */
function route(): Dir[] {
  const d: Dir[] = [];
  const add = (dir: Dir, n: number) => {
    for (let i = 0; i < n; i++) d.push(dir);
  };
  add('left', 24); // (58,27) -> (34,27)
  add('down', 12); // -> (34,39)
  add('left', 29); // -> (5,39)
  add('up', 12); // -> (5,27)
  add('left', 1); // -> (4,27)
  add('up', 1); // -> (4,26): the cave
  return d;
}
/**
 * Where along the route she stops to look over her shoulder: five times, the first
 * only once she is well past where you're standing outside the club.
 */
const LOOKS = new Set([16, 30, 44, 58, 72]);

async function followAyla(w: W): Promise<'home' | 'seen' | 'lost'> {
  const s = scene(w);
  const path = route();
  const a = w.spawn('ayla_walk', 'ayla', 58, 27, 'left');
  let i = 0;
  let wait = 900;
  let looking = 0;
  w.stepMs = (_x, _y, run) => (run ? 170 : 240);
  const res = await w.freeRun((dt) => {
    const p = w.actor('player')!;
    const d = Math.abs(p.x - a.x) + Math.abs(p.y - a.y);
    // right on her heels, or close while she is looking back (she only spots
    // you once she has started walking, so a fresh start never trips it).
    // Tuned forgiving: she checks within 5 tiles for 1.3s, and you can trail 17 behind.
    if (i > 0 && d <= 1) return 'seen';
    if (looking > 0 && d <= 5) return 'seen';
    if (d > 17) return 'lost';
    if (a.moving) return null;
    if (looking > 0) {
      looking -= dt;
      if (looking <= 0) a.face(path[i] ?? 'up');
      return null;
    }
    wait -= dt;
    if (wait > 0) return null;
    if (i >= path.length) return 'home';
    if (LOOKS.has(i) && !(a as any).looked?.has(i)) {
      ((a as any).looked ??= new Set()).add(i);
      // a look back over her shoulder
      const back: Dir = ({ left: 'right', right: 'left', up: 'down', down: 'up' } as const)[path[i]];
      a.face(back);
      w.emote('ayla_walk', '?', 800);
      looking = 1300;
      return null;
    }
    a.walk(path[i], 380);
    i++;
    wait = 30;
    return null;
  });
  w.stepMs = null;
  w.remove('ayla_walk');
  void s;
  return res as 'home' | 'seen' | 'lost';
}

const FOLLOW: Record<string, Script> = {
  async w3_follow(w) {
    w.music('stealth');
    for (;;) {
      const r = await followAyla(w);
      if (r === 'home') break;
      w.sfx(r === 'seen' ? 'warn' : 'deny');
      await w.say(r === 'seen' ? 'She spins round! You duck into a doorway... too late. She doubles back the way she came.' : 'You lost sight of her.');
      await w.fade(true, 400);
      cut(w, 'w3_isl', 64, 27, 'left');
      cam(w).resetFX();
      await w.fade(false, 400);
      await w.say('There she is again, by the club. Keep your distance this time.');
    }
    w.set('w3_followed');
    w.save();
    await w.say('She slips into a cave in the cliff face. A little light comes on inside.');
    w.music('ayla');
  },
  async w3_cave_door_hint(w) {
    await w.say('A dark hole in the cliff. Water drips somewhere inside.');
  },
  async enter_w3_aylacave(w) {
    if (!f(w, 'w3_followed') || f(w, 'w3_cave_done')) return;
    await SCRIPTS.w3_cave_scene(w);
  },
  async w3_cave_scene(w) {
    const s = scene(w);
    const Y = (t: string, p = P_AYLA) => w.say(t, 'GIRL', { pitch: p });
    await w.wait(300);
    await w.move('player', ['up', 'up'], 300);
    await w.say('A tiny cave made into a tiny home: a bed, a stove, a desk... and paintings. Everywhere.');
    await w.camPan(5, 2, 900, 2.2);
    await w.say("You know these paintings. They were hanging in Avalena's shop this afternoon.");
    await w.camPan(10, 2, 900, 2.2);
    await w.wait(500);
    await w.camReturn(600);
    w.face('ayla_home', 'down');
    w.sfx('warn');
    await w.emote('ayla_home', '!', 600);
    await Y('WHAT ARE YOU DOING HERE?!', 1300);
    await w.wait(400);
    await Y('LEAVE IMMEDIATELY BEFORE I CALL THE CO—', 1300);
    await w.wait(900);
    await Y('...');
    await Y('Well...');
    await Y("I guess I really can't call them, huh?");
    await w.wait(800);
    await w.emote('ayla_home', 'tear', 900);
    w.music('ayla');
    await Y("I know. I know what it looks like. It's exactly what it looks like.");
    await Y('I just... I wanted it to feel less empty in here. Less scary. At night it is so dark, and it is so quiet, and it is just me.');
    await Y("Every time I hung one up, it felt like somebody else was home.");
    await w.emote('ayla_home', 'tear', 900);
    await w.wait(700);
    await Y("I'm sorry. I'm really sorry. I won't do it again. I promise.");
    await w.wait(500);
    await w.ask('', ["IT'S OKAY.", '(NOD)']);
    await w.wait(400);
    await w.emote('ayla_home', 'heart', 800);
    await Y('...Really?');
    await w.wait(600);
    await w.say("By the way... my name's Ayla.", AYLA, { pitch: P_AYLA });
    await w.say("It's late. And there's a giant metal scorpion out there. You can sleep here tonight, if you want.", AYLA, { pitch: P_AYLA });
    await w.say('You stay. The paintings watch over you both.');
    w.set('w3_cave_done');
    w.save();
    await w.fade(true, 900);
    w.sfx('ghost');
    await w.wait(800);
    void s;
    await SCRIPTS.w3_villain1(w);
  },
  async w3_cave_art(w) {
    await w.say(f(w, 'w3_ayla_packed') ? 'An empty nail on the cave wall.' : "One of Avalena's paintings, hung with care on a nail hammered into the rock.");
  },
  async w3_cave_bed(w) {
    await w.say('A narrow bed with four blankets on it. The cave gets cold.');
  },
  async w3_cave_kitchen(w) {
    await w.say('A camping stove and a single pan. One plate. One cup.');
  },
  async w3_cave_desk(w) {
    await w.say('A desk covered in her own drawings. They are not bad. They are actually not bad at all.');
  },
};

// ================================================================== doors

export const W3_GATES: Record<string, Gate> = {
  async w3_club_door(w) {
    const st = w3Stage(w.state);
    if (st === 'd1' && !f(w, 'w3_id')) {
      await SCRIPTS.w3_bouncer(w);
      return false;
    }
    if (st === 'n1' && f(w, 'w3_sal_dead')) {
      await w.say('The doors are chained. People sit on the steps outside, not saying anything.');
      return false;
    }
    if (f(w, 'w3_id') && !f(w, 'w3_in_club')) {
      const B = (s: string) => w.say(s, 'BOUNCER', { pitch: P_LOW });
      w.faceTo('bouncer', 'player');
      await w.say('You hand over your ID. The bouncer looks at it.');
      await w.wait(900);
      await B('Well...');
      await B('Looks official enough.');
      await B('GO ON IN!');
      w.sfx('cheer');
    }
    if (st === 'd3' && f(w, 'w3_iron_met') && !f(w, 'w3_iron_beaten')) {
      await w.say('Ironclad is standing between you and the doors.');
      return false;
    }
    return true;
  },
  async w3_hotel_door(w) {
    if (!f(w, 'w3_in_club') || (f(w, 'w3_sal_dead') && !f(w, 'w3_day2'))) {
      await w.say(f(w, 'w3_sal_dead') ? 'The hotel doors are locked for the night.' : 'HOTEL GUESTS AND CLUB MEMBERS ONLY. A doorman taps his clipboard.');
      return false;
    }
    return true;
  },
  async w3_backdoor(w) {
    if (!f(w, 'w3_backdoor_open')) {
      await w.say('STAFF ONLY. It is locked.');
      return false;
    }
    if (f(w, 'w3_ayla_seen')) {
      await w.say('The back door is jammed shut now.');
      return false;
    }
    return true;
  },
  async w3_backdoor_in(w) {
    if (f(w, 'w3_ayla_seen') && !f(w, 'w3_sal_dead')) return true;
    await w.say('The back door of the club. It only opens from the inside.');
    return false;
  },
  async w3_art_door(w) {
    if (f(w, 'w3_shop_closed')) {
      await w.say('Locked. A hand-written sign in the window: FOR SALE. SORRY. -A');
      if (!f(w, 'q_w3_closed')) {
        w.set('q_w3_closed');
        await ayla(w, "She closed. Because of me, probably.");
        await ayla(w, 'We have to find her.');
        await w.wait(300);
        // she turns and looks up the hill, toward the club
        w.face('inventor', 'up');
        await w.emote('inventor', '!', 600);
        await ayla(w, '...The club. Everybody on this island ends up back at Club Forever sooner or later.');
        await ayla(w, "Come on. Let's go back to the club.");
      }
      return false;
    }
    return true;
  },
  async w3_cave_door(w) {
    if (f(w, 'w3_followed')) return true;
    await SCRIPTS.w3_cave_door_hint(w);
    return false;
  },
  async w3_elevator(w) {
    if (!f(w, 'w3_in_club')) return false;
    w.sfx('quest');
    await act(w, 'hotel');
    return true;
  },
  async w3_clinic_in(w) {
    if (f(w, 'w3_clinic_open')) return true;
    await w.say(f(w, 'w3_day2') ? 'The nurse at the door shakes her head. "Patients only, hon. Come back when someone sends you."' : 'A nurse leans out of the clinic door: "Patients only, hon. Give it an hour, though. It is still early."');
    await act(w, 'clinic');
    return false;
  },
  async to_tap(w) {
    void BARREL_TAP;
    void W3_DOORS;
    return true;
  },
};

export const W3_MAIN: Record<string, Script> = { ...ARRIVE, ...IDQUEST, ...NIGHT1, ...DEATH, ...FOLLOW };
void Phaser;
void has;
void blackout;
void bars;
