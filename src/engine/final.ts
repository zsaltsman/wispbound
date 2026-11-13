import { FINAL_FIT } from './finalTune';
import type { BossAttackDef, EnemyDef } from './boss';

// THE GOD OF DEATH. The last fight of the whole adventure, in four bodies.
//
//  gr1  THE GRIM REAPER          a traditional reaper, one scythe. You have your three
//                                spirits back and nothing else. He reads the field: a mark
//                                before the big swing, a hand that roots you, a step out of
//                                the shadows behind your guard, and a harvest he counts down.
//  gr2  THE GRIM REAPER (BUFF)   he will not accept losing to a prisoner. Enormous, physical,
//                                five of you now. He punishes a team that turtles (Bone
//                                Breaker tears shields and guards away) and he flexes behind
//                                a wall of muscle.
//  gr3  THE GRIM REAPER (TRUE)   legs, wings, a crown and two scythes. Four sections, each
//                                ending at a milestone (80 / 60 / 40 / 20%): the battle stops
//                                there, help arrives, everyone is restored. He burns his own
//                                curses away when you stack too many.
//  gr4  FULLY POWERED            back to full health against three supercharged spirits and
//                                the guardian. He learns your rhythm (repeat yourself and he
//                                is ready), shrouds himself in his wings, and ends everything
//                                in FINAL EXTINCTION if you let him.

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

// ---------------------------------------------------------------- 1: THE GRIM REAPER

export const GR1: EnemyDef = {
  id: 'gr1',
  name: 'THE GRIM REAPER',
  subtitle: 'RULER OF DEATH',
  maxHp: 1300,
  attacks: {
    g_reap: A({ id: 'g_reap', name: 'SOUL REAP', dmg: 52, major: true, cd: 2, weight: 9, icon: 'w4_slash', warn: 'HE DRAWS THE SCYTHE BACK FOR A WIDE, SLOW ARC. IT WILL REACH THE BENCH.' }),
    g_grasp: A({ id: 'g_grasp', name: "DEATH'S GRASP", dmg: 30, cd: 3, weight: 8, icon: 'w_grasp', warn: 'PALE HANDS PUSH UP THROUGH THE FLOOR AROUND YOU.' }),
    g_step: A({ id: 'g_step', name: 'SHADOW STEP', dmg: 21, hits: [2, 2, 3], cd: 2, weight: 8, icon: 'w4_step', warn: 'HE THINS OUT INTO SMOKE. HE IS GOING TO COME FROM BEHIND YOUR GUARD.' }),
    g_drain: A({ id: 'g_drain', name: 'SOUL DRAIN', dmg: 24, hits: [2, 2, 2], cd: 3, weight: 7, icon: 'w4_drain', warn: 'HE OPENS ONE HAND. SOMETHING IN YOUR CHEST PULLS TOWARD IT.' }),
    g_mark: A({ id: 'g_mark', name: 'MARKED FOR DEATH', dmg: 14, cd: 4, weight: 6, icon: 'w_gaze', warn: 'HE POINTS AT YOU. JUST POINTS.' }),
    g_knell: A({ id: 'g_knell', name: 'DEATH KNELL', phases: [2, 3], dmg: 20, cd: 4, weight: 6, icon: 'i_wail', warn: 'A BELL TOLLS SOMEWHERE FAR BELOW THE PRISON.' }),
    g_storm: A({ id: 'g_storm', name: 'SCYTHE STORM', phases: [3], dmg: 15, hits: [5, 5, 5], major: true, cd: 3, weight: 7, icon: 'w_whirl', warn: 'THE SCYTHE STARTS TO SPIN IN HIS HANDS. FASTER. FASTER.' }),
    g_harvest: A({
      id: 'g_harvest',
      name: 'FINAL HARVEST',
      dmg: 138,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 190,
      icon: 'w4_final',
      warn: 'HE RAISES THE SCYTHE HIGH OVER HIS HEAD AND HOLDS IT THERE.',
    }),
  },
  phaseAt: [0.6, 0.3],
  phaseMult: [1, 1.12, 1.24],
  combos: [
    ['g_mark', 'g_reap'],
    ['g_grasp', 'g_step'],
  ],
  fallback: 'g_reap',
  chargeText: { g_harvest: 'THE BLADE CATCHES A LIGHT THAT IS NOT IN THE ROOM. HIT HIM BEFORE IT FALLS!' },
  fireWarn: { g_harvest: 'THE FINAL HARVEST FALLS NEXT TURN! GUARD, OR BREAK HIS STANCE!' },
};

