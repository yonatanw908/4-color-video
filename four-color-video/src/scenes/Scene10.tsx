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
import { PatternGrid } from "./Scene09";

const { fontFamily } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["latin"],
});

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const CHECK_GREEN = "rgb(72, 206, 152)";

export const SCENE10_FRAMES = 234; // 7.80s (speech ends 7.37s; final 0.40s hands off to Scene 11)
const EXIT_START = SCENE10_FRAMES - 12;

// 11 cards remain visible to echo the ~1,900 -> 633 simplification
const KEPT_INDICES = new Set([2, 4, 5, 9, 10, 11, 13, 18, 20, 21, 27]);

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [6, 14], [0, 1], {
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
    interpolate(frame, [6, 14], [10, 0], {
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
      Is It Really a Proof?
    </Interactive.Div>
  );
};

const QuestionAndVerification: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  // Beat 1 (0.2s–2.5s): "?" over the dimmed grid during "No human could check it by hand."
  const qIn = interpolate(ti, [0.25, 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const qOut = interpolate(ti, [2.25, 2.75], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const qOpacity = qIn * qOut;

  // Beat 2 (2.6s–4.3s): Counter drops from 1,900 -> 633 during "Later the proof was simplified"
  const countIn = interpolate(ti, [2.55, 3.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const dropP = interpolate(ti, [2.75, 4.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const currentCount = Math.round(1900 - (1900 - 633) * dropP);

  // Beat 3 (4.85s–7.8s): 2005 verified badge slides up smoothly
  const badgeIn = interpolate(ti, [4.85, 5.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const drift = interpolate(ti, [4.85, SCENE10_FRAMES / fps], [1, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Interactive.Div
      name="VerificationOverlay"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Question mark */}
      {qOpacity > 0.005 && (
        <div
          style={{
            position: "absolute",
            top: 365,
            translate: "0px -50%",
            fontFamily,
            fontWeight: 700,
            fontSize: 168,
            color: "rgb(240,242,248)",
            opacity: qOpacity,
            transform: `scale(${(0.86 + 0.14 * qIn).toFixed(3)})`,
            textShadow: "0 12px 42px rgba(0, 0, 0, 0.7)",
          }}
        >
          ?
        </div>
      )}

      {/* Counter 1,900 -> 633 + 2005 Verified Badge */}
      {countIn > 0.005 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 28,
            marginTop: 22,
            transform: `scale(${drift.toFixed(4)})`,
          }}
        >
          <div
            style={{
              opacity: countIn,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily,
                fontWeight: 700,
                fontSize: 96,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                color: "rgb(240,242,248)",
                textShadow: "0 10px 36px rgba(0, 0, 0, 0.7)",
              }}
            >
              {currentCount.toLocaleString("en-US")}
            </div>
            <div
              style={{
                fontFamily,
                fontWeight: 500,
                fontSize: 26,
                color: "rgb(200,206,220)",
              }}
            >
              patterns
            </div>
          </div>

          <div
            style={{
              opacity: badgeIn,
              transform: `translateY(${((1 - badgeIn) * 18).toFixed(1)}px)`,
              padding: "16px 32px",
              borderRadius: 999,
              background: "rgba(15, 18, 28, 0.92)",
              border: `2.5px solid ${CHECK_GREEN}`,
              boxShadow: "0 12px 34px rgba(0, 0, 0, 0.5)",
              fontFamily,
              fontWeight: 500,
              fontSize: 30,
              color: "rgb(240,242,248)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontWeight: 700 }}>2005</span>
            <span style={{ color: "rgb(200,206,220)" }}>
              — verified by computer, step by step
            </span>
            <span style={{ color: CHECK_GREEN, fontWeight: 700 }}>✓</span>
          </div>
        </div>
      )}
    </Interactive.Div>
  );
};

export const Scene10: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ti = frame / fps;

  const enterOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exitOpacity = interpolate(frame, [EXIT_START, SCENE10_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Grid starts bright (matching Scene 9's final state) and dims smoothly while '?' appears
  const baseDim = interpolate(ti, [0, 0.75], [0.9, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  // During simplification (2.75s–4.3s), non-kept cards fade down further
  const simplifyP = interpolate(ti, [2.75, 4.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <AbsoluteFill style={{ opacity: enterOpacity * exitOpacity }}>
      <Audio src={staticFile("audio/scene10.wav")} />
      <Interactive.Div name="DimmedGrid" style={{ position: "absolute", inset: 0 }}>
        <PatternGrid
          cardOpacityFn={(idx) =>
            KEPT_INDICES.has(idx)
              ? baseDim * (1 + 0.35 * simplifyP)
              : baseDim * (1 - 0.85 * simplifyP)
          }
          checkOpacityFn={() => 1}
        />
      </Interactive.Div>
      <QuestionAndVerification />
      <Title />
    </AbsoluteFill>
  );
};
