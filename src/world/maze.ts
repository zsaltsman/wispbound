// Deterministic maze generation for the cave and the cellar.
// A depth-first "perfect" maze guarantees everything is reachable; a few walls
// are then knocked out so it loops a little and never feels unfair.

export interface Maze {
  w: number;
  h: number;
  open: boolean[]; // tile grid, true = floor
  deadEnds: [number, number][];
  far: [number, number]; // farthest floor tile from the start
  dist: number[];
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000000) / 1000000;
  };
}

export function makeMaze(cw: number, ch: number, seed: number, loops: number, rooms: [number, number, number, number][] = []): Maze {
  const w = cw * 2 + 1;
  const h = ch * 2 + 1;
  const open = new Array(w * h).fill(false);
  const r = rng(seed);
  const seen = new Array(cw * ch).fill(false);
  const stack: [number, number][] = [[0, 0]];
  seen[0] = true;
  open[1 * w + 1] = true;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb: [number, number][] = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ny * cw + nx]) nb.push([nx, ny]);
    }
    if (!nb.length) {
      stack.pop();
      continue;
    }
    // prefer to keep going straight a little for long corridors
    const [nx, ny] = nb[Math.floor(r() * nb.length)];
    seen[ny * cw + nx] = true;
    open[(cy * 2 + 1 + (ny - cy)) * w + (cx * 2 + 1 + (nx - cx))] = true;
    open[(ny * 2 + 1) * w + (nx * 2 + 1)] = true;
    stack.push([nx, ny]);
  }
  // knock out a few walls to create loops
  for (let i = 0; i < loops; i++) {
    const x = 1 + Math.floor(r() * (w - 2));
    const y = 1 + Math.floor(r() * (h - 2));
    if (open[y * w + x]) continue;
    const horiz = open[y * w + x - 1] && open[y * w + x + 1] && !open[(y - 1) * w + x] && !open[(y + 1) * w + x];
    const vert = open[(y - 1) * w + x] && open[(y + 1) * w + x] && !open[y * w + x - 1] && !open[y * w + x + 1];
    if (horiz || vert) open[y * w + x] = true;
  }
  // open rooms (x, y, w, h in tiles)
  for (const [rx, ry, rw, rh] of rooms)
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) if (x > 0 && y > 0 && x < w - 1 && y < h - 1) open[y * w + x] = true;

  // distances from the start
  const dist = new Array(w * h).fill(-1);
  const q: number[] = [1 * w + 1];
  dist[q[0]] = 0;
  while (q.length) {
    const i = q.shift()!;
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const j = (y + dy) * w + (x + dx);
      if (open[j] && dist[j] < 0) {
        dist[j] = dist[i] + 1;
        q.push(j);
      }
    }
  }
  const deadEnds: [number, number][] = [];
  let far: [number, number] = [1, 1];
  let best = 0;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      if (!open[y * w + x]) continue;
      const n = [open[y * w + x - 1], open[y * w + x + 1], open[(y - 1) * w + x], open[(y + 1) * w + x]].filter(Boolean).length;
      if (n === 1) deadEnds.push([x, y]);
      if (dist[y * w + x] > best) {
        best = dist[y * w + x];
        far = [x, y];
      }
    }
  return { w, h, open, deadEnds, far, dist };
}
