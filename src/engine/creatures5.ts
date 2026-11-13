import type { CreatureDef } from './types';

// The final world: the three great spirits of the Forgotten Island, as creatures that
// can fight beside you. Wispmane and Viperwind are the two guardians (one per route);
// Flamora is the Overseer of All Spirits. They are not caught: they choose you, later.
// Roles (`cls`) are internal only.

export const W5_CREATURES: CreatureDef[] = [
  {
    id: 'wispmane',
    name: 'WISPMANE',
    cls: 'DAMAGE/DEBUFF',
    description: 'The Guardian of the Land. A great pale lion with a mane of ghostly light. It does not forgive, and it does not forget.',
    identity: 'Covers the foe in every curse it knows, then tears into it.',
    trait: "PREDATOR'S MARK",
    traitDesc: 'Deals 8% more damage for every kind of debuff on the foe (up to +40%).',
    hp: 520,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'w_claws', name: 'ETHEREAL CLAWS', short: '2 claws. +1 HEX.', desc: 'Two swipes of glowing claws. Adds 1 HEX (max 5).', cost: 0, cd: 0, kind: 'attack', icon: 'w4_claws' },
      { id: 'w_roar', name: 'ROAR OF THE FOREST', short: 'WEAKEN + SNARE.', desc: 'A roar that shakes the leaves off every tree: the foe is WEAKENED for 3 turns and SNARED (takes 25% more) for 2.', cost: 3, cd: 1, kind: 'special', icon: 'w4_roar' },
      { id: 'w_grasp', name: "NATURE'S GRASP", short: 'HAUNT + 2 HEX.', desc: 'Roots coil around the foe and squeeze: HAUNTED for 3 turns (damage every round) and 2 HEX.', cost: 4, cd: 2, kind: 'special', icon: 'w4_roots' },
      { id: 'w_wrath', name: "NATURE'S WRATH", short: 'Huge hit per debuff.', desc: 'Signature. The whole land answers: heavy damage, more for every kind of debuff on the foe, and every debuff on it lasts 1 turn longer.', cost: 7, cd: 3, kind: 'signature', icon: 'w4_wrath' },
    ],
  },
  {
    id: 'viperwind',
    name: 'VIPERWIND',
    cls: 'DEFENSE/SUPPORT',
    description: 'The Guardian of the Sky. A long pale serpent of wind and fins that never touches the ground. It coils around what it protects.',
    identity: 'Wraps the whole team in wind. Very hard to put down.',
    trait: 'TAILWIND',
    traitDesc: 'Starts each turn with 1 extra EN while it has GUARD, SHIELD or REGEN.',
    hp: 580,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'v_gale', name: 'GALE STRIKE', short: '2 hits. Shield 15.', desc: 'Two blurring strikes. Gains SHIELD 15.', cost: 0, cd: 0, kind: 'attack', icon: 'w4_gale' },
      { id: 'v_barrier', name: 'WIND BARRIER', short: 'Team GUARD 3 turns.', desc: 'A wall of wind around everyone: the whole team has GUARD (take 35% less damage) for 3 turns.', cost: 3, cd: 1, kind: 'defense', icon: 'w4_barrier' },
      { id: 'v_tailwind', name: 'SOOTHING TAILWIND', short: 'Team REGEN. Cleanse.', desc: 'A warm wind: cleanses its own curses and gives the whole team REGEN for 3 turns.', cost: 4, cd: 2, kind: 'special', icon: 'w4_tornado' },
      { id: 'v_tempest', name: 'TEMPEST WALL', short: 'Hit. Big shields.', desc: 'Signature. The sky closes around the team: a solid hit, SHIELD 90 and REPRISAL for itself, and SHIELD 40 for everyone on the bench.', cost: 7, cd: 3, kind: 'signature', icon: 'w4_tempest' },
    ],
  },
  {
    id: 'flamora',
    name: 'FLAMORA',
    cls: 'DAMAGE/DEFENSE/SUPPORT/DEBUFF',
    description: 'The Overseer of All Spirits. A phoenix made of living fire. Very few have ever seen it. Fewer have seen it fight.',
    identity: 'Strikes, shields, heals and curses. There is very little it cannot do.',
    trait: 'REBIRTH',
    traitDesc: 'Once per battle, rises from a knockout with 40% HP.',
    hp: 640,
    en: 11,
    enStart: 6,
    regen: 3,
    abilities: [
      { id: 'f_talon', name: 'SOLAR TALON', short: 'Hit. BURN 2.', desc: 'A blazing talon strike. The foe is BURNING for 2 turns.', cost: 0, cd: 0, kind: 'attack', icon: 'i_ember' },
      { id: 'f_veil', name: 'PHOENIX VEIL', short: 'Shield 60 + REGEN.', desc: 'Wraps itself in flame: SHIELD 60 and REGEN for 3 turns.', cost: 3, cd: 1, kind: 'defense', icon: 'i_veil' },
      { id: 'f_cry', name: 'SCORCHING CRY', short: 'WEAKEN, SNARE, heal.', desc: 'A cry like a forest fire: small damage, the foe is WEAKENED for 3 turns and SNARED for 2, and the bench heals 15%.', cost: 4, cd: 2, kind: 'special', icon: 'i_wail' },
      { id: 'f_nova', name: 'SUPERNOVA', short: 'Massive blast. Heals.', desc: 'Signature. It becomes a second sun: massive damage, more for every turn of BURNING on the foe, and the whole team heals 15%.', cost: 7, cd: 3, kind: 'signature', icon: 'i_storm' },
    ],
  },
];

export const W5_CREATURE_IDS = W5_CREATURES.map((c) => c.id);
