import type { BossAttackDef, EnemyDef } from './boss';

// Slick Rick, the motorcycle salesman: World 2's mini-boss in the wrecked
// grocery store. Faster and trickier than the fisherman, with one charged
// finisher and two attacks that mess with your footing and focus.

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

export const SALESMAN_ATTACKS: Record<string, BossAttackDef> = {
  rev: A({ id: 'rev', name: 'MOTORCYCLE CHARGE', dmg: 44, weight: 10, major: true, icon: 'w_bike', warn: 'HE REVS THE ENGINE. VRRRM. VRRRRRM.' }),
  oil: A({ id: 'oil', name: 'OIL SLICK', dmg: 14, hits: [2, 2], cd: 3, weight: 7, icon: 'w_oil', warn: 'HE UNSCREWS THE OIL CAP WITH HIS TEETH.' }),
  pitch: A({ id: 'pitch', name: 'SALES PITCH', dmg: 9, hits: [4, 5], cd: 2, weight: 9, icon: 'w_pitch', warn: 'HE STRAIGHTENS HIS TIE. OH NO. HE IS GOING TO TALK.' }),
  throttle: A({
    id: 'throttle',
    name: 'FULL THROTTLE',
    dmg: 108,
    major: true,
    cd: 4,
    weight: 7,
    charge: true,
    breakNeed: 85,
    icon: 'w_throttle',
    warn: 'HE BACKS UP TO THE FAR WALL...',
  }),
};

export const SALESMAN: EnemyDef = {
  id: 'salesman',
  name: 'SLICK RICK',
  subtitle: 'EMPLOYEE OF THE MONTH (SELF-AWARDED)',
  maxHp: 520,
  attacks: SALESMAN_ATTACKS,
  phaseAt: [0.45], // the commission is slipping away
  phaseMult: [1, 1.2],
  combos: [],
  fallback: 'pitch',
  chargeText: { throttle: 'THE ENGINE SCREAMS! THE WHOLE STORE SHAKES!' },
  fireWarn: { throttle: 'FULL THROTTLE NEXT TURN!' },
};
