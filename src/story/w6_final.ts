import Phaser from 'phaser';
import type { Script, W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, bars, blackout, camPx, hideParty, cut, PIP, P_PIP } from './w2_fx';
import { bigWords, catAt } from './w4_fx';
import { P_AYLA, P_AVA, P_MILO } from './w3_main';
import { C, txt } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { T } from '../world/tiles';
import { partyOf } from './state';
import { getCreature } from '../engine/creatures';
import { ALLY_NAMES, ALLY_POWER, type AllyDef } from '../engine/final';
import type { FinCfg } from '../scenes/battle/finalScenes';
import { W5_UPPER } from './w5_upper';
import { W5_PRISON } from './w5_prison';
import { f, px, py, G, gid, gKey, gName, gSound, w1, w2, w3, friendName, friendPitch, friendSprite, glow, type Dir } from './w5_fx';

// FINAL WORLD, PART TWO: THE GOD OF DEATH. The world side of it: the guardian goes to
// find Flamora, the four fights (the battles carry the story between them, see
// scenes/battle/finalScenes.ts), Flamora healed, the silence after, everybody, the
// guardian, the credits, every world better than you found it... and the cat.
//
// Save flags:
//   w6_stage  where the fights are: gr1 / gr1_done / gr2 / gr3 (+ w6_sec) / gr4 / won
//   w6_won    he is gone        w6_credits  the credits have started     w6_done  the end

const REAPER = 'THE GRIM REAPER';
const P_R = 260;
const ORA = 'MADAME ORACLE';
const P_ORA = 720;
const AYLA = 'AYLA';

const W1S = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'];
const W2S = ['glowbell', 'hammerfin', 'bubblotl', 'glidray'];
const W3S = ['scorvlet', 'widowling', 'ironbud'];

// ================================================================== the fights

/** Your three, in the order you walk with them (your lead first). */
function own(w: W): string[] {
  const mine = [w1(w), w2(w), w3(w)];
  const order = partyOf(w.state).filter((c) => mine.includes(c));
  for (const c of mine) if (!order.includes(c)) order.push(c);
  return order;
}

/** The three who come to help: a spirit from each world that you did NOT choose. */
export function finalAllies(w: W): AllyDef[] {
  const mine = [w1(w), w2(w), w3(w)];
  const un = (pool: string[]) => pool.filter((x) => !mine.includes(x));
  const mk = (who: AllyDef['who'], creature: string): AllyDef => ({ who, name: ALLY_NAMES[who], creature, power: ALLY_POWER[who] });
  return [mk('pipwick', un(W2S)[0]), mk('oracle', mine.includes('tickraith') ? un(W1S)[0] : 'tickraith'), mk('ayla', un(W3S)[0])];
}

function finCfg(w: W, extra: FinCfg = {}): FinCfg {
  return { own: own(w), g: gid(w), milo: !!w.state.flags.w3_stayed, allies: finalAllies(w), ...extra };
}

/** The party each fight is fought with. The guardian sits out the first; Flamora joins after it. */
function partyFor(w: W, foe: string): string[] {
  const o = own(w);
  if (foe === 'gr1') return o;
  if (foe === 'gr4') return [...o.map((id) => 'x_' + id), 'gd_' + gid(w)];
  return [...o, 'gd_' + gid(w), 'flamora'];
}

/** The Game Boy swipe, then the battle (the fights hand over to each other from there). */
async function fight(w: W, foe: 'gr1' | 'gr2' | 'gr3' | 'gr4', extra: FinCfg = {}) {
  w.set('w6_stage', foe);
  w.save();
  w.music(null);
  w.sfx('charge');
  for (let i = 0; i < 3; i++) {
    w.flash(0.9);
    await w.wait(110);
  }
  const s = scene(w);
  const g = w.ui(s.add.graphics()).setDepth(90);
  for (let i = 0; i <= 10; i++) {
    g.clear();
    g.fillStyle(C.black, 1);
    for (let y = 0; y < SH; y += 20) g.fillRect(0, y, SW, Math.round((i / 10) * 20));
    await w.wait(28);
  }
  const party = partyFor(w, foe);
  w.leave('battle', { creature: party[0], enemy: foe, story: true, party, fin: finCfg(w, extra) });
}

