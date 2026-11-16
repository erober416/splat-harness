# splat-harness

Pixel-art gaussian splat dioramas. Two hand-built scenes exist (`night-pond`, `moon-roof-cat`).
The goal is a harness that generates new scenes with a model, gates them for quality, and streams
them around the clock, changing every couple of minutes.

## Commands

    python3 -m http.server 8000                 # serve; ES modules do not load from file://
    node tools/check-scene.mjs [id ...]         # build scenes under Node, check budget and meta
    python3 tools/shoot.py <id> <out.png>       # headless screenshot; --tap --slow 25 --clean --width --height

There is no build step and no dependencies for the player. `tools/shoot.py` needs Python Playwright
with Chromium.

## How rendering works (engine/splat.js)

Everything draws at a tiny internal resolution (about 190 art pixels on the short side) and CSS
scales it up with `image-rendering: pixelated`.

1. Solid pass. Each splat is an instanced quad. The vertex shader builds the 3D covariance from
   scale and quaternion, projects it to a 2D ellipse, and the fragment shader dithers the gaussian's
   alpha against a 4x4 Bayer matrix, writing depth. This is why nothing is sorted: a splat is either
   there or not at each pixel.
2. Glow pass. Additive splats for lamps, halos and stars; depth-tested, not depth-written, pulled
   slightly toward the camera.
3. Post pass. Each pixel is snapped to the palette (nearest colour, or a luminance ramp for the
   shared mono palettes) with ordered dithering. The background gradient is added here.

Lighting is baked into splat colours when the scene is built (`kit.shade`). Motion is done in the
vertex shader by per-splat "anim types".

## The scene contract

A scene is `scenes/<id>.js`, listed in `scenes/index.json`, exporting:

```js
export const meta = {
  id, title, seed,                 // id must match the filename; seed makes the build repeatable
  hint, alt,                       // HUD line and canvas aria-label
  ui: { title, hint, text, ink, edge, void },   // six HUD colours, hex
  palette: { name, colors: [...] },             // at most 32 hex colours
  bg: { bottom: [r,g,b], top: [r,g,b], curve }, // sky gradient, 0..1 floats; curve is the exponent
  ramp: [floor, gain, gamma],      // how luminance maps into the shared mono palettes
  camera: { mode: 'orbit' | 'sway', az, el, target, fit: [halfWidth, halfHeight],
            elRange, azRange?, speed, swayAmp? },
  tap: { hop, time }               // height and duration of the tap hop (anim types 3, 9, 12)
};
export function build(kit) { /* fill kit.solid and kit.glow */ }
```

`build` must be pure: no DOM, no WebGL, no network, no `Math.random` (use `kit.R` / `kit.rr`). It
only pushes numbers into two arrays. That is what makes it checkable under Node and safe to run in
a Worker or sandboxed iframe later.

Scene units are roughly metres. Y is up. Keep the subject within about 2.5 units of the origin;
`camera.fit` says what half-width and half-height must stay in frame, and the engine picks the
distance for any aspect ratio. Use `orbit` for a diorama that reads from every side, `sway` when
there is a backdrop (a moon, a wall) that must stay behind the subject.

### kit

- `solid.add(p, q, sx, sy, sz, color, solidity, anim, pivot)` and the same on `glow`. `q` is a
  quaternion (`quatY(normal)` for a surface disc, `quatB(basis)` for a blade or needle). Sigmas are
  in scene units; a surface disc is about `(s, 0.4s, s)`. Solidity 3 to 4 is crisp, 1.5 is wispy.
- `setLights({ ambient, dir: [{dir, color, wrap?}], point: [{p, c, i, k, min?}] })` then
  `shade(base, p, n, jitter?, gain?)`. Call `setLights` before placing anything.
- Shape samplers, all taking a colour function and options `{ anim, piv, alpha, thin, j, gain }`:
  `ellipsoid(c, radii, basis, count, size, fn(d, n, p), o)` (also `o.warp`),
  `cyl(a, b, r0, r1, count, size, fn(t, angle, p), o)`,
  `box(c, half, count, size, fn(axis, sign, q, p), o)`,
  `roof(c, y0, h0, y1, h1, count, size, fn(t, s, p), o)`.
  A colour function returns a base colour to shade, `{ e: 1, c, anim? }` for an unshaded colour,
  or `null` to skip.
- Everything in `engine/math.js`, plus `R()`, `rr(a, b)`, `randUnit()`.

### Anim types

`anim = [type, phase, amp, extra]`, with a `pivot`.

