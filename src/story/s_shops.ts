import { isSet, has } from './state';
import { stage, P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { pop } from './w2_fx';
import { C } from '../ui/ui';
import { PIE_CASE, JUNK_AT } from '../world/maps/shops';

// MAD PIES (World 1): Maddie bakes, Morgan scrolls, Roxie steals.
// LUKE & GRACE'S THRIFT (World 2): two people sincerely selling garbage.
// Both shops are optional; most of their personality is in the background.

type Dir = 'up' | 'down' | 'left' | 'right';
const MADDIE = 'MADDIE';
const MORGAN = 'MORGAN';

// ------------------------------------------------------------------ ambient life (no dialogue boxes)

/** Is it safe to animate the background? (the player isn't mid-conversation, the map is still loaded) */
const calm = (w: W, map: string) => w.map.id === map && !w.busy && !w.dialog.active && !(w as any).menu?.open;

/** Walk an NPC one step at a time, giving up if the way is blocked by anyone. */
async function stroll(w: W, id: string, path: Dir[], ms = 260) {
  for (const d of path) {
    const a = w.actor(id);
    if (!a || !a.sprite.scene) return false;
    const nx = a.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0);
    const ny = a.y + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
    if (w.blocked(nx, ny) || (w.player.x === nx && w.player.y === ny) || (w.follower && w.follower.x === nx && w.follower.y === ny)) return false;
    await w.move(id, [d], ms);
  }
  return true;
}

/** Walk an NPC toward a tile (straight lines, horizontal first). */
function pathTo(a: { x: number; y: number }, x: number, y: number): Dir[] {
  const p: Dir[] = [];
  for (let i = a.x; i < x; i++) p.push('right');
  for (let i = a.x; i > x; i--) p.push('left');
  for (let j = a.y; j < y; j++) p.push('down');
  for (let j = a.y; j > y; j--) p.push('up');
  return p;
}

async function roxieHeist(w: W) {
  const r = w.actor('roxie');
  const m = w.actor('maddie');
  if (!r || !m) return;
  // sneak up to the pie case
  if (!(await stroll(w, 'roxie', pathTo(r, PIE_CASE.x + 1, PIE_CASE.y + 1), 340))) return;
  w.face('roxie', 'up');
  await w.emote('roxie', '?', 600);
  if (!calm(w, 'madpies')) return;
  // Maddie has her back turned...
  w.face('maddie', 'up');
  await w.wait(500);
  w.sfx('swish');
  r.sprite.setFrame(12);
  pop(w, r.sprite.x, r.sprite.y - 18, '*snatch*', C.light, 700);
  await w.wait(250);
  await stroll(w, 'roxie', ['down', 'down', 'right'], 150);
  r.sprite.setFrame(12);
  // ...and turns around
  w.faceTo('maddie', 'roxie');
  await w.emote('maddie', '!', 500);
  pop(w, m.sprite.x, m.sprite.y - 22, 'ROXIE!', C.white, 1000);
  r.face('down');
  r.sprite.setFrame(11); // the picture of innocence
  await w.wait(1400);
  if (r.sprite.scene) r.face('left');
  w.face('maddie', 'down');
}

async function morganFakesIt(w: W) {
  const mo = w.actor('morgan');
  const m = w.actor('maddie');
  if (!mo || !m) return;
  w.faceTo('maddie', 'morgan');
  pop(w, m.sprite.x, m.sprite.y - 22, 'MORGAN?', C.white, 900);
  await w.wait(250);
  mo.sprite.setTexture('ch_morgan_busy', 6);
  pop(w, mo.sprite.x, mo.sprite.y - 22, '*sweep sweep*', C.light, 900);
  await w.wait(1100);
  w.face('maddie', 'down');
  await w.wait(500);
  if (mo.sprite.scene) {
    mo.sprite.setTexture('ch_morgan', 6);
    mo.face('right');
  }
}

async function maddieBustles(w: W) {
  const m = w.actor('maddie');
  if (!m) return;
  const home = { x: m.x, y: m.y };
  if (!(await stroll(w, 'maddie', pathTo(m, 2, 3), 200))) return;
  w.face('maddie', 'up');
  w.sfx('clank');
  pop(w, m.sprite.x, m.sprite.y - 22, '*hums*', C.light, 900);
  await w.wait(700);
  await stroll(w, 'maddie', pathTo(w.actor('maddie')!, home.x, home.y), 200);
  w.face('maddie', 'down');
}

