import type { BossAttackDef, EnemyDef } from './boss';

// The final world: THE REAPER'S PRISON. Two kinds of fight on the way out.
//
//  - The Skeleton Warden (the Warden's Post): you have ONE creature back, so he is
//    built for a duel. Heavy single blows, a shield that turns hits aside, cuffs that
//    seal your signature, and LIGHTS OUT: a counted-down finisher you must either
//    guard against or break by hitting him hard while he counts.
//  - A guard's supercharged spirit (the Guard Quarters): whichever World 1 spirit you
//    started with, pushed far past its limits. Its own moves, grown monstrous, and a
//    few new ones. Two of your creatures fight it.

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

// ---------------------------------------------------------------- THE SKELETON WARDEN

export const SKELWARDEN: EnemyDef = {
  id: 'skelwarden',
  name: 'THE SKELETON WARDEN',
  subtitle: 'FORTY YEARS ON THE NIGHT SHIFT',
  maxHp: 1250,
  attacks: {
    nightstick: A({ id: 'nightstick', name: 'NIGHTSTICK', dmg: 46, cd: 1, weight: 10, icon: 'w_hammer', warn: 'HE TAPS THE NIGHTSTICK AGAINST HIS PALM. TAP. TAP.' }),
    key_lash: A({ id: 'key_lash', name: 'KEY RING LASH', dmg: 15, hits: [3, 4], cd: 2, weight: 8, icon: 'w_chain', warn: 'HE WHIRLS A RING OF A HUNDRED KEYS OVER HIS SKULL.' }),
    lockdown: A({ id: 'lockdown', name: 'LOCKDOWN', dmg: 0, cd: 4, weight: 6, scaled: false, icon: 'w_fortress', warn: 'HE PLANTS A CELL DOOR IN FRONT OF HIMSELF LIKE A SHIELD.' }),
    shackles: A({ id: 'shackles', name: 'SHACKLES', dmg: 20, cd: 4, weight: 6, icon: 'w4_chains', warn: 'IRON CUFFS RATTLE ON HIS BELT. HE PICKS A PAIR.' }),
    bone_rattle: A({ id: 'bone_rattle', name: 'BONE RATTLE', phases: [2], dmg: 18, cd: 4, weight: 6, icon: 'i_wail', warn: 'HIS WHOLE SKELETON STARTS TO SHAKE. LOUDER. LOUDER.' }),
    solitary: A({ id: 'solitary', name: 'SOLITARY', phases: [2], dmg: 70, major: true, cd: 3, weight: 6, icon: 'w_grip', warn: 'HE REACHES FOR YOU WITH ONE LONG, BONY HAND.' }),
    lights_out: A({
      id: 'lights_out',
      name: 'LIGHTS OUT',
      dmg: 132,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 150,
      icon: 'i_moon',
      warn: 'HE STARTS COUNTING HEADS. ONE... TWO...',
    }),
  },
  phaseAt: [0.5],
  phaseMult: [1, 1.15],
  combos: [
    ['shackles', 'nightstick'],
    ['bone_rattle', 'solitary'],
  ],
  fallback: 'nightstick',
  chargeText: { lights_out: 'HE PULLS THE BIG LEVER HALFWAY DOWN. THE LIGHTS FLICKER. HIT HIM BEFORE HE FINISHES COUNTING!' },
  fireWarn: { lights_out: 'LIGHTS OUT NEXT TURN! GUARD, OR KNOCK HIM OFF THE LEVER!' },
};

// ---------------------------------------------------------------- the supercharged spirits

const SC_HP = 2050;
const SC_PHASE = { phaseAt: [0.62, 0.3], phaseMult: [1, 1.13, 1.26] };

