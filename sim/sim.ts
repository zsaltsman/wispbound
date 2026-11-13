// Headless balance simulator: `npm run sim`.
// Plays thousands of fights per creature with a thoughtful heuristic policy and a
// random policy, and prints win rates / fight length so the numbers can be tuned.
declare const process: { argv: string[] };
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { CREATURES } from '../src/engine/creatures';
import { smart, type Policy } from './policies';
import { FISHERMAN } from '../src/engine/fisherman';
import { DUTCHMAN } from '../src/engine/boss';
import { SALESMAN } from '../src/engine/salesman';
import { KRAKEN } from '../src/engine/kraken';
import { TITANS } from '../src/engine/titans';
import { SPIRITS } from '../src/engine/spirits';
import { W3_CREATURES } from '../src/engine/creatures3';
import { W2_CREATURES } from '../src/engine/creatures2';
import { partySmart } from './policies';

const ENEMY = TITANS[process.argv[3]] ?? (process.argv[3] === 'kraken' ? KRAKEN : process.argv[3] === 'fisherman' ? FISHERMAN : process.argv[3] === 'salesman' ? SALESMAN : DUTCHMAN);


const random: Policy = (b) => {
  const usable = b.creature.abilities.map((_, i) => i).filter((i) => b.canUse(i).ok);
  return usable[Math.floor(Math.random() * usable.length)];
};

const spam: Policy = (b) => 0; // only ever basic-attack

function run(policy: Policy, creatureIdx: number, n: number) {
  let wins = 0;
  let turns = 0;
  let phaseSum = 0;
  let hpLeft = 0;
  const deathsByPhase = [0, 0, 0];
  const killers: Record<string, number> = {};
  for (let k = 0; k < n; k++) {
    const b = new Battle(CREATURES[creatureIdx], mulberry32(k * 7919 + creatureIdx * 31 + 1), ENEMY);
    let lastIntent = '';
    while (!b.over && b.turn < 200) {
      lastIntent = b.intent.name;
      runRound(b, policy);
    }
    turns += b.turn;
    phaseSum += b.b.phase;
    if (b.over === 'victory') {
      wins++;
      hpLeft += b.p.hp / b.p.maxHp;
    } else {
      deathsByPhase[b.b.phase - 1]++;
      killers[lastIntent] = (killers[lastIntent] ?? 0) + 1;
    }
  }
  return {
    win: ((wins / n) * 100).toFixed(1) + '%',
    turns: (turns / n).toFixed(1),
    phase: (phaseSum / n).toFixed(2),
    hpLeftOnWin: wins ? ((hpLeft / wins) * 100).toFixed(0) + '%' : '-',
    deaths: deathsByPhase.join('/'),
    topKillers: Object.entries(killers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}:${v}`)
      .join(', '),
  };
}

const N = Number(process.argv[2] ?? 2000);
if (ENEMY.id in SPIRITS) {
  // World 4: every World 1 spirit, temple creature and Titan cub together
  const wins: Record<string, [number, number]> = {};
  let all = 0;
  let allWins = 0;
  let turns = 0;
  const deaths = [0, 0, 0];
  for (const a of CREATURES)
    for (const c of W2_CREATURES)
      for (const d of W3_CREATURES)
        for (let k = 0; k < N; k++) {
          const b = new Battle(a, mulberry32(k * 7919 + a.hp * 3 + c.hp * 7 + d.hp), ENEMY, [c, d]);
          while (!b.over && b.turn < 250) runRound(b, partySmart);
          all++;
          turns += b.turn;
          const key = a.name;
          wins[key] = wins[key] ?? [0, 0];
          wins[key][1]++;
          if (b.over === 'victory') {
            allWins++;
            wins[key][0]++;
          } else deaths[b.b.phase - 1]++;
        }
  console.log(`${ENEMY.name}: win=${((allWins / all) * 100).toFixed(1)}%  turns=${(turns / all).toFixed(1)}  deaths=${deaths.join('/')}`);
  for (const [k, [w, n]] of Object.entries(wins)) console.log(`  lead ${k}: ${((w / n) * 100).toFixed(1)}%`);
  (globalThis as any).process.exit(0);
}
if (ENEMY === KRAKEN || ENEMY.id in TITANS) {
  // every World 1 spirit paired with every temple creature
  const runParty = (a: typeof CREATURES[number], b2: typeof CREATURES[number], n: number) => {
    let wins = 0;
    let turns = 0;
    let both = 0;
    const deaths = [0, 0, 0];
    for (let k = 0; k < n; k++) {
      const b = new Battle(a, mulberry32(k * 7919 + a.hp + b2.hp), ENEMY, b2);
      while (!b.over && b.turn < 250) runRound(b, partySmart);
      turns += b.turn;
      if (b.over === 'victory') {
        wins++;
        if (b.party.every((m) => m.p.hp > 0)) both++;
      } else deaths[b.b.phase - 1]++;
    }
    return `win=${((wins / n) * 100).toFixed(1)}%  bothStanding=${((both / Math.max(1, wins)) * 100).toFixed(0)}%  turns=${(turns / n).toFixed(1)}  deaths=${deaths.join('/')}`;
  };
  const seconds = process.argv[4] === 'w3' ? W3_CREATURES : W2_CREATURES;
  for (const a of CREATURES) for (const c of seconds) console.log(`${a.name} + ${c.name}: ${runParty(a, c, N)}`);
  (globalThis as any).process.exit(0);
}
for (let i = 0; i < CREATURES.length; i++) {
  const c = CREATURES[i];
  console.log(`\n${c.name} (${c.cls})`);
  const fmt = (r: ReturnType<typeof run>) => Object.entries(r).map(([k, v]) => `${k}=${v}`).join('  ');
  console.log('  smart :', fmt(run(smart[c.id], i, N)));
  console.log('  random:', fmt(run(random, i, Math.floor(N / 2))));
  console.log('  basic :', fmt(run(spam, i, Math.floor(N / 4))));
}
