# splat-harness

Pixel-art gaussian splat dioramas, and the start of a harness for streaming an endless run of them.

Each scene is a few tens of thousands of real 3D gaussians, built procedurally, projected to the
screen, and snapped to a small palette with ordered dithering. The renderer is fixed; a scene is one
JavaScript module that places splats.

## Run it

ES modules need http, so serve the folder:

    python3 -m http.server 8000

Then open http://localhost:8000.

| URL | What it does |
| --- | --- |
| `/#moon-roof-cat` | Open one scene by id |
| `/?cycle=120` | Move to the next scene every 120 seconds |
| `/?stream=1&cycle=120` | The same with no HUD, for OBS or a headless capture |

Drag to move the camera, tap to poke the scene.

The repo is also the site: GitHub Pages serves `main` as it is, with no build, at
https://erober416.github.io/splat-harness/. When cycling, the player re-reads `scenes/index.json`
before each change, so pushing a new scene and its playlist entry is all it takes to add one to a
player that is already running. A scene that fails to load is skipped.

## Layout

    index.html, player.js     the player: loads scenes, HUD, cycling
    engine/splat.js           WebGL2 renderer, palettes, camera, input
    engine/kit.js             what a scene builds with: splat clouds, lighting, shape samplers
    engine/math.js            vector helpers
    scenes/*.js               one module per scene
    scenes/index.json         the playlist
    tools/check-scene.mjs     build every scene under Node and check the budget
    tools/shoot.py            screenshot a scene in headless Chromium

## Check a scene

    node tools/check-scene.mjs
    python3 tools/shoot.py night-pond shots/pond.png     # needs: pip install playwright && playwright install chromium

`CLAUDE.md` has the scene contract, what was learned building the first two scenes, and the plan
for the generator, quality gate and stream.
