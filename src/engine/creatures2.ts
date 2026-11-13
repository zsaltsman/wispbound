import type { CreatureDef } from './types';

// World 2: the four creatures of the god temples. Only one ever joins a
// playthrough, fighting beside the World 1 companion. Ability behaviour lives
// in battle.ts, keyed by ability id. Roles (`cls`) are internal only.

export const W2_CREATURES: CreatureDef[] = [
  {
    id: 'glowbell',
    name: 'GLOWBELL',
    cls: 'DEFENSE/DEBUFFER',
    description: 'A tiny glowing jellyfish that floats like a balloon. Its tentacles crackle when anything gets too close.',
    identity: 'Wraps the foe in static and lets its own strength sting it.',
    trait: 'STATIC SKIN',
    traitDesc: 'While shielded, every hit you take adds 1 HEX to the attacker.',
    hp: 380,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'zap_sting', name: 'ZAP STING', short: 'Shock. +1 HEX.', desc: 'A crackling sting. Adds 1 HEX stack (max 5).', cost: 0, cd: 0, kind: 'attack', icon: 'i_zap' },
      { id: 'static_veil', name: 'STATIC VEIL', short: 'Shield 70. WEAKEN.', desc: 'A bubble of static: SHIELD 70 for 2 turns, and the foe is WEAKENED (30% less damage) for 2 turns.', cost: 4, cd: 1, kind: 'defense', icon: 'i_veil' },
      { id: 'jelly_flash', name: 'JELLY FLASH', short: 'Blinding flash.', desc: 'A blinding pulse of light. SPOOKED: the next attack loses half its hits and its curse fails. +1 HEX.', cost: 3, cd: 2, kind: 'special', icon: 'i_flash' },
      { id: 'tempest_bloom', name: 'TEMPEST BLOOM', short: 'Big hit per HEX.', desc: 'Signature. Releases every stored spark: heavy damage per HEX stack, then clears HEX and leaves the foe WEAKENED for 3 turns.', cost: 7, cd: 3, kind: 'signature', icon: 'i_storm' },
    ],
  },
  {
    id: 'hammerfin',
    name: 'HAMMERFIN',
    cls: 'TANK/DEBUFFER',
    description: 'A playful hammerhead shark with oversized fins. He thinks everything is a game. He is very, very strong.',
    identity: 'Soaks up the blows, grins, and hits back twice as hard.',
    trait: 'THICK HEAD',
    traitDesc: 'Takes 15% less damage from single big hits.',
    hp: 560,
    en: 9,
    enStart: 4,
    regen: 3,
    abilities: [
      { id: 'fin_bash', name: 'FIN BASH', short: 'Solid hit. +1 EN.', desc: 'A big friendly whack with a fin. Gains 1 EN.', cost: 0, cd: 0, kind: 'attack', icon: 'i_fin' },
      { id: 'hammer_guard', name: 'HAMMER GUARD', short: 'GUARD 3 turns.', desc: 'Braces his huge head: GUARD (40% less damage) for 3 turns.', cost: 3, cd: 1, kind: 'defense', icon: 'i_guardfin' },
      { id: 'riptide_roar', name: 'RIPTIDE ROAR', short: 'WEAKEN. +2 HEX.', desc: 'A roar that churns the water. Small damage, WEAKENED for 3 turns and 2 HEX.', cost: 4, cd: 2, kind: 'special', icon: 'i_roar' },
      { id: 'frenzy_ram', name: 'FRENZY RAM', short: 'Huge ram.', desc: 'Signature. A full-speed ram, stronger the more damage Hammerfin has soaked recently.', cost: 7, cd: 3, kind: 'signature', icon: 'i_ram' },
    ],
  },
  {
    id: 'bubblotl',
    name: 'BUBBLOTL',
    cls: 'DAMAGE/SUPPORT',
    description: 'A cheerful axolotl that blows bubbles from its fluffy gills. Its biggest bubbles can trap almost anything.',
    identity: 'Pops, heals and smiles. Then traps the foe in a bubble.',
    trait: 'BUBBLE BATH',
    traitDesc: 'Heals 5 HP at the start of each turn.',
    hp: 390,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'bubble_pop', name: 'BUBBLE POP', short: '3 popping hits.', desc: 'Three bubbles that burst on impact. Each pop heals a little.', cost: 0, cd: 0, kind: 'attack', icon: 'i_bubbles' },
      { id: 'froth_bath', name: 'FROTH BATH', short: 'Heal + REGEN.', desc: 'A soothing froth: heals 20% HP, cleanses curses and grants REGEN for 3 turns.', cost: 4, cd: 1, kind: 'defense', icon: 'i_froth' },
      { id: 'big_bubble', name: 'BIG BUBBLE', short: 'Trap: skip a turn.', desc: 'Traps the foe in a giant bubble: it loses its next attack. Charged attacks are held, not cancelled.', cost: 5, cd: 4, kind: 'special', icon: 'i_bigbubble' },
      { id: 'gill_geyser', name: 'GILL GEYSER', short: 'Massive blast.', desc: 'Signature. A geyser from every gill. Heavy damage and a small heal.', cost: 7, cd: 3, kind: 'signature', icon: 'i_geyser' },
    ],
  },
  {
    id: 'glidray',
    name: 'GLIDRAY',
    cls: 'DAMAGE/DEFENSE',
    description: 'A tiny manta ray that glides just above the waves. The tips of its wings glow softly at night.',
    identity: 'Strikes from above, then wraps itself in moonlight.',
    trait: 'NIGHT GLIDER',
    traitDesc: 'Critical hits restore EN.',
    hp: 340,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'wing_slice', name: 'WING SLICE', short: 'Swift cut. Crits.', desc: 'A slicing glide. High critical chance.', cost: 0, cd: 0, kind: 'attack', icon: 'i_wing' },
      { id: 'moon_mantle', name: 'MOON MANTLE', short: 'Shield + counter.', desc: 'Wraps up in moonlight: SHIELD 45 and REPRISAL (strike back at the next hit).', cost: 4, cd: 2, kind: 'defense', icon: 'i_mantle' },
      { id: 'skylight_dive', name: 'SKYLIGHT DIVE', short: '2 hits. +2 EN.', desc: 'Climbs into the dark and dives twice. Gains 2 EN.', cost: 3, cd: 1, kind: 'special', icon: 'i_dive' },
      { id: 'lunar_ray', name: 'LUNAR RAY', short: 'Huge beam.', desc: 'Signature. A beam of light from both glowing wing tips. Massive damage and SHIELD 30.', cost: 7, cd: 3, kind: 'signature', icon: 'i_lunar' },
    ],
  },
];