/** BOOHEET, supercharged: the little ghost under the sheet, become a nightmare. */
export const SC_BOOHEET: EnemyDef = {
  id: 'sc_booheet',
  name: 'BANSHEET',
  subtitle: 'BOOHEET, EVOLVED',
  maxHp: SC_HP,
  attacks: {
    spook_storm: A({ id: 'spook_storm', name: 'SPOOK STORM', dmg: 15, hits: [3, 4, 5], cd: 1, weight: 10, icon: 'i_bolt', warn: 'A DOZEN GLOWING EYES OPEN UNDER THE SHEET.' }),
    dread_howl: A({ id: 'dread_howl', name: 'DREAD HOWL', dmg: 22, cd: 3, weight: 7, icon: 'i_wail', warn: 'THE SHEET BILLOWS. SOMETHING UNDERNEATH TAKES A BREATH.' }),
    smother: A({ id: 'smother', name: 'SMOTHERING SHEET', dmg: 58, major: true, cd: 2, weight: 7, icon: 'w_grasp', warn: 'THE SHEET STRETCHES. AND STRETCHES. IT IS COMING TO WRAP YOU UP.' }),
    peekaboo_x: A({ id: 'peekaboo_x', name: 'PEEK-A-BOO FOREVER', dmg: 34, cd: 4, weight: 6, icon: 'i_eye', warn: 'IT IS GONE. THEN IT IS EVERYWHERE.' }),
    night_terror_x: A({
      id: 'night_terror_x',
      name: 'ENDLESS NIGHT TERROR',
      phases: [3],
      dmg: 128,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 200,
      icon: 'i_skull',
      warn: 'THE SHEET RISES TO THE CEILING. EVERY LIGHT IN THE ROOM GOES OUT.',
    }),
  },
  ...SC_PHASE,
  combos: [
    ['dread_howl', 'smother'],
    ['peekaboo_x', 'spook_storm'],
  ],
  fallback: 'spook_storm',
  chargeText: { night_terror_x: 'YOUR WORST DREAMS CRAWL OUT FROM UNDER THE SHEET!' },
  fireWarn: { night_terror_x: 'THE NIGHT TERROR STRIKES NEXT TURN! IT WILL REACH EVERYONE!' },
};

/** SHIPWRAITH, supercharged: one little haunted ship, become a ghost fleet. */
export const SC_SHIPWRAITH: EnemyDef = {
  id: 'sc_shipwraith',
  name: 'DREADHULL',
  subtitle: 'SHIPWRAITH, EVOLVED',
  maxHp: SC_HP,
  attacks: {
    broadside_x: A({ id: 'broadside_x', name: 'SPECTRAL BROADSIDE', dmg: 13, hits: [4, 5, 6], cd: 1, weight: 10, icon: 'w_cannon', warn: 'EVERY GUN PORT OPENS AT ONCE.' }),
    barnacle_bastion: A({ id: 'barnacle_bastion', name: 'BARNACLE BASTION', dmg: 0, cd: 4, weight: 6, scaled: false, icon: 'i_shield', warn: 'BARNACLES CRAWL OVER THE HULL, THICKER AND THICKER.' }),
    batten_all: A({ id: 'batten_all', name: 'BATTEN EVERYTHING', dmg: 0, cd: 5, weight: 5, scaled: false, icon: 'i_hatch', warn: 'THE HATCHES SLAM SHUT. THE CREW IS LOADING SOMETHING BIG.' }),
    sunken_anchor: A({ id: 'sunken_anchor', name: 'SUNKEN ANCHOR', dmg: 66, major: true, cd: 2, weight: 7, icon: 'w_anchor', warn: 'A CHAIN RATTLES UP INTO THE DARK ABOVE YOU.' }),
    dead_fleet: A({
      id: 'dead_fleet',
      name: 'DEAD FLEET VOLLEY',
      phases: [3],
      dmg: 17,
      hits: [8, 8, 8],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 210,
      icon: 'i_volley',
      warn: 'GHOST SHIPS RISE BEHIND IT. A WHOLE FLEET. EVERY CANNON TURNS TO YOU.',
    }),
  },
  ...SC_PHASE,
  combos: [
    ['sunken_anchor', 'broadside_x'],
    ['batten_all', 'sunken_anchor'],
  ],
  fallback: 'broadside_x',
  chargeText: { dead_fleet: 'THE WHOLE GHOST FLEET RUNS OUT ITS GUNS!' },
  fireWarn: { dead_fleet: 'THE DEAD FLEET FIRES NEXT TURN! EVERYONE GET DOWN!' },
};