// ---------------------------------------------------------------- 2: THE BUFF REAPER

export const GR2: EnemyDef = {
  id: 'gr2',
  name: 'THE GRIM REAPER',
  subtitle: 'HE REFUSES TO LOSE',
  maxHp: 1500,
  attacks: {
    b_scythe: A({ id: 'b_scythe', name: 'TITANIC SCYTHE', dmg: 46, major: true, cd: 2, weight: 9, icon: 'w4_slash', warn: 'HE HEFTS THE SCYTHE IN ONE HAND LIKE A TWIG. IT WILL HIT EVERYONE.' }),
    b_punch: A({ id: 'b_punch', name: 'DEATH PUNCH', dmg: 82, major: true, cd: 2, weight: 8, icon: 'w_fist', warn: 'HE DRAWS ONE ENORMOUS FIST ALL THE WAY BACK.' }),
    b_quake: A({ id: 'b_quake', name: 'GRAVEQUAKE', dmg: 32, cd: 3, weight: 7, icon: 'w_quake', warn: 'HE LIFTS BOTH FISTS OVER HIS HEAD. THE FLOOR IS GOING TO BREAK.' }),
    b_crush: A({ id: 'b_crush', name: 'SOUL CRUSH', dmg: 25, hits: [3, 3, 3], major: true, cd: 3, weight: 7, icon: 'w_grip', warn: 'HE REACHES OUT. IF THAT HAND CLOSES, IT WILL NOT LET GO.' }),
    b_breaker: A({ id: 'b_breaker', name: 'BONE BREAKER', dmg: 42, cd: 3, weight: 3, icon: 'w_breaker', warn: 'HE CRACKS HIS KNUCKLES AT YOUR DEFENCES. ALL OF THEM.' }),
    b_flex: A({ id: 'b_flex', name: 'MORTAL FLEX', dmg: 0, cd: 5, weight: 5, scaled: false, icon: 'w_fortress', warn: 'HE PLANTS HIS FEET AND FLEXES. EVERYTHING. AT ONCE.' }),
    b_roar: A({ id: 'b_roar', name: 'DEATH ROAR', phases: [2, 3], dmg: 18, cd: 4, weight: 6, icon: 'i_roar', warn: 'HIS CHEST SWELLS UP LIKE A BARREL.' }),
    b_stomp: A({ id: 'b_stomp', name: 'GRAVE STOMP', phases: [3], dmg: 34, hits: [2, 2, 2], cd: 2, weight: 8, icon: 'w_quake', warn: 'HE STAMPS ONCE. THEN AGAIN. THE WALLS ARE COMING DOWN.' }),
    b_fury: A({
      id: 'b_fury',
      name: "REAPER'S FURY",
      phases: [2, 3],
      dmg: 14,
      hits: [8, 8, 9],
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 260,
      icon: 'w_frenzy',
      warn: 'HE ROLLS HIS SHOULDERS AND CRACKS HIS NECK. HE IS ABOUT TO LOSE IT.',
    }),
  },
  phaseAt: [0.6, 0.3],
  phaseMult: [1, 1.12, 1.25],
  combos: [
    ['b_roar', 'b_punch'],
    ['b_quake', 'b_scythe'],
    ['b_breaker', 'b_punch'],
  ],
  fallback: 'b_scythe',
  chargeText: { b_fury: 'HE IS SHAKING WITH RAGE. HIT HIM HARD ENOUGH TO KNOCK HIM OFF BALANCE!' },
  fireWarn: { b_fury: "REAPER'S FURY NEXT TURN! A STORM OF FISTS AND STEEL!" },
};

// ---------------------------------------------------------------- 3: THE TRUE FORM

