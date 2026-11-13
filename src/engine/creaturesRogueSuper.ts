import type { CreatureDef } from './types';
import { supercharge } from './creaturesFinal';
import { ROGUE_CREATURES } from './creaturesRogue';
import { W5_CREATURES } from './creatures5';

// ROGUELIKE: the evolved forms the story never needed. In the dungeon the Grim Reaper's last
// fight supercharges every spirit a run can hold, so Flamora and the dungeon's own five spirits
// get forms of their own here (the twelve island spirits use the story's, the two guardians
// fight at full strength). Same shapes as the story's: the same moves grown, under new names.

const NAMES: Record<string, { evo: string; moves: [string, string][] }> = {
  flamora: {
    evo: 'SOLARIS',
    moves: [['CORONA TALON', 'Hit. BURN 2.'], ['SUNFIRE VEIL', 'Shield 60 + REGEN.'], ['WILDFIRE CRY', 'WEAKEN, SNARE, heal.'], ['SECOND SUN', 'Massive blast. Heals.']],
  },
  sootwick: {
    evo: 'SMOGLORD',
    moves: [['ASH STORM', 'Hit. BLIND 2 turns.'], ['FURNACE SPIT', '2 hits. BURN 3.'], ['BLACK FOG', 'SNARE + WEAKEN.'], ['ETERNAL NIGHTFALL', 'Huge blast. Hits all.']],
  },
  tintrick: {
    evo: 'TINGENERAL',
    moves: [['DRUMROLL', '2 jabs. +1 COMBO.'], ['CAVALRY CHARGE', '3 hits. +1 COMBO.'], ['CLOCKWORK CYCLONE', 'Heavy spin. +2 COMBO.'], ['TWENTY-ONE GUNS', 'Finisher. Spends COMBO.']],
  },
  mourningbell: {
    evo: 'REQUIEMBELL',
    moves: [['FUNERAL PEAL', 'Wave. Hits all. +1 EN.'], ['SHATTERING CHORD', 'WEAKEN. Breaks charges.'], ['CATHEDRAL HUM', 'Everyone GUARD + shield.'], ['LAST RITES', 'Huge ring. SNARE + HEX.']],
  },
  stitchwraith: {
    evo: 'LOOMWRAITH',
    moves: [['SOUL SNARE', 'Hit. BIND. +1 EN.'], ['GREAT TAPESTRY', 'LINK everyone 2 turns.'], ['SILVER NEEDLE', 'Heal the worst hurt 25%.'], ["FATE'S WEAVE", 'Big hit. BIND all.']],
  },
  nullcrown: {
    evo: 'VOIDTHRONE',
    moves: [['THRONE STRIKE', 'Hit. +30% vs buffs.'], ['DETHRONE', 'Steal every buff.'], ['IMPERIAL DECREE', 'Spend TRIBUTE on team.'], ['ABSOLUTE ZERO', 'Big hit. INVERT foe.']],
  },
};

const BASES = [...W5_CREATURES, ...ROGUE_CREATURES];

export const ROGUE_SUPER: CreatureDef[] = Object.entries(NAMES).map(([id, n]) => supercharge(BASES.find((c) => c.id === id)!, n.moves, n.evo));
