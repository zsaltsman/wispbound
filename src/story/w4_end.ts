import Phaser from 'phaser';
import type { Script, W } from './helpers';
import { SCRIPTS } from './registry';
import { scene, cam, camPx, camFollow, bars, blackout, cut } from './w2_fx';
import { C, txt } from '../ui/ui';
import { W as SW } from '../constants';
import { W4 } from '../world/maps/w4maps';
import { route4 } from './w4_state';
import { f, px, py, who, comp, carlo, old, guardian, gName, gCry, catAt, catGone, pawSparkle, vision, bigWords, hideAll4 } from './w4_fx';
import { panelStep } from './w4_routeB';

// World 4, Acts 4 to 7: the last warning in the village square, Flamora and the
// Reaper, the escape to the airship, the blade in the sky, the volcano, the fight
// that cannot be won, and the cell under the mountain. TO BE CONTINUED.

const gKey = (w: W) => 'ow_' + guardian(w);
const REAPER_AT = { x: 75, y: 38 };

// ================================================================== Act 4: the last warning

const WARNING: Record<string, Script> = {
  async w4_last_warning(w) {
    const s = scene(w);
    w.set('w4_warning');
    w.save();
    const off = bars(w);
    // the wind stops
    w.music(null);
    await w.wait(900);
    await w.say('The wind stops.');
    await w.wait(500);
    // every animal in the village runs
    for (const [id, dirs] of [
      ['w4_hen1', ['left', 'left', 'left', 'left', 'left', 'left', 'left']],
      ['w4_hen2', ['down', 'down', 'down', 'down', 'down', 'down', 'down']],
      ['w4_pig', ['right', 'right', 'right', 'right', 'down', 'down', 'down']],
    ] as const) {
      if (!w.actor(id)) continue;
      w.emote(id, '!', 400);
      void w.move(id, [...dirs], 110);
    }
    w.sfx('cluck');
    await w.wait(1300);
    w.set('w4_animals_fled');
    w.refresh();
    // the sky goes dark
    w.setDark(0.72, 2400);
    await w.wait(1200);
    w.emote('follower', '!', 900);
    await w.wait(200);
    w.emote('follower2', '?', 900);
    for (const id of ['follower', 'follower2']) {
      const a = w.actor(id);
      if (a) s.tweens.add({ targets: a.sprite, x: a.sprite.x + 1, duration: 50, yoyo: true, repeat: 9 });
    }
    await w.say('Your creatures are trembling, staring up at nothing. Neither of them will look away from the sky.');
    await comp(w, who(w) === 'old' ? 'Hm. I don\'t like this one bit.' : 'Why is it so quiet? It\'s never this quiet.', '...');
    // the cat, on a roof, looking up
    const r = W4.roofs.warn;
    const c = catAt(w, r.x, r.y, 1, false, 9000);
    await w.camPan(r.x, r.y + 1, 900, 2);
    w.sfx('meow');
    await w.wait(1400);
    await catGone(w, c, 400);
    pawSparkle(w, px(r.x), py(r.y));
    await w.wait(600);
    // where it sat, a paw: the same one carved on the village monument
    w.set('w4_paw_seen');
    w.refresh();
    await w.camPan(W4.paw.x, W4.paw.y, 900, 2);
    w.sfx('chime');
    await w.say('On the ground in the middle of the square, a paw print is glowing. It is the same shape as the one carved on the village monument.');
    w.sfx('rumble');
    w.shake(2200, 0.008);
    await w.wait(1200);
    // Flamora comes down out of the dark
    w.music('w4_flamora');
    const fl = w.sprite('ow_flamora', px(W4.plaza.x), -60, 9500).setOrigin(0.5, 1);
    fl.play('ow_flamora_idle');
    camFollow(w, fl, 0.06, 1.4);
    w.sfx('fire');
    await w.tw({ targets: fl, y: py(W4.plaza.y - 5), duration: 3400, ease: 'Sine.easeOut' });
    w.flash(0.4);
    await w.say('A great bird made of fire settles over the square. The night lights up gold around it.');
    await comp(w, 'It can\'t be...', '!');
    await comp(w, 'That\'s...');
    await comp(w, 'The Overseer of All Spirits!');
    await w.wait(500);
    await vision(w, [
      'Flamora says nothing. Instead, a picture blooms behind your eyes:',
      'The island, swallowed by a black sky. Something small and hooded, walking through it.',
      'And one single feeling, as clear as words: LEAVE.',
    ]);
    // the guardian refuses
    const g = w.sprite(gKey(w), px(W4.paw.x - 3), py(W4.paw.y + 1), 9400).setOrigin(0.5, 1).setFlipX(true).setAlpha(0);
    await w.tw({ targets: g, alpha: 1, duration: 600 });
    await w.camPan(W4.paw.x - 2, W4.paw.y, 600, 2);
    g.setFrame(1);
    w.sfx(gCry(w));
    w.shake(900, 0.012);
    await w.say(`${gName(w)} plants itself between the paw print and the sky, and will not move. It is not leaving its island.`);
    fl.stop().setFrame(2);
    w.sfx('fire');
    w.flash(0.5);
    await w.say('Flamora spreads its wings wide, burning brighter and brighter...');
    // ...and the camera finds what it is looking at
    const rp = w.sprite('ow_reaper', px(REAPER_AT.x), py(REAPER_AT.y), 9300).setOrigin(0.5, 1).setAlpha(0);
    cam(w).stopFollow();
    w.music(null);
    await camPx(w, px(REAPER_AT.x), py(REAPER_AT.y) - 12, 2200, 2.6);
    w.sfx('heartbeat');
    w.music('menace');
    await w.tw({ targets: rp, alpha: 1, duration: 1400 });
    await w.wait(1600);
    await w.say('On the ruins at the edge of the village stands a small, hooded figure in a black cloak. It is holding a scythe.');
    await w.wait(800);
    rp.setFrame(3);
    w.sfx('heartbeat');
    await w.wait(1000);
    await w.camReturn(400);
    await comp(w, 'WE NEED TO GO!', '!');
    await comp(w, route4(w.state) === 'B' ? 'GET BACK TO THE AIRSHIP!' : "THAT OLD AIRSHIP ON THE ROCKS! IT'S OUR ONLY WAY OFF THIS ISLAND!");
    g.setFrame(2);
    await w.tw({ targets: g, alpha: 0, duration: 400 });
    g.destroy();
    fl.destroy();
    rp.destroy();
    await off();
    w.set('w4_escaping');
    w.save();
    await SCRIPTS.w4_escape(w);
  },
};

