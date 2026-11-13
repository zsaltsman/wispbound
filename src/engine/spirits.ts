import type { BossAttackDef, EnemyDef } from './boss';
import { PRISON_FOES } from './prison';
import { FINAL_FOES, type FinalFoeId } from './final';

// World 4: THE FORGOTTEN ISLAND. Every fight here takes all three of your creatures,
// and every opponent is built to hit more than one of them: whole-team slams, roots
// that hold a creature in place for a turn, roars that sap the team's strength.
//
//  - The Ancient Forest Champion (Wispmane's route, tower floor 2): a brute.
//  - Wispmane, Guardian of the Land: heavy, patient, heals, and ends in Nature's Wrath.
//  - The Mutant Crow (Viperwind's route, the crow's nest): fast, blinding, aerial.
//  - The Ancient Tree Guardian (the giant tree, floor 6): leaps, barrages, enrages.
//  - Viperwind, Guardian of the Sky: fast and unpredictable, many hits, wind walls.
//  - The Reaper: the end of the chapter. It feels winnable. It is not. Each phase holds
//    until the story reaches it, and at the last it collects everything.

const A = (d: Partial<BossAttackDef> & Pick<BossAttackDef, 'id' | 'name' | 'dmg' | 'icon' | 'warn'>): BossAttackDef => ({
  phases: [1, 2, 3],
  major: false,
  hits: [1, 1, 1],
  cd: 1,
  weight: 8,
  charge: false,
  breakNeed: 0,
  scaled: true,
  ...d,
});

// ---------------------------------------------------------------- THE ANCIENT FOREST CHAMPION

export const CHAMPION: EnemyDef = {
  id: 'champion',
  name: 'THE ANCIENT FOREST CHAMPION',
  subtitle: "WISPMANE'S CHOSEN",
  maxHp: 1800,
  attacks: {
    ground_slam: A({ id: 'ground_slam', name: 'GROUND SLAM', dmg: 46, major: true, cd: 2, weight: 9, icon: 'w4_slam', warn: 'BOTH FISTS RISE OVER ITS HEAD. THE WHOLE TEAM WILL FEEL THIS.' }),
    root_trap: A({ id: 'root_trap', name: 'ROOT TRAP', dmg: 22, cd: 3, weight: 7, icon: 'w4_roots', warn: 'IT PRESSES ONE PALM FLAT AGAINST THE FLOOR...' }),
    crushing_grip: A({ id: 'crushing_grip', name: 'CRUSHING GRIP', dmg: 80, major: true, cd: 2, weight: 7, icon: 'w4_grip', warn: 'IT REACHES OUT WITH ONE ENORMOUS HAND.' }),
    pummel: A({ id: 'pummel', name: 'PUMMEL', dmg: 24, hits: [2, 3, 3], cd: 1, weight: 9, icon: 'w4_pummel', warn: 'IT BEATS ITS CHEST AND COMES IN SWINGING.' }),
    forest_rage: A({ id: 'forest_rage', name: 'FOREST RAGE', phases: [2], dmg: 30, cd: 6, weight: 0, icon: 'w4_rage', warn: 'MOSS FLARES ALONG ITS BACK. IT IS FURIOUS.' }),
  },
  phaseAt: [0.38],
  phaseMult: [1, 1.2],
  combos: [
    ['root_trap', 'crushing_grip'],
    ['pummel', 'ground_slam'],
  ],
  fallback: 'pummel',
  chargeText: {},
  fireWarn: {},
};

// ---------------------------------------------------------------- WISPMANE

