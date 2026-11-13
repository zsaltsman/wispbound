import { isSet, has, routesOpen, canRecruit } from './state';
import { staged, offer, P_LOW, P_MID, P_HIGH, type Script, type W } from './helpers';
import { SCRIPTS } from './registry';

// The five companion routes. Whichever spirit you befriend first is the only
// one you will ever have; the others politely stay where they are.

type Dir = 'up' | 'down' | 'left' | 'right';

// ================================================================== the farm (Hauntcorn)

const FARMER = 'FARMER HOLT';

const FARM: Record<string, Script> = {
  async farm_gate(w) {
    w.faceTo('farmer', 'player');
    await w.emote('farmer', 'anger');
    if (!routesOpen(w.state)) {
      await w.say("Farm's closed, stranger. Mayor's missing, cows are moody and the corn's been whispering. No visitors.", FARMER, { pitch: P_LOW });
      w.set('farm_turned_away');
      await w.move('player', ['down']);
      return;
    }
    // only "you again" if he really has turned you away before
    if (isSet(w.state, 'farm_turned_away')) await w.say("You again? Look, I've got too much work and not enough hands.", FARMER, { pitch: P_LOW });
    else await w.say("A stranger, on my farm? Look, I've got too much work and not enough hands.", FARMER, { pitch: P_LOW });
    await w.say("You want to stand on my farm? Then make yourself useful. Come find me by the barn.", FARMER, { pitch: P_LOW });
    w.set('farm_met');
    w.set('farm_task1');
    await w.move('farmer', ['up', 'up', 'up', 'up'], 160);
  },
  async farmer(w) {
    return FARM.farm_gate(w);
  },
  async farmer_in(w) {
    const f = (k: string) => isSet(w.state, k);
    if (f('farm_told')) {
      if (w.state.creature === 'hauntcorn') {
        await w.emote('farmer_in', '!');
        await w.say("My scarecrow! It's... it's walking. Behind you. Looking at me.", FARMER, { pitch: P_LOW });
        await w.say('...Keep it. Please. I mean that kindly. Mostly.', FARMER, { pitch: P_LOW });
      } else if (w.state.creature) await w.say("That scarecrow stopped moving the day that thing started following you. Good riddance, I suppose.", FARMER, { pitch: P_LOW });
      else await w.say("Well? The scarecrow's out in the corn, far corner of the field. Go deal with it.", FARMER, { pitch: P_LOW });
      return;
    }
    if (!f('farm_task1_done')) {
      if (!has(w.state, 'feed') && !f('farm_fed1') && !f('farm_fed2') && !f('farm_fed3'))
        await w.say('First job: the animals are starving. Feed is in the barn. Fill all three troughs along the pen fence.', FARMER, { pitch: P_LOW });
      else await w.say("Three troughs. All of 'em. The pig counts double but you only have to fill it once.", FARMER, { pitch: P_LOW });
      return;
    }
    if (!f('farm_task2')) {
      await w.say("Not bad. They're eating like they've never seen food. Which is a lie. I feed 'em constantly.", FARMER, { pitch: P_LOW });
      await w.say("Next problem: PUMPKIN is missing. My piglet. Squeezed out through the busted fence on the pen.", FARMER, { pitch: P_LOW });
      await w.say("Probably hiding in the corn. That field's a maze. Bring her back, would you?", FARMER, { pitch: P_LOW });
      w.set('farm_task2');
      return;
    }
    if (!f('farm_piglet_done')) {
      if (f('farm_piglet_got')) {
        await w.say('PUMPKIN! There you are, you little turnip!', FARMER, { pitch: P_LOW });
        w.sfx('oink');
        w.take('piglet');
        w.set('farm_piglet_done');
        await w.say("Last thing, I promise. Fix that fence before she does it again. Spare boards are by the barn door.", FARMER, { pitch: P_LOW });
        w.set('farm_task3');
      } else await w.say("Pumpkin's in the corn somewhere. Listen for oinking. Guilty oinking.", FARMER, { pitch: P_LOW });
      return;
    }
    if (!f('farm_fence_fixed')) {
      await w.say('The fence. East side of the pen. Boards are by the barn.', FARMER, { pitch: P_LOW });
      return;
    }
    await w.say('Alright, alright. You\'ve been helpful enough.', FARMER, { pitch: P_LOW });
    await w.say("But there's a scarecrow out in the corn. I swear I've seen it moving. I want it gone.", FARMER, { pitch: P_LOW });
    w.set('farm_told');
    w.sfx('crow');
  },
  async barn_feed(w) {
    if (isSet(w.state, 'farm_task1_done')) return w.say('A bucket of feed. The animals are full. For now.');
    if (!isSet(w.state, 'farm_task1')) return w.say('A bucket of feed. Not yours.');
    if (has(w.state, 'feed')) return w.say('You already have a bucket. You only have two hands. Arguably.');
    await w.give('feed');
  },
  async barn_sacks(w) {
    if (has(w.state, 'sandwich')) return w.say('Sacks of feed, stacked to the rafters.');
    await w.say('Behind the sacks, wrapped in waxed paper... a sandwich. An ANCIENT sandwich.');
    await w.give('sandwich');
  },
  async barn_hay(w) {
    w.sfx('moo');
    await w.say('Hay. The cow is watching you touch its hay.');
  },
  async farm_trough1(w) {
    await trough(w, 1);
  },
  async farm_trough2(w) {
    await trough(w, 2);
  },
  async farm_trough3(w) {
    await trough(w, 3);
  },
  async piglet(w) {
    w.sfx('oink');
    await w.emote('piglet', '!');
    await w.say('PUMPKIN the piglet squeals, tries to look innocent, then leaps into your arms.');
    w.set('farm_piglet_got');
    w.state.items.piglet = 1;
    w.remove('piglet');
    await w.say('She is very warm and smells like mud. Take her back to the farmer.');
  },
  async piglet_pen(w) {
    w.sfx('oink');
    await w.say('Pumpkin oinks smugly.');
  },
  async chicken1(w) {
    w.sfx('cluck');
    await w.say('BAWK.');
  },
  async chicken2(w) {
    w.sfx('cluck');
    await w.say('The chicken stares directly into your soul. It finds very little there.');
  },
  async pig1(w) {
    w.sfx('oink');
    await w.say('A big pig. It looks like it has opinions about the mayor.');
  },
  async cow(w) {
    w.sfx('moo');
    await w.say('MOOOO. (It sounds disappointed in you, specifically.)');
  },
  async farm_planks(w) {
    if (isSet(w.state, 'farm_fence_fixed')) return w.say('A small pile of leftover boards.');
    if (!isSet(w.state, 'farm_task3')) return w.say('A stack of fence boards and a jar of nails.');
    if (has(w.state, 'planks')) return w.say('You already have boards. Go fix that fence.');
    await w.give('planks');
  },
  async farm_fence(w) {
    if (isSet(w.state, 'farm_fence_fixed')) return w.say('Good as new. Better, even. You are a natural.');
    if (!has(w.state, 'planks')) return w.say('A broken section of fence. Something small and round squeezed through here.');
    w.take('planks');
    w.sfx('hammer');
    w.shake(300, 0.003);
    await w.wait(700);
    w.set('farm_fence_fixed');
    w.sfx('item');
    await w.say('BANG. BANG. BANG. The fence is fixed! Go tell the farmer.');
  },
  async farmwife(w) {
    await staged(
      w,
      'MAE HOLT',
      [
        ["Holt's out with the animals. He'll put you to work if you let him. He'll put you to work if you DON'T let him."],
        ['The scarecrow? Oh, it moves. It has always moved. Holt just noticed this year.'],
        ['You want some pie? It is pumpkin. Please do not tell the scarecrow.'],
      ],
      P_MID
    );
  },
  async farm_photo(w) {
    await w.say('A photo of the farmer and his wife, and behind them, in the field, a scarecrow. It is waving.');
  },
  async farm_fridge(w) {
    await w.say('Milk, eggs, and a jar labeled "SCARECROW REPELLENT". It is just more milk.');
  },
  async farm_stove(w) {
    await w.say('A pumpkin pie cooling on the stove. It smells incredible. You feel watched.');
  },
  async hauntcorn_field(w) {
    if (!canRecruit(w.state, 'hauntcorn')) return w.say('A weathered scarecrow. It does not move.');
    w.setDark(0.7, 900);
    w.sfx('crow');
    await w.say('A scarecrow stands alone among the dead corn. Fog curls around its straw ankles.');
    await w.say('Its pumpkin head is turned toward you.');
    await w.wait(500);
    await w.say('...It was not facing you a moment ago.');
    await w.camPan(27, 33, 600, 3);
    w.sfx('ghost');
    w.flash(0.6);
    await w.wait(300);
    await w.say('The carved eyes light up from the inside, warm as a candle.');
    await w.say('Straw arms creak. Slowly, impossibly... it waves at you.');
    await w.camReturn(500);
    w.setDark(w.map.dark, 600);
    const ok = await offer(w, 'hauntcorn', 'HAUNTCORN wants to come with you. It has been standing in this field for a very long time.');
    if (ok) w.remove('hauntcorn_field');
  },
  async scarecrow_still(w) {
    await w.say(isSet(w.state, 'farm_told') ? 'Just a scarecrow. Isn\'t it?' : 'A weathered scarecrow, guarding nothing. Its pumpkin head sags.');
  },
};