export const GR3: EnemyDef = {
  id: 'gr3',
  name: 'THE GRIM REAPER',
  subtitle: 'THE GOD OF DEATH',
  maxHp: 3400,
  milestones: true,
  attacks: {
    t_cross: A({ id: 't_cross', name: 'CROSSED SCYTHES', phases: [1, 2, 3, 4], dmg: 36, hits: [2, 2, 2, 2], major: true, cd: 1, weight: 9, icon: 'w_blades', warn: 'BOTH SCYTHES CROSS IN FRONT OF HIS CROWN.' }),
    t_lance: A({ id: 't_lance', name: 'LEG LANCE', phases: [1, 2, 3, 4], dmg: 15, hits: [4, 4, 4, 5], cd: 2, weight: 8, icon: 'w_impale', warn: 'THE LEGS ON HIS BACK ALL TURN THEIR POINTS TOWARD YOU.' }),
    t_gale: A({ id: 't_gale', name: 'WING GALE', phases: [1, 2, 3, 4], dmg: 26, cd: 3, weight: 7, icon: 'i_wing', warn: 'HIS WINGS OPEN, WIDER THAN THE ROOM.' }),
    t_harvest: A({ id: 't_harvest', name: 'SOUL HARVEST', phases: [1, 2, 3, 4], dmg: 24, hits: [2, 2, 2, 2], cd: 3, weight: 7, icon: 'w4_drain', warn: 'THE CROWN GLOWS. HE IS HUNGRY.' }),
    t_crown: A({ id: 't_crown', name: 'CROWN FLARE', phases: [1, 2, 3, 4], dmg: 0, cd: 4, weight: 2, scaled: false, icon: 'w_judgment', warn: 'THE CROWN BURNS WHITE. YOUR CURSES ARE SLIDING OFF HIM.' }),
    t_storm: A({ id: 't_storm', name: 'LEG STORM', phases: [2, 3, 4], dmg: 9, hits: [8, 8, 8, 9], major: true, cd: 3, weight: 7, icon: 'w_impale', warn: 'EVERY LEG RISES AT ONCE.' }),
    t_mark: A({ id: 't_mark', name: "DEATH'S GAZE", phases: [3, 4], dmg: 16, cd: 4, weight: 6, icon: 'w_gaze', warn: 'HE LOOKS AT YOU. FOR THE FIRST TIME, HE REALLY LOOKS.' }),
    t_wings: A({
      id: 't_wings',
      name: 'WINGS OF THE ABYSS',
      phases: [1, 2, 3, 4],
      dmg: 122,
      major: true,
      cd: 5,
      weight: 0,
      charge: true,
      breakNeed: 250,
      icon: 'i_wing',
      warn: 'HE RISES ON HIS WINGS AND WRAPS THEM ROUND HIMSELF.',
    }),
    t_eclipse: A({
      id: 't_eclipse',
      name: 'ECLIPSE',
      phases: [4],
      dmg: 150,
      major: true,
      cd: 6,
      weight: 0,
      charge: true,
      breakNeed: 300,
      icon: 'i_moon',
      warn: 'THE LIGHT GOES OUT OF THE WHOLE WORLD, ONE PIECE AT A TIME.',
    }),
  },
  phaseAt: [0.8, 0.6, 0.4, 0.2],
  phaseMult: [1, 1.07, 1.14, 1.22, 1.22],
  combos: [
    ['t_lance', 't_cross'],
    ['t_mark', 't_cross'],
    ['t_gale', 't_harvest'],
  ],
  fallback: 't_cross',
  chargeText: {
    t_wings: 'THE WINGS CLOSE INTO A BLACK SHELL. HIT IT BEFORE IT OPENS!',
    t_eclipse: 'THE CROWN IS SWALLOWING THE LIGHT. BREAK IT BEFORE IT IS ALL GONE!',
  },
  fireWarn: {
    t_wings: 'THE WINGS OF THE ABYSS OPEN NEXT TURN! IT WILL REACH EVERYONE!',
    t_eclipse: 'THE ECLIPSE FALLS NEXT TURN!',
  },
};

// ---------------------------------------------------------------- 4: FULLY POWERED

