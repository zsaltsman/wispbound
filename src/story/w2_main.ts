import { departPrompt } from './voyage';
import Phaser from 'phaser';
import { isSet, has, ITEMS } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type Gate, type W } from './helpers';
import { SCRIPTS } from './registry';
import { partsHave, PART_NAMES, checklist } from './w2_state';
import { PIP, P_PIP, pip, scene, cam, camPx, camFollow, pop, bars, titleCard, blackout, hideParty, cut } from './w2_fx';
import { C, txt, box } from '../ui/ui';
import { W as SW, H as SH } from '../constants';
import { getCreature } from '../engine/creatures';
import { ISL_DOORS, HELIPADS, PARK_GATE, ISL_W, ISL_H } from '../world/maps/island';
import { PB_SPOT, STORE_HOLE, DEEP_W, GOD_X } from '../world/maps/w2interiors';
import { GODS, GOD_NAMES, type God } from '../gfx/artGods';
import { templePip } from './w2_temples';

// World 2: THE FLOODED ISLAND. The arrival, the professor and his checklist,
// the islanders, the emergency briefing, the evacuation, Slick Rick in the
// grocery store, the assembly, the tsunami, the dive and the Cave of the Gods.

type Dir = 'up' | 'down' | 'left' | 'right';
const RICK = 'SLICK RICK';

/** Light Rick up (the store is dark; he should always be the brightest thing in it). */
function spotRick(w: W) {
  const rk = w.actor('rick_store');
  if (!rk || w.extraLights.some((l) => (l as any).rick)) return;
  w.extraLights.push({ x: rk.sprite.x, y: rk.sprite.y - 20, r: 46, rick: true } as any);
}
const P_RICK = 1200;

// ================================================================== the way in from World 1

/** Where you stand outside each building (used when a cutscene pulls you outdoors). */
function outside(map: string): { x: number; y: number } {
  if (map === 'park') return PARK_GATE;
  const key = map.replace(/^w2_/, '');
  const d = (ISL_DOORS as Record<string, { x: number; y: number }>)[key === 'inv' ? 'inventor' : key];
  return d ? { x: d.x, y: d.y + 1 } : { x: 48, y: 44 };
}

const ARRIVE: Record<string, Script> = {
  /** Called from the World 1 ending, right after the iris closes on the mayor. */
  async w2_title(w) {
    w.set('w2_started');
    w.save();
    hideParty(w, true);
    w.music(null);
    // start out over the open sea
    await camPx(w, 48 * 16 + 8, 86 * 16, 0, 2);
    w.sfx('wave');
    const s = scene(w);
    const black = w.ui(s.add.rectangle(0, 0, SW, SH, C.black).setOrigin(0, 0).setDepth(94));
    await titleCard(w, '', 'SALTWASH ISLAND', 2800, false);
    black.destroy();
    w.music('island');
    await camPx(w, 48 * 16 + 8, 74 * 16, 3200, 2);
    hideParty(w, false);
    w.face('player', 'up');
    await w.wait(500);
    await w.camReturn(400);
    await w.wait(600);
    await SCRIPTS.w2_arrival(w);
  },

  async w2_arrival(w) {
    if (isSet(w.state, 'w2_local_met')) return;
    // a local trudges down to meet the newcomer
    if (w.state.creature) {
      await w.emote('follower', '?', 700);
      await w.say(`${getCreature(w.state.creature).name} stares at all the water and shivers.`);
    }
    w.face('w2_local', 'down');
    await w.move('w2_local', ['down', 'down', 'down'], 330);
    w.face('player', 'up');
    await w.wait(300);
    const L = (s: string) => w.say(s, 'ISLANDER', { pitch: P_LOW });
    await L("You're new here, aren't you?");
    await w.emote('player', '...', 700);
    await L('Well. Welcome to the island.');
    await w.wait(500);
    await L("Or whatever's left of it.");
    await L("We've been getting hit by tsunami after tsunami. Six this year. Nobody can even predict them anymore.");
    await L('People have lost their homes. People have lost their lives.');
    await w.wait(700);
    await L('My neighbor\'s whole street is just... gone. Families who lost everything are sleeping in the school gym. What\'s left of it.');
    await L("They've even stopped all future development around here. No point building what the sea's going to take back.");
    await L("Everyone's scared of the next one. You can see it in their faces. Every time the tide goes out, we all just... stop. And listen.");
    await L("Nobody knows what's causing it.");
    await w.wait(600);
    await L('We just want it to end.');
    await w.emote('player', '...', 900);
    await L("Talk to people. And if you hear about the crazy man on Low Street, the one with all the banging... don't go in his house.");
    w.set('w2_local_met');
    await w.move('w2_local', ['up', 'up', 'up', 'left', 'left', 'left', 'left'], 330);
  },
};

// ================================================================== the islanders

const FOLK: Record<string, Script> = {
  async w2_local(w) {
    await SCRIPTS.w2_arrival(w);
  },
  async w2_local2(w) {
    if (!isSet(w.state, 'w2_inv_met')) {
      await w.say("If you're looking for answers, try the professor on Low Street. West end, with the antennas. Everyone says he's crazy.", 'ISLANDER', { pitch: P_LOW });
      await w.say('...Everyone also said the waves would stop. So.', 'ISLANDER', { pitch: P_LOW });
    } else await w.say("You're with the professor now? Huh. If he's right about anything, I hope it's this.", 'ISLANDER', { pitch: P_LOW });
  },
  async r_angry(w) {
    await w.say('Third wave this YEAR! And what does City Hall do? Hand out SANDBAGS!', 'ANGRY MAN', { pitch: P_LOW });
    await w.say("You can't sandbag the OCEAN! I've TRIED! I spent a whole weekend on it!", 'ANGRY MAN', { pitch: P_LOW });
  },
  async r_scared(w) {
    await w.say('Every time the wind changes I run outside and check the water line.', 'NERVOUS WOMAN', { pitch: P_HIGH });
    await w.say("I haven't slept a full night in a year. My kids sleep in their shoes, in case we have to run.", 'NERVOUS WOMAN', { pitch: P_HIGH });
  },
  async r_accept(w) {
    await w.say('My wife and I were both born on this island. Married on that beach.', 'OLD EZRA', { pitch: P_LOW });
    await w.wait(400);
    await w.say("Her name's on the memorial now. Second wave. I come here every morning and tell her the news.", 'OLD EZRA', { pitch: P_LOW });
    await w.say("If the sea wants this island back, I suppose it was only ever borrowed. But I'd like to stay until the end. She would've.", 'OLD EZRA', { pitch: P_LOW });
  },
  async r_joker(w) {
    await w.say("Good news! I've finally got beachfront property!", 'MARCO', { pitch: P_MID });
    await w.say("Bad news: it's my living room. The beach came to me.", 'MARCO', { pitch: P_MID });
    await w.say("...Ha. You've got to laugh, right? Otherwise you'd just... yeah.", 'MARCO', { pitch: P_MID });
  },
  async r_sandbag(w) {
    await w.say('Forty sandbags a day. Every day. The sea takes thirty-nine of them back.', 'SANDBAG SAL', { pitch: P_LOW });
    await w.say("That's a net gain of one sandbag. I call that progress.", 'SANDBAG SAL', { pitch: P_LOW });
  },
  async r_kid(w) {
    await w.say('My school floated away! It was SO cool!', 'KID', { pitch: P_HIGH });
    await w.say("...Mom says that's not a reason to stop doing homework. Mom is the worst.", 'KID', { pitch: P_HIGH });
    if (w.state.creature) await w.say('Is that a GHOST?! Can it eat homework?!', 'KID', { pitch: P_HIGH });
  },
  async r_fisher(w) {
    await w.say("Haven't caught a single fish in four months. Not one. Not even a boot.", 'OLD SALT', { pitch: P_LOW });
    await w.say("The fish are gone. Fish know things. Something out there spooked every fish in the sea. They LEFT.", 'OLD SALT', { pitch: P_LOW });
  },
  async r_builder(w) {
    await w.say('All construction halted. By order of the council. No new houses, no repairs, nothing.', 'BUILDER BO', { pitch: P_LOW });
    await w.say("No point building when the sea keeps knocking it all down. I build sandcastles now. Just to keep my hand in.", 'BUILDER BO', { pitch: P_LOW });
  },
  async r_conspiracy(w) {
    await w.say('The mayor did it. Brando Biggs. I don\'t know HOW. But I know.', 'CONSPIRACY CARL', { pitch: P_MID });
    await w.say("Look at his face. That's the face of a man who controls the tides.", 'CONSPIRACY CARL', { pitch: P_MID });
    await pip(w, "He doesn't control the tides. I would know. I've asked him. Twice. He cried.");
  },
  async r_cat(w) {
    if (isSet(w.state, 'w2_cat_found')) {
      await w.say('Mister Whiskers is out on the east point?! Of course he is. Thank you, little one. I\'ll go and get him.', 'MRS. PELL', { pitch: P_HIGH });
      if (!isSet(w.state, 'w2_cat_thanked')) {
        w.set('w2_cat_thanked');
        await w.emote('r_cat', 'heart', 900);
      }
      return;
    }
    await w.say('Have you seen my cat? Black and white. Answers to Mister Whiskers. Also to nothing.', 'MRS. PELL', { pitch: P_HIGH });
  },
  async r_cat_cat(w) {
    w.sfx('meow');
    await w.say('A black and white cat sits on the very edge of the island, staring out to sea. It has seen every wave. It is completely unbothered.');
    if (!isSet(w.state, 'w2_cat_found')) {
      w.set('w2_cat_found');
      await w.say('This must be Mister Whiskers.');
    }
  },
  async r_couple(w) {
    await w.say("We're leaving on the next ferry. We've packed and everything.", 'JUNE', { pitch: P_HIGH });
    await w.say('...There hasn\'t been a ferry in three weeks. But we\'re ready. When it comes.', 'JUNE', { pitch: P_HIGH });
  },
  async r_lookout(w) {
    await w.say('You can see the whole bay from out here. Watch the water.', 'LOOKOUT', { pitch: P_LOW });
    await w.say('Before a wave, the sea pulls back. Way back. Like it\'s breathing in.', 'LOOKOUT', { pitch: P_LOW });
    await w.say("Waves don't breathe. So what's out there that does?", 'LOOKOUT', { pitch: P_LOW });
    await pip(w, 'EXACTLY! Thank you! FINALLY, someone gets it!', '!');
  },
  async r_campaign(w) {
    await w.say('Vote Biggs! Vote BIGGS! Brando Biggs: Keeping Your Feet Dry Since... Well, Not Recently!', 'MAYOR BIGGS', { pitch: P_MID });
    await w.say('No, sir, I did NOT cause the tsunami! Nobody can cause a tsunami! Vote Biggs!', 'MAYOR BIGGS', { pitch: P_MID });
  },
  async abbott(w) {
    await w.say("We're taking what fits in the car.", 'MR. ABBOTT', { pitch: P_LOW });
    await w.say("The car doesn't run. So, whatever fits in our arms, I suppose.", 'MR. ABBOTT', { pitch: P_LOW });
  },
  async abbott_kid(w) {
    await w.say("Dad says we can't bring my fish tank. I said the fish could just live in the street now. Dad didn't laugh.", 'RUBY', { pitch: P_HIGH });
  },
  async hall_protester(w) {
    await w.say("I'm protesting! I'm not sure what yet. Something. EVERYTHING!", 'PROTESTER', { pitch: P_LOW });
  },
  async hall_aide(w) {
    await w.say("I'm the mayor's aide. I aid him. Mostly with tissues, lately.", 'AIDE', { pitch: P_MID });
  },
  async bank_cust1(w) {
    await w.say("I've been in this line since the second tsunami. I'm not leaving now. I've put in the work.", 'OLD MAN', { pitch: P_LOW });
  },
  async bank_cust2(w) {
    await w.say('I came to withdraw everything. Then I remembered I have nowhere to put it that the sea won\'t find.', 'CUSTOMER', { pitch: P_HIGH });
  },
  async bank_guard(w) {
    await w.say('No running. No swimming. Yes, we have to say that now.', 'GUARD', { pitch: P_LOW });
  },
  async bank_teller2(w) {
    await w.say('Ms. Ledger handles loans. I handle deposits. We have had very few deposits lately.', 'TELLER', { pitch: P_HIGH });
  },
};

