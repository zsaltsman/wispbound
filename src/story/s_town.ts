import { isSet, has, routesOpen } from './state';
import { staged, P_LOW, P_MID, P_HIGH, type Script, type Gate } from './helpers';
import { SCRIPTS } from './registry';
import { camPx, titleCard } from './w2_fx';

// The town square, the townsfolk, the well and the Mayor's Office.

// ================================================================== gates

export const GATES: Record<string, Gate> = {
  async office_door(w) {
    if (isSet(w.state, 'office_open')) return true;
    if (has(w.state, 'office_key')) {
      w.sfx('unlock');
      await w.say('You fit the brass key from the well into the lock. It turns with a heavy CLUNK.');
      w.take('office_key');
      w.set('office_open');
      return true;
    }
    w.sfx('locked');
    await w.say("Locked. A brass plate reads: MAYOR'S OFFICE. HOURS: WHENEVER HE FEELS LIKE IT.");
    if (!isSet(w.state, 'office_tried')) {
      w.set('office_tried');
      await w.say('There is no other way in. Somebody must have a key... or have lost one.');
    }
    return false;
  },
  async psychic_door(w) {
    if (!routesOpen(w.state)) {
      w.sfx('locked');
      await w.say('A card in the window: MADAME ORACLE IS NOT RECEIVING VISITORS. (SHE KNEW YOU WOULD KNOCK.)');
      return false;
    }
    if (w.state.creature) return true;
    // the only door in town that asks first
    w.sfx('heartbeat');
    const before = w.darkAlpha;
    w.setDark(0.85, 600);
    await w.wait(700);
    w.sfx('crystal');
    const ok = (await w.ask('...Are you sure you want to enter?', ['ENTER', 'STEP BACK'], undefined, { cancel: 1, pitch: 400 })) === 0;
    w.setDark(before, 400);
    await w.wait(300);
    return ok;
  },
  async mansion_door(w) {
    if (routesOpen(w.state)) return true;
    w.sfx('locked');
    await w.say("The door won't budge. Something on the other side is leaning against it.");
    return false;
  },
  async store_door(w) {
    if (routesOpen(w.state)) return true;
    w.sfx('locked');
    await w.say('A sign: CLOSED FOR INVENTORY. BACK IN 5 MINUTES. The sign is very, very old.');
    return false;
  },
  async cave_door(w) {
    if (routesOpen(w.state)) return true;
    w.sfx('locked');
    await w.say('Police tape across the cave: KEEP OUT. BY ORDER OF THE MAYOR.');
    await w.say('Someone has added in crayon: "THERES A SHIP IN HERE".');
    return false;
  },
  async fishshop_door() {
    return true;
  },
  async secret_door(w) {
    if (isSet(w.state, 'shelf_moved')) return true;
    await w.say('Cold air seeps through a crack in the wall.');
    return false;
  },
};

// ================================================================== the opening

