# Style guide (for agents continuing this video)

Read `SCRIPT.md` for scene content. This file covers how to build it.

## Look
- 1280×720, 30 fps.
- Background `BG` rgb(15,18,28). Uncolored region `GREY` rgb(58,64,82). Borders use the background color.
- The 4 colors are `PAL` in `src/map.ts`: coral (239,108,87), yellow (247,197,72), teal (72,178,160), blue (92,134,235).
- Magenta (214,92,214) is used only to show a clash or error.
- Title: Inter 700, 62 px, color (240,242,248), centered at y=82.
- Caption: Inter 500, 30 px, color (200,206,220).
- Load fonts with `@remotion/google-fonts/Inter`.
- Easing: `Easing.bezier(0.42,0,0.58,1)`. Fades take about 0.5 s. A region recolors in 0.35 s.
- Countries are wobbly Voronoi regions from `map.ts` (reuse its seeds, adjacency and coloring). In graph scenes, a country is a dot at its seed point and a border is a line between two dots.
- All illustrations are drawn in code. No images from generative models.

## Narration
- Voice: kokoro `af_bella`, speed 1.0.
- Render one wav per scene: `.venv/Scripts/python scripts/narrate.py <N> "<text>"` writes `four-color-video/public/audio/sceneNN.wav` and prints its length.
- Keep lines short. Spell out numbers. No symbols.

## Code
- One scene per file: `src/scenes/SceneNN.tsx`. Each file exports `SceneNN` and `SCENENN_FRAMES` = ceil((audio + ~0.75 s) × 30).
- Each scene plays its narration with `<Audio src={staticFile("audio/sceneNN.wav")} />`.
- Register each new scene in the `SCENES` list in `src/Composition.tsx`. `Root.tsx` then creates a per-scene composition for preview automatically.
- Name layers with `Interactive.Div name="..."`.

## Workflow
- Small steps: one scene, or one change to a scene.
- Check work with `npx remotion studio`, or with one still: `npx remotion still SceneNN --frame=X --output=<scratchpad>`. Don't render the full video until near the end.
- Commit only when the user says to.
- Full renders go to `render-01.mp4`, `render-02.mp4`, and so on. Never overwrite a previous render.

## Known issue
- The Scene 1 caption and swatch row sit about 50 px right of center.
