import { newState, type StoryState } from '../story/state';

// Developer test checkpoints for the hidden DEV menu (press D, E, V with the pause menu open).
// Each one is a story state "just before" a section: the flags and items it needs are set,
// the section itself is left for you to play. Add new worlds and locations by appending here.

type Dir = 'up' | 'down' | 'left' | 'right';
type Flags = Record<string, number | boolean | string>;

export interface Checkpoint {
  world: number;
  label: string;
  /** 0: no creature yet. 1: one World 1 spirit. 2: plus one World 2 temple creature. 3: plus a World 3 Titan. */
  party: 0 | 1 | 2 | 3;
  map: string;
  x: number;
  y: number;
  dir?: Dir;
  flags: Flags;
  items?: Record<string, number>;
  /** A script to run on arrival (boss fights start through `dev_fight_<enemy>`). */
  script?: string;
}

export const W1_CREATURES = ['hauntcorn', 'booheet', 'shipwraith', 'umbrawl', 'tickraith'];
export const W2_CREATURES = ['hammerfin', 'glidray', 'glowbell', 'bubblotl'];
export const W3_TITAN_PICKS = ['scorvlet', 'widowling', 'ironbud'];

// ---------------------------------------------------------------- story stages (cumulative)

const W1_INTRO: Flags = { intro_done: true };
/** The assistant has spoken: the five spirit routes are open, nobody recruited yet. */
const W1_ROUTES: Flags = { ...W1_INTRO, office_scene: true, office_open: true, talked_mayor: true };
/** A spirit follows you; the psychic's vision is next. */
const W1_RECRUITED: Flags = { ...W1_ROUTES, psychic_met: true };
/** The vision is done and the rusty bell has been seen: the bait, rod and Bell Fish chain. */
const W1_VISION: Flags = { ...W1_RECRUITED, psychic_scene: true, vision_done: true, bell_seen: true };
const W1_BAIT: Flags = { ...W1_VISION, bait_asked: true, bait_cellar: true };
const W1_BELL: Flags = { ...W1_BAIT, fisher_beaten: true, bait_delivered: true, first_bellfish: true, bell_replaced: true };
const W1_DONE: Flags = { ...W1_BELL, dutchman_arrived: true, dutchman_beaten: true, mayor_ran: true, ending_done: true };

const W2_START: Flags = { ...W1_DONE, w2_started: true };
const W2_MET: Flags = { ...W2_START, w2_local_met: true, w2_inv_met: true, w2_inv_follow: true };
const W2_EVAC: Flags = { ...W2_MET, w2_park_met: true, w2_hall_met: true, w2_dealer_met: true, w2_gov_done: true, w2_evac_done: true };
const W2_RICK: Flags = { ...W2_EVAC, w2_stole: true, w2_pb_taken: true };
const W2_BUILT: Flags = { ...W2_RICK, w2_rick_beaten: true, w2_assembled: true };
const W2_CAVE: Flags = { ...W2_BUILT, w2_tsunami: true, w2_dive: true, w2_cave: true, q_cave_close: true };
const temple = (g: string): Flags => ({ ...W2_CAVE, w2_god: g, w2_touched: g, w2_one_warned: true });
/** Through a temple (Zeus's, as a stand-in) and into the vault. */
const W2_VAULT: Flags = { ...temple('zeus'), zeus_open: true, q_zeus_enter: true, q_vault_in: true };

const PARTS = { transducer: 1, deflector: 1, turbo: 1 };

const W2_DONE: Flags = { ...W2_VAULT, kraken_seen: true, kraken_beaten: true, w2_escaped: true, w2_returned: true, w2_ending_done: true, w2_inv_follow: false };
const W3_START: Flags = { ...W2_DONE, w3_started: true, w3_guide_met: true };
const W3_ID: Flags = { ...W3_START, w3_bouncer_met: true, w3_painting: true, w3_sold: true, w3_robbed: true, w3_id: true, w3_thief_quest: true, q_w3_dusk: true };
const W3_NIGHT: Flags = { ...W3_ID, w3_in_club: true, w3_act_dance: true, w3_act_dj: true, w3_act_drink: true, w3_act_bartender: true, w3_backdoor_open: true };
const W3_FIGHT1: Flags = { ...W3_NIGHT, w3_ayla_seen: true, w3_sal_dead: true, w3_sal_dead_scene: true, w3_scorvex_met: true };
const W3_DAY2: Flags = { ...W3_FIGHT1, w3_scorvex_beaten: true, w3_followed: true, w3_cave_done: true, w3_day1_done: true, w3_day2: true, w3_shop_closed: true, w3_ayla_packed: true, w3_ayla_joined: true, w3_ayla_follow: true };
const W3_JUG: Flags = { ...W3_DAY2, w3_avalena_found: true, w3_art_kept: true, w3_thief_quest_done: true, w3_bar_dry: true, w3_jug_quest: true };
const W3_CLINIC: Flags = { ...W3_JUG, w3_jug_full: true, w3_jug_done: true, w3_clinic_open: true };
const W3_FIGHT2: Flags = { ...W3_CLINIC, w3_grimsby_met: true, w3_shot: true, w3_grimsby_done: true, w3_barrel_gone: true };
const W3_DAY3: Flags = { ...W3_FIGHT2, w3_widow_beaten: true, w3_hotel_night: true, w3_day3: true };
const W3_RESEARCHED: Flags = { ...W3_DAY3, w3_research: true, w3_seen_buffet: true, w3_seen_lobster: true, w3_seen_cafe: true, w3_seen_dough: true, w3_seen_froyo: true, w3_research_done: true, q_w3_d3club: true };
const W3_FIGHT3: Flags = { ...W3_RESEARCHED, w3_iron_met: true, w3_club_smashed: true };

