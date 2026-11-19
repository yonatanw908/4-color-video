import { Composition } from "remotion";
import { FourColorTheorem, SCENES, TOTAL_FRAMES } from "./Composition";

const VIDEO = { fps: 30, width: 1280, height: 720 } as const;

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
          component={component}
          durationInFrames={frames}
          {...VIDEO}
        />
      ))}
    </>
  );
};
