import type { Difficulty } from './config';
import type { BattleSnap, CoopChoice, Step } from './coop';
import type { Dir, RoomPub } from './dungeon';
import type { Facing, PuzzleState } from './puzzles';

// ROGUELIKE: everything that crosses the wire. The host (the multiplayer server, or the game
// itself in a solo run) owns the one true RoomState; players only ever send requests.

export type Phase = 'lobby' | 'draft' | 'dungeon' | 'battle' | 'reward' | 'summary';

/** One spirit a player owns in this run. */
export interface SpiritInst {
  id: string;
  /** Health carried from room to room (0..1 of max). 0 = down until revived. */
  hp: number;
  /** Run skills attached to this spirit (ids from skills.ts). */
  skills: string[];
}

/** A skill choice waiting for a player: three to pick from, or walk away with wisps. */
export interface RewardOffer {
  offers: string[];
  /** Where it came from, for the heading. */
  source: 'room' | 'elite' | 'boss' | 'puzzle' | 'treasure' | 'shop';
}

export interface PlayerPub {
  seat: number;
  name: string;
  /** Which traveller sprite stands for them (0..7). */
  look: number;
  connected: boolean;
  host: boolean;
  /** Lobby: ready to start. */
  ready: boolean;
  spirits: SpiritInst[];
  /** Draft: the three spirits offered, the one highlighted, and whether it is confirmed. */
  offers: string[];
  pick: string | null;
  locked: boolean;
  /** Run currency. */
  wisps: number;
  /** A skill choice this player still has to make (the run waits for everyone). */
  reward: RewardOffer | null;
  /** Where they stand in the current room. */
  x: number;
  y: number;
  dir: Facing;
  /** What they have bought in the current floor shop. */
  bought: string[];
  /** For the summary. */
  tally: { dmg: number; healed: number; downs: number; skills: number };
}

export interface FloorPub {
  /** 0, 1 or 2. */
  index: number;
  name: string;
  rooms: RoomPub[];
  cur: number;
  /** The current room puzzle, when it has one. */
  puzzle: PuzzleState | null;
}

export interface BattlePub {
  /** Goes up with every new fight, so a screen can tell a fresh one from a continued one. */
  id: number;
  kind: 'room' | 'elite' | 'boss';
  /** The Grim Reaper fights come one after another: which one this is (0..3), else -1. */
  stage: number;
  snap: BattleSnap;
  /** Seats that have locked in a move this round. */
  chosen: number[];
  /** Seconds left to choose before a move is made for you (0 = no limit). */
  clock: number;
  /** How many steps have been sent in this fight (a rejoining player skips what they missed). */
  sent: number;
}

export interface SummaryPub {
  won: boolean;
  /** Where it ended. */
  floor: number;
  rooms: number;
  bosses: string[];
  seconds: number;
  /** What ended it, if the party fell. */
  fellTo: string;
}

export interface RoomState {
  code: string;
  /** True for a run played alone inside the game (no server involved). */
  solo: boolean;
  phase: Phase;
  difficulty: Difficulty;
  seed: number;
  players: PlayerPub[];
  /** Which draft this is: 1 = starting spirit, 2 = after floor 1, 3 = after floor 2. */
  draftRound: number;
  /** Seconds left before choices are made for anyone still deciding (0 = no countdown). */
  countdown: number;
  floor: FloorPub | null;
  battle: BattlePub | null;
  summary: SummaryPub | null;
  /** Bosses beaten so far (ids), and rooms cleared. */
  bosses: string[];
  roomsCleared: number;
  /** Bumped on every change, so a client can tell a fresh state from a stale one. */
  rev: number;
}

export type ShopItem = 'tonic' | 'revive' | 'skill';
/** What the shopkeeper sells, and for how many wisps. */
export const SHOP: Record<ShopItem, { name: string; cost: number; desc: string }> = {
  tonic: { name: 'WISP TONIC', cost: 20, desc: 'Every spirit you own recovers 35% of its health.' },
  revive: { name: 'SECOND BREATH', cost: 30, desc: 'Your fallen spirits get back up at half health.' },
  skill: { name: 'CURIOUS RELIC', cost: 45, desc: 'A skill choice, with better odds than an ordinary room.' },
};

// ------------------------------------------------------------------ player -> host

export type ClientMsg =
  | { t: 'hello'; key: string; name: string; look: number; code?: string; create?: boolean }
  | { t: 'leave' }
  | { t: 'profile'; name?: string; look?: number }
  | { t: 'ready'; ready: boolean }
  | { t: 'difficulty'; difficulty: Difficulty }
  | { t: 'start' }
  | { t: 'draft_pick'; id: string }
  | { t: 'draft_lock'; locked: boolean }
  // ---- in the dungeon
  | { t: 'pos'; x: number; y: number; dir: Facing }
  | { t: 'door'; dir: Dir }
  | { t: 'engage' }
  | { t: 'use'; what: 'chest' | 'fire' | 'obelisk' | 'lamp' | 'mirror'; i?: number }
  | { t: 'push'; x: number; y: number; dir: Facing }
  | { t: 'lead'; spirit: number }
  | { t: 'buy'; item: ShopItem }
  // ---- in a fight
  | { t: 'act'; choice: CoopChoice }
  // ---- rewards
  | { t: 'reward_take'; skill: string; spirit: number; replace?: number }
  | { t: 'reward_skip' }
  /** Developer shortcuts for targeted tests. Only a solo run (where the host is this very game) obeys them. */
  | { t: 'dev'; cmd: 'room' | 'boss' | 'floor' | 'wisps' | 'heal' | 'weak' | 'reaper' | 'skill'; arg?: string }
  | { t: 'ping' };

// ------------------------------------------------------------------ host -> player

export type ServerMsg =
  | { t: 'welcome'; seat: number; code: string }
  | { t: 'state'; state: RoomState }
  | { t: 'error'; code: 'no_room' | 'full' | 'in_progress' | 'bad' | 'not_ready'; msg: string }
  | { t: 'note'; text: string }
  /** Someone walked (sent to everyone else; far lighter than a whole state). */
  | { t: 'pos'; seat: number; x: number; y: number; dir: Facing }
  /** What just happened in the fight, in order. `from` is the index of the first step. */
  | { t: 'steps'; battle: number; from: number; steps: Step[] }
  /** Something to see or hear in the room that is not state (a wrong symbol, the party moving on). */
  | { t: 'fx'; kind: 'wrong' | 'right' | 'solved' | 'door' | 'heal' | 'chest' | 'buy' | 'show'; seat?: number; text?: string }
  | { t: 'pong' };

export const NAME_MAX = 10;
export const CODE_LEN = 4;
/** Letters that cannot be mistaken for one another when read aloud or typed. */
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function cleanName(s: string): string {
  const t = (s ?? '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, NAME_MAX);
  return t || 'WISP';
}