async function lifeLoop(w: W, map: string, events: ((w: W) => Promise<void>)[]) {
  // one loop per visit: re-entering the room retires the old one
  const gen = ((w as any).lifeGen = ((w as any).lifeGen ?? 0) + 1);
  const alive = () => w.map.id === map && (w as any).lifeGen === gen;
  let i = 0;
  while (alive()) {
    await w.wait(4500 + Math.random() * 3500);
    if (!alive()) return;
    if (!calm(w, map)) continue;
    try {
      await events[i++ % events.length](w);
    } catch {
      /* the room was left mid-animation */
    }
  }
}

// ================================================================== MAD PIES

const PIES: Record<string, Script> = {
  async decorate_madpies(w) {
    void lifeLoop(w, 'madpies', [roxieHeist, morganFakesIt, maddieBustles]);
  },

  async maddie(w) {
    const st = w.state;
    const s = stage(w);
    w.faceTo('maddie', 'player');
    if (s >= 5) {
      await w.say("The mayor's HOME! He came by first thing and Roxie hasn't stopped wagging since.", MADDIE, { pitch: P_HIGH });
      return;
    }
    if (!isSet(st, 'pies_met')) {
      w.set('pies_met');
      await w.say('Welcome to Mad Pies! Every pie gets a face. That one\'s furious. That one\'s just a bit cross.', MADDIE, { pitch: P_HIGH });
      return;
    }
    const n = Number(st.flags.pies_talk ?? 0);
    w.set('pies_talk', n + 1);
    if (n % 3 === 0) {
      await w.say("The mayor used to come in every morning. Roxie's known him since she was a puppy.", MADDIE, { pitch: P_HIGH });
      await SCRIPTS_ROXIE_HEARS_MAYOR(w);
    } else if (n % 3 === 1) {
      await w.say('MORGAN. The oven. Please.', MADDIE, { pitch: P_HIGH });
      await w.say("Can't. On my break.", MORGAN, { pitch: P_LOW });
      await w.say("You've been on your break since Tuesday.", MADDIE, { pitch: P_HIGH });
    } else if (st.creature) await w.say("Your ghost is drooling on my pie case. Can ghosts drool? Apparently.", MADDIE, { pitch: P_HIGH });
    else await w.say("Grumpy on the outside, sweet on the inside. Like me before coffee.", MADDIE, { pitch: P_HIGH });
  },

  async morgan(w) {
    const lines = [
      ['...', null],
      ["Hm? Oh. We're closed. ...We're open? Ugh. Fine.", null],
      ["I'm not ignoring customers. I'm ignoring EVERYONE. It's different.", null],
      ['MADDIE. Customer.', "YOU'RE STANDING RIGHT NEXT TO THEM, MORGAN."],
    ];
    const n = Number(w.state.flags.morgan_talk ?? 0);
    w.set('morgan_talk', n + 1);
    const [a, b] = lines[n % lines.length];
    await w.say(a as string, MORGAN, { pitch: P_LOW });
    if (b) await w.say(b, MADDIE, { pitch: P_HIGH });
  },

  async roxie(w) {
    const r = w.actor('roxie');
    w.faceTo('roxie', 'player');
    w.sfx('bark');
    if (r) r.sprite.setFrame(9);
    await w.wait(200);
    if (r) w.faceTo('roxie', 'player');
    if (stage(w) >= 5) return w.say("Roxie can't sit still. She keeps looking at the door, tail going like a propeller.");
    if (w.state.creature && !isSet(w.state, 'roxie_met_spirit')) {
      w.set('roxie_met_spirit');
      await w.emote('roxie', 'anger', 500);
      await w.say('Roxie growls at your spirit. Then sniffs it. Then wags. They are friends now.');
      return;
    }
    await w.say('Roxie sniffs your hand, then the pie case, then your hand again. She is weighing her options.');
  },

  async mayor_visit(w) {
    w.sfx('bark');
    await w.emote('mayor_visit', 'heart', 500);
    await w.emote('roxie', 'heart', 500);
    await w.say('The mayor and Roxie sit side by side, sharing a pie with a very angry face. Neither of them minds.');
  },

  async pies_case(w) {
    await w.say('Six pies glare at you from behind the glass. The cherry one looks personally offended.');
  },
  async pies_counter(w) {
    await w.say('Pies cooling on the counter. One has a little frown piped in cream. It is not frowning at you. Probably.');
  },
  async pies_oven(w) {
    await w.say('The oven is warm. Inside, a fresh pie is slowly getting angrier.');
  },
  async pies_menu(w) {
    await w.say("TODAY: GRUMPY APPLE. FURIOUS PECAN. MILDLY ANNOYED CUSTARD.");
  },
  async pies_shelf(w) {
    await w.say("Cookbooks. One is called 'PIE: A FEELING'. All its pages are covered in flour and tiny paw prints.");
  },
  async pies_fridge(w) {
    await w.say('A note on the fridge, in Maddie\'s writing: MORGAN, PLEASE. And under it, in Morgan\'s: no.');
  },
  async roxie_bed(w) {
    await w.say("Roxie's bed. It is full of pie crumbs. Extremely full.");
  },
  async sign_madpies(w) {
    await w.say('MAD PIES. HANDMADE. ANGRY. DELICIOUS.');
  },
};