const SCRIPTS_INTRO: Record<string, Script> = {
  async intro(w) {
    // WORLD 1: the same title card as World 2, then a slow glide in from the sea
    w.hide('player');
    w.hide('follower');
    await camPx(w, 47 * 16 + 8, 84 * 16, 0, 2);
    w.music(null);
    w.sfx('thunder_far');
    await titleCard(w, '', 'HOLLOWHAVEN', 2800, false);
    w.music('town');
    w.sfx('crow');
    await camPx(w, 47 * 16 + 8, 44 * 16, 4200, 2);
    w.hide('player', false);
    w.hide('follower', false);
    await w.camReturn(400);
    await w.wait(900);
    w.face('player', 'left');
    await w.wait(400);
    w.face('player', 'right');
    await w.wait(400);
    w.face('player', 'up');
    await w.wait(500);
    w.face('t_greeter', 'right');
    await w.emote('t_greeter', '!');
    w.faceTo('t_greeter', 'player');
    await w.move('t_greeter', ['right']);
    w.faceTo('player', 't_greeter');
    await w.say("Oh! A stranger! In Hollowhaven? This week? You've got terrible timing.", 'SILAS', { pitch: P_MID });
    await w.say("The mayor's gone missing. Three nights now. Nobody's seen hide nor hair of him.", 'SILAS', { pitch: P_MID });
    await w.say('Hair especially. He had a lot of it.', 'SILAS', { pitch: P_MID });
    await w.say("Start at the Mayor's Office, up north past the well. Not that anyone can get in.", 'SILAS', { pitch: P_MID });
    await w.move('t_greeter', ['left']);
    w.face('t_greeter', 'right');
    w.set('intro_done');
    w.set('talked_mayor');
  },
  async t_greeter(w) {
    await staged(
      w,
      'SILAS',
      [
        ["The Mayor's Office is just north of the well. Locked tight, last I checked."],
        ['You got in? Then the assistant must have sent you somewhere strange. He does that.'],
        ['That thing behind you. Is it... friendly? Blink twice if it is not.'],
        ['A ship? To find the mayor? Ha! The only ship around here is the one in the old stories.'],
      ],
      P_MID
    );
  },
  async t_oldlady(w) {
    await staged(
      w,
      'AGATHA',
      [
        ["Have you heard? The mayor hasn't been seen in days.", 'I left a plate of sausages on his doorstep. Gone by morning. So he is alive... or something is eating well.'],
        ['The assistant came running out of the office screaming about a psychic. Poor dear.'],
        ['Oh, what a lovely little spook you have there. Does it eat sausages?'],
        ['They say ringing the old dock bell three times calls a ship out of the fog.', "My grandmother rang it once. Twice, actually. She lost her nerve."],
      ],
      P_HIGH
    );
  },
  async t_worker(w) {
    await staged(
      w,
      'BRUNO',
      [
        ["Something strange is happening around here. My tools keep moving overnight.", "Hammer's on the roof. Saw's in the well. I don't even OWN a well."],
        ["People keep talking about the cave by the park. Kids swear there's something down there."],
        ['Watch where that critter of yours floats. It nearly scared the apron off the baker.'],
        ['If you need a bell, good luck. Last bell-maker on the island retired in 1802.'],
      ],
      P_LOW
    );
  },
  async t_gossip(w) {
    await staged(
      w,
      'PRUDENCE',
      [
        ["I heard someone saw something out by the docks. A light in the fog. A sound like a horn.", 'Or a very sad goose.'],
        ["Did you hear? The assistant has been completely losing his mind. Talking to the mayor's portrait."],
        ['Madame Oracle? Oh, she tricks everyone. Last month she told me I had a great future. Nothing has happened since.'],
        ["A dog?! The MAYOR? ...Well, that explains the fire hydrant outside the office."],
      ],
      P_HIGH
    );
  },
  async t_lamplighter(w) {
    await staged(
      w,
      'OLD TOM',
      [
        ["Nobody knows where he's gone. I've lit every lamp in town twice, in case he's lost.", 'He always did like walking at night. On all fours, too. Very humble man.'],
        ["The well? Folks used to toss spare keys down there to spite each other. Who knows what's at the bottom."],
        ['That clock tower stopped the night the mayor vanished. Hasn\'t ticked since.'],
      ],
      P_LOW
    );
  },
  async t_north(w) {
    await staged(
      w,
      'IRIS',
      [
        ["I hope he's alright. This town needs him.", 'Nobody else can sniff out a bad decision like he can.'],
        ["Madame Oracle lives just west of here. The house with the moon on the roof. Don't let her sell you anything."],
        ['Gerald down the road has the ugliest clock in the world. He brags about it. Complains, I mean.'],
      ],
      P_MID
    );
  },
  async t_crowkid(w) {
    await staged(
      w,
      'TIMMY',
      [
        ['The crows know where the mayor is. They told me. I just don\'t speak crow.'],
        ['I dared my brother to go in the mansion. He said no. Smart brother.'],
        ['Whoa! Can I pet it? ...Can it pet ME?'],
      ],
      P_HIGH
    );
  },
  async t_dockhand(w) {
    await staged(
      w,
      'MARGO',
      [
        ["I heard someone saw something out by the docks. That someone was me. I saw it. It was big.", 'Big and sad and covered in chains.'],
        ['The fishing shop has been shut for days. Some fella is camped outside the door.'],
        ['Fog has been rolling in off the sea every night since the mayor vanished. Like it is waiting for something.'],
        ['The old bell at the end of the dock? Rusted solid. You would need a new one. Or something that rings.'],
      ],
      P_MID
    );
  },
  async t_fishwife(w) {
    await staged(
      w,
      'NELL',
      [
        ['Fresh fish! Well. Fish. Freshness is a state of mind.'],
        ['Fish from any shore around the island, they say. If you have a rod. Which you do not.'],
        null,
        ['The Bell Fish? Real enough. My uncle caught one. It rang for three days. He moved to the mainland.'],
      ],
      P_HIGH
    );
  },
  async sign_square(w) {
    await w.say('TOWN SQUARE. NORTH: MAYOR\'S OFFICE, RESIDENCES. EAST: MANSION (DO NOT), GROCERY. WEST: FARM, PARK. SOUTH: DOCK.');
  },
  async sign_north(w) {
    await w.say('NORTH DISTRICT. QUIET HOURS: ALL OF THEM.');
  },
  async sign_farm(w) {
    await w.say('HOLLOW ACRES FARM. TRESPASSERS WILL BE PUT TO WORK.');
  },
  async sign_park(w) {
    await w.say('WILLOW PARK. THE CAVE IS CLOSED. THE CAVE HAS ALWAYS BEEN CLOSED. STOP ASKING.');
  },
  async sign_dock(w) {
    await w.say('HOLLOWHAVEN DOCK. DO NOT RING THE BELL. (THE BELL IS BROKEN ANYWAY.)');
  },
  async clocktower(w) {
    await w.say('The town clock. Its hands stopped at a quarter past midnight and have not moved since.');
    if (w.state.creature === 'tickraith') {
      w.sfx('tickclock');
      await w.emote('follower', 'tick');
      await w.say('TICKRAITH stares up at it with something like professional pity.');
    }
  },
  async stall1(w) {
    await w.say('A fish stall. The fish have been here a while. They have seen things.');
  },
  async stall2(w) {
    await w.say('A vegetable stall. A turnip has been carved into a tiny portrait of the mayor. It looks like a dog. Weird.');
  },
  async store_crate(w) {
    await w.say('Empty crates stamped GROCERY. One is labeled DO NOT OPEN. It is empty too. Disappointing.');
  },
  async pond(w) {
    await w.say('A still, black pond. Your reflection looks back a half-second late.');
  },
  async beach_bones(w) {
    await w.say('Old fish bones, picked clean. Something big ate here. Something with very good table manners.');
  },
  async rock_coin(w) {
    if (has(w.state, 'coin')) return w.say('Just a rock, wet with sea spray.');
    await w.say('Wedged under the rock, something cold and round...');
    await w.give('coin');
  },
  async tree_crow(w) {
    w.sfx('crow');
    if (has(w.state, 'feather')) return w.say('A crow glares at you from the branches.');
    await w.say('A crow caws and takes off. It left something behind.');
    await w.give('feather');
  },
  async grave_eye(w) {
    if (has(w.state, 'glass_eye')) return w.say('HERE LIES GRIMBLE. HE SEES ALL. (HE USED TO.)');
    await w.say('HERE LIES GRIMBLE. HE SEES ALL.');
    await w.say('Something glints in the dirt at the foot of the grave.');
    await w.give('glass_eye');
  },
  async grave_joke(w) {
    await w.say('HERE LIES LESTER. HE ASKED FOR A QUIET SPOT. THIS WAS NOT IT.');
  },
  async grave_old(w) {
    await w.say('The name has worn away. Someone keeps leaving fresh dandelions here.');
  },
  async mansion_grave(w) {
    await w.say('A small grave in the mansion garden: OUR BOY. GONE BUT STILL AROUND.');
  },
  async fish_norod(w) {
    await w.say('Dark water laps at the shore. Without a rod, you can only stare at it.');
  },
};

