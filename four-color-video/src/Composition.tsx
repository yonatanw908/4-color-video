import { Series } from "remotion";
import { Scene01, SCENE01_FRAMES } from "./scenes/Scene01";
import { Scene02, SCENE02_FRAMES } from "./scenes/Scene02";
import { Scene03, SCENE03_FRAMES } from "./scenes/Scene03";

// One entry per scene, in order. Each scene lives in src/scenes/SceneNN.tsx.
export const SCENES = [
  { id: "Scene01", component: Scene01, frames: SCENE01_FRAMES },
  { id: "Scene02", component: Scene02, frames: SCENE02_FRAMES },
  { id: "Scene03", component: Scene03, frames: SCENE03_FRAMES },
];

export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + x.frames, 0);

export const FourColorTheorem: React.FC = () => (
  <Series>
    {SCENES.map(({ id, component: C, frames }) => (
      <Series.Sequence key={id} durationInFrames={frames} name={id}>
        <C />
      </Series.Sequence>
    ))}
  </Series>
);
