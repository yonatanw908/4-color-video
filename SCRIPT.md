# The Four Color Theorem: Script

An explainer of about 4 minutes. It covers what the theorem says, why four colors are needed, why the obvious proof fails, and how a computer finished the job.

## Format and style

| | |
|---|---|
| Canvas | 1280×720, 30 fps (Remotion `FourColorTheorem` composition) |
| Background | `BG` rgb(15,18,28) |
| Uncolored region | `GREY` rgb(58,64,82) |
| Palette | coral rgb(239,108,87), yellow rgb(247,197,72), teal rgb(72,178,160), blue rgb(92,134,235): `PAL[0..3]` in `map.ts` |
| Warning / conflict | a 5th color, used only to show "too many colors" or a clash: magenta rgb(214,92,214) |
| Type | Inter 700 for titles, Inter 500 for captions |
| Voice | kokoro-onnx, `af_sarah`, speed 1.0 (`scripts/narrate.py`) |
| Pacing | about 150 words per minute. Each scene's duration comes from its narration plus 0.5–1 s of breathing room |

**Narration rules for TTS:** spell out numbers and avoid symbols ("eighteen fifty-two", not "1852"; "five" not "5"). Write each scene as its own text block so each one renders to its own wav. Scene timing can then follow the audio length.

**Visual language:** countries are the wobbly Voronoi regions from `map.ts`. A country fades in from grey to a palette color over 0.35 s. Borders stay at background color. In the graph scenes, every country collapses to a dot at its seed point, and every shared border becomes a line between two dots.

---

## Scene 1: Cold open: the map colors itself (0:00–0:12)

**Visual:** This is the existing render. The title fades in. The 15-region map sweeps from grey to four colors, left to right. The swatches and the caption "4 colors · no neighbors match" fade in at the end.

**On screen:** `The Four Color Theorem` / `4 colors · no neighbors match`

**Narration:**
> Take any map. Any map at all. You can color it with just four colors, so that no two neighbors ever match. That's the whole statement. It took mathematicians a hundred and twenty-four years to prove it.

---

## Scene 2: The rules (0:12–0:34)

**Visual:**
1. Zoom in on two neighboring regions. Their shared border pulses white. Caption: `share a border → different colors`.
2. Cut to a pie of four wedges that meet at one center point. Opposite wedges are the same color, and the center point pulses. Caption: `touching at a point is fine`.
3. A country made of two separate pieces (an exclave) appears, joined by a dashed line. It gets a red ✕. Caption: `each country is one connected piece`.

**On screen:** the three captions above, stacked as a checklist that builds.

**Narration:**
> First, the rules. Two countries that share a stretch of border must get different colors. Countries that only touch at a single point don't count as neighbors, so a pie cut into slices can alternate just two colors. And every country has to be one connected piece. No islands or exclaves that must match the mainland.

---

## Scene 3: Why not three? (0:34–0:58)

**Visual:**
1. Three regions meet in a Y. They get coral, yellow and teal. Three colors are enough so far.
2. A fourth region grows and wraps around all three, touching each one. It tries coral (the clash flashes magenta), then yellow (clash), then teal (clash), and finally settles on blue.
3. Variation: a central region ringed by **five** regions. The ring alternates coral/yellow/coral/yellow, and the fifth needs teal. The center touches all three, so it needs blue. Caption: `odd ring + center → 4 colors`.

**On screen:** a counter in the corner, `colors used: 3` → `4`.

**Narration:**
> Could three colors ever be enough? No. Here are three countries, each touching the other two. They need three colors. Now wrap a fourth country around all of them. It touches every one, so it needs a fourth color. The same thing happens with any country ringed by an odd number of neighbors. So four is sometimes necessary. The real question is whether four is always enough.

---

## Scene 4: Why not five? The tempting argument (0:58–1:20)

**Visual:**
1. Four regions, all mutually adjacent (the configuration from Scene 3).
2. A fifth region tries to squeeze in so that it touches all four. However it grows, one of the original four is sealed off inside. The unreachable region gets a magenta outline. Try two different placements.
3. Caption: `5 mutually-touching countries: impossible`. Then a second line fades in: `…but that doesn't prove 4 colors suffice`.

**Narration:**
> Here's a tempting shortcut. You can never draw five countries that all touch each other. Try it, and one of them always gets trapped inside the others. So surely four colors are enough? Unfortunately, no. A map can need many colors without any five countries all touching. That shortcut has fooled a lot of people. The real proof is much harder.

---

## Scene 5: A question from a student (1:20–1:50)

**Visual:** A sepia-tinted outline of English counties. A stylized silhouette works if real geography is too fussy. It colors in with the four palette colors. Then a simple timeline runs left to right along the bottom, with each name dropping in as it's spoken:

- `1852`: Francis Guthrie → his brother Frederick → Augustus De Morgan
- `1879`: Alfred Kempe publishes a proof ✓
- `1890`: Percy Heawood finds the flaw. The ✓ cracks and turns into ✕

**On screen:** the timeline labels above.

**Narration:**
> The question began in eighteen fifty-two. Francis Guthrie was coloring a map of the counties of England. He noticed he never needed more than four colors, and wondered whether that was always true. His brother passed the question to the mathematician Augustus De Morgan, and it spread. In eighteen seventy-nine, a lawyer named Alfred Kempe published a proof. It was accepted for eleven years, until Percy Heawood found a hole in it.

---

## Scene 6: Turn the map into a graph (1:50–2:08)