/** Say "mayor" in front of Roxie and watch what happens. */
async function SCRIPTS_ROXIE_HEARS_MAYOR(w: W) {
  const r = w.actor('roxie');
  if (!r) return;
  w.face('roxie', 'down');
  await w.emote('roxie', '!', 500);
  w.sfx('bark');
  r.sprite.setFrame(9);
  await w.wait(250);
  // up to the open aisle, across, and down to sit by the door (not in front of it)
  const toAisle: Dir[] = [];
  for (let y = r.y; y > 5; y--) toAisle.push('up');
  await stroll(w, 'roxie', [...toAisle, ...pathTo({ x: r.x, y: 5 }, 5, 5), 'down', 'down', 'down'], 170);
  w.face('roxie', 'down');
  r.sprite.setFrame(11);
  await w.say('At the word "mayor", Roxie trots to the door and sits, staring at it.');
  await w.say('...She does that every morning. He\'ll be back, Roxie.', MADDIE, { pitch: P_MID });
}

/** A small reunion during the World 1 ending: Roxie and the mayor. */
export async function roxieReunion(w: W) {
  const r = w.actor('g_roxie');
  if (!r) return;
  w.sfx('bark');
  r.sprite.setFrame(9);
  await w.wait(300);
  await w.move('g_roxie', ['up', 'up', 'left'], 140);
  w.face('g_roxie', 'up');
  w.face('g_mayor', 'down');
  w.sfx('bark');
  await w.wait(200);
  w.sfx('bark');
  await w.emote('g_mayor', 'heart', 600);
  await w.emote('g_roxie', 'heart', 600);
  await w.say('Roxie and the mayor go nose to nose, tails a blur. Old friends.');
}

// ================================================================== LUKE & GRACE'S THRIFT

const LUKE = 'LUKE';
const GRACE = 'GRACE';

/** Each item: the tag, then one of them defends it. */
const JUNK: Record<string, { tag: string; who: 'L' | 'G'; line: string }> = {
  chair: { tag: 'RARE VINTAGE CHAIR. Minor structural issues.', who: 'L', line: "Three legs. Like a tripod. Tripods are very stable. Look it up." },
  clock: { tag: "COLLECTOR'S CLOCK. Time not guaranteed.", who: 'G', line: "It's right twice a day. That's a better record than most clocks on this island." },
  lamp: { tag: 'DESIGNER LAMP. Shade sold separately.', who: 'L', line: 'Shades are a crutch. This lamp is brave.' },
  tv: { tag: 'PREMIUM TELEVISION. Screen sold separately.', who: 'G', line: "Picture's incredible. Use your imagination. Imagination is free. The TV is not." },
  jacket: { tag: 'BREATHABLE JACKET. Extra ventilation.', who: 'L', line: "That's not a hole, that's a FEATURE. You'd pay extra for that in the city." },
  box: { tag: 'MYSTERY BOX. Contents: yes.', who: 'G', line: 'A fork, a doll\'s head and one chopstick. Separately, junk. Together? A set.' },
  toaster: { tag: 'BATTLE-TESTED TOASTER. Toasts one side.', who: 'L', line: "This toaster has SEEN things, man. It's toasted through two tsunamis." },
};