// ================================================================== the well

const SCRIPTS_WELL: Record<string, Script> = {
  async well(w) {
    if (!isSet(w.state, 'well_glint')) {
      await w.say('An old stone well. It smells like pennies and secrets.');
      w.sfx('drip');
      await w.wait(400);
      await w.say('...Far below, something is glimmering.');
      w.set('well_glint');
    } else if (has(w.state, 'office_key') || isSet(w.state, 'office_open')) {
      await w.say('The well. Nothing glimmers down there now. Something hums instead.');
    } else await w.say('Something still glimmers at the bottom of the well.');
    if (await w.confirm('Climb down the rope?')) {
      w.sfx('ladder');
      await w.say('You grip the rope and lower yourself, hand over hand, into the dark.');
      await w.warp('well', 4, 2, 'down');
      w.sfx('drip');
    }
  },
  async enter_well(w) {
    if (isSet(w.state, 'well_visited')) return;
    w.set('well_visited');
    await w.wait(300);
    await w.say('Cold mud. Dripping stone. A circle of night sky, very far above.');
  },
  async well_key(w) {
    if (has(w.state, 'office_key') || isSet(w.state, 'office_open')) {
      await w.say('Only mud, and a strange feeling of being watched.');
      return;
    }
    await w.say('Half-buried in the mud: a heavy brass key.');
    await w.give('office_key');
    await w.say('Stamped on the handle: MAYOR. Very serious letters.');
    // something stirs in the black water
    await w.wait(300);
    w.sfx('splash');
    const eyes = w.image('em_...', 4 * 16 + 8, 5 * 16, 9999).setVisible(false);
    const l = w.image('fx_dot', 4 * 16 + 4, 5 * 16 + 6, 9999);
    const r = w.image('fx_dot', 4 * 16 + 11, 5 * 16 + 6, 9999);
    await w.wait(900);
    l.destroy();
    r.destroy();
    eyes.destroy();
    await w.say('...Two pale eyes blinked in the water. Then nothing.');
    await w.say('Time to climb back up.');
  },
  async well_scratches(w) {
    await w.say('Scratches on the wall. Someone counted days down here. A LOT of days.');
  },
  async well_scratches2(w) {
    await w.say('Carved into the stone, in small careful letters: HE WAS A GOOD BOY.');
  },
};