**Visual:** Back to the Scene 1 map. Each region shrinks to a dot at its seed point and keeps its color. For every pair of adjacent regions, a line draws between their dots. The region fills fade away, and a clean colored graph remains. Caption: `country → dot, shared border → line`. The lines never cross. Highlight this by sweeping a glow along them.

**Implementation note:** `map.ts` already computes adjacency (`adj`) and seed points, so the graph can be derived directly from the same data.

**Narration:**
> To attack the problem, mathematicians strip the map down to its skeleton. Each country becomes a dot. Each shared border becomes a line. Because the map lies flat, these lines never have to cross. Coloring the map now means coloring the dots, so that no line joins two dots of the same color.

---

## Scene 7: Every map has a small country (2:08–2:28)

**Visual:**
1. Label each dot of the graph with its degree, the number of lines it has.
2. Show the formula `V − E + F = 2` (Euler) briefly, then fade it into the consequence: `some dot always has 5 or fewer neighbors`.
3. Find the lowest-degree dot in the graph and highlight it with a ring. Its degree should be ≤ 5.

**Narration:**
> Here's the key fact, which goes back to Euler. In any flat map, there is always some country with five neighbors or fewer. You can't make every country crowded. That suggests a plan. Remove that small country, color everything else, then put it back.

---

## Scene 8: Kempe's trick (2:28–3:05)

**Visual:** This is the centerpiece.
1. Isolate a dot **v** (grey) with **five** neighbors around it, colored coral, yellow, teal, blue, yellow. All four colors are taken, so v has no free color.
2. Pick the coral neighbor. Trace the **coral–teal chain** out from it: every connected dot colored coral or teal glows, and the rest of the graph dims.
3. **Swap** the chain: coral ↔ teal flip together in a ripple along the chain. The neighbor that was coral is now teal. Coral is free, so v becomes coral. ✓
4. Caption: `swap a two-color chain → free up a color`.
5. Beat: show the case where swapping is blocked (the chain loops back to the teal neighbor). Caption: `with 5 neighbors, sometimes you need two swaps at once…`. The two chains flash, then visibly collide and tangle (magenta).

**Narration:**
> Say the country we put back has five neighbors, and they already use all four colors. Kempe's idea was this. Pick two colors, say coral and teal. Follow the chain of coral and teal countries that connect to one neighbor, and swap them all. The map stays valid, and suddenly a color is free. Usually, this works. But in some tangled cases you need two swaps at once, and Kempe assumed they wouldn't interfere. Sometimes they do. That was the hole Heawood found. His repair proves only that five colors are always enough. Four would take another eighty-six years.

---

## Scene 9: The computer proof (3:05–3:40)

**Visual:**
1. Timeline continues: `1976`: Kenneth Appel & Wolfgang Haken, University of Illinois.
2. A grid of hundreds of small graph thumbnails tiles in fast and fills the screen. These are the "unavoidable configurations". A counter ticks up to `~1,900`.
3. Each thumbnail flashes a green check in a fast wave across the grid. Caption: `every map contains one of these` / `none of them can be in a smallest counterexample`.
4. A stylized postmark stamps onto the screen: `FOUR COLORS SUFFICE`.

**Narration:**
> In nineteen seventy-six, Kenneth Appel and Wolfgang Haken finally finished the job. They built Kempe's idea into a giant list. Every map must contain at least one of nearly two thousand small configurations. They then used a computer to check that each one can be colored around, one by one. It took over a thousand hours of machine time. Their university was so proud it changed its postmark to read, four colors suffice.

---

## Scene 10: Is it really a proof? (3:40–4:00)

**Visual:**
1. The grid of thumbnails stays dimmed in the background. A large `?` fades in.
2. Two more timeline entries drop in:
   - `1996`: Robertson, Sanders, Seymour & Thomas: a simpler proof with 633 configurations. The counter animates down from ~1,900 to 633.
   - `2005`: Georges Gonthier: fully checked by a proof assistant (Coq). A ✓ badge appears.

**Narration:**
> Many mathematicians were uneasy. No human could check every case by hand. In nineteen ninety-six, a team simplified the proof to six hundred and thirty-three cases. And in two thousand five, Georges Gonthier had every step verified by a proof-checking program. Today, the result is as certain as anything in mathematics.

---

## Scene 11: Close (4:00–4:15)

**Visual:** Back to the opening map, now with many more regions (for example a 9×5 grid). It colors itself again in the same left-to-right sweep. The title and the four swatches return. Hold, then fade to `BG`.

**On screen:** `Four colors suffice.`

**Narration:**
> So the next time you look at a map, remember: however tangled the borders get, four colors will always be enough.

---

## Optional bonus beat (drop if over time)

After Scene 10, a donut shape (torus) rotates, and a map on its surface needs **7** colors. Caption: `on a donut, the answer is 7`.
> Oddly, on the surface of a donut, the answer is seven, and that was proved long before the flat case.

---

## Production checklist

- [ ] Split narration into `scenes/NN.txt` and render one wav per scene with `scripts/narrate.py` (extend it to take a text file and an output path).
- [ ] Measure each wav and set each scene's `durationInFrames` = ceil((audio + 0.75 s) × 30).
- [ ] One Remotion `<Sequence>` per scene, with `<Audio>` for its wav.
- [ ] Reuse `map.ts` for Scenes 1, 6, 7, 8 and 11 (regions, seeds, adjacency, 4-coloring).
- [ ] New assets: England counties silhouette (Scene 5), postmark (Scene 9), thumbnail grid of configurations (Scene 9, can be generated procedurally).
- [ ] Fact-check pass before final render: dates (1852, 1879, 1890, 1976, 1996, 2005), "nearly two thousand" configurations, "over a thousand hours", 633.