export const GR4: EnemyDef = {
  id: 'gr4',
  name: 'THE GRIM REAPER',
  subtitle: 'FULLY POWERED',
  maxHp: 2100,
  attacks: {
    f_twin: A({ id: 'f_twin', name: 'TWIN REAP', dmg: 23, hits: [4, 4, 5], major: true, cd: 1, weight: 9, icon: 'w_blades', warn: 'BOTH SCYTHES DROP LOW. HE IS GOING TO SPIN THEM.' }),
    f_spider: A({ id: 'f_spider', name: 'SPIDER EXECUTION', dmg: 19, hits: [3, 3, 4], major: true, cd: 2, weight: 8, icon: 'w_impale', warn: 'EACH LEG PICKS ONE OF YOU.' }),
    f_devour: A({ id: 'f_devour', name: 'SOUL DEVOURER', dmg: 28, hits: [2, 2, 2], cd: 3, weight: 7, icon: 'w4_drain', warn: 'HIS JAW OPENS. AND OPENS. HE WANTS YOUR STRENGTH.' }),
    f_legs: A({ id: 'f_legs', name: 'LEG CAGE', phases: [2, 3], dmg: 16, hits: [3, 3, 3], cd: 3, weight: 7, icon: 'w_web', warn: 'THE LEGS COME DOWN AROUND YOU LIKE THE BARS OF A CELL.' }),
    f_chains: A({ id: 'f_chains', name: 'SOUL CHAINS', phases: [2, 3], dmg: 20, cd: 4, weight: 6, icon: 'w4_chains', warn: 'CHAINS OF PALE LIGHT RISE OUT OF THE FLOOR.' }),
    f_shroud: A({ id: 'f_shroud', name: 'WING SHROUD', dmg: 0, cd: 5, weight: 5, scaled: false, icon: 'i_wing', warn: 'HE FOLDS HIS WINGS AROUND HIMSELF.' }),
    f_foresee: A({ id: 'f_foresee', name: 'DEATH FORESEEN', dmg: 0, cd: 4, weight: 0, scaled: false, icon: 'w_gaze', warn: 'HE HAS BEEN WATCHING YOU. HE KNOWS WHAT YOU ARE GOING TO DO.' }),
    f_descent: A({
      id: 'f_descent',
      name: 'WINGED DESCENT',
      dmg: 108,
      major: true,
      cd: 5,
      weight: 5,
      charge: true,
      breakNeed: 230,
      icon: 'i_dive',
      warn: 'HE BEATS HIS WINGS ONCE AND RISES INTO THE DARK ABOVE THE ARENA.',
    }),
    f_crown: A({
      id: 'f_crown',
      name: 'CROWN OF DEATH',
      phases: [2, 3],
      dmg: 48,
      major: true,
      cd: 5,
      weight: 5,
      charge: true,
      breakNeed: 280,
      icon: 'w_judgment',
      warn: 'THE CROWN LIFTS OFF HIS HEAD AND HANGS IN THE AIR, BURNING.',
    }),
    f_extinction: A({
      id: 'f_extinction',
      name: 'FINAL EXTINCTION',
      phases: [3],
      dmg: 17,
      hits: [9, 9, 9],
      major: true,
      cd: 6,
      weight: 0,
      charge: true,
      breakNeed: 400,
      icon: 'i_skull',
      warn: 'LEGS. WINGS. BOTH SCYTHES. EVERYTHING HE HAS, ALL AT ONCE.',
    }),
  },
  phaseAt: [0.66, 0.33],
  phaseMult: [1, 1.12, 1.24],
  combos: [
    ['f_legs', 'f_twin'],
    ['f_chains', 'f_spider'],
    ['f_devour', 'f_twin'],
  ],
  fallback: 'f_twin',
  chargeText: {
    f_descent: 'HE IS SOMEWHERE ABOVE YOU IN THE DARK. HIT HIM WHILE YOU CAN STILL SEE HIM!',
    f_crown: 'THE CROWN IS BURNING BRIGHTER AND BRIGHTER. KNOCK IT DOWN!',
    f_extinction: 'THE WHOLE DOMAIN SHAKES. EVERY PART OF HIM IS POINTED AT YOU. BREAK IT!',
  },
  fireWarn: {
    f_descent: 'HE DIVES NEXT TURN! BRACE!',
    f_crown: 'THE CROWN OF DEATH FALLS ON EVERYONE NEXT TURN!',
    f_extinction: 'FINAL EXTINCTION NEXT TURN! GUARD EVERYTHING YOU HAVE!',
  },
};

