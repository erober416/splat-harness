// The kit a scene builds with: a seeded RNG, two splat clouds, baked lighting, and shape samplers.
// A scene's build(kit) only fills kit.solid and kit.glow; it never touches WebGL.
import * as M from './math.js';

// Per-splat layout, 21 floats:
// center xyz | scale xyz | quat xyzw | color rgb + solidity | anim type, phase, amp, extra | pivot xyz
export const STRIDE = 21;

export class Cloud {
  constructor() { this.a = []; this.n = 0; }
  // p center, q quaternion, sx/sy/sz gaussian sigmas (sy is the thin axis for surface discs),
  // c colour 0..1, al solidity (about 3 = crisp, 1.5 = wispy and dithered), an [type, phase, amp, extra], pv pivot
  add(p, q, sx, sy, sz, c, al, an, pv) {
    this.a.push(p[0], p[1], p[2], sx, sy, sz, q[0], q[1], q[2], q[3], c[0], c[1], c[2], al, an[0], an[1], an[2], an[3], pv[0], pv[1], pv[2]);
    this.n++;
  }
}

export function createKit(seed) {
  const { add, sub, mul, dot, cross, norm, mix, ap, quatY, UP, A0, P0, TAU } = M;
  const R = M.rng(seed), rr = (a, b) => a + (b - a) * R();
  const solid = new Cloud(), glow = new Cloud();
  let lights = { ambient: [0.3, 0.3, 0.4], dir: [], point: [] };

  // lights = { ambient:[r,g,b],
  //            dir:[{dir, color, wrap?}],             wrap 0..1 softens the terminator
  //            point:[{p, c, i, k, min?}] }           falloff i/(1+d2*k); min is the floor on n.l
  function setLights(l) { lights = l; }

  // Lighting is baked into splat colour at build time. j = colour jitter, gain = per-object boost.
  function shade(b, p, n, j, gain) {
    if (j === undefined) j = 0.07;
    let r = lights.ambient[0], g = lights.ambient[1], bl = lights.ambient[2];
    for (const d of lights.dir) {
      const x = dot(n, d.dir), w = d.wrap || 0, f = Math.max(0, x) * (1 - w) + (0.5 + 0.5 * x) * w;
      r += d.color[0] * f; g += d.color[1] * f; bl += d.color[2] * f;
    }
    for (const q of lights.point) {
      const v = sub(q.p, p), d2 = dot(v, v), dl = Math.sqrt(d2) || 1;
      const I = q.i / (1 + d2 * q.k) * Math.max(q.min === undefined ? 0.1 : q.min, dot(n, v) / dl);
      r += q.c[0] * I; g += q.c[1] * I; bl += q.c[2] * I;
    }
    const k = (1 + (R() - 0.5) * 2 * j) * (gain || 1);
    return [Math.min(1, b[0] * r * k), Math.min(1, b[1] * g * k), Math.min(1, b[2] * bl * k)];
  }

  function randUnit() { const z = rr(-1, 1), a = rr(0, TAU), s = Math.sqrt(1 - z * z); return [s * Math.cos(a), z, s * Math.sin(a)]; }

  // A colour function returns: a base colour [r,g,b] to be shaded, or {e:1, c:[r,g,b], anim?} for
  // an unshaded (emissive) colour, or null to skip the splat.
  // o = { anim, piv, alpha, thin, j, gain } applies to the whole shape.
  function put(p, n, size, bc, o) {
    if (!bc) return;
    let col, an = o.anim || A0;
    if (bc.e) { col = bc.c; if (bc.anim) an = bc.anim; } else col = shade(bc, p, n, o.j, o.gain);
    solid.add(p, quatY(n), size, size * (o.thin || 0.4), size, col, o.alpha || 3, an, o.piv || P0);
  }
  // colorFn(d, n, p): d = unit direction in the ellipsoid's own frame, n = world normal, p = world point.
  // o.warp(d) scales the radius per direction for lumpy shapes.
  function ellipsoid(c, rad, B, count, size, colorFn, o) {
    o = o || {};
    for (let i = 0; i < count; i++) {
      const d = randUnit(), s = o.warp ? o.warp(d) : 1;
      const p = add(c, ap(B, [d[0] * rad[0] * s, d[1] * rad[1] * s, d[2] * rad[2] * s]));
      const n = norm(ap(B, [d[0] / rad[0], d[1] / rad[1], d[2] / rad[2]]));
      put(p, n, size, colorFn(d, n, p), o);
    }
  }
  // Open tube or cone from a to b. colorFn(t, angle, p), t = 0 at a, 1 at b.
  function cyl(a, b, r0, r1, count, size, colorFn, o) {
    o = o || {};
    const ax = norm(sub(b, a)); let s = cross(ax, [0, 0, 1]); if (dot(s, s) < 1e-4) s = cross(ax, [1, 0, 0]); s = norm(s); const t2 = cross(ax, s);
    for (let i = 0; i < count; i++) {
      const t = R(), an = rr(0, TAU), r = r0 + (r1 - r0) * t;
      const rd = add(mul(s, Math.cos(an)), mul(t2, Math.sin(an)));
      const p = add(mix(a, b, t), mul(rd, r));
      put(p, rd, size, colorFn(t, an, p), o);
    }
  }
  // Axis-aligned box, c = centre, h = half extents. colorFn(axis, sign, q, p), q = face coords in -1..1.
  function box(c, h, count, size, colorFn, o) {
    o = o || {};
    const ar = [h[1] * h[2], h[0] * h[2], h[0] * h[1]], tot = ar[0] + ar[1] + ar[2];
    for (let i = 0; i < count; i++) {
      const u = R() * tot, ax = u < ar[0] ? 0 : (u < ar[0] + ar[1] ? 1 : 2), sg = R() < 0.5 ? -1 : 1;
      const q = [rr(-1, 1), rr(-1, 1), rr(-1, 1)]; q[ax] = sg;
      const p = [c[0] + q[0] * h[0], c[1] + q[1] * h[1], c[2] + q[2] * h[2]];
      const n = [0, 0, 0]; n[ax] = sg;
      put(p, n, size, colorFn(ax, sg, q, p), o);
    }
  }
  // Four-sided pyramid roof from half-width h0 at height y0 up to h1 at y1. colorFn(t, s, p).
  function roof(c, y0, h0, y1, h1, count, size, colorFn, o) {
    o = o || {};
    const O = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]], T = [[0, 0, 1], [0, 0, 1], [1, 0, 0], [1, 0, 0]];
    for (let i = 0; i < count; i++) {
      const k = (R() * 4) | 0, t = 1 - Math.sqrt(R()), half = h0 + (h1 - h0) * t, y = y0 + (y1 - y0) * Math.pow(t, 0.75), s = rr(-1, 1);
      const p = [c[0] + O[k][0] * half + T[k][0] * s * half, y, c[2] + O[k][2] * half + T[k][2] * s * half];
      const n = norm(add(mul(O[k], y1 - y0), mul(UP, h0 - h1)));
      put(p, n, size, colorFn(t, s, p), o);
    }
  }
  return { ...M, R, rr, randUnit, solid, glow, setLights, shade, put, ellipsoid, cyl, box, roof };
}
