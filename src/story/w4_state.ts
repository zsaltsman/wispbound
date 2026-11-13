import type { StoryState } from './state';
import type { MapDef } from '../world/mapdef';

// World 4 progress, read from ordinary save flags: the route you took (A, the
// Woodlands Tower and Wispmane; B, the airship and Viperwind), what the pause menu
// says to do next, how dark the night is, and what music plays.

const f = (st: StoryState, k: string) => !!st.flags[k];
export const route4 = (st: StoryState) => st.flags.w4_route as 'A' | 'B' | undefined;
const has = (st: StoryState, k: string) => (st.items[k] ?? 0) > 0;

/** The island grows darker once the last warning has come. */
export function w4Dark(st: StoryState, m: MapDef): number {
  if (m.id === 'w4_lab1') return f(st, 'w4_lab_power') ? 0.42 : m.dark;
  if (m.id !== 'w4_isl') return m.dark;
  if (f(st, 'w4_warning')) return 0.72;
  return m.dark;
}

export function w4Music(st: StoryState, m: MapDef): string | null {
  if (m.music === 'none') return null;
  if (m.id === 'w4_isl') {
    if (f(st, 'w4_escaping')) return 'w4_escape';
    if (f(st, 'w4_warning')) return null;
    if (f(st, 'w4_cat_seen') && !f(st, 'w4_summit_done')) return 'w4_island';
  }
  return m.music;
}

/** One-line goal for the pause menu in World 4. */
export function w4Objective(st: StoryState): string {
  const r = route4(st);
  if (f(st, 'w4_end')) return 'To be continued...';
  if (f(st, 'w4_captured')) return 'Look around the cell.';
  if (f(st, 'w4_escaping')) return r === 'B' ? 'GET BACK TO THE AIRSHIP!' : 'RUN FOR THE OLD AIRSHIP ON THE ROCKS!';
  if (f(st, 'w4_warning')) return 'Something terrible is coming.';
  // the research facility, between the guardian and the village
  if ((f(st, 'wispmane_beaten') || f(st, 'viperwind_beaten')) && !f(st, 'w4_lab_done')) {
    if (!f(st, 'w4_lab_found')) return 'Look around the clearing.';
    if (!f(st, 'w4_lab_power')) return 'Explore the door in the hillside. Get the power back on.';
    if (!f(st, 'w4_lab_tuned')) return 'Open the shutter to CONTAINMENT.';
    if (!f(st, 'w4_lab_card')) return 'Find a way into the RESEARCH OFFICE.';
    if (!f(st, 'w4_lab_key')) return 'Open the director\'s safe.';
    if (!f(st, 'subject_beaten')) return 'Find out what is in the EXPERIMENT CHAMBER.';
    return 'See what is behind the vault door.';
  }
  if (r === 'A') {
    if (f(st, 'wispmane_beaten')) return 'Take the old man back to the village.';
    if (f(st, 'w4_old_done')) return 'Find Wispmane. Try the clearing in the forest.';
    if (f(st, 'champion_beaten')) return 'Keep climbing the tower.';
    return 'Climb the Woodlands Tower.';
  }
  if (r === 'B') {
    if (f(st, 'viperwind_beaten')) return 'Take Carlo back to the village.';
    if (f(st, 'w4_flute_done')) return 'Find Viperwind. Try the clearing in the forest.';
    return 'Work your way down through the giant tree.';
  }
  if (!f(st, 'w4_summit_done')) return f(st, 'w4_cat_seen') ? 'Follow the cat up the mountain.' : 'Look around.';
  // the two ways forward, as far as you have found them
  const gems = st.items.gem ?? 0;
  const parts = ['keys', 'wheel', 'gas'].filter((k) => has(st, k)).length;
  if (gems >= 2) return 'Place the two gemstones in the tower door, in the north-east of the island.';
  if (parts >= 3) return 'You have the keys, the wheel and the fuel. Use the ENGINE PANEL on the side of the airship wreck.';
  const gemGoal = (): string => {
    if (f(st, 'w4_gem1')) return f(st, 'w4_gem2') ? '' : 'The other gemstone "sails with the captain". Search the captain\'s room inside the airship wreck.';
    if (f(st, 'w4_house2_read')) return 'The cat is sitting on the old well in the middle of the village.';
    if (f(st, 'w4_cat_house2')) return 'The cat opened the door of the house at the north end of the village. Look inside.';
    if (f(st, 'w4_storage_read')) return 'Follow the cat: it ran toward the house at the north end of the village.';
    if (f(st, 'w4_cat_storage')) return 'The cat slipped into the old storage barn in the village. Look inside.';
    return 'The cat seems to know something. Look for it in the village, by the barn.';
  };
  const shipGoal = (): string => {
    const hint: string[] = [];
    if (!has(st, 'keys')) hint.push('KEYS (inside the wreck)');
    if (!has(st, 'wheel')) hint.push(f(st, 'w4_carlo_met') ? 'a WHEEL (Carlo, in the castle)' : 'a WHEEL (someone in the castle?)');
    if (!has(st, 'gas')) hint.push("FUEL (up the rope ladder, in the crow's nest)");
    return `The airship needs ${hint.join(', ')}.`;
  };
  if (f(st, 'w4_tower_seen') && f(st, 'w4_engine_seen')) return `Tower: two gemstones (${gems}/2). ${gemGoal()} Or the airship: ${shipGoal()}`;
  if (f(st, 'w4_tower_seen')) return `Find two gemstones for the tower door (${gems}/2). ${gemGoal()}`;
  if (f(st, 'w4_engine_seen')) return shipGoal();
  return 'Explore the island: the village, the forest, the coast.';
}
