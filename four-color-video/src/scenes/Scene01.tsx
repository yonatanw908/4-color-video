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
import { MAP_H2, MAP_W2, MH, MW, MX, MY, PAL, paintMap } from "../map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

export const SCENE01_FRAMES = 195; // 6.50s (speech ends 5.93s; final 0.40s zooms into Scene 2)
const EXIT_START = SCENE01_FRAMES - 12;

const ColoringMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useRef<{ canvas: HTMLCanvasElement; img: ImageData } | null>(null);

  // Subtle living camera drift across the scene, accelerating into Scene 2's close-up
  const drift = interpolate(frame, [0, EXIT_START], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitP = interpolate(frame, [EXIT_START, SCENE01_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const scale = drift + exitP * 0.07;

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
    // Paced to sweep smoothly across the 5.93s narration (finishes coloring at 5.50s)
    paintMap(img, frame / fps, 0.45, 5.15);
    canvas.getContext("2d")!.putImageData(img, 0, 0);
    // Downsample 2x -> 1x for smooth anti-aliased borders
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = "high";
    out.drawImage(canvas, 0, 0, MW, MH);
  }, [frame, fps]);

  return (
    <canvas
      ref={ref}
      width={MW}
      height={MH}
      style={{
        position: "absolute",
        left: MX,
        top: MY,
        borderRadius: 28,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: "center center",
      }}
    />
  );
};

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const fadeOut = interpolate(frame, [EXIT_START, EXIT_START + 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const slideUp = interpolate(frame, [EXIT_START, EXIT_START + 6], [0, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <Interactive.Div
      name="Title"
      style={{
        position: "absolute",
        top: 82 + slideUp,
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
      The Four Color Theorem
    </Interactive.Div>
  );
};

const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
        opacity: interpolate(frame, [4.5 * fps, 5.1 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE,
        }),
      }}
    >
      {PAL.map((c) => (
        <div
          key={c.join()}
          style={{ width: 28, height: 28, borderRadius: 7, background: rgb(c) }}
        />
      ))}
      <span style={{ marginLeft: 18 }}>4 colors · no neighbors match</span>
    </Interactive.Div>
  );
};

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE01_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <Audio src={staticFile("audio/scene01.wav")} />
      <ColoringMap />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
