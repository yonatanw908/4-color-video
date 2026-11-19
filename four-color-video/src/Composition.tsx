import { loadFont } from "@remotion/google-fonts/Inter";
import { useLayoutEffect, useRef } from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BG, MAP_H2, MAP_W2, MH, MW, MX, MY, PAL, paintMap } from "./map";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const rgb = (c: readonly number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

const ColoringMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const off = useRef<{ canvas: HTMLCanvasElement; img: ImageData } | null>(null);

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
    paintMap(img, frame / fps);
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
      style={{ position: "absolute", left: MX, top: MY, borderRadius: 28 }}
    />
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
        opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.42, 0, 0.58, 1),
        }),
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
        left: 640 - 250,
        top: 646,
        translate: "0px -50%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily,
        fontWeight: 500,
        fontSize: 30,
        color: "rgb(200,206,220)",
        opacity: interpolate(frame, [3.6 * fps, 4.2 * fps], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.42, 0, 0.58, 1),
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

export const FourColorTheorem: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: rgb(BG) }}>
      <ColoringMap />
      <Title />
      <Caption />
    </AbsoluteFill>
  );
};
