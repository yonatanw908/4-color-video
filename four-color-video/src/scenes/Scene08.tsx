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
import { BG, GREY, PAL } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const MAGENTA = [214, 92, 214] as const;
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

const lerpRgb = (
  a: readonly number[],
  b: readonly number[],
  t: number,
): string => {
  const c = Math.min(1, Math.max(0, t));
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * c)},${Math.round(
    a[1] + (b[1] - a[1]) * c,
  )},${Math.round(a[2] + (b[2] - a[2]) * c)})`;
};

export const SCENE08_FRAMES = 402; // 13.40s (speech ends 12.92s; final 0.40s exits to Scene 9)
const EXIT_START = SCENE08_FRAMES - 12;

// Part 1 (0s–7.45s): Clean Kempe chain swap freeing Coral for the grey center dot
type NodeDef = {
  id: string;
  x: number;
  y: number;
  color: number; // -1 = grey center, 0..3 = PAL index
  swapTo?: number;
  hop?: number; // distance from n0 along the coral-teal chain
};

const CLEAN_NODES: readonly NodeDef[] = [
  { id: "v", x: 640, y: 386, color: -1 },
  // 5 pentagon neighbors around v (all 4 colors used: coral, yellow, teal, blue, yellow)
  { id: "n0", x: 640, y: 274, color: 0, swapTo: 2, hop: 0 },
  { id: "n1", x: 747, y: 351, color: 1 },
  { id: "n2", x: 706, y: 477, color: 2 },
  { id: "n3", x: 574, y: 477, color: 3 },
  { id: "n4", x: 533, y: 351, color: 1 },
  // Coral-teal Kempe chain branching out from n0 (disconnected from n2!)
  { id: "c1", x: 535, y: 222, color: 2, swapTo: 0, hop: 1 },
  { id: "c2", x: 420, y: 268, color: 0, swapTo: 2, hop: 2 },
  { id: "c3", x: 364, y: 376, color: 2, swapTo: 0, hop: 3 },
  { id: "c4", x: 752, y: 224, color: 2, swapTo: 0, hop: 1 },
  { id: "c5", x: 868, y: 274, color: 0, swapTo: 2, hop: 2 },
  // Context nodes separating the bottom-right teal neighbor n2
  { id: "o1", x: 874, y: 406, color: 3 },
  { id: "o2", x: 640, y: 556, color: 1 },
];

const CLEAN_EDGES: readonly [string, string, boolean][] = [
  // [a, b, isChainEdge]
  ["v", "n0", false],
  ["v", "n1", false],
  ["v", "n2", false],
  ["v", "n3", false],
  ["v", "n4", false],
  ["n0", "n1", false],
  ["n1", "n2", false],
  ["n2", "n3", false],
  ["n3", "n4", false],
  ["n4", "n0", false],
  // Chain edges
  ["n0", "c1", true],
  ["c1", "c2", true],
  ["c2", "c3", true],
  ["n0", "c4", true],
  ["c4", "c5", true],
  // Structural planar context edges
  ["c1", "n4", false],
  ["c2", "n4", false],
  ["c3", "n4", false],
  ["c3", "n3", false],
  ["c4", "n1", false],
  ["c5", "n1", false],
  ["c5", "o1", false],
  ["o1", "n1", false],
  ["o1", "n2", false],
  ["o2", "n2", false],
  ["o2", "n3", false],
];

const CLEAN_MAP = Object.fromEntries(CLEAN_NODES.map((n) => [n.id, n]));

// Part 2 (7.45s–13.40s): Tangled case where two Kempe chains interfere and clash magenta
type TangledNode = {
  id: string;
  x: number;
  y: number;
  color: number;
  chain?: 1 | 2; // 1 = coral-teal loop, 2 = yellow-blue interfering chain
  swapTo?: number;
  clash?: boolean;
};

const TANGLED_NODES: readonly TangledNode[] = [
  { id: "v", x: 640, y: 392, color: -1 },
  { id: "n0", x: 640, y: 284, color: 0, chain: 1, swapTo: 2 },
  { id: "n1", x: 744, y: 358, color: 1, chain: 2, swapTo: 3 },
  { id: "n2", x: 704, y: 478, color: 2, chain: 1, swapTo: 0 },
  { id: "n3", x: 576, y: 478, color: 3, chain: 2, swapTo: 1 },
  { id: "n4", x: 536, y: 358, color: 1 },
  // Outer tangled ring where Chain 1 (coral-teal) & Chain 2 (yellow-blue) interlace
  { id: "t1", x: 758, y: 222, color: 2, chain: 1, swapTo: 0, clash: true },
  { id: "t2", x: 874, y: 294, color: 0, chain: 1, swapTo: 2 },
  { id: "t3", x: 866, y: 428, color: 3, chain: 2, swapTo: 1, clash: true },
  { id: "t4", x: 760, y: 536, color: 1, chain: 2, swapTo: 3 },
  { id: "t5", x: 520, y: 222, color: 3, chain: 2, swapTo: 1, clash: true },
  { id: "t6", x: 408, y: 306, color: 0, chain: 1, swapTo: 2 },
  { id: "t7", x: 432, y: 454, color: 2, chain: 1, swapTo: 0, clash: true },
];

const TANGLED_EDGES: readonly [string, string, 0 | 1 | 2 | 3][] = [
  // 0 = normal, 1 = chain 1, 2 = chain 2, 3 = clashing tangle bridge
  ["v", "n0", 0],
  ["v", "n1", 0],
  ["v", "n2", 0],
  ["v", "n3", 0],
  ["v", "n4", 0],
  ["n0", "n1", 0],
  ["n1", "n2", 0],
  ["n2", "n3", 0],
  ["n3", "n4", 0],
  ["n4", "n0", 0],
  // Chain 1 (coral-teal)
  ["n0", "t1", 1],
  ["t1", "t2", 1],
  ["t2", "n2", 1],
  ["n0", "t6", 0],
  ["t6", "t7", 1],
  ["t7", "n2", 0],
  // Chain 2 (yellow-blue)
  ["n1", "t3", 2],
  ["t3", "t4", 2],
  ["t4", "n3", 2],
  ["n4", "t5", 2],
  ["t5", "t6", 0],
  // Interlacing / colliding bridge edges between the two chains
  ["t1", "t3", 3],
  ["t5", "t1", 3],
  ["t7", "n3", 3],
  ["t2", "n1", 0],
  ["t4", "n2", 0],
  ["t7", "n4", 0],
];

const TANGLED_MAP = Object.fromEntries(TANGLED_NODES.map((n) => [n.id, n]));

const MORPH_START = 7.35;
const MORPH_DUR = 0.45;

const CleanSwapGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const morphOut = interpolate(ti, [MORPH_START, MORPH_START + MORPH_DUR], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  if (morphOut >= 1) return null;

  const enterScale = interpolate(frame, [0, 12], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const drift = interpolate(ti, [0.4, MORPH_START], [0, 0.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = enterScale + drift - morphOut * 0.06;

  // Beat 2: coral-teal chain glows (2.35s -> 5.75s)
  const chainGlow = interpolate(ti, [2.35, 2.85, 5.5, 6.1], [0, 1, 1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beat 3: ripple swap starts at 3.85s (0.35s per hop, 4 hops -> done by 5.55s)
  // Center grey dot becomes Coral at 5.75s -> 6.15s right on "That frees a color."
  const centerFillP = interpolate(ti, [5.75, 6.15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const checkPop = interpolate(ti, [6.05, 6.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <Interactive.Div
      name="CleanKempeGraph"
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - morphOut,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "640px 380px",
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {CLEAN_EDGES.map(([aId, bId, isChain], idx) => {
          const a = CLEAN_MAP[aId];
          const b = CLEAN_MAP[bId];
          return (
            <g key={idx}>
              {isChain && chainGlow > 0.01 && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgb(240,242,248)"
                  strokeWidth={13}
                  strokeLinecap="round"
                  opacity={chainGlow * 0.28}
                />
              )}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={
                  isChain && chainGlow > 0.01
                    ? "rgb(240,242,248)"
                    : "rgba(200,206,220,0.45)"
                }
                strokeWidth={isChain ? 3.5 + 2.5 * chainGlow : 3}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {CLEAN_NODES.map((node) => {
          const isCenter = node.color === -1;
          const isChain = node.hop !== undefined;

          let fill: string;
          let rippleScale = 1;
          if (isCenter) {
            fill = lerpRgb(GREY, PAL[0], centerFillP);
          } else if (isChain && node.swapTo !== undefined) {
            const hopStart = 3.85 + (node.hop ?? 0) * 0.32;
            const swapP = interpolate(ti, [hopStart, hopStart + 0.35], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE,
            });
            fill = lerpRgb(PAL[node.color], PAL[node.swapTo], swapP);
            rippleScale = 1 + 0.16 * Math.sin(swapP * Math.PI);
          } else {
            fill = rgb(PAL[node.color]);
          }

          const r = (isCenter ? 27 : 21) * rippleScale;

          return (
            <g key={node.id}>
              {isChain && chainGlow > 0.01 && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 8}
                  fill="none"
                  stroke="rgb(240,242,248)"
                  strokeWidth={3.5}
                  opacity={chainGlow * 0.72}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={fill}
                stroke={isCenter ? "rgb(240,242,248)" : rgb(BG)}
                strokeWidth={isCenter ? 3.5 : 3.5}
              />
              {isCenter && checkPop > 0.01 && (
                <path
                  d={`M ${node.x - 9} ${node.y + 1} L ${node.x - 2} ${node.y + 8} L ${node.x + 11} ${node.y - 7}`}
                  fill="none"
                  stroke={rgb(BG)}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={checkPop}
                />
              )}
            </g>
          );
        })}
      </svg>
    </Interactive.Div>
  );
};

const TangledCaseGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const morphIn = interpolate(ti, [MORPH_START + 0.08, MORPH_START + MORPH_DUR + 0.08], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  if (morphIn <= 0.002) return null;

  const drift = interpolate(ti, [MORPH_START, SCENE08_FRAMES / fps], [0.96, 1.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Two chains light up (8.2s), attempt simultaneous swap (8.9s), collide & flash magenta (9.7s+)
  const chainHighlight = interpolate(ti, [8.1, 8.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const swapAttempt = interpolate(ti, [8.85, 9.65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const clashIn = interpolate(ti, [9.55, 10.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const clashPulse =
    0.65 + 0.35 * Math.sin(Math.max(0, ti - 9.55) * Math.PI * 3.2);

  return (
    <Interactive.Div
      name="TangledKempeGraph"
      style={{
        position: "absolute",
        inset: 0,
        opacity: morphIn,
        transform: `scale(${drift.toFixed(4)})`,
        transformOrigin: "640px 380px",
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {TANGLED_EDGES.map(([aId, bId, kind], idx) => {
          const a = TANGLED_MAP[aId];
          const b = TANGLED_MAP[bId];
          const isChain = kind === 1 || kind === 2;
          const isClashBridge = kind === 3;

          let stroke = "rgba(200,206,220,0.42)";
          let width = 3;
          if (isClashBridge && clashIn > 0.01) {
            stroke = rgb(MAGENTA);
            width = 5.5;
          } else if (isChain && clashIn > 0.01) {
            stroke = lerpRgb([240, 242, 248], MAGENTA, clashIn * 0.85);
            width = 4.5;
          } else if (isChain && chainHighlight > 0.01) {
            stroke = "rgb(240,242,248)";
            width = 4.5;
          }

          return (
            <g key={idx}>
              {(isClashBridge || isChain) && clashIn > 0.01 && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={rgb(MAGENTA)}
                  strokeWidth={isClashBridge ? 18 : 12}
                  strokeLinecap="round"
                  opacity={clashIn * (isClashBridge ? 0.42 : 0.22) * clashPulse}
                />
              )}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={stroke}
                strokeWidth={width}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {TANGLED_NODES.map((node) => {
          const isCenter = node.color === -1;
          let fill: string;
          if (isCenter) {
            fill = rgb(GREY);
          } else if (node.swapTo !== undefined) {
            const base = lerpRgb(PAL[node.color], PAL[node.swapTo], swapAttempt);
            if (node.clash && clashIn > 0.01) {
              fill = lerpRgb(
                PAL[node.swapTo],
                MAGENTA,
                clashIn * (0.65 + 0.35 * clashPulse),
              );
            } else {
              fill = base;
            }
          } else {
            fill = rgb(PAL[node.color]);
          }

          const r = isCenter ? 27 : 21;

          return (
            <g key={node.id}>
              {node.clash && clashIn > 0.01 && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r + 10 + 4 * clashPulse}
                  fill="none"
                  stroke={rgb(MAGENTA)}
                  strokeWidth={3.5}
                  opacity={clashIn * 0.85 * clashPulse}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={fill}
                stroke={isCenter ? "rgb(240,242,248)" : rgb(BG)}
                strokeWidth={3.5}
              />
            </g>
          );
        })}
      </svg>
    </Interactive.Div>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [6, 13], [0, 1], {
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
    interpolate(frame, [6, 13], [10, 0], {
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
      The Swap Trick
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const swapCaption = interpolate(
    frame,
    [2.6 * fps, 3.1 * fps, 7.1 * fps, 7.5 * fps],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
  );
  const brokeCaption = interpolate(frame, [10.6 * fps, 11.15 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const fadeOut = interpolate(frame, [EXIT_START, EXIT_START + 6], [1, 0], {
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
        textAlign: "center",
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        color: "rgb(200,206,220)",
      }}
    >
      {swapCaption > 0.01 && (
        <div style={{ position: "absolute", inset: 0, opacity: swapCaption }}>
          swap along a chain → free a color
        </div>
      )}
      {brokeCaption > 0.01 && (
        <div
          style={{
            opacity: brokeCaption * fadeOut,
            color: "rgb(236,162,236)",
          }}
        >
          this case broke the first proof
        </div>
      )}
    </Interactive.Div>
  );
};

export const Scene08: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE08_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene08.wav")} />
      <CleanSwapGraph />
      <TangledCaseGraph />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
