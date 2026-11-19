// Port of ../render.py's map generation: jittered-grid Voronoi "countries" with
// wobbly borders, 4-colored by backtracking, revealed in a left-to-right sweep.

export const BG: RGB = [15, 18, 28];
export const GREY: RGB = [58, 64, 82];
export const PAL: RGB[] = [
  [239, 108, 87],
  [247, 197, 72],
  [72, 178, 160],
  [92, 134, 235],
];
type RGB = [number, number, number];

// Map rect (1x coords) — same as render.py: MX,MY,MW,MH = 140,150,1000,430
export const MX = 140;
export const MY = 150;
export const MW = 1000;
export const MH = 430;
export const S = 2; // supersampling factor, as in render.py
const W2 = MW * S;
const H2 = MH * S;

// 5x3 grid -> 15 regions (render.py used 6x3=18; the brief asks for ~15)
const GX = 5;
const GY = 3;

// Deterministic PRNG (stand-in for numpy default_rng(7))
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type MapData = {
  n: number;
  lab: Uint8Array; // region index per supersampled pixel
  border: Uint8Array; // 1 where a border line is drawn
  col: number[]; // color index per region
  adj: Set<number>[];
  order: number[]; // reveal order
};

const build = (): MapData => {
  const rnd = mulberry32(7);
  const u = (a: number, b: number) => a + (b - a) * rnd();
  const seeds: [number, number][] = [];
  for (let j = 0; j < GY; j++)
    for (let i = 0; i < GX; i++)
      seeds.push([
        ((i + 0.5 + u(-0.38, 0.38)) * W2) / GX,
        ((j + 0.5 + u(-0.38, 0.38)) * H2) / GY,
      ]);
  const n = seeds.length;

  // Voronoi on wobbled coordinates so borders are not straight lines
  const lab = new Uint8Array(W2 * H2);
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const wx = x + 14 * S * Math.sin(y / (37 * S)) + 8 * S * Math.sin(y / (13 * S) + 1);
      const wy = y + 14 * S * Math.sin(x / (41 * S) + 2) + 8 * S * Math.sin(x / (17 * S));
      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < n; k++) {
        const dx = wx - seeds[k][0];
        const dy = wy - seeds[k][1];
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      lab[y * W2 + x] = best;
    }
  }

  // Adjacency + edge pixels
  const adj = Array.from({ length: n }, () => new Set<number>());
  const edge: number[] = [];
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const p = y * W2 + x;
      const a = lab[p];
      const r = x + 1 < W2 ? lab[p + 1] : a;
      const d = y + 1 < H2 ? lab[p + W2] : a;
      if (r !== a) {
        adj[a].add(r);
        adj[r].add(a);
      }
      if (d !== a) {
        adj[a].add(d);
        adj[d].add(a);
      }
      if (r !== a || d !== a) edge.push(p);
    }
  }

  // Thick border: stamp a disk of radius t around each edge pixel (render.py: t=3*S)
  const t = 3 * S;
  const border = new Uint8Array(W2 * H2);
  const disk: [number, number][] = [];
  for (let dy = -t; dy <= t; dy++)
    for (let dx = -t; dx <= t; dx++) if (dx * dx + dy * dy <= t * t) disk.push([dx, dy]);
  for (const p of edge) {
    const x = p % W2;
    const y = (p - x) / W2;
    for (const [dx, dy] of disk) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < W2 && yy >= 0 && yy < H2) border[yy * W2 + xx] = 1;
    }
  }

  // 4-coloring by backtracking
  const col = new Array<number>(n).fill(-1);
  const solve = (i: number): boolean => {
    if (i === n) return true;
    for (let c = 0; c < 4; c++) {
      if ([...adj[i]].every((j) => col[j] !== c)) {
        col[i] = c;
        if (solve(i + 1)) return true;
      }
    }
    col[i] = -1;
    return false;
  };
  if (!solve(0)) throw new Error("No 4-coloring found");
  for (let a = 0; a < n; a++)
    for (const b of adj[a]) if (col[a] === col[b]) throw new Error("Neighbors share a color");

  // Sweep left to right
  const order = [...Array(n).keys()].sort(
    (a, b) => seeds[a][0] + 0.3 * seeds[a][1] - (seeds[b][0] + 0.3 * seeds[b][1]),
  );
  return { n, lab, border, col, adj, order };
};

let cache: MapData | null = null;
export const getMap = () => (cache ??= build());

export const smoothstep = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

// Reveal timing in seconds (render.py: START,END=0.6,3.8; each fill takes 0.35s)
export const FILL_START = 0.6;
export const FILL_END = 3.8;
export const FILL_DUR = 0.35;

// Paint the supersampled map for time ti (seconds) into an ImageData
export const paintMap = (img: ImageData, ti: number) => {
  const { n, lab, border, col, order } = getMap();
  const lut = new Uint8ClampedArray(n * 3);
  order.forEach((r, k) => {
    const start = FILL_START + ((FILL_END - FILL_START) * k) / n;
    const a = smoothstep((ti - start) / FILL_DUR);
    for (let ch = 0; ch < 3; ch++) lut[r * 3 + ch] = GREY[ch] * (1 - a) + PAL[col[r]][ch] * a;
  });
  const d = img.data;
  for (let p = 0, q = 0; p < lab.length; p++, q += 4) {
    if (border[p]) {
      d[q] = BG[0];
      d[q + 1] = BG[1];
      d[q + 2] = BG[2];
    } else {
      const l = lab[p] * 3;
      d[q] = lut[l];
      d[q + 1] = lut[l + 1];
      d[q + 2] = lut[l + 2];
    }
    d[q + 3] = 255;
  }
};

export const MAP_W2 = W2;
export const MAP_H2 = H2;
