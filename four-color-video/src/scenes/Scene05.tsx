import { loadFont } from "@remotion/google-fonts/Inter";
import { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BG, GREY, PAL, smoothstep } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);

// Simplified Natural Earth (ne_50m, public domain) cartographic outline of England + Isle of Wight
const ENGLAND_MAINLAND: readonly [number, number][] = [
  [-2.668, 51.623], [-2.662, 51.802], [-2.954, 51.915], [-3.107, 52.065],
  [-3.094, 52.184], [-2.976, 52.316], [-3.211, 52.44], [-2.985, 52.543],
  [-3.115, 52.574], [-2.987, 52.744], [-3.144, 52.806], [-3.115, 52.871],
  [-2.981, 52.952], [-2.721, 52.928], [-2.928, 53.124], [-2.924, 53.186],
  [-3.098, 53.26], [-3.166, 53.395], [-3.065, 53.427], [-2.919, 53.305],
  [-2.75, 53.31], [-2.913, 53.35], [-3.065, 53.513], [-2.925, 53.733],
  [-3.032, 53.774], [-3.027, 53.906], [-2.9, 53.961], [-2.846, 54.135],
  [-2.868, 54.177], [-3.166, 54.128], [-3.569, 54.468], [-3.592, 54.564],
  [-3.465, 54.773], [-3.268, 54.907], [-3.036, 54.953], [-3.081, 54.962],
  [-3.039, 55.015], [-2.544, 55.317], [-2.203, 55.446], [-2.321, 55.628],
  [-2.048, 55.8], [-1.655, 55.57], [-1.232, 54.704], [-0.671, 54.504],
  [-0.084, 54.118], [-0.206, 54.022], [0.115, 53.609], [-0.27, 53.737],
  [-0.66, 53.724], [-0.294, 53.692], [0.128, 53.468], [0.271, 53.335],
  [0.356, 53.16], [0.046, 52.906], [0.28, 52.809], [0.382, 52.825],
  [0.559, 52.967], [1.271, 52.925], [1.657, 52.754], [1.747, 52.469],
  [1.559, 52.087], [1.317, 51.957], [1.232, 51.971], [1.274, 51.845],
  [0.752, 51.73], [0.898, 51.689], [0.891, 51.571], [0.425, 51.466],
  [0.528, 51.484], [0.687, 51.387], [0.889, 51.36], [1.415, 51.363],
  [1.398, 51.182], [1.044, 51.047], [0.96, 50.926], [0.772, 50.934],
  [0.3, 50.776], [-0.204, 50.814], [-0.785, 50.765], [-1.416, 50.897],
  [-1.334, 50.821], [-1.517, 50.747], [-2.031, 50.725], [-1.962, 50.628],
  [-2.036, 50.603], [-2.35, 50.637], [-2.433, 50.599], [-2.999, 50.717],
  [-3.405, 50.632], [-3.68, 50.24], [-3.793, 50.229], [-4.195, 50.393],
  [-4.728, 50.29], [-5.01, 50.161], [-5.119, 50.038], [-5.225, 50.021],
  [-5.434, 50.104], [-5.622, 50.051], [-5.656, 50.132], [-5.342, 50.246],
  [-4.894, 50.534], [-4.583, 50.776], [-4.523, 50.977], [-4.296, 51.027],
  [-4.188, 51.189], [-3.842, 51.231], [-3.136, 51.205], [-2.539, 51.695],
];

const ISLE_OF_WIGHT: readonly [number, number][] = [
  [-1.066, 50.69], [-1.149, 50.656], [-1.176, 50.615], [-1.196, 50.599],
  [-1.251, 50.589], [-1.306, 50.589], [-1.515, 50.67], [-1.563, 50.666],
  [-1.516, 50.703], [-1.386, 50.734], [-1.313, 50.773], [-1.144, 50.735],
];

export const SCENE05_FRAMES = 178; // 5.93s (speech ends 5.37s; final 0.40s hands off to Scene 6)
const EXIT_START = SCENE05_FRAMES - 12;

