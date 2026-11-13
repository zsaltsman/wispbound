import Phaser from 'phaser';
import type { Script, W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, bars, blackout, cut, titleCard, pop } from './w2_fx';
import { C } from '../ui/ui';
import { T } from '../world/tiles';
import { P1, P2 } from '../world/maps/w5maps';
import { floorOpen } from './w5_state';
import { f, px, py, G, gKey, gName, gid, gSound, w1, w2, w3, crName, spiritRecovered, useLift, setBadge, friendName } from './w5_fx';

// The final world, part one: waking in the cell, the slop, the guardian breaking out,
// the cell block, your Titan cub in the specimen cell, the elevator, and the Skeleton
// Warden.

const NW = 'NIGHT WARDEN';
const P_NW = 700;
const WARDEN = 'THE WARDEN';
const P_WARDEN = 330;

/** Bars torn open stay torn open: re-applied every time the floor loads. */
function tearBars(w: W, x0: number, y: number) {
  for (let x = x0; x < x0 + 5; x++) w.setGround(x, y, T.W5_BARS_BROKEN);
}

/** A burst of iron and dust where bars give way. */
async function smash(w: W, x: number, y: number) {
  const s = scene(w);
  w.sfx('crash');
  w.sfx('creakmetal');
  w.shake(500, 0.014);
  w.flash(0.5);
  for (let i = 0; i < 10; i++) {
    const d = s.add.rectangle(px(x) + Phaser.Math.Between(-20, 20), py(y) - 8, 2, 2, i % 2 ? C.light : C.mid).setDepth(py(y) + 4);
    w.worldLayer.add(d);
    s.tweens.add({ targets: d, x: d.x + Phaser.Math.Between(-30, 30), y: d.y + Phaser.Math.Between(-24, 18), alpha: 0, duration: 700, onComplete: () => d.destroy() });
  }
  await w.wait(300);
}

// ================================================================== the wake-up

