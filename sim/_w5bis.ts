// Bisection fit for the Skeleton Warden (one creature at a time).
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { getCreature } from '../src/engine/creatures';
import { PRISON_FOES, PRISON_TUNE } from '../src/engine/prison';
import { partySmart } from './policies';
const N = 120;
function rate(ids: string[]) {
  let w = 0, t = 0, hp = 0;
  for (let k = 0; k < N; k++) {
    const cs = ids.map(getCreature);
    const b = new Battle(cs[0], mulberry32(k * 7919 + 3), PRISON_FOES.skelwarden, cs.slice(1));
    while (!b.over && b.turn < 250) runRound(b, partySmart);
    t += b.turn;
    if (b.over === 'victory') { w++; hp += b.p.hp / b.p.maxHp; }
  }
  return { w: w / N, t: t / N, hp: w ? hp / w : 0 };
}
for (const c of ['scorvlet', 'widowling', 'ironbud']) {
  let lo = 0.5, hi = 1.6;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    PRISON_TUNE.skelwarden[c] = mid;
    const r = rate([c]);
    if (r.w > 0.55) lo = mid; else hi = mid;
  }
  PRISON_TUNE.skelwarden[c] = +((lo + hi) / 2).toFixed(3);
  const r = rate([c]);
  console.log(c, PRISON_TUNE.skelwarden[c], `${(r.w * 100).toFixed(0)}% ${r.t.toFixed(0)}t hp${(r.hp * 100).toFixed(0)}%`);
  for (const s of [0.9, 0.95, 1.05, 1.1]) {
    const keep = PRISON_TUNE.skelwarden[c];
    PRISON_TUNE.skelwarden[c] = keep * s;
    const q = rate([c]);
    console.log('   x' + s, `${(q.w * 100).toFixed(0)}%`);
    PRISON_TUNE.skelwarden[c] = keep;
  }
}
