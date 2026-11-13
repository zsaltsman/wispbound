import type { BossAttackDef, EnemyDef } from './boss';

// The Angry Fisherman: the mid-story boss in the grocery store cellar.
// Shorter and simpler than the Dutchman, with one readable charged attack.

const A = (d: Partial<BossAttackDef> & Pick<BossAttackDef, 'id' | 'name' | 'dmg' | 'icon' | 'warn'>): BossAttackDef => ({
  phases: [1, 2],
  major: false,
  hits: [1, 1],
  cd: 1,
  weight: 8,
  charge: false,
  breakNeed: 0,
  scaled: true,
  ...d,
});

export const FISHERMAN_ATTACKS: Record<string, BossAttackDef> = {
  rod: A({ id: 'rod', name: 'ROD WHACK', dmg: 40, weight: 10, icon: 'w_rod', warn: 'HE GRIPS THE ROD LIKE A CLUB.' }),
  hook: A({
    id: 'hook',
    name: 'HOOK AND PULL',
    dmg: 19,
    hits: [2, 2],
    cd: 2,
    icon: 'w_hook',
    warn: 'THE HOOK SWINGS ON ITS LINE...',
  }),
  slap: A({ id: 'slap', name: 'FISH SLAP', dmg: 13, hits: [4, 5], cd: 2, icon: 'w_fish', warn: 'HE REACHES INTO HIS COAT. A FISH?' }),
  cast: A({
    id: 'cast',
    name: 'ANGRY CAST',
    dmg: 100,
    major: true,
    cd: 4,
    weight: 7,
    charge: true,
    breakNeed: 80,
    icon: 'w_cast',
    warn: 'HE WINDS UP A MIGHTY CAST!',
  }),
};

export const FISHERMAN: EnemyDef = {
  id: 'fisherman',
  name: 'THE ANGRY FISHERMAN',
  subtitle: 'HE WANTS HIS BAIT BACK',
  maxHp: 460,
  attacks: FISHERMAN_ATTACKS,
  phaseAt: [0.4], // he gets furious
  phaseMult: [1, 1.25],
  combos: [],
  fallback: 'rod',
  chargeText: { cast: 'HE WHIPS THE ROD OVER HIS HEAD!' },
  fireWarn: { cast: 'THE CAST LANDS NEXT TURN!' },
};