export const FINAL_FOES: Record<string, EnemyDef> = { gr1: GR1, gr2: GR2, gr3: GR3, gr4: GR4 };
// every attack has a hit count for every phase (the true form has five); the true form
// faces five of you (and a helper), so its blows land harder
const BASE_DMG: Record<string, number> = { gr1: 1, gr2: 1, gr3: 1.7, gr4: 1 };
for (const [fid, e] of Object.entries(FINAL_FOES))
  for (const a of Object.values(e.attacks)) {
    a.dmg = Math.round(a.dmg * BASE_DMG[fid]);
    const h = [...a.hits];
    while (h.length < 5) h.push(h[h.length - 1]);
    a.hits = h;
  }
export type FinalFoeId = 'gr1' | 'gr2' | 'gr3' | 'gr4';
export const isFinal = (id: string) => id in FINAL_FOES;

/** Openers, finishers and follow-ups for the planner (the same shape as the Titans' plans). */
export const FINAL_PLANS = {
  gr1: {
    openers: { 2: 'g_knell', 3: 'g_storm' } as Record<number, string>,
    finisher: { id: 'g_harvest', phase: 1, phases: [1, 2, 3], first: 3 },
    followUps: { g_mark: ['g_reap', 0.75], g_grasp: ['g_drain', 0.45], g_knell: ['g_step', 0.5] } as Record<string, [string, number]>,
    comboPhase: 3,
    comboChance: 0.3,
  },
  gr2: {
    openers: { 2: 'b_roar', 3: 'b_flex' } as Record<number, string>,
    finisher: { id: 'b_fury', phase: 2, phases: [2, 3], first: 2 },
    followUps: { b_flex: ['b_punch', 0.7], b_quake: ['b_crush', 0.5], b_roar: ['b_scythe', 0.5] } as Record<string, [string, number]>,
    comboPhase: 2,
    comboChance: 0.28,
  },
  gr3: {
    openers: { 2: 't_storm', 3: 't_mark', 4: 't_eclipse' } as Record<number, string>,
    finisher: { id: 't_wings', phase: 1, phases: [1, 2, 3, 4], first: 3 },
    followUps: { t_lance: ['t_cross', 0.6], t_gale: ['t_harvest', 0.4], t_mark: ['t_cross', 0.7] } as Record<string, [string, number]>,
    comboPhase: 2,
    comboChance: 0.3,
  },
  gr4: {
    openers: { 2: 'f_chains', 3: 'f_extinction' } as Record<number, string>,
    finisher: { id: 'f_extinction', phase: 3, first: 4 },
    followUps: { f_spider: ['f_twin', 0.4], f_chains: ['f_spider', 0.6], f_legs: ['f_twin', 0.7], f_shroud: ['f_devour', 0.5] } as Record<string, [string, number]>,
    comboPhase: 2,
    comboChance: 0.35,
  },
};

/**
 * Each party meets the Reaper with different creatures, so each fight is sized to the
 * party: a multiplier keyed by the three spirits (and, from the second fight on, the
 * guardian). Fitted with `sim/_final.ts`. It grows his hits fully, his health a little (so the fights stay the same length).
 */
export const FINAL_TUNE: Record<string, Record<string, number>> = {
  gr1: { ...FINAL_FIT.gr1 },
  gr2: { ...FINAL_FIT.gr2 },
  gr3: { ...FINAL_FIT.gr3 },
  gr4: { ...FINAL_FIT.gr4 },
};

/** The tuning key: the player's own three spirits (by original id), then the guardian. */
export function finalKey(party: { id: string; base?: string; guardian?: boolean }[]): string {
  const own = party.filter((c) => !c.guardian && (c.base ?? c.id) !== 'flamora').map((c) => c.base ?? c.id);
  const g = party.find((c) => c.guardian);
  return [...own, ...(g ? [g.base ?? g.id] : [])].join('+');
}