/** HAUNTCORN, supercharged: a scarecrow, become the harvest that never ends. */
export const SC_HAUNTCORN: EnemyDef = {
  id: 'sc_hauntcorn',
  name: 'SCARECROWN',
  subtitle: 'HAUNTCORN, EVOLVED',
  maxHp: SC_HP - 100,
  attacks: {
    straw_scythe: A({ id: 'straw_scythe', name: 'STRAW SCYTHE', dmg: 30, hits: [2, 2, 3], cd: 1, weight: 10, icon: 'i_straw', warn: 'ITS STRAW ARMS TWIST INTO TWO LONG BLADES.' }),
    blood_moon: A({ id: 'blood_moon', name: 'BLOOD HARVEST MOON', dmg: 0, cd: 4, weight: 6, scaled: false, icon: 'i_moon', warn: 'A HUGE MOON RISES BEHIND IT. IT IS THE WRONG COLOUR.' }),
    corn_maze: A({ id: 'corn_maze', name: 'CORN MAZE', dmg: 20, cd: 4, weight: 6, icon: 'i_corn', warn: 'CORN BURSTS UP THROUGH THE FLOOR AROUND YOU, HIGHER THAN YOUR HEAD.' }),
    crow_swarm: A({ id: 'crow_swarm', name: 'CROW SWARM', phases: [2, 3], dmg: 11, hits: [6, 6, 7], major: true, cd: 2, weight: 8, icon: 'w4_feathers', warn: 'ITS HAT LIFTS. THERE ARE CROWS UNDERNEATH. HUNDREDS.' }),
    hallowed_reaping: A({
      id: 'hallowed_reaping',
      name: 'HALLOWED REAPING',
      phases: [3],
      dmg: 136,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 200,
      icon: 'i_pumpkin',
      warn: 'ITS PUMPKIN HEAD SPLITS INTO A GRIN WIDER THAN ITS FACE.',
    }),
  },
  ...SC_PHASE,
  combos: [
    ['corn_maze', 'crow_swarm'],
    ['blood_moon', 'straw_scythe'],
  ],
  fallback: 'straw_scythe',
  chargeText: { hallowed_reaping: 'THE WHOLE FIELD BENDS TOWARD IT. IT IS GATHERING THE HARVEST!' },
  fireWarn: { hallowed_reaping: 'THE REAPING COMES NEXT TURN!' },
};

/** UMBRAWL, supercharged: an umbrella, become the storm itself. */
export const SC_UMBRAWL: EnemyDef = {
  id: 'sc_umbrawl',
  name: 'STORMBRAWL',
  subtitle: 'UMBRAWL, EVOLVED',
  maxHp: SC_HP - 100,
  attacks: {
    parasol_lance: A({ id: 'parasol_lance', name: 'PARASOL LANCE', dmg: 60, major: true, cd: 1, weight: 10, icon: 'i_pierce', warn: 'THE UMBRELLA SNAPS SHUT INTO A SPEAR.' }),
    cyclone_vortex: A({ id: 'cyclone_vortex', name: 'CYCLONE VORTEX', dmg: 17, hits: [3, 4, 5], cd: 2, weight: 9, icon: 'i_spin', warn: 'IT STARTS TO SPIN. THE AIR SPINS WITH IT.' }),
    canopy_dome: A({ id: 'canopy_dome', name: 'CANOPY DOME', dmg: 0, cd: 4, weight: 5, scaled: false, icon: 'i_canopy', warn: 'THE UMBRELLA OPENS WIDE. WIDER THAN THE ROOM.' }),
    lightning_rod: A({ id: 'lightning_rod', name: 'LIGHTNING ROD', phases: [2, 3], dmg: 26, cd: 4, weight: 6, icon: 'i_zap', warn: 'IT POINTS ITS TIP AT THE CEILING. THE HAIR ON YOUR ARMS STANDS UP.' }),
    monsoon_end: A({
      id: 'monsoon_end',
      name: 'MONSOON APOCALYPSE',
      phases: [3],
      dmg: 150,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 190,
      icon: 'i_storm',
      warn: 'IT RISES INTO A BLACK CLOUD. THE CLOUD STARTS TO RAIN UPWARD.',
    }),
  },
  ...SC_PHASE,
  combos: [
    ['lightning_rod', 'parasol_lance'],
    ['canopy_dome', 'cyclone_vortex'],
  ],
  fallback: 'parasol_lance',
  chargeText: { monsoon_end: 'THE STORM ABOVE IT GROWS AND GROWS!' },
  fireWarn: { monsoon_end: 'THE MONSOON COMES DOWN NEXT TURN! ON EVERYONE!' },
};

