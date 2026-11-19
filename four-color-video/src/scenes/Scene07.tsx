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
import { BG, GREY, PAL, getMap } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
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

export const SCENE07_FRAMES = 222; // 7.40s (speech ends 6.89s; final 0.40s zooms into Scene 8)
const EXIT_START = SCENE07_FRAMES - 12;

const DegreeGraph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;
  const { screenSeeds, col, adj, edges, order } = getMap();

  // Pick the lowest-degree node (guaranteed <= 5 in any planar graph)
  let minNode = 0;
  let minDeg = Infinity;
  for (let i = 0; i < adj.length; i++) {
    if (adj[i].size < minDeg) {
      minDeg = adj[i].size;
      minNode = i;
    }
  }

  // Smooth zoom-out exit into Scene 8's close-up Kempe graph
  const exitP = interpolate(frame, [EXIT_START, SCENE07_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const scale = 1 + exitP * 0.14;

  // Timeline synced to scene07.wav:
  // 0.15s–3.54s: "In every map, some country has five neighbors or fewer."
  // 4.05s–6.89s: "So remove it, color the rest, and put it back."
  const ringIn = interpolate(ti, [1.85, 2.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const ringPulse = 1 + 0.1 * Math.sin(Math.max(0, ti - 2.0) * Math.PI * 2.4);

  // Remove node: 4.10s -> 4.75s, Put back: 5.95s -> 6.50s
  const removeP = interpolate(ti, [4.1, 4.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const putBackP = interpolate(ti, [5.95, 6.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const removedAmount = removeP * (1 - putBackP);

  // When put back, recolors smoothly from GREY -> its valid color (6.20s -> 6.65s)
  const recolorBack =
    ti < 5.8
      ? 1
      : interpolate(ti, [6.2, 6.65], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE,
        });

  const [mx, my] = screenSeeds[minNode];

  return (
    <Interactive.Div
      name="DegreeGraph"
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "640px 365px",
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {/* Edges */}
        {edges.map(([a, b], idx) => {
          const [x1, y1] = screenSeeds[a];
          const [x2, y2] = screenSeeds[b];
          const incident = a === minNode || b === minNode;
          const opacity = incident ? 1 - 0.72 * removedAmount : 0.62;
          const stroke =
            incident && ringIn > 0.01 && removedAmount < 0.5
              ? `rgba(240,242,248,${(0.62 + 0.32 * ringIn).toFixed(2)})`
              : "rgba(200,206,220,0.62)";
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={incident ? 3.5 + 1.2 * ringIn * (1 - removedAmount) : 3.5}
              strokeLinecap="round"
              strokeDasharray={incident && removedAmount > 0.3 ? "6 6" : undefined}
              opacity={opacity}
            />
          );
        })}

        {/* Dashed ghost slot left behind while the low-degree node is removed */}
        {removedAmount > 0.05 && (
          <circle
            cx={mx}
            cy={my}
            r={23}
            fill="none"
            stroke="rgba(200,206,220,0.5)"
            strokeWidth={2.5}
            strokeDasharray="6 5"
            opacity={removedAmount}
          />
        )}

        {/* Dots + neighbor degree numbers */}
        {screenSeeds.map(([cx, cy], r) => {
          const isMin = r === minNode;
          const rank = order.indexOf(r);
          const numIn = interpolate(ti, [0.45 + rank * 0.06, 0.8 + rank * 0.06], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });

          // Subtle recolor wave across the remaining 14 dots during "color the rest" (4.9s–5.85s)
          const waveT = ti - (4.9 + (rank / screenSeeds.length) * 0.55);
          const waveBump =
            !isMin && waveT > 0 && waveT < 0.45
              ? Math.sin((waveT / 0.45) * Math.PI)
              : 0;

          const liftY = isMin ? -42 * removedAmount : 0;
          const dotOpacity = isMin ? 1 - 0.85 * removedAmount : 1;
          const dotRadius =
            (isMin ? 24 : 22 + 3.5 * waveBump) * (isMin ? 1 - 0.25 * removedAmount : 1);
          const fill = isMin
            ? lerpRgb(GREY, PAL[col[r]], recolorBack)
            : rgb(PAL[col[r]]);

          return (
            <g key={r} opacity={dotOpacity}>
              {waveBump > 0.05 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={dotRadius + 6 + 6 * waveBump}
                  fill="none"
                  stroke={rgb(PAL[col[r]])}
                  strokeWidth={2.5}
                  opacity={waveBump * 0.65}
                />
              )}
              <circle
                cx={cx}
                cy={cy + liftY}
                r={dotRadius}
                fill={fill}
                stroke={rgb(BG)}
                strokeWidth={3.5}
              />
              {numIn > 0.01 && (
                <text
                  x={cx}
                  y={cy + liftY + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={rgb(BG)}
                  fontFamily={fontFamily}
                  fontWeight={700}
                  fontSize={22}
                  opacity={numIn}
                >
                  {adj[r].size}
                </text>
              )}
            </g>
          );
        })}

        {/* Highlight ring around the lowest-degree dot */}
        {ringIn > 0.01 && (
          <g opacity={ringIn * (1 - 0.85 * removedAmount)}>
            <circle
              cx={mx}
              cy={my - 42 * removedAmount}
              r={36 * ringPulse}
              fill="none"
              stroke="rgb(240,242,248)"
              strokeWidth={9}
              opacity={0.18}
            />
            <circle
              cx={mx}
              cy={my - 42 * removedAmount}
              r={34 * ringPulse}
              fill="none"
              stroke="rgb(240,242,248)"
              strokeWidth={3.5}
            />
          </g>
        )}
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
      A Small Country Always Exists
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [2.0 * fps, 2.5 * fps], [0, 1], {
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
        opacity: fadeIn * fadeOut,
      }}
    >
      always one with 5 or fewer
    </Interactive.Div>
  );
};

export const Scene07: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE07_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene07.wav")} />
      <DegreeGraph />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
