import type { BossAttackDef, EnemyDef } from './boss';

// The Kraken: the thing beneath Saltwash, and World 2's final boss. Fought by
// two creatures at once. Three phases, told apart by behaviour, not banners:
// tentacles first, then the abyss (the water rises), then the whole creature.

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

export const KRAKEN_ATTACKS: Record<string, BossAttackDef> = {
  slam: A({ id: 'slam', name: 'TENTACLE SLAM', dmg: 70, major: true, cd: 2, weight: 10, icon: 'w_slam', warn: 'A TENTACLE RISES HIGH OVERHEAD...' }),
  sweep: A({ id: 'sweep', name: 'ABYSSAL SWEEP', dmg: 15, hits: [3, 4, 5], cd: 1, weight: 10, icon: 'w_sweep', warn: 'TENTACLES COIL BACK ACROSS THE FLOOR.' }),
  ink: A({ id: 'ink', name: 'INK BURST', dmg: 18, cd: 3, weight: 7, icon: 'w_ink', warn: 'ITS BODY DARKENS. SOMETHING SWELLS INSIDE.' }),
  whirlpool: A({ id: 'whirlpool', name: 'WHIRLPOOL', phases: [2, 3], dmg: 16, hits: [2, 2, 3], cd: 3, weight: 8, icon: 'w_whirlpool', warn: 'THE WATER BEGINS TO TURN.' }),
  grasp: A({ id: 'grasp', name: 'CRUSHING GRASP', phases: [2, 3], dmg: 24, hits: [2, 2, 2], cd: 3, weight: 8, icon: 'w_grasp', warn: 'A TENTACLE SLIDES SILENTLY CLOSER.' }),
  rupture: A({
    id: 'rupture',
    name: 'TIDAL RUPTURE',
    dmg: 128,
    major: true,
    cd: 4,
    weight: 6,
    charge: true,
    breakNeed: 120,
    icon: 'w_rupture',
    warn: 'THE WHOLE CAVERN DRAWS ITS BREATH...',
  }),
  gaze: A({ id: 'gaze', name: 'ABYSSAL GAZE', phases: [3], dmg: 30, cd: 2, weight: 8, icon: 'w_gaze', warn: 'THE GREAT EYE OPENS. IT IS LOOKING AT YOU.' }),
  devour: A({
    id: 'devour',
    name: 'THE DEEP OPENS',
    phases: [3],
    dmg: 175,
    major: true,
    cd: 5,
    weight: 0, // scheduled, never picked at random
    charge: true,
    breakNeed: 150,
    icon: 'w_devour',
    warn: 'THE KRAKEN RISES. ITS BEAK OPENS.',
  }),
};

export const KRAKEN: EnemyDef = {
  id: 'kraken',
  name: 'THE KRAKEN',
  subtitle: 'THE THING BENEATH THE ISLAND',
  maxHp: 1380,
  attacks: KRAKEN_ATTACKS,
  phaseAt: [0.66, 0.33],
  phaseMult: [1, 1.18, 1.35],
  combos: [
    ['sweep', 'slam'],
    ['ink', 'grasp'],
    ['gaze', 'slam'],
    ['sweep', 'whirlpool'],
  ],
  fallback: 'sweep',
  chargeText: {
    rupture: 'THE WATER PULLS BACK, HIGHER AND HIGHER!',
    devour: 'THE KRAKEN HAULS ITS WHOLE BODY UP OUT OF THE DEEP!',
  },
  fireWarn: { rupture: 'THE WAVE BREAKS NEXT TURN!', devour: 'IT WILL SWALLOW EVERYTHING NEXT TURN!' },
};