// ================================================================== signs and sights around the island

const SIGHTS: Record<string, Script> = {
  async w2_bridge(w) {
    await w.say('BRIDGE TEMPORARILY CLOSED. The sign is eleven years old. Someone has walked a plank across anyway.');
  },
  async w2_sign_flood(w) {
    await w.say('FLOOD ZONE. Underneath, someone has written in marker: ALSO EVERYTHING ELSE.');
  },
  async w2_sign_heli(w) {
    await w.say('EMERGENCY EVACUATION POINT A. IN THE EVENT OF EVACUATION, REMAIN CALM. PLEASE DO NOT PICNIC ON THE HELIPAD.');
  },
  async w2_memorial(w) {
    await w.say('A memorial stone, still new. Rows and rows of names, carved close together to fit them all.');
    await w.wait(500);
    await w.say('Fresh flowers are tucked into the cracks. Someone has left a child\'s shoe on top.');
    if (w.companion) {
      await w.wait(400);
      await w.say('...I knew most of these names. I fixed their radios. Their toasters.', PIP, { pitch: 760 });
      await w.say("This is why. This is why I'm building it.", PIP, { pitch: 760 });
    }
  },
  async w2_boat_street(w) {
    await w.say('A fishing boat called the MOLLY, sitting in the road three streets from the sea. Someone has left flowers in the wheelhouse.');
  },
  async w2_billboard(w) {
    await w.say('ALL DEVELOPMENT HALTED. By order of the island council, all future construction is suspended until further notice.');
    await w.say('Someone has spray-painted a small, sad boat underneath.');
  },
  async w2_crane_sign(w) {
    await w.say('SALTWASH TOWERS: LUXURY LIVING, COMING SOON. The sign is faded. The crane has rusted in place.');
  },
  async w2_boarded(w) {
    await w.say('The door is boarded up. A note is nailed to it: GONE TO MY SISTER\'S. TAKE ANYTHING YOU NEED.');
  },
  async w2_sign_beach(w) {
    await w.say('TSUNAMI HAZARD ZONE. IN CASE OF EARTHQUAKE, GO TO HIGH GROUND.');
    await w.say('Below, in marker: THERE IS NO HIGH GROUND.');
  },
  async w2_lookout(w) {
    await w.say('LOOKOUT POINT. On a clear day you can see the mainland. It has been a long time since a clear day.');
  },
};

// ================================================================== Professor Pipwick

/** The paper checklist he hands you, drawn as a little parchment over the screen. */
async function showChecklist(w: W) {
  const s = scene(w);
  const c = w.ui(s.add.container(0, 0).setDepth(70));
  const g = s.add.graphics();
  box(g, 70, 28, SW - 140, 196, 'light');
  c.add(g);
  c.add(txt(s, SW / 2, 40, 'SUBMARINE PARTS: URGENT!!!', { color: C.black, origin: [0.5, 0] }));
  const rows = checklist(w.state);
  rows.forEach((r, i) => {
    const y = 64 + i * 38;
    g.lineStyle(1, C.black, 1).strokeRect(84, y, 9, 9);
    c.add(txt(s, 100, y, `${i + 1}. ${r.name}`, { color: C.black, maxW: SW - 190 }));
    if (r.locked) c.add(txt(s, 100, y + 20, '(DO THIS ONE LAST)', { color: C.dark }));
  });
  c.setScale(0.6).setAlpha(0);
  s.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 250, ease: 'Back.easeOut' });
  c.setPosition((SW * 0.4) / 2, (SH * 0.4) / 2);
  s.tweens.add({ targets: c, x: 0, y: 0, duration: 250, ease: 'Back.easeOut' });
  w.sfx('quest');
  return c;
}