const WAKE: Record<string, Script> = {
  async w5_start(w) {
    w.set('w5_started');
    w.set('w4_carlo_follow', false);
    w.set('w4_old_follow', false);
    w.save();
    w.music(null);
    const black = await titleCard(w, '', "THE REAPER'S PRISON", 2800, true);
    cut(w, 'p_cells', P1.wake.x, P1.wake.y, 'down');
    w.save();
    await SCRIPTS.w5_wake(w, black);
  },

  decorate_p_cells(w) {
    setBadge(w, null);
    if (f(w, 'w5_free')) {
      tearBars(w, 1, 5);
      tearBars(w, 1, 9);
    } else {
      const g = w.spawn('g_sleep', 'raw:' + gKey(w), P1.gCell.x, P1.gCell.y, 'right');
      g.sprite.stop().setFrame(3);
    }
    if (f(w, 'w5_got3')) tearBars(w, 25, 9);
    else w.spawn('spec_cr', 'raw:ch_mini_' + w3(w), P1.specimen.x, P1.specimen.y, 'up');
    return Promise.resolve();
  },

  /** You wake up alone. The slop. Then the guardian. */
  async w5_wake(w, cover?: Phaser.GameObjects.Rectangle | null) {
    const s = scene(w);
    if (w.map.id !== 'p_cells') cut(w, 'p_cells', P1.wake.x, P1.wake.y, 'down');
    w.music(null);
    const b = cover ?? blackout(w, 1, 80);
    w.face('player', 'down');
    await w.wait(900);
    w.sfx('drip');
    await w.wait(1100);
    w.sfx('drip');
    await w.wait(700);
    await w.tw({ targets: b, alpha: 0, duration: 2600 });
    b.destroy();
    await w.emote('player', '...', 1300);
    await w.say('Cold stone. Iron bars. A bucket in the corner.');
    await w.say('Your creatures are gone. Nobody answers when you call.');
    // across the corridor: the guardian, chained, asleep
    const off = bars(w);
    await w.camPan(P1.gCell.x, P1.gCell.y - 1, 1600, 2);
    w.sfx('chain');
    await w.wait(700);
    await w.say(`Across the corridor, in the opposite cell: ${gName(w)}. Chained to the floor. It does not move.`);
    await w.camReturn(900);
    // footsteps from the east: supper
    w.sfx('step');
    await w.wait(400);
    w.sfx('step');
    w.spawn('nw', 'slopwarden', 14, P1.hatch.y, 'left');
    const keys = s.time.addEvent({ delay: 420, loop: true, callback: () => w.sfx('rattle') });
    await w.move('nw', Array(14 - P1.hatch.x).fill('left'), 230);
    keys.remove();
    w.face('nw', 'up');
    w.sfx('clank');
    await w.say('SUPPER!', NW, { pitch: P_NW });
    const tray = w.sprite('p5_slop', px(P1.hatch.x), py(P1.hatch.y) - 4, py(P1.myBars.y) + 2);
    w.sfx('bump');
    await w.tw({ targets: tray, y: py(P1.myBars.y - 1) + 2, duration: 700, ease: 'Sine.easeOut' });
    await w.move('player', ['down'], 260);
    await w.say('He slides a tray under the bars. It is grey. It is warm. Something in it moved.');
    const pick = await w.ask('What do you do?', ['EAT THE SLOP', 'REFUSE THE SLOP']);
    if (pick === 0) {
      w.set('w5_ate');
      w.sfx('drip');
      await w.tw({ targets: tray, alpha: 0.4, duration: 600 });
      await w.emote('player', '...', 900);
      await w.say('You eat the slop. It tastes like wet socks and old pennies.');
      w.emote('nw', 'heart', 1000);
      await w.say('GOOD! A CLEAN TRAY! NOBODY EVER GIVES ME A CLEAN TRAY.', NW, { pitch: P_NW });
      await w.say('YOU AND ME ARE GOING TO GET ALONG FINE.', NW, { pitch: P_NW });
    } else {
      w.set('w5_refused');
      w.sfx('bump');
      await w.tw({ targets: tray, y: py(P1.hatch.y) - 4, duration: 400 });
      w.emote('nw', 'anger', 1200);
      await w.say("YOU THINK YOU'RE TOO GOOD FOR THE SLOP?", NW, { pitch: P_NW });
      await w.wait(400);
      await w.say("THAT'S WHAT THEY ALL SAY.", NW, { pitch: P_NW - 120 });
    }
    tray.destroy();
    w.set('w5_slop');
    w.save();
    w.face('nw', 'right');
    const keys2 = s.time.addEvent({ delay: 420, loop: true, callback: () => w.sfx('rattle') });
    await w.move('nw', Array(10).fill('right'), 230);
    keys2.remove();
    w.remove('nw');
    await w.wait(900);
    await SCRIPTS.w5_breakout(w, off);
  },

  /** The guardian wakes, roars and comes through two sets of bars. */
  async w5_breakout(w, offBars?: () => Promise<void>) {
    const s = scene(w);
    const off = offBars ?? bars(w);
    if (!w.actor('g_sleep')) w.spawn('g_sleep', 'raw:' + gKey(w), P1.gCell.x, P1.gCell.y, 'right').sprite.stop().setFrame(3);
    const g = w.actor('g_sleep')!;
    w.sfx('heartbeat');
    await w.camPan(P1.gCell.x, P1.gCell.y - 2, 1000, 2.2);
    await w.wait(700);
    g.sprite.setFrame(4);
    w.sfx('chain');
    await w.wait(700);
    w.emote('g_sleep', '!', 900);
    await w.wait(500);
    g.sprite.setFrame(0);
    w.sfx('rumble');
    w.shake(900, 0.006);
    await w.wait(500);
    // the chain snaps
    g.sprite.setFrame(1);
    gSound(w);
    w.sfx('chain');
    w.shake(1200, 0.016);
    w.flash(0.35);
    await w.wait(1100);
    g.sprite.setFrame(2);
    await w.wait(400);
    // through its own bars
    await w.move('g_sleep', ['up'], 160);
    g.sprite.setFrame(1);
    await w.tw({ targets: g.sprite, y: g.sprite.y - 10, duration: 110, yoyo: true });
    tearBars(w, 1, 9);
    await smash(w, P1.gBars.x, P1.gBars.y);
    await w.move('g_sleep', ['up', 'up', 'up'], 150);
    // the whole block wakes up
    for (const id of ['c_tally', 'c_sailor', 'c_lifer', 'c_ghost', 'c_imp']) w.emote(id, '!', 900);
    await w.camPan(P1.myBars.x, P1.myBars.y, 600, 2.2);
    g.sprite.setFrame(2);
    await w.wait(500);
    g.sprite.setFrame(1);
    gSound(w);
    await w.tw({ targets: g.sprite, y: g.sprite.y - 12, duration: 120, yoyo: true });
    tearBars(w, 1, 5);
    await smash(w, P1.myBars.x, P1.myBars.y);
    w.shake(600, 0.01);
    g.sprite.setFrame(0);
    await w.wait(800);
    await w.say('The bars of your cell fold like paper.');
    await w.move('g_sleep', ['down'], 260);
    g.sprite.setFrame(4);
    w.sfx(gid(w) === 'viperwind' ? 'hiss' : 'purr');
    await w.say(`${gName(w)} lowers its head to the gap, and waits for you.`);
    await w.camReturn(700);
    await off();
    // it walks with you now
    w.remove('g_sleep');
    w.set('w5_free');
    w.save();
    w.respawnParty();
    w.music('w5_prison');
    await w.wait(500);
    await w.say('...WELL. DON\'T LET ME STOP YOU.', 'PRISONER', { pitch: 620 });
    void s;
  },
};

