import type { StoryState } from './state';
import type { MapDef } from '../world/mapdef';

// The final world's progress, read from ordinary save flags: which floors the elevator
// will go to, what the pause menu says to do next, and the lock's three numbers.
//
//   w5_started   the prison has begun (party = only the creatures you have found again)
//   w5_slop      the slop came (w5_refused if you sent it back)
//   w5_free      the guardian tore the bars open; it follows you
//   w5_got3      your Titan cub is back (the specimen cell)
//   w5_warden_beaten
//   w5_got2      your temple creature is back (the kitchen)
//   w5_massacre  the Reaper came to supper
//   w5_disguised the spare uniform
//   w5_got1      your first spirit is back (the sergeant)
//   w5_d1/d2/d3  the lock's numbers, once found
//   w5_cell_open, w5_rescued, w5_reaper_met

const f = (st: StoryState, k: string) => !!st.flags[k];

/** The code on the high-security cell, one wheel at a time. */
export const CODE = [3, 8, 6];

/** Which floors (1-5) the elevator will go to, and why a dark button is dark. */
export function floorOpen(st: StoryState, n: number): boolean {
  if (n === 1) return true;
  if (n === 2) return f(st, 'w5_got3');
  if (n === 3) return f(st, 'w5_warden_beaten');
  if (n === 4) return f(st, 'w5_got2') && f(st, 'w5_massacre');
  return f(st, 'w5_got1');
}
export const FLOOR_LOCK = [
  '',
  'The button is dark. Beside it, a little glass eye: it is waiting for a spirit to look into it.',
  'The button has a keyhole instead of a light. The tag: STAFF ONLY - SEE THE WARDEN.',
  'Dark. The glass eye beside it stays dark.',
  'Dark. The glass eye beside it stays dark. HIGH SECURITY needs more than you have.',
];

export function lockClues(st: StoryState): string {
  return CODE.map((d, i) => (f(st, 'w5_d' + (i + 1)) ? String(d) : '?')).join(' ');
}

export function w5Music(st: StoryState, m: MapDef): string | null {
  if (m.music === 'none') return null;
  if (m.id === 'p_mess' && f(st, 'w5_massacre')) return 'w5_high';
  if (m.id === 'p_high' && f(st, 'w5_cell_open')) return null;
  return m.music;
}

/** One-line goal for the pause menu in the prison. */
export function w5Objective(st: StoryState): string {
  if (f(st, 'w6_done')) return 'It is over. Thank you for playing.';
  if (f(st, 'w6_won')) return 'He is gone. Celebrate!';
  if (f(st, 'w5_reaper_met')) return 'Defeat the God of Death.';
  if (f(st, 'w5_rescued')) return '...';
  if (f(st, 'w5_got1')) {
    const c = lockClues(st);
    return c.includes('?') ? `Open the cell in HIGH SECURITY. The lock: ${c}. The numbers are around the prison.` : `Open the cell in HIGH SECURITY. The lock: ${c}.`;
  }
  if (f(st, 'w5_got2') && f(st, 'w5_massacre')) {
    if (!f(st, 'w5_disguised')) return 'Sneak through the guard quarters. Stay out of sight. Maybe find something to wear.';
    return 'Find out where the guards keep your first spirit. The break room?';
  }
  if (f(st, 'w5_got2')) return 'Get out of the mess hall.';
  if (f(st, 'w5_kitchen_seen')) return f(st, 'w5_key_hint') ? 'Find the kitchen key. Somewhere disgusting... try the slop trough at the bottom of the hall.' : 'The kitchen is locked. Ask WEASEL about the key: he leans on the wall by the kitchen door.';
  if (f(st, 'w5_warden_beaten')) return 'Take the elevator up to the mess hall. Your temple spirit is up there: try the iron KITCHEN door in the right-hand wall.';
  if (f(st, 'w5_got3')) return 'Take the elevator up.';
  if (f(st, 'w5_free')) return f(st, 'w5_spec_seen') ? 'Free your creature from the specimen cell.' : 'Explore the cell block.';
  return 'Wake up.';
}
