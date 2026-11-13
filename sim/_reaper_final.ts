// The roguelike's last fight alone: `npx tsx sim/_reaper_final.ts [fights] [hpMult] [dmgMult]`
declare const process: { argv: string[] };
import { mulberry32 } from '../src/engine/battle';
import { CoopBattle } from '../src/rogue/shared/coop';
import { averageTurn, foeDef } from '../src/rogue/shared/enemies';
import { PARTY_SCALE, bossScale, roomScale } from '../src/rogue/shared/config';
import { ROSTER } from '../src/rogue/shared/roster';
const N = Number(process.argv[2] ?? 60);
const HPM = Number(process.argv[3] ?? 1.4);
const DM = Number(process.argv[4] ?? 1);
const gen = ['vigor', 'edge', 'hide', 'kindling', 'opportunist', 'siphon', 'leech', 'momentum'];
for (const players of [1, 2, 3, 4]) {
  let wins = 0, rounds = 0, hp = 0;
  for (let k = 0; k < N; k++) {
    const rng = mulberry32(k * 7919 + players * 31 + 5);
    const sides = Array.from({ length: players }, (_, seat) => {
      const pool = [...ROSTER];
      const ids = [0, 1, 2].map(() => pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
      return { seat, spirits: ids.map((id) => ({ id, hp: 0.75, skills: Array.from({ length: 3 }, () => gen[Math.floor(rng() * gen.length)]).filter((x, i, a) => a.indexOf(x) === i) })) };
    });
    const def = foeDef('gr4');
    const t = bossScale('normal', players, 2, def.maxHp, averageTurn(def));
    t.hp *= HPM;
    t.dmg *= DM;
    const cb = new CoopBattle({ sides, foes: ['gr4'], scale: roomScale('normal', players, 2), tune: { gr4: t }, majorTargets: PARTY_SCALE[players].majorTargets, hazards: PARTY_SCALE[players].hazards, phaseAdds: PARTY_SCALE[players].bossAdds ? ['hollowguard', PARTY_SCALE[players].bossAdds] : undefined, rng });
    cb.supercharge();
    let g = 0;
    while (!cb.over && g++ < 150) {
      cb.beginRound();
      if (cb.over) break;
      cb.resolve(new Map(cb.standing().map((s) => [s.seat, cb.auto(s.seat)])));
    }
    const h = cb.sides.map((s) => s.party.reduce((n, m) => n + m.p.hp, 0) / s.party.reduce((n, m) => n + m.p.maxHp, 0));
    if (cb.over === 'victory') { wins++; hp += h.reduce((a, b) => a + b, 0) / h.length; }
    rounds += cb.round;
  }
  console.log(`${players}P  hp x${HPM} dmg x${DM}: win ${Math.round((wins / N) * 100)}%  rounds ${(rounds / N).toFixed(1)}  hp left ${wins ? Math.round((hp / wins) * 100) : 0}%`);
}
