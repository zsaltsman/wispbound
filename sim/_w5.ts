// World 5 balance: the Skeleton Warden against each Titan cub ALONE, and each
// supercharged starter against every temple creature + Titan cub pair.
declare const process: { argv: string[] };
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { getCreature } from '../src/engine/creatures';
import { W2_CREATURES } from '../src/engine/creatures2';
import { PRISON_FOES } from '../src/engine/prison';
import { partySmart } from './policies';

const N = Number(process.argv[2] ?? 300);
const only = process.argv[3];
const W3 = ['scorvlet', 'widowling', 'ironbud'];

function fight(foe: string, ids: string[]) {
  let wins = 0, turns = 0, hp = 0;
  const killers: Record<string, number> = {};
  for (let k = 0; k < N; k++) {
    const cs = ids.map(getCreature);
    const b = new Battle(cs[0], mulberry32(k * 7919 + 17), PRISON_FOES[foe], cs.slice(1));
    let last = '';
    while (!b.over && b.turn < 250) {
      last = b.intent.name;
      runRound(b, partySmart);
    }
    turns += b.turn;
    if (b.over === 'victory') {
      wins++;
      hp += b.party.reduce((s, m) => s + m.p.hp / m.p.maxHp, 0) / b.party.length;
    } else killers[last] = (killers[last] ?? 0) + 1;
  }
  const top = Object.entries(killers).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(' ');
  return `${((wins / N) * 100).toFixed(0).padStart(3)}%  t${(turns / N).toFixed(1).padStart(5)}  hp${wins ? ((hp / wins) * 100).toFixed(0) : '-'}%  ${top}`;
}

if (!only || only === 'skelwarden') {
  console.log('SKELETON WARDEN (one creature)');
  for (const c of W3) console.log('  ' + c.padEnd(22) + fight('skelwarden', [c]));
}
for (const foe of Object.keys(PRISON_FOES).filter((f) => f !== 'skelwarden')) {
  if (only && only !== foe) continue;
  console.log(foe.toUpperCase() + ' (temple + cub)');
  for (const w2 of W2_CREATURES) for (const c of W3) console.log('  ' + (w2.id + '+' + c).padEnd(22) + fight(foe, [w2.id, c]));
}
