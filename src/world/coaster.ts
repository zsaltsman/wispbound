// The Thrill Harbor roller coaster: one closed track, shared by the map (which
// paints it) and the ride (which drives the car along it). Pure data, no Phaser.

export interface TrackPt {
  x: number; // ground position, pixels in the park map
  y: number;
  h: number; // height above the ground, pixels
  broken?: boolean; // a section that gives way during the ride
}

/** Control points in tiles (x, y) with heights in pixels. Runs anticlockwise from the station. */
const CTRL: [number, number, number, number?][] = [
  [7, 27, 2],
  [5, 24, 10],
  [4, 20, 44],
  [4, 15, 92],
  [4, 10, 132],
  [6, 8, 124],
  [10, 7, 108],
  [14, 7, 22, 1],
  [17, 10, 8],
  [20, 12, 66],
  [22, 16, 84],
  [20, 20, 40],
  [16, 22, 26],
  [13, 19, 56],
  [10, 21, 22],
  [12, 25, 12],
  [10, 28, 4],
];

function cr(a: number, b: number, c: number, d: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

let cache: TrackPt[] | null = null;

/** The track sampled every ~4 pixels along its length. */
export function coasterTrack(): TrackPt[] {
  if (cache) return cache;
  const pts = CTRL.map(([x, y, h, br]) => ({ x: x * 16 + 8, y: y * 16 + 8, h, broken: !!br }));
  const out: TrackPt[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y - (p2.h - p1.h));
    const steps = Math.max(4, Math.ceil(len / 4));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push({
        x: cr(p0.x, p1.x, p2.x, p3.x, t),
        y: cr(p0.y, p1.y, p2.y, p3.y, t),
        h: Math.max(0, cr(p0.h, p1.h, p2.h, p3.h, t)),
        broken: p1.broken && t > 0.25 && t < 0.75,
      });
    }
  }
  cache = out;
  return out;
}

/** Tiles the coaster occupies on the ground (fenced off from walking). */
export const COASTER_AREA = { x: 2, y: 4, w: 23, h: 26 };
export const COASTER_STATION = { x: 8, y: 28 };