const W3_DONE: Flags = { ...W3_FIGHT3, w3_iron_beaten: true, w3_stayed: true, w3_resolved: true, w3_end: true, w3_ayla_follow: false };
const W4_START: Flags = { ...W3_DONE, w4_started: true, w4_cat_seen: true, w4_following: true };
const W4_SUMMIT: Flags = { ...W4_START, w4_cat_t0: true, w4_cat_t1: true, w4_cat_t2: true, w4_cat_t3: true, w4_summit_t: true, w4_summit_done: true };
const W4_EXPLORED: Flags = { ...W4_SUMMIT, w4_stele0_read: true, w4_stele1_read: true, w4_balance: true, w4_warn_read: true, w4_roof_seen: true, w4_roared: true };
const W4_GEMS: Flags = { ...W4_EXPLORED, w4_tower_seen: true, w4_cat_storage: true, w4_storage_read: true, w4_cat_house2: true, w4_house2_read: true, w4_well_found: true, w4_gem1: true, w4_gem2: true };
const W4_A: Flags = { ...W4_GEMS, w4_route: 'A', w4_tower_open: true };
const W4_A_OLD: Flags = { ...W4_A, w4_t1_done: true, champion_beaten: true, w4_t3_done: true, q_w4_t4: true, w4_t5_done: true, w4_t6_done: true, w4_old_done: true, w4_old_follow: true };
const W4_PARTS: Flags = { ...W4_EXPLORED, w4_engine_seen: true, w4_heard_engine: true, w4_carlo_met: true, w4_keys: true, w4_cabin_scene: true, w4_viper_seen: true };
const W4_CARLO: Flags = { ...W4_PARTS, w4_carlo_joined: true, w4_carlo_follow: true, w4_wheel: true };
const W4_B: Flags = { ...W4_CARLO, crow_beaten: true, w4_gas: true, w4_route: 'B', w4_flown: true };
const W4_B_TREE: Flags = { ...W4_B, w4_reunion: true, squirrel_beaten: true, q_w4_g4: true, q_w4_g3: true, w4_g3_done: true, w4_g2_done: true, w4_flute_done: true };
// the research facility, all done (before the last warning)
const W4_LAB: Flags = { w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true, w4_lab_cell: true, w4_lab_card: true, w4_lab_key: true, w4_lab_lever: true, w4_lab_broke: true, subject_beaten: true, w4_lab_done: true };
const W4_WARN: Flags = { ...W4_A_OLD, ...W4_LAB, wispmane_beaten: true, w4_warning_t: true, w4_warning: true, w4_animals_fled: true, w4_paw_seen: true };

const W4_END_COMMON: Flags = { w4_escaped: true, w4_aloft: true, w4_taken: true, w4_chamber: true, reaper_fought: true, w4_captured: true, w4_guardian: true, w4_end: true, w4_old_follow: false, w4_carlo_follow: false };
const W4_END_A: Flags = { ...W4_WARN, ...W4_END_COMMON };
const W4_END_B: Flags = { ...W4_B_TREE, ...W4_LAB, viperwind_beaten: true, w4_warning_t: true, w4_warning: true, w4_animals_fled: true, w4_paw_seen: true, ...W4_END_COMMON };
const W5_STAGES = (end: Flags) => {
  const free: Flags = { ...end, w5_started: true, w5_slop: true, w5_ate: true, w5_free: true };
  const got3: Flags = { ...free, w5_spec_seen: true, w5_got3: true, w5_lit2: true };
  const warden: Flags = { ...got3, w5_gate_down: true, w5_warden_beaten: true, w5_lit3: true };
  const mass: Flags = { ...warden, w5_kitchen_seen: true, w5_key_hint: true, w5_trough_dug: true, w5_key_found: true, w5_kitchen_open: true, w5_got2: true, w5_massacre_t: true, w5_massacre: true, w5_lit4: true };
  const got1: Flags = { ...mass, w5_disguised: true, w5_door_ok: true, w5_overheard: true, w5_got1: true, w5_lit5: true };
  return { free, got3, warden, mass, got1 };
};
const W5A = W5_STAGES(W4_END_A);
const W5_FREE = W5A.free;
const W5_GOT3 = W5A.got3;
const W5_WARDEN = W5A.warden;
const W5_MASS = W5A.mass;
const W5_GOT1 = W5A.got1;
const W5_GOT1B = W5_STAGES(W4_END_B).got1;
/** The Reaper has come (end of Part One): the final chapter starts from here. */
const W5_MET: Flags = { ...W5_GOT1, w5_d1: true, w5_d2: true, w5_d3: true, w5_cell_open: true, w5_rescued: true, w5_reaper_met: true };
const W5_METB: Flags = { ...W5_GOT1B, w5_d1: true, w5_d2: true, w5_d3: true, w5_cell_open: true, w5_rescued: true, w5_reaper_met: true };
/** In the fights: the guardian has gone looking for Flamora (or come back with her). */
const W6_GR1: Flags = { ...W5_MET, w6_part2: true, w5_g_away: true };
const W6_GR2: Flags = { ...W5_MET, w6_part2: true, w6_stage: 'gr1_done' };
const W6_WON: Flags = { ...W5_MET, w6_part2: true, w6_stage: 'won', w6_won: true };
const W6_WONB: Flags = { ...W5_METB, w6_part2: true, w6_stage: 'won', w6_won: true, w3_stayed: false, w3_banished: true };

// ---------------------------------------------------------------- the list

