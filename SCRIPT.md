# The Four Color Theorem: Script

Target length is about 2.5 minutes, with about 340 words of narration at roughly 150 words per minute. Times below are approximate. Final scene lengths come from each scene's audio length.

## Style
- 1280×720, 30 fps. Background `BG` rgb(15,18,28), uncolored regions `GREY` rgb(58,64,82).
- Palette (`PAL` in `map.ts`): coral, yellow, teal, blue. Magenta rgb(214,92,214) is used only to show a clash.
- Inter 700 for titles and Inter 500 for captions. The voice is kokoro `af_bella` at speed 1.0.
- TTS rules: numbers are spelled out and there are no symbols. Each scene's narration renders to its own wav.

## Workflow
- Each scene lives in its own file (`src/scenes/SceneNN.tsx`) and is built one at a time. Check scenes in the Studio preview, not in a full render.
- Commit after each step, with a message saying what changed and why.
- Each full render gets a new file name (`render-01.mp4`, `render-02.mp4`, …). Never render over the previous one.
- All illustrations are drawn in code. No images from generative models.

---

## 1. Hook (0:00–0:10)
**Visual:** The existing shot: the title fades in, then the map sweeps from grey to four colors. The four swatches appear at the end.
**Narration:**
> Any map can be colored with just four colors, so no two neighbors match. Proving it took over a century.

## 2. The rules (0:10–0:22)
**Visual:** Two regions share a border, the border pulses, and the two colors differ. Cut to a pie whose wedges meet at one point and alternate two colors. The caption builds: `share a border → different colors` / `touching at a point is fine`.
**Narration:**
> Countries that share a border need different colors. Touching at just one point doesn't count.

## 3. Why not three? (0:22–0:36)
**Visual:** Three regions meet in a Y and take three colors. A fourth region wraps around all three. It tries each of their colors, each try flashes magenta, and it settles on blue. A counter shows `colors: 3 → 4`.
**Narration:**
> Three colors aren't always enough. Wrap one country around three others. It touches all of them, so it needs a fourth color.

## 4. Why not five? (0:36–0:50)
**Visual:** A fifth region tries to touch all four regions from Scene 3, and one of them always ends up sealed inside (magenta outline). The caption reads `5 countries can't all touch`, and below it fades in `…but that's not a proof`.
**Narration:**
> Five countries can never all touch each other. But that alone doesn't prove four colors are enough.

## 5. Origin (0:50–0:58)
**Visual:** A map silhouette, drawn in code, colors in with the four colors. A single label reads `1852 — a student's question`.
**Narration:**
> The question was first asked in eighteen fifty-two, by a student coloring a map of England.

## 6. Map to graph (0:58–1:12)
**Visual:** Each region of the Scene 1 map shrinks to a dot at its seed point and keeps its color. Lines draw between neighboring dots, then the region fills fade away. The caption reads `country → dot, border → line`. This reuses the adjacency data in `map.ts`.
**Narration:**
> Mathematicians turn the map into dots and lines. Each country is a dot. Each shared border is a line.

## 7. A small country always exists (1:12–1:24)
**Visual:** Each dot shows its number of neighbors. The lowest one gets a ring around it, and the caption reads `always one with 5 or fewer`.
**Narration:**
> In every map, some country has five neighbors or fewer. So remove it, color the rest, and put it back.

## 8. The swap trick (1:24–1:50)
**Visual:**
1. A grey dot has five neighbors that already use all four colors.
2. The coral–teal chain connected to one neighbor glows.
3. Coral and teal swap along the chain in a ripple. Coral is now free, and the grey dot becomes coral ✓.
4. In a harder case, two chains tangle and flash magenta. The caption reads `this case broke the first proof`.

**Narration:**
> If all four colors are taken around it, swap two colors along a connected chain. That frees a color. But in some tangled cases, the swaps interfere. That flaw broke the first proof.

## 9. The computer proof (1:50–2:12)
**Visual:** The label `1976` appears. A grid of small graph thumbnails fills the screen while a counter rises to `~1,900`. A wave of green checks sweeps across the grid. A postmark stamps in: `FOUR COLORS SUFFICE`.
**Narration:**
> In nineteen seventy-six, two mathematicians listed about two thousand small patterns. Every map contains one. A computer checked them all.

## 10. Is it really a proof? (2:12–2:26)
**Visual:** The grid dims and a `?` appears. The counter drops to `633`. A badge appears: `2005 — verified by computer, step by step ✓`.
**Narration:**
> No human could check it by hand. Later the proof was simplified, and in two thousand five it was fully verified.

## 11. Close (2:26–2:36)
**Visual:** A much more complex map than Scene 1's: roughly 40 to 50 regions, generated in code, which is far less regular than the grid used in Scene 1. Region sizes vary a lot, from big countries next to tiny ones. Some regions sit fully inside others, as enclaves or rings that wrap around a whole country. Shapes vary much more too: long thin strips, spirals or hooks, jagged coastlines, and smooth blobs. The map colors itself in the same sweep. The swatches return, the caption reads `Four colors suffice.`, and the screen fades out.
**Narration:**
> However tangled the borders, four colors are always enough.

---

## Fact-check before the final render
1852, 1976 and 2005; "about two thousand" patterns; 633.
