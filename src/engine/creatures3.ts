import type { CreatureDef } from './types';

// World 3: the first-stage forms of the three Titans. Exactly one joins a
// playthrough, offered by Milo at the end. They are separate creatures with
// their own movesets, not scaled-down bosses. Roles (`cls`) are internal only.

export const W3_CREATURES: CreatureDef[] = [
  {
    id: 'scorvlet',
    name: 'SCORVLET',
    cls: 'SUPPORT/DEBUFF/DEFENSE',
    description: 'A little four-legged steel pup with a furnace in its tail. It puffs smoke rings when it is happy, and when it is not.',
    identity: 'Sets the foe smouldering and keeps its friends warm.',
    trait: 'HEAT SHIELD',
    traitDesc: 'Takes 10% less damage from a foe that is BURNING.',
    hp: 430,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'ember_nip', name: 'EMBER NIP', short: 'Bite. BURN 3.', desc: 'A hot little bite. The foe is BURNING for 3 turns, taking damage every round. Burning ignores armor.', cost: 0, cd: 0, kind: 'attack', icon: 'i_ember' },
      { id: 'cinder_shell', name: 'CINDER SHELL', short: 'GUARD + shield 40.', desc: 'Curls up behind its hot plating: GUARD (35% less damage) for 2 turns and SHIELD 40.', cost: 4, cd: 1, kind: 'defense', icon: 'i_cinder' },
      { id: 'smog_cloud', name: 'SMOG CLOUD', short: 'WEAKEN, HEX, feed BURN.', desc: 'A puff of thick smoke from the tail. Small damage, the foe is WEAKENED for 3 turns and takes 1 HEX, and any BURNING lasts 1 turn longer.', cost: 3, cd: 2, kind: 'special', icon: 'i_smog' },
      { id: 'stoked_sting', name: 'STOKED STING', short: 'Big hit per BURN.', desc: 'Signature. The furnace tail strikes, stronger for every turn of BURNING left on the foe (which it uses up). Warms the partner on the bench, healing 15%.', cost: 7, cd: 3, kind: 'signature', icon: 'i_stoked' },
    ],
  },
  {
    id: 'widowling',
    name: 'WIDOWLING',
    cls: 'DAMAGE/DEBUFF/SUPPORT',
    description: 'A clockwork spiderling no bigger than a teapot. It ticks when it thinks, and it is always thinking.',
    identity: 'Ties the foe up, then cuts it to ribbons.',
    trait: 'QUICK FANGS',
    traitDesc: 'Its many little hits land critical blows more often.',
    hp: 480,
    en: 10,
    enStart: 5,
    regen: 3,
    abilities: [
      { id: 'silk_snip', name: 'SILK SNIP', short: '2 quick snips.', desc: 'Two quick cuts with its front legs. High critical chance.', cost: 0, cd: 0, kind: 'attack', icon: 'i_snip' },
      { id: 'venom_bite', name: 'VENOM BITE', short: 'WEAKEN + 2 HEX.', desc: 'A bite from tiny steel fangs: the foe is WEAKENED for 2 turns and takes 2 HEX.', cost: 3, cd: 1, kind: 'special', icon: 'i_venom' },
      { id: 'tangle_web', name: 'TANGLE WEB', short: 'SNARE + fumble.', desc: 'Wraps the foe in wire silk: SNARED for 2 turns (it takes 25% more damage from everyone) and its next attack fumbles.', cost: 4, cd: 3, kind: 'defense', icon: 'i_tangle' },
      { id: 'eightfold_flurry', name: 'EIGHTFOLD FLURRY', short: '8 rapid cuts.', desc: 'Signature. Every leg at once: eight quick cuts, each with a high critical chance.', cost: 7, cd: 3, kind: 'signature', icon: 'i_flurry' },
    ],
  },
  {
    id: 'ironbud',
    name: 'IRONBUD',
    cls: 'TANK/DAMAGE/SUPPORT',
    description: 'A stubby little suit of armor dragging a hammer twice its size. It is very serious about being helpful.',
    identity: 'Holds the line, cheers everyone on, and bonks very hard.',
    trait: 'SMALL BUT STURDY',
    traitDesc: 'Once per battle, survives a blow that would knock it out, with 1 HP.',
    hp: 470,
    en: 9,
    enStart: 4,
    regen: 3,
    abilities: [
      { id: 'tiny_tap', name: 'TINY TAP', short: 'Hammer tap. +1 EN.', desc: 'A tap of the big hammer. Not tiny. Gains 1 EN.', cost: 0, cd: 0, kind: 'attack', icon: 'i_tap' },
      { id: 'bulwark', name: 'BULWARK', short: 'GUARD 3 turns.', desc: 'Plants its feet and its little shield: GUARD (40% less damage) for 3 turns.', cost: 3, cd: 1, kind: 'defense', icon: 'i_bulwark' },
      { id: 'rally_clang', name: 'RALLY CLANG', short: 'Heals team. Boosts next.', desc: 'Bangs the hammer like a bell: heals itself 12% and the partner on the bench 18%, and its next ability is stronger.', cost: 4, cd: 2, kind: 'special', icon: 'i_rally' },
      { id: 'big_bonk', name: 'BIG BONK', short: 'Huge hit. More if guarded.', desc: 'Signature. Swings the whole hammer. Hits even harder while IRONBUD is GUARDED.', cost: 7, cd: 3, kind: 'signature', icon: 'i_bonk' },
    ],
  },
];

export const W3_CREATURE_IDS = W3_CREATURES.map((c) => c.id);
