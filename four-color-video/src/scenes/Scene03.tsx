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

export const SCENE03_FRAMES = 252; // 8.40s (speech ends 7.97s; final 0.40s hands off to Scene 4)
const EXIT_START = SCENE03_FRAMES - 12;

// Stage center & organic polar contours for 3 inner countries meeting in a Y + 4th wrapping around all 3
const CX = 640;
const CY = 358;

const rInner = (theta: number) =>
  122 + 7 * Math.sin(3 * theta + 0.4) + 4 * Math.sin(5 * theta - 1.1);

const rOuter = (theta: number) =>
  196 +
  9 * Math.sin(2 * theta - 0.6) +
  6 * Math.sin(5 * theta + 0.9) +
  4 * Math.sin(7 * theta);

const polar = (r: number, theta: number): [number, number] => [
  CX + r * Math.cos(theta),
  CY + r * Math.sin(theta),
];

// Three spokes forming an upright Y: upper-left (-150°), upper-right (-30°), down (+90°)
const SPOKE_ANGLES = [
  (-5 * Math.PI) / 6,
  -Math.PI / 6,
  Math.PI / 2,
] as const;

const spokePoints = (spokeIdx: number, steps = 24): [number, number][] => {
  const a = SPOKE_ANGLES[spokeIdx];
  const rMax = rInner(a);
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const r = u * rMax;
    const wob = 7 * Math.sin(Math.PI * u) * Math.sin(2 * Math.PI * u + spokeIdx * 1.7);
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

const buildInnerSector = (
  startSpoke: number,
  endSpoke: number,
  a0: number,
  a1: number,
) => {
  const s0 = spokePoints(startSpoke);
  const arc = arcPoints(rInner, a0, a1, 44).slice(1);
  const s1 = spokePoints(endSpoke).slice(0, -1).reverse();
  return toPath([...s0, ...arc, ...s1], true);
};

const INNER_REGIONS = [
  {
    colorIdx: 0, // coral
    fillStart: 0.45,
    path: buildInnerSector(0, 1, (-5 * Math.PI) / 6, -Math.PI / 6),
    sharedArc: toPath(arcPoints(rInner, (-5 * Math.PI) / 6, -Math.PI / 6, 48)),
  },
  {
    colorIdx: 1, // yellow
    fillStart: 0.85,
    path: buildInnerSector(2, 0, Math.PI / 2, (7 * Math.PI) / 6),
    sharedArc: toPath(arcPoints(rInner, Math.PI / 2, (7 * Math.PI) / 6, 48)),
  },
  {
    colorIdx: 2, // teal
    fillStart: 1.25,
    path: buildInnerSector(1, 2, -Math.PI / 6, Math.PI / 2),
    sharedArc: toPath(arcPoints(rInner, -Math.PI / 6, Math.PI / 2, 48)),
  },
] as const;

const SPOKE_PATHS = [0, 1, 2].map((i) => toPath(spokePoints(i)));

const buildOuterWrapPath = (wrapProgress: number) => {
  if (wrapProgress <= 0.002) return { fill: "", innerBorder: "" };
  const startAngle = -Math.PI / 2;
  const sweep = Math.min(1, wrapProgress) * Math.PI * 2;
  const steps = Math.max(8, Math.round(120 * Math.min(1, wrapProgress)));
  const outerPts = arcPoints(rOuter, startAngle, startAngle + sweep, steps);
  const innerPts = arcPoints(rInner, startAngle, startAngle + sweep, steps);

  if (wrapProgress >= 0.999) {
    const fill = `${toPath(outerPts, true)} ${toPath(innerPts, true)}`;
    return { fill, innerBorder: toPath(innerPts, true) };
  }
  const fill = toPath([...outerPts, ...innerPts.slice().reverse()], true);
  return { fill, innerBorder: toPath(innerPts, false) };
};

// Visual timeline beats (visual-first design; scene03.wav is timed to match)
const WRAP_START = 2.15;
const WRAP_DUR = 1.45;

const TRIES = [
  { regionIdx: 0, colorIdx: 0, start: 4.1 },
  { regionIdx: 1, colorIdx: 1, start: 5.1 },
  { regionIdx: 2, colorIdx: 2, start: 6.1 },
] as const;
const TRY_DUR = 0.95;

const SETTLE_START = 7.25;
const SETTLE_DUR = 0.4;

const computeOuterState = (ti: number) => {
  if (ti >= SETTLE_START) {
    const p = interpolate(ti, [SETTLE_START, SETTLE_START + SETTLE_DUR], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE,
    });
    return { fill: lerpRgb(GREY, PAL[3], p), clashIdx: -1, clashAlpha: 0 };
  }

  for (const t of TRIES) {
    const local = ti - t.start;
    if (local >= 0 && local < TRY_DUR) {
      const candidate = PAL[t.colorIdx];
      if (local < 0.2) {
        const p = EASE(local / 0.2);
        return { fill: lerpRgb(GREY, candidate, p), clashIdx: -1, clashAlpha: 0 };
      }
      if (local < 0.33) {
        return { fill: rgb(candidate), clashIdx: -1, clashAlpha: 0 };
      }
      if (local < 0.78) {
        const u = (local - 0.33) / 0.45;
        const flash =
          Math.sin(Math.min(1, u / 0.22) * (Math.PI / 2)) *
          (0.72 + 0.28 * Math.sin(u * Math.PI * 3));
        const fadeTail = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
        const m = Math.max(0, Math.min(1, flash * fadeTail));
        return {
          fill: lerpRgb(candidate, MAGENTA, Math.min(1, m * 1.15)),
          clashIdx: t.regionIdx,
          clashAlpha: m,
        };
      }
      const back = EASE((local - 0.78) / (TRY_DUR - 0.78));
      return { fill: lerpRgb(MAGENTA, GREY, back), clashIdx: -1, clashAlpha: 0 };
    }
  }

  return { fill: rgb(GREY), clashIdx: -1, clashAlpha: 0 };
};

const FourRegionsMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  // Enter smoothly from Scene 2's pie, gently breathe, then align into Scene 4's 4-country map
  const enterScale = interpolate(frame, [0, 12], [0.88, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const drift = interpolate(frame, [12, SCENE03_FRAMES], [0, 0.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitRot = interpolate(frame, [EXIT_START, SCENE03_FRAMES], [0, 8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const scale = enterScale + drift;

  const wrapP = clampProgress(frame, WRAP_START, WRAP_DUR, fps);
  const outer = buildOuterWrapPath(wrapP);
  const { fill: outerFill, clashIdx, clashAlpha } = computeOuterState(ti);

  return (
    <Interactive.Div
      name="FourRegionsMap"
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale.toFixed(4)}) rotate(${exitRot.toFixed(2)}deg)`,
        transformOrigin: `${CX}px ${CY}px`,
      }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {outer.fill && (
          <path d={outer.fill} fill={outerFill} fillRule="evenodd" />
        )}

        {INNER_REGIONS.map((reg, i) => {
          const p = clampProgress(frame, reg.fillStart, 0.35, fps);
          return (
            <path
              key={i}
              d={reg.path}
              fill={lerpRgb(GREY, PAL[reg.colorIdx], p)}
            />
          );
        })}

        {SPOKE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {outer.innerBorder && (
          <path
            d={outer.innerBorder}
            fill="none"
            stroke={rgb(BG)}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {clashIdx >= 0 && clashAlpha > 0.01 && (
          <>
            <path
              d={INNER_REGIONS[clashIdx].sharedArc}
              fill="none"
              stroke={rgb(MAGENTA)}
              strokeWidth={20}
              strokeLinecap="round"
              opacity={clashAlpha * 0.45}
            />
            <path
              d={INNER_REGIONS[clashIdx].sharedArc}
              fill="none"
              stroke={rgb(MAGENTA)}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={Math.min(1, clashAlpha * 1.25)}
            />
            <path
              d={INNER_REGIONS[clashIdx].sharedArc}
              fill="none"
              stroke="rgb(255,220,255)"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={clashAlpha * 0.9}
            />
          </>
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
      Why Not Three?
    </Interactive.Div>
  );
};

const CounterCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rowIn = clampProgress(frame, 0.45, 0.45, fps);
  const fourIn = clampProgress(frame, SETTLE_START, 0.5, fps);

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
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        color: "rgb(200,206,220)",
        opacity: rowIn,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {INNER_REGIONS.map((reg, i) => {
          const p = clampProgress(frame, reg.fillStart, 0.35, fps);
          return (
            <div
              key={i}
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                marginRight: 10,
                background: lerpRgb(GREY, PAL[reg.colorIdx], p),
              }}
            />
          );
        })}
        <div
          style={{
            width: 28 * fourIn,
            height: 28,
            borderRadius: 7,
            marginRight: 10 * fourIn,
            opacity: fourIn,
            background: rgb(PAL[3]),
            overflow: "hidden",
          }}
        />
      </div>

      <span style={{ marginLeft: 14, display: "inline-flex", alignItems: "center" }}>
        <span>colors: 3</span>
        <span
          style={{
            display: "inline-block",
            maxWidth: 92 * fourIn,
            opacity: fourIn,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {"\u00A0→\u00A0"}
          <span style={{ color: rgb(PAL[3]), fontWeight: 700 }}>4</span>
        </span>
      </span>
    </Interactive.Div>
  );
};

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE03_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene03.wav")} />
      <FourRegionsMap />
      <Title />
      <CounterCaption />
    </AbsoluteFill>
  );
};
