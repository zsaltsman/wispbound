// Headless roguelike fights: `npx tsx sim/rogue-sim.ts [fights]`.
// Plays rooms and bosses with the co-op rules and the same "sensible move" the game uses for
// a player who is away, for every party size, so the tuning tables can be checked.
declare const process: { argv: string[]; exit(n: number): never };
import { mulberry32 } from '../src/engine/battle';
import { CoopBattle } from '../src/rogue/shared/coop';
import { BOSSES, ELITES, PACKS, averageTurn, foeDef } from '../src/rogue/shared/enemies';
import { ELITE_SCALE, PARTY_SCALE, bossScale, roomScale, type Difficulty } from '../src/rogue/shared/config';
import { ROSTER } from '../src/rogue/shared/roster';

const N = Number(process.argv[2] ?? 60);
const DIFF = (process.argv[3] ?? 'normal') as Difficulty;

function party(rng: () => number, players: number, spirits: number, skills: number) {
  return Array.from({ length: players }, (_, seat) => {
    const pool = [...ROSTER];
    const ids: string[] = [];
    for (let i = 0; i < spirits; i++) ids.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
    const gen = ['vigor', 'edge', 'hide', 'kindling', 'opportunist', 'siphon', 'leech', 'momentum'];
    return { seat, spirits: ids.map((id) => ({ id, hp: 1, skills: Array.from({ length: skills }, () => gen[Math.floor(rng() * gen.length)]).filter((x, k, a) => a.indexOf(x) === k) })) };
  });
}

function fight(seed: number, players: number, floor: number, foes: string[], tune?: Record<string, { hp: number; dmg: number }>, elite = false) {
  const rng = mulberry32(seed);
  const scale = roomScale(DIFF, players, floor);
  if (elite) {
    scale.hp *= ELITE_SCALE.hp;
    scale.dmg *= ELITE_SCALE.dmg;
  }
  const cb = new CoopBattle({ sides: party(rng, players, floor + 1, floor * 3), foes, scale, tune, majorTargets: PARTY_SCALE[players].majorTargets, hazards: PARTY_SCALE[players].hazards, phaseAdds: PARTY_SCALE[players].bossAdds ? ['bonerunner', PARTY_SCALE[players].bossAdds] : undefined, rng });
  let guard = 0;
  while (!cb.over && guard++ < 120) {
    cb.beginRound();
    if (cb.over) break;
    const ch = new Map(cb.standing().map((s) => [s.seat, cb.auto(s.seat)]));
    cb.resolve(ch);
  }
  const hp = cb.sides.map((s) => s.party.reduce((n, m) => n + m.p.hp, 0) / s.party.reduce((n, m) => n + m.p.maxHp, 0));
  return { win: cb.over === 'victory', rounds: cb.round, hp: hp.reduce((a, b) => a + b, 0) / hp.length, stuck: !cb.over };
}

function report(label: string, players: number, floor: number, foes: (seed: number) => string[], tuneFor?: (foes: string[]) => Record<string, { hp: number; dmg: number }>, elite = false) {
  let wins = 0, rounds = 0, hp = 0, stuck = 0;
  for (let k = 0; k < N; k++) {
    const f = foes(k);
    const r = fight(k * 7919 + players * 31 + floor * 101 + 5, players, floor, f, tuneFor?.(f), elite);
    wins += r.win ? 1 : 0;
    rounds += r.rounds;
    hp += r.win ? r.hp : 0;
    stuck += r.stuck ? 1 : 0;
  }
  console.log(`  ${label.padEnd(26)} win ${String(Math.round((wins / N) * 100)).padStart(3)}%  rounds ${(rounds / N).toFixed(1).padStart(5)}  hp left ${wins ? Math.round((hp / wins) * 100) : 0}%${stuck ? `  STUCK ${stuck}` : ''}`);
}

for (const players of [1, 2, 3, 4]) {
  console.log(`\n== ${players} PLAYER${players > 1 ? 'S' : ''} (${DIFF}) ==`);
  for (let floor = 0; floor < 3; floor++) {
    const extra = PARTY_SCALE[players].extraEnemies;
    report(`floor ${floor + 1} rooms`, players, floor, (k) => {
      const p = PACKS[floor].filter((x) => !x.danger)[k % PACKS[floor].filter((x) => !x.danger).length];
      return [...p.foes, ...p.extra.slice(0, extra)].slice(0, 5);
    });
    report(`floor ${floor + 1} danger rooms`, players, floor, (k) => {
      const d = PACKS[floor].filter((x) => x.danger);
      const p = d[k % d.length];
      return [...p.foes, ...p.extra.slice(0, extra)].slice(0, 5);
    });
    report(`floor ${floor + 1} elites`, players, floor, (k) => [...ELITES[k % ELITES.length].foes, ...ELITES[k % ELITES.length].extra.slice(0, extra)], undefined, true);
  }
  for (let floor = 0; floor < 2; floor++) {
    for (const b of BOSSES.filter((x) => x.floors.includes(floor))) {
      report(`F${floor + 1} boss ${b.id}`, players, floor, () => [b.id], () => ({ [b.id]: bossScale(DIFF, players, floor, foeDef(b.id).maxHp, averageTurn(foeDef(b.id))) }));
    }
  }
}
process.exit(0);
