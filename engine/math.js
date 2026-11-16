// Small vector kit shared by the renderer and every scene. Vectors are plain [x,y,z] arrays.
// A basis is three column vectors [bx,by,bz]; ap(B,v) takes local -> world, tr(B,v) world -> local.
export const TAU = Math.PI * 2;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const UP = [0, 1, 0], A0 = [0, 0, 0, 0], P0 = [0, 0, 0], QUP = [0, 0, 0, 1];
export const I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const rotX = a => [[1, 0, 0], [0, Math.cos(a), Math.sin(a)], [0, -Math.sin(a), Math.cos(a)]];
export const rotY = a => [[Math.cos(a), 0, -Math.sin(a)], [0, 1, 0], [Math.sin(a), 0, Math.cos(a)]];
export const rotZ = a => [[Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
export const ap = (B, v) => [
  B[0][0] * v[0] + B[1][0] * v[1] + B[2][0] * v[2],
  B[0][1] * v[0] + B[1][1] * v[1] + B[2][1] * v[2],
  B[0][2] * v[0] + B[1][2] * v[1] + B[2][2] * v[2]];
export const tr = (B, v) => [dot(B[0], v), dot(B[1], v), dot(B[2], v)];

// Quaternion [x,y,z,w] that turns a splat's thin (local Y) axis onto n.
export function quatY(n) {
  const w = 1 + n[1];
  if (w < 1e-5) return [1, 0, 0, 0];
  const x = n[2], z = -n[0], l = Math.hypot(x, z, w);
  return [x / l, 0, z / l, w / l];
}
// Quaternion from a right-handed orthonormal basis (bx cross by = bz).
export function quatB(B) {
  const m00 = B[0][0], m10 = B[0][1], m20 = B[0][2], m01 = B[1][0], m11 = B[1][1], m21 = B[1][2], m02 = B[2][0], m12 = B[2][1], m22 = B[2][2];
  const t = m00 + m11 + m22; let x, y, z, w, s;
  if (t > 0) { s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s; }
  else if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s; }
  else { s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4; }
  return [x, y, z, w];
}
// Seeded PRNG (mulberry32) so a scene builds the same way every time.
export function rng(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
