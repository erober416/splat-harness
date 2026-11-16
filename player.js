// Player: loads scene modules into the engine, shows the HUD, and optionally cycles.
//
//   index.html#moon-roof-cat      open one scene by id
//   index.html?cycle=120          move to the next scene every 120 seconds
//   index.html?stream=1&cycle=120 the same with no HUD, for OBS or a headless capture
import { createEngine } from './engine/splat.js';

const $ = id => document.getElementById(id);
const canvas = $('c'), msg = $('msg');
const params = new URLSearchParams(location.search);
const cycleSec = Number(params.get('cycle')) || 0;
if (params.get('stream')) document.body.classList.add('stream');

const say = text => { msg.textContent = text; msg.hidden = false; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const engine = createEngine(canvas, $('stage'));

function paint(info) {
  if (!info) return;
  $('stat').textContent = `${info.count.toLocaleString('en-US')} gaussians, ${info.palette === 'Raw splats' ? 'no palette' : info.paletteSize + ' colours'}`;
  $('bPal').querySelector('b').textContent = info.palette;
  $('bPx').querySelector('b').textContent = info.pixels;
  $('bMotion').querySelector('b').textContent = info.motion ? 'On' : 'Off';
  $('bMotion').setAttribute('aria-pressed', String(info.motion));
}

let list = [], cur = null, busy = false;   // cur is the id on screen; the playlist can change under it

// Re-read the playlist. On any failure the list we already have stays, so a bad deploy or a
// dropped connection never empties a running player.
async function refresh() {
  try {
    const r = await fetch('scenes/index.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const next = await r.json();
    if (!Array.isArray(next) || !next.length) throw new Error('playlist is empty');
    list = next;
    return true;
  } catch (err) {
    console.warn('playlist refresh failed', err);
    return false;
  }
}

async function load(id) {
  try {
    const mod = await import(`./scenes/${id}.js`);
    canvas.classList.add('out'); await sleep(cur ? 650 : 0);
    const info = engine.load(mod);          // throws if the scene's build() throws
    cur = id;
    const m = mod.meta;
    for (const k of Object.keys(m.ui || {})) document.documentElement.style.setProperty('--' + k, m.ui[k]);
    document.title = m.title; $('title').textContent = m.title; $('hint').textContent = m.hint || '';
    canvas.setAttribute('aria-label', m.alt || m.title);
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    msg.hidden = true; paint(info);
    return true;
  } catch (err) {
    console.error(`scene ${id} failed`, err);
    return false;
  } finally {
    canvas.classList.remove('out');
  }
}

// Show the scene at playlist position i. A scene that fails to load or build is skipped, so one
// broken entry cannot stall the cycle; the scene already on screen stays up meanwhile.
async function show(i) {
  if (busy || !list.length) return; busy = true;
  try {
    for (let k = 0; k < list.length; k++) {
      const id = list[(((i + k) % list.length) + list.length) % list.length];
      if (id === cur && k > 0) return;      // came back round to what is already showing
      if (await load(id)) return;
    }
    if (!cur) say('None of the scenes in scenes/index.json could be loaded.');
  } finally { busy = false; }
}
const next = () => show(list.indexOf(cur) + 1);   // if cur was removed from the playlist, restart at 0

async function main() {
  if (!engine) return say('These scenes need WebGL2, and this browser has it turned off.');
  if (!await refresh()) return say('Could not read scenes/index.json. Serve this folder over http (see README).');
  const want = list.indexOf(location.hash.slice(1));
  await show(want >= 0 ? want : 0);
  $('bScene').addEventListener('click', next);
  $('bPal').addEventListener('click', () => paint(engine.nextPalette()));
  $('bPx').addEventListener('click', () => paint(engine.nextPixelSize()));
  $('bMotion').addEventListener('click', () => paint(engine.setMotion(!engine.info().motion)));
  addEventListener('hashchange', () => { const id = location.hash.slice(1), i = list.indexOf(id); if (i >= 0 && id !== cur) show(i); });
  // Each cycle re-reads the playlist first, so scenes added or removed on the server are picked up without a reload.
  if (cycleSec > 0) setInterval(async () => { await refresh(); next(); }, cycleSec * 1000);
}
main();