export const WISPMANE: EnemyDef = {
  id: 'wispmane',
  name: 'WISPMANE',
  subtitle: 'GUARDIAN OF THE LAND',
  maxHp: 2350,
  attacks: {
    ethereal_claws: A({ id: 'ethereal_claws', name: 'ETHEREAL CLAWS', dmg: 62, major: true, cd: 1, weight: 10, icon: 'w4_claws', warn: 'ITS CLAWS GLOW THROUGH THE GRASS.' }),
    natures_grasp: A({ id: 'natures_grasp', name: "NATURE'S GRASP", dmg: 20, cd: 3, weight: 7, icon: 'w4_roots', warn: 'THE ROOTS UNDER YOUR FEET BEGIN TO MOVE.' }),
    ancient_growth: A({ id: 'ancient_growth', name: 'ANCIENT GROWTH', dmg: 0, cd: 4, weight: 5, scaled: false, icon: 'w4_growth', warn: 'IT LOWERS ITS HEAD. THE GRASS AROUND IT BLOOMS.' }),
    forest_roar: A({ id: 'forest_roar', name: 'ROAR OF THE FOREST', dmg: 18, cd: 4, weight: 6, icon: 'w4_roar', warn: 'IT DRAWS IN A HUGE BREATH...' }),
    overgrowth: A({ id: 'overgrowth', name: 'OVERGROWTH', phases: [2, 3], dmg: 20, hits: [3, 3, 4], major: true, cd: 2, weight: 8, icon: 'w4_vines', warn: 'VINES WRITHE UP OUT OF THE CLEARING.' }),
    natures_wrath: A({
      id: 'natures_wrath',
      name: "NATURE'S WRATH",
      phases: [3],
      dmg: 110,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 230,
      icon: 'w4_wrath',
      warn: 'ITS MANE BLAZES LIKE A FOREST FIRE OF LIGHT.',
    }),
  },
  phaseAt: [0.68, 0.36],
  phaseMult: [1, 1.12, 1.24],
  combos: [
    ['natures_grasp', 'ethereal_claws'],
    ['forest_roar', 'overgrowth'],
  ],
  fallback: 'ethereal_claws',
  chargeText: { natures_wrath: 'THE WHOLE CLEARING GLOWS. THE GROUND IS ABOUT TO ERUPT!' },
  fireWarn: { natures_wrath: "NATURE'S WRATH NEXT TURN! IT WILL HIT EVERYONE!" },
};

// ---------------------------------------------------------------- THE MUTANT CROW

export const CROW: EnemyDef = {
  id: 'crow',
  name: 'THE MUTANT CROW',
  subtitle: "TERROR OF THE CROW'S NEST",
  maxHp: 1950,
  attacks: {
    wing_gust: A({ id: 'wing_gust', name: 'WING GUST', dmg: 34, cd: 1, weight: 9, icon: 'w4_gust', warn: 'IT SPREADS ITS WINGS ACROSS THE WHOLE NEST.' }),
    feather_barrage: A({ id: 'feather_barrage', name: 'FEATHER BARRAGE', dmg: 13, hits: [5, 6, 7], cd: 2, weight: 9, icon: 'w4_feathers', warn: 'ITS FEATHERS STAND ON END LIKE KNIVES.' }),
    diving_strike: A({ id: 'diving_strike', name: 'DIVING STRIKE', dmg: 88, major: true, cd: 2, weight: 7, icon: 'w4_dive', warn: 'IT CLIMBS STRAIGHT UP INTO THE DARK...' }),
    screech: A({ id: 'screech', name: 'DEAFENING SCREECH', dmg: 14, cd: 4, weight: 6, icon: 'w4_screech', warn: 'ITS BEAK OPENS WIDE. WIDER. WIDER.' }),
    blackout_storm: A({
      id: 'blackout_storm',
      name: 'BLACKOUT STORM',
      phases: [3],
      dmg: 18,
      hits: [6, 6, 6],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 170,
      icon: 'w4_storm',
      warn: 'BLACK FEATHERS SWIRL INTO A STORM AROUND THE MAST.',
    }),
  },
  phaseAt: [0.66, 0.33],
  phaseMult: [1, 1.12, 1.22],
  combos: [
    ['screech', 'diving_strike'],
    ['wing_gust', 'feather_barrage'],
  ],
  fallback: 'wing_gust',
  chargeText: { blackout_storm: 'THE SKY GOES BLACK WITH FEATHERS!' },
  fireWarn: { blackout_storm: 'THE BLACKOUT STORM BREAKS NEXT TURN!' },
};

// ---------------------------------------------------------------- SUBJECT 9

