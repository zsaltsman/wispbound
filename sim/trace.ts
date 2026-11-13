// Prints a turn-by-turn log of one simulated fight: `npx tsx sim/trace.ts tickraith 3`
declare const process: { argv: string[] };
import { Battle, mulberry32 } from '../src/engine/battle';
import { CREATURES } from '../src/engine/creatures';
import { smart } from './policies';

const id = process.argv[2] ?? 'tickraith';
const seed = Number(process.argv[3] ?? 1);
const c = CREATURES.find((x) => x.id === id)!;
const b = new Battle(c, mulberry32(seed));
while (!b.over && b.turn < 120) {
  b.startPlayerTurn();
  if (b.over) break;
  const est = b.estimateIntent();
  const intent = `${b.intent.hidden ? '???' : b.intent.name}[${b.intent.stage}] est=${est.total}`;
  const i = smart[id](b);
  const r = b.playerAct(i);
  const dealt = r.hits.reduce((s, h) => s + h.amount, 0);
  let line = `T${String(b.turn).padStart(2)} P${b.b.phase} hp=${String(b.p.hp).padStart(3)} en=${b.p.en} boss=${String(b.b.hp).padStart(4)} | ${r.name.padEnd(16)} dmg=${String(dealt).padStart(3)} | ${intent}`;
  if (b.over) { console.log(line); break; }
  const np = b.checkPhase();
  if (np) { console.log(line + `  >> PHASE ${np}`); b.endRound(true); continue; }
  const hp0 = b.p.hp;
  const br = b.bossTurn();
  line += ` -> took ${hp0 - b.p.hp}` + (br.some(x=>x.post.some(e=>e.t==='counter')) ? ' (counter)' : '');
  console.log(line);
  if (b.over) break;
  b.endRound();
}
console.log('RESULT', b.over, 'turns', b.turn, 'boss', b.b.hp, 'player', b.p.hp);