// ================================================================== the Mayor's Office

const SCRIPTS_OFFICE: Record<string, Script> = {
  async enter_office(w) {
    if (isSet(w.state, 'mayor_ran') && !isSet(w.state, 'ending_done')) return SCRIPTS.ending(w);
    if (isSet(w.state, 'office_scene')) return;
    // the assistant, frantically searching
    await w.wait(300);
    const run: ('left' | 'right' | 'up' | 'down')[] = ['right', 'right', 'right', 'right', 'down', 'left', 'left', 'left', 'left', 'up'];
    const scream = async (line: string) => {
      w.shake(200, 0.004);
      await w.say(line, 'ASSISTANT', { pitch: P_HIGH });
    };
    const lap = w.move('assistant', run, 140);
    await scream('WHERE IS HE?! WHERE COULD HE HAVE GONE?!');
    await lap;
    w.face('assistant', 'up');
    w.sfx('door');
    await scream('I checked the drawers! I checked under the rug! I checked INSIDE the rug!');
    await w.move('assistant', ['right', 'right', 'right'], 120);
    w.face('assistant', 'right');
    await scream('I SHOULD HAVE BEEN WATCHING HIM!');
    await w.move('assistant', ['left', 'left', 'left'], 120);
    w.face('assistant', 'down');
    await w.say("He's such a cute boy... I can't believe I've let this happen!", 'ASSISTANT', { pitch: P_HIGH });
    await w.wait(500);
    w.faceTo('assistant', 'player');
    await w.emote('assistant', '!');
    await w.say('...Oh. OH. How long have you been standing there?', 'ASSISTANT', { pitch: P_MID });
    await w.say('Wait. Did you use the spare key? From the WELL? I threw that key in the well during a very bad Tuesday.', 'ASSISTANT', { pitch: P_MID });
    await w.say('Never mind. You are here. You may as well listen.', 'ASSISTANT', { pitch: P_MID });
    await w.say('The mayor vanished three nights ago. No note. No trail. His bed was still warm. Well. Lukewarm.', 'ASSISTANT', { pitch: P_MID });
    await w.say("I've tried everything. Everything except...", 'ASSISTANT', { pitch: P_MID });
    await w.say('...the town psychic. Madame Oracle. The house with the moon on the roof, in the north district.', 'ASSISTANT', { pitch: P_LOW });
    await w.say('She might be able to help.', 'ASSISTANT', { pitch: P_LOW });
    await w.say('Just... please don\'t go there unless you\'re truly prepared.', 'ASSISTANT', { pitch: P_LOW });
    await w.say("She's not exactly the most trustworthy person. She has a habit of tricking people.", 'ASSISTANT', { pitch: P_LOW });
    await w.say('Last week she sold Gerald a haunted spoon. It was a spoon.', 'ASSISTANT', { pitch: P_MID });
    await w.say("And if you're going to go poking around this town at night... you'll want a friend. Something that goes bump. On YOUR side.", 'ASSISTANT', { pitch: P_MID });
    await w.say("Old spirits have been stirring since he vanished. At the farm. In that awful mansion. The children won't shut up about the cave in the park.", 'ASSISTANT', { pitch: P_MID });
    await w.say("And the grocery store has been... loud. Please. Find him.", 'ASSISTANT', { pitch: P_MID });
    w.set('office_scene');
    w.sfx('quest');
    await w.say('The town feels different now. Doors that were shut are waiting to be opened.');
  },
  async assistant(w) {
    await staged(
      w,
      'ASSISTANT',
      [
        null,
        ['Any news? Please tell me you have news.', 'Farm. Mansion. Park. Grocery. Or... her. Pick your nightmare.'],
        ['Is that a SPIRIT? Behind you? ...Good. Good! Now go see the psychic. Carefully.'],
        ["A SHIP?! He's on a SHIP?! He gets seasick! He gets CARSICK! He gets sick in the BATH!", 'Find a way to call that ship. Please. Before he eats something he shouldn\'t.'],
        ['I can hear it out there. In the fog. Please... bring him home.'],
        ['HE\'S BACK! HE\'S BACK! Oh, come here, my cute boy!'],
        ['He signed three decrees this morning. All of them were about squirrels.'],
      ],
      P_HIGH
    );
  },
  async office_portrait(w) {
    if (isSet(w.state, 'vision_done')) await w.say('A portrait of the mayor. That distinguished snout. Those floppy ears. How did you NOT notice?');
    else await w.say('A portrait of the mayor. The painter seems to have really struggled with the ears.');
  },
  async office_dogbed(w) {
    if (!isSet(w.state, 'vision_done')) return w.say('A round, plush bed in the corner. It\'s covered in short white hairs.');
    if (has(w.state, 'bone')) return w.say("The mayor's bed. Of course it is.");
    await w.say("The mayor's bed. Of course it is. Tucked under the cushion...");
    await w.give('bone');
  },
  async office_books(w) {
    await w.say('ROVER\'S GUIDE TO CIVIC LEADERSHIP. CHAPTER ONE: SIT. CHAPTER TWO: STAY.');
  },
  async office_files(w) {
    await w.say('MAYORAL DECREE #12: BATH TIME IS CANCELLED. FOREVER.');
    await w.say('MAYORAL DECREE #31: ALL SQUIRRELS ARE HEREBY UNDER ARREST.');
  },
  async office_desk(w) {
    await w.say('A chewed pen. A chewed stamp. A chewed chair leg. A chewed... everything, really.');
  },
  async office_cabinet(w) {
    await w.say("A tin labeled MEETING SNACKS. The biscuits inside are shaped like little bones.");
  },
};

export const TOWN_SCRIPTS: Record<string, Script> = {
  ...SCRIPTS_INTRO,
  ...SCRIPTS_WELL,
  ...SCRIPTS_OFFICE,
};

// boarded-up houses scattered around town
const BOARDED: Record<string, string> = {
  boarded1: 'Boarded up. Someone painted GONE FISHING across the door. The paint is very old.',
  boarded2: 'Boarded up. A note under the knocker: "BACK WHEN THE MAYOR IS". It is unsigned.',
  boarded3: 'Boarded up. Through a crack you can see a table set for dinner. The candles are lit.',
  boarded4: 'Boarded up. Scratched into the boards: "THE BELL. DON\'T RING THE BELL."',
  boarded5: 'Boarded up. From inside, faintly, someone is practicing the tuba. Badly.',
  boarded6: 'Boarded up. A sign: "MOVED TO THE MAINLAND. TAKE CARE OF THE CROWS."',
};
for (const [k, v] of Object.entries(BOARDED)) TOWN_SCRIPTS[k] = async (w) => w.say(v);
