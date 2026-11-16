// Desert Campfire: a fox lying by a campfire on a floating slab of desert, under a saguaro and a
// sky of stars. The fire is the only warm light, so everything facing it goes orange and
// everything else falls back to moonlit mauve. Scene units are roughly metres; the slab is about 4 wide.
export const meta = {
  id: 'desert-campfire',
  title: 'Desert Campfire',
  seed: 5150,
  hint: 'Drag to orbit. Tap to make the fox hop.',
  alt: 'A pixel-art fox lying beside a campfire on a floating slab of desert at night, with a tall saguaro cactus, boulders, dry grass and a starry sky.',
  ui: { title: '#ffd15a', hint: '#ff9a3c', text: '#b4b6d6', ink: '#120c24', edge: '#4a2f5e', void: '#07050f' },
  palette: { name: 'Afterglow', colors: [
    '#07050f','#120c24','#1f1640','#33215c','#5c2350',            // sky and deep shadow
    '#4a2f5e','#6b3f6b','#8f5670','#b97a7c','#e0a58a','#f6cfa0',  // sand, from moonlit mauve to firelit peach
    '#5a1d14','#8f2f16','#c44a1a','#ec6f1f','#ff9a3c',            // fox and embers
    '#ffd15a','#fff3b8','#fff3d6',                                // flame and cream fur
    '#12332e','#1f5a45','#2c6e62','#3a8a55','#7fc267',            // cactus
    '#2b2a4a','#4d4c73','#7c7da3','#b4b6d6',                      // rock and smoke
    '#1a0f14','#ff6f9c','#e8ebff'] },                             // socks and nose, flowers, stars
  bg: { bottom: [0.34, 0.14, 0.27], top: [0.03, 0.025, 0.10], curve: 0.7 },
  ramp: [0.06, 1.35, 0.75],
  camera: { mode: 'orbit', az: 0.35, el: 0.30, target: [0, 0.30, 0], fit: [2.35, 1.8], elRange: [0.06, 1.1], speed: 0.13 },
  tap: { hop: 0.28, time: 0.45 }
};