/** TICKRAITH, supercharged: a grandfather clock, become the hour of doom. */
export const SC_TICKRAITH: EnemyDef = {
  id: 'sc_tickraith',
  name: 'DOOMCLOCK',
  subtitle: 'TICKRAITH, EVOLVED',
  maxHp: SC_HP - 150,
  attacks: {
    pendulum_wreck: A({ id: 'pendulum_wreck', name: 'PENDULUM WRECKER', dmg: 62, major: true, cd: 1, weight: 10, icon: 'i_pendulum', warn: 'THE PENDULUM SWINGS WIDER. WIDER. IT IS AIMED AT YOU.' }),
    brass_tomb: A({ id: 'brass_tomb', name: 'BRASS TOMB', dmg: 0, cd: 4, weight: 6, scaled: false, icon: 'i_shield', warn: 'ITS GLASS DOOR LOCKS. THE BRASS GROWS THICKER.' }),
    time_stop: A({ id: 'time_stop', name: 'TIME STOP', dmg: 18, cd: 4, weight: 6, icon: 'i_clock', warn: 'EVERY HAND ON ITS FACE POINTS AT YOU.' }),
    rewind_x: A({ id: 'rewind_x', name: 'REWIND', dmg: 0, phases: [2, 3], cd: 5, weight: 5, scaled: false, icon: 'i_rewind', warn: 'ITS HANDS START TO SPIN BACKWARDS.' }),
    midnight_toll: A({
      id: 'midnight_toll',
      name: 'THE MIDNIGHT TOLL',
      phases: [3],
      dmg: 13,
      hits: [12, 12, 12],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 220,
      icon: 'i_clock',
      warn: 'BOTH HANDS CREEP UP TOWARD TWELVE.',
    }),
  },
  ...SC_PHASE,
  combos: [
    ['time_stop', 'pendulum_wreck'],
    ['brass_tomb', 'pendulum_wreck'],
  ],
  fallback: 'pendulum_wreck',
  chargeText: { midnight_toll: 'THE CHIMES BEGIN. ONE. TWO. THREE...' },
  fireWarn: { midnight_toll: 'MIDNIGHT STRIKES NEXT TURN! TWELVE TOLLS!' },
};

export const SUPERCHARGED: Record<string, EnemyDef> = {
  sc_booheet: SC_BOOHEET,
  sc_shipwraith: SC_SHIPWRAITH,
  sc_hauntcorn: SC_HAUNTCORN,
  sc_umbrawl: SC_UMBRAWL,
  sc_tickraith: SC_TICKRAITH,
};

export const PRISON_FOES: Record<string, EnemyDef> = { skelwarden: SKELWARDEN, ...SUPERCHARGED };

