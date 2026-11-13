// Validates every map headlessly: `npx tsx sim/maps-check.ts`
// - warps lead to existing maps and land on walkable tiles
// - from every entrance, every door, NPC, examinable spot and trigger is reachable
// Run against "late game" story state (every door unlocked) and "early" state.
import { ALL_MAPS } from '../src/world/maps';
import { blockedStatic, reachAcross, type MapDef } from '../src/world/mapdef';
import { newState, type StoryState } from '../src/story/state';

const maps = ALL_MAPS();
let problems = 0;
const fail = (m: string) => {
  problems++;
  console.log('  ✗ ' + m);
};

function lateState(): StoryState {
  const st = newState();
  for (const k of ['office_scene', 'bedroom_open', 'shelf_moved', 'closet_open', 'bait_cellar', 'blocker_moved', 'farm_met', 'farm_told'])
    st.flags[k] = true;
  st.creature = 'booheet';
  return st;
}

function reach(m: MapDef, st: StoryState, sx: number, sy: number) {
  const seen = new Set<number>();
  const q: [number, number][] = [[sx, sy]];
  seen.add(sy * m.w + sx);
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = ny * m.w + nx;
      if (seen.has(k)) continue;
      if (blockedStatic(m, nx, ny, st)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

const adjReached = (m: MapDef, seen: Set<number>, x: number, y: number) =>
  [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => seen.has((y + dy) * m.w + (x + dx)) || (reachAcross(m, x + dx, y + dy) && seen.has((y + 2 * dy) * m.w + (x + 2 * dx)))) ||
  seen.has(y * m.w + x);

function w2State(late: boolean): StoryState {
  const st = lateState();
  for (const k of ['ending_done', 'w2_started', 'w2_local_met', 'w2_inv_met', 'w2_inv_follow']) st.flags[k] = true;
  if (late) for (const k of ['w2_evac_done', 'w2_pb_taken', 'w2_stole']) st.flags[k] = true;
  return st;
}

/** Deep in World 2: every temple puzzle solved (the temples are only fully walkable then). */
function deepState(): StoryState {
  const st = w2State(true);
  for (const k of ['w2_cave', 'zeus_open', 'thor_m1', 'thor_m2', 'thor_m3', 'thor_pit', 'thor_hammer', 'thor_wall_broken', 'pos_gate', 'ath_open', 'ath_shelf', 'kraken_seen']) st.flags[k] = true;
  st.flags.w2_god = 'zeus';
  return st;
}
const TEMPLE = /^(t_|w2_vault|w2_escape)/;

/** World 3, mid-adventure (day 2: Ayla with you, the clinic open). */
function w3State(): StoryState {
  const st = deepState();
  for (const k of ['w3_started', 'w3_guide_met', 'w3_id', 'w3_in_club', 'w3_day2', 'w3_followed', 'w3_clinic_open']) st.flags[k] = true;
  st.creature2 = 'glowbell';
  return st;
}

for (const [label, st] of [
  ['late game', lateState()],
  ['world 2', w2State(false)],
  ['world 2 evacuated', w2State(true)],
  ['world 2 deep', deepState()],
  ['world 3', w3State()],
  ['early game', newState()],
] as const) {
  console.log(`\n== ${label} ==`);
  for (const m0 of Object.values(maps)) {
    const before = problems;
    // temples change as you solve them: check them once, fully solved (Poseidon's basins drained)
    if (TEMPLE.test(m0.id) !== (label === 'world 2 deep') && label !== 'early game') continue;
    if ((m0.world === 3) !== (label === 'world 3') && label !== 'early game') continue;
    if (m0.id === 'w3_hideout' || m0.id === 'w3_memhome') continue; // cutscene sets
    const m = m0.id === 't_poseidon' ? { ...m0, ground: m0.ground.map((t) => (t === 200 ? 201 : t)) } : m0.id === 't_thor' ? { ...m0, ground: m0.ground.map((t) => (t === 196 ? 197 : t)) } : m0;
    // entrances: spawn + every arrival point from other maps
    const entries: [number, number][] = [[m.spawn.x, m.spawn.y]];
    for (const o of Object.values(maps)) for (const w of o.warps) if (w.to === m.id) entries.push([w.tx, w.ty]);
    // World 4, tower 5F: the vine swing lands you on the far ledge, or drops you onto the one below
    if (m.id === 'w4_t5') entries.push([11, 5], [7, 10]);
    const w2 = (m.world ?? 1) === 2;
    if (m.world !== 3 && w2 !== label.startsWith('world 2') && label !== 'early game') continue;
    if (m.id === 'w2_gov' || m.id === 'w2_deep') continue; // cutscene sets, never walked
    for (const [x, y] of entries) if (blockedStatic(m, x, y, st) && label !== 'early game') fail(`${m.id}: arrival (${x},${y}) is blocked`);
    for (const w of m.warps) if (!maps[w.to]) fail(`${m.id}: warp to unknown map ${w.to}`);
    if (label === 'early game') continue;
    const seen = new Set<number>();
    for (const [x, y] of entries) for (const k of reach(m, st, x, y)) seen.add(k);
    for (const w of m.warps) if (!adjReached(m, seen, w.x, w.y)) fail(`${m.id}: warp at (${w.x},${w.y}) -> ${w.to} unreachable`);
    for (const s of m.spots) if (!adjReached(m, seen, s.x, s.y)) fail(`${m.id}: spot ${s.id} at (${s.x},${s.y}) unreachable`);
    for (const n of m.npcs) if (!n.ambient && (!n.show || n.show(st)) && !adjReached(m, seen, n.x, n.y)) fail(`${m.id}: npc ${n.id} at (${n.x},${n.y}) unreachable`);
    for (const t of m.triggers) {
      let ok = false;
      for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) if (seen.has(y * m.w + x)) ok = true;
      if (!ok) fail(`${m.id}: trigger ${t.id} unreachable`);
    }
    if (problems === before) console.log(`  ✓ ${m.id} (${m.w}x${m.h}, ${seen.size} walkable)`);
  }
}
console.log(problems ? `\n${problems} problem(s)` : '\nAll maps OK');
if (problems) (globalThis as any).process.exitCode = 1;
