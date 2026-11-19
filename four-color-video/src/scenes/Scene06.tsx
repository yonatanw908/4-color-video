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
import { BG, MAP_H2, MAP_W2, MH, MW, MX, MY, PAL, S, getMap } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export const SCENE06_FRAMES = 222; // 7.40s (speech ends 6.98s; final 0.40s hands off graph directly to Scene 7)
const EXIT_START = SCENE06_FRAMES - 12;

// Pre-slice each of the 15 Voronoi regions into its own 1x offscreen sprite so every
// country can shrink individually toward its own seed point while keeping its wobbly shape.
type RegionSprite = {
  canvas: HTMLCanvasElement;
  minX: number;
  minY: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
};

const buildRegionSprites = (): RegionSprite[] => {
  const { n, lab, border, col, seeds } = getMap();
  const bounds = Array.from({ length: n }, () => ({
    minX: MW,
    minY: MH,
    maxX: 0,
    maxY: 0,
  }));

  for (let y = 0; y < MH; y++) {
    const y2 = y * S;
    for (let x = 0; x < MW; x++) {
      const p = y2 * MAP_W2 + x * S;
      if (border[p]) continue;
      const r = lab[p];
      const b = bounds[r];
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
    }
  }

  // Build supersampled colored map once, then extract each region at 1x
  return bounds.map((b, r) => {
    const pad = 2;
    const minX = Math.max(0, b.minX - pad);
    const minY = Math.max(0, b.minY - pad);
    const maxX = Math.min(MW - 1, b.maxX + pad);
    const maxY = Math.min(MH - 1, b.maxY + pad);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    const hi = document.createElement("canvas");
    hi.width = w * S;
    hi.height = h * S;
    const img = new ImageData(w * S, h * S);
    const d = img.data;
    const [cr, cg, cb] = PAL[col[r]];
    for (let dy = 0; dy < h * S; dy++) {
      const yy = minY * S + dy;
      if (yy >= MAP_H2) continue;
      for (let dx = 0; dx < w * S; dx++) {
        const xx = minX * S + dx;
        if (xx >= MAP_W2) continue;
        const p = yy * MAP_W2 + xx;
        if (lab[p] === r && !border[p]) {
          const q = (dy * w * S + dx) * 4;
          d[q] = cr;
          d[q + 1] = cg;
          d[q + 2] = cb;
          d[q + 3] = 255;
        }
      }
    }
    hi.getContext("2d")!.putImageData(img, 0, 0);

    const lo = document.createElement("canvas");
    lo.width = w;
    lo.height = h;
    const ctx = lo.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(hi, 0, 0, w, h);

    return {
      canvas: lo,
      minX,
      minY,
      w,
      h,
      sx: seeds[r][0],
      sy: seeds[r][1],
    };
  });
};

const ShrinkingMapCanvas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const spritesRef = useRef<RegionSprite[] | null>(null);
  const { order } = getMap();

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    if (!spritesRef.current) {
      spritesRef.current = buildRegionSprites();
    }
    const sprites = spritesRef.current;

    ctx.clearRect(0, 0, MW, MH);
    // Clip to Scene 1's exact rounded rectangle while unshrunk
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, MW, MH, 28);
    ctx.clip();

    order.forEach((r, k) => {
      const sp = sprites[r];
      // Stagger each country's shrink smoothly from 1.25s to 3.85s
      const start = 1.2 + (k / order.length) * 1.25;
      const shrinkP = interpolate(ti, [start, start + 1.25], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE,
      });
      // Region fills fade out smoothly after shrinking into dots (3.6s -> 4.75s)
      const fillFade = interpolate(ti, [3.55 + k * 0.04, 4.35 + k * 0.04], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: EASE,
      });
      if (fillFade <= 0.005) return;

      const s = 1 - 0.82 * shrinkP;
      ctx.save();
      ctx.globalAlpha = fillFade;
      ctx.translate(sp.sx, sp.sy);
      ctx.scale(s, s);
      ctx.translate(-sp.sx, -sp.sy);
      ctx.drawImage(sp.canvas, sp.minX, sp.minY);
      ctx.restore();
    });

    ctx.restore();
  }, [frame, fps, ti, order]);

  return (
    <canvas
      ref={ref}
      width={MW}
      height={MH}
      style={{
        position: "absolute",
        left: MX,
        top: MY,
        display: "block",
      }}
    />
  );
};

const GraphOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;
  const { screenSeeds, col, edges, order } = getMap();

  const orderRank = new Map<number, number>();
  order.forEach((r, k) => orderRank.set(r, k));

  // Subtle living breath on dots once formed
  const dotRadiusBase = interpolate(ti, [6.6, SCENE06_FRAMES / fps], [20, 22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <Interactive.Div
      name="MapGraph"
      style={{ position: "absolute", inset: 0 }}
    >
      <svg width={1280} height={720} style={{ display: "block" }}>
        {/* Neighboring border lines draw smoothly during "Each shared border is a line." */}
        {edges.map(([a, b], idx) => {
          const [x1, y1] = screenSeeds[a];
          const [x2, y2] = screenSeeds[b];
          const len = Math.hypot(x2 - x1, y2 - y1);
          const avgX = (x1 + x2) / 2;
          const normX = Math.max(0, Math.min(1, (avgX - MX) / MW));
          const start = 4.95 + normX * 0.95;
          const drawP = interpolate(ti, [start, start + 0.55], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });
          if (drawP <= 0.002) return null;
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(200,206,220,0.62)"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - drawP)}
            />
          );
        })}

        {/* Colored dots emerge at each country's seed point as regions shrink */}
        {screenSeeds.map(([cx, cy], r) => {
          const rank = orderRank.get(r) ?? 0;
          const dotStart = 2.0 + (rank / screenSeeds.length) * 1.15;
          const pop = interpolate(ti, [dotStart, dotStart + 0.42], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: EASE,
          });
          if (pop <= 0.002) return null;
          return (
            <circle
              key={r}
              cx={cx}
              cy={cy}
              r={dotRadiusBase * (0.4 + 0.6 * pop)}
              fill={rgb(PAL[col[r]])}
              stroke={rgb(BG)}
              strokeWidth={3.5}
              opacity={pop}
            />
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
      Map to Graph
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const part1 = interpolate(frame, [3.45 * fps, 3.95 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const part2 = interpolate(frame, [5.15 * fps, 5.65 * fps], [0, 1], {
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        color: "rgb(200,206,220)",
        opacity: part1 * fadeOut,
      }}
    >
      <span>country → dot</span>
      <span
        style={{
          display: "inline-block",
          maxWidth: 260 * part2,
          opacity: part2,
          overflow: "hidden",
          whiteSpace: "nowrap",
        }}
      >
        {",\u00A0\u00A0border → line"}
      </span>
    </Interactive.Div>
  );
};

export const Scene06: React.FC = () => {
  const frame = useCurrentFrame();
  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE06_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene06.wav")} />
      <ShrinkingMapCanvas />
      <GraphOverlay />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
