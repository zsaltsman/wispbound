import type { StoryState } from './state';
import type { MapDef } from '../world/mapdef';

// World 2 progress: the submarine checklist, the election and the bank.
// Everything lives in the ordinary save (flags + items) so it persists for free.

const f = (st: StoryState, k: string) => !!st.flags[k];
const has = (st: StoryState, k: string) => (st.items[k] ?? 0) > 0;

export const PARTS = ['transducer', 'deflector', 'turbo'] as const;
export type Part = (typeof PARTS)[number];

export const PART_NAMES: Record<Part | 'pb', string> = {
  transducer: 'SYNCHRONOUS RECIPROCATING TRANSDUCER',
  deflector: 'PHASE-CONJUGATE DISAMBIGUATED DEFLECTOR',
  turbo: 'TURBO-ENCABULATOR',
  pb: 'A JAR OF PEANUT BUTTER',
};

/** How many of the three machine parts are in the bag (or already installed). */
export function partsHave(st: StoryState): number {
  return PARTS.filter((p) => has(st, p) || f(st, 'w2_assembled')).length;
}

export const VOTERS = ['v_gus', 'v_marla', 'v_dot', 'v_quentin', 'v_bev', 'v_otto', 'v_sid', 'v_lorna'] as const;
/** The three who will never be convinced, whatever you say. */
export const STUBBORN = new Set(['v_otto', 'v_sid', 'v_lorna']);

export function votes(st: StoryState): number {
  return VOTERS.filter((v) => st.flags['w2_' + v] === 1).length;
}

export function cash(st: StoryState): number {
  return Number(st.flags.w2_cash ?? 0);
}

/** A checklist row: name, done, and the hint line underneath. */
export interface CheckRow {
  name: string;
  done: boolean;
  locked: boolean;
  hint: string;
}

export function checklist(st: StoryState): CheckRow[] {
  const assembled = f(st, 'w2_assembled');
  const done = (p: string) => has(st, p) || assembled;
  const rows: CheckRow[] = [];
  // 1. the transducer, at the theme park
  let h = 'Something fell off a ride somewhere. A theme park?';
  if (f(st, 'w2_park_met')) {
    const n = ['coaster', 'ferris', 'sling'].filter((r) => f(st, 'w2_ride_' + r)).length;
    h = n < 3 ? `Test the rides for the park worker (${n}/3 tested).` : 'Collect it from the park worker.';
  }
  rows.push({ name: PART_NAMES.transducer, done: done('transducer'), locked: false, hint: h });
  // 2. the deflector, through City Hall, the bank and the technician
  h = 'Expensive. Ask around at City Hall first.';
  if (f(st, 'w2_hall_met')) h = 'Sold at the Tech Repair shop. You need $10,000: try the bank.';
  if (f(st, 'w2_bank_asked')) h = 'The bank wants your old $500 debt cleared. The mayor has money...';
  if (f(st, 'w2_deal')) h = `Win the mayor 5 votes for $500. Votes: ${votes(st)}/5.`;
  if (votes(st) >= 5 && !f(st, 'w2_paid500')) h = 'Five votes! Go collect your $500 at City Hall.';
  if (f(st, 'w2_paid500') && !f(st, 'w2_debt_paid')) h = 'Pay off the $500 at the bank.';
  if (f(st, 'w2_debt_paid') && !f(st, 'w2_loan')) h = 'Ask the bank for the $10,000 loan.';
  if (f(st, 'w2_loan')) h = 'Buy it at the Tech Repair shop.';
  rows.push({ name: PART_NAMES.deflector, done: done('deflector'), locked: false, hint: h });
  // 3. the turbo-encabulator
  h = 'Commonly found in motorcycles.';
  if (f(st, 'w2_dealer_met') && !f(st, 'w2_stole')) h = 'Commonly found in motorcycles. Rick has a showroom full of them...';
  rows.push({ name: PART_NAMES.turbo, done: done('turbo'), locked: false, hint: h });
  // 4. peanut butter, locked until the machine parts are in
  const pbLocked = partsHave(st) < 3;
  h = pbLocked ? 'LOCKED: find the three machine parts first.' : f(st, 'w2_evac_done') ? 'The grocery store is finally open. Aisle 3: SPREADS.' : 'The grocery store is closed by emergency order.';
  if (f(st, 'w2_pb_taken') && !f(st, 'w2_rick_beaten')) h = 'Get past Slick Rick!';
  rows.push({ name: PART_NAMES.pb, done: done('pb'), locked: pbLocked, hint: h });
  return rows;
}

/** One-line goal for the pause menu in World 2. */
export function w2Objective(st: StoryState): string {
  if (f(st, 'w2_ending_done')) return 'Saltwash is quiet now. To leave, talk to Pipwick on Center Avenue.';
  if (f(st, 'w2_returned')) return 'Look around the island.';
  if (f(st, 'kraken_beaten')) return 'Get back to the submarine!';
  if (f(st, 'kraken_seen')) return 'Defeat the Kraken.';
  if (st.creature2) return 'Go deeper.';
  if (st.flags.w2_god) return 'Find a way through the temple.';
  if (f(st, 'w2_cave')) return 'Explore the Cave of the Gods. Four statues. Four sealed doors.';
  if (f(st, 'w2_assembled')) return 'Get in the submarine!';
  if (has(st, 'pb') && f(st, 'w2_rick_beaten')) return 'Bring everything back to the inventor.';
  if (f(st, 'w2_pb_taken')) return 'Deal with Slick Rick!';
  if (f(st, 'w2_evac_done')) return 'Get peanut butter from the grocery store.';
  if (!f(st, 'w2_local_met')) return 'Talk to the locals.';
  if (!f(st, 'w2_inv_met')) return 'Find out what is causing the floods. Everyone mentions a crazy man...';
  const rows = checklist(st).filter((r) => !r.done && !r.locked);
  if (rows.length) return 'Find the submarine parts. ' + rows[0].hint;
  return 'Bring everything back to the inventor.';
}

/** Music in World 2 shifts once the island has been evacuated. */
export function w2Music(st: StoryState, m: MapDef): string {
  if (m.id === 'isl' && f(st, 'w2_evac_done')) return 'empty';
  return m.music;
}
