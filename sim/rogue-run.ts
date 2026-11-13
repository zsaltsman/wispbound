// Whole roguelike runs, headless: `npx tsx sim/rogue-run.ts [runs] [difficulty]`.
// Bots sit in a real RoomHost and play from the lobby to the summary, for every party size.
// It checks that a run can always be finished (no dead ends, nothing left waiting), and
// prints how the tuning plays out over a full run rather than one fight at a time.
declare const process: { argv: string[]; exit(n: number): never };
import { RoomHost } from '../src/rogue/shared/host';
import type { ClientMsg, RoomState, ServerMsg } from '../src/rogue/shared/protocol';
import type { Difficulty } from '../src/rogue/shared/config';
import { DIRS } from '../src/rogue/shared/dungeon';
import { canHold } from '../src/rogue/shared/skills';

const RUNS = Number(process.argv[2] ?? 20);
const DIFF = (process.argv[3] ?? 'normal') as Difficulty;

function playRun(players: number, seed: number) {
  let state!: RoomState;
  const log: string[] = [];
  const host = new RoomHost('TEST', { send: (_s, m: ServerMsg) => { if (m.t === 'state') state = m.state; }, later: () => () => {}, closed: () => {}, now: () => 0 }, players === 1, seed);
  const send = (seat: number, m: ClientMsg) => host.handle(seat, m);
  for (let i = 0; i < players; i++) host.join('key-' + i, 'BOT' + i, i);
  send(0, { t: 'difficulty', difficulty: DIFF });
  for (let i = 1; i < players; i++) send(i, { t: 'ready', ready: true });
  send(0, { t: 'start' });
  const visited = new Set<string>();
  let guard = 0;
  let fights = 0;
  let rounds = 0;
  while (state.phase !== 'summary' && guard++ < 6000) {
    if (state.phase === 'draft') {
      for (const p of state.players) {
        send(p.seat, { t: 'draft_pick', id: p.offers[0] });
        send(p.seat, { t: 'draft_lock', locked: true });
      }
    } else if (state.phase === 'reward') {
      for (const p of state.players) {
        if (!p.reward) continue;
        let done = false;
        for (const sk of p.reward.offers) {
          const i = p.spirits.findIndex((s) => canHold(s, sk) && s.skills.length < 4);
          if (i >= 0) {
            send(p.seat, { t: 'reward_take', skill: sk, spirit: i });
            done = true;
            break;
          }
        }
        if (!done) send(p.seat, { t: 'reward_skip' });
      }
    } else if (state.phase === 'battle') {
      const cb = (host as any).battle;
      rounds++;
      for (const s of cb.standing()) send(s.seat, { t: 'act', choice: cb.auto(s.seat) });
    } else if (state.phase === 'dungeon') {
      const f = state.floor!;
      const room = f.rooms[f.cur];
      visited.add(f.index + ':' + room.id);
      if (!room.cleared && (room.kind === 'combat' || room.kind === 'elite' || room.kind === 'boss')) {
        fights++;
        send(0, { t: 'engage' });
        continue;
      }
      if (room.kind === 'treasure' && !room.used) {
        send(0, { t: 'use', what: 'chest' });
        continue;
      }
      if (room.kind === 'rest' && !room.used) {
        send(0, { t: 'use', what: 'fire' });
        continue;
      }
      if (room.kind === 'shop') {
        for (const p of state.players) {
          if (p.spirits.some((s) => s.hp <= 0)) send(p.seat, { t: 'buy', item: 'revive' });
          if (p.spirits.some((s) => s.hp > 0 && s.hp < 0.6)) send(p.seat, { t: 'buy', item: 'tonic' });
          send(p.seat, { t: 'buy', item: 'skill' });
        }
        if (state.players.some((p) => p.reward)) {
          for (const p of state.players) if (p.reward) send(p.seat, { t: 'reward_skip' });
        }
      }
      if (f.puzzle && !f.puzzle.solved && !visited.has('pz' + f.index + ':' + room.id)) {
        visited.add('pz' + f.index + ':' + room.id);
        const pz = f.puzzle;
        if (pz.kind === 'lights') {
          // try every combination of switches
          const n = pz.lamps!.length;
          for (let mask = 1; mask < 1 << n && !state.floor!.puzzle!.solved; mask++) {
            const lamps = [...pz.lamps!];
            for (let i = 0; i < n; i++) if (mask & (1 << i)) for (const k of [i - 1, i, i + 1]) if (k >= 0 && k < n) lamps[k] = !lamps[k];
            if (lamps.every(Boolean)) for (let i = 0; i < n; i++) if (mask & (1 << i)) send(0, { t: 'use', what: 'lamp', i });
          }
          if (!state.floor!.puzzle!.solved) log.push('lights unsolved');
        } else if (pz.kind === 'mirrors') {
          let tries = 0;
          while (!state.floor!.puzzle!.solved && tries++ < 64) {
            // walk the 16 combinations in Gray-code order: one mirror turned at a time
            const i = [0, 1, 0, 2, 0, 1, 0, 3][tries % 8];
            send(0, { t: 'use', what: 'mirror', i });
          }
          if (!state.floor!.puzzle!.solved) log.push('mirrors unsolved');
        }
        continue;
      }
      // ---- where next: the nearest room not yet visited (the boss last of all)
      const dist = new Map<number, { d: number; first: (typeof DIRS)[number] | null }>([[room.id, { d: 0, first: null }]]);
      const q = [room.id];
      let goal: { first: (typeof DIRS)[number] } | null = null;
      let bossWay: { first: (typeof DIRS)[number] } | null = null;
      while (q.length) {
        const id = q.shift()!;
        const r = f.rooms[id];
        const here = dist.get(id)!;
        if (id !== room.id && !visited.has(f.index + ':' + id)) {
          if (r.kind === 'boss') bossWay = bossWay ?? { first: here.first! };
          else if (!goal) goal = { first: here.first! };
        }
        // rooms that are not cleared cannot be walked through, except the one we stand in
        if (id !== room.id && !r.cleared && (r.kind === 'combat' || r.kind === 'elite' || r.kind === 'boss')) continue;
        for (const dir of DIRS) {
          const to = r.doors[dir];
          if (to === undefined || dist.has(to)) continue;
          dist.set(to, { d: here.d + 1, first: here.first ?? dir });
          q.push(to);
        }
      }
      const way = goal ?? bossWay;
      if (!way) {
        log.push('no way on from room ' + room.id + ' (' + room.kind + ')');
        break;
      }
      send(0, { t: 'door', dir: way.first });
    } else break;
  }
  if (state.phase !== 'summary') log.push('STUCK in ' + state.phase);
  return { state, log, fights, rounds };
}

