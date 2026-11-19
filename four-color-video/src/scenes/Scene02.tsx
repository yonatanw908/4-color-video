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

const clampProgress = (frame: number, startSec: number, durSec: number, fps: number) =>
  interpolate(frame, [startSec * fps, (startSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

// Cut between Part 1 (shared border) and Part 2 (pie) during the 2.60s–3.05s pause
const CUT_SEC = 2.9;

// Part 1 geometry: two wobbly regions sharing a vertical border inside a rounded map frame
const BOX_W = 620;
const BOX_H = 360;
const BOX_X = (1280 - BOX_W) / 2;
const BOX_Y = 185;
const BOX_R = 28;

const buildSharedBorder = () => {
  const pts: [number, number][] = [];
  const yStart = BOX_Y - 12;
  const yEnd = BOX_Y + BOX_H + 12;
  for (let y = yStart; y <= yEnd; y += 4) {
    const dy = y - BOX_Y;
    const x =
      640 +
      18 * Math.sin(dy / 48) +
      9 * Math.sin(dy / 19 + 1.1);
    pts.push([x, y]);
  }
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const left = `${line} L ${BOX_X - 12} ${yEnd} L ${BOX_X - 12} ${yStart} Z`;
  const right = `${line} L ${BOX_X + BOX_W + 12} ${yEnd} L ${BOX_X + BOX_W + 12} ${yStart} Z`;
  return { line, left, right };
};

const BORDER_PATHS = buildSharedBorder();

const TwoRegions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const fadeIn = clampProgress(frame, 0, 0.45, fps);
  const leftFill = clampProgress(frame, 1.35, 0.35, fps);
  const rightFill = clampProgress(frame, 1.75, 0.35, fps);

  // Two smooth pulses along the shared border during "that share a border"
  const pulseWindow =
    interpolate(ti, [0.55, 0.75, 1.85, 2.15], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const pulseWave = 0.5 - 0.5 * Math.cos(((ti - 0.55) / 0.75) * Math.PI * 2);
  const pulse = pulseWindow * (0.25 + 0.75 * pulseWave);

  return (
    <Interactive.Div
      name="TwoRegions"
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeIn,
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        <defs>
          <clipPath id="scene02-two-regions-clip">
            <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} rx={BOX_R} />
          </clipPath>
        </defs>
        <g clipPath="url(#scene02-two-regions-clip)">
          <path d={BORDER_PATHS.left} fill={lerpRgb(GREY, PAL[0], leftFill)} />
          <path d={BORDER_PATHS.right} fill={lerpRgb(GREY, PAL[2], rightFill)} />
          <path
            d={BORDER_PATHS.line}
            fill="none"
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
          />
          {pulse > 0.001 && (
            <>
              <path
                d={BORDER_PATHS.line}
                fill="none"
                stroke="rgb(240,242,248)"
                strokeWidth={18}
                strokeLinecap="round"
                opacity={pulse * 0.24}
              />
              <path
                d={BORDER_PATHS.line}
                fill="none"
                stroke="rgb(240,242,248)"
                strokeWidth={3.5 + pulse * 3}
                strokeLinecap="round"
                opacity={pulse * 0.95}
              />
            </>
          )}
        </g>
      </svg>
    </Interactive.Div>
  );
};

// Part 2 geometry: 8-wedge pie meeting at a single center point, alternating 2 colors
const PIE_CX = 640;
const PIE_CY = 365;
const PIE_R = 178;
const WEDGES = 8;

const wedgePath = (index: number) => {
  const a0 = -Math.PI / 2 + (index * Math.PI * 2) / WEDGES;
  const a1 = -Math.PI / 2 + ((index + 1) * Math.PI * 2) / WEDGES;
  const x0 = PIE_CX + PIE_R * Math.cos(a0);
  const y0 = PIE_CY + PIE_R * Math.sin(a0);
  const x1 = PIE_CX + PIE_R * Math.cos(a1);
  const y1 = PIE_CY + PIE_R * Math.sin(a1);
  return `M ${PIE_CX} ${PIE_CY} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${PIE_R} ${PIE_R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
};

const WEDGE_PATHS = Array.from({ length: WEDGES }, (_, i) => wedgePath(i));
const RADIAL_LINES = Array.from({ length: WEDGES }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / WEDGES;
  return {
    x: PIE_CX + (PIE_R + 4) * Math.cos(a),
    y: PIE_CY + (PIE_R + 4) * Math.sin(a),
  };
});

const PieWedges: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  // Center dot appears right as "just one point" is spoken (~3.6s)
  const dotAppear = clampProgress(frame, 3.45, 0.35, fps);

  // Two expanding ripple rings around the central meeting point
  const ring1 = interpolate(ti, [3.7, 4.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const ring2 = interpolate(ti, [4.55, 5.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <Interactive.Div
      name="PieWedges"
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        <defs>
          <clipPath id="scene02-pie-clip">
            <circle cx={PIE_CX} cy={PIE_CY} r={PIE_R} />
          </clipPath>
        </defs>
        <g clipPath="url(#scene02-pie-clip)">
          {WEDGE_PATHS.map((d, i) => {
            const fillP = clampProgress(frame, 3.0 + i * 0.08, 0.35, fps);
            const targetColor = i % 2 === 0 ? PAL[0] : PAL[2];
            return (
              <path key={i} d={d} fill={lerpRgb(GREY, targetColor, fillP)} />
            );
          })}
          {RADIAL_LINES.map((pt, i) => (
            <line
              key={i}
              x1={PIE_CX}
              y1={PIE_CY}
              x2={pt.x}
              y2={pt.y}
              stroke={rgb(BG)}
              strokeWidth={7}
            />
          ))}
        </g>

        {/* Expanding rings highlighting the single shared vertex */}
        {ring1 > 0 && ring1 < 1 && (
          <circle
            cx={PIE_CX}
            cy={PIE_CY}
            r={12 + ring1 * 34}
            fill="none"
            stroke="rgb(240,242,248)"
            strokeWidth={3}
            opacity={(1 - ring1) * 0.85}
          />
        )}
        {ring2 > 0 && ring2 < 1 && (
          <circle
            cx={PIE_CX}
            cy={PIE_CY}
            r={12 + ring2 * 34}
            fill="none"
            stroke="rgb(240,242,248)"
            strokeWidth={3}
            opacity={(1 - ring2) * 0.85}
          />
        )}

        {/* Central point marker */}
        {dotAppear > 0.001 && (
          <g opacity={dotAppear}>
            <circle
              cx={PIE_CX}
              cy={PIE_CY}
              r={15}
              fill="rgb(240,242,248)"
              opacity={0.22}
            />
            <circle
              cx={PIE_CX}
              cy={PIE_CY}
              r={8 * (0.6 + 0.4 * dotAppear)}
              fill="rgb(240,242,248)"
              stroke={rgb(BG)}
              strokeWidth={3}
            />
          </g>
        )}
      </svg>
    </Interactive.Div>
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Interactive.Div
      name="Title"
      style={{
        position: "absolute",
        top: 82,
        width: "100%",
        translate: "0px -50%",
        textAlign: "center",
        fontFamily,
        fontWeight: 700,
        fontSize: 62,
        letterSpacing: -1,
        color: "rgb(240,242,248)",
        opacity: clampProgress(frame, 0, 0.5, fps),
      }}
    >
      The Rules
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1In = clampProgress(frame, 0.5, 0.5, fps);
  const line2In = clampProgress(frame, 3.1, 0.5, fps);
  const line1Opacity = line1In * (1 - 0.35 * line2In);

  return (
    <Interactive.Div
      name="Caption"
      style={{
        position: "absolute",
        left: 0,
        width: "100%",
        top: 638,
        translate: "0px -50%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        lineHeight: 1.25,
        color: "rgb(200,206,220)",
      }}
    >
      <div style={{ opacity: line1Opacity }}>
        share a border → different colors
      </div>
      <div style={{ opacity: line2In }}>touching at a point is fine</div>
    </Interactive.Div>
  );
};

export const SCENE02_FRAMES = 188; // 5.46s narration + ~0.8s breathing room

export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const showPie = frame >= Math.round(CUT_SEC * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: rgb(BG) }}>
      <Audio src={staticFile("audio/scene02.wav")} />
      {showPie ? <PieWedges /> : <TwoRegions />}
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
