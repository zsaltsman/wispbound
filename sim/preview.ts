// ASCII preview of a map: `npx tsx sim/preview.ts town`
declare const process: { argv: string[] };
import { buildTown } from '../src/world/maps/town';
import { T, D, SOLID_GROUND } from '../src/world/tiles';
import { blockedStatic } from '../src/world/mapdef';
import { newState } from '../src/story/state';
import { ALL_MAPS } from '../src/world/maps';

const id = process.argv[2] ?? 'town';
const m = ALL_MAPS()[id];
const st = newState();
st.flags.office_scene = true;
const lines: string[] = [];
for (let y = 0; y < m.h; y++) {
  let row = '';
  for (let x = 0; x < m.w; x++) {
    const g = m.ground[y * m.w + x];
    const w = m.warps.find((w) => w.x === x && w.y === y);
    const n = m.npcs.find((n) => n.x === x && n.y === y);
    const s = m.spots.find((s) => s.x === x && s.y === y);
    let c = ' ';
    if (w) c = 'D';
    else if (n) c = '@';
    else if (s) c = '?';
    else if (g === T.WATER) c = '~';
    else if (blockedStatic(m, x, y, st)) c = '#';
    else if (g === T.COBBLE || g === T.COBBLE2 || g === T.PLAZA) c = '=';
    else if (g === T.SAND || g === T.WETSAND || g === T.SAND2) c = ':';
    else if (g === T.DOCK_V || g === T.DOCK) c = 'H';
    else c = '.';
    row += c;
  }
  lines.push(row);
}
console.log(lines.join('\n'));
void buildTown; void D; void SOLID_GROUND;