/**
 * The failed experiment in the hillside facility (both routes, after the guardian).
 * Strong and erratic, but it cannot hold itself together: every so often, instead of
 * whatever it was about to do, it LOSES CONTROL (see Battle.meltdown): it hurts itself,
 * drops its guard for two turns, and even a charged CRITICAL MASS can fizzle out.
 * Smaller than the dungeon bosses, and easier.
 */
export const SUBJECT: EnemyDef = {
  id: 'subject',
  name: 'SUBJECT 9',
  subtitle: 'THE FAILED EXPERIMENT',
  maxHp: 2300,
  attacks: {
    surge_claw: A({ id: 'surge_claw', name: 'SURGE CLAW', dmg: 86, cd: 1, weight: 10, icon: 'w4_claws', warn: 'ITS HUGE ARM CRACKLES. THE CLAWS GLOW WHITE.' }),
    arc_lash: A({ id: 'arc_lash', name: 'ARC LASH', dmg: 30, hits: [3, 4, 4], cd: 2, weight: 9, icon: 'w4_gale', warn: 'ARCS OF ENERGY CRAWL OVER ITS SKIN, LOOKING FOR SOMEWHERE TO GO.' }),
    overcharge: A({ id: 'overcharge', name: 'OVERCHARGE PULSE', dmg: 70, cd: 2, weight: 8, icon: 'w4_quake', warn: 'IT SWELLS. THE LIGHT IN ITS CRACKS GETS BRIGHTER AND BRIGHTER.' }),
    drain_grip: A({ id: 'drain_grip', name: 'DRAIN GRIP', dmg: 60, cd: 3, weight: 6, icon: 'w4_drain', warn: 'IT REACHES OUT, HUNGRY FOR ANY ENERGY IT CAN FIND.' }),
    static_howl: A({ id: 'static_howl', name: 'STATIC HOWL', phases: [2, 3], dmg: 26, cd: 4, weight: 6, icon: 'w4_roar', warn: 'ITS LITTLE HEAD TIPS BACK. THE AIR STARTS TO BUZZ.' }),
    critical_mass: A({
      id: 'critical_mass',
      name: 'CRITICAL MASS',
      phases: [3],
      dmg: 33,
      hits: [5, 5, 5],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 130,
      icon: 'w4_storm',
      warn: 'EVERY CRACK IN IT BLAZES AT ONCE. IT IS ABOUT TO BURST.',
    }),
    // never planned: it happens to it (Battle.meltdown)
    meltdown: A({ id: 'meltdown', name: 'LOSES CONTROL', phases: [], dmg: 0, cd: 0, weight: 0, scaled: false, icon: 'w4_rage', warn: '' }),
  },
  phaseAt: [0.6, 0.3],
  phaseMult: [1, 1.1, 1.18],
  combos: [
    ['arc_lash', 'surge_claw'],
    ['static_howl', 'overcharge'],
  ],
  fallback: 'surge_claw',
  chargeText: { critical_mass: 'IT CURLS UP AROUND A BLINDING LIGHT. HIT IT BEFORE IT BURSTS!' },
  fireWarn: { critical_mass: 'CRITICAL MASS NEXT TURN! GUARD, OR HIT IT HARD!' },
};

// ---------------------------------------------------------------- THE ANCIENT TREE GUARDIAN