const PROF: Record<string, Script> = {
  async enter_w2_inv(w) {
    const st = w.state;
    // coming home with everything
    if (isSet(st, 'w2_rick_beaten') && has(st, 'pb') && partsHave(st) >= 3 && !isSet(st, 'w2_assembled')) return SCRIPTS.w2_assembly(w);
    if (isSet(st, 'w2_inv_met')) return;
    // the first visit: noise, sparks, and a man inside a submarine
    w.music(null);
    for (let i = 0; i < 3; i++) {
      w.sfx('hammer');
      w.shake(120, 0.003);
      await w.wait(320);
    }
    w.sfx('clank');
    const sp = scene(w).add.particles(0, 0, 'fx_spark', { x: 8 * 16, y: 5 * 16, speed: { min: 30, max: 90 }, lifespan: 300, quantity: 3, frequency: 40 });
    sp.setDepth(9000);
    w.worldLayer.add(sp);
    await w.wait(900);
    sp.stop();
    w.face('pipwick', 'right');
    await w.say('...and the doohickey connects to the thingamabob... which connects to the OTHER doohickey...', '???', { pitch: P_PIP });
    await w.emote('pipwick', '!', 700);
    w.faceTo('pipwick', 'player');
    await w.say('WHO GOES THERE?! Friend? Foe? Tax inspector?!', '???', { pitch: P_PIP });
    await w.wait(400);
    await w.say("...Oh. A child. A small, silent child. With a... is that a GHOST? Marvelous. Come in, come in, mind the wires.", '???', { pitch: P_PIP });
    w.music('inventor');
    await w.say("Professor Barnaby Pipwick. Inventor. Genius. Local lunatic, if you ask the neighbors. Don't ask the neighbors.", PIP, { pitch: P_PIP });
    await w.say("I suppose you've come about the floods. Everyone comes about the floods. Then they leave about the floods.", PIP, { pitch: P_PIP });
    await w.wait(400);
    await w.say("Here's the thing nobody wants to hear. I KNOW why the island keeps flooding.", PIP, { pitch: P_PIP });
    await w.emote('player', '?', 700);
    await w.say('These are not normal tsunamis. There is no earthquake. No storm. The sea just... rises. And then it falls on us.', PIP, { pitch: P_PIP });
    await w.say("Water is being DISPLACED. Pushed aside. By something underneath the ocean. Something big.", PIP, { pitch: P_PIP });
    await w.wait(500);
    await w.say("No. Bigger than that. Bigger than whatever you just imagined. Imagine a whale. Now imagine the whale is scared of it.", PIP, { pitch: P_PIP });
    await w.say("Something so unimaginably gigantic that just by drifting closer to the island, it shoves the whole sea onto our streets.", PIP, { pitch: P_PIP });
    await w.say("It should be physically impossible. Nothing that large can exist. I've done the math eleven times. The math is very upset.", PIP, { pitch: P_PIP });
    await w.wait(600);
    await w.say('The only way to stop the tsunamis, to save the island, is to go down there and stop whatever is causing them.', PIP, { pitch: 760 });
    await w.say("And if it won't stop... we may have to make it stop. By force. Your spooky little friend looks like it could pack a punch.", PIP, { pitch: 760 });
    await w.say('Which brings me to HER.', PIP, { pitch: P_PIP });
    await camPx(w, 9 * 16, 5 * 16, 800);
    await w.say("The PIPWICK MARK VII. A submarine capable of reaching the very bottom of the sea. We don't talk about Marks one through six.", PIP, { pitch: P_PIP });
    await w.camReturn(600);
    await w.say("She's missing several components. Highly advanced. Extremely rare. One of them is also in the snack aisle.", PIP, { pitch: P_PIP });
    const list = await showChecklist(w);
    await w.wait(1400);
    await w.say('And number four: a jar of peanut butter.', PIP, { pitch: P_PIP });
    await w.emote('player', '...', 1000);
    if (w.state.creature) await w.emote('follower', '?', 700);
    await w.say("Don't look at me like that. It's ESSENTIAL. It's the most important part. You'll understand when you're older. Smooth, not crunchy.", PIP, { pitch: P_PIP });
    await w.say('But the peanut butter goes in LAST. Machine parts first. I am very particular about the order of things.', PIP, { pitch: P_PIP });
    list.destroy();
    await w.give('checklist', 1, "GOT PROFESSOR PIPWICK'S CHECKLIST!");
    await w.say('(Open the menu at any time to check the list.)');
    await w.say("Right! Well, I'm not letting you wander the island alone with my list. I'm coming with you.", PIP, { pitch: P_PIP });
    await w.say("Ask me if you get stuck. I am a genius. Occasionally that's useful.", PIP, { pitch: P_PIP });
    w.set('w2_inv_met');
    w.set('w2_inv_follow');
    w.sfx('recruit');
    await w.move('pipwick', ['down'], 230);
    w.refresh();
    w.spawnCompanion();
    await w.say('PROFESSOR PIPWICK JOINED YOU!');
  },

  async pipwick(w) {
    // at home (before he joins, or while assembling)
    if (!isSet(w.state, 'w2_inv_met')) return SCRIPTS.enter_w2_inv(w);
    await w.say('Busy, busy, busy. A genius never rests. Except at lunch.', PIP, { pitch: P_PIP });
  },

  /** Talking to him while he follows you: hints, scaled to how stuck you are. */
  async inventor_talk(w) {
    const st = w.state;
    if (isSet(st, 'w2_cave')) return SCRIPTS.cave_pip(w);
    if (isSet(st, 'w2_evac_done') && !has(st, 'pb')) {
      await w.say("The peanut butter! The grocery store! It's open now, I imagine, what with nobody left to keep it closed.", PIP, { pitch: P_PIP });
      return;
    }
    if (has(st, 'pb')) {
      await w.say("We have EVERYTHING! Home! To the workshop! Low Street, west end! Hurry, I can feel the water getting nervous.", PIP, { pitch: P_PIP });
      return;
    }
    const missing = (['transducer', 'deflector', 'turbo'] as const).filter((p) => !has(st, p));
    const opts = missing.map((p) => PART_NAMES[p].split(' ').slice(-1)[0]);
    const pick = await w.ask('Need a hint? I am a genius. Occasionally that is useful.', [...opts.map((o) => `THE ${o}`), 'NO THANKS'], PIP, { pitch: P_PIP, cancel: opts.length });
    if (pick >= missing.length) return;
    const part = missing[pick];
    const n = Number(st.flags['w2_hint_' + part] ?? 0);
    w.set('w2_hint_' + part, n + 1);
    const H = (s: string) => w.say(s, PIP, { pitch: P_PIP });
    if (part === 'transducer') {
      if (!isSet(st, 'w2_park_met'))
        await H(
          n === 0
            ? "The transducer! I had one once. It flew off something tall and spinny. A ride, I think. Does this island have rides?"
            : "THRILL HARBOR. The theme park, at the very top of Harbor Road. Go north. Keep going north. Stop when you hear screaming."
        );
      else {
        const left = ['coaster', 'ferris', 'sling'].filter((r) => !isSet(st, 'w2_ride_' + r));
        const names: Record<string, string> = { coaster: 'the roller coaster', ferris: 'the Ferris wheel', sling: 'the slingshot' };
        if (left.length) await H(`That park worker wants rides tested. Still to go: ${left.map((r) => names[r]).join(', ')}. I'll be down here. On the ground. Supporting you emotionally.`);
        else await H('You survived all three! Go and get our transducer from the park worker before he changes his mind!');
      }
    } else if (part === 'deflector') {
      if (!isSet(st, 'w2_hall_met'))
        await H(
          n === 0
            ? 'A deflector like that costs more than my house. More than my house and the house next door. Someone in charge would know where to get one.'
            : 'City Hall! On Center Avenue, the big building with columns and a leak. Show the mayor the list.'
        );
      else if (!isSet(st, 'w2_bank_asked')) await H("The mayor said to ask the bank. The bank is the building with BANK written on it. Subtle, I know.");
      else if (!isSet(st, 'w2_deal'))
        await H(
          n < 2
            ? 'Five hundred dollars of old debt. Who on this island has five hundred dollars and wants something badly? Someone running for office, perhaps...'
            : 'Go back to the mayor! Tell him you only need five hundred! Politicians LOVE a bargain.'
        );
      else if (!isSet(st, 'w2_paid500') && Number(st.flags.w2_votes_ok ?? 0) < 5) {
        if (n % 2 === 0) await H("Five votes. People are angry for different reasons. LISTEN to what they're angry about, then answer THAT. And use what the mayor told you.");
        else {
          await H('The voters: Gus and Marla, west end of Center Avenue. Dot, Quentin and Otto, up on North Road.');
          await H("Bev and Sid on Low Street, and Lorna, just past the grocery. Some of them will never budge. Don't waste your breath twice.");
        }
      } else if (!isSet(st, 'w2_paid500')) await H('Five votes! Go and collect your five hundred dollars at City Hall!');
      else if (!isSet(st, 'w2_debt_paid')) await H('To the bank! Pay the debt, then ask again for the loan.');
      else if (!isSet(st, 'w2_loan')) await H('Debt cleared! Now ask the bank for the ten thousand.');
      else await H("Tech Repair, right next to the bank. Buy it before you spend it all on candy.");
    } else {
      if (!isSet(st, 'w2_dealer_met'))
        await H(
          n === 0
            ? 'A Turbo-Encabulator. Commonly found in motorcycles. Every motorcycle has one. Most people never know. Now you do.'
            : "There's a motorcycle dealership at the east end of Center Avenue. RICK'S RIDES. Rick is... a lot."
        );
      else if (!isSet(st, 'w2_stole'))
        await H(
          n % 2 === 0
            ? "We can't AFFORD a motorcycle. But a motorcycle can afford to lose one small part. Morally... we'll discuss it later."
            : 'Get Rick talking. Salesmen always go and "talk to the boss". Then: the big shiny one in the middle of the showroom.'
        );
    }
  },
};

// ------------------------------------------------------------------ his running commentary (one-time triggers)

const QUIPS: Record<string, string[]> = {
  quip_park_road: ['Thrill Harbor. I rode the coaster in 1983. I still have dreams about it. Not good ones.'],
  quip_dealer: ["Rick's Rides. Rick once sold me a bicycle with no wheels. He called it 'minimalist'."],
  quip_memorial: [],
  quip_grocery: ['All that peanut butter. Just sitting in the dark. Waiting.'],
  quip_coaster: ['WIPEOUT. They named it after what it does to you.'],
  quip_sling: ['Absolutely not. I will hold your ghost. I will not get in that.'],
  w2_empty_street: [],
};

const QUIP_SCRIPTS: Record<string, Script> = {};
for (const [id, lines] of Object.entries(QUIPS)) {
  if (!lines.length) continue;
  QUIP_SCRIPTS[id] = async (w) => {
    if (!w.companion) return;
    w.faceTo('inventor', 'player');
    for (const l of lines) await w.say(l, PIP, { pitch: P_PIP });
  };
}
QUIP_SCRIPTS.quip_memorial = async (w) => {
  if (!w.companion) return;
  await w.say('...Take a look, if you like. I will wait.', PIP, { pitch: 760 });
};
QUIP_SCRIPTS.w2_empty_street = async (w) => {
  await w.say('The streets are completely silent. Doors hang open. A radio somewhere is still playing to nobody.');
};

// ================================================================== milestones: the briefing and the evacuation

/** Called whenever a machine part is collected. */
export async function partMilestone(w: W) {
  const n = partsHave(w.state);
  if (n >= 2 && !isSet(w.state, 'w2_gov_done')) await SCRIPTS.w2_gov(w);
  if (n >= 3 && !isSet(w.state, 'w2_evac_done')) await SCRIPTS.w2_evac(w);
}