for (const players of [1, 2, 3, 4]) {
  let wins = 0;
  const died: Record<string, number> = {};
  const problems: string[] = [];
  let rooms = 0, rounds = 0, skills = 0;
  const bossSeen = new Set<string>();
  for (let k = 0; k < RUNS; k++) {
    const r = playRun(players, 1000 + k * 37 + players);
    const s = r.state.summary;
    for (const l of r.log) problems.push(`run ${k}: ${l}`);
    if (!s) continue;
    if (s.won) wins++;
    else died[`F${s.floor + 1} ${s.fellTo}`] = (died[`F${s.floor + 1} ${s.fellTo}`] ?? 0) + 1;
    rooms += s.rooms;
    rounds += r.rounds;
    skills += r.state.players.reduce((n, p) => n + p.tally.skills, 0) / players;
    for (const b of s.bosses) bossSeen.add(b);
  }
  console.log(`\n${players} PLAYER${players > 1 ? 'S' : ''} (${DIFF}): won ${wins}/${RUNS}   rooms ${(rooms / RUNS).toFixed(1)}   rounds ${(rounds / RUNS).toFixed(0)}   skills each ${(skills / RUNS).toFixed(1)}`);
  console.log('  fell to: ' + (Object.entries(died).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} x${v}`).join(', ') || '-'));
  console.log('  bosses beaten: ' + [...bossSeen].join(', '));
  if (problems.length) console.log('  PROBLEMS: ' + [...new Set(problems)].slice(0, 6).join(' | '));
}
process.exit(0);