// ================================================================== Act 5: the escape

function escapeArt(w: W) {
  const s = scene(w);
  if (!s.textures.exists('w4_fallrock')) {
    const g = s.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(C.black, 1).fillCircle(8, 8, 8);
    g.fillStyle(C.mid, 1).fillCircle(8, 8, 7);
    g.fillStyle(C.light, 1).fillCircle(6, 6, 3);
    g.generateTexture('w4_fallrock', 16, 16);
    g.clear();
    g.fillStyle(C.black, 0.6).fillEllipse(8, 4, 16, 7);
    g.generateTexture('w4_shadow', 16, 8);
    g.destroy();
  }
}

/** Run for the airship: rocks and trees come down, and the hooded figure follows. */
async function escapeRun(w: W): Promise<'safe' | 'caught' | 'late'> {
  const s = scene(w);
  escapeArt(w);
  const A = route4(w.state) !== 'B';
  const goal = A ? { x: 70, y: 80, w: 6, h: 2 } : { x: 59, y: 26, w: 4, h: 2 };
  let left = A ? 45000 : 32000;
  const clock = w.ui(txt(s, SW / 2, 6, '', { outline: true, origin: [0.5, 0] }).setDepth(80));
  const reaper = w.sprite('ow_reaper', px(REAPER_AT.x), py(REAPER_AT.y), 9300).setOrigin(0.5, 1).setAlpha(0.9);
  s.tweens.add({ targets: reaper, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
  let t = 0;
  let nextDrop = 900;
  let nextStall = 3000;
  const junk: Phaser.GameObjects.GameObject[] = [clock, reaper];
  const drop = () => {
    const p = w.player;
    // aim a little ahead of you, towards the goal
    const gx = goal.x + goal.w / 2;
    const gy = goal.y;
    const dx = Math.sign(gx - p.x);
    const dy = Math.sign(gy - p.y);
    const tx = p.x + dx * (1 + Math.floor(Math.random() * 3)) + Math.round((Math.random() - 0.5) * 4);
    const ty = p.y + dy * (1 + Math.floor(Math.random() * 3)) + Math.round((Math.random() - 0.5) * 4);
    const tree = Math.random() < 0.3;
    const sh = w.image('w4_shadow', px(tx), py(ty) - 4, py(ty) - 1).setScale(tree ? 2 : 0.4).setAlpha(0.3);
    junk.push(sh);
    s.tweens.add({ targets: sh, scale: tree ? 2.4 : 1.1, alpha: 0.8, duration: 850 });
    const ob = tree
      ? w.image('w4_dtree' + Math.floor(Math.random() * 3), px(tx), py(ty), 9450).setOrigin(0.5, 1).setAngle(-80).setAlpha(0)
      : w.image('w4_fallrock', px(tx), py(ty) - 160, 9450);
    junk.push(ob);
    if (tree) s.tweens.add({ targets: ob, alpha: 1, angle: 0, duration: 1, delay: 0 });
    s.tweens.add({
      targets: ob,
      y: tree ? ob.y : py(ty) - 6,
      angle: tree ? 90 : 0,
      alpha: 1,
      duration: 850,
      ease: 'Quad.easeIn',
      onComplete: () => {
        sh.destroy();
        w.sfx(tree ? 'crash' : 'heavy');
        w.shake(160, tree ? 0.008 : 0.004);
        const hit = tree ? Math.abs(w.player.y - ty) <= 0 && Math.abs(w.player.x - tx) <= 2 : w.player.x === tx && w.player.y === ty;
        if (hit) {
          w.frozenUntil = s.time.now + 900;
          w.flash(0.4);
          w.emote('player', '!', 600);
        }
        s.tweens.add({ targets: ob, alpha: 0, duration: 700, delay: 500, onComplete: () => ob.destroy() });
      },
    });
  };
  const r = await w.freeRun((dt) => {
    t += dt;
    left -= dt;
    clock.setText(`${Math.max(0, Math.ceil(left / 1000))}`);
    const p = w.player;
    if (p.x >= goal.x && p.x < goal.x + goal.w && p.y >= goal.y && p.y < goal.y + goal.h) return 'safe';
    if (left <= 0) return 'late';
    if (t >= nextDrop) {
      drop();
      nextDrop = t + 650 + Math.random() * 600;
    }
    // now and then your creatures stop dead and stare back at it
    if (t >= nextStall) {
      nextStall = t + 3500 + Math.random() * 3000;
      const id = Math.random() < 0.5 ? 'follower' : 'follower2';
      w.emote(id, Math.random() < 0.5 ? '!' : '...', 700);
    }
    // the hooded figure does not hurry, and does not stop
    if (t > 1500) {
      const sp = (dt / 1000) * 16 * (2.6 + Math.min(1.6, t / 15000));
      const ax = p.sprite.x - reaper.x;
      const ay = p.sprite.y - reaper.y;
      const d = Math.hypot(ax, ay);
      if (d < 12) return 'caught';
      reaper.x += (ax / d) * sp;
      reaper.y += (ay / d) * sp;
      reaper.setFlipX(ax > 0);
      reaper.setDepth(reaper.y);
    }
    return null;
  });
  s.tweens.killTweensOf(junk);
  junk.forEach((o) => o.destroy());
  return r as 'safe' | 'caught' | 'late';
}

const ESCAPE: Record<string, Script> = {
  async w4_escape(w) {
    for (;;) {
      w.music('w4_escape');
      const r = await escapeRun(w);
      if (r === 'safe') break;
      w.sfx('heartbeat');
      const b = blackout(w, 0);
      await w.tw({ targets: b, alpha: 1, duration: 700 });
      await w.say(r === 'caught' ? 'A cold, quiet darkness closes over you...' : 'Too slow! The darkness swallows the island...');
      await w.say('...and you are back in the square, the paw still glowing at your feet. It isn\'t too late. RUN!');
      w.warp('w4_isl', W4.plaza.x, W4.plaza.y, 'down');
      await w.wait(100);
      b.destroy();
    }
    w.set('w4_escaped');
    w.save();
    await SCRIPTS.w4_takeoff(w);
  },

  /** The ship will not start, of course. */
  async w4_takeoff(w) {
    if (route4(w.state) === 'B') {
      await w.fade(true, 400);
      cut(w, 'w4_g7', 8, 6, 'up');
      await w.fade(false, 400);
      w.sfx('sputter');
      w.shake(900, 0.006);
      await carlo(w, 'COME ON!', '!');
      await carlo(w, 'PLEASE TELL ME YOU KNOW HOW TO START THIS THING!');
      while (!(await panelStep(w, 'IGNITION', 'time', 1.6, 0.18))) {
        w.sfx('sputter');
        await carlo(w, 'AGAIN! DO IT AGAIN!');
      }
    } else {
      w.sfx('sputter');
      w.shake(900, 0.006);
      await w.say('The old man scrambles up into the wreck and starts pulling at levers. The engine coughs, and coughs, and dies.');
      await old(w, 'Don\'t you worry. I\'ve been patching this old girl up for years, a little at a time. Just in case.');
      await old(w, 'Easy... easy... Every engine has a heart. You just have to find where it\'s beating.');
      while (!(await panelStep(w, 'IGNITION', 'time', 1.4, 0.2))) {
        w.sfx('sputter');
        await old(w, 'Steady, now. Again.');
      }
    }
    w.sfx('engine');
    w.shake(1400, 0.01);
    await w.say('The engine ROARS into life!');
    w.set('w4_escaping', false);
    w.set('w4_aloft');
    w.save();
    await SCRIPTS.w4_sky(w);
  },

  /** The airship rises, and the blade comes down. Then Flamora. Then the cage. */
  async w4_sky(w) {
    const s = scene(w);
    await w.fade(true, 500);
    cut(w, 'w4_sky', 20, 15, 'down');
    hideAll4(w, true);
    const CX = 20 * 16 + 8;
    const CY = 15 * 16;
    await camPx(w, CX, CY, 0, 1);
    const sky = w.image('w4_sky_dark', CX, CY, 1);
    const isle = w.image('w4_islefar', CX, CY + 120, 2).setOrigin(0.5, 1).setScale(1.6);
    const ship = w.sprite('w4_ship', CX - 40, CY + 190, 50).setScale(0.8);
    ship.play('w4_ship_fly');
    const off = bars(w);
    await w.fade(false, 500);
    w.music('w4_escape');
    w.sfx('engine');
    s.tweens.add({ targets: isle, y: isle.y + 70, scale: 1.3, duration: 4000 });
    await w.tw({ targets: ship, y: CY + 10, x: CX, duration: 3600, ease: 'Sine.easeOut' });
    s.tweens.add({ targets: ship, y: ship.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await comp(w, who(w) === 'old' ? 'Ha! We made it! Hold on to something!' : 'We\'re flying! WE\'RE ACTUALLY FLYING!', 'heart');
    await w.wait(600);
    // something is waiting in the sky
    w.music(null);
    const rp = w.sprite('ow_reaper', CX + 130, CY - 50, 60).setOrigin(0.5, 1).setAlpha(0).setScale(1.4);
    w.sfx('heartbeat');
    await w.tw({ targets: rp, alpha: 1, x: CX + 100, duration: 1400 });
    w.music('menace');
    await w.wait(800);
    rp.setFrame(1);
    await w.wait(900);
    rp.setFrame(2);
    w.sfx('slice');
    const bl = w.image('fx_darkblade', CX + 90, CY - 20, 70).setScale(0.4);
    await w.tw({ targets: bl, x: CX - 10, y: CY + 10, angle: -260, scale: 1.2, duration: 380, ease: 'Quad.easeIn' });
    w.flash(0.9);
    w.shake(900, 0.02);
    bl.destroy();
    s.tweens.killTweensOf(ship);
    const hx = ship.x;
    const hy = ship.y;
    ship.destroy();
    const h0 = w.image('w4_half0', hx, hy, 50).setScale(0.8);
    const h1 = w.image('w4_half1', hx, hy, 50).setScale(0.8);
    w.sfx('crash');
    s.tweens.add({ targets: h0, x: hx - 30, y: hy + 220, angle: -40, duration: 2200, ease: 'Quad.easeIn' });
    s.tweens.add({ targets: h1, x: hx + 30, y: hy + 220, angle: 50, duration: 2200, ease: 'Quad.easeIn' });
    await w.say('One swing. The airship falls apart in two clean halves.');
    // Flamora catches everyone
    w.music('w4_flamora');
    const fl = w.sprite('ow_flamora', CX - 220, CY + 40, 80).setScale(0.9);
    fl.play('ow_flamora_idle');
    w.sfx('cry');
    await w.tw({ targets: fl, x: CX - 20, y: CY + 60, duration: 1000, ease: 'Quad.easeOut' });
    w.flash(0.4);
    h0.destroy();
    h1.destroy();
    await w.say('A blaze of gold sweeps underneath you: Flamora! It catches every one of you on its back.');
    await w.tw({ targets: fl, x: CX, y: CY, duration: 700, ease: 'Sine.easeOut' });
    // and turns on the Reaper with burning wings (the art faces left; the Reaper is to the right)
    fl.stop().setFrame(2).setFlipX(true);
    w.sfx('fire');
    for (let i = 0; i < 3; i++) {
      await w.tw({ targets: fl, x: rp.x - 40, y: rp.y - 20, duration: 260, ease: 'Quad.easeIn' });
      w.flash(0.5);
      w.sfx('fire');
      w.shake(300, 0.01);
      await w.tw({ targets: fl, x: CX, y: CY, duration: 360 });
    }
    await w.say('Flamora dives at the hooded figure again and again, its wings blazing. The hooded figure does not even move.');
    // ...then it lifts the scythe
    rp.setFrame(2);
    w.sfx('slice');
    const b2 = w.image('fx_darkblade', rp.x - 10, rp.y - 20, 90).setScale(0.6);
    await w.tw({ targets: b2, x: CX, y: CY, angle: 300, duration: 300, ease: 'Quad.easeIn' });
    b2.destroy();
    w.flash(0.9);
    w.sfx('cry');
    w.shake(1200, 0.02);
    fl.setFrame(3);
    await w.tw({ targets: fl, y: CY + 50, angle: 20, duration: 900, ease: 'Quad.easeIn' });
    // the cage: bars of darkness snap shut around Flamora and everyone on its back.
    // Everything inside stands on the cage floor, so it all moves (and shrinks) as one.
    rp.setFrame(3);
    // high enough that the dialog box never hides the floor of the cage
    const FY = CY + 50;
    const cg = s.add.container(CX, FY).setDepth(95).setAlpha(0).setScale(1.5);
    w.worldLayer.add(cg);
    // back of the cage, then everyone inside standing on its floor, then the front bars
    const cage = s.add.image(0, 0, 'w4_cage').setOrigin(0.5, 58 / 64).setScale(2.4);
    // what is left of Flamora's fire still lights the inside of the cage
    const glow = s.add.ellipse(8, -24, 104, 60, C.light, 0.22);
    const fl2 = s.add.sprite(20, -6, 'ow_flamora', 3).setOrigin(0.5, 1).setScale(0.72).setFlipX(true);
    const g = s.add.sprite(-36, -6, gKey(w), 1).setOrigin(0.5, 1).setScale(0.9);
    const inside: Phaser.GameObjects.GameObject[] = [glow, fl2, g];
    const you = s.add.sprite(-19, -5, w.player.sprite.texture.key, 0).setOrigin(0.5, 1);
    inside.push(you);
    const mate = w.actor('inventor') ?? w.actor('oldman') ?? w.actor('carlo');
    if (mate) inside.push(s.add.sprite(-3, -5, mate.sprite.texture.key, 0).setOrigin(0.5, 1));
    const front = s.add.graphics();
    for (const bx of [-41, -12, 17, 46]) {
      front.fillStyle(C.black, 1).fillRect(bx - 3, -122, 6, 120);
      front.fillStyle(C.dark, 1).fillRect(bx - 2, -122, 4, 120);
    }
    cg.add([cage, ...inside, front]);
    w.sfx('rumble');
    s.tweens.add({ targets: fl, alpha: 0, duration: 300 });
    await w.tw({ targets: cg, alpha: 1, scale: 1, duration: 900, ease: 'Back.easeOut' });
    fl.setVisible(false);
    w.shake(400, 0.01);
    await w.say('Bars of pure darkness close around all of you.');
    // the guardian hurls itself at the bars; sparks, and nothing else
    for (let i = 0; i < 3; i++) {
      w.sfx(gCry(w));
      await w.tw({ targets: g, x: -46, duration: 110, ease: 'Quad.easeIn' });
      w.sfx('clank');
      w.shake(200, 0.008);
      cage.setTintFill(0xffffff);
      front.setAlpha(0.3);
      s.time.delayedCall(70, () => {
        cage.clearTint();
        front.setAlpha(1);
      });
      for (let k = 0; k < 3; k++) {
        const sp = s.add.image(-58, -14 - Math.random() * 26, 'fx_spark').setScale(0.6);
        cg.add(sp);
        s.tweens.add({ targets: sp, x: sp.x + 6 + Math.random() * 10, y: sp.y + (Math.random() - 0.5) * 16, alpha: 0, scale: 1.2, duration: 380, onComplete: () => sp.destroy() });
      }
      await w.tw({ targets: g, x: -36, duration: 220, ease: 'Quad.easeOut' });
      await w.wait(260);
    }
    await w.say(`${gName(w)} throws itself at the bars again and again. They do not even shake.`);
    // the hooded figure turns for the horizon, and the cage follows it on a cord of darkness
    rp.setFrame(0).setFlipX(true);
    const cord = s.add.graphics().setDepth(94);
    w.worldLayer.add(cord);
    const drawCord = () => {
      const hx = rp.x - 6 * rp.scaleX;
      const hy = rp.y - 30 * rp.scaleY;
      const tx = cg.x;
      const ty = cg.y - 136 * cg.scaleY;
      cord.clear();
      cord.lineStyle(Math.max(1, 3 * cg.scaleX), C.black, 1).lineBetween(hx, hy, tx, ty);
      cord.lineStyle(1, C.dark, 1).lineBetween(hx, hy, tx, ty);
    };
    s.events.on('update', drawCord);
    drawCord();
    w.sfx('rumble');
    const vol = w.image('w4_volcano', CX + 260, CY + 40, 3).setScale(0.35).setAlpha(0);
    s.tweens.add({ targets: vol, alpha: 0.8, duration: 1500 });
    s.tweens.add({ targets: [isle], alpha: 0, duration: 2000 });
    s.tweens.add({ targets: rp, x: CX + 240, y: CY + 20, scale: 0.3, duration: 5200, ease: 'Sine.easeIn' });
    // the cage lags a moment behind, then swings along after it
    s.tweens.add({ targets: cg, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await w.tw({ targets: cg, x: CX + 212, y: CY + 42, scale: 0.4, duration: 5400, delay: 300, ease: 'Sine.easeIn' });
    await w.wait(400);
    void sky;
    await off();
    await w.fade(true, 1200);
    s.events.off('update', drawCord);
    s.tweens.killTweensOf(cg);
    cord.destroy();
    cg.destroy(true);
    w.set('w4_taken');
    w.save();
    await w.wait(600);
    await SCRIPTS.w4_volcano(w);
  },
};

// ================================================================== Act 6: the volcano and the Reaper

const VOLCANO: Record<string, Script> = {
  async w4_volcano(w) {
    const s = scene(w);
    cut(w, 'w4_sky', 20, 15, 'down');
    hideAll4(w, true);
    const CX = 20 * 16 + 8;
    const CY = 15 * 16;
    await camPx(w, CX, CY, 0, 1);
    w.image('w4_sky_dark', CX, CY, 1);
    const vol = w.image('w4_volcano', CX, CY + 30, 3).setScale(0.6);
    s.tweens.add({ targets: vol, scale: 1, duration: 6000, ease: 'Sine.easeInOut' });
    await w.fade(false, 1200);
    w.sfx('rumble');
    await w.say('A black island rises out of the sea: a volcano, smoking, and at its foot a great dark structure, built out of the rock itself.');
    await w.wait(1400);
    await w.fade(true, 800);
    await SCRIPTS.w4_chamber(w);
  },

  /** Everyone tumbles out of the cage into a stone chamber. And it comes down after you. */
  async w4_chamber(w) {
    const s = scene(w);
    w.set('w4_chamber');
    w.save();
    cut(w, 'w4_chamber', 9, 7, 'up');
    hideAll4(w, true);
    await w.wait(200);
    await w.fade(false, 600);
    // the cage drops you all onto the stone
    w.sfx('heavy');
    w.shake(500, 0.012);
    hideAll4(w, false);
    const p = w.player.sprite;
    const y0 = p.y;
    p.y -= 60;
    await w.tw({ targets: p, y: y0, duration: 400, ease: 'Quad.easeIn' });
    w.sfx('impact');
    await w.emote('player', '...', 900);
    // Flamora, hurt, in the corner; the guardian beside you
    const fl = w.sprite('ow_flamora', px(15), py(4), py(4)).setOrigin(0.5, 1).setFrame(3).setScale(0.7);
    const g = w.sprite(gKey(w), px(6), py(6), py(6)).setOrigin(0.5, 1).setFrame(guardian(w) === 'wispmane' ? 2 : 1);
    await w.camPan(15, 4, 700, 2);
    await w.say('Flamora lies crumpled against the wall. Its fire has almost gone out.');
    await w.camPan(6, 6, 600, 2);
    w.sfx(gCry(w));
    await w.say(guardian(w) === 'wispmane' ? 'Wispmane is beside you, its mane bristling.' : 'Viperwind is beside you, its fins spread wide.');
    await comp(w, who(w) === 'old' ? 'Stay behind me, lad. ...Or I\'ll stay behind you. One of the two.' : 'Not that I\'m scared or anything. I just... prefer being prepared.', '...');
    // it comes down through the ceiling, silent
    const rp = w.sprite('ow_reaper', px(9), py(2) - 40, py(3)).setOrigin(0.5, 1).setAlpha(0);
    await w.camPan(9, 3, 600, 2);
    w.sfx('heartbeat');
    w.music('menace');
    await w.tw({ targets: rp, alpha: 1, y: py(3), duration: 2200, ease: 'Sine.easeOut' });
    s.tweens.add({ targets: rp, y: rp.y - 3, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await w.wait(1400);
    await w.say('The hooded figure says nothing at all.');
    // the guardian goes for it, and is out of the fight in a single stroke
    await w.camPan(8, 4, 500, 1.8);
    g.setFlipX(true).setFrame(1);
    w.sfx(gCry(w));
    await w.tw({ targets: g, x: px(8), y: py(4), duration: 220, ease: 'Quad.easeIn' });
    rp.setFrame(2);
    w.sfx('slice');
    w.flash(0.8);
    w.shake(700, 0.016);
    await w.tw({ targets: g, x: px(13), y: py(5), angle: 80, duration: 420, ease: 'Quad.easeOut' });
    w.sfx('impact');
    g.setAlpha(0.8);
    await w.wait(500);
    await w.say(`${gName(w)} leaps at the hooded figure. One flick of the scythe throws it against the wall beside Flamora, and it does not get up.`);
    await w.camPan(9, 4, 500, 2);
    rp.setFrame(1);
    await w.wait(800);
    await w.say('Now it is only you.');
    void fl;
    await w.startBattle('reaper');
  },

  /** You lose. Everyone does. The cage comes again. */
  async after_reaper(w) {
    w.set('reaper_fought');
    w.save();
    const s = scene(w);
    const b = blackout(w, 1, 70);
    await w.wait(800);
    const rp = w.sprite('ow_reaper', px(9), py(3), py(3)).setOrigin(0.5, 1).setFrame(3);
    hideAll4(w, false);
    w.player.sprite.setFrame?.(0);
    await w.camPan(9, 5, 0, 2.2);
    await w.tw({ targets: b, alpha: 0.4, duration: 1200 });
    await w.say('...');
    await w.say('You can barely lift your head. Nobody is still standing.');
    const cage = w.image('w4_cage', w.player.sprite.x, w.player.sprite.y + 6, 9600).setOrigin(0.5, 1).setScale(2.4).setAlpha(0);
    w.sfx('rumble');
    await w.tw({ targets: cage, alpha: 1, scale: 1.8, duration: 1000, ease: 'Back.easeOut' });
    await w.wait(800);
    await w.say('The last thing you see is the cage of darkness closing, and the little hooded figure turning away.');
    void rp;
    void s;
    await w.tw({ targets: b, alpha: 1, duration: 2000 });
    w.set('w4_captured');
    w.set('w4_carlo_follow', false);
    w.set('w4_old_follow', false);
    w.save();
    await w.wait(1200);
    await SCRIPTS.w4_cell(w);
  },
};

// ================================================================== Act 7: the cell

const CELL: Record<string, Script> = {
  decorate_w4_cell(w) {
    w.hide('follower');
    w.hide('follower2');
    if (f(w, 'w4_guardian')) w.spawn('cellguard', 'raw:' + gKey(w), 5, 4, 'left');
    return Promise.resolve();
  },

  async w4_cell(w) {
    const s = scene(w);
    cut(w, 'w4_cell', 3, 5, 'down');
    w.hide('follower');
    w.hide('follower2');
    const b = blackout(w, 1, 70);
    await w.wait(1000);
    w.sfx('drip');
    await w.wait(1400);
    w.sfx('drip');
    await w.tw({ targets: b, alpha: 0, duration: 2400 });
    b.destroy();
    await w.emote('player', '...', 1200);
    await w.say('Dripping water. Heat. The red glow of lava seeping through cracks in the rock.');
    await w.say('A cell. Your creatures are gone. Your friends are gone.');
    await w.wait(600);
    // only the guardian
    const g = w.sprite(gKey(w), px(5), py(4), py(4)).setOrigin(0.5, 1).setFrame(guardian(w) === 'wispmane' ? 3 : 3);
    await w.camPan(4, 4, 800, 2.4);
    await w.say(`Only ${gName(w)} is here, curled up in the corner of the cell.`);
    await w.wait(800);
    g.setFrame(guardian(w) === 'wispmane' ? 4 : 0);
    await w.wait(600);
    await w.say(`${gName(w)} lifts its head and looks at you. Not the way it did before.`);
    await w.tw({ targets: g, x: px(4), duration: 900, ease: 'Sine.easeInOut' });
    w.sfx(guardian(w) === 'wispmane' ? 'purr' : 'hiss');
    await w.say(guardian(w) === 'wispmane' ? 'Wispmane lowers its great head, and rests it against your shoulder. It purrs, very quietly.' : 'Viperwind coils loosely around you. For once, it doesn\'t hiss. It just stays close.');
    await w.say('Whatever is down here, neither of you is getting out of it alone.');
    // Guardian acquired
    await guardianAcquired(w);
    g.destroy();
    w.set('w4_guardian');
    w.save();
    w.spawn('cellguard', 'raw:' + gKey(w), 4, 4, 'left');
    await w.wait(600);
    // the view beyond the bars: other cells, machinery, and something moving
    const off = bars(w);
    await w.camPan(13, 5, 2600, 1.6);
    w.sfx('creakmetal');
    await w.wait(800);
    await w.camPan(24, 4, 2400, 1.6);
    await w.wait(600);
    await w.camPan(33, 4, 2200, 1.6);
    await w.wait(500);
    const sh = s.add.ellipse(px(39), py(7) - 8, 34, 20, C.black, 0.85).setDepth(9700);
    w.worldLayer.add(sh);
    w.sfx('heavy');
    w.shake(300, 0.004);
    await w.tw({ targets: sh, x: px(17), duration: 3400, ease: 'Linear' });
    w.sfx('heavy');
    w.shake(300, 0.004);
    sh.destroy();
    await w.wait(800);
    await w.camPan(4, 4, 2200, 2);
    await w.wait(500);
    await off();
    w.music('w4_end');
    const blk = blackout(w, 0, 90);
    await w.tw({ targets: blk, alpha: 1, duration: 2000 });
    const rm = await bigWords(w, 'TO BE CONTINUED...', undefined, 2600);
    rm();
    const rm2 = await bigWords(w, 'THE FORGOTTEN ISLAND', '- END OF CHAPTER -', 3000);
    rm2();
    w.set('w4_end');
    w.save();
    await w.wait(800);
    w.leave('credits', { creature: w.state.creature, world: 4 });
  },
};

/** A short card: the guardian, glowing, and its name. Not caught. Chosen. */
async function guardianAcquired(w: W) {
  const s = scene(w);
  const shade = w.ui(s.add.rectangle(0, 0, SW, 300, C.black).setOrigin(0, 0).setDepth(85).setAlpha(0));
  const ring = w.ui(s.add.image(SW / 2, 100, 'fx_ring').setDepth(86).setScale(0.2).setAlpha(0));
  const sp = w.ui(s.add.sprite(SW / 2, 150, 'sp_' + guardian(w), 0).setOrigin(0.5, 1).setDepth(87).setScale(0.4).setAlpha(0));
  const t1 = w.ui(txt(s, SW / 2, 178, 'GUARDIAN ACQUIRED', { outline: true, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  const t2 = w.ui(txt(s, SW / 2, 196, gName(w), { color: C.light, origin: [0.5, 0] }).setDepth(88).setAlpha(0));
  await w.tw({ targets: shade, alpha: 0.95, duration: 500 });
  w.sfx('recruit');
  s.tweens.add({ targets: ring, alpha: { from: 1, to: 0 }, scale: 3, duration: 1100, repeat: 1 });
  await w.tw({ targets: sp, alpha: 1, scale: 0.62, duration: 700, ease: 'Back.easeOut' });
  await w.tw({ targets: [t1, t2], alpha: 1, duration: 500 });
  await w.wait(2400);
  await w.tw({ targets: [shade, ring, sp, t1, t2], alpha: 0, duration: 600 });
  [shade, ring, sp, t1, t2].forEach((o) => o.destroy());
}

// ================================================================== picking things back up

const RESUME: Record<string, Script> = {
  async resume_world4(w) {
    const k = (x: string) => f(w, x);
    if (k('w4_end')) {
      if (!k('w5_started')) return SCRIPTS.w5_start(w);
      return;
    }
    if (k('w4_captured')) return SCRIPTS.w4_cell(w);
    if (k('w4_chamber')) return SCRIPTS.w4_chamber(w);
    if (k('w4_taken')) return SCRIPTS.w4_volcano(w);
    if (k('w4_aloft')) return SCRIPTS.w4_sky(w);
    if (k('w4_escaped')) return SCRIPTS.w4_takeoff(w);
    if (k('w4_escaping')) {
      if (w.map.id !== 'w4_isl') w.warp('w4_isl', W4.plaza.x, W4.plaza.y, 'down');
      return SCRIPTS.w4_escape(w);
    }
  },
};

export const W4_END: Record<string, Script> = { ...WARNING, ...ESCAPE, ...VOLCANO, ...CELL, ...RESUME };
void carlo;
