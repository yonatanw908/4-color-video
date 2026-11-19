import { loadFont } from "@remotion/google-fonts/Inter";
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
import { BG, PAL } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const CHECK_GREEN = "rgb(72, 206, 152)";
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export const SCENE09_FRAMES = 300; // 10.00s (speech ends 9.44s; final 0.40s hands grid directly to Scene 10)
const EXIT_START = SCENE09_FRAMES - 12;

// Shared 8x4 procedural grid of miniature 4-colored planar configuration thumbnails
// Exported so Scene 10 inherits the exact same cards seamlessly.
export const GRID_COLS = 8;
export const GRID_ROWS = 4;
const CARD_W = 112;
const CARD_H = 92;
const GAP = 14;
const GRID_W = GRID_COLS * CARD_W + (GRID_COLS - 1) * GAP;
const GRID_X0 = (1280 - GRID_W) / 2;
const GRID_Y0 = 152;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type MiniGraph = {
  nodes: { x: number; y: number; color: number }[];
  edges: [number, number][];
};

const buildMiniGraph = (index: number): MiniGraph => {
  const rnd = mulberry32(1976 + index * 97);
  const ringCount = 5 + (index % 3); // 5, 6, or 7 outer ring nodes
  const hasSecondInner = index % 4 === 0;
  const cx = CARD_W / 2;
  const cy = CARD_H / 2;
  const rx = 34;
  const ry = 28;
  const rot = rnd() * Math.PI * 2;

  const nodes: { x: number; y: number; color: number }[] = [];
  const edges: [number, number][] = [];

  if (hasSecondInner) {
    nodes.push({ x: cx - 10, y: cy, color: index % 4 });
    nodes.push({ x: cx + 10, y: cy, color: (index + 1) % 4 });
    edges.push([0, 1]);
  } else {
    nodes.push({ x: cx, y: cy, color: index % 4 });
  }

  const innerCount = nodes.length;
  for (let i = 0; i < ringCount; i++) {
    const a = rot + (i * Math.PI * 2) / ringCount + (rnd() - 0.5) * 0.22;
    const rScale = 0.88 + rnd() * 0.18;
    const x = cx + Math.cos(a) * rx * rScale;
    const y = cy + Math.sin(a) * ry * rScale;
    const color = (index + 1 + (i % 3)) % 4;
    nodes.push({ x, y, color });
  }

  for (let i = 0; i < ringCount; i++) {
    const cur = innerCount + i;
    const nxt = innerCount + ((i + 1) % ringCount);
    edges.push([cur, nxt]);
    if (hasSecondInner) {
      edges.push([nodes[cur].x < cx ? 0 : 1, cur]);
    } else {
      edges.push([0, cur]);
    }
  }

  return { nodes, edges };
};

export const MINI_GRAPHS: readonly MiniGraph[] = Array.from(
  { length: GRID_COLS * GRID_ROWS },
  (_, i) => buildMiniGraph(i),
);

