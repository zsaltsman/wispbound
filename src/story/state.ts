import { w3Objective } from './w3_state';
import type { Dir } from '../world/mapdef';
import { w2Objective } from './w2_state';
import { w4Objective } from './w4_state';
import { w5Objective } from './w5_state';

// Everything the adventure remembers: position, story flags, items and the one
// companion. Saved to the browser after every meaningful change.

export interface StoryState {
  version: 1;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  flags: Record<string, number | boolean | string>;
  items: Record<string, number>;
  creature: string | null;
  /** World 2: the temple creature that joins the World 1 companion (exactly one) */
  creature2?: string | null;
  /** Creatures recruited in later worlds, if any (the party grows without new fields). */
  extra?: string[];
  /** The main companion: leads the line of followers and starts every battle. Defaults to the first recruit. */
  lead?: string | null;
}

export interface ItemInfo {
  name: string;
  desc: string;
  icon: string;
  curio?: boolean;
  fish?: boolean;
}

export const ITEMS: Record<string, ItemInfo> = {
  office_key: { name: "MAYOR'S OFFICE KEY", desc: 'Fished out of the well. It says MAYOR on it, in very serious letters.', icon: 'it_key' },
  mansion_key: { name: 'MASTER BEDROOM KEY', desc: 'Heavy, cold, and humming very faintly.', icon: 'it_keybig' },
  closet_key: { name: 'STAFF CLOSET KEY', desc: 'Recovered from a toilet. Rinsed. Mostly.', icon: 'it_key' },
  feed: { name: 'BUCKET OF FEED', desc: 'Smells like breakfast for something.', icon: 'it_bucket' },
  planks: { name: 'FENCE BOARDS', desc: 'Three boards and a fistful of nails.', icon: 'it_planks' },
  book: { name: 'HOW TO HIDE THINGS VOL. 2', desc: 'Volume 1 is nowhere to be found. Of course.', icon: 'it_book' },
  ugly_clock: { name: 'HIDEOUS CLOCK', desc: 'It ticks. That is its only redeeming quality.', icon: 'it_clock' },
  bait: { name: 'BUCKET OF BAIT', desc: 'Old, wriggling, and hard-won.', icon: 'it_bucket' },
  rod: { name: 'FISHING ROD', desc: 'Face the sea from the shore and press SPACE to cast.', icon: 'it_rod' },
  bellfish: { name: 'BELL FISH', desc: 'It rings when it breathes. Rare and very loud.', icon: 'it_bellfish', fish: true },
  cod: { name: 'COD', desc: 'An honest fish.', icon: 'it_fish', fish: true },
  salmon: { name: 'SALMON', desc: 'Pink, probably. Hard to say in this light.', icon: 'it_fish', fish: true },
  squid: { name: 'SQUID', desc: 'It is looking at you.', icon: 'it_squid', fish: true },
  eel: { name: 'EEL', desc: 'Slippery. Judgemental.', icon: 'it_eel', fish: true },
  boot: { name: 'OLD BOOT', desc: 'Not a fish. Still counts, emotionally.', icon: 'it_boot', fish: true },
  // curios hidden around town
  glass_eye: { name: 'GLASS EYE', desc: 'Found in a grave. It blinks when you are not looking.', icon: 'it_eye', curio: true },
  tooth: { name: 'LUCKY TOOTH', desc: 'Whose? Lucky for whom?', icon: 'it_tooth', curio: true },
  sandwich: { name: 'ANCIENT SANDWICH', desc: 'Older than the town charter.', icon: 'it_sandwich', curio: true },
  doll: { name: 'TINY DOLL', desc: 'It looks a lot like you.', icon: 'it_doll', curio: true },
  coin: { name: 'PIRATE COIN', desc: 'Cold as the sea floor. A skull on both sides.', icon: 'it_coin', curio: true },
  spoon: { name: 'THE GOLDEN SPOON', desc: 'Not golden. Not really a spoon either.', icon: 'it_spoon', curio: true },
  bone: { name: 'CHEW BONE', desc: 'Well loved. Tooth marks everywhere.', icon: 'it_bone', curio: true },
  feather: { name: 'CROW FEATHER', desc: 'Still warm.', icon: 'it_feather', curio: true },
  // World 2: the submarine parts
  checklist: { name: "PROFESSOR'S CHECKLIST", desc: 'Four things. Three of them sound made up. One is peanut butter.', icon: 'it_list' },
  transducer: { name: 'SYNCHRONOUS RECIPROCATING TRANSDUCER', desc: 'It hums. It reciprocates. Synchronously.', icon: 'it_transducer' },
  deflector: { name: 'PHASE-CONJUGATE DISAMBIGUATED DEFLECTOR', desc: 'Ten thousand dollars of something round.', icon: 'it_deflector' },
  turbo: { name: 'TURBO-ENCABULATOR', desc: 'Still warm from the motorcycle. Technically stolen.', icon: 'it_turbo' },
  pb: { name: 'PEANUT BUTTER', desc: 'Smooth. The professor was very specific: SMOOTH.', icon: 'it_pb' },
  // World 3: Bacchus Key
  painting: { name: "AVALENA'S PAINTING", desc: 'The Great Barrel at sunset. Worth $100, she says. Uh... she says.', icon: 'it_painting' },
  money: { name: '$100', desc: 'From the girl by the barrel. For the painting. For the ID.', icon: 'it_money' },
  fakeid: { name: 'AN "OFFICIAL" ID', desc: 'Drawn in crayon during a robbery. AGE: 21 (PROMISE).', icon: 'it_fakeid' },
  jug: { name: 'AN EMPTY JUG', desc: 'For the Great Barrel. Fill it at the tap.', icon: 'it_jug' },
  jugfull: { name: 'A FULL JUG', desc: 'Heavy, sloshing, and very important to the economy.', icon: 'it_jugfull' },
  // The final world: the Reaper's prison
  k_key: { name: 'KITCHEN KEY', desc: 'Fished out of the slop trough. It will never, ever be clean.', icon: 'it_key' },
  w_keys: { name: "THE WARDEN'S KEYS", desc: 'Forty years of keys on one ring. One of them is tagged MESS - STAFF.', icon: 'it_keys' },
  shot: { name: 'ONE SHOT', desc: "Mr. Grimsby's last drink. Allegedly.", icon: 'it_shot' },
  // World 4: The Forgotten Island
  gem: { name: 'GUARDIAN GEMSTONE', desc: 'Green and faintly warm, like something asleep inside a stone.', icon: 'it_gem' },
  keys: { name: 'AIRSHIP KEYS', desc: 'A heavy ring. The tag says IGNITION in faded paint.', icon: 'it_keys' },
  wheel: { name: 'STEERING WHEEL', desc: "The airship's real wheel. Carlo has been using it to drive a box.", icon: 'it_wheel' },
  gas: { name: 'CAN OF GASOLINE', desc: 'Sloshing and pungent. Carried up the mast by a very large bird.', icon: 'it_gas' },
  // Luke & Grace's finest (paid for in lint)
  j_chair: { name: 'RARE VINTAGE CHAIR', desc: 'Minor structural issues. Three legs. Tripod energy.', icon: 'p_junk_chair' },
  j_clock: { name: "COLLECTOR'S CLOCK", desc: 'Time not guaranteed. Right twice a day.', icon: 'p_junk_clock' },
  j_lamp: { name: 'DESIGNER LAMP', desc: 'Shade sold separately. Brave.', icon: 'p_junk_lamp' },
  j_tv: { name: 'PREMIUM TELEVISION', desc: 'Screen sold separately.', icon: 'p_junk_tv' },
  j_jacket: { name: 'BREATHABLE JACKET', desc: 'Extra ventilation. A lot of extra ventilation.', icon: 'p_junk_jacket' },
  j_box: { name: 'MYSTERY BOX', desc: "A fork, a doll's head and one chopstick. A set.", icon: 'p_junk_box' },
  j_toaster: { name: 'BATTLE-TESTED TOASTER', desc: 'Toasts one side. Has seen things.', icon: 'p_junk_toaster' },
};

