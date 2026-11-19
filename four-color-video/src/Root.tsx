import { AbsoluteFill, Composition } from "remotion";
import { FourColorTheorem, SCENES, TOTAL_FRAMES } from "./Composition";
import { BG } from "./map";

const VIDEO = { fps: 30, width: 1280, height: 720 } as const;

const withBackdrop = (Scene: React.FC): React.FC => {
  const Wrapped: React.FC = () => (
    <AbsoluteFill style={{ backgroundColor: `rgb(${BG[0]},${BG[1]},${BG[2]})` }}>
      <Scene />
    </AbsoluteFill>
  );
  return Wrapped;
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FourColorTheorem"
        component={FourColorTheorem}
        durationInFrames={TOTAL_FRAMES}
        {...VIDEO}
      />
      {/* Each scene on its own, for previewing one scene at a time */}
      {SCENES.map(({ id, component, frames }) => (
        <Composition
          key={id}
          id={id}
          component={withBackdrop(component)}
          durationInFrames={frames}
          {...VIDEO}
        />
      ))}
    </>
  );
};