export function finalTune(foe: string, party: { id: string; base?: string; guardian?: boolean }[]): { hp: number; dmg: number } {
  const t = FINAL_TUNE[foe];
  if (!t) return { hp: 1, dmg: 1 };
  const s = t[finalKey(party)] ?? t['*'] ?? 1;
  return { hp: 1 + (s - 1) * 0.4, dmg: s };
}

// ---------------------------------------------------------------- the reinforcements

/**
 * How a helper's spirit fights on its own: one entry per ability, in order. The helper
 * picks for itself every round (break a charge, protect you from what is coming, patch
 * you up, curse the Reaper, or just hit him), and never takes your turn.
 */
export type AllyFx =
  | { fx: 'hit'; v: number; n?: number; crit?: number }
  | { fx: 'hex'; v: number; n?: number }
  | { fx: 'burn'; v: number }
  | { fx: 'weaken'; v: number }
  | { fx: 'snare' }
  | { fx: 'spook' }
  | { fx: 'delay' }
  | { fx: 'shield'; v: number }
  | { fx: 'guard'; v: number }
  | { fx: 'heal'; v: number }
  | { fx: 'team'; v: number }
  | { fx: 'canopy' }
  | { fx: 'en'; v: number }
  | { fx: 'big'; v: number; n?: number };

export const ALLY_KIT: Record<string, AllyFx[]> = {
  booheet: [{ fx: 'hex', v: 26 }, { fx: 'weaken', v: 14 }, { fx: 'spook' }, { fx: 'big', v: 64 }],
  shipwraith: [{ fx: 'hit', v: 30 }, { fx: 'shield', v: 60 }, { fx: 'guard', v: 0.3 }, { fx: 'big', v: 70 }],
  hauntcorn: [{ fx: 'hit', v: 32 }, { fx: 'heal', v: 0.14 }, { fx: 'en', v: 3 }, { fx: 'team', v: 0.12 }],
  umbrawl: [{ fx: 'hit', v: 30, crit: 0.25 }, { fx: 'hit', v: 17, n: 3 }, { fx: 'canopy' }, { fx: 'big', v: 92 }],
  tickraith: [{ fx: 'hit', v: 33 }, { fx: 'guard', v: 0.35 }, { fx: 'delay' }, { fx: 'heal', v: 0.2 }],
  glowbell: [{ fx: 'hex', v: 24 }, { fx: 'shield', v: 50 }, { fx: 'spook' }, { fx: 'big', v: 72 }],
  hammerfin: [{ fx: 'hit', v: 34 }, { fx: 'guard', v: 0.3 }, { fx: 'weaken', v: 16 }, { fx: 'big', v: 84 }],
  bubblotl: [{ fx: 'hit', v: 11, n: 3 }, { fx: 'heal', v: 0.15 }, { fx: 'delay' }, { fx: 'big', v: 80 }],
  glidray: [{ fx: 'hit', v: 30, crit: 0.3 }, { fx: 'shield', v: 45 }, { fx: 'hit', v: 20, n: 2 }, { fx: 'big', v: 88 }],
  scorvlet: [{ fx: 'burn', v: 22 }, { fx: 'shield', v: 45 }, { fx: 'weaken', v: 12 }, { fx: 'big', v: 78 }],
  widowling: [{ fx: 'hit', v: 15, n: 2, crit: 0.3 }, { fx: 'weaken', v: 14 }, { fx: 'snare' }, { fx: 'big', v: 10, n: 8 }],
  ironbud: [{ fx: 'hit', v: 32 }, { fx: 'guard', v: 0.35 }, { fx: 'team', v: 0.12 }, { fx: 'big', v: 88 }],
};

export interface AllyDef {
  who: 'pipwick' | 'oracle' | 'ayla';
  /** what the helper is called in captions */
  name: string;
  /** the helper's spirit (creature id) */
  creature: string;
  /** how hard the helper's spirit hits, next to one of yours */
  power: number;
}

export const ALLY_NAMES: Record<AllyDef['who'], string> = { pipwick: 'PIPWICK', oracle: 'MADAME ORACLE', ayla: 'AYLA' };
export const ALLY_POWER: Record<AllyDef['who'], number> = { pipwick: 0.72, oracle: 0.78, ayla: 0.84 };
