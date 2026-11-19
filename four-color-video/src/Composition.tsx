import { AbsoluteFill, Sequence } from "remotion";
import { BG } from "./map";
import { Scene01, SCENE01_FRAMES } from "./scenes/Scene01";
import { Scene02, SCENE02_FRAMES } from "./scenes/Scene02";
import { Scene03, SCENE03_FRAMES } from "./scenes/Scene03";
import { Scene04, SCENE04_FRAMES } from "./scenes/Scene04";
import { Scene05, SCENE05_FRAMES } from "./scenes/Scene05";
import { Scene06, SCENE06_FRAMES } from "./scenes/Scene06";
import { Scene07, SCENE07_FRAMES } from "./scenes/Scene07";
import { Scene08, SCENE08_FRAMES } from "./scenes/Scene08";
import { Scene09, SCENE09_FRAMES } from "./scenes/Scene09";
import { Scene10, SCENE10_FRAMES } from "./scenes/Scene10";
import { Scene11, SCENE11_FRAMES } from "./scenes/Scene11";

// Smooth visual cross-transition overlap between adjacent scenes (0.40s @ 30fps).
// Each scene's narration finishes before its final 12 frames, so audio never overlaps.
export const SCENE_OVERLAP = 12;

// One entry per scene, in order. Each scene lives in src/scenes/SceneNN.tsx.
export const SCENES = [
  { id: "Scene01", component: Scene01, frames: SCENE01_FRAMES },
  { id: "Scene02", component: Scene02, frames: SCENE02_FRAMES },
  { id: "Scene03", component: Scene03, frames: SCENE03_FRAMES },
  { id: "Scene04", component: Scene04, frames: SCENE04_FRAMES },
  { id: "Scene05", component: Scene05, frames: SCENE05_FRAMES },
  { id: "Scene06", component: Scene06, frames: SCENE06_FRAMES },
  { id: "Scene07", component: Scene07, frames: SCENE07_FRAMES },
  { id: "Scene08", component: Scene08, frames: SCENE08_FRAMES },
  { id: "Scene09", component: Scene09, frames: SCENE09_FRAMES },
  { id: "Scene10", component: Scene10, frames: SCENE10_FRAMES },
  { id: "Scene11", component: Scene11, frames: SCENE11_FRAMES },
];

export const TOTAL_FRAMES =
  SCENES.reduce((s, x) => s + x.frames, 0) -
  Math.max(0, SCENES.length - 1) * SCENE_OVERLAP;

export const FourColorTheorem: React.FC = () => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: `rgb(${BG[0]},${BG[1]},${BG[2]})` }}>
      {SCENES.map(({ id, component: C, frames }, idx) => {
        const from = cursor;
        cursor += frames - (idx < SCENES.length - 1 ? SCENE_OVERLAP : 0);
        return (
          <Sequence key={id} from={from} durationInFrames={frames} name={id}>
            <C />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