// ================================================================== the cell block

const say1 = async (w: W, who: string, pitch: number, lines: string[]) => {
  for (const l of lines) await w.say(l, who, { pitch });
};

const CELLS: Record<string, Script> = {
  async p1_tally(w) {
    w.face('c_tally', 'up');
    w.sfx('tick');
    await w.wait(300);
    if (!f(w, 'w5_t_tally')) {
      w.set('w5_t_tally');
      await say1(w, 'SKELETON', 400, ['...four thousand and six. Four thousand and seven.', "Don't talk to me. I'll lose count. I've lost count twice already."]);
    } else await say1(w, 'SKELETON', 400, ["Days? No. I'm counting how many times the elevator goes up. Something always comes back down."]);
  },
  async p1_ghost(w) {
    w.faceTo('c_ghost', 'player');
    if (f(w, 'w5_got3')) return say1(w, 'GHOST', 1150, ["You got the specimen out? Oh, the Warden will NOT like that. He loves his paperwork."]);
    await say1(w, 'GHOST', 1150, ["I've been in here since before I died. That's a long story. Actually it's a short one.", "They bring the spirits through here. The strong ones go in the specimen cell at the end. For the Collector."]);
    w.set('w5_heard_collector');
  },
  async p1_imp(w) {
    w.faceTo('c_imp', 'player');
    await w.emote('c_imp', 'note', 600);
    await say1(w, 'IMP', 1350, ["What am I in for? Stealing a sandwich.", "...From HIM. The one in the hood. He didn't even want it. He just doesn't like losing things."]);
  },
  async p1_sailor(w) {
    w.faceTo('c_sailor', 'player');
    await say1(w, 'OLD SAILOR', 600, ["Nobody's ever seen the top floor. They say HE keeps one cell up there for something special.", "Someone special. Someone he's not finished with."]);
  },
  async p1_lifer(w) {
    w.faceTo('c_lifer', 'player');
    if (f(w, 'w5_warden_beaten')) return say1(w, 'LIFER', 520, ['You beat the Warden? ...Then nothing between you and HIM but floors.']);
    await say1(w, 'LIFER', 520, ["The Warden's post is right above us. Four hundred years he's sat at that desk.", "Nobody gets past him. You'll see. Or you won't, and I'll hear about it."]);
  },
  async p1_scrawl(w) {
    await w.say('Scratched deep into the wall, over and over: HE NEVER SPEAKS. HE NEVER SPEAKS. HE NEVER SPEAKS.');
  },
  async p1_tallymarks(w) {
    await w.say('Tally marks. Thousands of them, in neat groups of five, all the way up to the ceiling.');
  },
  async p1_bones(w) {
    await w.say('A pile of old bones in the corner of an empty cell. Someone has arranged them very carefully into a smile.');
  },
  async p1_shackles(w) {
    w.sfx('chain');
    await w.say('Shackles bolted to the wall. They are cold - colder than the stone. Spirit-iron. Made to hold things that are not alive.');
  },
  async p1_desk(w) {
    await w.say('The night warden\'s desk. A ladle, a stack of grey trays, and a menu. Every day of the week says SLOP.');
  },
  async p1_board(w) {
    const first = !f(w, 'w5_d1');
    w.set('w5_d1');
    w.sfx('item');
    await w.say('A duty board. SLOP AT 8. LIGHTS OUT AT 9. DO NOT FEED THE SPECIMEN.');
    await w.say('At the bottom, in a hurry: HIGH SECURITY LOCK - WHEEL ONE: 3.');
    await w.say('(DO NOT WRITE THIS DOWN. - MANAGEMENT)');
    if (first) {
      pop(w, w.player.sprite.x, w.player.sprite.y - 26, 'CLUE: WHEEL ONE = 3', C.white, 1600);
      await w.say('You remember it. WHEEL ONE: 3. (Check the pause menu for the clues you have found.)');
    }
    w.save();
  },

  /** The first time you walk near the specimen cell: your Titan cub. */
  async p1_spec_seen(w) {
    if (f(w, 'w5_got3')) return;
    const id = w3(w);
    const off = bars(w);
    await w.camPan(P1.specimen.x, P1.specimen.y - 1, 900, 2.2);
    w.face('spec_cr', 'up');
    await w.wait(500);
    await w.emote('spec_cr', '!', 700);
    w.sfx('chime');
    const a = w.actor('spec_cr');
    if (a) await w.tw({ targets: a.sprite, y: a.sprite.y - 6, duration: 140, yoyo: true, repeat: 2 });
    w.emote('spec_cr', 'heart', 1200);
    await w.say(`Behind the bars of the last cell, a small shape jumps up and down: ${crName(id)}! It's ${crName(id)}!`);
    await w.say('A sign on the bars: SPECIMEN 0-1. TITAN CLASS. DO NOT FEED. DO NOT TOUCH. DO NOT LET IT LOOK AT YOU.');
    await w.camReturn(700);
    await off();
    w.emote(G, '!', 900);
    gSound(w);
  },

  /** The guardian tears the specimen cell open. */
  async p1_specimen(w) {
    if (f(w, 'w5_got3')) return;
    const id = w3(w);
    if (!f(w, 'w5_spec_seen')) {
      w.set('w5_spec_seen');
      await w.say(`Behind the bars: ${crName(id)}!`);
    }
    await w.say(`${crName(id)} presses its face against the bars. These are thick - far too thick for you.`);
    const g = w.actor(G);
    if (!g) return;
    // the guardian steps up
    w.emote(G, '!', 600);
    await w.wait(500);
    g.sprite.setFrame(2);
    await w.wait(400);
    g.sprite.setFrame(1);
    gSound(w);
    await w.tw({ targets: g.sprite, x: px(P1.specBars.x), y: py(P1.specBars.y - 1), duration: 200, ease: 'Quad.easeIn' });
    tearBars(w, 25, 9);
    await smash(w, P1.specBars.x, P1.specBars.y);
    await w.tw({ targets: g.sprite, x: px(g.x), y: py(g.y), duration: 300 });
    g.sprite.setFrame(0);
    // the cub comes running
    const c = w.actor('spec_cr');
    if (c) {
      const path: ('up' | 'left' | 'right' | 'down')[] = [];
      let cx = c.x;
      let cy = c.y;
      while (cy > w.player.y + 1) {
        path.push('up');
        cy--;
      }
      while (cx !== w.player.x) {
        path.push(cx < w.player.x ? 'right' : 'left');
        cx += cx < w.player.x ? 1 : -1;
      }
      await w.move('spec_cr', path.slice(0, 8), 140);
      await w.emote('spec_cr', 'heart', 900);
    }
    await spiritRecovered(w, id);
    w.remove('spec_cr');
    w.set('w5_got3');
    w.save();
    w.respawnParty();
    await w.say(`${crName(id)} is back with you. It won't stop bumping into your legs.`);
    w.sfx('chime');
    await w.say('Somewhere near the elevator, something clicks.');
  },

  async p_lift(w) {
    if (w.map.id === 'p_high' && f(w, 'w5_rescued')) return w.say(`The elevator is gone. It went down with ${friendName(w)}, and it is not coming back up.`);
    await announceFloors(w);
    await useLift(w);
  },
};