export const CURIOS = Object.keys(ITEMS).filter((k) => ITEMS[k].curio);

const KEY = 'hollowhaven-save-v1';

export function newState(): StoryState {
  return { version: 1, map: 'town', x: 47, y: 44, dir: 'up', flags: {}, items: {}, creature: null, creature2: null };
}

/**
 * Developer test sessions (the hidden DEV menu) read and write a separate slot, so a test can
 * never touch the real save. The flag lives only in memory: reloading the page always returns
 * to the real game.
 */
const DEV_KEY = 'hollowhaven-dev-session';
let devSession = false;
export const isDevSession = () => devSession;
export function setDevSession(on: boolean) {
  devSession = on;
  if (!on)
    try {
      globalThis.localStorage?.removeItem(DEV_KEY);
    } catch {
      /* ignore */
    }
}
const activeKey = () => (devSession ? DEV_KEY : KEY);

export function loadState(): StoryState | null {
  try {
    const raw = globalThis.localStorage?.getItem(activeKey());
    if (!raw) return null;
    const st = JSON.parse(raw) as StoryState;
    if (st.version !== 1) return null;
    return st;
  } catch {
    return null;
  }
}

export function saveState(st: StoryState) {
  try {
    globalThis.localStorage?.setItem(activeKey(), JSON.stringify(st));
  } catch {
    /* storage unavailable */
  }
}