export const SQUIRREL: EnemyDef = {
  id: 'squirrel',
  name: 'THE ANCIENT TREE GUARDIAN',
  subtitle: 'KEEPER OF THE HOLLOW',
  maxHp: 1850,
  attacks: {
    nut_barrage: A({ id: 'nut_barrage', name: 'GIANT NUT BARRAGE', dmg: 16, hits: [4, 5, 6], cd: 2, weight: 9, icon: 'w4_nuts', warn: 'IT STUFFS ITS CHEEKS. THEN IT TAKES AIM.' }),
    tail_slam: A({ id: 'tail_slam', name: 'TAIL SLAM', dmg: 70, major: true, cd: 2, weight: 8, icon: 'w4_tail', warn: 'ITS HUGE TAIL CURLS UP OVER ITS HEAD.' }),
    branch_leap: A({ id: 'branch_leap', name: 'BRANCH LEAP', dmg: 58, cd: 2, weight: 8, icon: 'w4_leap', warn: 'IT SCRAMBLES UP THE WALL AND OUT OF SIGHT...' }),
    whirlwind_spin: A({ id: 'whirlwind_spin', name: 'WHIRLWIND SPIN', dmg: 18, hits: [3, 4, 4], major: true, cd: 3, weight: 7, icon: 'w4_spin', warn: 'IT BALLS UP AND STARTS TO SPIN.' }),
    forestquake: A({
      id: 'forestquake',
      name: 'FORESTQUAKE',
      phases: [3],
      dmg: 98,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 190,
      icon: 'w4_quake',
      warn: 'IT CLIMBS TO THE VERY TOP OF THE CHAMBER.',
    }),
  },
  phaseAt: [0.62, 0.3],
  phaseMult: [1, 1.15, 1.3],
  combos: [
    ['branch_leap', 'tail_slam'],
    ['nut_barrage', 'whirlwind_spin'],
  ],
  fallback: 'nut_barrage',
  chargeText: { forestquake: 'IT GRIPS THE TRUNK WITH ALL FOUR PAWS. THE WHOLE TREE GROANS!' },
  fireWarn: { forestquake: 'IT DROPS NEXT TURN! THE FLOOR WILL SHAKE!' },
};

// ---------------------------------------------------------------- VIPERWIND

export const VIPERWIND: EnemyDef = {
  id: 'viperwind',
  name: 'VIPERWIND',
  subtitle: 'GUARDIAN OF THE SKY',
  maxHp: 2300,
  attacks: {
    gale_strike: A({ id: 'gale_strike', name: 'GALE STRIKE', dmg: 27, hits: [2, 2, 3], cd: 1, weight: 10, icon: 'w4_gale', warn: 'IT BLURS. YOU CAN BARELY FOLLOW IT.' }),
    tornado_trap: A({ id: 'tornado_trap', name: 'TORNADO TRAP', dmg: 18, cd: 3, weight: 7, icon: 'w4_tornado', warn: 'THE AIR AROUND YOU STARTS TO TURN.' }),
    skyfall: A({ id: 'skyfall', name: 'SKYFALL', dmg: 84, major: true, cd: 2, weight: 7, icon: 'w4_skyfall', warn: 'IT SHOOTS STRAIGHT UP INTO THE SKY...' }),
    wind_barrier: A({ id: 'wind_barrier', name: 'WIND BARRIER', dmg: 0, cd: 4, weight: 5, scaled: false, icon: 'w4_barrier', warn: 'IT COILS. THE WIND COILS WITH IT.' }),
    cyclone_rush: A({ id: 'cyclone_rush', name: 'CYCLONE RUSH', phases: [2, 3], dmg: 14, hits: [5, 6, 7], major: true, cd: 2, weight: 8, icon: 'w4_cyclone', warn: 'IT WHIPS AROUND THE CLEARING, FASTER AND FASTER.' }),
    tempest: A({
      id: 'tempest',
      name: 'TEMPEST OF THE SKIES',
      phases: [3],
      dmg: 21,
      hits: [5, 5, 5],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 220,
      icon: 'w4_tempest',
      warn: 'THE CLOUDS OVERHEAD BEGIN TO SPIRAL DOWN TOWARD IT.',
    }),
  },
  phaseAt: [0.66, 0.34],
  phaseMult: [1, 1.12, 1.24],
  combos: [
    ['gale_strike', 'skyfall'],
    ['tornado_trap', 'cyclone_rush'],
    ['wind_barrier', 'gale_strike'],
  ],
  fallback: 'gale_strike',
  chargeText: { tempest: 'A STORM WRAPS ITSELF AROUND THE CLEARING!' },
  fireWarn: { tempest: 'THE TEMPEST BREAKS NEXT TURN! EVERYONE WILL BE CAUGHT IN IT!' },
};

// ---------------------------------------------------------------- THE REAPER

