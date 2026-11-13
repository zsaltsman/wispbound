// The God of Death: win rates (and fits) for the four fights, per party.
//   npx tsx sim/_final.ts rate [foe]       win rate at the current tune, every party
//   npx tsx sim/_final.ts fit <foe>        bisect one size per party for the target
declare const process: { argv: string[] };
import { Battle, mulberry32, runRound } from '../src/engine/battle';
import { getCreature } from '../src/engine/creatures';
import { FINAL_FOES, FINAL_TUNE, ALLY_POWER, ALLY_NAMES, finalKey, type AllyDef } from '../src/engine/final';
import { partySmart } from './policies';

const W1 = ['booheet', 'shipwraith', 'hauntcorn', 'umbrawl', 'tickraith'];
const W2 = ['glowbell', 'hammerfin', 'bubblotl', 'glidray'];
const W3 = ['scorvlet', 'widowling', 'ironbud'];
const GUARD = ['wispmane', 'viperwind'];
const N = +(process.argv[4] ?? 40);
const TARGET: Record<string, number> = { gr1: 0.55, gr2: 0.5, gr3: 0.6, gr4: 0.5 };

/** The party each fight is fought with. */
function partyFor(foe: string, own: string[], g: string): string[] {
  if (foe === 'gr1') return own;
  if (foe === 'gr2') return [...own, 'gd_' + g, 'flamora'];
  if (foe === 'gr3') return [...own, 'gd_' + g, 'flamora'];
  return [...own.map((x) => 'x_' + x), 'gd_' + g];
}

/** The helpers of the true form: a spirit of each world the player did not choose. */
function allies(own: string[]): AllyDef[] {
  const un = (pool: string[]) => pool.filter((x) => !own.includes(x));
  const mk = (who: AllyDef['who'], creature: string): AllyDef => ({ who, name: ALLY_NAMES[who], creature, power: ALLY_POWER[who] });
  return [mk('pipwick', un(W2)[0]), mk('oracle', own.includes('tickraith') ? un(W1)[0] : 'tickraith'), mk('ayla', un(W3)[0])];
}

/** One fight; for the true form, one section (from milestone `sec` to the next). */
function once(foe: string, ids: string[], seed: number, sec = 0): { win: boolean; t: number } {
  const cs = ids.map(getCreature);
  const b = new Battle(cs[0], mulberry32(seed), FINAL_FOES[foe], cs.slice(1));
  if (foe === 'gr3') {
    const own = ids.slice(0, 3);
    const al = allies(own);
    if (sec > 0) {
      b.startAt(1 - 0.2 * sec, sec + 1);
      b.setAlly(al[sec - 1]);
    }
    while (!b.over && b.turn < 200 && b.b.phase === sec + 1) runRound(b, partySmart);
    return { win: b.over !== 'defeat' && b.b.phase > sec + 1, t: b.turn };
  }
  while (!b.over && b.turn < 250) runRound(b, partySmart);
  return { win: b.over === 'victory', t: b.turn };
}

function rate(foe: string, ids: string[], sec = 0) {
  let w = 0, t = 0;
  for (let k = 0; k < N; k++) {
    const r = once(foe, ids, k * 7919 + 13 + sec * 101, sec);
    if (r.win) w++;
    t += r.t;
  }
  return { w: w / N, t: t / N };
}

const parties: string[][] = [];
for (const a of W1) for (const b of W2) for (const c of W3) parties.push([a, b, c]);

const mode = process.argv[2] ?? 'rate';
const foes = process.argv[3] ? [process.argv[3]] : Object.keys(FINAL_FOES);
for (const foe of foes) {
  const gs = foe === 'gr1' ? [GUARD[0]] : GUARD;
  const secs = foe === 'gr3' ? [0, 1, 2, 3] : [0];
  const out: Record<string, number> = {};
  let sumW = 0, sumT = 0, cnt = 0, lo = 9, hi = 0;
  for (const own of parties)
    for (const g of gs) {
      const ids = partyFor(foe, own, g);
      const key = finalKey(ids.map(getCreature));
      const avg = () => {
        let w = 0, t = 0;
        for (const s of secs) {
          const r = rate(foe, ids, s);
          w += r.w;
          t += r.t;
        }
        return { w: w / secs.length, t };
      };
      if (mode === 'fit') {
        let l = 0.4, h = 3.4;
        for (let i = 0; i < 6; i++) {
          const mid = (l + h) / 2;
          FINAL_TUNE[foe][key] = mid;
          if (avg().w > TARGET[foe]) l = mid;
          else h = mid;
        }
        out[key] = FINAL_TUNE[foe][key] = +((l + h) / 2).toFixed(3);
      }
      const r = avg();
      sumW += r.w;
      sumT += r.t;
      cnt++;
      lo = Math.min(lo, r.w);
      hi = Math.max(hi, r.w);
      if (mode === 'rate' && process.argv[5] === 'v') console.log(`  ${key} ${(r.w * 100).toFixed(0)}% ${r.t.toFixed(0)}t`);
    }
  console.log(`${foe}: mean ${((sumW / cnt) * 100).toFixed(0)}% (min ${(lo * 100).toFixed(0)} max ${(hi * 100).toFixed(0)}) turns ${(sumT / cnt).toFixed(1)}`);
  if (mode === 'fit') console.log('  ' + foe + ': ' + JSON.stringify(out));
}