/** Openers, finishers and follow-ups for the planner (same shape as the Titans' plans). */
export const PRISON_PLANS = {
  skelwarden: {
    openers: { 2: 'bone_rattle' } as Record<number, string>,
    // he counts heads every few turns, in both phases
    finisher: { id: 'lights_out', phase: 1, phases: [1, 2], first: 3 },
    followUps: { shackles: ['nightstick', 0.6], lockdown: ['key_lash', 0.4], bone_rattle: ['solitary', 0.5] } as Record<string, [string, number]>,
    comboPhase: 2,
    comboChance: 0.25,
  },
  sc_booheet: {
    openers: { 2: 'dread_howl', 3: 'peekaboo_x' } as Record<number, string>,
    finisher: { id: 'night_terror_x', phase: 3, first: 1 },
    followUps: { dread_howl: ['smother', 0.55], peekaboo_x: ['spook_storm', 0.5] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.35,
  },
  sc_shipwraith: {
    openers: { 2: 'batten_all', 3: 'barnacle_bastion' } as Record<number, string>,
    finisher: { id: 'dead_fleet', phase: 3, first: 1 },
    followUps: { batten_all: ['sunken_anchor', 0.7], barnacle_bastion: ['broadside_x', 0.4] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.35,
  },
  sc_hauntcorn: {
    openers: { 2: 'crow_swarm', 3: 'blood_moon' } as Record<number, string>,
    finisher: { id: 'hallowed_reaping', phase: 3, first: 1 },
    followUps: { corn_maze: ['crow_swarm', 0.5], blood_moon: ['straw_scythe', 0.5] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.35,
  },
  sc_umbrawl: {
    openers: { 2: 'lightning_rod', 3: 'cyclone_vortex' } as Record<number, string>,
    finisher: { id: 'monsoon_end', phase: 3, first: 1 },
    followUps: { lightning_rod: ['parasol_lance', 0.7], canopy_dome: ['cyclone_vortex', 0.4] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.35,
  },
  sc_tickraith: {
    openers: { 2: 'time_stop', 3: 'rewind_x' } as Record<number, string>,
    finisher: { id: 'midnight_toll', phase: 3, first: 1 },
    followUps: { time_stop: ['pendulum_wreck', 0.7], brass_tomb: ['pendulum_wreck', 0.3] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.3,
  },
};

/** The World 1 spirit a guard is holding, supercharged. */
export const scFor = (starter: string | null | undefined) => 'sc_' + (starter && ('sc_' + starter) in SUPERCHARGED ? starter : 'booheet');

/**
 * Every party fights the prison with different creatures, and they are not equally
 * strong against every jailer, so each foe is sized to the party it meets: a
 * multiplier per party (or per creature, multiplied together), fitted with `sim/_w5bis2.ts`. It grows
 * the foe's health fully and its hits a little more gently.
 */
export const PRISON_TUNE: Record<string, Record<string, number>> = {
  skelwarden: { scorvlet: 1.077, widowling: 1.068, ironbud: 1.017 },
  sc_booheet: { 'glowbell+scorvlet': 1.205, 'glowbell+widowling': 1.205, 'glowbell+ironbud': 1.296, 'hammerfin+scorvlet': 1.103, 'hammerfin+widowling': 0.99, 'hammerfin+ironbud': 1.239, 'bubblotl+scorvlet': 1.307, 'bubblotl+widowling': 1.307, 'bubblotl+ironbud': 1.341, 'glidray+scorvlet': 1.149, 'glidray+widowling': 1.137, 'glidray+ironbud': 1.251 },
  sc_shipwraith: { 'glowbell+scorvlet': 1.013, 'glowbell+widowling': 1.035, 'glowbell+ironbud': 1.058, 'hammerfin+scorvlet': 0.888, 'hammerfin+widowling': 0.865, 'hammerfin+ironbud': 0.967, 'bubblotl+scorvlet': 1.069, 'bubblotl+widowling': 1.16, 'bubblotl+ironbud': 1.115, 'glidray+scorvlet': 1.001, 'glidray+widowling': 1.058, 'glidray+ironbud': 1.069 },
  sc_hauntcorn: { 'glowbell+scorvlet': 0.843, 'glowbell+widowling': 0.956, 'glowbell+ironbud': 0.877, 'hammerfin+scorvlet': 0.786, 'hammerfin+widowling': 0.809, 'hammerfin+ironbud': 0.854, 'bubblotl+scorvlet': 0.877, 'bubblotl+widowling': 1.001, 'bubblotl+ironbud': 0.922, 'glidray+scorvlet': 0.888, 'glidray+widowling': 0.979, 'glidray+ironbud': 0.911 },
  sc_umbrawl: { 'glowbell+scorvlet': 1.183, 'glowbell+widowling': 1.194, 'glowbell+ironbud': 1.183, 'hammerfin+scorvlet': 1.013, 'hammerfin+widowling': 0.967, 'hammerfin+ironbud': 1.183, 'bubblotl+scorvlet': 1.149, 'bubblotl+widowling': 1.205, 'bubblotl+ironbud': 1.205, 'glidray+scorvlet': 1.069, 'glidray+widowling': 1.058, 'glidray+ironbud': 1.149 },
  sc_tickraith: { 'glowbell+scorvlet': 0.888, 'glowbell+widowling': 1.001, 'glowbell+ironbud': 1.001, 'hammerfin+scorvlet': 0.854, 'hammerfin+widowling': 0.933, 'hammerfin+ironbud': 1.047, 'bubblotl+scorvlet': 1.092, 'bubblotl+widowling': 1.239, 'bubblotl+ironbud': 1.183, 'glidray+scorvlet': 0.979, 'glidray+widowling': 1.16, 'glidray+ironbud': 1.126 },
};

export function prisonTune(foe: string, party: string[]): { hp: number; dmg: number } {
  const t = PRISON_TUNE[foe];
  if (!t) return { hp: 1, dmg: 1 };
  const s = t[party.join('+')] ?? t[[...party].reverse().join('+')] ?? party.reduce((m, id) => m * (t[id] ?? 1), 1);
  return { hp: s, dmg: 1 + (s - 1) * 0.6 };
}