async function trough(w: W, n: number) {
  const k = `farm_fed${n}`;
  if (isSet(w.state, k)) return w.say('The trough is full. Something is happily snorting into it.');
  if (!has(w.state, 'feed')) return w.say('An empty trough. The animals look at it, then at you, then at it.');
  w.set(k);
  w.sfx(n === 2 ? 'oink' : 'cluck');
  await w.say('You pour the feed into the trough. The animals stampede over.');
  if (isSet(w.state, 'farm_fed1') && isSet(w.state, 'farm_fed2') && isSet(w.state, 'farm_fed3')) {
    w.take('feed');
    w.set('farm_task1_done');
    w.sfx('item');
    await w.say('All three troughs are full! Go tell the farmer.');
  }
}

// ================================================================== the mansion (Booheet)

const MANSION: Record<string, Script> = {
  async father(w) {
    if (w.state.creature === 'booheet') {
      await w.emote('father', '!');
      await w.say('Is... is that a bedsheet? With little feet?', 'FATHER', { pitch: P_LOW });
      await w.wait(600);
      await w.say('...It has his eyes.', 'FATHER', { pitch: P_LOW });
      await w.say('Go on, son. Go have your adventure. Be home for dinner. Any dinner. Take your time.', 'FATHER', { pitch: P_LOW });
      return;
    }
    if (!routesOpen(w.state)) {
      await w.say("Don't go near that house. Nobody goes near that house.", 'FATHER', { pitch: P_LOW });
      return;
    }
    await w.say('My son went inside that mansion...', 'FATHER', { pitch: P_LOW });
    await w.wait(400);
    await w.say('That was 30 years ago.', 'FATHER', { pitch: P_LOW });
    await w.wait(400);
    await w.say("He still hasn't come out.", 'FATHER', { pitch: P_LOW });
    if (!isSet(w.state, 'father_met')) {
      w.set('father_met');
      await w.say('He had his favorite bedsheet over his head. He loved playing ghost.', 'FATHER', { pitch: P_LOW });
      await w.say("If you go in there... tell him dinner's getting cold. It has been getting cold for thirty years.", 'FATHER', { pitch: P_LOW });
    }
  },
  async mansion_enter(w) {
    w.sfx('slam');
    w.shake(300, 0.008);
    await w.wait(300);
    await w.say('BANG. The door slams shut behind you.');
    await w.say('...It opens again when you push it. Rude.');
  },
  async mansion_shelf(w) {
    if (!has(w.state, 'book')) {
      await w.say('One book is missing from this shelf. The gap is the exact shape of... a book.');
      await w.say('Gold letters on the empty spine-plate read: VOL. 2.');
      return;
    }
    await w.say('You slide HOW TO HIDE THINGS VOL. 2 into the gap. It fits perfectly.');
    w.take('book');
    w.sfx('unlock');
    await w.wait(300);
    w.sfx('slam');
    w.shake(600, 0.006);
    const shelf = w.prop('p_shelf_gap');
    if (shelf) await w.tw({ targets: shelf, x: shelf.x + 16, duration: 900, ease: 'Sine.easeInOut' });
    w.set('shelf_moved');
    await w.say('Click. A grinding of stone. The shelf slides aside to reveal a narrow doorway!');
  },
  async mansion_books(w) {
    const n = (Number(w.flag('mansion_books_n')) || 0) + 1;
    w.set('mansion_books_n', n);
    const lines = [
      "Every book on this shelf is titled DON'T LOOK BEHIND YOU.",
      'You look behind you. Nothing. Probably.',
      'A book titled HOW TO HIDE THINGS VOL. 1. It is hollow. Empty. It tells you nothing. Classic volume one.',
      'MANNERS FOR THE RECENTLY DECEASED. Dog-eared to the chapter on knocking.',
    ];
    await w.say(lines[(n - 1) % lines.length]);
  },
  async mansion_piano(w) {
    await w.say('A grand piano under a sheet of dust. One key is perfectly clean.');
  },
  async mansion_piano_ghost(w) {
    w.sfx('piano');
    await w.wait(900);
    await w.say('...The piano just played three notes. By itself.');
  },
  async mansion_painting2(w) {
    const n = (Number(w.flag('painting_n')) || 0) + 1;
    w.set('painting_n', n);
    const lines = ['A stern old man in a high collar. His eyes seem to follow you.', '...He is smiling now. He was not smiling before.', 'The painting is empty. Just the chair.', 'He is back. He looks a little embarrassed.'];
    await w.say(lines[Math.min(n, 4) - 1]);
  },
  async mansion_painting3(w) {
    await w.say('A painting of this very mansion. In one window, very small, a white shape waves.');
  },
  async mansion_armor(w) {
    await w.say('A suit of armor. It is holding its breath.');
  },
  async mansion_pot(w) {
    await w.say("Soup. It has been simmering for thirty years. It smells... fine, actually. Great, even.");
  },
  async mansion_stove(w) {
    await w.say('The stove is cold. The soup is hot. Do not think about it.');
  },
  async mansion_sink(w) {
    await w.say('The tap drips. Each drop lands a little louder than the last.');
  },
  async mansion_fridge(w) {
    await w.say('A single egg, sitting in the middle of the shelf. It is warm.');
  },
  async mansion_note(w) {
    await w.say('Tucked between two crates, a note in neat handwriting:');
    await w.say("\"Master. As you asked, the bedroom key rests in the hidden room. The shelf opens only when the library is whole. -The Butler\"");
    await w.say('P.S. "The young master borrowed a book again. Check the nursery."');
    w.set('read_note');
  },
  async mansion_fire(w) {
    await w.say('The fireplace is cold. The ashes are warm.');
  },
  async mansion_dining_chill(w) {
    w.sfx('ghost');
    await w.say('The temperature drops. Every chair at the dining table is turned to face you.');
  },
  async mansion_hall_ghost(w) {
    const g = w.spawn('hall_ghost', 'ghost', 1, 8, 'right');
    g.sprite.setAlpha(0.7);
    w.sfx('ghost');
    await w.move('hall_ghost', ['right', 'right', 'right', 'right', 'right', 'right'], 260);
    await w.tw({ targets: g.sprite, alpha: 0, duration: 500 });
    w.remove('hall_ghost');
    await w.say('...Something tall just walked through the hallway. It did not look at you. You are grateful.');
  },
  async master_door(w) {
    if (!has(w.state, 'mansion_key')) {
      w.sfx('locked');
      await w.say('Locked tight. A skull is carved into the door.');
      await w.say('From the other side, very faintly, someone is humming a lullaby.');
      return;
    }
    w.sfx('unlock');
    w.take('mansion_key');
    w.set('bedroom_open');
    await w.say('The heavy key turns. The humming stops.');
  },
  async master_enter(w) {
    if (!canRecruit(w.state, 'booheet') || isSet(w.state, 'booheet_seen')) return;
    w.set('booheet_seen');
    w.setDark(0.9, 600);
    w.extraLights.push({ x: 20 * 16 + 8, y: 3 * 16, r: 22 });
    await w.wait(600);
    await w.say('A huge four-poster bed. On it, a small lump under a white sheet.');
    await w.say('The lump is breathing. In. Out. In.');
    await w.wait(500);
    w.sfx('ghost');
    await w.emote('booheet_bed', '...');
    await w.say('Two glowing eyes open under the sheet. They blink. Slowly.');
    await w.say('...boo?');
    w.extraLights.length = 0;
    w.setDark(w.map.dark, 500);
  },
  async booheet_bed(w) {
    if (!canRecruit(w.state, 'booheet')) return w.say('An empty bed. The sheet is gone.');
    if (!isSet(w.state, 'booheet_seen')) await MANSION.master_enter(w);
    const ok = await offer(w, 'booheet', 'BOOHEET peeks out from under its sheet. Tiny feet wiggle. It has been hiding here a very long time.');
    if (ok) w.remove('booheet_bed');
  },
  async master_bed(w) {
    await w.say(w.state.creature === 'booheet' ? 'The bed is empty now. Just a dent where something small used to sleep.' : 'A grand bed. The pillow is warm.');
  },
  async master_cabinet(w) {
    await w.say('Children\'s drawings, hundreds of them. All of the same thing: a little ghost holding hands with a man.');
  },
  async storage_box(w) {
    await w.say('Boxes of old toys and older dust.');
  },
  async storage_sack(w) {
    if (has(w.state, 'doll')) return w.say('A sack of moth-eaten costumes.');
    await w.say('A sack of moth-eaten costumes. At the bottom, a tiny doll.');
    await w.give('doll');
  },
  async storage_bucket(w) {
    await w.say('A bucket of water. Your reflection is wearing a different face. You decide not to look again.');
  },
  async bedA_bed(w) {
    await w.say('A guest bed, neatly made, with a chocolate on the pillow. It is thirty years old.');
  },
  async bedA_wardrobe(w) {
    await w.say('An empty wardrobe. It smells like someone only just left it.');
  },
  async bedB_bed(w) {
    await w.say('A dusty bed. Something has been sleeping on top of the covers. Something very light.');
  },
  async bedB_wardrobe(w) {
    await w.say('Moth-eaten coats. A tag on one reads: DAD.');
  },
  async nursery_toys(w) {
    await w.say('Wooden blocks on the floor. They spell B - O - O.');
  },
  async nursery_bed(w) {
    await w.say("A child's bed. The sheet is missing.");
  },
  async nursery_box(w) {
    if (has(w.state, 'book') || isSet(w.state, 'shelf_moved')) return w.say('A toy chest full of stuffed animals. They seem relieved.');
    await w.say('A toy chest. Under a pile of stuffed animals...');
    await w.give('book');
    await w.say('The library downstairs had a gap exactly this size.');
  },
  async secret_pedestal(w) {
    if (isSet(w.state, 'mansion_key_got')) return w.say('An empty velvet cushion.');
    await w.say('On a velvet cushion, a heavy iron key. A tag reads: MASTER BEDROOM.');
    w.set('mansion_key_got');
    await w.give('mansion_key');
  },
  async secret_portrait(w) {
    await w.say('A family portrait: a father, a mother, and a small boy with a bedsheet over his head.');
  },
  async secret_portrait2(w) {
    await w.say('The plaque reads: PAINTED THIRTY YEARS AGO, THE NIGHT BEFORE OUR BOY WENT TO PLAY.');
  },
};

