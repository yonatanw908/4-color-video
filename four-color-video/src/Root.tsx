import { Composition } from "remotion";
import { FourColorTheorem } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FourColorTheorem"
        component={FourColorTheorem}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