const CRISIS: Record<string, Script> = {
  /** The emergency briefing room. Afterwards you are put back exactly where you stood. */
  async w2_gov(w) {
    const back = { map: w.map.id, x: w.player.x, y: w.player.y, dir: w.player.dir as Dir };
    await w.wait(400);
    w.sfx('rumble');
    w.shake(900, 0.004);
    await w.wait(900);
    await w.fade(true, 500);
    cut(w, 'w2_gov', 7, 8, 'up');
    hideParty(w, true);
    await camPx(w, 8 * 16, 5 * 16, 0, 2);
    const remove = bars(w);
    await w.fade(false, 600);
    w.music('gov');
    await w.wait(600);
    const S = async (id: string, who: string, line: string, pitch: number) => {
      const a = w.actor(id);
      if (a) await camPx(w, a.sprite.x, a.sprite.y - 12, 380, 3);
      await w.say(line, who, { pitch });
    };
    await S('g_chief', 'DIRECTOR HALE', "We're running out of time.", P_LOW);
    await S('g_sci1', 'DR. OYELARAN', 'The readings doubled overnight. Whatever is down there, it is moving closer to the island.', P_HIGH);
    await S('g_chief', 'DIRECTOR HALE', 'The tsunami could hit at any moment. We need to deploy the helicopters immediately.', P_LOW);
    await S('g_aide', 'AIDE', 'How many people are still on the island?', P_MID);
    await S('g_sci2', 'DR. VANCE', 'Four thousand, two hundred and six, sir. Plus one unregistered child.', P_MID);
    await S('g_sci2', 'DR. VANCE', '...And what may be a ghost.', P_MID);
    await S('g_general', 'GENERAL MARSH', 'A ghost?', P_LOW);
    await S('g_sci2', 'DR. VANCE', "It's in the report, sir. Page nine.", P_MID);
    await S('g_sci1', 'DR. OYELARAN', "Sir, the water displacement isn't geological. Nothing on the seabed has moved. Something is PUSHING the sea.", P_HIGH);
    await camPx(w, 8 * 16, 1.4 * 16, 500, 2.6);
    w.sfx('alarm');
    w.flash(0.3);
    await w.say('On the big screen, a ring of static pulses around a shape off the coast. The shape is larger than the island.');
    await S('g_general', 'GENERAL MARSH', 'Then we stop arguing with the ocean. We get every last person off that rock.', P_LOW);
    await S('g_chief', 'DIRECTOR HALE', 'Begin emergency evacuation procedures. Every helicopter we have. Fuel them now.', P_LOW);
    await S('g_pilot', 'PILOT', 'Yes, sir. Wheels up on your order.', P_MID);
    await S('g_chief', 'DIRECTOR HALE', '...God help anyone we leave behind.', P_LOW);
    await w.wait(500);
    await remove();
    await w.fade(true, 600);
    w.set('w2_gov_done');
    cut(w, back.map, back.x, back.y, back.dir);
    await w.camReturn(0);
    await w.fade(false, 500);
    await pip(w, 'Did you feel that? Like the whole island just got... nervous.');
  },

  /** Helicopters come for everyone. Almost everyone. */
  async w2_evac(w) {
    if (!isSet(w.state, 'w2_gov_done')) await SCRIPTS.w2_gov(w);
    // the evacuation plays out on the streets
    if (w.map.id !== 'isl') {
      const o = outside(w.map.id);
      await w.fade(true, 400);
      cut(w, 'isl', o.x, o.y, 'down');
      await w.fade(false, 400);
    }
    const s = scene(w);
    w.music(null);
    for (let i = 0; i < 2; i++) {
      w.sfx('siren');
      await w.wait(1200);
    }
    await w.say('A siren wails across the whole island.');
    await w.say('ATTENTION, SALTWASH. THIS IS AN EMERGENCY EVACUATION. PROCEED IMMEDIATELY TO YOUR NEAREST HELIPAD.', 'LOUDSPEAKER', { pitch: P_LOW });
    w.music('evac');
    const remove = bars(w);
    hideParty(w, true);
    // the crowd
    const crowd: [string, string, number, number][] = [
      ['e1', 'evac1', 44, 38],
      ['e2', 'evac2', 50, 40],
      ['e3', 'evac3', 46, 41],
      ['e4', 'kid3', 52, 39],
      ['e5', 'woman3', 42, 40],
      ['e6', 'man_beard', 40, 38],
      ['e7', 'evac1', 62, 40],
      ['e8', 'local', 66, 39],
      ['e9', 'grandpa2', 58, 39],
      ['e10', 'evac2', 70, 40],
    ];
    for (const [id, spr, x, y] of crowd) w.spawn(id, spr, x, y, 'down');
    const heliAt = (i: number) => ({ x: (HELIPADS[i][0] + 2) * 16, y: (HELIPADS[i][1] + 2) * 16 });
    const helis: Phaser.GameObjects.Sprite[] = [];
    const shadows: Phaser.GameObjects.Ellipse[] = [];
    const landHeli = async (i: number, from: number) => {
      const p = heliAt(i);
      const h = w.sprite('heli', p.x + from, p.y - 220, 9700);
      h.play('heli_spin');
      if (from > 0) h.setFlipX(false);
      else h.setFlipX(true);
      const sh = s.add.ellipse(p.x, p.y + 6, 40, 10, 0x000000).setAlpha(0.4).setDepth(p.y);
      w.worldLayer.add(sh);
      helis[i] = h;
      shadows[i] = sh;
      w.sfx('heli');
      const beat = s.time.addEvent({ delay: 700, loop: true, callback: () => w.sfx('heli') });
      await w.tw({ targets: h, x: p.x, y: p.y - 6, duration: 2600, ease: 'Sine.easeOut' });
      beat.remove();
      w.shake(200, 0.003);
    };
    // pad A, in the field across from City Hall
    await camPx(w, 57 * 16, 46 * 16, 900, 2);
    const run = (id: string, path: Dir[], ms = 150) => w.move(id, path, ms);
    const shouts = (x: number, y: number, list: string[]) =>
      list.forEach((t, i) => s.time.delayedCall(i * 600, () => pop(w, x + (Math.random() - 0.5) * 80, y - 20 - (i % 3) * 8, t, C.light, 1300)));
    const first = landHeli(0, 260);
    shouts(56 * 16, 40 * 16, ['RUN!', 'GRAB THE KIDS!', 'HAROLD! LEAVE THE COUCH!', 'MOVE! MOVE!']);
    run('e1', ['down', 'down', 'right', 'right', 'right', 'right', 'down', 'down']);
    run('e2', ['down', 'down', 'right', 'right', 'down', 'down']);
    run('e3', ['down', 'right', 'right', 'right', 'right', 'right', 'down', 'down', 'down']);
    run('e4', ['down', 'down', 'right', 'down', 'down', 'down']);
    run('e7', ['down', 'down', 'left', 'left', 'left', 'down', 'down', 'down']);
    run('e9', ['down', 'down', 'down', 'down']);
    await first;
    await w.say('"Women, children and grandmas first!" "I AM a grandma!" "Then GET ON!"', undefined);
    await w.say('"Has anyone seen Mister Whiskers?!"', 'MRS. PELL', { pitch: P_HIGH });
    // pad B, out on the east point
    await camPx(w, 91 * 16, 32 * 16, 900, 2);
    w.spawn('e11', 'man_cap', 89, 39, 'up');
    w.spawn('e12', 'evac1', 91, 40, 'up');
    w.spawn('e13', 'cat', 92, 41, 'up');
    const second = landHeli(1, -260);
    run('e11', ['up', 'up', 'up', 'up', 'up'], 160);
    run('e12', ['up', 'up', 'up', 'up', 'up', 'up'], 170);
    run('e13', ['up', 'up', 'up', 'up', 'up', 'up', 'up'], 120);
    shouts(91 * 16, 34 * 16, ['THE BRIDGE IS OUT!', 'JUMP THE GAP!', 'MISTER WHISKERS!']);
    await second;
    await w.say('The cat climbs aboard on its own, sits by the window, and stares at the sea. Completely unbothered.');
    // pad C, on the beach
    await camPx(w, 30 * 16, 75 * 16, 1000, 2);
    w.spawn('e14', 'surfer', 34, 66, 'down');
    w.spawn('e15', 'old_man', 28, 66, 'down');
    w.spawn('e16', 'evac3', 31, 67, 'down');
    w.spawn('e17', 'woman', 25, 67, 'down');
    const third = landHeli(2, 260);
    run('e14', ['down', 'down', 'down', 'down', 'left', 'left', 'down'], 160);
    run('e15', ['down', 'down', 'down', 'down', 'right', 'down'], 220);
    run('e16', ['down', 'down', 'down', 'down', 'down'], 150);
    run('e17', ['down', 'down', 'right', 'right', 'right', 'down', 'down', 'down'], 160);
    shouts(30 * 16, 70 * 16, ["I'M NOT LEAVING WITHOUT MY SURFBOARD!", 'YOU DON\'T HAVE A SURFBOARD, MARCO!', 'I HAVE A DOOR!']);
    await third;
    await w.say('Old Ezra stops at the memorial on the way. Just for a second. Then he lets them help him aboard.');
    // lift off, one by one
    await camPx(w, 48 * 16, 46 * 16, 1200, 1);
    for (const id of crowd.map((c) => c[0]).concat(['e11', 'e12', 'e13', 'e14', 'e15', 'e16', 'e17'])) w.remove(id);
    for (const i of [2, 1, 0]) {
      const h = helis[i];
      w.sfx('heli');
      w.sfx('whoosh');
      s.tweens.add({ targets: shadows[i], alpha: 0, scale: 0.3, duration: 1600 });
      await w.tw({ targets: h, y: h.y - 90, duration: 1200, ease: 'Quad.easeIn' });
      s.tweens.add({ targets: h, x: h.x - 600, y: h.y - 260, scale: 0.5, duration: 3200, ease: 'Sine.easeIn', onComplete: () => h.destroy() });
      await w.wait(900);
    }
    await w.wait(2400);
    shadows.forEach((o) => o.destroy());
    w.music(null);
    w.set('w2_evac_done');
    w.refresh();
    await w.wait(800);
    await w.say('One by one, the helicopters disappear over the horizon.');
    await w.say('The island is empty.');
    await remove();
    hideParty(w, false);
    await w.camReturn(900);
    w.music('empty');
    if (w.companion) {
      w.faceTo('inventor', 'player');
      await w.wait(500);
      await w.say("...Huh. Everyone's gone.", PIP, { pitch: 760 });
      await w.say("They didn't wait. Then again, nobody's ever waited for me. I'm used to it.", PIP, { pitch: 760 });
      await w.say("So it's just us. On an island. That is about to be hit by the biggest wave anyone has ever seen. Stranded.", PIP, { pitch: P_PIP });
      await w.wait(700);
      await w.say('Wonderful. Absolutely wonderful.', PIP, { pitch: P_PIP });
      await w.wait(900);
      await w.emote('inventor', '!', 800);
      await w.say("WAIT. THE PEANUT BUTTER! We still need the peanut butter!", PIP, { pitch: 1200 });
      await w.say("The grocery store! With everyone gone, there's nobody left to keep it locked. Come on!", PIP, { pitch: P_PIP });
    }
  },
};

// ================================================================== the grocery store and Slick Rick