// ================================================================== the park + cave (Shipwraith)

const CAVE: Record<string, Script> = {
  async kid1(w) {
    if (!routesOpen(w.state)) return w.say("My mom says the cave is off-limits. The mayor put tape on it and everything.", 'LUCY', { pitch: P_HIGH });
    if (w.state.creature === 'shipwraith') return w.say('THE SHIP! YOU FOUND THE SHIP! I TOLD THEM! I TOLD EVERYONE!', 'LUCY', { pitch: P_HIGH });
    await w.say('I SWEAR I SAW IT!', 'LUCY', { pitch: P_HIGH });
    await w.say("There's literally a ship in that cave!", 'LUCY', { pitch: P_HIGH });
  },
  async kid2(w) {
    if (!routesOpen(w.state)) return w.say('We play pirates every day. Ghost pirates. The best kind.', 'MILO', { pitch: P_HIGH });
    await w.say("My mom says I'm making it up.", 'MILO', { pitch: P_HIGH });
    await w.say("I'm not. It had little windows and they GLOWED.", 'MILO', { pitch: P_HIGH });
  },
  async kid3(w) {
    if (!routesOpen(w.state)) return w.say("Grown-ups never believe anything good.", 'PIP', { pitch: P_HIGH });
    await w.say("It's all the way at the bottom. You have to go really far inside!", 'PIP', { pitch: P_HIGH });
    await w.say('Bring a light. It eats light down there. And sandwiches. I lost a sandwich.', 'PIP', { pitch: P_HIGH });
  },
  async enter_cave(w) {
    if (isSet(w.state, 'cave_visited')) return;
    w.set('cave_visited');
    await w.wait(300);
    await w.say('Your lantern barely reaches past your own feet.');
    w.sfx('creak');
    await w.say('Somewhere far below, water drips... and something groans like an old wooden hull.');
  },
  async cave_deep(w) {
    if (isSet(w.state, 'cave_deep_heard')) return;
    w.set('cave_deep_heard');
    w.sfx('creak');
    w.shake(400, 0.002);
    await w.say('The groaning is very close now. Timber against stone. Something is down here.');
  },
  async shipwraith_cave(w) {
    if (!canRecruit(w.state, 'shipwraith')) return;
    w.shake(900, 0.004);
    w.sfx('creak');
    await w.say('In a pool of black water rests a tiny sunken ship, no bigger than a dog.');
    await w.say('Its sail has a face. The face is looking at you.');
    w.extraLights.push({ x: w.actor('shipwraith_cave')!.sprite.x, y: w.actor('shipwraith_cave')!.sprite.y - 20, r: 60 });
    w.sfx('ghost');
    await w.wait(400);
    await w.say('One by one, its portholes light up.');
    w.sfx('cannon');
    w.flash(0.8);
    w.shake(300, 0.01);
    await w.wait(500);
    await w.say('BOOM! It fires its tiny cannon at the ceiling. A salute?');
    w.extraLights.length = 0;
    const ok = await offer(w, 'shipwraith', 'SHIPWRAITH bobs closer, creaking hopefully. It has not had a crew in a hundred years.');
    if (ok) {
      w.remove('shipwraith_cave');
      await w.say('A breeze stirs. Nearby, a crack of daylight leads up to the park.');
    }
  },
  async cave_wreck(w) {
    await w.say('The pool where the little ship used to rest. A few planks drift in circles.');
  },
  async cave_shipwreck(w) {
    await w.say('Old timber, half-buried in the rock. Carved into it: S.S. NEVERMORE.');
  },
};