export const CHECKPOINTS: Checkpoint[] = [
  // World 1: Hollowhaven
  { world: 1, label: 'HOLLOWHAVEN (START OF THE GAME)', party: 0, map: 'town', x: 47, y: 44, dir: 'up', flags: W1_INTRO },
  { world: 1, label: "MAYOR'S OFFICE", party: 0, map: 'office', x: 6, y: 8, dir: 'up', flags: W1_INTRO },
  { world: 1, label: 'TOWN, ROUTES OPEN (NO SPIRIT YET)', party: 0, map: 'town', x: 47, y: 44, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: 'HAUNTED FARM (FARMHOUSE)', party: 0, map: 'farmhouse', x: 4, y: 7, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: 'HAUNTED FARM (BARN)', party: 0, map: 'barn', x: 5, y: 8, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: 'HAUNTED MANSION', party: 0, map: 'mansion1', x: 12, y: 19, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: 'THE SEA CAVE', party: 0, map: 'cave', x: 2, y: 1, dir: 'down', flags: W1_ROUTES },
  { world: 1, label: 'THE BOTTOM OF THE WELL', party: 0, map: 'well', x: 4, y: 2, dir: 'down', flags: W1_ROUTES },
  { world: 1, label: 'GROCERY STORE', party: 0, map: 'store', x: 9, y: 13, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: "GERALD'S HOUSE (THE CLOCK)", party: 0, map: 'gerald', x: 4, y: 7, dir: 'up', flags: W1_ROUTES },
  { world: 1, label: "PSYCHIC'S HOUSE (THE VISION)", party: 1, map: 'psychic', x: 6, y: 8, dir: 'up', flags: W1_RECRUITED },
  { world: 1, label: 'MAD PIES', party: 1, map: 'madpies', x: 6, y: 8, dir: 'up', flags: W1_RECRUITED },
  { world: 1, label: 'FISHING SHOP', party: 1, map: 'fishshop', x: 4, y: 7, dir: 'up', flags: W1_BAIT },
  { world: 1, label: 'GROCERY CELLAR (THE BAIT)', party: 1, map: 'cellar', x: 1, y: 1, dir: 'down', flags: W1_BAIT },
  { world: 1, label: 'BOSS: ANGRY FISHERMAN', party: 1, map: 'cellar', x: 1, y: 1, dir: 'down', flags: { ...W1_BAIT, fisher_appeared: true }, script: 'dev_fight_fisherman' },
  { world: 1, label: 'FISHING FROM THE DOCK (ROD IN HAND)', party: 1, map: 'town', x: 46, y: 79, dir: 'left', flags: { ...W1_BAIT, fisher_beaten: true, bait_delivered: true }, items: { rod: 1 } },
  { world: 1, label: 'THE DOCK BELL (BELL FISH HUNG)', party: 1, map: 'town', x: 48, y: 80, dir: 'down', flags: { ...W1_BELL, bell_rings: 2 } },
  { world: 1, label: 'BOSS: THE FLYING DUTCHMAN', party: 1, map: 'town', x: 48, y: 80, dir: 'down', flags: { ...W1_BELL, bell_rings: 3, dutchman_arrived: true, lights_out: true }, script: 'dev_fight_dutchman' },
  { world: 1, label: 'ISLAND DONE: STAY OR LEAVE (THE MAYOR)', party: 1, map: 'office', x: 6, y: 5, dir: 'up', flags: W1_DONE, script: 'stay_w1' },
  { world: 1, label: 'BOAT: HOLLOWHAVEN TO SALTWASH', party: 1, map: 'town', x: 48, y: 80, dir: 'down', flags: W1_DONE, script: 'dev_voyage_w2' },

  // World 2: Saltwash
  { world: 2, label: 'SALTWASH ISLAND (ARRIVAL)', party: 1, map: 'isl', x: 48, y: 75, dir: 'up', flags: W2_START },
  { world: 2, label: "PIPWICK'S WORKSHOP (FIRST VISIT)", party: 1, map: 'w2_inv', x: 4, y: 10, dir: 'up', flags: { ...W2_START, w2_local_met: true }, script: 'enter_w2_inv' },
  { world: 2, label: 'SALTWASH, PIPWICK FOLLOWING', party: 1, map: 'isl', x: 48, y: 60, dir: 'up', flags: W2_MET },
  { world: 2, label: 'THRILL HARBOR THEME PARK', party: 1, map: 'park', x: 29, y: 45, dir: 'up', flags: W2_MET },
  { world: 2, label: 'CITY HALL (THE ELECTION)', party: 1, map: 'w2_hall', x: 8, y: 10, dir: 'up', flags: W2_MET },
  { world: 2, label: 'BANK OF SALTWASH', party: 1, map: 'w2_bank', x: 6, y: 8, dir: 'up', flags: { ...W2_MET, w2_hall_met: true } },
  { world: 2, label: 'TECH REPAIR SHOP', party: 1, map: 'w2_tech', x: 6, y: 8, dir: 'up', flags: { ...W2_MET, w2_hall_met: true } },
  { world: 2, label: "RICK'S RIDES (DEALERSHIP)", party: 1, map: 'w2_dealer', x: 8, y: 10, dir: 'up', flags: W2_MET },
  { world: 2, label: "LUKE & GRACE'S THRIFT", party: 1, map: 'w2_thrift', x: 6, y: 8, dir: 'up', flags: W2_MET },
  { world: 2, label: 'EMERGENCY BRIEFING + EVACUATION', party: 1, map: 'isl', x: 48, y: 60, dir: 'up', flags: { ...W2_MET, w2_park_met: true, w2_hall_met: true, w2_dealer_met: true, w2_stole: true }, items: PARTS },
  { world: 2, label: 'FRESH MART (THE PEANUT BUTTER)', party: 1, map: 'w2_grocery', x: 8, y: 12, dir: 'up', flags: { ...W2_EVAC, w2_stole: true }, items: PARTS },
  { world: 2, label: 'BOSS: SLICK RICK', party: 1, map: 'w2_grocery', x: 13, y: 7, dir: 'up', flags: W2_RICK, items: PARTS, script: 'dev_fight_salesman' },
  { world: 2, label: 'SUBMARINE ASSEMBLY', party: 1, map: 'w2_inv', x: 4, y: 10, dir: 'up', flags: { ...W2_RICK, w2_rick_beaten: true }, items: { ...PARTS, pb: 1 }, script: 'enter_w2_inv' },
  { world: 2, label: 'THE TSUNAMI', party: 1, map: 'w2_inv', x: 4, y: 10, dir: 'up', flags: W2_BUILT },
  { world: 2, label: 'THE DIVE (UNDERWATER)', party: 1, map: 'isl', x: 48, y: 75, dir: 'up', flags: { ...W2_BUILT, w2_tsunami: true, w2_dive: true } },
  { world: 2, label: 'CAVE OF THE GODS (CHOOSE A STATUE)', party: 1, map: 'w2_cave', x: 21, y: 31, dir: 'up', flags: W2_CAVE },
  { world: 2, label: 'TEMPLE OF ZEUS', party: 1, map: 't_zeus', x: 13, y: 19, dir: 'up', flags: temple('zeus') },
  { world: 2, label: 'TEMPLE OF THOR', party: 1, map: 't_thor', x: 15, y: 26, dir: 'up', flags: temple('thor') },
  { world: 2, label: 'TEMPLE OF POSEIDON', party: 1, map: 't_poseidon', x: 14, y: 20, dir: 'up', flags: temple('poseidon') },
  { world: 2, label: 'TEMPLE OF ATHENA', party: 1, map: 't_athena', x: 14, y: 23, dir: 'up', flags: temple('athena') },
  { world: 2, label: 'THE DEEP VAULT (KRAKEN REVEAL)', party: 2, map: 'w2_vault', x: 14, y: 20, dir: 'up', flags: W2_VAULT },
  { world: 2, label: 'BOSS: THE KRAKEN', party: 2, map: 'w2_vault', x: 14, y: 14, dir: 'up', flags: { ...W2_VAULT, kraken_seen: true }, script: 'dev_fight_kraken' },
  { world: 2, label: 'THE TIMED ESCAPE', party: 2, map: 'w2_vault', x: 14, y: 14, dir: 'up', flags: { ...W2_VAULT, kraken_seen: true, kraken_beaten: true }, script: 'escape_run' },
  { world: 2, label: 'RETURN TO THE EMPTY ISLAND', party: 2, map: 'w2_escape', x: 30, y: 2, dir: 'down', flags: { ...W2_VAULT, kraken_seen: true, kraken_beaten: true, w2_escaped: true }, script: 'w2_surface' },
  { world: 2, label: 'FINAL ENDING (WALK UP TO PIPWICK)', party: 2, map: 'isl', x: 48, y: 43, dir: 'up', flags: { ...W2_VAULT, kraken_seen: true, kraken_beaten: true, w2_escaped: true, w2_returned: true, q_ret_low: true } },
  { world: 2, label: 'ISLAND DONE: STAY OR LEAVE (PIPWICK)', party: 2, map: 'isl', x: 50, y: 42, dir: 'up', flags: W2_DONE, script: 'stay_w2' },
  { world: 2, label: 'BOAT: SALTWASH TO BACCHUS KEY', party: 2, map: 'isl', x: 48, y: 75, dir: 'down', flags: W2_DONE, script: 'dev_voyage_w3' },

  // World 3: Bacchus Key
  { world: 3, label: 'BACCHUS KEY (THE TITLE + ARRIVAL)', party: 2, map: 'w3_isl', x: 50, y: 73, dir: 'up', flags: W2_DONE, script: 'w3_title' },
  { world: 3, label: 'BACCHUS KEY, DAY 1 (EXPLORE)', party: 2, map: 'w3_isl', x: 50, y: 60, dir: 'up', flags: W3_START },
  { world: 3, label: 'THE BOUNCER (NEED AN ID)', party: 2, map: 'w3_isl', x: 49, y: 26, dir: 'up', flags: W3_START },
  { world: 3, label: "AVALENA'S ART SHOP (THE PAINTING)", party: 2, map: 'w3_art', x: 6, y: 8, dir: 'up', flags: { ...W3_START, w3_bouncer_met: true } },
  { world: 3, label: 'SELL THE PAINTING (AT THE BARREL)', party: 2, map: 'w3_isl', x: 80, y: 40, dir: 'up', flags: { ...W3_START, w3_bouncer_met: true, w3_painting: true }, items: { painting: 1 } },
  { world: 3, label: 'THE ROBBERY (BACK TO THE ART SHOP)', party: 2, map: 'w3_isl', x: 17, y: 53, dir: 'up', flags: { ...W3_START, w3_bouncer_met: true, w3_painting: true, w3_sold: true }, items: { money: 1 } },
  { world: 3, label: 'CLUB FOREVER, THE FIRST NIGHT', party: 2, map: 'w3_isl', x: 49, y: 25, dir: 'up', flags: W3_ID, items: { fakeid: 1 } },
  { world: 3, label: 'THE BACK DOOR (AYLA IN THE ALLEY)', party: 2, map: 'w3_club', x: 3, y: 4, dir: 'up', flags: W3_NIGHT, items: { fakeid: 1 } },
  { world: 3, label: 'BOSS: SCORVEX', party: 2, map: 'w3_isl', x: 50, y: 25, dir: 'up', flags: W3_FIGHT1, items: { fakeid: 1 }, script: 'dev_fight_scorvex' },
  { world: 3, label: 'FOLLOWING AYLA (STEALTH)', party: 2, map: 'w3_isl', x: 63, y: 27, dir: 'left', flags: { ...W3_FIGHT1, w3_scorvex_beaten: true }, items: { fakeid: 1 }, script: 'w3_follow' },
  { world: 3, label: "AYLA'S CAVE", party: 2, map: 'w3_isl', x: 4, y: 27, dir: 'up', flags: { ...W3_FIGHT1, w3_scorvex_beaten: true, w3_followed: true }, items: { fakeid: 1 } },
  { world: 3, label: "DAY 2: MILO'S HIDEOUT", party: 2, map: 'w3_hideout', x: 10, y: 9, dir: 'up', flags: { ...W3_FIGHT1, w3_scorvex_beaten: true, w3_followed: true, w3_cave_done: true }, items: { fakeid: 1 }, script: 'w3_villain1' },
  { world: 3, label: 'DAY 2: AVALENA BEHIND THE BAR', party: 2, map: 'w3_club', x: 6, y: 8, dir: 'up', flags: W3_DAY2, items: { fakeid: 1 } },
  { world: 3, label: 'DAY 2: THE JUG AND THE BARREL', party: 2, map: 'w3_isl', x: 81, y: 39, dir: 'up', flags: W3_JUG, items: { fakeid: 1, jug: 1 } },
  { world: 3, label: 'DAY 2: THE CLINIC (MR. GRIMSBY)', party: 2, map: 'w3_clinic', x: 14, y: 10, dir: 'up', flags: W3_CLINIC, items: { fakeid: 1 } },
  { world: 3, label: 'DAY 2: THE WINDOW (WIDOWMAKER ARRIVES)', party: 2, map: 'w3_club', x: 36, y: 8, dir: 'up', flags: { ...W3_CLINIC, w3_grimsby_met: true, w3_grimsby_done: true }, items: { fakeid: 1 }, script: 'w3_window_crowd' },
  { world: 3, label: 'BOSS: WIDOWMAKER', party: 2, map: 'w3_isl', x: 80, y: 41, dir: 'up', flags: W3_FIGHT2, items: { fakeid: 1 }, script: 'dev_fight_widowmaker' },
  { world: 3, label: "DAY 3: MILO'S PLAN", party: 2, map: 'w3_hideout', x: 10, y: 9, dir: 'up', flags: { ...W3_FIGHT2, w3_widow_beaten: true, w3_hotel_night: true }, items: { fakeid: 1 }, script: 'w3_villain2' },
  { world: 3, label: 'DAY 3: BUSINESS RESEARCH', party: 2, map: 'w3_club', x: 6, y: 8, dir: 'up', flags: W3_DAY3, items: { fakeid: 1 } },
  { world: 3, label: 'DAY 3: IRONCLAD ARRIVES (LEAVE THE CLUB)', party: 2, map: 'w3_club', x: 21, y: 27, dir: 'down', flags: W3_RESEARCHED, items: { fakeid: 1 } },
  { world: 3, label: 'BOSS: IRONCLAD', party: 2, map: 'w3_isl', x: 50, y: 26, dir: 'up', flags: W3_FIGHT3, items: { fakeid: 1 }, script: 'dev_fight_ironclad' },
  { world: 3, label: "MILO'S STORY + THE TOWN'S DECISION", party: 2, map: 'w3_isl', x: 50, y: 25, dir: 'up', flags: { ...W3_FIGHT3, w3_iron_beaten: true }, items: { fakeid: 1 }, script: 'w3_aftermath' },
  { world: 3, label: 'FINAL ENDING (AFTER THE CHOICE)', party: 2, map: 'w3_isl', x: 49, y: 27, dir: 'up', flags: { ...W3_FIGHT3, w3_iron_beaten: true, w3_titan: 'ironbud', w3_stayed: true }, items: { fakeid: 1 }, script: 'w3_moving_on' },
  { world: 3, label: 'ISLAND DONE: STAY OR LEAVE (TEDDY)', party: 2, map: 'w3_isl', x: 50, y: 71, dir: 'up', flags: W3_DONE, items: { fakeid: 1 } },
  { world: 3, label: 'BOAT: BACCHUS KEY TO THE FORGOTTEN ISLAND', party: 3, map: 'w3_isl', x: 50, y: 73, dir: 'down', flags: W3_DONE, items: { fakeid: 1 }, script: 'dev_voyage_w4' },
  // World 4: The Forgotten Island
  { world: 4, label: 'THE FORGOTTEN ISLAND (TITLE + THE CAT)', party: 3, map: 'w4_isl', x: 12, y: 85, dir: 'up', flags: W3_DONE, script: 'w4_title' },
  { world: 4, label: 'UP THE MOUNTAIN (FOLLOW THE CAT)', party: 3, map: 'w4_isl', x: 17, y: 76, dir: 'up', flags: W4_START },
  { world: 4, label: 'THE SUMMIT MONUMENT', party: 3, map: 'w4_isl', x: 36, y: 19, dir: 'up', flags: { ...W4_START, w4_cat_t0: true, w4_cat_t1: true, w4_cat_t2: true, w4_cat_t3: true, w4_summit_t: true } },
  { world: 4, label: 'THE VILLAGE (EXPLORE)', party: 3, map: 'w4_isl', x: 60, y: 47, dir: 'down', flags: W4_SUMMIT },
  { world: 4, label: 'GEMSTONE TRAIL (THE CAT IN THE VILLAGE)', party: 3, map: 'w4_isl', x: 66, y: 58, dir: 'up', flags: { ...W4_EXPLORED, w4_tower_seen: true } },
  { world: 4, label: 'ROUTE A: THE TOWER DOOR (2 GEMS)', party: 3, map: 'w4_isl', x: 96, y: 14, dir: 'up', flags: W4_GEMS, items: { gem: 2 } },
  { world: 4, label: 'TOWER 1F: THE VINE PUZZLE', party: 3, map: 'w4_t1', x: 8, y: 11, dir: 'up', flags: W4_A },
  { world: 4, label: 'BOSS: THE ANCIENT FOREST CHAMPION', party: 3, map: 'w4_t2', x: 8, y: 10, dir: 'up', flags: { ...W4_A, w4_t1_done: true }, script: 'dev_fight_champion' },
  { world: 4, label: 'TOWER 3F: THE THIRSTY STUMPS', party: 3, map: 'w4_t3', x: 8, y: 11, dir: 'up', flags: { ...W4_A, w4_t1_done: true, champion_beaten: true } },
  { world: 4, label: 'TOWER 4F: THE FORGOTTEN GARDEN', party: 3, map: 'w4_t4', x: 9, y: 11, dir: 'up', flags: { ...W4_A, w4_t1_done: true, champion_beaten: true, w4_t3_done: true } },
  { world: 4, label: 'TOWER 5F: THE VINE SWING', party: 3, map: 'w4_t5', x: 2, y: 2, dir: 'right', flags: { ...W4_A, w4_t1_done: true, champion_beaten: true, w4_t3_done: true, q_w4_t4: true } },
  { world: 4, label: 'TOWER 6F: THE SACRED STONES', party: 3, map: 'w4_t6', x: 8, y: 11, dir: 'up', flags: { ...W4_A, w4_t1_done: true, champion_beaten: true, w4_t3_done: true, q_w4_t4: true, w4_t5_done: true } },
  { world: 4, label: 'TOWER 7F: THE OLD MAN', party: 3, map: 'w4_t7', x: 3, y: 9, dir: 'up', flags: { ...W4_A, w4_t1_done: true, champion_beaten: true, w4_t3_done: true, q_w4_t4: true, w4_t5_done: true, w4_t6_done: true } },
  { world: 4, label: 'THE CLEARING (WISPMANE)', party: 3, map: 'w4_isl', x: 102, y: 46, dir: 'down', flags: W4_A_OLD },
  { world: 4, label: 'BOSS: WISPMANE', party: 3, map: 'w4_isl', x: 102, y: 56, dir: 'up', flags: W4_A_OLD, script: 'dev_fight_wispmane' },
  { world: 4, label: 'ROUTE B: THE AIRSHIP ENGINE', party: 3, map: 'w4_isl', x: 75, y: 80, dir: 'up', flags: W4_EXPLORED },
  { world: 4, label: 'THE PASSENGER CABIN (THE KEYS)', party: 3, map: 'w4_ship', x: 10, y: 8, dir: 'up', flags: { ...W4_EXPLORED, w4_engine_seen: true } },
  { world: 4, label: 'THE CASTLE (CARLO)', party: 3, map: 'w4_castle', x: 11, y: 14, dir: 'up', flags: { ...W4_EXPLORED, w4_engine_seen: true, w4_heard_engine: true } },
  { world: 4, label: 'THE CROW\'S NEST', party: 3, map: 'w4_nest', x: 6, y: 6, dir: 'up', flags: W4_CARLO, items: { keys: 1, wheel: 1 } },
  { world: 4, label: 'START THE AIRSHIP (ALL 3 PARTS)', party: 3, map: 'w4_isl', x: 75, y: 80, dir: 'up', flags: { ...W4_CARLO, crow_beaten: true, w4_gas: true }, items: { keys: 1, wheel: 1, gas: 1 } },
  { world: 4, label: 'TREE 7F: THE REUNION', party: 3, map: 'w4_g7', x: 8, y: 7, dir: 'down', flags: W4_B, script: 'w4_reunion' },
  { world: 4, label: 'BOSS: THE ANCIENT TREE GUARDIAN', party: 3, map: 'w4_g6', x: 8, y: 2, dir: 'down', flags: { ...W4_B, w4_reunion: true }, script: 'dev_fight_squirrel' },
  { world: 4, label: 'TREE 5F: THE TREEHOUSE', party: 3, map: 'w4_g5', x: 9, y: 2, dir: 'down', flags: { ...W4_B, w4_reunion: true, squirrel_beaten: true } },
  { world: 4, label: 'TREE 3F: THE SINGING MUSHROOMS', party: 3, map: 'w4_g3', x: 3, y: 2, dir: 'down', flags: { ...W4_B, w4_reunion: true, squirrel_beaten: true, q_w4_g4: true } },
  { world: 4, label: 'TREE 2F: THE JUMP AND THE COLLAPSE', party: 3, map: 'w4_g2', x: 3, y: 2, dir: 'down', flags: { ...W4_B, w4_reunion: true, squirrel_beaten: true, q_w4_g4: true, q_w4_g3: true, w4_g3_done: true } },
  { world: 4, label: 'TREE 1F: THE FLUTE', party: 3, map: 'w4_g1', x: 8, y: 2, dir: 'down', flags: { ...W4_B, w4_reunion: true, squirrel_beaten: true, q_w4_g4: true, q_w4_g3: true, w4_g3_done: true, w4_g2_done: true } },
  { world: 4, label: 'BOSS: VIPERWIND', party: 3, map: 'w4_isl', x: 102, y: 56, dir: 'up', flags: W4_B_TREE, script: 'dev_fight_viperwind' },
  { world: 4, label: 'THE FACILITY: THE DOOR IN THE HILL (ROUTE A)', party: 3, map: 'w4_isl', x: 102, y: 53, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true }, script: 'w4_lab_found' },
  { world: 4, label: 'THE FACILITY: THE DOOR IN THE HILL (ROUTE B)', party: 3, map: 'w4_isl', x: 102, y: 53, dir: 'up', flags: { ...W4_B_TREE, viperwind_beaten: true }, script: 'w4_lab_found' },
  { world: 4, label: 'THE FACILITY: RECEPTION (BREAKERS)', party: 3, map: 'w4_lab1', x: 11, y: 3, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true } },
  { world: 4, label: 'THE FACILITY: THE LABORATORY (TUNER)', party: 3, map: 'w4_lab2', x: 3, y: 5, dir: 'left', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true } },
  { world: 4, label: 'THE FACILITY: CONTAINMENT (THE CELL)', party: 3, map: 'w4_lab3', x: 8, y: 10, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, q_lab_lab: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true } },
  { world: 4, label: 'THE FACILITY: THE OFFICE (SAFE)', party: 3, map: 'w4_lab4', x: 7, y: 8, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, q_lab_lab: true, q_lab_cont: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true, w4_lab_cell: true, w4_lab_card: true } },
  { world: 4, label: 'THE FACILITY: THE CHAMBER (LEVER)', party: 3, map: 'w4_lab5', x: 10, y: 10, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, q_lab_lab: true, q_lab_cont: true, q_lab_off: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true, w4_lab_cell: true, w4_lab_card: true, w4_lab_key: true } },
  { world: 4, label: 'BOSS: SUBJECT 9', party: 3, map: 'w4_lab5', x: 10, y: 10, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, q_lab_lab: true, q_lab_cont: true, q_lab_off: true, q_lab_ch: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true, w4_lab_cell: true, w4_lab_card: true, w4_lab_key: true, w4_lab_lever: true, w4_lab_broke: true }, script: 'dev_fight_subject' },
  { world: 4, label: 'THE FACILITY: THE VAULT', party: 3, map: 'w4_lab5', x: 16, y: 2, dir: 'up', flags: { ...W4_A_OLD, wispmane_beaten: true, w4_lab_found: true, w4_lab_found_t: true, q_lab_in: true, q_lab_rec: true, q_lab_lab: true, q_lab_cont: true, q_lab_off: true, q_lab_ch: true, w4_lab_power: true, w4_lb0: true, w4_lb3: true, w4_lab_tuned: true, w4_lab_cell: true, w4_lab_card: true, w4_lab_key: true, w4_lab_lever: true, w4_lab_broke: true, subject_beaten: true } },
  { world: 4, label: 'THE LAST WARNING (ROUTE A)', party: 3, map: 'w4_isl', x: 60, y: 51, dir: 'up', flags: { ...W4_A_OLD, ...W4_LAB, wispmane_beaten: true } },
  { world: 4, label: 'THE LAST WARNING (ROUTE B)', party: 3, map: 'w4_isl', x: 60, y: 51, dir: 'up', flags: { ...W4_B_TREE, ...W4_LAB, viperwind_beaten: true } },
  { world: 4, label: 'THE ESCAPE (TIMED RUN)', party: 3, map: 'w4_isl', x: 60, y: 47, dir: 'down', flags: { ...W4_WARN, w4_escaping: true }, script: 'w4_escape' },
  { world: 4, label: 'THE SKY (THE BLADE + FLAMORA)', party: 3, map: 'w4_isl', x: 72, y: 80, dir: 'up', flags: { ...W4_WARN, w4_escaped: true, w4_aloft: true }, script: 'w4_sky' },
  { world: 4, label: 'THE STONE CHAMBER (THE REAPER ARRIVES)', party: 3, map: 'w4_chamber', x: 9, y: 7, dir: 'up', flags: { ...W4_WARN, w4_escaped: true, w4_aloft: true, w4_taken: true }, script: 'w4_chamber' },
  { world: 4, label: 'BOSS: THE REAPER', party: 3, map: 'w4_chamber', x: 9, y: 7, dir: 'up', flags: { ...W4_WARN, w4_escaped: true, w4_aloft: true, w4_taken: true, w4_chamber: true }, script: 'dev_fight_reaper' },
  { world: 4, label: 'THE CELL (TO BE CONTINUED)', party: 3, map: 'w4_cell', x: 3, y: 5, dir: 'down', flags: { ...W4_WARN, w4_escaped: true, w4_aloft: true, w4_taken: true, w4_chamber: true, reaper_fought: true, w4_captured: true, w4_old_follow: false }, script: 'w4_cell' },
  // ---------------------------------------------------------------- WORLD 5: THE REAPER'S PRISON (part one)
  { world: 5, label: 'THE PRISON (TITLE + THE CELL + SLOP)', party: 3, map: 'w4_cell', x: 3, y: 5, dir: 'down', flags: W4_END_A, script: 'w5_start' },
  { world: 5, label: 'THE CELL BLOCK (EXPLORE)', party: 3, map: 'p_cells', x: 3, y: 7, dir: 'down', flags: W5_FREE },
  { world: 5, label: 'THE SPECIMEN CELL (THIRD CREATURE)', party: 3, map: 'p_cells', x: 27, y: 8, dir: 'down', flags: { ...W5_FREE, w5_spec_seen: true } },
  { world: 5, label: "THE WARDEN'S POST", party: 3, map: 'p_post', x: 8, y: 3, dir: 'down', flags: W5_GOT3 },
  { world: 5, label: 'BOSS: THE SKELETON WARDEN', party: 3, map: 'p_post', x: 8, y: 8, dir: 'down', flags: { ...W5_GOT3, w5_gate_down: true, w5_g_away: true }, script: 'dev_fight_skelwarden' },
  { world: 5, label: 'THE MESS HALL (FOOD FIGHT)', party: 3, map: 'p_mess', x: 2, y: 3, dir: 'down', flags: W5_WARDEN, items: { w_keys: 1 } },
  { world: 5, label: 'THE KITCHEN KEY (HINT HEARD)', party: 3, map: 'p_mess', x: 14, y: 14, dir: 'down', flags: { ...W5_WARDEN, w5_kitchen_seen: true, w5_key_hint: true }, items: { w_keys: 1 } },
  { world: 5, label: 'THE KITCHEN (SECOND CREATURE + SUPPER)', party: 3, map: 'p_mess', x: 29, y: 7, dir: 'up', flags: { ...W5_WARDEN, w5_kitchen_seen: true, w5_key_hint: true, w5_trough_dug: true, w5_key_found: true, w5_kitchen_open: true }, items: { w_keys: 1 } },
  { world: 5, label: 'THE GUARD QUARTERS (STEALTH)', party: 3, map: 'p_guard', x: 3, y: 4, dir: 'down', flags: W5_MASS, items: { w_keys: 1 } },
  { world: 5, label: 'THE GUARD QUARTERS (DISGUISED)', party: 3, map: 'p_guard', x: 3, y: 4, dir: 'down', flags: { ...W5_MASS, w5_disguised: true }, items: { w_keys: 1 } },
  { world: 5, label: 'THE BREAK ROOM (SPIRITS, EH?)', party: 3, map: 'p_guard', x: 20, y: 16, dir: 'down', flags: { ...W5_MASS, w5_disguised: true, w5_door_ok: true, w5_overheard: true }, items: { w_keys: 1 }, script: 'p4_overhear' },
  { world: 5, label: 'BOSS: YOUR FIRST SPIRIT, SUPERCHARGED', party: 3, map: 'p_guard', x: 20, y: 16, dir: 'down', flags: { ...W5_MASS, w5_disguised: true, w5_door_ok: true, w5_overheard: true }, items: { w_keys: 1 }, script: 'dev_fight_sc' },
  { world: 5, label: 'HIGH SECURITY (NO NUMBERS YET)', party: 3, map: 'p_high', x: 3, y: 4, dir: 'down', flags: W5_GOT1, items: { w_keys: 1 } },
  { world: 5, label: 'THE LOCK (ALL 3 NUMBERS, ROUTE A)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'up', flags: { ...W5_GOT1, w5_d1: true, w5_d2: true, w5_d3: true }, items: { w_keys: 1 } },
  { world: 5, label: 'THE LOCK (ALL 3 NUMBERS, ROUTE B)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'up', flags: { ...W5_GOT1B, w5_d1: true, w5_d2: true, w5_d3: true }, items: { w_keys: 1 } },
  { world: 5, label: 'THE REAPER APPEARS', party: 3, map: 'p_high', x: 22, y: 8, dir: 'up', flags: { ...W5_GOT1, w5_d1: true, w5_d2: true, w5_d3: true, w5_cell_open: true, w5_rescued: true }, items: { w_keys: 1 }, script: 'w5_reaper' },
  { world: 6, label: 'THE GOD OF DEATH BEGINS (THE GUARDIAN GOES)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: W5_MET, items: { w_keys: 1 }, script: 'w6_begin' },
  { world: 6, label: 'BOSS 1: THE GRIM REAPER', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: W6_GR1, items: { w_keys: 1 }, script: 'dev_w6_gr1' },
  { world: 6, label: 'FLAMORA IN THE CELL (HEALED)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR1, w6_stage: 'gr1_done' }, items: { w_keys: 1 }, script: 'w6_flamora' },
  { world: 6, label: 'BOSS 2: THE BUFF REAPER', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: W6_GR2, items: { w_keys: 1 }, script: 'dev_w6_gr2' },
  { world: 6, label: 'BOSS 3: THE TRUE FORM (FROM THE TOP)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR2, w6_sec: 0 }, items: { w_keys: 1 }, script: 'dev_w6_gr3' },
  { world: 6, label: 'TRUE FORM: JUST ABOVE 80% (PIPWICK)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR2, w6_near: 1 }, items: { w_keys: 1 }, script: 'dev_w6_near' },
  { world: 6, label: 'TRUE FORM: JUST ABOVE 60% (ORACLE)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR2, w6_near: 2 }, items: { w_keys: 1 }, script: 'dev_w6_near' },
  { world: 6, label: 'TRUE FORM: JUST ABOVE 40% (AYLA)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR2, w6_near: 3 }, items: { w_keys: 1 }, script: 'dev_w6_near' },
  { world: 6, label: 'TRUE FORM: JUST ABOVE 20% (SUPERCHARGE)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: { ...W6_GR2, w6_near: 4 }, items: { w_keys: 1 }, script: 'dev_w6_near' },
  { world: 6, label: 'BOSS 4: THE GOD OF DEATH (HIS DOMAIN)', party: 3, map: 'p_high', x: 22, y: 8, dir: 'left', flags: W6_GR2, items: { w_keys: 1 }, script: 'dev_w6_gr4' },
  { world: 6, label: 'AFTER: SILENCE + CELEBRATION (ROUTE A, MILO STAYED)', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: W6_WON, items: { w_keys: 1 }, script: 'w6_after' },
  { world: 6, label: 'AFTER: SILENCE + CELEBRATION (ROUTE B, MILO GONE)', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: W6_WONB, items: { w_keys: 1 }, script: 'w6_after' },
  { world: 6, label: 'THE GUARDIAN (GOODBYE MOMENT)', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: W6_WON, items: { w_keys: 1 }, script: 'w6_goodbye' },
  { world: 6, label: 'FINAL CREDITS', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: W6_WON, items: { w_keys: 1 }, script: 'dev_w6_credits' },
  { world: 6, label: 'THE MONTAGE (EVERY WORLD)', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: { ...W6_WON, w6_credits: true }, items: { w_keys: 1 }, script: 'w6_montage' },
  { world: 6, label: 'THE CAT', party: 3, map: 'p_high', x: 14, y: 9, dir: 'left', flags: { ...W6_WON, w6_credits: true }, items: { w_keys: 1 }, script: 'w6_cat' },
  { world: 5, label: 'TEST: WISPMANE + VIPERWIND + FLAMORA', party: 0, map: 'p_post', x: 8, y: 9, dir: 'down', flags: W4_END_A, script: 'dev_w5_spirits' },
];

export type Guardian = 'wispmane' | 'viperwind';
/** Past the guardian fight (and not already pinned to one route): the test asks which guardian you chose. */
export const asksGuardian = (cp: Checkpoint) =>
  !/ROUTE [AB]/.test(cp.label) && cp.party > 0 && (cp.world >= 5 || (cp.world === 4 && !!(cp.flags.wispmane_beaten || cp.flags.viperwind_beaten)));

/** Re-route a checkpoint's flags: Wispmane goes with the old man (route A), Viperwind with Carlo (route B). */
function withGuardian(flags: Flags, g: Guardian): Flags {
  const out: Flags = { ...flags };
  if (g === 'wispmane') {
    for (const k of Object.keys(W4_B_TREE)) if (!(k in W4_A_OLD) && !(k in W4_EXPLORED)) delete out[k];
    delete out.viperwind_beaten;
    Object.assign(out, W4_A_OLD, { wispmane_beaten: true, w4_route: 'A' });
    if (flags.w4_carlo_follow !== undefined || flags.w4_old_follow !== undefined) out.w4_old_follow = !!(flags.w4_old_follow || flags.w4_carlo_follow);
    out.w4_carlo_follow = false;
  } else {
    for (const k of Object.keys(W4_A_OLD)) if (!(k in W4_B_TREE) && !(k in W4_EXPLORED)) delete out[k];
    delete out.wispmane_beaten;
    Object.assign(out, W4_B_TREE, { viperwind_beaten: true, w4_route: 'B' });
    if (flags.w4_carlo_follow !== undefined || flags.w4_old_follow !== undefined) out.w4_carlo_follow = !!(flags.w4_old_follow || flags.w4_carlo_follow);
    out.w4_old_follow = false;
  }
  // the story's own state (follows, endings) wins over the route's starting flags
  for (const k of Object.keys(flags)) if (!(k in W4_A_OLD) && !(k in W4_B_TREE) && k !== 'wispmane_beaten' && k !== 'viperwind_beaten') out[k] = flags[k];
  return out;
}

/** A fresh, self-contained story state for a checkpoint and the chosen creatures. */
export function checkpointState(cp: Checkpoint, picks: string[], guardian?: Guardian): StoryState {
  const st = newState();
  st.map = cp.map;
  st.x = cp.x;
  st.y = cp.y;
  st.dir = cp.dir ?? 'down';
  st.flags = guardian && asksGuardian(cp) ? withGuardian(cp.flags, guardian) : { ...cp.flags };
  st.items = { ...(cp.items ?? {}) };
  st.creature = cp.party >= 1 ? picks[0] ?? null : null;
  st.creature2 = cp.party >= 2 ? picks[1] ?? null : null;
  if (cp.party >= 3 && picks[2]) {
    st.extra = [picks[2]];
    st.flags.w3_titan = picks[2];
  }
  return st;
}