const THRIFT: Record<string, Script> = {
  async decorate_w2_thrift(w) {
    const bicker = async (ww: W) => {
      const l = ww.actor('luke');
      const g = ww.actor('grace');
      if (!l || !g) return;
      const pairs = [
        ['IT\'S VINTAGE!', "IT'S BROKEN, LUKE."],
        ['ONE OF A KIND!', 'THANK GOD.'],
        ['PRICELESS!', "I PUT A PRICE ON IT."],
      ];
      const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
      ww.faceTo('luke', 'grace');
      pop(ww, l.sprite.x, l.sprite.y - 22, a, C.white, 1100);
      await ww.wait(900);
      ww.faceTo('grace', 'luke');
      pop(ww, g.sprite.x, g.sprite.y - 22, b, C.light, 1100);
      await ww.wait(1200);
      ww.face('grace', 'down');
    };
    const potter = async (ww: W) => {
      const l = ww.actor('luke');
      if (!l) return;
      const home = { x: l.x, y: l.y };
      await stroll(ww, 'luke', ['left', 'left'], 300);
      ww.face('luke', 'up');
      pop(ww, l.sprite.x, l.sprite.y - 22, '*polishes junk*', C.light, 1000);
      await ww.wait(1200);
      await stroll(ww, 'luke', pathTo(ww.actor('luke')!, home.x, home.y), 300);
    };
    void lifeLoop(w, 'w2_thrift', [bicker, potter]);
  },

  async luke(w) {
    w.faceTo('luke', 'player');
    if (isSet(w.state, 'w2_evac_done')) {
      await w.say("Evacuate? And leave all THIS? We're going down with the shop.", LUKE, { pitch: P_MID });
      await w.say("I'm going down with the INVENTORY, Luke. The shop can sort itself out.", GRACE, { pitch: P_LOW });
      return;
    }
    if (!isSet(w.state, 'thrift_met')) {
      w.set('thrift_met');
      await w.say('Welcome, friend! Everything in here has a STORY.', LUKE, { pitch: P_MID });
      await w.say('Mostly sad ones. Everything in here also has a PRICE.', GRACE, { pitch: P_LOW });
      return;
    }
    const lines = [
      "Grace found that toaster in a tree after the second wave. In a TREE. That's provenance.",
      "People say we sell junk. We sell HISTORY. Junk is just history nobody's bought yet.",
      "Business is great! We sold a spoon in March.",
    ];
    await w.say(lines[Math.floor(Math.random() * lines.length)], LUKE, { pitch: P_MID });
  },

  async grace(w) {
    w.faceTo('grace', 'player');
    const lines = [
      "Everything is priced at market value. I am the market.",
      "Luke thinks the merchandise is magical. I think it's inventory. Between us, we're a business.",
      'No refunds. No returns. No questions. Especially no questions.',
    ];
    await w.say(lines[Math.floor(Math.random() * lines.length)], GRACE, { pitch: P_LOW });
  },

  async thrift_shopper(w) {
    await w.say("I've been browsing for three hours. Something in here has to be worth something. It HAS to.", 'SHOPPER', { pitch: P_LOW });
  },
  async thrift_racks(w) {
    await w.say("Racks of clothes. One sweater has three sleeves. Its tag says 'BONUS SLEEVE'.");
  },
  async thrift_counter(w) {
    await w.say("A bell on the counter. A sign: RING FOR SERVICE. The bell has no clapper.");
  },
  async thrift_register(w) {
    w.sfx('register');
    await w.say('The register drawer holds one button and a note: "IOU. -LUKE".');
  },
};

for (const [k, j] of Object.entries(JUNK)) {
  THRIFT['junk_' + k] = async (w) => {
    if (isSet(w.state, 'w2_bought_' + k)) return;
    await w.say(j.tag);
    await w.say(j.line, j.who === 'L' ? LUKE : GRACE, { pitch: j.who === 'L' ? P_MID : P_LOW });
    if (!(await w.confirm('Buy it?'))) return;
    // the quest money is spoken for: you pay the way Saltwash pays for everything now
    await w.say('You turn out your pockets. Lint. A button. Some sand.');
    await w.say('We take lint.', GRACE, { pitch: P_LOW });
    w.set('w2_bought_' + k);
    w.refresh();
    await w.give('j_' + k);
    await w.say('A fine choice. A FINE choice.', LUKE, { pitch: P_MID });
  };
}

export const SHOP_SCRIPTS: Record<string, Script> = { ...PIES, ...THRIFT };

void has;
void JUNK_AT;