const MAP_W = 460;
const MAP_H = 532;
const MAP_X = (1280 - MAP_W) / 2;
const MAP_Y = 52;
const S = 2;
const W2 = MAP_W * S;
const H2 = MAP_H * S;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const chaikin = (pts: [number, number][]): [number, number][] => {
  const out: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
    out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
  }
  return out;
};

const projectPolygons = (): [number, number][][] => {
  const cosLat = Math.cos((52.8 * Math.PI) / 180);
  const rawMain = ENGLAND_MAINLAND.map(([lon, lat]): [number, number] => [
    lon * cosLat,
    -lat,
  ]);
  const rawWight = ISLE_OF_WIGHT.map(([lon, lat]): [number, number] => [
    lon * cosLat,
    -lat,
  ]);
  const xs = rawMain.map((p) => p[0]);
  const ys = rawMain.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const pad = 18 * S;
  const scale = Math.min(
    (W2 - 2 * pad) / (maxX - minX),
    (H2 - 2 * pad) / (maxY - minY),
  );
  const ox = (W2 - (maxX - minX) * scale) / 2;
  const oy = (H2 - (maxY - minY) * scale) / 2;

  const mapPt = ([x, y]: [number, number]): [number, number] => [
    ox + (x - minX) * scale,
    oy + (y - minY) * scale,
  ];
  return [chaikin(rawMain.map(mapPt)), chaikin(rawWight.map(mapPt))];
};

const pointInPoly = (x: number, y: number, poly: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

type EnglandMapData = {
  n: number;
  lab: Int16Array;
  border: Uint8Array;
  col: number[];
  order: number[];
};

const buildEnglandMap = (): EnglandMapData => {
  const [mainPoly, wightPoly] = projectPolygons();
  const mask = new Uint8Array(W2 * H2);
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      if (
        pointInPoly(x + 0.5, y + 0.5, mainPoly) ||
        pointInPoly(x + 0.5, y + 0.5, wightPoly)
      ) {
        mask[y * W2 + x] = 1;
      }
    }
  }

  // Deterministic well-spaced regions inside the England silhouette
  const rnd = mulberry32(1852);
  const seeds: [number, number][] = [];
  const minDist = 60 * S;
  for (let attempt = 0; attempt < 5000 && seeds.length < 28; attempt++) {
    const x = rnd() * W2;
    const y = rnd() * H2;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (!mask[iy * W2 + ix]) continue;
    let ok = true;
    for (const [sx, sy] of seeds) {
      const dx = sx - x;
      const dy = sy - y;
      if (dx * dx + dy * dy < minDist * minDist) {
        ok = false;
        break;
      }
    }
    if (ok) seeds.push([x, y]);
  }
  const n = seeds.length;

  // Wobbly Voronoi inside the accurate England coastline
  const lab = new Int16Array(W2 * H2).fill(-1);
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const p = y * W2 + x;
      if (!mask[p]) continue;
      const wx =
        x + 8 * S * Math.sin(y / (31 * S)) + 4.5 * S * Math.sin(y / (13 * S) + 1);
      const wy =
        y + 8 * S * Math.sin(x / (35 * S) + 2) + 4.5 * S * Math.sin(x / (15 * S));
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
      lab[p] = best;
    }
  }

  const adj = Array.from({ length: n }, () => new Set<number>());
  const edge: number[] = [];
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const p = y * W2 + x;
      const a = lab[p];
      if (a < 0) continue;
      const r = x + 1 < W2 ? lab[p + 1] : -1;
      const d = y + 1 < H2 ? lab[p + W2] : -1;
      if (r >= 0 && r !== a) {
        adj[a].add(r);
        adj[r].add(a);
        edge.push(p);
      }
      if (d >= 0 && d !== a) {
        adj[a].add(d);
        adj[d].add(a);
        edge.push(p);
      }
    }
  }

  const t = Math.round(2.3 * S);
  const border = new Uint8Array(W2 * H2);
  const disk: [number, number][] = [];
  for (let dy = -t; dy <= t; dy++)
    for (let dx = -t; dx <= t; dx++)
      if (dx * dx + dy * dy <= t * t) disk.push([dx, dy]);
  for (const p of edge) {
    const x = p % W2;
    const y = (p - x) / W2;
    for (const [dx, dy] of disk) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < W2 && yy >= 0 && yy < H2 && mask[yy * W2 + xx]) {
        border[yy * W2 + xx] = 1;
      }
    }
  }

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
  if (!solve(0)) throw new Error("No 4-coloring found for England map");

  // Sweep from southwest (Cornwall) to northeast (Northumberland)
  const order = [...Array(n).keys()].sort(
    (a, b) =>
      seeds[a][0] - 0.85 * seeds[a][1] - (seeds[b][0] - 0.85 * seeds[b][1]),
  );

  return { n, lab, border, col, order };
};