export const REAPER: EnemyDef = {
  id: 'reaper',
  name: 'THE REAPER',
  subtitle: 'THE SILENT ONE',
  maxHp: 3000,
  attacks: {
    // phase 1: THE SILENT ONE
    dark_slash: A({ id: 'dark_slash', name: 'DARK SLASH', phases: [1, 2], dmg: 64, major: true, cd: 1, weight: 10, icon: 'w4_slash', warn: 'THE BLADE LIFTS, WITHOUT A SOUND.' }),
    soul_drain: A({ id: 'soul_drain', name: 'SOUL DRAIN', phases: [1, 2], dmg: 30, hits: [2, 2, 2], cd: 3, weight: 7, icon: 'w4_drain', warn: 'IT HOLDS OUT ONE HAND, PALM UP.' }),
    shadow_step: A({ id: 'shadow_step', name: 'SHADOW STEP', phases: [1, 2], dmg: 42, cd: 3, weight: 6, icon: 'w4_step', warn: 'IT IS SUDDENLY NOT WHERE IT WAS.' }),
    graveyard: A({ id: 'graveyard', name: 'GRAVEYARD', phases: [1, 2], dmg: 15, hits: [4, 5, 5], cd: 2, weight: 8, icon: 'w4_hands', warn: 'THE FLOOR TURNS SOFT AND BLACK UNDER YOU.' }),
    // phase 2: THE COLLECTOR
    judgment_r: A({ id: 'judgment_r', name: "REAPER'S JUDGMENT", phases: [2], dmg: 110, major: true, cd: 3, weight: 6, icon: 'w4_judgment', warn: 'IT POINTS THE BLADE AT ONE OF YOU.' }),
    blackout: A({ id: 'blackout', name: 'BLACKOUT', phases: [2], dmg: 12, cd: 4, weight: 5, icon: 'w4_blackout', warn: 'THE LIGHT IN THE CHAMBER STARTS TO DIE.' }),
    soul_chains: A({ id: 'soul_chains', name: 'SOUL CHAINS', phases: [2], dmg: 20, cd: 4, weight: 6, icon: 'w4_chains', warn: 'CHAINS OF SHADOW UNCOIL FROM ITS SLEEVES.' }),
    deaths_approach: A({ id: 'deaths_approach', name: "DEATH'S APPROACH", phases: [2], dmg: 16, hits: [6, 6, 6], major: true, cd: 2, weight: 8, icon: 'w4_approach', warn: 'IT COMES TOWARD YOU. FAST.' }),
    // phase 3: the end
    final_collection: A({
      id: 'final_collection',
      name: 'FINAL COLLECTION',
      phases: [3],
      dmg: 999,
      major: true,
      cd: 99,
      weight: 0,
      charge: true,
      breakNeed: 999999,
      scaled: false,
      icon: 'w4_final',
      warn: 'IT RAISES THE BLADE. THE DARK POURS INTO IT.',
    }),
  },
  phaseAt: [0.6, 0.3],
  phaseMult: [1, 1.14, 1],
  combos: [
    ['shadow_step', 'dark_slash'],
    ['soul_chains', 'deaths_approach'],
    ['blackout', 'judgment_r'],
  ],
  fallback: 'dark_slash',
  chargeText: { final_collection: '...' },
  fireWarn: { final_collection: '...' },
};

export const SPIRITS: Record<string, EnemyDef> = { champion: CHAMPION, wispmane: WISPMANE, crow: CROW, subject: SUBJECT, squirrel: SQUIRREL, viperwind: VIPERWIND, reaper: REAPER, ...PRISON_FOES, ...FINAL_FOES };
/** The prison's foes fight like the island's spirits: one big body, the whole party. */
export type PrisonFoeId = 'skelwarden' | 'sc_booheet' | 'sc_shipwraith' | 'sc_hauntcorn' | 'sc_umbrawl' | 'sc_tickraith';
export type SpiritId = 'champion' | 'wispmane' | 'crow' | 'subject' | 'squirrel' | 'viperwind' | 'reaper' | PrisonFoeId | FinalFoeId;
export const isSpirit = (id: string): id is SpiritId => id in SPIRITS;
