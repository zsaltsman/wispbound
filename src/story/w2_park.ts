import Phaser from 'phaser';
import { isSet, has } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { PIP, P_PIP, pip, scene, cam, camPx, camFollow, pop } from './w2_fx';
import { partMilestone } from './w2_main';
import { C } from '../ui/ui';
import { coasterTrack } from '../world/coaster';
import { FERRIS, SLING } from '../world/maps/park';

// Thrill Harbor: Skip the park worker, and three rides that should not be
// legally allowed to operate.

const SKIP = 'SKIP';
const P_SKIP = 1050;

interface ParkFx {
  wheel: Phaser.GameObjects.Image;
  gondolas: Phaser.GameObjects.Image[];
  spin: { rot: number };
  idle: Phaser.Tweens.Tween;
  ball: Phaser.GameObjects.Image;
  cords: Phaser.GameObjects.Graphics;
  car: Phaser.GameObjects.Image;
  stretch: { k: number };
}

const fx = (w: W) => (w as any).parkFx as ParkFx;

/** Position every gondola around the rim (they always hang straight down). */
function placeGondolas(p: ParkFx) {
  const n = p.gondolas.length;
  p.wheel.setRotation(p.spin.rot);
  p.gondolas.forEach((g, i) => {
    const a = p.spin.rot + (i / n) * Math.PI * 2;
    g.setPosition(FERRIS.cx + Math.cos(a) * FERRIS.r, FERRIS.cy + Math.sin(a) * FERRIS.r - 2);
  });
}

/** The gondola currently nearest the bottom of the wheel. */
function bottomGondola(p: ParkFx) {
  let best = 0;
  let by = -1;
  p.gondolas.forEach((g, i) => {
    if (g.y > by) {
      by = g.y;
      best = i;
    }
  });
  return best;
}

const TOWER_TOPS = [
  { x: SLING.x - 48, y: SLING.top },
  { x: SLING.x + 48, y: SLING.top },
];

const DECOR: Record<string, Script> = {
  /** Called on every load of the park: the wheel turns, the ball hangs on its cords, the carousel bobs. */
  async decorate_park(w) {
    const s = scene(w);
    // an overcast sky beyond the fence, seen from the top of the rides
    w.image('sky2', 30 * 16, 0, -2500).setOrigin(0.5, 1).setScale(2.2, 1.1);
    const wheel = w.image('p3_wheel', FERRIS.cx, FERRIS.cy, 4 * 16 + 150);
    const gondolas: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 10; i++) gondolas.push(w.image('p3_gondola', 0, 0, 4 * 16 + 160).setOrigin(0.5, 0));
    const spin = { rot: 0 };
    const p: ParkFx = {
      wheel,
      gondolas,
      spin,
      idle: s.tweens.add({ targets: spin, rot: Math.PI * 2, duration: 90000, repeat: -1 }),
      ball: w.image('p3_ball', SLING.x, SLING.y - 12, SLING.y + 4),
      cords: s.add.graphics().setDepth(SLING.y + 3),
      car: w.image('p3_car', 0, 0, 500),
      stretch: { k: 0 },
    };
    w.worldLayer.add(p.cords);
    const t0 = coasterTrack()[0];
    p.car.setPosition(t0.x, t0.y - t0.h - 2);
    (w as any).parkFx = p;
    const carousel = w.prop('p3_carousel');
    let f = 0;
    const tick = s.time.addEvent({
      loop: true,
      delay: 33,
      callback: () => {
        if (!wheel.scene) {
          tick.remove();
          p.idle.stop();
          return;
        }
        placeGondolas(p);
        const g = p.cords;
        g.clear();
        g.lineStyle(1, C.light, 1);
        for (const t of TOWER_TOPS) g.lineBetween(t.x, t.y, p.ball.x + (t.x < p.ball.x ? -8 : 8), p.ball.y - 4);
        if (carousel && ++f % 15 === 0) carousel.setFrame((f / 15) % 2);
      },
    });
    placeGondolas(p);
  },
};

// ------------------------------------------------------------------ Skip