/** The first time a floor's button lights up, say why. */
async function announceFloors(w: W) {
  const lines: Record<number, string> = {
    2: `The little glass eye beside button 2 swivels... and stares at ${crName(w3(w))}. It blinks. Button 2 lights up.`,
    3: "You turn the Warden's key in the keyhole beside button 3. It lights up.",
    4: `The glass eye beside button 4 opens and looks at ${crName(w2(w))} for a long moment. Button 4 lights up.`,
    5: `The glass eye beside button 5 takes in all three of your spirits, one after another... ${crName(w1(w))} last. Button 5 lights up.`,
  };
  for (let n = 2; n <= 5; n++) {
    if (!floorOpen(w.state, n) || f(w, 'w5_lit' + n)) continue;
    w.set('w5_lit' + n);
    w.sfx('chime');
    await w.say(lines[n]);
  }
}

// ================================================================== the Warden

const WARDEN_SCENES: Record<string, Script> = {
  decorate_p_post(w) {
    setBadge(w, null);
    if (f(w, 'w5_gate_down') && !f(w, 'w5_warden_beaten')) {
      for (let x = 7; x <= 9; x++) w.setGround(x, 7, T.W5_BARS);
      w.spawn('g_gate', 'raw:' + gKey(w), 8, 6, 'down');
    }
    if (f(w, 'w5_warden_beaten')) {
      const h = w.spawn('bones', 'raw:ow_skelwarden', P2.warden.x + 1, P2.warden.y - 1, 'left');
      h.sprite.stop().setFrame(3);
    }
    return Promise.resolve();
  },

  async p2_warden_meet(w) {
    if (f(w, 'w5_warden_beaten')) return;
    if (f(w, 'w5_gate_down')) return SCRIPTS.p2_warden(w);
    const s = scene(w);
    const off = bars(w);
    w.music(null);
    // the portcullis comes down between you and the guardian
    const gt = w.actor(G);
    w.set('w5_gate_down');
    w.set('w5_g_away');
    const ghost = w.spawn('g_gate', 'raw:' + gKey(w), gt ? gt.x : 8, gt ? Math.min(gt.y, 6) : 6, 'down');
    w.respawnParty();
    const drop = w.sprite('p5_portcullis', P2.gate.x * 16, 2 * 16, 9000).setOrigin(0, 0);
    w.sfx('creakmetal');
    await w.tw({ targets: drop, y: P2.gate.y * 16 + 3, duration: 260, ease: 'Quad.easeIn' });
    w.sfx('slam');
    w.sfx('crash');
    w.shake(700, 0.016);
    for (let x = 7; x <= 9; x++) w.setGround(x, 7, T.W5_BARS);
    w.refresh();
    drop.destroy();
    w.face('player', 'up');
    await w.emote('player', '!', 700);
    // it throws itself at the bars, and they hold
    ghost.sprite.setFrame(1);
    gSound(w);
    for (let i = 0; i < 2; i++) {
      await w.tw({ targets: ghost.sprite, y: ghost.sprite.y + 8, duration: 110, yoyo: true });
      w.sfx('clank');
      w.shake(250, 0.008);
      await w.wait(250);
    }
    ghost.sprite.setFrame(0);
    await w.say(`${gName(w)} slams into the gate again and again. It does not even bend. Spirit-iron.`);
    // a chair scrapes
    w.sfx('heavy');
    await w.wait(500);
    const wd = w.actor('warden');
    w.face('player', 'down');
    await w.camPan(P2.warden.x + 1, P2.warden.y - 1, 1200, 2.2);
    w.music('w5_warden');
    wd?.sprite.stop().setFrame(0);
    w.sfx('rattle');
    await w.wait(400);
    w.shake(300, 0.004);
    await w.say('WELL, WELL. A WALKER.', WARDEN, { pitch: P_WARDEN });
    await w.say('NOBODY WALKS ON MY FLOORS. FOUR HUNDRED YEARS AT THIS DESK AND NOBODY HAS EVER WALKED PAST IT.', WARDEN, { pitch: P_WARDEN });
    wd?.sprite.setFrame(2);
    w.sfx('rattle');
    await w.say(`AND YOU BRING ME... ONE LITTLE ${crName(w3(w))}. HOW SWEET.`, WARDEN, { pitch: P_WARDEN });
    await w.say("THE KEY TO THE NEXT FLOOR IS ON MY BELT. COME AND TAKE IT.", WARDEN, { pitch: P_WARDEN - 30 });
    wd?.sprite.setFrame(4);
    w.flash(0.3);
    w.sfx('roar_small');
    await w.wait(500);
    void s;
    await off();
    await w.startBattle('skelwarden');
  },

  /** Talking to the Warden again (after a lost fight). */
  async p2_warden(w) {
    if (f(w, 'w5_warden_beaten')) return;
    await w.say('BACK FOR MORE? THE DESK IS NOT GOING ANYWHERE. NEITHER AM I.', WARDEN, { pitch: P_WARDEN });
    if (await w.confirm('Fight the Skeleton Warden?')) await w.startBattle('skelwarden');
  },

  async after_skelwarden(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (f(w, 'dev_w5_test')) return w.say(`(DEV: test fight over - ${result.toUpperCase()}.)`);
    if (result !== 'victory') {
      await w.say('YOU SEE? FOUR HUNDRED YEARS. NOBODY.', WARDEN, { pitch: P_WARDEN });
      await w.say(`${crName(w3(w))} shakes itself off. Behind the gate, ${gName(w)} paces.`);
      if (await w.confirm('Fight the Skeleton Warden again?')) return w.startBattle('skelwarden');
      return;
    }
    const off = bars(w);
    const wd = w.actor('warden');
    await w.camPan(P2.warden.x + 1, P2.warden.y - 1, 600, 2.2);
    wd?.sprite.stop().setFrame(2);
    await w.say('...FOUR HUNDRED YEARS...', WARDEN, { pitch: P_WARDEN - 60 });
    // he comes apart, bone by bone
    for (let i = 0; i < 4; i++) {
      w.sfx('rattle');
      if (wd) await w.tw({ targets: wd.sprite, x: wd.sprite.x + (i % 2 ? 2 : -2), duration: 70, yoyo: true });
      await w.wait(120);
    }
    wd?.sprite.setFrame(3);
    w.sfx('crash');
    w.shake(500, 0.012);
    await w.wait(900);
    await w.say('The Skeleton Warden falls apart into a heap of bones. A ring of keys slides out of it, ringing on the stone.');
    w.set('w5_warden_beaten');
    w.refresh();
    const h = w.spawn('bones', 'raw:ow_skelwarden', P2.warden.x + 1, P2.warden.y - 1, 'left');
    h.sprite.stop().setFrame(3);
    await w.give('w_keys');
    // the gate goes back up
    w.sfx('creakmetal');
    for (let x = 7; x <= 9; x++) w.setGround(x, 7, T.W5_FLOOR);
    await w.camPan(8, 6, 700, 2);
    w.sfx('clank');
    const ga = w.actor('g_gate');
    if (ga) {
      ga.sprite.setFrame(1);
      gSound(w);
      await w.move('g_gate', ['down', 'down'], 170);
    }
    await w.camReturn(500);
    w.remove('g_gate');
    w.set('w5_g_away', false);
    w.respawnParty();
    w.emote(G, 'heart', 900);
    await off();
    w.music('w5_prison');
    w.save();
    await w.say("One of the keys has a 3 on it. The elevator's third button has a keyhole.");
  },

  async p2_board(w) {
    await w.say('A notice board. THE COLLECTOR VISITS AT SUPPER. ALL STAFF STAY UPSTAIRS. ALL PRISONERS STAY PUT.');
    await w.say('Someone has added underneath: "HE DOES NOT LIKE THE SLOP EITHER."');
  },
  async p2_desk(w) {
    if (f(w, 'w5_warden_beaten')) return w.say("The Warden's desk. Four hundred years of paperwork. Every page is the same: NOBODY.");
    await w.say("The Warden's desk. Don't touch it.");
  },
};

