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

let list = [], at = -1, busy = false;
async function show(i) {
  if (busy) return; busy = true;
  const id = list[((i % list.length) + list.length) % list.length];
  try {
    const mod = await import(`./scenes/${id}.js`);
    canvas.classList.add('out'); await sleep(at < 0 ? 0 : 650);
    const info = engine.load(mod);          // throws if the scene's build() throws
    at = list.indexOf(id);
    const m = mod.meta;
    for (const k of Object.keys(m.ui || {})) document.documentElement.style.setProperty('--' + k, m.ui[k]);
    document.title = m.title; $('title').textContent = m.title; $('hint').textContent = m.hint || '';
    canvas.setAttribute('aria-label', m.alt || m.title);
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    msg.hidden = true; paint(info);
  } catch (err) {
    console.error(`scene ${id} failed`, err);
    if (at < 0) say(`Scene "${id}" failed to load: ${err.message}`);
  } finally {
    canvas.classList.remove('out'); busy = false;
  }
}

async function main() {
  if (!engine) return say('These scenes need WebGL2, and this browser has it turned off.');
  try { list = await (await fetch('scenes/index.json')).json(); }
  catch (err) { return say('Could not read scenes/index.json. Serve this folder over http (see README).'); }
  const want = list.indexOf(location.hash.slice(1));
  await show(want >= 0 ? want : 0);
  $('bScene').addEventListener('click', () => show(at + 1));
  $('bPal').addEventListener('click', () => paint(engine.nextPalette()));
  $('bPx').addEventListener('click', () => paint(engine.nextPixelSize()));
  $('bMotion').addEventListener('click', () => paint(engine.setMotion(!engine.info().motion)));
  addEventListener('hashchange', () => { const i = list.indexOf(location.hash.slice(1)); if (i >= 0 && i !== at) show(i); });
  if (cycleSec > 0) setInterval(() => show(at + 1), cycleSec * 1000);
}
main();