async function allDone(w: W) {
  const done = ['coaster', 'ferris', 'sling'].every((r) => isSet(w.state, 'w2_ride_' + r));
  if (!done || has(w.state, 'transducer') || isSet(w.state, 'w2_assembled')) return;
  await w.wait(300);
  await w.say('THAT\'S ALL THREE! You did it! All three rides! And you\'re... mostly intact!', SKIP, { pitch: P_SKIP });
  await w.say("Thrill Harbor is officially re-opening! Probably! As soon as the island stops flooding! And we fix everything! And find customers!", SKIP, { pitch: P_SKIP });
  await w.say("A deal's a deal. Here: the Synchronous Reciprocating Transducer. It fell off the Big O... which explains a lot about the Big O, honestly.", SKIP, { pitch: P_SKIP });
  await w.give('transducer', 1, 'GOT THE SYNCHRONOUS RECIPROCATING TRANSDUCER!');
  await pip(w, "One down! It's still warm. Why is it warm?");
  await partMilestone(w);
}

const PARK: Record<string, Script> = {
  async skip(w) {
    const st = w.state;
    if (!isSet(st, 'w2_inv_met')) {
      await w.say("Hey! Welcome to Thrill Harbor! We're, uh... closed. Kind of. We're trying to reopen.", SKIP, { pitch: P_SKIP });
      await w.say("We really need ride testers. But you look like you've got somewhere more important to be. Come back if you're ever bored. Or brave.", SKIP, { pitch: P_SKIP });
      return;
    }
    if (has(st, 'transducer') || isSet(st, 'w2_assembled')) {
      await w.say('Thanks again, tester! Come back when we reopen! Free rides for life! The life of the ride, I mean. So, about a week.', SKIP, { pitch: P_SKIP });
      return;
    }
    if (!isSet(st, 'w2_park_met')) {
      await w.say("Hey! Welcome to the theme park!", SKIP, { pitch: P_SKIP });
      await w.say("Well. What's left of it.", SKIP, { pitch: P_SKIP });
      await w.say("We're trying to get this place back up and running, but we need some testers. Somebody has to try the rides before the public does. Legally. I think.", SKIP, { pitch: P_SKIP });
      await w.say('Would you mind trying out a few rides?', SKIP, { pitch: P_SKIP });
      await w.wait(300);
      w.face('skip', 'right');
      await w.emote('skip', '!', 700);
      await w.say('Oh, hey!', SKIP, { pitch: P_SKIP });
      await w.say("Isn't that a Synchronous Reciprocating Transducer?", SKIP, { pitch: P_SKIP });
      await w.say('Yeah... it fell off the Ferris wheel. Last Tuesday. During a ride. With people on it.', SKIP, { pitch: P_SKIP });
      await pip(w, "That's EXACTLY what we need! Number one on the list! The universe provides!", '!');
      w.faceTo('skip', 'player');
      await w.say("You want it? Sure! You can have it. But only after you help us test some rides.", SKIP, { pitch: P_SKIP });
      await w.say("Three of them: WIPEOUT, our roller coaster. THE BIG O, our Ferris wheel. And THE YEET, our slingshot.", SKIP, { pitch: P_SKIP });
      await w.say("Ride all three, and the doohickey is yours. Don't worry! They're perfectly safe! I think! Most of the time!", SKIP, { pitch: P_SKIP });
      w.set('w2_park_met');
      return;
    }
    const left = [
      ['coaster', 'WIPEOUT, over on the west side'],
      ['ferris', 'THE BIG O, up north'],
      ['sling', 'THE YEET, north-east'],
    ].filter(([r]) => !isSet(st, 'w2_ride_' + r));
    await w.say(`Still to test: ${left.map((l) => l[1]).join('; ')}. Just walk up to the ride and hop on!`, SKIP, { pitch: P_SKIP });
  },
  async park_part(w) {
    await w.say('A heavy, humming metal cylinder lies in the mud, covered in coils and very small warning labels.');
    if (isSet(w.state, 'w2_park_met')) await w.say('Skip is watching you very, very closely.');
  },
  async sign_coaster(w) {
    await w.say('WIPEOUT. YOU MUST BE THIS TALL TO RIDE. Someone has drawn the line on the sign at about knee height.');
  },
  async sign_ferris(w) {
    await w.say('THE BIG O. ENJOY A RELAXING VIEW OF THE ISLAND. PLEASE DO NOT ROCK THE GONDOLA. THE GONDOLA WILL ROCK ITSELF.');
  },
  async sign_sling(w) {
    await w.say('THE YEET. 0 TO 100 IN 1.2 SECONDS. RIDERS WITH HEART, BACK OR "EXISTENTIAL" CONDITIONS SHOULD NOT RIDE.');
  },
  async sign_park_rules(w) {
    await w.say('PARK RULES: 1. NO SWIMMING. 2. NO, REALLY, NO SWIMMING. 3. IN CASE OF TSUNAMI, PLEASE EXIT THROUGH THE GIFT SHOP.');
  },
  async park_carousel(w) {
    await w.say('The carousel still turns, very slowly, to music only it can hear. One horse has fallen off and lies on the platform, waiting to be rescued.');
  },
  async park_bumper(w) {
    await w.say('BUMPERS. The floor is cracked and the cars are all piled into one corner, as if they huddled together during the last wave.');
  },
  async park_funhouse(w) {
    await w.say("The funhouse clown grins at you. The flood made his paint run, so now he looks like he's crying. And grinning. At the same time.");
    await w.say('The mouth door is jammed shut with seaweed. Probably for the best.');
  },
  async park_haunted(w) {
    await w.say('TERROR TUNNEL. The track runs into the dark. A cardboard ghost has slumped over the entrance.');
    if (w.state.creature) await w.say('Your spirit looks at the cardboard ghost for a long moment. It seems almost offended.');
  },
  async park_corndog(w) {
    await w.say("CORN DOGS. The stand's sign promises \"WORLD FAMOUS\". There is one corn dog left under the heat lamp. It has been there since before the second wave.");
  },
  async park_cotton(w) {
    await w.say('COTTON CANDY. The machine is full of something grey and fluffy. It is not cotton candy anymore. It may be alive.');
  },
  async park_ringtoss(w) {
    await w.say('RING TOSS. Three soggy teddy bears stare at you from the prize shelf, eyes full of salt water and regret.');
  },
  async park_tix(w) {
    await w.say('TICKETS: $5. A note taped below: "OR WHATEVER YOU HAVE. PLEASE. ANYTHING."');
  },
  async park_letter(w) {
    await w.say('A huge wooden letter "H", fallen off some sign. Thrill Harbor is now, according to the arch, THRILL ARBOR.');
  },

  // ================================================================ ride 1: WIPEOUT
  async ride_coaster(w) {
    const st = w.state;
    if (!isSet(st, 'w2_park_met')) return w.say("WIPEOUT. The car sits at the platform. There's a chain across the gate and a sign: CLOSED FOR TESTING.");
    if (isSet(st, 'w2_ride_coaster')) return w.say('You have already tested WIPEOUT. Your spine has filed a formal complaint.');
    if (!(await w.confirm('Ride WIPEOUT, the roller coaster?'))) return;
    const s = scene(w);
    const p = fx(w);
    const track = coasterTrack();
    w.spawn('skip_r', 'employee', 10, 31, 'up');
    await w.say("Keep your arms and legs inside the car at all times. Also your hopes and dreams.", SKIP, { pitch: P_SKIP });
    await w.say("The lap bar? Oh, that's decorative.", SKIP, { pitch: P_SKIP });
    await pip(w, "I'll wait here. On the ground. Where the ground is.");
    w.hide('player');
    const rider = w.sprite('ch_player', p.car.x, p.car.y - 4, 0).setOrigin(0.5, 1);
    const sync = () => {
      rider.setPosition(p.car.x, p.car.y - 2);
      rider.setDepth(9800);
      p.car.setDepth(9801);
    };
    sync();
    camFollow(w, p.car as any, 0.18, 2.2);
    w.sfx('clank');
    await w.wait(500);
    // find the interesting points along the track
    let topI = 0;
    track.forEach((t, i) => {
      if (t.h > track[topI].h) topI = i;
    });
    const brokenI = track.findIndex((t) => t.broken);
    let lastDir = 0;
    let flail = 0;
    let gapLift = 0;
    let wheelLost = false;
    for (let i = 1; i <= track.length; i++) {
      const t = track[i % track.length];
      const prev = track[i - 1];
      const dh = t.h - prev.h;
      let dt = dh > 0.4 ? 48 : dh < -0.6 ? 7 : 15;
      if (i < 20) dt = 30;
      // the lift hill: clack, clack, clack
      if (dh > 0.4 && i % 6 === 0) {
        w.sfx('tickclock');
        if (i % 18 === 0) pop(w, p.car.x + 14, p.car.y - 12, 'CLACK', C.mid, 600);
      }
      if (i % 40 === 0 && dh > 0.4) w.sfx('creakmetal');
      // over the top
      if (i === topI) {
        w.sfx('creakmetal');
        pop(w, p.car.x, p.car.y - 20, '...', C.white, 1200);
        await w.wait(1100);
        pop(w, p.car.x, p.car.y - 24, 'OH NO', C.white, 900);
        await w.wait(500);
        w.sfx('whoosh');
        w.shake(600, 0.006);
      }
      if (i > topI && i < topI + 30 && i % 6 === 0) pop(w, p.car.x - 10 + Math.random() * 20, p.car.y - 20, 'AAAAAA!', C.white, 700);
      // the broken stretch: a plank gives way, the car jumps the gap
      if (i === brokenI) {
        w.sfx('crash');
        w.flash(0.5);
        w.shake(500, 0.012);
        pop(w, p.car.x, p.car.y - 26, 'CRACK!', C.white, 1000);
        for (let k = 0; k < 6; k++) {
          const d = w.image('fx_dotM', p.car.x + (Math.random() - 0.5) * 20, p.car.y + 4, 9700);
          s.tweens.add({ targets: d, y: t.y + 10, x: d.x + (Math.random() - 0.5) * 30, angle: 360, duration: 700 + Math.random() * 400, onComplete: () => d.destroy() });
        }
        s.tweens.add({ targets: { v: 0 }, v: Math.PI, duration: 520, onUpdate: (tw) => (gapLift = Math.sin(tw.getValue() as number) * 26) });
      }
      // sharp turns rattle everything loose
      const nxt = track[(i + 3) % track.length];
      const dir = Math.atan2(nxt.y - nxt.h - (t.y - t.h), nxt.x - t.x);
      if (Math.abs(dir - lastDir) > 0.9 && i > 10) {
        w.sfx('rattle');
        w.shake(160, 0.004);
        if (i % 3 === 0) pop(w, p.car.x, p.car.y - 18, 'RATTLE', C.light, 600);
        if (!wheelLost && i > brokenI + 40) {
          // a wheel pings off into the dirt
          wheelLost = true;
          const wh = w.image('fx_dot', p.car.x, p.car.y + 6, 9700).setScale(2);
          s.tweens.add({ targets: wh, x: wh.x + 70, y: wh.y + 50, angle: 720, duration: 900, ease: 'Quad.easeOut', onComplete: () => wh.destroy() });
          pop(w, p.car.x, p.car.y - 22, 'PING!', C.white, 900);
        }
      }
      lastDir = dir;
      p.car.setPosition(t.x, t.y - t.h - 2 - gapLift);
      p.car.setRotation(Math.max(-0.6, Math.min(0.6, -dh * 0.25)));
      if (++flail % 9 === 0) rider.setFrame([0, 3, 6, 0][Math.floor(Math.random() * 4)]);
      sync();
      await w.wait(dt);
    }
    // back at the station, hard
    p.car.setRotation(0);
    w.sfx('crash');
    w.shake(500, 0.01);
    await w.tw({ targets: p.car, x: p.car.x + 3, duration: 80, yoyo: true, repeat: 2 });
    rider.destroy();
    w.hide('player', false);
    w.face('player', 'down');
    await w.camReturn(500);
    await w.emote('player', '...', 1200);
    await w.say('...And that was WIPEOUT! How do you feel?', SKIP, { pitch: P_SKIP });
    await w.emote('player', '!', 600);
    await w.say("That's the spirit! Mostly screaming! I'll write \"PASSED\". The car lost a wheel, but that's normal. It grows back.", SKIP, { pitch: P_SKIP });
    await pip(w, 'I watched the whole thing. I need to lie down.');
    w.remove('skip_r');
    w.set('w2_ride_coaster');
    await allDone(w);
  },

  // ================================================================ ride 2: THE BIG O
  async ride_ferris(w) {
    const st = w.state;
    if (!isSet(st, 'w2_park_met')) return w.say('THE BIG O creaks around and around, very slowly, with nobody on it. A chain hangs across the boarding ramp.');
    if (isSet(st, 'w2_ride_ferris')) return w.say('You have already tested THE BIG O. From now on, you are a ground person.');
    if (!(await w.confirm('Ride THE BIG O, the Ferris wheel?'))) return;
    const s = scene(w);
    const p = fx(w);
    w.spawn('skip_r', 'employee', 32, 15, 'up');
    await w.say("Step right in! The Big O! Our most relaxing ride!", SKIP, { pitch: P_SKIP });
    await w.say("...That isn't saying much, but still!", SKIP, { pitch: P_SKIP });
    // stop the idle turn and line a gondola up with the ramp
    p.idle.pause();
    const k = bottomGondola(p);
    const n = p.gondolas.length;
    const target = Math.PI / 2 - (k / n) * Math.PI * 2;
    let delta = target - p.spin.rot;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    await w.tw({ targets: p.spin, rot: p.spin.rot + delta, duration: 700 });
    const g = p.gondolas[k];
    g.setTexture('p3_gondolaP');
    w.hide('player');
    w.sfx('clank');
    camFollow(w, g as any, 0.12, 2);
    // up we go, gently
    w.sfx('creakmetal');
    const creak = s.time.addEvent({ delay: 1400, loop: true, callback: () => w.sfx('creakmetal') });
    const up = w.tw({ targets: p.spin, rot: p.spin.rot - Math.PI, duration: 9000, ease: 'Sine.easeInOut' });
    await w.wait(2600);
    await w.say('The gondola rises, swaying gently. The whole island spreads out below you.');
    await w.say("From up here you can see how much of it is underwater. Whole streets are just... sea. It's quiet. It's almost peaceful.");
    await up;
    creak.remove();
    // and then it isn't
    await w.wait(800);
    w.sfx('clank');
    w.shake(400, 0.008);
    pop(w, g.x, g.y - 6, 'CLUNK', C.white, 1000);
    await w.wait(700);
    w.sfx('alarm');
    await w.say('The wheel jerks to a stop. You are at the very top.');
    const sway = s.tweens.add({ targets: g, angle: { from: -14, to: 14 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (let i = 0; i < 3; i++) {
      w.sfx('creakmetal');
      w.shake(300, 0.006);
      await w.wait(400);
    }
    await w.say('Something in the hub makes a long, low, deeply alarming noise.');
    // a bolt drops out of the axle and falls all the way down
    const bolt = w.image('fx_dot', FERRIS.cx + 4, FERRIS.cy, 9700);
    w.sfx('swish');
    await w.tw({ targets: bolt, y: FERRIS.cy + 100, angle: 540, duration: 900, ease: 'Quad.easeIn' });
    w.sfx('clank');
    bolt.destroy();
    await w.say("UH. DON'T PANIC!", SKIP, { pitch: 1300 });
    await w.say("I've done this before! On a much smaller wheel! A hamster wheel! It went great! The hamster was fine! Mostly!", SKIP, { pitch: 1300 });
    await pip(w, 'THIS is why I stay on the ground! The ground has never once stopped at the top!');
    await w.say("Okay! Okay. I'm going to try the emergency reverse. Hold on to something! Hold on to everything!", SKIP, { pitch: P_SKIP });
    sway.stop();
    // full reverse
    w.sfx('rev');
    w.sfx('whoosh');
    s.tweens.add({ targets: g, angle: -40, duration: 300 });
    await w.tw({ targets: p.spin, rot: p.spin.rot + Math.PI, duration: 1500, ease: 'Quad.easeIn' });
    w.sfx('crash');
    w.shake(700, 0.016);
    pop(w, g.x, g.y - 6, 'SLAM!', C.white, 1000);
    await w.tw({ targets: g, angle: 50, duration: 220, ease: 'Sine.easeOut' });
    await w.tw({ targets: g, angle: -30, duration: 260 });
    await w.tw({ targets: g, angle: 15, duration: 300 });
    await w.tw({ targets: g, angle: 0, duration: 400 });
    g.setTexture('p3_gondola');
    w.hide('player', false);
    w.face('player', 'down');
    await w.camReturn(500);
    p.idle.resume();
    await w.emote('player', '...', 1200);
    await w.say("See? Got you down! ...Mostly by accident! But down is down!", SKIP, { pitch: P_SKIP });
    await w.say("THE BIG O: tested! I'll write \"RELAXING\".", SKIP, { pitch: P_SKIP });
    w.remove('skip_r');
    w.set('w2_ride_ferris');
    await allDone(w);
  },

  // ================================================================ ride 3: THE YEET
  async ride_sling(w) {
    const st = w.state;
    if (!isSet(st, 'w2_park_met')) return w.say('THE YEET. Two enormous towers, a steel ball on a pair of bungee cords, and a sign: CLOSED FOR EVERYONE\'S SAFETY.');
    if (isSet(st, 'w2_ride_sling')) return w.say('You have already tested THE YEET. You have seen things up there. You will not speak of them.');
    if (!(await w.confirm('Ride THE YEET, the slingshot?'))) return;
    const s = scene(w);
    const p = fx(w);
    w.spawn('skip_r', 'employee', 50, 16, 'left');
    await w.say("Ooh, The Yeet! My favorite! Let me strap you in.", SKIP, { pitch: P_SKIP });
    w.hide('player');
    w.sfx('clank');
    await w.say("Safety bar? Check. Harness? Check. Safety? ...Check-ish.", SKIP, { pitch: P_SKIP });
    const ballY = p.ball.y;
    camFollow(w, p.ball as any, 0.3, 2);
    await w.wait(400);
    // countdown
    for (const n of ['3', '2', '1']) {
      w.sfx('tick');
      pop(w, p.ball.x, p.ball.y - 18, n, C.white, 700);
      await w.wait(650);
    }
    w.sfx('whoosh');
    w.sfx('rev');
    w.flash(0.4);
    w.shake(300, 0.01);
    pop(w, p.ball.x, p.ball.y - 18, 'YEET!', C.white, 900);
    cam(w).zoomTo(1, 900, 'Sine.easeOut', true);
    const streaks = s.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        const l = w.image('fx_px', p.ball.x + (Math.random() - 0.5) * 180, p.ball.y - 200, 9800).setScale(1, 18).setAlpha(0.7);
        s.tweens.add({ targets: l, y: l.y + 400, alpha: 0, duration: 420, onComplete: () => l.destroy() });
      },
    });
    const screams = s.time.addEvent({ delay: 200, loop: true, callback: () => pop(w, p.ball.x + (Math.random() - 0.5) * 40, p.ball.y + 30, 'AAAAA', C.light, 800) });
    s.tweens.add({ targets: p.ball, angle: 1080, duration: 1500, ease: 'Quad.easeOut' });
    await w.tw({ targets: p.ball, y: -720, duration: 1500, ease: 'Quad.easeOut' });
    streaks.remove();
    screams.remove();
    // the top of the world
    w.sfx('wave');
    const gl = w.sprite('gull', p.ball.x + 140, p.ball.y - 10, 9800);
    gl.play('gull_flap');
    s.tweens.add({ targets: gl, x: p.ball.x - 160, duration: 3200, onComplete: () => gl.destroy() });
    await w.wait(900);
    await w.say("For one long moment you just hang there, weightless. It's very quiet up here.");
    await w.say('A gull flaps past at eye level. It looks at you. You look at it. Neither of you can explain this.');
    await w.say('Far below, the island is tiny. And out at sea, past the reef, there is a dark shape under the water.');
    await w.say('It is bigger than the island.');
    await w.wait(400);
    // and down
    w.sfx('whoosh');
    cam(w).zoomTo(1.6, 1400, 'Sine.easeIn', true);
    const bounces = [
      [ballY + 40, 1300],
      [ballY - 260, 900],
      [ballY + 26, 800],
      [ballY - 120, 600],
      [ballY + 14, 500],
      [ballY - 40, 380],
    ];
    for (let i = 0; i < bounces.length; i++) {
      const [y, ms] = bounces[i];
      const down = y > ballY;
      if (down) pop(w, p.ball.x, p.ball.y - 18, i === 0 ? 'WAAAAH!' : 'BOING', C.white, 700);
      await w.tw({ targets: p.ball, y, duration: ms, ease: down ? 'Quad.easeIn' : 'Quad.easeOut' });
      if (down) {
        w.sfx('swish');
        w.shake(200, 0.006);
      }
    }
    // one cord snaps on the landing
    w.sfx('crash');
    w.flash(0.5);
    w.shake(700, 0.018);
    pop(w, p.ball.x, p.ball.y - 20, 'SNAP!', C.white, 1000);
    await w.tw({ targets: p.ball, y: ballY + 8, angle: p.ball.angle + 90, duration: 260, ease: 'Bounce.easeOut' });
    await w.tw({ targets: p.ball, y: ballY, angle: 0, duration: 400 });
    w.hide('player', false);
    w.face('player', 'down');
    await w.camReturn(600);
    await w.emote('player', '...', 1400);
    await w.say('Nine out of ten! You landed on the PAD! Most people land in the funhouse.', SKIP, { pitch: P_SKIP });
    await w.say("I'll fix the cord. With a different cord. THE YEET: tested!", SKIP, { pitch: P_SKIP });
    await pip(w, "You went so high I lost sight of you. I briefly mourned. It was a lovely service.");
    w.remove('skip_r');
    w.set('w2_ride_sling');
    await allDone(w);
  },
};

export const W2_PARK: Record<string, Script> = { ...DECOR, ...PARK };

void P_LOW;
void P_MID;
void P_HIGH;
void PIP;
void P_PIP;
void camPx;
