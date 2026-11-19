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
import { BG, GREY, MAP_H2, MAP_W2, MH, MW, MX, MY, PAL, S, smoothstep } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export const SCENE11_FRAMES = 198; // 6.60s (speech 1.25s–4.72s; sweep ends 4.90s; graceful fade-out 5.55s–6.55s)

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type ComplexSeed = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  weight: number;
};

type ComplexMapData = {
  n: number;
  lab: Uint16Array;
  border: Uint8Array;
  col: number[];
  order: number[];
};

const buildComplexMap = (): ComplexMapData => {
  const rnd = mulberry32(4242);
  const u = (a: number, b: number) => a + (b - a) * rnd();

  // Irregular mix of giant countries, tiny pocket nations, medium blobs, and long thin strips
  const baseSeeds: ComplexSeed[] = [
    // 5 large sprawling countries (negative weight expands their territory)
    { x: 165 * S, y: 120 * S, scaleX: 1, scaleY: 1, angle: 0, weight: -2400 * S * S },
    { x: 465 * S, y: 215 * S, scaleX: 1, scaleY: 1, angle: 0, weight: -2600 * S * S },
    { x: 760 * S, y: 165 * S, scaleX: 1, scaleY: 1, angle: 0, weight: -2800 * S * S },
    { x: 265 * S, y: 345 * S, scaleX: 1, scaleY: 1, angle: 0, weight: -2200 * S * S },
    { x: 865 * S, y: 340 * S, scaleX: 1, scaleY: 1, angle: 0, weight: -2200 * S * S },

    // 4 elongated thin strips at varied angles
    { x: 320 * S, y: 110 * S, scaleX: 0.28, scaleY: 2.6, angle: 0.35, weight: 0 },
    { x: 615 * S, y: 95 * S, scaleX: 0.25, scaleY: 2.8, angle: -0.45, weight: 0 },
    { x: 585 * S, y: 350 * S, scaleX: 0.26, scaleY: 2.7, angle: 0.22, weight: 0 },
    { x: 105 * S, y: 270 * S, scaleX: 0.3, scaleY: 2.5, angle: 1.25, weight: 0 },
  ];

  // 16 irregular medium countries
  for (let i = 0; i < 16; i++) {
    baseSeeds.push({
      x: u(45, MW - 45) * S,
      y: u(35, MH - 35) * S,
      scaleX: u(0.85, 1.2),
      scaleY: u(0.85, 1.2),
      angle: u(0, Math.PI),
      weight: u(-300, 600) * S * S,
    });
  }

  // 12 tiny pocket countries tucked right next to big neighbors
  const tinySpots: [number, number][] = [
    [95, 72], [235, 195], [355, 255], [405, 85],
    [520, 145], [535, 290], [665, 250], [705, 360],
    [835, 95], [935, 195], [945, 375], [450, 395],
  ];
  for (const [tx, ty] of tinySpots) {
    baseSeeds.push({
      x: tx * S,
      y: ty * S,
      scaleX: 1.45,
      scaleY: 1.45,
      angle: 0,
      weight: 900 * S * S,
    });
  }

  const m = baseSeeds.length;
  const cosA = baseSeeds.map((s) => Math.cos(s.angle));
  const sinA = baseSeeds.map((s) => Math.sin(s.angle));

  const rawLab = new Uint16Array(MAP_W2 * MAP_H2);

  // Spiral swirl center (left-mid) so neighboring regions form hooks/spirals
  const swirlCx = 335 * S;
  const swirlCy = 225 * S;
  const swirlR = 135 * S;

  for (let y = 0; y < MAP_H2; y++) {
    for (let x = 0; x < MAP_W2; x++) {
      // Base organic wobble
      let wx =
        x +
        11 * S * Math.sin(y / (34 * S)) +
        6 * S * Math.sin(y / (14 * S) + 1.2);
      let wy =
        y +
        11 * S * Math.sin(x / (38 * S) + 2.1) +
        6 * S * Math.sin(x / (16 * S));

      // Jagged high-frequency coastline zone (top-right & bottom-left)
      const jagZone =
        Math.exp(-((x - 840 * S) ** 2 + (y - 120 * S) ** 2) / (190 * S) ** 2) +
        Math.exp(-((x - 190 * S) ** 2 + (y - 360 * S) ** 2) / (170 * S) ** 2);
      if (jagZone > 0.05) {
        wx += jagZone * 7 * S * Math.sin(y / (5.5 * S) + x / (18 * S));
        wy += jagZone * 7 * S * Math.cos(x / (5.5 * S) - y / (18 * S));
      }

      // Local spiral swirl (creates natural hooks & spiraling borders)
      const sdx = wx - swirlCx;
      const sdy = wy - swirlCy;
      const sd = Math.hypot(sdx, sdy);
      if (sd < swirlR) {
        const t = 1 - sd / swirlR;
        const twist = 1.65 * t * t;
        const ct = Math.cos(twist);
        const st = Math.sin(twist);
        wx = swirlCx + sdx * ct - sdy * st;
        wy = swirlCy + sdx * st + sdy * ct;
      }

      let best = 0;
      let bd = Infinity;
      for (let k = 0; k < m; k++) {
        const s = baseSeeds[k];
        const dx = wx - s.x;
        const dy = wy - s.y;
        const rx = (dx * cosA[k] + dy * sinA[k]) * s.scaleX;
        const ry = (-dx * sinA[k] + dy * cosA[k]) * s.scaleY;
        const d = rx * rx + ry * ry + s.weight;
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      rawLab[y * MAP_W2 + x] = best;
    }
  }

  // Stamp explicit nested enclaves, a full concentric ring around an inner country, and a thin curved ribbon
  let nextId = m;
  const ringOuterId = nextId++;
  const ringInnerId = nextId++;
  const enclave1Id = nextId++;
  const enclave2Id = nextId++;
  const enclave3Id = nextId++;
  const hookBandId = nextId++;

  const ringCx = 765 * S;
  const ringCy = 185 * S;
  const enc1Cx = 160 * S;
  const enc1Cy = 115 * S;
  const enc2Cx = 468 * S;
  const enc2Cy = 225 * S;
  const enc3Cx = 868 * S;
  const enc3Cy = 342 * S;
  const hookCx = 635 * S;
  const hookCy = 330 * S;

  for (let y = 0; y < MAP_H2; y++) {
    for (let x = 0; x < MAP_W2; x++) {
      const p = y * MAP_W2 + x;

      // 1. Concentric wobbly ring wrapping completely around an inner island
      const rdx = x - ringCx;
      const rdy = y - ringCy;
      const rd = Math.hypot(rdx, rdy);
      if (rd < 78 * S) {
        const a = Math.atan2(rdy, rdx);
        const rIn = (28 + 3 * Math.sin(3 * a + 0.5)) * S;
        const rOut = (58 + 5 * Math.sin(2 * a - 0.8) + 3 * Math.sin(5 * a)) * S;
        if (rd < rIn) {
          rawLab[p] = ringInnerId;
          continue;
        } else if (rd < rOut) {
          rawLab[p] = ringOuterId;
          continue;
        }
      }

      // 2. Smooth oval enclave inside top-left giant country
      const e1x = (x - enc1Cx) / (28 * S);
      const e1y = (y - enc1Cy) / (20 * S);
      if (e1x * e1x + e1y * e1y < 1) {
        rawLab[p] = enclave1Id;
        continue;
      }

      // 3. Jagged small enclave inside center giant country
      const e2dx = x - enc2Cx;
      const e2dy = y - enc2Cy;
      const e2d = Math.hypot(e2dx, e2dy);
      if (e2d < 34 * S) {
        const a = Math.atan2(e2dy, e2dx);
        const lim = (22 + 4 * Math.sin(6 * a) + 2.5 * Math.cos(9 * a)) * S;
        if (e2d < lim) {
          rawLab[p] = enclave2Id;
          continue;
        }
      }

      // 4. Tiny enclave inside bottom-right giant country
      const e3dx = x - enc3Cx;
      const e3dy = y - enc3Cy;
      if (e3dx * e3dx + e3dy * e3dy < (18 * S) ** 2) {
        rawLab[p] = enclave3Id;
        continue;
      }

      // 5. Curved crescent hook wrapping partway around a pocket
      const hdx = x - hookCx;
      const hdy = y - hookCy;
      const hd = Math.hypot(hdx, hdy);
      if (hd > 24 * S && hd < 48 * S) {
        const a = Math.atan2(hdy, hdx);
        if (a > -2.2 && a < 1.7) {
          rawLab[p] = hookBandId;
        }
      }
    }
  }

  // Split any disconnected pieces into separate regions via fast BFS so the map is strictly planar!
  // Also absorb microscopic sliver islands (< 120 supersampled pixels) into their neighbor.
  const totalPx = MAP_W2 * MAP_H2;
  const compLab = new Int32Array(totalPx).fill(-1);
  const queue = new Int32Array(totalPx);
  const compSizes: number[] = [];
  const compNeighbor: number[] = [];
  let compCount = 0;

  for (let start = 0; start < totalPx; start++) {
    if (compLab[start] !== -1) continue;
    const orig = rawLab[start];
    const id = compCount++;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    compLab[start] = id;
    let neighborComp = -1;

    while (head < tail) {
      const p = queue[head++];
      const x = p % MAP_W2;
      const y = (p - x) / MAP_W2;

      if (x + 1 < MAP_W2) {
        const np = p + 1;
        if (rawLab[np] === orig && compLab[np] === -1) {
          compLab[np] = id;
          queue[tail++] = np;
        } else if (compLab[np] !== -1 && compLab[np] !== id) {
          neighborComp = compLab[np];
        }
      }
      if (x > 0) {
        const np = p - 1;
        if (rawLab[np] === orig && compLab[np] === -1) {
          compLab[np] = id;
          queue[tail++] = np;
        } else if (compLab[np] !== -1 && compLab[np] !== id) {
          neighborComp = compLab[np];
        }
      }
      if (y + 1 < MAP_H2) {
        const np = p + MAP_W2;
        if (rawLab[np] === orig && compLab[np] === -1) {
          compLab[np] = id;
          queue[tail++] = np;
        } else if (compLab[np] !== -1 && compLab[np] !== id) {
          neighborComp = compLab[np];
        }
      }
      if (y > 0) {
        const np = p - MAP_W2;
        if (rawLab[np] === orig && compLab[np] === -1) {
          compLab[np] = id;
          queue[tail++] = np;
        } else if (compLab[np] !== -1 && compLab[np] !== id) {
          neighborComp = compLab[np];
        }
      }
    }

    compSizes.push(tail);
    compNeighbor.push(neighborComp);
  }

  // Merge tiny slivers (< 380 supersampled px) into adjacent region, then compact IDs to 0..n-1
  const mergeTo = compSizes.map((_, i) => i);
  const findRoot = (i: number): number => {
    while (mergeTo[i] !== i) {
      mergeTo[i] = mergeTo[mergeTo[i]];
      i = mergeTo[i];
    }
    return i;
  };
  for (let i = 0; i < compCount; i++) {
    if (compSizes[i] < 380 && compNeighbor[i] >= 0) {
      mergeTo[i] = findRoot(compNeighbor[i]);
    }
  }

  const remap = new Map<number, number>();
  const lab = new Uint16Array(totalPx);
  let n = 0;
  const sumX: number[] = [];
  const sumY: number[] = [];
  const cnt: number[] = [];

  for (let p = 0; p < totalPx; p++) {
    const root = findRoot(compLab[p]);
    let id = remap.get(root);
    if (id === undefined) {
      id = n++;
      remap.set(root, id);
      sumX.push(0);
      sumY.push(0);
      cnt.push(0);
    }
    lab[p] = id;
    const x = p % MAP_W2;
    const y = (p - x) / MAP_W2;
    sumX[id] += x;
    sumY[id] += y;
    cnt[id]++;
  }

  // Adjacency + crisp BG borders
  const adj = Array.from({ length: n }, () => new Set<number>());
  const edge: number[] = [];
  for (let y = 0; y < MAP_H2; y++) {
    for (let x = 0; x < MAP_W2; x++) {
      const p = y * MAP_W2 + x;
      const a = lab[p];
      const r = x + 1 < MAP_W2 ? lab[p + 1] : a;
      const d = y + 1 < MAP_H2 ? lab[p + MAP_W2] : a;
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

  const t = Math.round(2.4 * S);
  const border = new Uint8Array(totalPx);
  const disk: [number, number][] = [];
  for (let dy = -t; dy <= t; dy++)
    for (let dx = -t; dx <= t; dx++)
      if (dx * dx + dy * dy <= t * t) disk.push([dx, dy]);
  for (const p of edge) {
    const x = p % MAP_W2;
    const y = (p - x) / MAP_W2;
    for (const [dx, dy] of disk) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < MAP_W2 && yy >= 0 && yy < MAP_H2) {
        border[yy * MAP_W2 + xx] = 1;
      }
    }
  }

  // Fast 4-coloring by DSATUR-ordered backtracking
  const col = new Array<number>(n).fill(-1);
  const degOrder = [...Array(n).keys()].sort((a, b) => adj[b].size - adj[a].size);
  const solve = (step: number): boolean => {
    if (step === n) return true;
    const v = degOrder[step];
    for (let c = 0; c < 4; c++) {
      const pref = (c + v) % 4;
      let ok = true;
      for (const nb of adj[v]) {
        if (col[nb] === pref) {
          ok = false;
          break;
        }
      }
      if (ok) {
        col[v] = pref;
        if (solve(step + 1)) return true;
      }
    }
    col[v] = -1;
    return false;
  };
  if (!solve(0)) throw new Error("No 4-coloring found for complex map");

  // Left-to-right sweep matching Scene 1
  const order = [...Array(n).keys()].sort((a, b) => {
    const ax = sumX[a] / cnt[a];
    const ay = sumY[a] / cnt[a];
    const bx = sumX[b] / cnt[b];
    const by = sumY[b] / cnt[b];
    return ax + 0.3 * ay - (bx + 0.3 * by);
  });

  return { n, lab, border, col, order };
};

let cache: ComplexMapData | null = null;
const getComplexMap = () => (cache ??= buildComplexMap());

const FILL_START = 0.45;
const FILL_END = 4.55;
const FILL_DUR = 0.35;

const paintComplexMap = (img: ImageData, ti: number) => {
  const { n, lab, border, col, order } = getComplexMap();
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

const ComplexMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useRef<{ canvas: HTMLCanvasElement; img: ImageData } | null>(null);

  const scale = interpolate(frame, [0, SCENE11_FRAMES], [0.985, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  useLayoutEffect(() => {
    const out = ref.current?.getContext("2d");
    if (!out) return;
    if (!off.current) {
      const canvas = document.createElement("canvas");
      canvas.width = MAP_W2;
      canvas.height = MAP_H2;
      off.current = { canvas, img: new ImageData(MAP_W2, MAP_H2) };
    }
    const { canvas, img } = off.current;
    paintComplexMap(img, frame / fps);
    canvas.getContext("2d")!.putImageData(img, 0, 0);
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = "high";
    out.drawImage(canvas, 0, 0, MW, MH);
  }, [frame, fps]);

  return (
    <Interactive.Div
      name="ComplexMap"
      style={{
        position: "absolute",
        left: MX,
        top: MY,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "center center",
      }}
    >
      <canvas
        ref={ref}
        width={MW}
        height={MH}
        style={{ borderRadius: 28, display: "block" }}
      />
    </Interactive.Div>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [6, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const dy = interpolate(frame, [6, 14], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <Interactive.Div
      name="Title"
      style={{
        position: "absolute",
        top: 82 + dy,
        width: "100%",
        translate: "0px -50%",
        textAlign: "center",
        fontFamily,
        fontWeight: 700,
        fontSize: 62,
        letterSpacing: -1,
        color: "rgb(240,242,248)",
        opacity: fadeIn,
      }}
    >
      The Four Color Theorem
    </Interactive.Div>
  );
};

const CloseCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [4.15 * fps, 4.75 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <Interactive.Div
      name="Caption"
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: 646,
        translate: "0px -50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        color: "rgb(200,206,220)",
        opacity: fadeIn,
      }}
    >
      {PAL.map((c) => (
        <div
          key={c.join()}
          style={{ width: 28, height: 28, borderRadius: 7, background: rgb(c) }}
        />
      ))}
      <span style={{ marginLeft: 18, color: "rgb(240,242,248)" }}>
        Four colors suffice.
      </span>
    </Interactive.Div>
  );
};

export const Scene11: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  // Graceful cinematic fade-out to BG at the close of the video (5.55s -> 6.55s)
  const closeFade = interpolate(frame, [5.55 * fps, 6.55 * fps], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * closeFade }}>
      <Audio src={staticFile("audio/scene11.wav")} />
      <ComplexMap />
      <Title />
      <CloseCaption />
    </AbsoluteFill>
  );
};
