import type { StoryState } from './state';
import type { MapDef } from '../world/mapdef';

// World 3 progress: which day (and night) it is, how crowded each part of town
// is, what the pause menu says to do next, and what music plays. Everything is
// read from ordinary save flags.

const f = (st: StoryState, k: string) => !!st.flags[k];

/**
 * d1: arrival, the fake ID.  n1: the first night (the club, the bartender, Scorvex, Ayla).
 * d2: the second day (Avalena at the bar, the jug, the clinic).  n2: after the barrel.
 * d3: the quiet third day.  end: after the town has decided.
 */
export type W3Stage = 'd1' | 'n1' | 'd2' | 'n2' | 'd3' | 'end';

export function w3Stage(st: StoryState): W3Stage {
  if (f(st, 'w3_resolved')) return 'end';
  if (f(st, 'w3_day3')) return 'd3';
  if (f(st, 'w3_barrel_gone')) return 'n2';
  if (f(st, 'w3_day2')) return 'd2';
  if (f(st, 'w3_id')) return 'n1';
  return 'd1';
}

/** How many tiers of partygoers stay out, per stage (0 = only the die-hards). */
const DENSITY: Record<W3Stage, number> = { d1: 4, n1: 4, d2: 2, n2: 1, d3: 0, end: 2 };

/** Is a crowd member of this tier out in this zone right now? */
export function crowdAt(st: StoryState, zone: string, tier: number): boolean {
  const s = w3Stage(st);
  // the night the bartender dies, everyone goes home (or runs)
  if (f(st, 'w3_sal_dead') && !f(st, 'w3_day2')) return false;
  // the night of the barrel, the clubbers are all outside staring at the wreck
  if (zone.startsWith('club') && s === 'n2') return false;
  // the queues outside the busy shops never quite go away
  if (zone.startsWith('q_')) return tier <= Math.max(1, DENSITY[s]);
  return tier < DENSITY[s];
}

/** Darkness of the open air, per stage. */
export function w3Dark(st: StoryState): number {
  return { d1: 0.05, n1: 0.55, d2: 0.05, n2: 0.5, d3: 0.08, end: 0.35 }[w3Stage(st)];
}

/**
 * The club by time of day: at night it's the dim, candle-lit party; in the daytime
 * the house lights are up and sun comes in through the big window, so it reads as
 * an ordinary room with the lights left on rather than a nightclub in full swing.
 */
export function w3ClubDark(st: StoryState): number {
  const s = w3Stage(st);
  return s === 'n1' || s === 'n2' ? 0.5 : s === 'end' ? 0.3 : 0.1;
}

export function w3Music(st: StoryState, m: MapDef): string {
  const s = w3Stage(st);
  if (m.id === 'w3_isl') {
    if (s === 'd3' || s === 'n2') return 'town_quiet';
    if (s === 'end') return 'w3_end';
    if (f(st, 'w3_sal_dead') && !f(st, 'w3_day2')) return 'grief';
    return 'party';
  }
  if (m.id === 'w3_club') {
    if (f(st, 'w3_sal_dead') && !f(st, 'w3_day2')) return 'grief';
    if (s === 'n1' || s === 'd1') return 'club';
    return 'club_quiet';
  }
  return m.music;
}

/** One-line goal for the pause menu in World 3. */
export function w3Objective(st: StoryState): string {
  if (f(st, 'w3_end')) return 'Bacchus Key is calm. To leave, talk to Teddy by the harbour.';
  if (f(st, 'w3_iron_beaten')) return 'Hear what the town decides.';
  if (f(st, 'w3_research_done')) return 'Leave the club.';
  if (f(st, 'w3_research')) {
    const n = ['buffet', 'lobster', 'cafe', 'dough', 'froyo'].filter((k) => f(st, 'w3_seen_' + k)).length;
    return n < 5 ? `See which businesses are doing well (${n}/5 visited), then tell Avalena.` : 'Tell Avalena which two businesses are doing best.';
  }
  if (f(st, 'w3_day3')) return 'Find Avalena in the club.';
  if (f(st, 'w3_widow_beaten')) return 'Back to the club. Avalena has rooms for you.';
  if (f(st, 'w3_barrel_gone')) return 'Stop the thing at the barrel!';
  if (f(st, 'w3_grimsby_done')) return 'Everyone is crowding the window...';
  if (f(st, 'w3_shot')) return 'Take the shot to the old man in the clinic.';
  if (f(st, 'w3_grimsby_met')) return 'Get one more shot from Avalena.';
  if (f(st, 'w3_jug_done')) return 'The clinic is open now. Have a look.';
  if (f(st, 'w3_jug_full')) return 'Bring the full jug back to Avalena.';
  if (f(st, 'w3_jug_quest')) return 'Fill the jug at the Great Barrel.';
  if (f(st, 'w3_avalena_found')) return 'Talk to Avalena.';
  if (f(st, 'q_w3_closed')) return 'Ayla wants to go back to Club Forever.';
  if (f(st, 'w3_shop_closed')) return "Avalena's shop is closed. Where did she go?";
  if (f(st, 'w3_ayla_joined')) return 'Return the art to Avalena.';
  if (f(st, 'w3_followed')) return 'Talk to Ayla.';
  if (f(st, 'w3_scorvex_beaten')) return 'Follow Ayla. Do not let her see you.';
  if (f(st, 'w3_sal_dead')) return 'Get outside!';
  if (f(st, 'w3_ayla_seen')) return 'Chase her!';
  if (f(st, 'w3_backdoor_open')) return 'Check out the back door.';
  if (f(st, 'w3_in_club')) return 'Enjoy the party.';
  if (f(st, 'w3_id')) return 'Show your ID at Club Forever.';
  if (f(st, 'w3_robbed')) return 'Get your ID from Avalena.';
  if (f(st, 'w3_sold')) return 'Bring the $100 back to Avalena.';
  if (f(st, 'w3_painting')) return 'Sell the painting for $100.';
  if (f(st, 'w3_bouncer_met')) return 'Find someone who can make you an ID.';
  if (f(st, 'w3_guide_met')) return 'Check out Club Forever.';
  return 'Look around Bacchus Key.';
}