// ================================================================== the grocery store (Umbrawl)

const STORE: Record<string, Script> = {
  async enter_store(w) {
    if (!routesOpen(w.state) || w.state.creature !== null || isSet(w.state, 'store_scene')) return;
    // chaos: everyone runs for the door
    const crowd: [string, string, number, number][] = [
      ['e1', 'old_lady', 4, 5],
      ['e2', 'man_hat', 12, 8],
      ['e3', 'clerk', 13, 9],
      ['e4', 'kid_boy', 7, 8],
      ['e5', 'woman', 15, 4],
    ];
    for (const [id, spr, x, y] of crowd) w.spawn(id, spr, x, y, 'down');
    await w.wait(500);
    w.sfx('chime');
    await w.wait(900);
    await w.say('ATTENTION CUSTOMERS.', 'SPEAKERS', { pitch: 300 });
    await w.say('THERE IS A CRAZY UMBRELLA ON THE LOOSE.', 'SPEAKERS', { pitch: 300 });
    await w.say('PLEASE EVACUATE THE BUILDING IMMEDIATELY.', 'SPEAKERS', { pitch: 300 });
    for (const [id] of crowd) w.emote(id, '!', 500);
    w.sfx('scream');
    await w.wait(400);
    const out = async (id: string, path: Dir[]) => {
      await w.move(id, path, 90);
      w.sfx('door');
      w.remove(id);
    };
    const exits = (x: number, y: number): Dir[] => {
      const p: Dir[] = [];
      while (y < 13) {
        p.push('down');
        y++;
      }
      while (x > 9) {
        p.push('left');
        x--;
      }
      while (x < 9) {
        p.push('right');
        x++;
      }
      return p;
    };
    w.say('NOT AGAIN!', 'CLERK', { pitch: P_HIGH }).then(() => w.dialog.hide());
    await Promise.all([out('e3', ['down', 'down', 'down', 'down', 'left', 'left', 'left', 'left']), out('e2', ['up', 'left', 'left', 'down', 'down', 'down', 'down', 'down', 'left'])]);
    await w.say('MY GROCERIES!', 'SHOPPER', { pitch: P_LOW });
    await Promise.all([out('e1', ['down', 'down', 'right', 'right', 'down', 'down', 'down', 'down', 'right', 'right', 'right', 'down', 'down']), out('e4', ['right', 'right', ...exits(9, 8)]), out('e5', ['down', 'down', 'left', ...exits(14, 6)])]);
    await w.wait(700);
    await w.say('...The store is empty. Somewhere, a shopping cart rolls along by itself.');
    // there he is
    const u = w.spawn('umbrawl_run', 'cr_umbrawl', 15, 7, 'left');
    u.sprite.setAlpha(0);
    await w.tw({ targets: u.sprite, alpha: 1, duration: 300 });
    w.sfx('swish');
    await w.emote('umbrawl_run', '!');
    await w.say('At the end of the aisle: an umbrella. Floating. With two fists. Shadowboxing.');
    await w.say('It sees you. It freezes.');
    w.sfx('spin');
    await w.move('umbrawl_run', ['up', 'up', 'right', 'right', 'right', 'right', 'right', 'down', 'down', 'down', 'down'], 70);
    w.sfx('slam');
    w.remove('umbrawl_run');
    await w.wait(200);
    w.sfx('locked');
    await w.say('SLAM. Click. It locked itself in the staff closet.');
    w.set('store_scene');
    w.set('umbrawl_fled');
  },
  async closet_door(w) {
    if (!isSet(w.state, 'umbrawl_fled')) return w.say('STAFF ONLY. The door is locked.');
    if (!has(w.state, 'closet_key')) {
      w.sfx('swish');
      await w.say('Locked from the inside. You hear muffled FWUMP noises. Like an umbrella punching a mop.');
      await w.say('A note is taped to the door: "SPARE KEY IN THE MEN\'S ROOM. DON\'T ASK. -MGMT"');
      return;
    }
    w.sfx('unlock');
    w.take('closet_key');
    w.set('closet_open');
    await w.say('The key turns. The FWUMPing stops.');
  },
  async umbrawl_closet(w) {
    if (!canRecruit(w.state, 'umbrawl')) return;
    await w.emote('umbrawl_closet', 'anger');
    w.sfx('swish');
    w.shake(200, 0.004);
    await w.say('UMBRAWL snaps open its canopy and raises both fists. It throws a flurry of jabs at the air.');
    w.sfx('hit');
    await w.wait(300);
    w.sfx('hit');
    await w.say('Jab. Jab. Hook. It is very impressed with itself.');
    await w.emote('umbrawl_closet', '...');
    await w.say('Then it notices you are not running away. It lowers its fists. It offers one of them for a bump.');
    const ok = await offer(w, 'umbrawl', 'UMBRAWL wants to come with you. It is looking for someone to follow, and someone to punch.');
    if (ok) w.remove('umbrawl_closet');
  },
  async wc_toilet1(w) {
    await w.say('Just a toilet. You check anyway. Nothing. You feel worse about yourself.');
  },
  async wc_toilet2(w) {
    if (has(w.state, 'closet_key') || isSet(w.state, 'closet_open') || !isSet(w.state, 'umbrawl_fled')) return w.say('A toilet. Spotless. Suspiciously spotless.');
    await w.say('Something glints at the bottom of the bowl.');
    if (!(await w.confirm('Reach in?'))) return w.say('You stare at the glint. The glint stares back.');
    w.sfx('flush');
    await w.wait(800);
    await w.say('...You reach in. You regret everything. But you got a key!');
    await w.give('closet_key');
  },
  async wc_toilet3(w) {
    await w.say('A sign on this one: OUT OF ORDER SINCE 1974. Something inside gurgles politely.');
  },
  async wc_sink(w) {
    await w.say(has(w.state, 'closet_key') ? 'You wash your hands for a very, very long time.' : 'You wash your hands. Thoroughly. Twice. For no reason at all.');
  },
  async store_aisle(w) {
    const lines = ['CANNED SOUP. CANNED BREAD. CANNED CANS.', 'CEREAL: "BRAN FLAKES (NOW WITH BRAN)".', 'A whole shelf of candles. All of them are already lit.', 'DOG BISCUITS. A shelf label: "THE MAYOR\'S FAVORITE". Huh.'];
    await w.say(lines[Math.floor(Math.random() * lines.length)]);
  },
  async store_fridge(w) {
    await w.say('Milk. Cheese. A single wet umbrella-shaped dent in the frozen peas.');
  },
  async closet_shelf(w) {
    await w.say('Mops, buckets, and a small nest of torn umbrella covers. Somebody has been living in here.');
  },
  async clerk(w) {
    if (isSet(w.state, 'bait_asked') && !isSet(w.state, 'bait_cellar') && !has(w.state, 'bait')) {
      await w.say("Bait? Sorry, we're completely out of bait.", 'CLERK', { pitch: P_HIGH });
      await w.say("We don't get another shipment until next week.", 'CLERK', { pitch: P_HIGH });
      await w.say('...There might still be some old bait in the cellar. Nobody has been down there in years.', 'CLERK', { pitch: P_MID });
      await w.say("If you're feeling adventurous, you can check downstairs. Door's in the back, past the restrooms.", 'CLERK', { pitch: P_MID });
      w.set('bait_cellar');
      w.sfx('unlock');
      await w.say("There. Unlocked. If you see Gary down there, tell him he's fired.", 'CLERK', { pitch: P_MID });
      return;
    }
    if (isSet(w.state, 'bait_cellar') && !has(w.state, 'bait') && !isSet(w.state, 'bait_delivered')) return w.say("The cellar's through the back. Watch your step. And your nose.", 'CLERK', { pitch: P_MID });
    await staged(
      w,
      'CLERK',
      [
        null,
        null,
        ['We reopened! The umbrella is gone! Someone said it went to live a better life.', "Oh. Is that it behind you? ...We never saw anything."],
        ['Can I help you find anything? Anything except bait. We never have bait.'],
      ],
      P_HIGH
    );
  },
  async shopper1(w) {
    await w.say("I came back for my groceries. The umbrella ate my cabbage. Spiritually.", 'SHOPPER', { pitch: P_HIGH });
  },
  async shopper2(w) {
    await w.say('Twelve years I have shopped here. Never once seen a sale. Never once seen a wet floor sign. Just wet floors.', 'SHOPPER', { pitch: P_LOW });
  },
};

