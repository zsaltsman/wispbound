import type { BossAttackDef, EnemyDef } from './boss';
import { SPIRITS, type SpiritId } from './spirits';

// World 3: the three mechanical Titans sent against Bacchus Key by a teenage
// Spirit Tamer. Each fights two creatures at once, like the Kraken. They differ
// in style, not just size: Scorvex is a brawler with a furnace tail, Widowmaker
// buries you in blades and webbing, and Ironclad is a fortress with a hammer,
// commanded by its tamer. Phases are told by behaviour, never by banners.

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

// ---------------------------------------------------------------- SCORVEX

export const SCORVEX: EnemyDef = {
  id: 'scorvex',
  name: 'SCORVEX',
  subtitle: 'THE FURNACE-TAILED TITAN',
  maxHp: 1320,
  attacks: {
    claw: A({ id: 'claw', name: 'STEEL CLAW', dmg: 42, cd: 1, weight: 10, icon: 'w_claw', warn: 'A STEEL CLAW SCRAPES THE STREET.' }),
    pounce: A({ id: 'pounce', name: 'STEEL POUNCE', dmg: 70, major: true, cd: 2, weight: 8, icon: 'w_pounce', warn: 'IT CROUCHES LOW, ALL FOUR LEGS COILED...' }),
    ground_breaker: A({ id: 'ground_breaker', name: 'GROUND BREAKER', dmg: 26, hits: [2, 2, 2], cd: 2, weight: 8, icon: 'w_breaker', warn: 'IT REARS UP ON ITS HIND LEGS.' }),
    furnace_tail: A({
      id: 'furnace_tail',
      name: 'FURNACE TAIL',
      dmg: 118,
      major: true,
      cd: 4,
      weight: 6,
      charge: true,
      breakNeed: 100,
      icon: 'w_furnace',
      warn: 'THE TAIL ARCS OVERHEAD. THE FURNACE ROARS.',
    }),
    molten_sweep: A({ id: 'molten_sweep', name: 'MOLTEN SWEEP', phases: [2], dmg: 16, hits: [3, 4, 4], cd: 3, weight: 8, icon: 'w_molten', warn: 'MOLTEN SLAG DRIPS FROM THE STINGER.' }),
    smokestack: A({ id: 'smokestack', name: 'SMOKESTACK', phases: [2], dmg: 12, cd: 4, weight: 5, icon: 'w_smoke', warn: 'BLACK SMOKE POURS FROM ITS VENTS.' }),
  },
  phaseAt: [0.5],
  phaseMult: [1, 1.16],
  combos: [
    ['claw', 'pounce'],
    ['smokestack', 'ground_breaker'],
  ],
  fallback: 'claw',
  chargeText: { furnace_tail: 'THE FURNACE TAIL GLOWS WHITE-HOT!' },
  fireWarn: { furnace_tail: 'THE TAIL COMES DOWN NEXT TURN!' },
};

// ---------------------------------------------------------------- WIDOWMAKER

export const WIDOWMAKER: EnemyDef = {
  id: 'widowmaker',
  name: 'WIDOWMAKER',
  subtitle: 'THE EIGHT-BLADED TITAN',
  maxHp: 1850,
  attacks: {
    lunge: A({ id: 'lunge', name: 'LEG LUNGE', dmg: 48, cd: 1, weight: 10, icon: 'w_lunge', warn: 'ONE BLADED LEG DRAWS BACK.' }),
    blade_barrage: A({ id: 'blade_barrage', name: 'BLADE BARRAGE', dmg: 14, hits: [3, 4, 5], cd: 1, weight: 10, icon: 'w_blades', warn: 'ITS FRONT LEGS BEGIN TO SCISSOR.' }),
    web_trap: A({ id: 'web_trap', name: 'WEB TRAP', dmg: 10, cd: 3, weight: 7, icon: 'w_web', warn: 'A SPINNERET WHIRS INTO POSITION.' }),
    impale: A({
      id: 'impale',
      name: 'GROUND IMPALEMENT',
      dmg: 120,
      major: true,
      cd: 4,
      weight: 6,
      charge: true,
      breakNeed: 110,
      icon: 'w_impale',
      warn: 'IT RISES ON FOUR LEGS. THE OTHER FOUR LIFT HIGH.',
    }),
    eight_leg: A({ id: 'eight_leg', name: 'EIGHT-LEG ASSAULT', phases: [2, 3], dmg: 9, hits: [8, 8, 8], major: true, cd: 3, weight: 8, icon: 'w_eight', warn: 'EVERY LEG TURNS TOWARD YOU AT ONCE.' }),
    frenzy: A({
      id: 'frenzy',
      name: 'MECHANICAL FRENZY',
      phases: [3],
      dmg: 18,
      hits: [7, 7, 7],
      major: true,
      cd: 5,
      weight: 0, // scheduled, never picked at random
      charge: true,
      breakNeed: 140,
      icon: 'w_frenzy',
      warn: 'ITS GEARS SCREAM. IT IS WINDING ITSELF UP.',
    }),
  },
  phaseAt: [0.66, 0.33],
  phaseMult: [1, 1.14, 1.28],
  combos: [
    ['web_trap', 'eight_leg'],
    ['lunge', 'blade_barrage'],
    ['blade_barrage', 'lunge'],
  ],
  fallback: 'lunge',
  chargeText: {
    impale: 'FOUR BLADED LEGS HANG IN THE AIR, AIMED STRAIGHT DOWN!',
    frenzy: 'WIDOWMAKER SPINS UP EVERY MOTOR IT HAS!',
  },
  fireWarn: { impale: 'THE LEGS DRIVE DOWN NEXT TURN!', frenzy: 'THE FRENZY BREAKS LOOSE NEXT TURN!' },
};