// ================================================================== the guardian, and picking things up

const G_TALK: Record<string, Script> = {
  async w5_guardian_talk(w) {
    w.faceTo(G, 'player');
    gSound(w);
    if (!f(w, 'w5_got3')) {
      w.emote(G, '!', 800);
      return w.say(`${gName(w)} sniffs the air, then turns its head toward the far end of the cell block.`);
    }
    if (!f(w, 'w5_warden_beaten')) {
      w.emote(G, '...', 800);
      return w.say(`${gName(w)} looks up at the ceiling and growls softly. Something big is up there.`);
    }
    if (!f(w, 'w5_got2')) {
      w.emote(G, '?', 800);
      return w.say(`${gName(w)} keeps lifting its nose toward the smell of cooking.`);
    }
    if (!f(w, 'w5_got1')) {
      w.emote(G, '...', 800);
      return w.say(`${gName(w)} stays very close to you. It has not stopped watching the elevator since supper.`);
    }
    w.emote(G, 'heart', 800);
    return w.say(`${gName(w)} rests its head against you for a moment. Then it looks up. Up, to the top floor.`);
  },

  async resume_world5(w) {
    if (!f(w, 'w5_free')) return SCRIPTS.w5_wake(w);
    if (f(w, 'w5_massacre_t') && !f(w, 'w5_massacre')) return SCRIPTS.w5_massacre?.(w);
    if (f(w, 'w5_rescued') && !f(w, 'w5_reaper_met')) return SCRIPTS.w5_reaper?.(w);
  },
};

export const W5_PRISON: Record<string, Script> = { ...WAKE, ...CELLS, ...WARDEN_SCENES, ...G_TALK };
