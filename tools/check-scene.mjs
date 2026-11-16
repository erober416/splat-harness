// Fast, browser-free gate: build each scene under Node and check it against the budget.
//   node tools/check-scene.mjs                 every scene in scenes/index.json
//   node tools/check-scene.mjs moon-roof-cat   one scene
// Exits non-zero if any scene fails. This catches crashes and budget problems only; whether the
// scene looks right needs a screenshot (tools/shoot.py).
import { readFileSync } from 'node:fs';
import { createKit, STRIDE } from '../engine/kit.js';

const MAX_SPLATS = 60000, MIN_SPLATS = 5000, MAX_COLORS = 32;
const root = new URL('..', import.meta.url);
const ids = process.argv.length > 2 ? process.argv.slice(2) : JSON.parse(readFileSync(new URL('scenes/index.json', root)));
let failed = 0;
for (const id of ids) {
  const problems = [];
  try {
    const mod = await import(new URL(`scenes/${id}.js`, root));
    const m = mod.meta, kit = createKit(m.seed || 1);
    mod.build(kit);
    const n = kit.solid.n + kit.glow.n;
    if (m.id !== id) problems.push(`meta.id is "${m.id}", file is "${id}"`);
    if (n > MAX_SPLATS) problems.push(`${n} splats is over the ${MAX_SPLATS} budget`);
    if (n < MIN_SPLATS) problems.push(`${n} splats is suspiciously few`);
    if (!m.palette || m.palette.colors.length > MAX_COLORS) problems.push(`palette must have at most ${MAX_COLORS} colours`);
    for (const c of [kit.solid, kit.glow]) {
      if (c.a.length !== c.n * STRIDE) problems.push('splat buffer has the wrong length');
      if (c.a.some(v => !Number.isFinite(v))) problems.push('splat buffer contains NaN or Infinity');
    }
    for (const k of ['title', 'hint', 'bg', 'camera']) if (!m[k]) problems.push(`meta.${k} is missing`);
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${id}: ${kit.solid.n} solid + ${kit.glow.n} glow, ${m.palette ? m.palette.colors.length : 0} colours`);
  } catch (err) {
    problems.push(err.stack || String(err));
    console.log(`FAIL ${id}: build threw`);
  }
  for (const p of problems) console.log('     ' + p);
  if (problems.length) failed++;
}
process.exit(failed ? 1 : 0);