let cache: EnglandMapData | null = null;
const getEnglandMap = () => (cache ??= buildEnglandMap());

// Paced directly to scene05.wav (speech ends 5.37s): final county finishes coloring right at 5.40s
const FILL_START = 0.45;
const FILL_END = 5.05;
const FILL_DUR = 0.35;

const paintEngland = (img: ImageData, ti: number) => {
  const { n, lab, border, col, order } = getEnglandMap();
  const lut = new Uint8ClampedArray(n * 3);
  order.forEach((r, k) => {
    const start = FILL_START + ((FILL_END - FILL_START) * k) / n;
    const a = smoothstep((ti - start) / FILL_DUR);
    for (let ch = 0; ch < 3; ch++) {
      lut[r * 3 + ch] = GREY[ch] * (1 - a) + PAL[col[r]][ch] * a;
    }
  });

  const d = img.data;
  for (let p = 0, q = 0; p < lab.length; p++, q += 4) {
    const r = lab[p];
    if (r < 0) {
      // Transparent outside England so cross-transitions blend seamlessly
      d[q] = 0;
      d[q + 1] = 0;
      d[q + 2] = 0;
      d[q + 3] = 0;
    } else if (border[p]) {
      d[q] = BG[0];
      d[q + 1] = BG[1];
      d[q + 2] = BG[2];
      d[q + 3] = 255;
    } else {
      const l = r * 3;
      d[q] = lut[l];
      d[q + 1] = lut[l + 1];
      d[q + 2] = lut[l + 2];
      d[q + 3] = 255;
    }
  }
};

const EnglandMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useRef<{ canvas: HTMLCanvasElement; img: ImageData } | null>(null);

  // Smooth rise-in from Scene 4 + continuous gentle camera drift (never still)
  const enterScale = interpolate(frame, [0, 14], [0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const drift = interpolate(frame, [14, SCENE05_FRAMES], [0, 0.035], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = enterScale + drift;

  useLayoutEffect(() => {
    const out = ref.current?.getContext("2d");
    if (!out) return;
    if (!off.current) {
      const canvas = document.createElement("canvas");
      canvas.width = W2;
      canvas.height = H2;
      off.current = { canvas, img: new ImageData(W2, H2) };
    }
    const { canvas, img } = off.current;
    paintEngland(img, frame / fps);
    canvas.getContext("2d")!.putImageData(img, 0, 0);
    out.clearRect(0, 0, MAP_W, MAP_H);
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = "high";
    out.drawImage(canvas, 0, 0, MAP_W, MAP_H);
  }, [frame, fps]);

  return (
    <Interactive.Div
      name="EnglandMap"
      style={{
        position: "absolute",
        left: MAP_X,
        top: MAP_Y,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "center center",
      }}
    >
      <canvas ref={ref} width={MAP_W} height={MAP_H} style={{ display: "block" }} />
    </Interactive.Div>
  );
};

const Label: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [1.1 * fps, 1.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <Interactive.Div
      name="Label"
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: 646,
        translate: "0px -50%",
        textAlign: "center",
        fontFamily,
        fontWeight: 500,
        fontSize: 32,
        color: "rgb(200,206,220)",
        opacity,
      }}
    >
      <span style={{ fontWeight: 700, color: "rgb(240,242,248)" }}>1852</span>
      {" — a student’s question"}
    </Interactive.Div>
  );
};

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE05_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene05.wav")} />
      <EnglandMap />
      <Label />
    </AbsoluteFill>
  );
};