| Type | Motion | amp | extra |
| --- | --- | --- | --- |
| 0 | still | | |
| 1 | sway from pivot, grows with height (reeds, grass) | bend | |
| 2 | wander and blink (fireflies) | range | blink rate |
| 3 | character: breathe about pivot, hop on tap | breath | rate |
| 4 | water rings from the origin, plus a ring when the hop lands | strength | distance from centre |
| 5 | lap around the pivot's Y axis (fish) | rad/s | position along body, -1..1 |
| 6 | lamp flicker | | |
| 7 | fall from pivot height and fade (waterfall) | speed | drop |
| 8 | twinkle | | rate |
| 9 | as 3, and blinks (eyes) | breath | rate |
| 10 | bob | height | rate |
| 11 | pop up on tap, float, fade (hearts) | | |
| 12 | tail: sideways sway from pivot, hops with its owner | bend | |
| 13 | drift along x, wrapping at +-7 (clouds); pivot.x = group centre | | speed |
| 14 | smoke rising from pivot | speed | |

New motion means a new branch in the vertex shader in `engine/splat.js`. Keep it generic and add a
row here. Type 4 still has the pond's pad radius hard-coded; lift those into parameters when a
second water scene needs them.

## What building the first two scenes taught

These came from looking at screenshots and fixing what was wrong. A generator prompt should carry
them, and the quality gate should look for them.

- **The subject must be big.** The frog was first about 45 px wide in a 195 px frame and read as a
  blob. Aim for the hero at a third of the frame width or more.
- **Separate the subject from what it sits on.** A green frog on green pads vanished until the pads
  went cooler and darker. Check hue and value contrast against the ground, not in isolation.
- **The palette needs a mid-tone for every hue you use.** Shaded teal shutters snapped to grey until
  a mid teal was added. Night lighting pulls colours far from their base; pick palette entries for
  the shaded values, not the base values.
- **Pale colours go grey in the dark.** A cream belly quantised to grey; a more saturated base fixed it.
- **Eyes and lamps should be unshaded** (`{ e: 1 }`). Shaded eyes disappear.
- **Small features need room.** A collar placed under the chin merged into the face. Whiskers at
  full solidity drew as thick bars; they needed thin sigmas and solidity near 1.3.
- **Big bright effects take over.** The first waterfall was a white slab. Narrow it, lower solidity.
- **Mono ramps need a floor**, or the dark sky dithers into haze (`meta.ramp[0]`).
- **Stay near 45k splats.** Both scenes are there and run well on a phone. `check-scene` fails at 60k.
- Surfaces nobody can see (the back wall of a house the camera never rounds) can be skipped.
- Both scenes needed one fix pass after the first render. Budget for a look-and-fix loop.

### Checking renders

Headless Chromium without a GPU draws these on the CPU at about two frames a second, and a
screenshot takes seconds. A still is fine. Anything timed is gone before the capture, so slow the
page clock: `tools/shoot.py <id> out.png --tap --slow 25`. Do not judge frame rate from it; real
GPUs, phones included, run these smoothly.

## The plan

1. **Player** (started). `index.html?stream=1&cycle=120` already cycles the playlist with a fade.
   It re-reads `scenes/index.json` before every cycle, so added and removed scenes are picked up
   without a reload, and it skips a scene that fails to load or build. Still to do: preload the
   next scene before fading, shuffle, a better transition than a fade to black, and a version per
   playlist entry so an edited scene replaces the copy a long-running page has already imported.
   This repo is the static site (GitHub Pages from `main`); the streaming machine only opens its URL.
2. **Generator.** A script that calls the Claude API with this file's contract and lessons,
   `engine/kit.js`, one existing scene as the worked example, and a theme, and writes
   `scenes/<id>.js`. Themes from a seed list at first; chat votes later.
3. **Quality gate.** `tools/check-scene.mjs` for crashes and budget, then a screenshot, then a model
   looking at the screenshot against the lessons above and either patching the scene or rejecting
   it. Only passing scenes are added to `scenes/index.json`.
4. **Library, not live generation.** A scene takes minutes to make and one every two minutes is 720
   a day. Generate ahead, shuffle the library, trickle new scenes in. The stream never waits on a
   generation.
5. **Stream.** OBS with a browser source on the player URL, or headless Chrome into ffmpeg, to
   Twitch or YouTube. The streaming machine needs a real GPU.
6. **Sandbox.** Scene modules are model-written code. Before running unreviewed ones, move `build`
   into a Worker or a sandboxed iframe with no network and pass back only the two float arrays.

## Conventions

- Plain ES modules, no bundler, no framework. The player must stay openable from a static server.
- Scenes are self-contained: one file, no imports, everything through `kit`.
- Do not change what an existing anim type does; scenes depend on the numbers. Add a new one.
- After touching the engine, run `check-scene` and screenshot both scenes.