export function clearState() {
  try {
    globalThis.localStorage?.removeItem(activeKey());
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------ helpers

export const flag = (st: StoryState, k: string) => st.flags[k];
export const isSet = (st: StoryState, k: string) => !!st.flags[k];
export const has = (st: StoryState, item: string) => (st.items[item] ?? 0) > 0;

/** The five recruitment routes are open once the assistant has spoken. */
export const routesOpen = (st: StoryState) => isSet(st, 'office_scene');
/** Exactly one companion per playthrough. */
export const recruited = (st: StoryState) => st.creature !== null;
/** Every recruited creature, the main companion first. */
export function partyOf(st: StoryState): string[] {
  let all = [st.creature, st.creature2, ...(st.extra ?? [])].filter(Boolean) as string[];
  // the Reaper's prison: your creatures were taken, and only the ones you have found again are with you
  if (st.flags.w5_started) all = all.filter((c) => (c === st.creature ? !!st.flags.w5_got1 : c === st.creature2 ? !!st.flags.w5_got2 : (st.extra ?? [])[0] === c ? !!st.flags.w5_got3 : true));
  const lead = st.lead && all.includes(st.lead) ? st.lead : all[0];
  return lead ? [lead, ...all.filter((c) => c !== lead)] : [];
}
export const canRecruit = (st: StoryState, id: string) => routesOpen(st) && (st.creature === null || st.creature === id);

/** One-line goal for the pause menu, derived from story progress. */
export function objective(st: StoryState): string {
  const f = (k: string) => isSet(st, k);
  if (f('w5_started')) return w5Objective(st);
  if (f('w4_started')) return w4Objective(st);
  if (f('w3_started')) return w3Objective(st);
  if (f('w2_started')) return w2Objective(st);
  if (f('ending_done')) return 'The mayor is home. To leave the island, talk to him in his office.';
  if (f('mayor_ran')) return 'Follow the mayor back to his office.';
  if (f('dutchman_beaten')) return 'Something jumped off the ship...';
  if (f('bell_replaced')) return 'Ring the bell at the end of the dock.';
  if (has(st, 'bellfish')) return 'Replace the rusty bell on the dock.';
  if (has(st, 'rod')) return 'Fish from the shore until you catch a Bell Fish.';
  if (has(st, 'bait')) return 'Bring the bait to the fishing shop.';
  if (f('bait_cellar')) return 'Search the grocery store cellar for bait.';
  if (f('bait_asked')) return 'Ask at the grocery store for bait.';
  if (f('bell_seen') && f('vision_done')) return 'Find a new bell. Try the fishing shop.';
  if (f('vision_done')) return 'Find a way to summon a ship. The dock?';
  if (st.creature) return 'Ask the psychic about the missing mayor.';
  if (f('office_scene')) return 'Find a companion. Farm, mansion, park, store... or the psychic?';
  if (has(st, 'office_key')) return "Unlock the Mayor's Office.";
  if (f('well_glint')) return 'Climb down the well and grab what is shining.';
  if (f('talked_mayor')) return "Investigate the Mayor's Office.";
  return 'Talk to the townsfolk.';
}