const GROCERY: Record<string, Script> = {
  async enter_w2_grocery(w) {
    if (isSet(w.state, 'w2_store_seen')) return;
    w.set('w2_store_seen');
    await w.wait(300);
    await w.say('The shelves are half-empty. The lights buzz and flicker. Somewhere, a freezer hums to itself.');
  },
  async store_shelf_top(w) {
    const lines = ['Tins of soup, every label faded by seawater.', 'Cereal boxes, swollen like sponges.', 'Batteries. Every single one has been taken.', 'Canned peaches. One has a note taped to it: SORRY, I TOOK THE OTHERS.'];
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async store_shelf_bottom(w) {
    const lines = ['Bottled water. All gone. Of course.', 'Dog food. Cat food. Fish food. Not a single fish on the island to eat it.', 'Rubber boots, sizes 4 to 14. All sold out.', 'Bags of rice, piled up like sandbags. Some of them probably were sandbags.'];
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async store_fridge(w) {
    await w.say('The freezer hums. Inside: one lonely ice cream bar, frozen into a perfect cube of ice.');
  },
  async store_register(w) {
    w.sfx('register');
    await w.say('The register has a note on it: PAY WHAT YOU CAN. STAY SAFE.');
  },
  async store_pb(w) {
    const st = w.state;
    if (has(st, 'pb') || isSet(st, 'w2_assembled')) return w.say('Every other jar of peanut butter on the shelf is crunchy. Ugh.');
    if (isSet(st, 'w2_pb_taken')) return w.say('The shelf is empty. The jar rolled away in the crash. It is under the motorcycle.');
    await w.say('AISLE 3: SPREADS.');
    await w.say('And there, at the very back of the shelf, behind the crunchy and the jam: a single jar of SMOOTH peanut butter.');
    if (!(await w.confirm('Take the peanut butter?'))) return;
    w.sfx('item');
    await w.say('You pick up the jar. It is heavier than you expected. The fate of the whole island now rests on a jar of peanut butter.');
    await pip(w, "I've never been prouder of anything. Let's get out of here before—");
    await SCRIPTS.rick_crash(w);
  },

  /** While Rick waits in the wreck of the store, a light stays on him so he never fades into the dark. */
  decorate_w2_grocery(w) {
    spotRick(w);
    return Promise.resolve();
  },

  /** Rick drives his motorcycle through the wall. */
  async rick_crash(w) {
    const s = scene(w);
    w.music(null);
    w.sfx('rumble');
    await w.wait(700);
    w.sfx('rev');
    w.shake(500, 0.003);
    await w.wait(800);
    w.sfx('rev');
    w.shake(500, 0.006);
    await w.emote('player', '!', 600);
    if (w.companion) await w.emote('inventor', '!', 400);
    await w.wait(200);
    // the wall explodes inward
    const hx = STORE_HOLE.x * 16 + 8;
    const hy = STORE_HOLE.y * 16 + 8;
    w.sfx('crash');
    w.flash(0.9);
    w.shake(700, 0.015);
    for (let i = 0; i < 24; i++) {
      const d = w.image(i % 3 ? 'fx_dot' : 'fx_dotM', hx, hy, 9600);
      s.tweens.add({ targets: d, x: hx + (Math.random() - 0.5) * 160, y: hy + Math.random() * 110, alpha: 0, duration: 700 + Math.random() * 500, onComplete: () => d.destroy() });
    }
    const bike = w.sprite('rickbike', hx, hy, 9500);
    bike.play('rickbike_ride');
    await w.tw({ targets: bike, y: (STORE_HOLE.y + 4) * 16, duration: 500, ease: 'Quad.easeOut' });
    w.sfx('swish');
    await w.tw({ targets: bike, angle: -20, duration: 120, yoyo: true });
    bike.stop().setFrame(0);
    // the jar flies out of your hands and rolls under the bike
    const jar = w.image('it_pb', w.player.sprite.x, w.player.sprite.y - 16, 9600);
    await w.tw({ targets: jar, x: bike.x - 4, y: bike.y - 4, angle: 720, duration: 700, ease: 'Quad.easeOut' });
    jar.destroy();
    w.set('w2_pb_taken');
    bike.destroy();
    w.refresh();
    // a spotlight finds him; the camera goes in close for his big entrance
    const rk = w.actor('rick_store');
    if (rk) {
      spotRick(w);
      await w.camPan(rk.x, rk.y - 1, 600, 2.6);
      w.sfx('rev');
      await w.tw({ targets: rk.sprite, y: rk.sprite.y - 3, duration: 90, yoyo: true, repeat: 2 });
    }
    await w.wait(300);
    w.music('rick');
    await w.say('YOU!', RICK, { pitch: P_RICK });
    await w.say('YOU THOUGHT YOU COULD JUST STEAL FROM ME?!', RICK, { pitch: P_RICK });
    if (rk) await w.camReturn(500);
    await w.say('YOU RUINED MY DEALERSHIP! Do you know what a motorcycle is without a Turbo-Encabulator?!', RICK, { pitch: P_RICK });
    await w.say("A PAPERWEIGHT! A FOUR-HUNDRED-POUND PAPERWEIGHT! I couldn't sell a single one! Not ONE! My commission is ZERO!", RICK, { pitch: P_RICK });
    await pip(w, 'In fairness, you were evacuated. Nobody is buying anything.');
    await w.say('DON\'T TALK TO ME ABOUT FAIRNESS! I DROVE ALL THE WAY BACK FOR THIS!', RICK, { pitch: P_RICK });
    await w.say("I'M GOING TO MAKE YOU PAY!", RICK, { pitch: P_RICK });
    await w.say('...IN FULL. NO FINANCING.', RICK, { pitch: P_RICK });
    await SCRIPTS.rick_card(w);
    await w.startBattle('salesman');
  },

  /** A proper boss introduction card. */
  async rick_card(w) {
    const s = scene(w);
    const c = w.ui(s.add.container(0, 0).setDepth(90));
    const g = s.add.graphics();
    g.fillStyle(C.black, 0.85).fillRect(0, 100, SW, 80);
    for (let x = -40; x < SW; x += 24) g.fillStyle(C.dark, 1).fillTriangle(x, 100, x + 12, 100, x - 8, 180);
    g.fillStyle(C.white, 1).fillRect(0, 100, SW, 2).fillRect(0, 178, SW, 2);
    c.add(g);
    const name = txt(s, SW / 2, 112, 'SLICK RICK', { outline: true, origin: [0.5, 0] }).setScale(3);
    const sub = txt(s, SW / 2, 152, '"THE MOTOR MOGUL"  -  EMPLOYEE OF THE MONTH (SELF-AWARDED)', { color: C.light, origin: [0.5, 0] });
    c.add([name, sub]);
    c.x = SW;
    w.sfx('rev');
    await w.tw({ targets: c, x: 0, duration: 260, ease: 'Quad.easeOut' });
    w.shake(300, 0.006);
    await w.wait(1800);
    await w.tw({ targets: c, x: -SW, duration: 220, ease: 'Quad.easeIn' });
    c.destroy();
  },

  async rick_store(w) {
    // a rematch after losing
    await w.say("BACK FOR ROUND TWO? Excellent. Excellent! The customer is always WRONG!", RICK, { pitch: P_RICK });
    if (!(await w.confirm('Fight Slick Rick?'))) return w.say("I'll be right here. Revving. Forever.", RICK, { pitch: P_RICK });
    await w.startBattle('salesman');
  },

  async after_salesman(w, result: 'victory' | 'defeat') {
    await w.wait(400);
    if (result === 'defeat') {
      w.set('w2_rick_lost');
      await w.say('You come to on the cold floor of the store. Rick is polishing his bike, humming. He is waiting for you.');
      await pip(w, "We are NOT leaving without that jar. Catch your breath, then let's try again.");
      return;
    }
    w.set('w2_rick_beaten');
    w.refresh();
    const r = w.actor('rick_down');
    if (r) {
      r.sprite.setFrame(6).setAngle(90);
      r.sprite.y -= 4;
    }
    w.music(null);
    await w.say('Slick Rick lies in the wreckage of his motorcycle, staring at the ceiling.');
    await w.say('...My... commission...', RICK, { pitch: 900 });
    await w.say('You know what... take it. Take the peanut butter. No charge. First time I\'ve ever said that. It feels horrible.', RICK, { pitch: 900 });
    w.sfx('item');
    await w.give('pb', 1, 'GOT THE PEANUT BUTTER!');
    await w.say("ALL FOUR PARTS FOUND! Everything on the professor's checklist is ticked off.");
    await pip(w, "YES! YES YES YES! Smooth! It's SMOOTH! Home! Back to the workshop! Quickly!");
    w.music('empty');
  },

  async rick_down(w) {
    await w.say("Don't look at me. I'm on my break. Forever.", RICK, { pitch: 900 });
  },
};

// ================================================================== the assembly

const ASSEMBLY: Record<string, Script> = {
  async w2_assembly(w) {
    const st = w.state;
    // the professor takes up his tools
    w.set('w2_inv_home');
    w.set('w2_inv_away');
    w.spawnCompanion();
    w.refresh();
    const s = scene(w);
    w.music('inventor');
    w.face('player', 'up');
    await w.say("Home sweet home! Wipe your feet. Actually don't bother, the floor is mostly wires.", PIP, { pitch: P_PIP });
    await w.say("Let me see them. Let me SEE them!", PIP, { pitch: P_PIP });
    await w.emote('pipwick', 'heart', 800);
    await w.say("Oh, they're perfect. And the PEANUT BUTTER! Smooth! You remembered smooth! I could cry. I'm going to cry a little.", PIP, { pitch: P_PIP });
    const remove = bars(w);
    await camPx(w, 9 * 16, 6 * 16, 600, 2.4);
    const install = async (item: string, stage: number, x: number, lines: string[]) => {
      await w.move('pipwick', [], 200);
      const a = w.actor('pipwick')!;
      // walk along the hull to the panel
      while (a.x !== x) await w.move('pipwick', [a.x < x ? 'right' : 'left'], 160);
      w.face('pipwick', 'up');
      const icon = w.image(ITEMS[item].icon, w.player.sprite.x, w.player.sprite.y - 18, 9700).setScale(2);
      await w.tw({ targets: icon, x: a.sprite.x, y: a.sprite.y - 22, duration: 500, ease: 'Sine.easeInOut' });
      await w.tw({ targets: icon, y: 5 * 16, scale: 0.4, duration: 300 });
      icon.destroy();
      const sp = s.add.particles(0, 0, 'fx_spark', { x: a.sprite.x, y: 5 * 16 + 4, speed: { min: 30, max: 110 }, lifespan: 280, quantity: 3, frequency: 35 });
      sp.setDepth(9000);
      w.worldLayer.add(sp);
      for (let i = 0; i < 4; i++) {
        w.sfx(i % 2 ? 'clank' : 'hammer');
        w.shake(80, 0.002);
        await w.wait(220);
      }
      sp.stop();
      s.time.delayedCall(400, () => sp.destroy());
      w.take(item);
      w.set('w2_sub_stage', stage);
      w.refresh();
      for (const l of lines) await w.say(l, PIP, { pitch: P_PIP });
    };
    await install('transducer', 1, 7, [
      'First, the Synchronous Reciprocating Transducer goes into the reciprocator.',
      'It reciprocates. Synchronously. Back and forth, in perfect time. That is the whole trick. People go to school for twelve years to understand that.',
    ]);
    await install('deflector', 2, 10, [
      'Next, the Phase-Conjugate Disambiguated Deflector!',
      "Ten thousand dollars' worth of 'please don't let the hull fold up like a soda can at the bottom of the sea'.",
      'It disambiguates the phase. Conjugately. You see? Very clear.',
    ]);
    await install('turbo', 3, 11, [
      'The Turbo-Encabulator. It goes right here, between the panametric fan and the... other fan.',
      'Without it, the whole submarine would suffer side-fumbling. We would fumble. Sideways. Forever.',
      "And now it's stolen property, which makes her go FASTER. That's science.",
    ]);
    // the peanut butter, with all the ceremony it deserves
    w.music(null);
    await w.wait(400);
    await w.say('And now...', PIP, { pitch: 760 });
    await w.wait(700);
    await w.say('...the peanut butter.', PIP, { pitch: 640 });
    w.sfx('chime');
    const jar = w.image('it_pb', w.player.sprite.x, w.player.sprite.y - 18, 9700).setScale(2);
    await w.tw({ targets: jar, x: w.actor('pipwick')!.sprite.x, y: w.actor('pipwick')!.sprite.y - 26, duration: 700 });
    await w.say('He unscrews the lid. He sniffs it. He takes one enormous spoonful and eats it.');
    await w.wait(600);
    await w.say('...Mm. Smooth.', PIP, { pitch: 760 });
    await w.emote('player', '...', 900);
    await w.say("What? A genius needs fuel. NOW, the rest of it goes around the hatch seal. Like so.", PIP, { pitch: P_PIP });
    jar.destroy();
    for (let i = 0; i < 6; i++) {
      w.sfx('swish');
      await w.wait(180);
    }
    w.take('pb');
    w.set('w2_sub_stage', 4);
    w.set('w2_assembled');
    w.refresh();
    w.sfx('recruit');
    w.flash(0.5);
    await w.say("Peanut butter. The perfect watertight gasket. Sticky. Flexible. Seals under pressure. And delicious in an emergency.", PIP, { pitch: P_PIP });
    await w.say("NASA hates this one trick.", PIP, { pitch: P_PIP });
    w.music('inventor');
    await camPx(w, 9 * 16, 5 * 16, 500, 2.8);
    w.sfx('chime');
    await w.say("The portholes flicker on. The engine hums. The submarine is COMPLETE.");
    await w.say("THE PIPWICK MARK VII LIVES! Nine years! Nine years of everyone calling me crazy!", PIP, { pitch: 1200 });
    await w.say("...I mean, I AM a little crazy. But I'm also RIGHT. Both things can be true.", PIP, { pitch: P_PIP });
    await w.camReturn(500);
    await remove();
    await w.say("Now we go down there and find whatever is doing this. And if it's as big as I think it is...", PIP, { pitch: 760 });
    await w.say("...then we have to stop it. Whatever it takes.", PIP, { pitch: 760 });
    w.save();
    await SCRIPTS.w2_tsunami(w);
  },
  async inv_sub(w) {
    const st = w.state;
    if (isSet(st, 'w2_assembled')) return SCRIPTS.w2_tsunami(w);
    const n = partsHave(st) + (has(st, 'pb') ? 1 : 0);
    await w.say(`The PIPWICK MARK VII. A submarine with open panels, dangling wires and a strong smell of solder. ${n}/4 parts collected.`);
  },
};

// ================================================================== the final tsunami

const TSUNAMI: Record<string, Script> = {
  async w2_tsunami(w) {
    const s = scene(w);
    w.set('w2_tsunami');
    w.save();
    // in the workshop: the ground begins to shake
    if (w.map.id !== 'w2_inv') {
      await w.fade(true, 300);
      cut(w, 'w2_inv', 4, 8, 'up');
      await w.fade(false, 300);
    }
    w.music(null);
    w.sfx('rumble');
    w.shake(1600, 0.004);
    await w.wait(1200);
    await w.say('The floor starts to shake. Tools rattle off the walls. A wrench rolls past your feet.');
    await w.say('...Did you hear that?', PIP, { pitch: 760 });
    w.sfx('rumble');
    w.shake(2000, 0.008);
    await w.wait(1400);
    await w.say("Oh no. Oh no no no. It's early. It's EARLY!", PIP, { pitch: 1200 });
    // ---------------------------------------------------- outside: the wave
    await w.fade(true, 500);
    cut(w, 'isl', ISL_DOORS.inventor.x, ISL_DOORS.inventor.y + 1, 'down');
    hideParty(w, true);
    w.music('tsunami');
    w.setDark(0.35);
    const remove = bars(w);
    await camPx(w, 48 * 16, 80 * 16, 0, 1);
    await w.fade(false, 800);
    w.sfx('water');
    await w.say('Out at sea, the water pulls back. Further. Further than anyone has ever seen it go. The seabed lies bare and gasping.');
    // the wall of water rises over the horizon
    // anchored near its foot, so the wall of water towers up over everything in front of it
    const wave = w.image('bigwave', 48 * 16, 100 * 16, 9400).setOrigin(0.5, 0.82);
    wave.setScale(1.4, 0.1);
    w.sfx('rumble');
    w.shake(2400, 0.004);
    await w.tw({ targets: wave, scaleY: 0.55, y: 93 * 16, duration: 2800, ease: 'Sine.easeOut' });
    await w.say('And then it comes.');
    // the sea follows the wave in over the streets
    const flood = s.add.tileSprite(-200, 0, ISL_W * 16 + 400, 10, 'sea1').setOrigin(0, 0).setDepth(9300).setAlpha(0.9);
    w.worldLayer.add(flood);
    const front = { y: 92 * 16 };
    const overrun = new Set<number>();
    const ruins = ['b2_ruin0', 'b2_ruin1'];
    const update = () => {
      // it grows as it closes in: by the time it reaches downtown it fills the sky
      const k = Math.min(1, Math.max(0, (92 * 16 - front.y) / (50 * 16)));
      wave.setScale(1.4 + k * 0.6, 0.55 + k * 0.45);
      wave.y = front.y + 24;
      eye.y = front.y - 70;
      flood.y = front.y + 10;
      flood.height = Math.max(10, ISL_H * 16 + 400 - flood.y);
      flood.tilePositionY -= 2;
      // buildings crumble as the wall of water passes them
      w.map.props.forEach((p, i) => {
        if (overrun.has(i) || !p.key.startsWith('b2_')) return;
        if (front.y < (p.y + 2) * 16) {
          overrun.add(i);
          const img = (w as any).props?.[i]?.img as Phaser.GameObjects.Image | undefined;
          if (img) {
            img.setTexture(ruins[i % 2]);
            img.setTint(0x808080);
          }
        }
      });
    };
    // the camera looks at the streets just ahead of the wall of water
    const eye = { x: 48 * 16, y: front.y - 70 };
    camFollow(w, eye as any, 0.08, 1);
    w.sfx('water');
    const roll = s.time.addEvent({ delay: 1400, loop: true, callback: () => (w.sfx('water'), w.shake(600, 0.01)) });
    await w.tw({ targets: front, y: 58 * 16, duration: 4600, ease: 'Sine.easeIn', onUpdate: update } as any);
    // a quick cutaway: Rick, alone on Center Avenue
    cam(w).stopFollow();
    const rick = w.sprite('rickbike', 74 * 16, 39 * 16 + 8, 9200);
    rick.play('rickbike_ride');
    await camPx(w, 73 * 16, 40 * 16, 0, 2);
    w.sfx('rev');
    await w.say("Come on, come on, start! START, you lousy— I OFFER FINANCING! ZERO PERCENT! ANYONE?!", RICK, { pitch: P_RICK });
    await w.say('He looks up. He sees the wave.', undefined);
    rick.stop().setFrame(0);
    await w.wait(500);
    await w.say('...Is this covered by the extended warranty?', RICK, { pitch: 900 });
    const front2 = { y: 58 * 16 };
    await w.tw({ targets: front2, y: 44 * 16, duration: 900, ease: 'Linear', onUpdate: () => ((front.y = front2.y), update()) } as any);
    w.sfx('crash');
    s.tweens.add({ targets: rick, x: rick.x - 260, y: rick.y - 60, angle: 720, alpha: 0, duration: 1100, ease: 'Quad.easeOut' });
    for (let i = 0; i < 8; i++) {
      const b = w.image(i % 2 ? 'bubble0' : 'bubble1', rick.x + (Math.random() - 0.5) * 40, rick.y, 9600);
      s.tweens.add({ targets: b, y: b.y - 40 - Math.random() * 30, alpha: 0, duration: 900, delay: 200 + i * 80, onComplete: () => b.destroy() });
    }
    await w.wait(1200);
    rick.destroy();
    // back to the wave, swallowing the rest of the island
    await camPx(w, 48 * 16, 34 * 16, 500, 1);
    camFollow(w, eye as any, 0.08, 1);
    await w.tw({ targets: front, y: -4 * 16, duration: 3800, ease: 'Sine.easeInOut', onUpdate: update } as any);
    roll.remove();
    cam(w).stopFollow();
    await w.say('Water crashes through every street. The houses fold. City Hall\'s dome goes under. The Ferris wheel tips slowly into the sea.');
    await w.say('In a matter of seconds, Saltwash is gone.');
    await remove();
    // ---------------------------------------------------- back in the workshop
    await w.fade(true, 400);
    w.setDark(0.25);
    cut(w, 'w2_inv', 7, 8, 'up');
    w.hide('follower', false);
    w.face('pipwick', 'down');
    await w.fade(false, 300);
    w.music('tsunami');
    const water = s.add.tileSprite(0, 12 * 16, 16 * 16, 12 * 16, 'sea2').setOrigin(0, 0).setDepth(9300).setAlpha(0.85);
    w.worldLayer.add(water);
    const rise = s.tweens.add({ targets: water, y: 8 * 16, duration: 2600, onUpdate: () => (water.tilePositionX += 1) });
    w.sfx('water');
    w.shake(1000, 0.01);
    await w.say('Water bursts under the door and pours through the windows.');
    await w.say('OH NO!', PIP, { pitch: 1300 });
    await w.say("IT'S HERE!", PIP, { pitch: 1300 });
    await w.say('GET IN THE SUBMARINE!', PIP, { pitch: 1300 });
    rise.stop();
    s.tweens.add({ targets: water, y: 5 * 16, duration: 2800, onUpdate: () => (water.tilePositionX += 1.5) });
    // everybody in
    const a = w.actor('pipwick')!;
    const climb = (id: string) => {
      const ac = w.actor(id)!;
      return w.tw({ targets: ac.sprite, x: 9 * 16 + 8, y: 4 * 16 + 8, scale: 0.4, duration: 500, ease: 'Quad.easeIn', onComplete: () => ac.sprite.setVisible(false) });
    };
    await w.move('pipwick', a.y > 7 ? ['up'] : [], 120);
    await climb('pipwick');
    if (w.state.creature) await climb('follower');
    await climb('player');
    w.sfx('clank');
    await w.wait(300);
    w.sfx('clank');
    await w.say('The hatch slams shut. The peanut butter seal holds.');
    w.sfx('chime');
    await w.tw({ targets: water, y: -16, duration: 1800, onUpdate: () => (water.tilePositionX += 2) });
    w.set('w2_sub_gone');
    w.set('w2_dive');
    w.save();
    await w.say('The water fills the house completely. The submarine lifts off its stand... and plunges into the sea.');
    await SCRIPTS.w2_dive(w);
  },

  /** The descent, the collision, the cave. */
  async w2_dive(w) {
    const s = scene(w);
    w.set('w2_dive');
    w.music(null);
    await w.fade(true, 500);
    cut(w, 'w2_deep', 2, 8, 'right');
    hideParty(w, true);
    w.setDark(0.86);
    w.music('deep');
    // parallax rock layers and a sub to follow
    const far = s.add.tileSprite(0, 6 * 16, DEEP_W * 16, 160, 'deep_rocks0').setOrigin(0, 0).setDepth(-2500).setScrollFactor(0.5, 1);
    const near = s.add.tileSprite(0, 8 * 16, DEEP_W * 16, 200, 'deep_rocks1').setOrigin(0, 0).setDepth(9200);
    w.worldLayer.add(far);
    w.worldLayer.add(near);
    near.setAlpha(0.95);
    for (let i = 0; i < 26; i++) {
      const k = w.image('kelp' + (i % 3), i * 70 + 20, 16 * 16 + 8, 9100).setOrigin(0.5, 1);
      s.tweens.add({ targets: k, angle: { from: -6, to: 6 }, duration: 1800 + (i % 4) * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    w.image('sunkenship', 34 * 16, 15 * 16, 9000).setOrigin(0.5, 1);
    w.image('sunkenship', 48 * 16, 16 * 16, 9000).setOrigin(0.5, 1).setFlipX(true).setScale(0.8);
    const sub = w.sprite('subside', 2 * 16, 6 * 16, 9400);
    sub.play('subside_go');
    sub.setFlipX(true); // facing right, into the deep
    const light = { x: 0, y: 0, r: 70 };
    const lamp = { x: 0, y: 0, r: 36 };
    w.extraLights.push(light, lamp);
    const glow = () => {
      light.x = sub.x + 44;
      light.y = sub.y + 6;
      lamp.x = sub.x;
      lamp.y = sub.y;
    };
    glow();
    const bub = s.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        const b = w.image(Math.random() < 0.5 ? 'bubble0' : 'bubble1', sub.x - 36, sub.y + (Math.random() - 0.5) * 10, 9500);
        s.tweens.add({ targets: b, y: b.y - 40 - Math.random() * 30, x: b.x - 10, alpha: 0, duration: 1200, onComplete: () => b.destroy() });
      },
    });
    camFollow(w, sub as any, 0.1, 2);
    await w.fade(false, 800);
    const go = (x: number, y: number, ms: number) => w.tw({ targets: sub, x: x * 16, y: y * 16, duration: ms, ease: 'Sine.easeInOut', onUpdate: glow } as any);
    const D = (line: string) => w.say(line, PIP, { pitch: P_PIP });
    await go(14, 8, 3000);
    await D('Depth: three hundred meters. Hull: holding. Peanut butter: holding. Professor: holding it together. Mostly.');
    w.sfx('sonar');
    await go(30, 10, 3600);
    await D("Look! A shipwreck! ...Several shipwrecks. Oh dear. That's a lot of shipwrecks.");
    await go(44, 9, 3000);
    // something vast, just at the edge of the light
    // drawn above the darkness: an eye in the black, lit by nothing
    const eye = w.sprite('eye', 56 * 16, 5 * 16, 10050).setScale(1.5).setAlpha(0);
    eye.setFrame(0);
    s.tweens.add({ targets: eye, alpha: 0.9, duration: 1200 });
    await go(52, 9, 2600);
    eye.setFrame(1);
    await w.wait(250);
    eye.setFrame(2);
    w.sfx('heartbeat');
    await w.wait(900);
    await D('...Was that a rock?');
    await w.wait(500);
    eye.setFrame(1);
    await w.wait(180);
    eye.setFrame(0);
    await D("Rocks don't blink.");
    s.tweens.add({ targets: eye, alpha: 0, duration: 800, onComplete: () => eye.destroy() });
    w.sfx('sonar');
    await go(66, 11, 3000);
    await D("The sonar is just one big blob. In every direction. It's... it's all around us. We are INSIDE the blob's general area.");
    // a huge silhouette slides past overhead
    const fin = w.image('deep_rocks1', 70 * 16, 2 * 16, 9350).setTint(0x000000).setScale(0.6, 0.4).setAlpha(0);
    s.tweens.add({ targets: fin, alpha: 0.9, x: 50 * 16, duration: 3800 });
    await go(78, 10, 2600);
    // impact
    w.sfx('impact');
    w.flash(0.8);
    w.shake(1200, 0.03);
    s.tweens.add({ targets: sub, angle: 200, duration: 1600, ease: 'Quad.easeOut' });
    await D('WHAT WAS THAT?! We hit something! Or something hit US!');
    w.sfx('alarm');
    await go(88, 15, 1600);
    await D("We're losing control! We're being pulled DOWN! Into... is that a CAVE?! HOLD ON TO SOMETHING!");
    w.sfx('whoosh');
    s.tweens.add({ targets: sub, angle: 520, duration: 1400 });
    await go(100, 17, 1400);
    w.sfx('impact');
    w.flash(1);
    w.shake(800, 0.03);
    bub.remove();
    await w.fade(true, 300);
    w.extraLights.length = 0;
    far.destroy();
    near.destroy();
    await w.wait(900);
    await SCRIPTS.w2_cave_arrive(w);
  },
};

// ================================================================== the Cave of the Gods

const CAVE: Record<string, Script> = {
  async w2_cave_arrive(w) {
    w.set('w2_cave');
    w.set('w2_inv_away', false);
    w.set('w2_inv_home', false);
    cut(w, 'w2_cave', 21, 31, 'up');
    hideParty(w, true);
    w.music(null);
    // the crash left the camera faded out; a moment of black covers the switch
    const dark = blackout(w, 1, 95);
    cam(w).resetFX();
    await w.wait(1200);
    await w.tw({ targets: dark, alpha: 0, duration: 1000 });
    dark.destroy();
    await w.wait(300);
    w.sfx('clank');
    await w.wait(500);
    w.sfx('drip');
    await w.say('Silence. Then the creak of a hatch, forced open from the inside.');
    hideParty(w, false);
    w.music('gods');
    await w.say("...Ow. Everybody alive? Child? Ghost? Me?", PIP, { pitch: 760 });
    await w.wait(400);
    await w.say('Yes. Good. Fantastic. Three for three.', PIP, { pitch: P_PIP });
    await w.say('Wait. Where... are we?', PIP, { pitch: 760 });
    // the camera rises, slowly, up the four statues
    const remove = bars(w);
    await camPx(w, 22 * 16, 24 * 16, 900, 2);
    await camPx(w, 22 * 16, 14 * 16, 2600, 1.2);
    w.sfx('stone');
    for (const g of GODS) {
      await camPx(w, (GOD_X[g] + 3) * 16, 13 * 16, 1100, 1.8);
      await w.wait(500);
    }
    await camPx(w, 22 * 16, 8 * 16, 1600, 1);
    await w.wait(800);
    await remove();
    await w.camReturn(800);
    await w.say('Okay...', PIP, { pitch: 640 });
    await w.wait(500);
    await w.say('Now THAT is a statue.', PIP, { pitch: P_PIP });
    await w.say('Four of them. Each one taller than my house. My old house. The one that is now a reef.', PIP, { pitch: P_PIP });
    await w.say('Do you think they built this place? The gods? Or someone who REALLY liked them?', PIP, { pitch: P_PIP });
    await w.say('I really hope one of these gods knows how to fix a submarine.', PIP, { pitch: P_PIP });
    await w.say('Four statues. And behind each one... a door. Sealed. Look at them.', PIP, { pitch: 760 });
    w.save();
  },

  async cave_statues_close(w) {
    await pip(w, "Look at the size of them up close. I feel like a crumb. A crumb that has wandered into a cathedral.");
  },

  async cave_pip(w) {
    if (await templePip(w)) return;
    const t = w.state.flags.w2_god as God | undefined;
    if (t) await w.say(`The ${GOD_NAMES[t]} door is open. After you. Definitely after you.`, PIP, { pitch: P_PIP });
    else await w.say("Four gods. Four doors. I don't believe in signs, but if I did, I would say this is a sign. Pick one. Touch it. Carefully.", PIP, { pitch: P_PIP });
  },

  async cave_glyph(w) {
    await w.say('A spiral cut deep into the floor. It is warm to the touch, as if something beneath it is breathing.');
  },
  async cave_urn(w) {
    await w.say('A tall stone urn, sealed with wax. Barnacles have grown over it. It has been down here a very, very long time.');
  },
  async cave_carving(w) {
    await w.say('Carvings run the whole length of the wall: four figures, and below them, the sea. And below the sea... something enormous, with no shape at all.');
    await pip(w, 'They knew. Whoever carved this, they KNEW it was down here.');
  },
  async cave_sub(w) {
    await w.say('The PIPWICK MARK VII, nose-first in the sand. Steam leaks from a dented seam. The peanut butter seal is, somehow, perfectly intact.');
  },
};

const STATUE: Record<God, { look: string[]; pip: string[] }> = {
  zeus: {
    look: ['ZEUS, king of the gods. His beard is a waterfall of stone. One arm is raised to the ceiling, and in his fist he holds a thunderbolt.', 'The bolt is carved so sharply it seems to crackle.'],
    pip: ["That's Zeus. God of the sky. Throws lightning at people he doesn't like.", 'I feel like he would not like me. I feel like he would throw quite a lot of lightning.'],
  },
  thor: {
    look: ['THOR, the thunderer. A winged helmet, braids down to his chest, and a hammer as big as a car.', 'The stone of his hammer is darker than the rest, and cold, as if it were made of something heavier.'],
    pip: ["Thor! A different mythology entirely. Somebody down here was keeping their options open.", "Look at the arms on him. I bet he never needed a Turbo-Encabulator. He'd just push the motorcycle."],
  },
  poseidon: {
    look: ['POSEIDON, lord of the sea. A crown of spikes, a trident taller than he is, and waves curling around his feet.', 'Of the four, his statue is the most worn, as if the sea itself has been stroking it for a thousand years.'],
    pip: ['Poseidon. God of the sea. Earthquakes, too. And... tsunamis.', "...You don't think...? No. No. Let's not jump to conclusions. Let's walk calmly toward a conclusion."],
  },
  athena: {
    look: ['ATHENA, goddess of wisdom. A tall crested helm, a spear, and a round shield with a snake-haired face carved into it.', 'A stone owl sits on her shoulder. Its eyes seem to follow you.'],
    pip: ["Athena. Wisdom. Strategy. The only one up here who'd read the instructions before building a submarine.", 'Her owl is staring at me. I respect the owl. The owl knows what it did.'],
  },
};

const STATUE_SCRIPTS: Record<string, Script> = {};
for (const g of GODS) {
  STATUE_SCRIPTS['statue_' + g] = async (w) => {
    w.set('w2_saw_' + g);
    for (const l of STATUE[g].look) await w.say(l);
    if (w.companion) {
      w.faceTo('inventor', 'player');
      for (const l of STATUE[g].pip) await w.say(l, PIP, { pitch: P_PIP });
    }
    const chosen = w.state.flags.w2_god as God | undefined;
    if (chosen === g) {
      await w.say(`Behind the statue, the door of ${GOD_NAMES[g]} stands open.`);
      return;
    }
    if (chosen) {
      await w.say('The stone is cold now. It no longer answers you.');
      return;
    }
    if (!w.state.flags.w2_one_warned) {
      w.set('w2_one_warned');
      await w.say('Somehow you know: whichever god you answer, the other three doors will never open for you.');
    }
    if (!(await w.confirm(`Place your hand on the statue of ${GOD_NAMES[g]}?`))) return;
    w.sfx('stone');
    w.shake(1400, 0.006);
    await w.say('The stone is warm. A deep note hums through the floor, up through your feet, into your teeth.');
    w.set('w2_touched', g);
    w.refresh();
    w.sfx('crystal');
    w.flash(0.5);
    const door = w.prop(`g_door_${g}_lit`);
    if (door) await camPx(w, door.x + 24, door.y + 32, 700, 2.4);
    await w.say(`Behind the statue, the symbol on the ${GOD_NAMES[g]} door begins to glow.`);
    w.sfx('rumble');
    w.shake(1600, 0.008);
    await w.wait(900);
    w.set('w2_god', g);
    w.refresh();
    w.sfx('boom');
    w.flash(0.6);
    await w.wait(600);
    await w.say('The seal cracks. With a long, grinding roar, the door sinks into the floor.');
    await w.camReturn(600);
    await w.say('Across the cave, the other three doors go dark.');
    await pip(w, 'Well. No going back now.');
    w.save();
  };
  STATUE_SCRIPTS['god_door_' + g] = async (w) => {
    const sym: Record<God, string> = { zeus: 'a thunderbolt', thor: 'a hammer', poseidon: 'a trident', athena: 'an owl' };
    if (w.state.flags.w2_god === g) {
      await w.say(`The door of ${GOD_NAMES[g]} stands open. A cold wind breathes out of it.`);
    } else if (w.state.flags.w2_god) {
      await w.say(`${sym[g][0].toUpperCase() + sym[g].slice(1)} is carved into the sealed door of ${GOD_NAMES[g]}. It is dark, and it will stay dark.`);
    } else await w.say(`A sealed stone door, taller than three people. ${sym[g][0].toUpperCase() + sym[g].slice(1)} is carved into its face. It does not move.`);
  };
}

// ================================================================== resuming, doors and the World 1 bridge

let offeredW2 = false;
const RESUME: Record<string, Script> = {
  /** A cutscene was cut short by closing the game: pick it back up. */
  async resume_world2(w) {
    const st = w.state;
    if (isSet(st, 'w2_dive') && !isSet(st, 'w2_cave')) return SCRIPTS.w2_dive(w);
    if (isSet(st, 'w2_assembled') && !isSet(st, 'w2_dive')) return SCRIPTS.w2_tsunami(w);
    if (isSet(st, 'w2_inv_met') && partsHave(st) >= 2 && !isSet(st, 'w2_gov_done')) return SCRIPTS.w2_gov(w);
    if (isSet(st, 'w2_inv_met') && partsHave(st) >= 3 && !isSet(st, 'w2_evac_done')) return SCRIPTS.w2_evac(w);
    if (w.map.id === 'isl' && !isSet(st, 'w2_local_met') && w.actor('w2_local')) return SCRIPTS.w2_arrival(w);
  },
  /** Old saves that finished World 1 before World 2 existed: a reminder of how to leave (once). */
  async resume_world1(w) {
    if (!isSet(w.state, 'ending_done') || isSet(w.state, 'w2_started') || offeredW2 || isSet(w.state, 'w1_leave_hint')) return;
    offeredW2 = true;
    w.set('w1_leave_hint');
    w.save();
    await w.say('(When you are ready to leave Hollowhaven, talk to the mayor in his office.)');
  },
  /** The mayor sees you off. */
  async w2_offer(w) {
    await w.say('Far off, beyond the edge of the sea, something calls. The mayor lifts his head and barks at the horizon.');
    await departPrompt(w, 'w2');
  },
};

export const W2_GATES: Record<string, Gate> = {
  async w2_grocery_door(w) {
    if (isSet(w.state, 'w2_evac_done')) return true;
    await w.say('The doors are chained shut. A notice reads: CLOSED BY EMERGENCY ORDER. NO EXCEPTIONS. NOT EVEN FOR SNACKS.');
    return false;
  },
  async w2_grocery_exit(w) {
    if (isSet(w.state, 'w2_pb_taken') && !isSet(w.state, 'w2_rick_beaten')) {
      await w.say(RICK + " is blocking the way, revving his engine. He isn't letting you leave with that jar.");
      return false;
    }
    return true;
  },
};

export const W2_MAIN: Record<string, Script> = {
  ...ARRIVE,
  ...FOLK,
  ...SIGHTS,
  ...PROF,
  ...QUIP_SCRIPTS,
  ...CRISIS,
  ...GROCERY,
  ...ASSEMBLY,
  ...TSUNAMI,
  ...CAVE,
  ...STATUE_SCRIPTS,
  ...RESUME,
};

void PB_SPOT;
void P_HIGH;
void blackout;
