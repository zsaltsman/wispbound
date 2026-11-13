import { isSet } from './state';
import { P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { SCRIPTS } from './registry';
import { T } from '../world/tiles';
import { w3Stage, type W3Stage } from './w3_state';
import { AYLA, P_AYLA, ayla, w3Act } from './w3_main';
import { w3Flood } from './w3_day2';

// World 3: the people of Bacchus Key. The crowd says different things each day,
// the shopkeepers have their own lives, and Ayla has a word or two when asked.

let offeredW4 = false;
const f = (w: W, k: string) => isSet(w.state, k);

/** What the crowd says, by stage. Each partygoer picks a line by its id. */
const CROWD: Record<W3Stage, string[]> = {
  d1: [
    'WOOOO! Bacchus Key! BEST ISLAND!',
    "I came for a weekend. That was in March.",
    'Have you been to Club Forever? You HAVE to go to Club Forever.',
    'Sal makes the best drinks on the island. Fifty years he has been behind that bar!',
    'Is it Tuesday? Every day here is Saturday.',
    'I lost my shoes. I lost them on Monday. I do not miss them.',
    'The barrel! Have you seen the barrel? It is SO big.',
    'Party hats are mandatory after six. Sort of. Nobody checks.',
  ],
  n1: [
    'The club is HEAVING tonight!',
    'Do not go home. Nobody goes home. Home is boring.',
    'I am dancing! I am always dancing! Even now! Look!',
    "The bouncer let me in with a library card. Don't tell him.",
  ],
  d2: [
    'Did you hear? Sal... last night. I can\'t believe it.',
    'There was a THING. A metal thing. With a tail.',
    "Half my friends went home this morning. Home! On Bacchus Key!",
    "We should still party. Sal would want us to party. Wouldn't he?",
    'The club feels wrong without him behind the bar.',
  ],
  n2: [
    'The barrel... all of it... it\'s just GONE.',
    'Where did those things even come from?!',
    "My grandmother built that barrel. Well, she watched it being built. From a bar.",
    "Nothing like this has ever happened here. Never.",
  ],
  d3: [
    "It's so quiet. I didn't know the island could be this quiet.",
    'I had breakfast. At breakfast time. It was weird. It was nice?',
    "Nobody's dancing. There's nothing to drink. What do we even DO?",
    'I went for a walk on the beach. In daylight. Did you know there are birds here?',
  ],
  end: [
    'We are having a party. A small one. With lemonade. Do not tell anyone how much I am enjoying it.',
    'I am going to learn to paint. Avalena said she would teach me.',
    'The club is open again. It is quieter. I can actually hear the music now.',
    "I'll miss Sal. Every day. We're putting his towel up behind the bar.",
  ],
};

const FOLK: Record<string, Script> = {
  async w3_crowd(w, id: string) {
    const lines = CROWD[w3Stage(w.state)];
    const n = [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
    await w.say(lines[n % lines.length], 'PARTYGOER', { pitch: [P_LOW, P_MID, P_HIGH][n % 3] });
    if (f(w, 'w3_in_club') && w.map.id === 'w3_club') await w3Act(w, 'talk');
  },
  async w3_performer(w) {
    const st = w3Stage(w.state);
    await w.say(st === 'end' ? 'A new act! I juggle LEMONS now. The juggling oranges were too painful a reminder.' : 'Behold: the man who can juggle five bottles and drink from none of them!', 'STREET PERFORMER', { pitch: P_HIGH });
    w.sfx('cheer');
  },
  async w3_photobooth(w) {
    w.sfx('item');
    await w.say('You squeeze into the photo booth with your creatures. FLASH. The strip of photos comes out: four pictures of you blinking.');
  },
  async w3_forsale(w) {
    await w.say("FOR SALE. ENQUIRE AT CLUB FOREVER. ASK FOR AVALENA.");
    if (!f(w, 'w3_avalena_found')) {
      w.set('q_w3_forsale');
      await ayla(w, "At the club? Why would she be at the club?");
    }
  },
  // ---------------------------------------------------------------- Food Row
  async w3_lin(w) {
    const L = (s: string) => w.say(s, 'LIN', { pitch: P_MID });
    if (f(w, 'w3_resolved')) return L("Avalena wants dumplings for the club. Every Sunday. I said yes before she finished asking.");
    await L("Twenty-two dishes. Fresh every morning. And who eats? Nobody eats. They drink and they dance.");
    await L('My son says we need a better name. I say, the name is fine. The island is the problem.');
  },
  async w3_kevin(w) {
    await w.say(f(w, 'w3_resolved') ? 'Mum is happy. Do you know how rare that is?' : "I told her. EAT LIKE PIG is a great name for a farm. Less great for a restaurant. She does not listen.", 'KEVIN', { pitch: P_MID });
  },
  async w3_buffet_food(w) {
    await w.say('Trays of dumplings, noodles, buns, fried rice. Steaming. Untouched. Enough to feed a hundred people. There are two.');
  },
  async w3_biz_buffet(w) {
    await w.say("It's delicious. I don't know why nobody comes. Everyone's too hungover to eat, I guess.", 'CUSTOMER', { pitch: P_HIGH });
  },
  async w3_morty(w) {
    await w.say(f(w, 'w3_resolved') ? 'Maybe I should do fish and chips. In a cup. To go. Like the froyo man.' : 'Finest seafood on Bacchus Key! Also the only seafood on Bacchus Key! Where is everybody?!', 'CAPTAIN MORTY', { pitch: P_LOW });
  },
  async w3_tank(w) {
    await w.say('One lobster. It looks at you with deep, ancient disappointment.');
  },
  async w3_biz_lobster(w) {
    await w.say('The shrimp is fine. It is just fine. I wanted to be more excited about it.', 'DINER', { pitch: P_MID });
  },
  async w3_lex(w) {
    w.sfx('item');
    await w.say('Lex, the Bear Queen, pours you a coffee without a word, slides it over, and goes back to wiping the counter. A bear cub is asleep on her crown.');
  },
  async w3_cub(w) {
    const lines = ['A bear cub is trying to climb the coffee machine.', 'A bear cub is gnawing on a chair leg, very seriously.', 'A bear cub rolls past you. On purpose, probably.', 'A bear cub sniffs your shoe and sneezes.'];
    w.sfx('swish');
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async w3_unsafe(w) {
    await w.say('Well...', 'CUSTOMER', { pitch: P_MID });
    await w.wait(500);
    await w.say("This can't be safe.", 'CUSTOMER', { pitch: P_MID });
  },
  async w3_biz_cafe(w) {
    await w.say("The coffee's good. The cubs are better. I come most mornings.", 'CUSTOMER', { pitch: P_HIGH });
  },
  async w3_dottie(w) {
    await w.say(f(w, 'w3_resolved') ? "A standing order from Club Forever! Four hundred donuts a week! I need a bigger oven!" : "Two dozen glazed, a box of sprinkles, NEXT! Sorry, hon, I can't stop to chat, we've been slammed since six!", 'DOTTIE', { pitch: P_HIGH });
  },
  async w3_baker(w) {
    await w.say("Can't talk. Rolling. Always rolling.", 'BAKER', { pitch: P_LOW });
  },
  async w3_donuts(w) {
    await w.say('Glazed, frosted, jam, sprinkles, a donut the size of a steering wheel. The trays empty as fast as they fill.');
  },
  async w3_biz_dough(w, id: string) {
    const lines = ["I've been in line twenty minutes. Worth it.", 'Three boxes. One is for me. One is also for me.', 'Best thing on the island! Well. Best thing you can eat in the morning.', "They sold out of chocolate. AGAIN."];
    const n = [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
    await w.say(lines[n % lines.length], 'CUSTOMER', { pitch: [P_MID, P_HIGH][n % 2] });
  },
  async w3_frofro(w) {
    await w.say(f(w, 'w3_resolved') ? 'Froyo in the CLUB! Swirls on the DANCE FLOOR! My hair is quivering with joy!' : "WELCOME to MR. FROFRO'S! Every swirl, a little masterpiece! Like my hair!", 'MR. FROFRO', { pitch: P_HIGH });
  },
  async w3_froyo_machine(w) {
    await w.say('Three flavours, forty toppings, and a queue that never ends. The machine hums like it is very proud of itself.');
  },
  async w3_biz_froyo(w, id: string) {
    const lines = ['Third cup today. It is basically water. Frozen water. With sprinkles.', "My kids would riot if we didn't come every day.", 'It is cold, it is sweet, it does not give you a headache. What more do you want?', 'FroFro put a gummy bear on mine for free. I would die for that man.'];
    const n = [...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0);
    await w.say(lines[n % lines.length], 'CUSTOMER', { pitch: [P_HIGH, P_MID][n % 2] });
  },
  // ---------------------------------------------------------------- the rest of the strip
  async w3_karaoke_singer(w) {
    w.sfx('note');
    await w.say("♪ I WILL SURVIIIVE... ♪ ...SORRY, WAIT, WHAT'S THE NEXT LINE? ♪ I WILL SURVIIIVE ♪", 'SINGER', { pitch: P_HIGH });
  },
  async w3_arcade_kid(w) {
    await w.say("I'm on level two hundred. My mum thinks I'm at school. I think I'm at school too, honestly.", 'KID', { pitch: P_HIGH });
  },
  async w3_waiter(w) {
    await w.say(w3Stage(w.state) === 'd3' ? 'Breakfast rush! First one in twenty years! I do not know what I am doing!' : 'Coffee? Pancakes? A very large glass of water? Everyone ends up here at 4am.', 'WAITER', { pitch: P_MID });
  },
  async w3_diner_regular(w) {
    await w.say("I come here after the club. Every night. Same booth. Same pancakes. Same headache.", 'REGULAR', { pitch: P_LOW });
  },
  async w3_souvenir_clerk(w) {
    await w.say('I SURVIVED BACCHUS KEY t-shirts! Two for one! Sizes: large, and "you will be fine, you are on holiday".', 'CLERK', { pitch: P_HIGH });
  },
  async w3_costumer(w) {
    await w.say("Pirate, mermaid, disco ball, giant banana. Everybody's somebody else here. That's the point.", 'COSTUMER', { pitch: P_MID });
  },
  async w3_lobby_clerk(w) {
    await w.say(w3Stage(w.state) === 'd3' ? "Checkouts all morning. Everyone's going home. Strange times." : "Fully booked! We are always fully booked. People forget to leave.", 'RECEPTIONIST', { pitch: P_MID });
  },
  async w3_resident(w, id: string) {
    const L: Record<string, string> = {
      w3_home0_p0: 'Seventy years on this island. I used to dance on the bar. Now I just like a cup of tea and a quiet night. Nobody tells you that happens.',
      w3_home1_p0: 'Party hats. Every room. My husband collects them. Please do not encourage him.',
      w3_home1_p1: 'I want to be a bartender when I grow up! Or an astronaut. Or a bartender on the moon.',
      w3_home2_p0: "I'm renting this place out to tourists. The tourists keep renting it out to more tourists. I live in the shed now.",
    };
    await w.say(L[id] ?? 'Hello!', 'RESIDENT', { pitch: P_MID });
  },
  // ---------------------------------------------------------------- Ayla, when you talk to her
  async w3_ayla_talk(w) {
    const Y = (s: string) => w.say(s, AYLA, { pitch: P_AYLA });
    const st = w3Stage(w.state);
    if (!f(w, 'w3_avalena_found')) {
      if (f(w, 'q_w3_closed')) {
        w.faceTo('inventor', 'player');
        return Y("Back to the club! It's up on the Strip. Somebody in there will know where she went.");
      }
      return Y(f(w, 'w3_shop_closed') ? "Where would she even go? Somewhere with a job, I guess. Somewhere that's open all day..." : 'To the art shop! Before I lose my nerve. Again.');
    }
    if (f(w, 'w3_jug_quest') && !f(w, 'w3_jug_full')) return Y("The barrel's at the east end of the Strip. You can see it from basically everywhere.");
    if (f(w, 'w3_grimsby_met') && !f(w, 'w3_grimsby_done')) return Y(f(w, 'w3_shot') ? 'Back to the clinic. If he dies, I am blaming you.' : 'Avalena has the drinks. Probably. Hopefully.');
    if (st === 'd3' && f(w, 'w3_research') && !f(w, 'w3_research_done')) {
      const n = ['buffet', 'lobster', 'cafe', 'dough', 'froyo'].filter((k) => f(w, 'w3_seen_' + k)).length;
      return Y(n < 5 ? "Food Row's that way. Count the customers. Count the queues. Queues don't lie." : "We've seen them all. The donut place and the froyo place were packed. Let's tell Avalena.");
    }
    if (st === 'd3') return Y("It's so quiet. I kind of like it? Is that bad?");
    return Y("You know, you're really easy to follow around. Not in a creepy way. Okay, in a little bit of a creepy way.");
  },
  // ---------------------------------------------------------------- the island remembers what happened to it
  decorate_w3_isl(w) {
    const key = '__w3_ground';
    const store = w as unknown as Record<string, number[] | undefined>;
    if (!store[key]) store[key] = [...w.map.ground];
    const orig = store[key]!;
    w.map.ground.forEach((t, i) => {
      if (t !== orig[i]) w.setGround(i % w.map.w, Math.floor(i / w.map.w), orig[i]);
    });
    if (f(w, 'w3_barrel_gone')) {
      // the booze dries over the days, but the stain stays
      const rr = (x: number, y: number) => ((x * 73 + y * 151) % 97) / 97;
      for (let y = 36; y < 44; y++)
        for (let x = 70; x < 93; x++) {
          const g = orig[y * w.map.w + x];
          const near = Math.hypot(x - 81, y - 36) < 8 + rr(x, y) * 3;
          if (near && [T.PROMENADE, T.PROMENADE2, T.ASPHALT, T.ASPHALT2, T.SIDEWALK, T.GRASS, T.GRASS2].includes(g as any)) w.setGround(x, y, T.BOOZE);
        }
    }
    return Promise.resolve();
  },
  /** A cutscene was cut short by closing the game: pick it back up. */
  async resume_world3(w) {
    const st = w.state;
    const k = (x: string) => isSet(st, x);
    if (!k('w3_guide_met') && w.map.id === 'w3_isl') return SCRIPTS.w3_guide_intro(w);
    if (k('w3_sal_dead') && !k('w3_scorvex_beaten')) return SCRIPTS.w3_scorvex(w);
    if (k('w3_scorvex_beaten') && !k('w3_followed')) {
      w.set('w3_scorvex_beaten');
      return SCRIPTS.w3_follow(w);
    }
    if (k('w3_cave_done') && !k('w3_day2')) return SCRIPTS.w3_villain1(w);
    if (k('w3_barrel_gone') && !k('w3_widow_beaten')) return SCRIPTS.w3_widow_barrel(w);
    if (k('w3_widow_beaten') && !k('w3_day3')) return SCRIPTS.w3_villain2(w);
    if (k('w3_iron_met') && !k('w3_iron_beaten')) return SCRIPTS.w3_ironclad(w);
    if (k('w3_iron_beaten') && !k('w3_resolved')) return SCRIPTS.w3_aftermath(w);
    if (k('w3_resolved') && !k('w3_end')) return SCRIPTS.w3_moving_on(w);
    if (k('w3_end') && !k('w4_started') && !offeredW4 && !k('w3_leave_hint')) {
      offeredW4 = true;
      return SCRIPTS.stay_w3(w);
    }
  },
};

export const W3_FOLK: Record<string, Script> = FOLK;
void w3Flood;
