// Fits PRISON_TUNE so every party lands near the target smart-play win rate.
declare const process: { argv: string[] };
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { getCreature } from '../src/engine/creatures';
import { W2_CREATURES } from '../src/engine/creatures2';
import { PRISON_FOES, PRISON_TUNE } from '../src/engine/prison';
import { partySmart } from './policies';

const N = Number(process.argv[2] ?? 100);
const ROUNDS = Number(process.argv[3] ?? 6);
const only = process.argv[4];
const W3 = ['scorvlet', 'widowling', 'ironbud'];
const W2 = W2_CREATURES.map((c) => c.id);

function rate(foe: string, ids: string[], seed: number) {
  let wins = 0, turns = 0;
  for (let k = 0; k < N; k++) {
    const cs = ids.map(getCreature);
    const b = new Battle(cs[0], mulberry32(k * 7919 + seed), PRISON_FOES[foe], cs.slice(1));
    while (!b.over && b.turn < 250) runRound(b, partySmart);
    turns += b.turn;
    if (b.over === 'victory') wins++;
  }
  return { w: wins / N, t: turns / N };
}

for (const foe of Object.keys(PRISON_FOES)) {
  if (only && foe !== only) continue;
  const target = foe === 'skelwarden' ? 0.55 : 0.5;
  const combos = foe === 'skelwarden' ? W3.map((c) => [c]) : W2.flatMap((a) => W3.map((c) => [a, c]));
  const t = PRISON_TUNE[foe];
  for (let r = 0; r < ROUNDS; r++) {
    const res = combos.map((ids) => ({ ids, ...rate(foe, ids, 17 + r * 101) }));
    const members = [...new Set(combos.flat())];
    for (const m of members) {
      const mine = res.filter((x) => x.ids.includes(m));
      const avg = mine.reduce((s, x) => s + x.w, 0) / mine.length;
      // a party that wins too often meets a bigger jailer
      t[m] = +((t[m] ?? 1) * Math.exp(1.1 * (avg - target) * (foe === 'skelwarden' ? 1 : 0.7))).toFixed(3);
    }
    if (r === ROUNDS - 1 || r % 2 === 1) {
      console.log(`${foe} round ${r}: ` + res.map((x) => `${x.ids.join('+')} ${(x.w * 100).toFixed(0)}%/${x.t.toFixed(0)}t`).join('  '));
    }
  }
  console.log(`  ${foe}: ${JSON.stringify(t)}`);
}