/** A card like SPIRIT RECOVERED, for any picture. */
async function joinCard(w: W, key: string, anim: string | null, title: string, name: string, scale = 2) {
  const s = scene(w);
  const shade = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(85).setAlpha(0));
  const ring = w.ui(s.add.image(SW / 2, 104, 'fx_ring').setDepth(86).setScale(0.2).setAlpha(0));
  const sp = w.ui(s.add.sprite(SW / 2, 156, key, 0).setOrigin(0.5, 1).setDepth(87).setScale(scale * 0.5).setAlpha(0));
  if (anim && s.anims.exists(anim)) sp.play(anim);
  const t1 = w.ui(txt(s, SW / 2, 172, title, { outline: true, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  const t2 = w.ui(txt(s, SW / 2, 190, name, { color: C.light, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  await w.tw({ targets: shade, alpha: 0.92, duration: 450 });
  w.sfx('recruit');
  s.tweens.add({ targets: ring, alpha: { from: 1, to: 0 }, scale: 3, duration: 1000, repeat: 1 });
  await w.tw({ targets: sp, alpha: 1, scale, duration: 600, ease: 'Back.easeOut' });
  await w.tw({ targets: [t1, t2], alpha: 1, duration: 450 });
  await w.wait(2000);
  await w.tw({ targets: [shade, ring, sp, t1, t2], alpha: 0, duration: 500 });
  [shade, ring, sp, t1, t2].forEach((o) => o.destroy());
}

/** Somebody walks out of the elevator (top left) to a spot on the floor. */
async function fromLift(w: W, id: string, look: string, tx: number, ty: number, ms = 120) {
  w.spawn(id, look, 3, 4, 'down');
  const path: Dir[] = [];
  let x = 3;
  let y = 4;
  while (y < 8) {
    path.push('down');
    y++;
  }
  while (x < tx) {
    path.push('right');
    x++;
  }
  while (y < ty) {
    path.push('down');
    y++;
  }
  while (y > ty) {
    path.push('up');
    y--;
  }
  w.prop('lift')?.setTexture('p5_lift_open');
  await w.move(id, path, ms);
}

/** The map-name banner that slides in on a new map (the montage names places itself). */
function noBanner(w: W) {
  scene(w).time.delayedCall(300, () => (w.dialog as unknown as { bannerC?: Phaser.GameObjects.Container }).bannerC?.setVisible(false));
}

/** Shrink-wrap of a sprite that hovers (the guardian, Flamora) in the world. */
function hover(w: W, o: Phaser.GameObjects.Sprite, amp = 2) {
  scene(w).tweens.add({ targets: o, y: o.y - amp, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

// ================================================================== scripts

const FIGHTS: Record<string, Script> = {
  /** End of Part One's cliffhanger: the guardian hears her, and goes. Then: him. */
  async w6_begin(w, arg?: { rp?: Phaser.GameObjects.Sprite; unglow?: () => void }) {
    const s = scene(w);
    let rp = arg?.rp;
    let unglow = arg?.unglow;
    if (!rp) {
      // picking up again after closing the game
      w.remove('reaper');
      w.setDark(0.8, 0);
      w.music('menace');
      rp = w.sprite('ow_reaper', px(12), py(9), py(9) + 1).setOrigin(0.5, 1).setScale(1.5).setFrame(4);
      unglow = glow(w, rp, 46);
    }
    const off = bars(w);
    await camPx(w, (px(12) + w.player.sprite.x) / 2, py(8), 600, 1.5);
    // a cry, so faint you almost miss it
    await w.wait(600);
    w.sfx('cry');
    await w.say('Somewhere close, so faint you almost miss it: a cry. High, and hurt.');
    const g = w.actor(G);
    // its sprite is drawn facing left: flipped, it faces right
    const faceTo = (o: Phaser.GameObjects.Sprite, x: number) => o.setFlipX(x > o.x);
    if (g) {
      faceTo(g.sprite, px(15));
      await w.emote(G, '!', 800);
    }
    await w.say(`${gName(w)}'s head snaps toward the empty cell. The one with the grey feather on the floor.`);
    if (g) {
      faceTo(g.sprite, w.player.sprite.x);
      await w.emote(G, '?', 900);
    }
    await w.say(`It looks at you. It will not go unless you tell it to.`);
    await w.ask('', ['GO. FIND HER.', '(NOD)']);
    gSound(w);
    if (g) {
      faceTo(g.sprite, px(15));
      await w.tw({ targets: g.sprite, x: px(15), y: py(8), duration: 700, ease: 'Sine.easeIn' });
      await w.tw({ targets: g.sprite, alpha: 0, duration: 400 });
    }
    w.set('w5_g_away');
    w.refresh();
    w.sfx('whoosh');
    await w.say(`${gName(w)} melts into the dark of the empty cell. It is just you now. You and your three spirits.`);
    // he lets it go: he does not care about one guardian
    rp.setFrame(1);
    w.sfx('ghost');
    await camPx(w, px(12), py(9) - 30, 900, 2.4);
    await w.say('...Let it run.', REAPER, { pitch: P_R });
    await w.say('I have collected souls since before your island had a name. Guardians. Gods. Kings.', REAPER, { pitch: P_R });
    await w.say('Tonight I collect three small spirits, and one very stupid child.', REAPER, { pitch: P_R });
    rp.setFrame(2);
    w.sfx('slice');
    w.shake(500, 0.01);
    await off();
    // the fight begins (no chapter card: this is still the prison, still the same night)
    const blk = blackout(w, 0, 90);
    await w.tw({ targets: blk, alpha: 1, duration: 900 });
    w.music(null);
    w.sfx('boom');
    const card = await bigWords(w, 'THE GOD OF DEATH', undefined, 2000);
    card();
    unglow?.();
    rp.destroy();
    w.set('w6_part2');
    await fight(w, 'gr1');
    void s;
  },

  /** He is beaten... and comes back bigger. The guardian finds Flamora. */
  async after_gr1(w, result) {
    if (result !== 'victory') return;
    const s = scene(w);
    w.set('w6_stage', 'gr1_done');
    w.save();
    await SCRIPTS.w6_flamora(w);
    void s;
  },

  async w6_flamora(w) {
    const s = scene(w);
    w.music(null);
    w.setDark(0.75, 0);
    const r = w.actor('reaper');
    r?.sprite.setTexture('ow_reaper_buff', 6).setScale(1.6);
    const rs = r?.sprite;
    await w.wait(500);
    const off = bars(w);
    if (rs) {
      await camPx(w, rs.x, rs.y - 30, 900, 2.2);
      w.sfx('roar');
      w.shake(900, 0.012);
      await w.say('The thing at the end of the hall is not floating any more. It STANDS. The floor cracks under it.');
      rs.setFrame(1);
      w.sfx('creak');
      await w.wait(500);
      await w.say("It flexes. Something in the robe goes RRRIP.");
      await w.say('Take your time. Catch your breath. I want you to see this coming.', REAPER, { pitch: P_R - 20 });
    }
    // a light in the empty cell
    w.sfx('chime');
    await camPx(w, px(15), py(4), 1300, 2.2);
    const fl = w.sprite('ow_flamora_dim', px(15), py(5), py(5)).setOrigin(0.5, 1).setScale(0.9).setAlpha(0.7);
    // beside her in the cell, facing her
    const gd = w.sprite(gKey(w), px(14), py(6), py(6)).setOrigin(0.5, 1).setFlipX(true).setFrame(0);
    const l = { x: px(15), y: py(4), r: 10 };
    w.extraLights.push(l);
    await w.say(`Behind the bars of the empty cell, a faint glow. ${gName(w)} has found her.`);
    await w.say('FLAMORA. Grey as ash and barely there, curled up on the cold floor. The feather was hers. She has been here all along.');
    await w.emote('player', '!', 900);
    // the guardian heals her: it gives her its own light, breath by breath
    gd.setFrame(2);
    gSound(w);
    for (let i = 0; i < 5; i++) {
      w.sfx('heal');
      const rg = w.sprite('fx_ring', px(15), py(4) - 4, 9600).setScale(0.2).setAlpha(0.9);
      s.tweens.add({ targets: rg, scale: 1.2 + i * 0.3, alpha: 0, duration: 800, onComplete: () => rg.destroy() });
      await w.tw({ targets: fl, alpha: 0.7 + i * 0.06, duration: 400 });
      l.r = 10 + i * 9;
      await w.wait(380);
    }
    await w.say(`${gName(w)} breathes on her, slow and steady, the way you would blow on a tiny fire to keep it alive.`);
    // she catches
    w.sfx('boom');
    w.flash(0.9);
    fl.setTexture('ow_flamora', 0).setAlpha(1).setScale(1);
    fl.play('ow_flamora_idle');
    l.r = 60;
    w.sfx('cry');
    w.shake(600, 0.006);
    await w.wait(700);
    await w.say('Light pours back into her, feather by feather. Flamora lifts her head.');
    // the bars go
    w.sfx('crash');
    w.shake(500, 0.014);
    w.setGround(15, 7, T.W5_HIGH);
    w.setGround(16, 7, T.W5_HIGH);
    w.refresh();
    for (let i = 0; i < 8; i++) {
      const b = w.image('fx_px', px(15) + 8 + (Math.random() - 0.5) * 24, py(7) - 6, 9500).setScale(2);
      s.tweens.add({ targets: b, x: b.x + (Math.random() - 0.5) * 40, y: b.y + 20 + Math.random() * 20, alpha: 0, duration: 600, onComplete: () => b.destroy() });
    }
    await w.say('The bars of the cell blow outward like paper.');
    // both of them, to you
    const to = { x: w.player.sprite.x - 20, y: w.player.sprite.y + 2 };
    await camPx(w, (px(15) + to.x) / 2, py(7), 900, 1.6);
    // both of them turn to face the way they are going
    gd.setFlipX(to.x + 4 > gd.x);
    fl.setFlipX(to.x - 18 > fl.x);
    await Promise.all([
      w.tw({ targets: fl, x: to.x - 18, y: to.y - 10, duration: 1300, ease: 'Sine.easeInOut', onUpdate: () => fl.setDepth(fl.y) }),
      w.tw({ targets: gd, x: to.x + 4, y: to.y + 6, duration: 1300, ease: 'Sine.easeInOut', onUpdate: () => gd.setDepth(gd.y) }),
    ]);
    hover(w, fl);
    l.x = fl.x;
    l.y = fl.y - 20;
    await joinCard(w, 'ow_flamora', 'ow_flamora_idle', 'FLAMORA JOINS THE FIGHT', 'THE OVERSEER OF ALL SPIRITS', 1.2);
    await joinCard(w, 'cr_gd_' + gid(w), `cr_gd_${gid(w)}_idle`, 'THE GUARDIAN JOINS THE FIGHT', getCreature('gd_' + gid(w)).name, 1);
    await w.say('Five of you now. Your three, the guardian, and Flamora.');
    // he does not like that at all
    if (rs) {
      await camPx(w, rs.x, rs.y - 30, 800, 2);
      rs.setFrame(6);
      w.sfx('roar');
      w.shake(1000, 0.016);
      await w.say('GOOD. MORE OF YOU TO BREAK.', REAPER, { pitch: P_R - 20 });
      rs.setFrame(2);
    }
    await off();
    w.set('w5_g_away', false);
    gd.destroy();
    fl.destroy();
    w.extraLights = w.extraLights.filter((x) => x !== l);
    await fight(w, 'gr2');
  },

  /** He is gone. The silence, then everybody. */
  async after_gr4(w, result) {
    if (result !== 'victory') return;
    w.set('w6_won');
    w.set('w6_stage', 'won');
    w.set('w5_g_away', false);
    w.save();
    await SCRIPTS.w6_after(w);
  },
};

// ================================================================== the end of it

const END: Record<string, Script> = {
  async w6_after(w) {
    const s = scene(w);
    w.music(null);
    cut(w, 'p_high', 14, 9, 'left');
    w.setDark(0.55, 0);
    await w.wait(400);
    const off = bars(w);
    await camPx(w, px(13), py(8), 0, 1.6);
    // where he was
    const crown = w.sprite('fb_crown', px(11), py(9) + 2, py(9)).setOrigin(0.5, 1).setScale(0.5).setAngle(-70);
    await w.wait(2600);
    w.sfx('water');
    await w.say('The hall is very, very quiet. Somewhere far away, water drips.');
    await w.wait(1200);
    await w.say('Where he stood, there is nothing. Only his crown, lying on its side.');
    for (const id of ['follower', 'follower2', G]) void w.emote(id, '...', 1200);
    await w.wait(1800);
    await w.say('The light has gone out of your spirits. They are themselves again: tired, and very proud of themselves.');
    // the helpers come back in, very carefully
    w.prop('lift')?.setTexture('p5_lift_open');
    w.sfx('bell');
    await camPx(w, px(6), py(7), 900, 1.6);
    w.spawn('ayla', 'ayla', 3, 5, 'down');
    await w.move('ayla', ['down', 'down', 'right'], 260);
    await w.say('Is...', AYLA, { pitch: P_AYLA });
    w.spawn('pip', 'inventor', 3, 5, 'down');
    await w.move('pip', ['down', 'down'], 260);
    await w.say('Is he actually dead?', PIP, { pitch: P_PIP });
    w.spawn('ora', 'psychic', 4, 5, 'down');
    await w.move('ora', ['down'], 260);
    await w.say('Did we really do it?', ORA, { pitch: P_ORA });
    await w.say('...I genuinely did not see this coming.', ORA, { pitch: P_ORA - 40 });
    await w.wait(900);
    await w.emote('player', 'heart', 900);
    // and then everybody
    w.sfx('cheer');
    w.music('fin_celebrate');
    w.setDark(0.25, 1500);
    w.flash(0.6);
    await w.say('YESSSSS!', AYLA, { pitch: P_AYLA + 80 });
    await off();
    await SCRIPTS.w6_party(w);
    void crown;
    void s;
  },

  /** Everybody, from everywhere. */
  async w6_party(w) {
    const st = w.state.flags;
    const milo = !!st.w3_stayed;
    // they spill out of the elevator in a steady stream
    const crowd: [string, string, number, number][] = [
      ['assist', 'assistant', 6, 9],
      ['mayor', 'mayor', 7, 10],
      ['farmer', 'farmer', 5, 10],
      ['mabel', 'old_lady', 8, 8],
      ['gerald', 'gerald', 9, 10],
      ['luke', 'luke', 10, 8],
      ['grace', 'grace', 11, 8],
      ['biggs', 'mayor2', 10, 10],
      ['maddie', 'maddie', 12, 10],
      ['roxie', 'roxie', 13, 10],
      ['ava', 'avalena_bar', 18, 8],
      ['bouncer', 'bouncer', 19, 10],
      ['teddy', 'guide', 20, 8],
      ['frofro', 'frofro', 21, 10],
    ];
    if (milo) crowd.push(['milo', 'milo', 22, 8]);
    await camPx(w, px(12), py(8), 900, 1.05);
    const walks: Promise<void>[] = [];
    for (let i = 0; i < crowd.length; i++) {
      const [id, look, x, y] = crowd[i];
      walks.push(fromLift(w, id, look, x, y, 70));
      w.sfx('step');
      await w.wait(260);
    }
    // the helpers move up too
    walks.push(w.move('ayla', ['down', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'], 90));
    walks.push(w.move('pip', ['right', 'right', 'right', 'right', 'right', 'right', 'right'], 90));
    walks.push(w.move('ora', ['down', 'right', 'right', 'right', 'right', 'right', 'right'], 90));
    await Promise.all(walks);
    w.prop('lift')?.setTexture('p5_lift');
    for (const [id] of crowd) w.faceTo(id, 'player');
    for (const id of ['ayla', 'pip', 'ora']) w.faceTo(id, 'player');
    w.sfx('cheer');
    await camPx(w, px(12), py(9), 600, 1.4);

    // everyone has something to say
    await w.say('I TOLD YOU! Did I not tell you? I told EVERYBODY!', PIP, { pitch: P_PIP });
    await w.say('Good deeds come back around. Mine came back with the whole town and a submarine.', PIP, { pitch: P_PIP });
    await w.say('On behalf of the Mayor of Hollowhaven...', "MAYOR'S ASSISTANT", { pitch: 1100 });
    w.sfx('bark');
    await w.say('WOOF.', 'THE MAYOR', { pitch: 1300 });
    await w.say('...he says thank you. And that he would like a snack.', "MAYOR'S ASSISTANT", { pitch: 1100 });
    await w.say('I foresaw ALL of this.', ORA, { pitch: P_ORA });
    await w.say('You literally just said you did not.', "MAYOR'S ASSISTANT", { pitch: 1100 });
    await w.say('I foresaw you saying that.', ORA, { pitch: P_ORA });
    await w.say("Saltwash declares today a holiday! ...Again! I'm told we have too many of those.", 'MAYOR BIGGS', { pitch: 640 });
    await w.say('We are putting your face on a t-shirt.', 'LUKE', { pitch: 760 });
    await w.say('Half price.', 'GRACE', { pitch: 880 });
    await w.say("You saved everybody. Again. I'm making you a pie. A big one. You can't stop me.", 'MADDIE', { pitch: 1000 });
    await w.say("You're on the list now. Forever. That's what the FOREVER in Club Forever means.", 'BOUNCER', { pitch: 420 });
    await w.say('I am painting this. All of it. Except the bit where I hid behind Teddy.', 'AVALENA', { pitch: P_AVA });
    if (milo) await w.say("...I'm glad I stayed. I'm glad I got to see this.", 'MILO', { pitch: P_MILO });
    else await w.say('Milo sent a postcard from wherever he went. It just says SORRY. Forty times. Small handwriting.', AYLA, { pitch: P_AYLA });
    await w.say('Group hug! ...I am only checking your pockets a LITTLE.', AYLA, { pitch: P_AYLA });
    await w.say("KIDDING. I don't do that any more. Mostly.", AYLA, { pitch: P_AYLA });

    // and the one who ran
    w.prop('lift')?.setTexture('p5_lift_open');
    w.sfx('bell');
    await camPx(w, px(6), py(7), 700, 1.5);
    w.spawn('friend', friendSprite(w), 3, 5, 'down');
    await w.move('friend', ['down', 'down', 'down', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'], 110);
    w.prop('lift')?.setTexture('p5_lift');
    w.faceTo('friend', 'player');
    await camPx(w, px(13), py(9), 600, 1.5);
    if (friendName(w) === 'CARLO') {
      await w.say('I CAME BACK! I was not scared!', 'CARLO', { pitch: friendPitch(w) });
      await w.say('...I was VERY scared. I rode that elevator up and down nine times. But I came back!', 'CARLO', { pitch: friendPitch(w) });
    } else {
      await w.say('Took the elevator down. Had a sit. Came back up.', 'OLD MAN', { pitch: friendPitch(w) });
      await w.say('At my age, that is an act of tremendous courage. Well done, kid. Truly.', 'OLD MAN', { pitch: friendPitch(w) });
    }
    await SCRIPTS.w6_goodbye(w);
  },

  /** Flamora, the guardian, and you. */
  async w6_goodbye(w) {
    const s = scene(w);
    const off = bars(w);
    // Flamora rises over everybody
    const fl = w.sprite('ow_flamora', px(13), py(7), 9300).setOrigin(0.5, 1).setAlpha(0);
    fl.play('ow_flamora_idle');
    const l = { x: px(13), y: py(6), r: 70 };
    w.extraLights.push(l);
    w.sfx('cry');
    await w.tw({ targets: fl, alpha: 1, y: py(6), duration: 1400, ease: 'Sine.easeOut' });
    hover(w, fl, 3);
    await camPx(w, px(13), py(6), 900, 1.8);
    await w.say('The room goes quiet. Flamora rises over everybody, bright again: brighter than you have ever seen her.');
    await w.say('She does not speak. She never does. But the warmth that fills the hall says it for her.');
    // her vision: every spirit he took, going home
    const wash = w.ui(s.add.rectangle(0, 0, SW, SH, C.white).setOrigin(0, 0).setDepth(85).setAlpha(0));
    await w.tw({ targets: wash, alpha: 0.6, duration: 600 });
    for (let i = 0; i < 16; i++) {
      const o = w.ui(s.add.image(SW / 2 + (Math.random() - 0.5) * 60, SH + 10, 'fx_soul').setDepth(86).setAlpha(0.9));
      s.tweens.add({ targets: o, y: -20, x: o.x + (Math.random() - 0.5) * 300, duration: 2400 + Math.random() * 1200, delay: i * 120, onComplete: () => o.destroy() });
    }
    await w.say('In your head, a picture: thousands of little lights, every soul he ever took, drifting home across the sea.');
    await w.tw({ targets: wash, alpha: 0, duration: 700 });
    wash.destroy();
    // the guardian
    await camPx(w, w.player.sprite.x, w.player.sprite.y - 10, 900, 2.4);
    const g = w.actor(G);
    if (g) {
      await w.move(G, [g.x < w.player.x ? 'right' : 'left'], 300).catch(() => undefined);
      w.faceTo(G, 'player');
    }
    w.faceTo('player', G);
    w.music(null);
    await w.wait(800);
    await w.say(`${gName(w)} walks up to you. Everybody else goes quiet.`);
    await w.say('It has walked beside you through every floor of this prison. It tore the bars open for you. It never once fought for itself.');
    await w.say('Its island is waiting. With the Reaper gone, it is free to go home. You both know it.');
    if (g) {
      g.sprite.setFrame(2);
      gSound(w);
    }
    await w.wait(600);
    await w.say('It lowers its head... and presses it against your forehead. Warm. Steady. For a long time.');
    await w.emote(G, 'heart', 1400);
    await w.emote('player', 'heart', 1400);
    await w.ask('', ['THANK YOU.', '(HUG IT)']);
    w.sfx('purr');
    await w.say('It stays exactly where it is for as long as you need it to. And then it stays a little longer.');
    await w.wait(700);
    await w.say(`Then ${gName(w)} looks up at Flamora... and back at you. It is not leaving. Not tonight.`);
    gSound(w);
    w.music('fin_celebrate');
    w.sfx('cheer');
    w.flash(0.5);
    await w.say("Tonight, there's a party.");
    await off();
    w.extraLights = w.extraLights.filter((x) => x !== l);
    // into the credits
    w.set('w6_credits');
    w.save();
    const blk = blackout(w, 0, 90);
    await w.tw({ targets: blk, alpha: 1, duration: 1600 });
    w.music(null);
    w.leave('credits', { creature: w.state.creature, world: 6 });
    void fl;
  },

  /** After the credits: every world, better than you found it. */
  async w6_montage(w) {
    const s = scene(w);
    w.musicOverride = 'fin_montage';
    w.music('fin_montage');
    const blk = blackout(w, 1, 90);
    const caption = (a: string, b: string) => {
      const t1 = w.ui(txt(s, SW / 2, SH - 62, a, { outline: true, origin: [0.5, 0] }).setDepth(91).setAlpha(0));
      const t2 = w.ui(txt(s, SW / 2, SH - 44, b, { color: C.light, origin: [0.5, 0] }).setDepth(91).setAlpha(0));
      const bg = w.ui(s.add.rectangle(0, SH - 70, SW, 46, C.black, 0.7).setOrigin(0, 0).setDepth(90).setAlpha(0));
      s.tweens.add({ targets: [t1, t2, bg], alpha: 1, duration: 700, delay: 500 });
      return () => [t1, t2, bg].forEach((o) => o.destroy());
    };
    const scenes: { map: string; x: number; y: number; to: [number, number]; title: string; sub: string; people: [string, number, number][] }[] = [
      {
        map: 'town', x: 47, y: 40, to: [52, 36], title: 'HOLLOWHAVEN', sub: 'The fog never came back. The mayor is still a dog.',
        people: [['mayor', 47, 39], ['assistant', 48, 39], ['farmer', 45, 41], ['old_lady', 50, 41], ['psychic', 52, 38]],
      },
      {
        map: 'isl', x: 48, y: 70, to: [52, 64], title: 'SALTWASH', sub: "The water went down. Pipwick's new inventions are MOSTLY safe.",
        people: [['inventor', 48, 69], ['luke', 50, 70], ['grace', 51, 70], ['mayor2', 46, 68], ['maddie', 53, 66]],
      },
      {
        map: 'w3_isl', x: 50, y: 68, to: [54, 62], title: 'BACCHUS KEY', sub: 'Club Forever: donuts, froyo, and far fewer last shots.',
        people: [['ayla', 50, 67], ['avalena_bar', 52, 68], ['bouncer', 48, 66], ['frofro', 53, 65], ['guide', 47, 69], ...(w.state.flags.w3_stayed ? ([['milo', 55, 66]] as [string, number, number][]) : [])],
      },
    ];
    for (const sc of scenes) {
      cut(w, sc.map, sc.x, sc.y, 'up');
      noBanner(w);
      hideParty(w);
      w.hide('follower2');
      w.music('fin_montage');
      w.setDark(0.12, 0);
      sc.people.forEach(([look, x, y], i) => {
        const a = w.spawn('m' + i, look, x, y, i % 2 ? 'left' : 'down');
        void a;
      });
      await camPx(w, px(sc.x), py(sc.y), 0, 1.2);
      await w.tw({ targets: blk, alpha: 0, duration: 700 });
      const rm = caption(sc.title, sc.sub);
      sc.people.forEach((_, i) => {
        if (i % 2 === 0) void w.emote('m' + i, 'heart', 900);
      });
      await camPx(w, px(sc.to[0]), py(sc.to[1]), 4200, 1.3);
      await w.tw({ targets: blk, alpha: 1, duration: 700 });
      rm();
    }
    // the forgotten island, remembered
    cut(w, 'w4_isl', 40, 40, 'up');
    noBanner(w);
    hideParty(w);
    w.hide('follower2');
    w.music('fin_montage');
    const isl = w.map;
    const sx = isl.spawn.x;
    const sy = isl.spawn.y;
    w.spawn('mf', friendSprite(w), sx, sy - 2, 'down');
    const gd = w.sprite(gKey(w), px(sx + 2), py(sy - 2), py(sy - 2)).setOrigin(0.5, 1).setFlipX(true);
    const fl = w.sprite('ow_flamora', px(sx - 2), py(sy - 4), 9300).setOrigin(0.5, 1).setScale(0.8);
    fl.play('ow_flamora_idle');
    hover(w, fl);
    await camPx(w, px(sx), py(sy - 2), 0, 1.3);
    w.setDark(0.2, 0);
    await w.tw({ targets: blk, alpha: 0, duration: 700 });
    let rm = caption('THE FORGOTTEN ISLAND', 'Not forgotten any more. It has its guardian back.');
    await camPx(w, px(sx), py(sy - 8), 4200, 1.4);
    await w.tw({ targets: blk, alpha: 1, duration: 700 });
    rm();
    void gd;
    // the prison: every cell open
    cut(w, 'p_high', 14, 9, 'left');
    noBanner(w);
    hideParty(w);
    w.hide('follower2');
    w.music('fin_montage');
    w.setDark(0.3, 0);
    await camPx(w, px(14), py(6), 0, 1.2);
    await w.tw({ targets: blk, alpha: 0, duration: 700 });
    rm = caption("THE REAPER'S PRISON", 'Every cell door open. Every soul gone home.');
    await camPx(w, px(18), py(7), 3600, 1.3);
    await w.tw({ targets: blk, alpha: 1, duration: 900 });
    rm();
    // THE END
    w.musicOverride = null;
    w.music(null);
    await w.wait(600);
    w.sfx('victory');
    const end = await bigWords(w, 'THE END', undefined, 3200);
    await w.wait(800);
    end();
    await w.wait(1800);
    await SCRIPTS.w6_cat(w, { blk });
  },

  /** ...and the cat. */
  async w6_cat(w, arg?: { blk?: Phaser.GameObjects.Rectangle }) {
    const s = scene(w);
    const blk = arg?.blk ?? blackout(w, 1, 90);
    // the empty hall, late at night
    cut(w, 'p_high', 3, 4, 'down');
    noBanner(w);
    hideParty(w);
    w.hide('follower2');
    w.musicOverride = 'none';
    w.music(null);
    w.setDark(0.8, 0);
    w.remove('reaper');
    const crown = w.sprite('fb_crown', px(13), py(9) + 2, py(9)).setOrigin(0.5, 1).setScale(0.5).setAngle(-70);
    const cl = { x: px(13), y: py(9) - 6, r: 44 };
    w.extraLights.push(cl);
    await camPx(w, px(13), py(8), 0, 2);
    await w.wait(800);
    await w.tw({ targets: blk, alpha: 0, duration: 2400 });
    await w.wait(2400);
    // footsteps far too small to be a person's
    w.sfx('step');
    await w.wait(500);
    w.sfx('step');
    await w.wait(700);
    const cat = catAt(w, 20, 9, 2, false);
    cat.setFlipX(false);
    w.music('fin_cat');
    await w.tw({ targets: cat, x: px(14) + 4, duration: 2600, ease: 'Linear', onUpdate: () => cat.setDepth(cat.y) });
    cat.setFrame(0);
    await w.wait(900);
    // it sniffs the crown
    await w.tw({ targets: cat, x: cat.x - 4, duration: 400 });
    w.sfx('purr');
    await w.wait(1400);
    await w.tw({ targets: crown, angle: 0, x: crown.x + 2, duration: 500, ease: 'Back.easeOut' });
    w.sfx('clank');
    await w.wait(1200);
    // its shadow on the wall is not a cat's shadow
    const wl = { x: px(13), y: py(4), r: 0 };
    w.extraLights.push(wl);
    s.tweens.add({ targets: wl, r: 110, duration: 2400 });
    const sh = w.sprite('fin_catshadow', px(13), py(7) - 2, py(6) - 1).setOrigin(0.5, 1).setScale(0.42).setAlpha(0).setTint(0x000000);
    // (high enough to see the top of it: the ears, and the crown)
    await camPx(w, px(13), py(4) - 2, 2600, 1.5);
    w.sfx('heartbeat');
    await w.tw({ targets: sh, alpha: 0.85, duration: 2600 });
    await w.wait(2000);
    w.sfx('heartbeat');
    await w.wait(1600);
    // the eyes
    w.music(null);
    await w.tw({ targets: blk, alpha: 1, duration: 300 });
    const eyes = w.ui(s.add.sprite(SW / 2, SH / 2, 'fin_cateyes', 2).setDepth(95).setAlpha(0).setScale(0.9));
    await w.wait(1400);
    eyes.setAlpha(1);
    for (const [fr, ms] of [[1, 260], [0, 1800], [1, 90], [2, 120], [1, 90], [0, 1400], [3, 1600]] as [number, number][]) {
      eyes.setFrame(fr);
      if (fr === 3) w.sfx('ghost');
      await w.wait(ms);
    }
    eyes.setFrame(2);
    await w.wait(140);
    eyes.destroy();
    // and nothing after
    w.musicOverride = null;
    w.set('w6_done');
    w.save();
    sh.destroy();
    cat.destroy();
    crown.destroy();
    w.extraLights = w.extraLights.filter((x) => x !== cl && x !== wl);
    await w.wait(6000);
    // (any key, much later: the world again, quietly)
    await new Promise<void>((done) => {
      w.keyHook = () => {
        w.keyHook = null;
        done();
      };
    });
    w.leave('world', {});
  },
};

// ================================================================== the prison, afterwards

const HOOKS: Record<string, Script> = {
  async decorate_p_high(w) {
    await W5_UPPER.decorate_p_high(w);
    const st = String(w.state.flags.w6_stage ?? '');
    if (f(w, 'w6_won')) {
      w.remove('reaper');
      // the cell doors stay open (Flamora's too)
      w.setGround(15, 7, T.W5_HIGH);
      w.setGround(16, 7, T.W5_HIGH);
    } else if (st && st !== 'gr1') {
      const r = w.actor('reaper');
      r?.sprite.setTexture('ow_reaper_buff', 0).setScale(1.6);
    }
  },

  /** Closing the game in the middle of the end of the world: back to the same moment. */
  async resume_world5(w) {
    const fl = w.state.flags;
    if (fl.w6_done) return;
    if (fl.w6_credits) return void w.leave('credits', { creature: w.state.creature, world: 6 });
    if (fl.w6_won) return SCRIPTS.w6_after(w);
    const st = String(fl.w6_stage ?? '');
    if (st === 'gr1_done') return SCRIPTS.w6_flamora(w);
    if (st === 'gr1' || st === 'gr2' || st === 'gr4') return fight(w, st);
    if (st === 'gr3') return fight(w, 'gr3', { sec: Number(fl.w6_sec ?? 0), seen: true });
    if (fl.w5_reaper_met && !fl.w6_part2) return SCRIPTS.w6_begin(w);
    return W5_PRISON.resume_world5(w);
  },

  async p5_emptycell(w) {
    if (f(w, 'w6_won')) return w.say("Flamora's cell. Empty for real now. Even the feather is gone.");
    return W5_UPPER.p5_emptycell(w);
  },
};

// ================================================================== developer tests

const DEV: Record<string, Script> = {
  async dev_w6_gr1(w) {
    await w.wait(300);
    await fight(w, 'gr1');
  },
  async dev_w6_gr2(w) {
    await w.wait(300);
    await fight(w, 'gr2');
  },
  async dev_w6_gr3(w) {
    await w.wait(300);
    await fight(w, 'gr3', { sec: Number(w.state.flags.w6_sec ?? 0), seen: !!w.state.flags.w6_sec });
  },
  async dev_w6_near(w) {
    await w.wait(300);
    await fight(w, 'gr3', { near: Number(w.state.flags.w6_near ?? 1), seen: true });
  },
  async dev_w6_gr4(w) {
    await w.wait(300);
    await fight(w, 'gr4');
  },
  async dev_w6_credits(w) {
    w.set('w6_won');
    w.set('w6_credits');
    w.save();
    w.leave('credits', { creature: w.state.creature, world: 6 });
  },
};

export const W6_FINAL: Record<string, Script> = { ...FIGHTS, ...END, ...HOOKS, ...DEV };
void w1;
void w2;
void w3;