export const PatternGrid: React.FC<{
  cardOpacityFn: (index: number, col: number, row: number) => number;
  cardScaleFn?: (index: number) => number;
  checkOpacityFn?: (index: number, col: number, row: number) => number;
  highlightIndex?: number;
  highlightStrength?: number;
}> = ({
  cardOpacityFn,
  cardScaleFn,
  checkOpacityFn,
  highlightIndex = -1,
  highlightStrength = 0,
}) => {
  return (
    <svg width={1280} height={720} style={{ display: "block" }}>
      {MINI_GRAPHS.map((g, idx) => {
        const col = idx % GRID_COLS;
        const row = Math.floor(idx / GRID_COLS);
        const opacity = cardOpacityFn(idx, col, row);
        if (opacity <= 0.004) return null;

        const x = GRID_X0 + col * (CARD_W + GAP);
        const y = GRID_Y0 + row * (CARD_H + GAP);
        const s = cardScaleFn ? cardScaleFn(idx) : 1;
        const checkP = checkOpacityFn ? checkOpacityFn(idx, col, row) : 0;
        const isHi = idx === highlightIndex && highlightStrength > 0.01;

        const stroke = isHi
          ? "rgb(240,242,248)"
          : checkP > 0.2
            ? `rgba(72,206,152,${(0.35 + 0.35 * checkP).toFixed(2)})`
            : "rgba(200,206,220,0.16)";

        return (
          <g
            key={idx}
            opacity={opacity}
            transform={`translate(${(x + CARD_W / 2).toFixed(1)} ${(y + CARD_H / 2).toFixed(1)}) scale(${s.toFixed(3)}) translate(${(-CARD_W / 2).toFixed(1)} ${(-CARD_H / 2).toFixed(1)})`}
          >
            <rect
              x={0}
              y={0}
              width={CARD_W}
              height={CARD_H}
              rx={12}
              fill="rgb(24,28,42)"
              stroke={stroke}
              strokeWidth={isHi ? 2.5 : 1.5}
            />
            {g.edges.map(([a, b], ei) => (
              <line
                key={ei}
                x1={g.nodes[a].x}
                y1={g.nodes[a].y}
                x2={g.nodes[b].x}
                y2={g.nodes[b].y}
                stroke="rgba(200,206,220,0.42)"
                strokeWidth={1.6}
              />
            ))}
            {g.nodes.map((n, ni) => (
              <circle
                key={ni}
                cx={n.x}
                cy={n.y}
                r={5.2}
                fill={rgb(PAL[n.color])}
                stroke={rgb(BG)}
                strokeWidth={1.2}
              />
            ))}
            {checkP > 0.01 && (
              <g opacity={checkP} transform={`translate(${CARD_W - 18}, 16)`}>
                <circle cx={0} cy={0} r={10} fill={CHECK_GREEN} />
                <path
                  d="M -4.5 0.5 L -1.2 3.8 L 4.8 -3.2"
                  fill="none"
                  stroke={rgb(BG)}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const PostmarkStamp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  // Stamps in cleanly right after the green check wave sweeps across (8.95s -> 9.30s)
  const p = interpolate(ti, [8.95, 9.28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitFade = interpolate(frame, [EXIT_START, EXIT_START + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  if (p <= 0.002) return null;

  const scale = 1.45 - 0.45 * p;

  return (
    <Interactive.Div
      name="Postmark"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: p * exitFade,
      }}
    >
      <div
        style={{
          transform: `translateY(-6px) rotate(-5deg) scale(${scale.toFixed(3)})`,
          padding: "16px 34px",
          borderRadius: 14,
          background: "rgba(15, 18, 28, 0.9)",
          border: `4px solid ${CHECK_GREEN}`,
          boxShadow: "0 14px 40px rgba(0, 0, 0, 0.55)",
          fontFamily,
          fontWeight: 700,
          fontSize: 40,
          letterSpacing: 3,
          color: CHECK_GREEN,
        }}
      >
        FOUR COLORS SUFFICE
      </div>
    </Interactive.Div>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [6, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const fadeOut = interpolate(frame, [EXIT_START, EXIT_START + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const dy =
    interpolate(frame, [6, 15], [10, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE,
    }) +
    interpolate(frame, [EXIT_START, EXIT_START + 6], [0, -10], {
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
        opacity: fadeIn * fadeOut,
      }}
    >
      1976
    </Interactive.Div>
  );
};

const Counter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const fadeIn = interpolate(ti, [0.8, 1.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const fadeOut = interpolate(frame, [EXIT_START, EXIT_START + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const countP = interpolate(ti, [0.9, 5.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const val = Math.round(countP * 1900);
  const label = countP >= 0.99 ? "~1,900" : val.toLocaleString("en-US");

  return (
    <Interactive.Div
      name="Counter"
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: 646,
        translate: "0px -50%",
        textAlign: "center",
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        fontVariantNumeric: "tabular-nums",
        color: "rgb(200,206,220)",
        opacity: fadeIn * fadeOut,
      }}
    >
      patterns checked:{" "}
      <span style={{ fontWeight: 700, color: "rgb(240,242,248)" }}>{label}</span>
    </Interactive.Div>
  );
};

export const Scene09: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE09_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Subtle highlight on one pattern during "Every map contains one." (5.95s–7.55s)
  const hiStrength = interpolate(ti, [6.0, 6.4, 7.2, 7.6], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene09.wav")} />
      <Interactive.Div name="PatternGrid" style={{ position: "absolute", inset: 0 }}>
        <PatternGrid
          cardOpacityFn={(idx) =>
            interpolate(ti, [0.55 + idx * 0.13, 0.95 + idx * 0.13], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE,
            })
          }
          cardScaleFn={(idx) => {
            const p = interpolate(
              ti,
              [0.55 + idx * 0.13, 0.95 + idx * 0.13],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: EASE,
              },
            );
            const bump = idx === 11 ? 0.08 * hiStrength : 0;
            return 0.84 + 0.16 * p + bump;
          }}
          checkOpacityFn={(_idx, col, row) => {
            const diag = (col + row * 1.4) / (GRID_COLS + GRID_ROWS * 1.4);
            const start = 7.75 + diag * 0.95;
            return interpolate(ti, [start, start + 0.28], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE,
            });
          }}
          highlightIndex={11}
          highlightStrength={hiStrength}
        />
      </Interactive.Div>
      <PostmarkStamp />
      <Title />
      <Counter />
    </AbsoluteFill>
  );
};
