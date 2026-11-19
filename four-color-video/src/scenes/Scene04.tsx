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

const clampProgress = (
  frame: number,
  startSec: number,
  durSec: number,
  fps: number,
) =>
  interpolate(frame, [startSec * fps, (startSec + durSec) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

export const SCENE04_FRAMES = 225; // 7.50s (speech ends 6.80s; final 0.40s hands off to Scene 5)
const EXIT_START = SCENE04_FRAMES - 12;

// Exact same center as Scene 3 so the 4 regions visually carry straight across the transition
const CX = 640;
const CY = 358;

const rSeal = (theta: number) =>
  72 + 5.5 * Math.sin(3 * theta + 0.5) + 3 * Math.sin(5 * theta - 0.8);

const rMid = (theta: number) =>
  148 + 7.5 * Math.sin(2 * theta - 0.4) + 5 * Math.sin(5 * theta + 1.0);

const rFifth = (theta: number) =>
  202 + 7 * Math.sin(3 * theta - 0.8) + 4.5 * Math.sin(4 * theta + 0.6);

const polar = (r: number, theta: number): [number, number] => [
  CX + r * Math.cos(theta),
  CY + r * Math.sin(theta),
];

const SPOKE_ANGLES = [
  (-5 * Math.PI) / 6,
  -Math.PI / 6,
  Math.PI / 2,
] as const;

const radialSpokePoints = (spokeIdx: number, steps = 20): [number, number][] => {
  const a = SPOKE_ANGLES[spokeIdx];
  const r0 = rSeal(a);
  const r1 = rMid(a);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const r = r0 + (r1 - r0) * u;
    const wob = 5.5 * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u + spokeIdx * 1.9);
    pts.push([CX + r * cos - wob * sin, CY + r * sin + wob * cos]);
  }
  return pts;
};

const arcPoints = (
  radiusFn: (t: number) => number,
  a0: number,
  a1: number,
  steps = 48,
): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = a0 + ((a1 - a0) * i) / steps;
    pts.push(polar(radiusFn(t), t));
  }
  return pts;
};

const toPath = (pts: [number, number][], close = false) =>
  pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ") + (close ? " Z" : "");

const buildSurroundingLobe = (
  startSpoke: number,
  endSpoke: number,
  a0: number,
  a1: number,
) => {
  const s0 = radialSpokePoints(startSpoke);
  const outer = arcPoints(rMid, a0, a1, 44).slice(1);
  const s1 = radialSpokePoints(endSpoke).slice(0, -1).reverse();
  const inner = arcPoints(rSeal, a1, a0, 36).slice(1, -1);
  return toPath([...s0, ...outer, ...s1, ...inner], true);
};

const SEALED_PATH = toPath(arcPoints(rSeal, 0, Math.PI * 2, 96), true);

const SURROUNDING_REGIONS = [
  {
    colorIdx: 0, // Coral (top)
    path: buildSurroundingLobe(0, 1, (-5 * Math.PI) / 6, -Math.PI / 6),
  },
  {
    colorIdx: 3, // Blue (bottom-right)
    path: buildSurroundingLobe(1, 2, -Math.PI / 6, Math.PI / 2),
  },
  {
    colorIdx: 1, // Yellow (bottom-left)
    path: buildSurroundingLobe(2, 0, Math.PI / 2, (7 * Math.PI) / 6),
  },
] as const;

const SPOKE_PATHS = [0, 1, 2].map((i) => toPath(radialSpokePoints(i)));

const buildFifthWrapPath = (wrapProgress: number) => {
  if (wrapProgress <= 0.002) return { fill: "", innerBorder: "" };
  const startAngle = -Math.PI / 2;
  const sweep = Math.min(1, wrapProgress) * Math.PI * 2;
  const steps = Math.max(8, Math.round(120 * Math.min(1, wrapProgress)));
  const outerPts = arcPoints(rFifth, startAngle, startAngle + sweep, steps);
  const innerPts = arcPoints(rMid, startAngle, startAngle + sweep, steps);

  if (wrapProgress >= 0.999) {
    return {
      fill: `${toPath(outerPts, true)} ${toPath(innerPts, true)}`,
      innerBorder: toPath(innerPts, true),
    };
  }
  return {
    fill: toPath([...outerPts, ...innerPts.slice().reverse()], true),
    innerBorder: toPath(innerPts, false),
  };
};

// Tightly aligned to scene04.wav (0.35s–3.06s, then 3.95s–6.80s)
const WRAP_START = 0.45;
const WRAP_DUR = 1.5;

const PROBES = [
  { angle: -Math.PI / 6, start: 2.05, dur: 1.05 },
  { angle: (-5 * Math.PI) / 6, start: 2.85, dur: 1.05 },
  { angle: Math.PI / 2, start: 4.55, dur: 1.1 }, // gentle 3rd probe during "doesn't prove" so diagram stays alive
] as const;

const SEAL_OUTLINE_START = 2.3;