// ================================================================== the psychic (Tickraith)

const PSY = 'MADAME ORACLE';

async function quiz(w: W): Promise<boolean> {
  const qs: [string, string[], number][] = [
    ['QUESTION ONE: What does a witch traditionally brew her potions in?', ['A MICROWAVE', 'A CAULDRON', 'A BATHTUB'], 1],
    ['QUESTION TWO: Which object is famously used to see the future?', ['A CRYSTAL BALL', 'A FOOTBALL', 'A TELEVISION'], 0],
    ['QUESTION THREE: And what does a witch fly across the full moon?', ['A SHOPPING CART', 'A BICYCLE', 'A BROOMSTICK'], 2],
  ];
  for (const [q, opts, right] of qs) {
    w.sfx('crystal');
    const a = await w.ask(q, opts, PSY, { pitch: P_MID });
    if (a !== right) {
      w.sfx('wrong');
      w.shake(300, 0.006);
      await w.say('WRONG.', PSY, { pitch: P_LOW });
      await w.say(opts[a] + '?! In MY house? Buzz off! Out! Come back when you have a brain!', PSY, { pitch: P_HIGH });
      return false;
    }
    w.sfx('right');
    await w.say(['Correct.', 'Correct again. Hm.', 'CORRECT!'][qs.findIndex((x) => x[0] === q)], PSY, { pitch: P_MID });
  }
  return true;
}

