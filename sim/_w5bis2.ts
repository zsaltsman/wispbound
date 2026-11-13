// Bisection fit for the supercharged starters: one size per temple creature + cub pair.
declare const process: { argv: string[] };
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { getCreature } from '../src/engine/creatures';
import { W2_CREATURES } from '../src/engine/creatures2';
import { PRISON_FOES, PRISON_TUNE } from '../src/engine/prison';
import { partySmart } from './policies';
const N = 70;
const TARGET = 0.6;
const foes = process.argv[2] ? [process.argv[2]] : Object.keys(PRISON_FOES).filter((f) => f !== 'skelwarden');
function rate(foe: string, ids: string[]) {
  let w = 0, t = 0;
  for (let k = 0; k < N; k++) {
    const cs = ids.map(getCreature);
    const b = new Battle(cs[0], mulberry32(k * 7919 + 5), PRISON_FOES[foe], cs.slice(1));
    while (!b.over && b.turn < 250) runRound(b, partySmart);
    t += b.turn;
    if (b.over === 'victory') w++;
  }
  return { w: w / N, t: t / N };
}
for (const foe of foes) {
  const out: Record<string, number> = {};
  const line: string[] = [];
  for (const a of W2_CREATURES.map((c) => c.id)) for (const c of ['scorvlet', 'widowling', 'ironbud']) {
    const key = a + '+' + c;
    let lo = 0.35, hi = 1.8;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      PRISON_TUNE[foe][key] = mid;
      if (rate(foe, [a, c]).w > TARGET) lo = mid; else hi = mid;
    }
    out[key] = PRISON_TUNE[foe][key] = +((lo + hi) / 2).toFixed(3);
    const r = rate(foe, [a, c]);
    line.push(`${key} ${out[key]} ${(r.w * 100).toFixed(0)}%/${r.t.toFixed(0)}t`);
  }
  console.log(foe + ': ' + line.join('  '));
  console.log('  ' + foe + ': ' + JSON.stringify(out));
}