const ProbeAttempt: React.FC<{
  angle: number;
  start: number;
  dur: number;
}> = ({ angle, start, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;
  const local = ti - start;
  if (local < 0 || local > dur + 0.45) return null;

  const extend = EASE(Math.min(1, local / 0.38));
  const hitP = Math.max(0, Math.min(1, (local - 0.34) / 0.35));
  const fadeOut =
    local > dur ? 1 - EASE(Math.min(1, (local - dur) / 0.45)) : 1;

  const rStart = (rMid(angle) + rFifth(angle)) / 2;
  const rBlock = rSeal(angle) + 34;
  const rTip = rStart + (rBlock - rStart) * extend;

  const [x0, y0] = polar(rStart, angle);
  const [x1, y1] = polar(rTip, angle);
  const [xb, yb] = polar(rBlock, angle);

  const xSize = 10 * Math.min(1, hitP * 2);

  return (
    <g opacity={fadeOut}>
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={rgb(MAGENTA)}
        strokeWidth={4.5}
        strokeDasharray="7 6"
        strokeLinecap="round"
      />
      <circle cx={x0} cy={y0} r={5} fill={rgb(MAGENTA)} />

      {hitP > 0 && (
        <g>
          <circle
            cx={xb}
            cy={yb}
            r={10 + hitP * 18}
            fill="none"
            stroke={rgb(MAGENTA)}
            strokeWidth={3}
            opacity={(1 - hitP) * 0.9}
          />
          <line
            x1={xb - xSize}
            y1={yb - xSize}
            x2={xb + xSize}
            y2={yb + xSize}
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={xb + xSize}
            y1={yb - xSize}
            x2={xb - xSize}
            y2={yb + xSize}
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <line
            x1={xb - xSize}
            y1={yb - xSize}
            x2={xb + xSize}
            y2={yb + xSize}
            stroke={rgb(MAGENTA)}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={xb + xSize}
            y1={yb - xSize}
            x2={xb - xSize}
            y2={yb + xSize}
            stroke={rgb(MAGENTA)}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
};

const FiveCountriesDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  // Picks up directly from Scene 3's subtle rotation & drifts continuously until handing off to Scene 5
  const enterRot = interpolate(frame, [0, 14], [-8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const drift = interpolate(frame, [0, EXIT_START], [1, 1.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitP = interpolate(frame, [EXIT_START, SCENE04_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const scale = drift - exitP * 0.08;

  const wrapP = clampProgress(frame, WRAP_START, WRAP_DUR, fps);
  const fifth = buildFifthWrapPath(wrapP);

  const sealIn = clampProgress(frame, SEAL_OUTLINE_START, 0.38, fps);
  const pulse =
    0.7 + 0.3 * Math.sin(Math.max(0, ti - SEAL_OUTLINE_START) * Math.PI * 2.4);

  return (
    <Interactive.Div
      name="FiveCountriesDiagram"
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale.toFixed(4)}) rotate(${enterRot.toFixed(2)}deg)`,
        transformOrigin: `${CX}px ${CY}px`,
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {fifth.fill && (
          <path d={fifth.fill} fill={rgb(GREY)} fillRule="evenodd" />
        )}

        {SURROUNDING_REGIONS.map((reg, i) => (
          <path key={i} d={reg.path} fill={rgb(PAL[reg.colorIdx])} />
        ))}

        <path d={SEALED_PATH} fill={rgb(PAL[2])} />

        {SPOKE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
          />
        ))}
        <path
          d={SEALED_PATH}
          fill="none"
          stroke={rgb(BG)}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        {fifth.innerBorder && (
          <path
            d={fifth.innerBorder}
            fill="none"
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {sealIn > 0.005 && (
          <g opacity={sealIn}>
            <path
              d={SEALED_PATH}
              fill="none"
              stroke={rgb(MAGENTA)}
              strokeWidth={18}
              strokeLinejoin="round"
              opacity={0.34 * pulse}
            />
            <path
              d={SEALED_PATH}
              fill="none"
              stroke={rgb(MAGENTA)}
              strokeWidth={7.5}
              strokeLinejoin="round"
              opacity={0.95}
            />
            <path
              d={SEALED_PATH}
              fill="none"
              stroke="rgb(255,220,255)"
              strokeWidth={2.5}
              strokeLinejoin="round"
              opacity={0.75 * pulse}
            />
          </g>
        )}

        {PROBES.map((p, i) => (
          <ProbeAttempt key={i} angle={p.angle} start={p.start} dur={p.dur} />
        ))}
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
      Why Not Five?
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1In = clampProgress(frame, 0.75, 0.45, fps);
  const line2In = clampProgress(frame, 3.95, 0.5, fps);
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
      <div style={{ opacity: line1Opacity }}>5 countries can’t all touch</div>
      <div style={{ opacity: line2In }}>…but that’s not a proof</div>
    </Interactive.Div>
  );
};

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE04_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene04.wav")} />
      <FiveCountriesDiagram />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