const PSYCHIC: Record<string, Script> = {
  async enter_psychic(w) {
    const st = w.state;
    if (st.creature !== null || isSet(st, 'quiz_passed')) return;
    if (isSet(st, 'psychic_scene')) {
      await w.wait(300);
      await w.say('Back for another try? Fine. Same rules. Same prize. Same grumpy clock.', PSY, { pitch: P_MID });
      return PSYCHIC.run_quiz(w);
    }
    // an argument already in progress
    w.face('psychic', 'right');
    await w.wait(500);
    await w.say('A PROMOTION?! You\'ve been sitting in that corner telling people what time it is!', PSY, { pitch: P_HIGH });
    w.sfx('tickclock');
    await w.emote('tickraith_corner', 'anger');
    await w.say("Oh, don't give me that look.", PSY, { pitch: P_MID });
    w.sfx('tickclock');
    await w.wait(200);
    w.sfx('tickclock');
    await w.emote('tickraith_corner', 'tick');
    await w.say('BENEFITS? You are a CLOCK. Your benefit is being WOUND.', PSY, { pitch: P_HIGH });
    w.shake(200, 0.004);
    w.sfx('bell_dud');
    await w.emote('tickraith_corner', 'anger');
    await w.say("Dental?! You don't have teeth! You have GEARS!", PSY, { pitch: P_HIGH });
    w.sfx('tickclock');
    await w.emote('tickraith_corner', '...');
    await w.say("You know what? I'VE HAD ENOUGH.", PSY, { pitch: P_LOW });
    await w.say("I'm giving you away to the next person who walks through that door!", PSY, { pitch: P_HIGH });
    await w.wait(400);
    w.face('psychic', 'down');
    await w.emote('psychic', '!');
    w.sfx('tickclock');
    await w.emote('tickraith_corner', '!');
    await w.say('OH!', PSY, { pitch: P_HIGH });
    await w.say('YOU!', PSY, { pitch: P_HIGH });
    await w.say("You're the lucky guest!", PSY, { pitch: P_HIGH });
    await w.say('I have a very special prize for you today. A genuine haunted grandfather clock. Slightly used. Extremely opinionated.', PSY, { pitch: P_MID });
    await w.say('But first! Three questions. Answer them all correctly and the prize is yours. Get even one wrong and you\'re OUT.', PSY, { pitch: P_MID });
    w.set('psychic_scene');
    await PSYCHIC.run_quiz(w);
  },
  async run_quiz(w) {
    const ok = await quiz(w);
    if (!ok) {
      await w.warp('town', 24, 18, 'down');
      await w.say('...You have been thrown out of the psychic\'s house. The door locks behind you, then unlocks again. Petty.');
      return;
    }
    w.set('quiz_passed');
    await w.say("Well, well. Somebody paid attention in witch school.", PSY, { pitch: P_MID });
    await w.say("Before I hand him over, I need a replacement. I can't run a fortune business without knowing the time.", PSY, { pitch: P_MID });
    await w.say('Bring me a clock. Any clock. Ugly is fine. Ugly is honestly preferred.', PSY, { pitch: P_MID });
    w.sfx('tickclock');
    await w.emote('tickraith_corner', 'tick');
    w.set('need_clock');
  },
  async psychic(w) {
    const st = w.state;
    // the clock trade
    if (isSet(st, 'need_clock') && !isSet(st, 'clock_delivered') && st.creature === null) {
      if (!has(st, 'ugly_clock')) return w.say('A clock. Any clock. Gerald down the road has one so ugly it gives ME bad feelings.', PSY, { pitch: P_MID });
      await w.say('Let me see it.', PSY, { pitch: P_MID });
      w.take('ugly_clock');
      await w.wait(500);
      await w.say('Ugh. It\'s hideous. It\'s PERFECT.', PSY, { pitch: P_HIGH });
      w.set('clock_delivered');
      w.refresh();
      w.sfx('tickclock');
      await w.say("Alright, you. Off you go. Be somebody else's problem. And don't send me letters.", PSY, { pitch: P_LOW });
      w.spawn('tick_walk', 'cr_tickraith', 11, 4, 'left');
      await w.emote('tick_walk', 'tick');
      const ok = await offer(w, 'tickraith', 'TICKRAITH clicks its hands backward with great dignity. It has decided you are its new employer.');
      w.remove('tick_walk');
      if (ok) {
        w.set('tick_given');
        await w.say('...Good riddance. I will miss him. Tell nobody.', PSY, { pitch: P_LOW });
      } else {
        w.set('clock_delivered', false);
        w.state.items.ugly_clock = 1;
        w.refresh();
        await w.say('No? Fine. He stays. He sulks. I suffer. Take your ugly clock back.', PSY, { pitch: P_MID });
      }
      return;
    }
    if (st.creature !== null && !isSet(st, 'vision_done')) return SCRIPTS.vision(w);
    if (isSet(st, 'vision_done')) {
      await staged(
        w,
        PSY,
        [null, null, null, ['A ship. You need a ship. I am not a travel agent.', 'You still owe me five hundred dollars, by the way.'], ['Did you just ring that bell? I felt that in my teeth.'], ['A dog. A DOG. Running the town. And you all think *I* am the strange one.']],
        P_MID
      );
      return;
    }
    await w.say('The spirits are quiet today. Come back when you have something interesting. Or a credit card.', PSY, { pitch: P_MID });
  },
  async tickraith_corner(w) {
    w.sfx('tickclock');
    if (w.state.creature && w.state.creature !== 'tickraith') {
      await w.emote('tickraith_corner', '...');
      return w.say('A grandfather clock in the corner, ticking sullenly. It glances at your companion. It sighs. Clocks can sigh.');
    }
    await w.emote('tickraith_corner', 'tick');
    await w.say('A grandfather clock with furious little eyes. Its hands are spinning backward in protest.');
  },
  async old_clock(w) {
    await w.say('The hideous clock, proudly displayed on a stool. It is somehow worse in here.');
  },
  async psychic_ball(w) {
    await w.say('A crystal ball. Deep inside, mist swirls. Then it shows you a picture of yourself looking into a crystal ball.');
  },
  async psychic_cauldron(w) {
    await w.say('A bubbling cauldron. It smells like lavender and burnt toast. Mostly toast.');
  },
  async psychic_books(w) {
    await w.say('FORTUNES FOR FOOLS. FORTUNES FOR FOOLS VOL. 2. HOW TO SPEND FIVE HUNDRED DOLLARS.');
  },
  async psychic_crystal(w) {
    w.sfx('crystal');
    await w.say('A crystal hums when you get close. It sounds a little like a ticking clock.');
  },
  async gerald(w) {
    const st = w.state;
    if (isSet(st, 'clock_got')) return w.say('My house feels so much less judgmental now. Thank you, stranger.', 'GERALD', { pitch: P_LOW });
    if (isSet(st, 'need_clock') && st.creature === null) {
      await w.say('Man, this clock is hideous.', 'GERALD', { pitch: P_LOW });
      await w.say("I got it as a gift, but honestly, I don't even want it anymore.", 'GERALD', { pitch: P_LOW });
      await w.say('Here. You can have it.', 'GERALD', { pitch: P_LOW });
      w.set('clock_got');
      w.refresh();
      await w.give('ugly_clock');
      await w.say("Don't bring it back. It knows the way.", 'GERALD', { pitch: P_LOW });
      return;
    }
    await staged(
      w,
      'GERALD',
      [
        ['See that clock? My aunt gave it to me. It is the ugliest thing ever built. I cannot throw it away. It might come back.'],
        null,
        null,
        ['The mayor is a WHAT? ...That explains why he never shook hands. He only ever shook paws.'],
      ],
      P_LOW
    );
  },
  async gerald_clock(w) {
    await w.say('The most hideous clock you have ever seen. It has googly eyes. It is looking at you.');
  },
  async gerald_wallclock(w) {
    await w.say('A second clock, hiding from the first one.');
  },
  async gerald_poster(w) {
    await w.say('A poster: TIME FLIES. Below it, in pen: "NOT IN THIS HOUSE IT DOESN\'T".');
  },
  async gerald_tv(w) {
    await w.say('The TV shows static. In the static, if you squint, a ship.');
  },
};

export const ROUTE_SCRIPTS: Record<string, Script> = { ...FARM, ...MANSION, ...CAVE, ...STORE, ...PSYCHIC };

void P_HIGH;