export function build(kit) {
  const { TAU, add, sub, mul, dot, cross, norm, mix, clamp01, hash, UP, A0, P0, QUP, I3, rotX, rotY, rotZ, ap, tr, quatY, quatB,
    R, rr, randUnit, solid, glow, setLights, shade, put, ellipsoid, cyl, box, roof } = kit;

  // Layout. The fox faces the fire; the saguaro stands behind them both.
  const RG = 2.05;                       // slab radius
  const FIRE = [0.92, 0, 0.78], FOX = [-0.85, 0, 0.10], CACT = [0.55, 0, -1.35];

  // Lights: cool moonlight from behind, a faint fill, and the fire.
  setLights({
    ambient: [0.26, 0.22, 0.42],
    dir: [{ dir: norm([-0.5, 0.55, -0.67]), color: [0.40, 0.44, 0.70] }, { dir: norm([0.4, 0.5, 0.75]), color: [0.14, 0.11, 0.18] }],
    point: [{ p: [FIRE[0], 0.36, FIRE[2]], c: [1.0, 0.55, 0.20], i: 2.4, k: 0.8, min: 0.12 }]
  });

  const SAND = [0.66, 0.52, 0.50], ROCK = [0.56, 0.52, 0.64];

  function rock(c, rad, cnt, ph, o) {
    ellipsoid(c, rad, rotY(ph), cnt, 0.036, d => d[1] > 0.45 ? mul(ROCK, 1.12) : (Math.sin(d[1] * 9 + ph) > 0.6 ? mul(ROCK, 0.8) : ROCK),
      Object.assign({ warp: d => 1 + 0.16 * Math.sin(d[0] * 5 + ph) * Math.sin(d[1] * 4 + ph * 2) + 0.08 * Math.sin(d[2] * 9 + ph) }, o || {}));
  }

  function buildGround() {
    const gh = (x, z) => 0.035 * Math.sin(x * 1.9 + 0.6) * Math.cos(z * 1.6);
    // top: rippled sand, scorched near the fire
    for (let i = 0; i < 8200; i++) {
      const rho = RG * Math.sqrt(R()), a = rr(0, TAU), x = rho * Math.cos(a), z = rho * Math.sin(a);
      const rip = Math.sin((x * 0.6 + z) * 13 + 2 * Math.sin(x * 2.3));
      const n = norm([-(gh(x + 0.02, z) - gh(x - 0.02, z)) / 0.04 + 0.16 * rip, 1, -(gh(x, z + 0.02) - gh(x, z - 0.02)) / 0.04]);
      const df = Math.hypot(x - FIRE[0], z - FIRE[2]);
      let b = rip > 0.55 ? mul(SAND, 0.86) : SAND;
      if (df < 0.30) b = [0.20, 0.15, 0.20]; else if (df < 0.46) b = mix([0.20, 0.15, 0.20], b, (df - 0.30) / 0.16);
      if (rho > RG * 0.95) b = mul(b, 1.1);
      const p = [x, gh(x, z), z];
      solid.add(p, quatY(n), 0.052, 0.02, 0.052, shade(b, p, n, 0.06), 3, A0, P0);
    }
    // underside: banded rock tapering to a point
    const BAND = [[0.66, 0.38, 0.34], [0.52, 0.34, 0.46], [0.74, 0.52, 0.42], [0.44, 0.28, 0.40]];
    for (let i = 0; i < 5600; i++) {
      const t = R(), a = rr(0, TAU), lump = 1 + 0.10 * Math.sin(a * 5 + t * 6) + 0.06 * Math.sin(a * 11 - t * 9);
      const rad = RG * 0.99 * Math.pow(1 - t, 0.55) * lump, y = -0.03 - 1.2 * Math.pow(t, 1.15);
      const p = [rad * Math.cos(a), y, rad * Math.sin(a)], n = norm([Math.cos(a), -0.35 - t, Math.sin(a)]);
      const b = t < 0.05 ? SAND : BAND[(hash(Math.floor((y + 0.05 * Math.sin(a * 3)) * 11), 3) * 4) | 0];
      solid.add(p, quatY(n), 0.055, 0.022, 0.055, shade(b, p, n, 0.08, 1.3), 3, A0, P0);
    }
    // a few chunks drifting alongside
    for (const [a, y, r, ph] of [[0.9, -0.75, 0.16, 1], [3.3, -0.55, 0.12, 2.4], [4.9, -0.95, 0.19, 4]]) {
      const c = [2.25 * Math.cos(a), y, 2.25 * Math.sin(a)];
      ellipsoid(c, [r, r * 0.8, r * 0.9], rotY(ph), 190, 0.034, d => d[1] > 0.5 ? SAND : [0.52, 0.34, 0.46], { anim: [10, ph, 0.05, 0.6], piv: c, gain: 1.3 });
    }
    // boulders and pebbles
    rock([1.45, 0.17, -0.75], [0.36, 0.28, 0.31], 950, 0.7);
    rock([1.25, 0.10, -1.30], [0.21, 0.16, 0.20], 420, 2.1);
    rock([-1.78, 0.10, 0.55], [0.23, 0.16, 0.20], 460, 3.4);
    rock([-0.55, 0.07, -1.70], [0.16, 0.11, 0.15], 260, 5.0);
    for (let i = 0; i < 70; i++) {
      const rho = rr(0.5, 1.95), a = rr(0, TAU), p = [rho * Math.cos(a), 0.02, rho * Math.sin(a)], s = rr(0.018, 0.034);
      if (Math.hypot(p[0] - FIRE[0], p[2] - FIRE[2]) < 0.5) continue;
      solid.add(p, QUP, s, s * 0.7, s, shade(ROCK, p, UP, 0.15), 3, A0, P0);
    }
    // dry grass
    let made = 0;
    while (made < 22) {
      const rho = rr(0.6, 1.95), a = rr(0, TAU), base = [rho * Math.cos(a), 0, rho * Math.sin(a)];
      if (Math.hypot(base[0] - FIRE[0], base[2] - FIRE[2]) < 0.62 || Math.hypot(base[0] - FOX[0] - 0.2, base[2] - FOX[2]) < 1.15 || Math.hypot(base[0] - CACT[0], base[2] - CACT[2]) < 0.4) continue;
      made++;
      const ph = rr(0, TAU);
      for (let k = 0; k < 6; k++) {
        const dir = norm([rr(-0.5, 0.5), 1, rr(-0.5, 0.5)]), len = rr(0.09, 0.19), p = add(base, mul(dir, len * 0.5));
        solid.add(p, quatY(dir), 0.011, len * 0.45, 0.011, shade([0.84, 0.72, 0.36], p, UP, 0.12, 1.3), 3, [1, ph, 0.8, 0], base);
      }
    }
  }

  function buildCactus() {
    const GD = [0.20, 0.46, 0.30], GM = [0.30, 0.64, 0.38], GL = [0.46, 0.80, 0.44];
    const rib = an => { const s = Math.sin(an * 7); return s > 0.62 ? GD : (s < -0.8 ? GL : GM); };
    const o = { gain: 1.15, j: 0.05 };
    const column = (a, b, r, cnt) => {
      cyl(a, b, r, r * 0.94, cnt, 0.034, (t, an) => rib(an), o);
      ellipsoid(b, [r * 0.94, r * 0.85, r * 0.94], I3, Math.round(cnt * 0.22), 0.032, d => d[1] < -0.1 ? null : rib(Math.atan2(d[2], d[0])), o);
    };
    const flower = c => {
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, p = add(c, [0.05 * Math.cos(a), 0.01, 0.05 * Math.sin(a)]); solid.add(p, QUP, 0.03, 0.022, 0.03, [1.0, 0.44, 0.62], 4, A0, P0); }
      solid.add(add(c, [0, 0.03, 0]), QUP, 0.026, 0.026, 0.026, [1.0, 0.82, 0.35], 4, A0, P0);
    };
    const H = 1.72, r = 0.20, top = add(CACT, [0, H, 0]);
    column(CACT, top, r, 2300);
    flower(add(top, [0.02, r * 0.85, 0.04]));
    for (const [a, y0, out, up, ra] of [[2.6, 0.62, 0.40, 0.62, 0.125], [5.6, 0.92, 0.36, 0.50, 0.115]]) {
      const dir = [Math.cos(a), 0, Math.sin(a)], s = add(CACT, [dir[0] * r * 0.7, y0, dir[2] * r * 0.7]), e = add(CACT, [dir[0] * (r + out), y0, dir[2] * (r + out)]);
      cyl(s, e, ra, ra, 380, 0.03, (t, an) => rib(an), o);
      ellipsoid(e, [ra * 1.05, ra * 1.05, ra * 1.05], I3, 220, 0.03, d => d[1] > 0.3 ? null : rib(Math.atan2(d[2], d[0])), o);
      column(e, add(e, [0, up, 0]), ra, 620);
      if (a < 3) flower(add(e, [0, up + ra * 0.85, 0]));
    }
    // a barrel cactus out front
    const BC = [-1.15, 0.15, 1.25];
    ellipsoid(BC, [0.17, 0.18, 0.17], I3, 520, 0.03, d => rib(Math.atan2(d[2], d[0]) * 1.2), o);
    flower(add(BC, [0, 0.18, 0]));
  }

  function buildFire() {
    const fx = FIRE[0], fz = FIRE[2];
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rr(-0.1, 0.1), r = rr(0.085, 0.115); rock([fx + 0.37 * Math.cos(a), 0.05, fz + 0.37 * Math.sin(a)], [r, r * 0.8, r], 150, i * 1.3); }
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + 0.4, a0 = [fx + 0.25 * Math.cos(a), 0.04, fz + 0.25 * Math.sin(a)], b0 = [fx - 0.06 * Math.cos(a), 0.33, fz - 0.06 * Math.sin(a)];
      cyl(a0, b0, 0.05, 0.04, 230, 0.022, t => (t > 0.35 && hash(Math.floor(t * 9), i) < 0.3) ? { e: 1, c: [1.0, 0.42, 0.10], anim: [6, rr(0, TAU), 0, 0] } : [0.30, 0.17, 0.12]);
    }
    // Flames: five tongues that bob out of step. Kept narrow so the fire does not swallow the scene.
    const FH = 0.74;
    for (let i = 0; i < 640; i++) {
      const hh = Math.pow(R(), 1.6), w = 0.19 * (1 - hh) + 0.015, u = Math.sqrt(R()), a = rr(0, TAU), k = (a / TAU * 5) | 0;
      const p = [fx + w * u * Math.cos(a), 0.12 + hh * FH, fz + w * u * Math.sin(a)];
      const band = hh + (u > 0.8 ? 0.16 : 0);
      const c = band < 0.24 ? [1.0, 0.96, 0.72] : band < 0.50 ? [1.0, 0.82, 0.35] : band < 0.80 ? [1.0, 0.58, 0.16] : [0.93, 0.30, 0.10];
      const s = 0.036 - 0.013 * hh;
      solid.add(p, QUP, s, s * 1.6, s, c, hh < 0.5 ? 3 : 2.2, [10, k * 1.7 + rr(-0.3, 0.3), 0.02 + 0.08 * hh, 5 + k * 0.9], P0);
    }
    glow.add([fx, 0.40, fz], QUP, 0.34, 0.34, 0.34, [0.24, 0.11, 0.03], 1, [6, 0.3, 0, 0], P0);
    glow.add([fx, 0.06, fz], QUP, 1.0, 0.10, 1.0, [0.15, 0.065, 0.02], 1, [6, 1.1, 0, 0], P0);
    for (let i = 0; i < 16; i++) { const pv = [fx + rr(-0.08, 0.08), 0.55, fz + rr(-0.08, 0.08)]; solid.add(pv, QUP, 0.012, 0.012, 0.012, [1.0, 0.70, 0.25], 3, [14, R(), rr(0.22, 0.45), 0], pv); }
    for (let i = 0; i < 12; i++) solid.add([fx, 0.85, fz], QUP, 0.05, 0.05, 0.05, [0.42, 0.36, 0.54], 1.5, [14, R(), rr(0.09, 0.14), 0], [fx, 0.85, fz]);
  }

  function buildFox() {
    const S = 1.35;
    const OR = [1.0, 0.48, 0.14], DK = [0.26, 0.13, 0.13], CR = [1.0, 0.84, 0.56], BACK = [0.86, 0.36, 0.11], TIP = [1.0, 0.80, 0.52];
    const BB = rotY(1.2), bpt = v => add(FOX, ap(BB, mul(v, S))), bl = p => mul(tr(BB, sub(p, FOX)), 1 / S), rs = v => mul(v, S);
    const HB = rotY(0.72), HO = bpt([0, 0.80, 0.50]), hpt = v => add(HO, ap(HB, mul(v, S))), hl = p => mul(tr(HB, sub(p, HO)), 1 / S);
    const ca = [3, 0, 0.01, 2.0], o = { anim: ca, piv: FOX, gain: 1.15 };
    // body, lying sphinx-style, and the cream chest
    ellipsoid(bpt([0, 0.27, -0.05]), rs([0.25, 0.24, 0.52]), BB, 2800, 0.036, d => d[1] < -0.55 ? CR : (d[1] > 0.55 ? BACK : OR), o);
    ellipsoid(bpt([0, 0.40, 0.36]), rs([0.21, 0.28, 0.20]), BB, 1200, 0.032, d => (d[2] > 0.15 && d[1] < 0.55) ? CR : OR, o);
    ellipsoid(bpt([0, 0.60, 0.42]), rs([0.15, 0.20, 0.15]), BB, 520, 0.03, d => (d[2] > 0.35 && d[1] < 0.2) ? CR : OR, o);
    for (const s of [-1, 1]) {
      ellipsoid(bpt([s * 0.20, 0.20, -0.36]), rs([0.14, 0.20, 0.25]), BB, 520, 0.032, () => OR, o);
      ellipsoid(bpt([s * 0.27, 0.05, -0.16]), rs([0.07, 0.05, 0.15]), BB, 190, 0.026, () => DK, o);
      // front legs stretched toward the fire, in dark socks
      ellipsoid(bpt([s * 0.12, 0.075, 0.62]), rs([0.068, 0.068, 0.25]), BB, 420, 0.026, d => d[2] > -0.35 ? DK : OR, o);
    }
    // tail: a big brush held up behind, with a cream tip
    const tb = bpt([0, 0.22, -0.52]);
    for (let i = 0; i < 24; i++) {
      const t = i / 23, r = S * (0.07 + 0.11 * Math.sin(Math.PI * Math.pow(t, 0.75)));
      const c = bpt([0.16 * Math.sin(t * 2.8), 0.22 + 1.0 * t - 0.22 * t * t, -0.52 - 0.42 * Math.sin(t * 2.4)]);
      ellipsoid(c, [r, r, r], I3, 120, 0.03, d => t > 0.74 ? TIP : (d[1] > 0.5 ? BACK : OR), { anim: [12, 1.3, 0.10, 0], piv: tb, gain: t > 0.74 ? 1.35 : 1.15 });
    }
    // head, turned partly toward the viewer
    ellipsoid(HO, rs([0.24, 0.21, 0.23]), HB, 1800, 0.028, d => {
      if (d[2] > -0.1 && d[1] < -0.15 && Math.abs(d[0]) > 0.25) return CR;      // cheeks
      if (d[1] < -0.55) return CR;
      return OR;
    }, o);
    ellipsoid(hpt([0, -0.07, 0.25]), rs([0.10, 0.085, 0.18]), HB, 420, 0.022, d => d[1] < 0.1 ? CR : OR, o);
    ellipsoid(hpt([0, -0.045, 0.425]), rs([0.036, 0.03, 0.03]), HB, 60, 0.015, () => ({ e: 1, c: [0.10, 0.06, 0.08] }), o);
    for (const s of [-1, 1]) {
      const e = norm([s * 0.12, 0.05, 1]), gl2 = norm([s * 0.12 - 0.3, 0.45, 1]), bk = [9, 0, 0.01, 2.0];
      ellipsoid(hpt([s * 0.108, 0.045, 0.162]), rs([0.066, 0.066, 0.066]), HB, 300, 0.016, d => {
        const t = dot(d, e);
        if (t < 0.1) return null;
        if (t < 0.3) return { e: 1, c: [0.10, 0.06, 0.08], anim: bk };
        if (dot(d, gl2) > 0.985) return { e: 1, c: [1, 1, 1], anim: bk };
        if (t > 0.9) return { e: 1, c: [0.05, 0.03, 0.05], anim: bk };
        return { e: 1, c: [1.0, 0.82, 0.35], anim: bk };
      }, { piv: FOX });
      // tall ears with dark tips
      const ea = hpt([s * 0.15, 0.12, -0.02]), eb = hpt([s * 0.25, 0.52, -0.05]);
      cyl(ea, eb, 0.14, 0.004, 330, 0.022, (t, an, p) => { const l = hl(p); return t > 0.72 ? DK : ((l[2] > 0.03 - 0.03 * t && t < 0.65) ? CR : OR); }, o);
    }
  }

  function buildSky() {
    for (let i = 0; i < 2400; i++) {
      const y = rr(-0.5, 0.78), a = rr(0, TAU), c = Math.sqrt(1 - y * y), s = 0.02 + 0.07 * Math.pow(R(), 3), g = rr(0.45, 1);
      const tint = R() < 0.2 ? [1, 0.85, 0.65] : (R() < 0.4 ? [0.7, 0.85, 1] : [0.9, 0.92, 1]);
      glow.add([34 * c * Math.cos(a), 34 * y, 34 * c * Math.sin(a)], QUP, s, s, s, mul(tint, g), 1.2, [8, rr(0, TAU), 0, rr(0.4, 2.2)], P0);
    }
  }

  buildGround();
  buildCactus();
  buildFire();
  buildFox();
  buildSky();
}