// ---------------------------------------------------------------- IRONCLAD

export const IRONCLAD: EnemyDef = {
  id: 'ironclad',
  name: 'IRONCLAD',
  subtitle: 'THE HAMMER OF THE SPIRIT TAMER',
  maxHp: 1800,
  attacks: {
    punch: A({ id: 'punch', name: 'IRON FIST', dmg: 40, cd: 1, weight: 9, icon: 'w_fist', warn: 'AN ARMORED FIST DRAWS BACK.' }),
    hammer: A({ id: 'hammer', name: 'IRON HAMMER', dmg: 84, major: true, cd: 2, weight: 9, icon: 'w_hammer', warn: 'THE HAMMER RISES. AND RISES.' }),
    quake: A({ id: 'quake', name: 'GROUNDQUAKE', dmg: 24, hits: [2, 2, 2], cd: 2, weight: 8, icon: 'w_quake', warn: 'IT LIFTS ONE ENORMOUS FOOT.' }),
    fortress: A({ id: 'fortress', name: 'FORTRESS GUARD', phases: [1, 2], dmg: 0, hits: [0, 0, 0], cd: 3, weight: 6, icon: 'w_fortress', warn: 'ITS ARMOR PLATES SLIDE TOGETHER.' }),
    command: A({ id: 'command', name: "TAMER'S ORDER", phases: [2, 3], dmg: 0, hits: [0, 0, 0], cd: 4, weight: 4, icon: 'w_order', warn: 'MILO RAISES HIS WHISTLE.' }),
    charge: A({ id: 'charge', name: 'TITAN CHARGE', phases: [2, 3], dmg: 70, major: true, cd: 3, weight: 6, icon: 'w_tcharge', warn: 'IT LOWERS ITS SHOULDER. THE GROUND GOES QUIET.' }),
    grip: A({ id: 'grip', name: 'CRUSHING GRIP', phases: [2, 3], dmg: 20, hits: [3, 3, 3], cd: 3, weight: 7, icon: 'w_grip', warn: 'A HUGE ARMORED HAND OPENS.' }),
    judgment: A({
      id: 'judgment',
      name: 'FINAL JUDGMENT',
      phases: [3],
      dmg: 120,
      major: true,
      cd: 5,
      weight: 0, // scheduled, never picked at random
      charge: true,
      breakNeed: 190,
      icon: 'w_judgment',
      warn: 'IRONCLAD RAISES THE HAMMER WITH BOTH HANDS.',
    }),
  },
  phaseAt: [0.7, 0.38],
  phaseMult: [1, 1.12, 1.2],
  combos: [
    ['punch', 'hammer'],
    ['quake', 'charge'],
    ['grip', 'hammer'],
  ],
  fallback: 'punch',
  chargeText: { judgment: 'THE HAMMER GLOWS. THE WHOLE STREET STARTS TO SHAKE!' },
  fireWarn: { judgment: 'THE HAMMER FALLS NEXT TURN! EVERYONE WILL FEEL IT!' },
};

// (World 4's guardians and bosses share the Titans' staging: see spirits.ts)
export const TITANS: Record<string, EnemyDef> = { scorvex: SCORVEX, widowmaker: WIDOWMAKER, ironclad: IRONCLAD, ...SPIRITS };
export type TitanId = 'scorvex' | 'widowmaker' | 'ironclad' | SpiritId;
export const isTitan = (id: string): id is TitanId => id in TITANS;
