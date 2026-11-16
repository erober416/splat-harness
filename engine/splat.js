// Pixel-art gaussian splat renderer.
//
// Three passes per frame, all at a tiny internal resolution that CSS scales up with hard pixels:
//   1. solid splats: each 3D gaussian is projected to a screen-space ellipse; its alpha is dithered
//      against a 4x4 Bayer matrix and written with depth, so nothing needs sorting
//   2. glow splats: added on top (lamps, halos, stars), depth-tested but not depth-written
//   3. post: every pixel is snapped to the scene's palette with ordered dithering
//
// A scene is a module exporting `meta` and `build(kit)`; see CLAUDE.md for the contract.
import { createKit, STRIDE } from './kit.js';
import { norm, sub, cross, dot, UP } from './math.js';

const BAYER = `
const float BAYER[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
float bayer(vec2 fc){ivec2 i=ivec2(fc)&3;return (BAYER[i.y*4+i.x]+0.5)/16.;}`;

// Animation lives in the vertex shader, picked per splat by aAnim.x (the "anim type").
// aAnim = (type, phase, amp, extra). Add new types here, keep them generic, and list them in CLAUDE.md.
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQuad;
layout(location=1) in vec3 aCenter;
layout(location=2) in vec3 aScale;
layout(location=3) in vec4 aQuat;
layout(location=4) in vec4 aColor;
layout(location=5) in vec4 aAnim;
layout(location=6) in vec3 aPivot;
uniform mat4 uView,uProj;
uniform vec2 uViewport;
uniform float uTime,uHop,uTapAge,uLandAge,uBias;
out vec2 vUV;
out vec4 vColor;
mat3 quatToMat(vec4 q){
  float x=q.x,y=q.y,z=q.z,w=q.w;
  return mat3(1.-2.*(y*y+z*z),2.*(x*y+z*w),2.*(x*z-y*w),
              2.*(x*y-z*w),1.-2.*(x*x+z*z),2.*(y*z+x*w),
              2.*(x*z+y*w),2.*(y*z-x*w),1.-2.*(x*x+y*y));
}
void main(){
  vec3 p=aCenter,sc=aScale;vec4 col=aColor;
  int ty=int(aAnim.x+.5);float ph=aAnim.y,amp=aAnim.z,ex=aAnim.w;
  bool hide=false;
  if(ty==1){ // sway: bends away from the pivot, more with height (reeds, grass, roots)
    float h=abs(p.y-aPivot.y);
    p.x+=amp*(sin(uTime*1.2+ph)+.4*sin(uTime*2.7+ph*1.7))*h*h;
    p.z+=amp*.5*cos(uTime*.9+ph)*h*h;
  }else if(ty==2){ // wander and blink (fireflies); amp = range, extra = blink rate
    p+=vec3(sin(uTime*.31+ph)+.35*sin(uTime*.83+ph*2.1),.6*sin(uTime*.47+ph*1.3),cos(uTime*.37+ph*.7)+.35*cos(uTime*.71+ph*1.9))*amp;
    col.a*=smoothstep(-.3,.8,sin(uTime*ex+ph*3.));
  }else if(ty==3||ty==9){ // character: breathe about the pivot and hop on tap; 9 also blinks (eyes)
    float s=1.+amp*(.5+.5*sin(uTime*ex+ph));
    p=aPivot+(p-aPivot)*s;sc*=s;p.y+=uHop;
    if(ty==9&&fract(uTime*.23+.1)<.035)hide=true;
  }else if(ty==4){ // water: rings rolling out from the origin; extra = distance from the centre
    float w=pow(max(sin(ex*11.-uTime*1.6),0.),10.)*smoothstep(.78,.92,ex)*(1.-.6*smoothstep(.9,1.8,ex));
    float ring=exp(-pow((ex-(.82+uLandAge*1.1))/.07,2.))*exp(-uLandAge*1.2);
    col.rgb+=vec3(.22,.36,.40)*w*amp+vec3(.5,.7,.75)*ring;
    col.rgb*=1.+.12*sin(uTime*1.3+ph);
  }else if(ty==5){ // lap around the pivot's Y axis (koi); amp = rad/s, extra = position along the body
    float a=uTime*amp,c=cos(a),s=sin(a);
    vec2 d=p.xz-aPivot.xz;d=vec2(c*d.x-s*d.y,s*d.x+c*d.y);
    d+=normalize(d)*.03*sin(uTime*5.+ex*3.5+ph)*(.6-.4*ex);
    p.xz=aPivot.xz+d;
  }else if(ty==6){ // lamp flicker
    col.rgb*=.85+.15*sin(uTime*6.+ph)*sin(uTime*2.7+ph*2.);
  }else if(ty==7){ // fall from the pivot height and fade (waterfall); amp = speed, extra = drop
    float fr=fract(uTime*amp*.5+ph);
    vec2 o=normalize(p.xz);
    p.y=aPivot.y-ex*fr*fr;p.xz+=o*(.02+.22*fr);
    sc.y*=1.+fr*1.5;col.a*=1.-fr*.75;
  }else if(ty==8){ // twinkle; extra = rate
    col.rgb*=.58+.42*sin(uTime*ex+ph);
  }else if(ty==10){ // bob; amp = height, extra = rate
    p.y+=amp*sin(uTime*ex+ph);
  }else if(ty==11){ // pop up on tap, float, fade (hearts); hidden otherwise
    float a=uTapAge;
    if(a>1.7)hide=true;
    float s=smoothstep(0.,.25,a);
    p=aPivot+(p-aPivot)*s;sc*=s;
    p.y+=a*.45;p.x+=.06*sin(a*5.);
    col.a*=1.-smoothstep(1.1,1.7,a);
  }else if(ty==12){ // tail: sways sideways (z) from the pivot and hops with its owner
    float h=abs(p.y-aPivot.y);
    p.z+=amp*(sin(uTime*1.5+ph)+.35*sin(uTime*3.3+ph*1.7))*h*h;
    p.x+=amp*.3*cos(uTime*1.1+ph)*h*h;
    p.y+=uHop;
  }else if(ty==13){ // drift along x and wrap at +-7 (clouds); pivot.x = the group's centre, extra = speed
    p.x+=mod(aPivot.x+uTime*ex+7.,14.)-7.-aPivot.x;
  }else if(ty==14){ // smoke: rise from the pivot, spread, fade; amp = speed
    float fr=fract(uTime*amp+ph);
    p=aPivot+vec3(.35*fr*fr+.07*sin(ph*40.+fr*6.),1.25*fr,.06*sin(ph*23.+fr*4.));
    sc*=.5+2.2*fr;col.a*=(1.-fr)*smoothstep(0.,.08,fr);
  }
  vec4 cam=uView*vec4(p,1.);
  float tz=-cam.z;
  if(hide||tz<.2){gl_Position=vec4(2.,2.,2.,1.);vUV=vec2(0.);vColor=vec4(0.);return;}
  // project the 3D covariance to the screen (the standard 3DGS EWA step)
  mat3 Rm=quatToMat(aQuat);
  mat3 M=Rm*mat3(sc.x,0.,0.,0.,sc.y,0.,0.,0.,sc.z);
  mat3 Sigma=M*transpose(M);
  vec2 f=vec2(uProj[0][0],uProj[1][1])*uViewport*.5;
  mat3 J=mat3(f.x/tz,0.,0., 0.,f.y/tz,0., f.x*cam.x/(tz*tz),f.y*cam.y/(tz*tz),0.);
  mat3 T=J*mat3(uView);
  mat3 cov=T*Sigma*transpose(T);
  float a=cov[0][0]+.15,b=cov[0][1],d=cov[1][1]+.15;
  float mid=.5*(a+d),rad=length(vec2(.5*(a-d),b));
  float l1=mid+rad,l2=max(mid-rad,.05);
  vec2 v1=abs(b)<1e-5?(a>=d?vec2(1.,0.):vec2(0.,1.)):normalize(vec2(b,l1-a));
  vec2 v2=vec2(-v1.y,v1.x);
  vec2 off=(v1*sqrt(l1)*aQuad.x+v2*sqrt(l2)*aQuad.y)*2.;
  vec4 clip=uProj*cam;
  gl_Position=vec4(clip.xy+off*2./uViewport*clip.w,clip.z-uBias*clip.w,clip.w);
  vUV=aQuad;vColor=col;
}`;
const FS = `#version 300 es
precision highp float;
in vec2 vUV;in vec4 vColor;
uniform int uAdd;
out vec4 o;
${BAYER}
void main(){
  float r2=dot(vUV,vUV);
  if(r2>1.)discard;
  float g=exp(-2.*r2)*vColor.a;
  if(uAdd==1){o=vec4(vColor.rgb*min(g,1.)*(1.-r2),0.);}
  else{if(g<bayer(gl_FragCoord.xy))discard;o=vec4(vColor.rgb,1.);}
}`;
const PVS = `#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;
// uMode: 0 = nearest palette colour, 1 = luminance ramp through the palette, 2 = no palette
const PFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec3 uPal[32];
uniform int uPalN,uMode;
uniform vec2 uRes;
uniform vec3 uBgTop,uBgBot,uRamp;
uniform float uBgCurve;
out vec4 o;
${BAYER}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec4 t=texelFetch(uTex,ivec2(fc),0);
  vec3 bg=mix(uBgBot,uBgTop,pow(fc.y/uRes.y,uBgCurve));
  vec3 c=t.rgb+bg*(1.-t.a);
  float d=bayer(fc)-.5;
  if(uMode==2){o=vec4(c,1.);return;}
  if(uMode==1){
    float l=pow(clamp((dot(c,vec3(.299,.587,.114))-uRamp.x)*uRamp.y,0.,1.),uRamp.z);
    int i=clamp(int(l*float(uPalN-1)+d+.5),0,uPalN-1);
    o=vec4(uPal[i],1.);return;
  }
  c+=d*.11;
  float best=1e9;vec3 pick=uPal[0];
  for(int i=0;i<32;i++){
    if(i>=uPalN)break;
    vec3 e=c-uPal[i];float dist=dot(e*e,vec3(2.,4.,3.));
    if(dist<best){best=dist;pick=uPal[i];}
  }
  o=vec4(pick,1.);
}`;

// Palettes every scene gets after its own. Ramp palettes run dark to light.
export const SHARED_PALETTES = [
  { name: 'Ember', mode: 1, colors: ['#0d0705', '#2a1208', '#55240c', '#8a3d0f', '#c26414', '#eb9a1f', '#ffcf4a', '#fff3b0'] },
  { name: 'Lilac', mode: 1, colors: ['#0c0a1f', '#241a4a', '#4a2f7a', '#8257a8', '#c08fd0', '#f4dcf2'] },
  { name: 'Pea soup', mode: 1, colors: ['#0f2a1a', '#2f5d34', '#8aac3f', '#d8e58c'] },
  { name: 'One bit', mode: 1, colors: ['#10122b', '#e6e9ff'] },
  { name: 'Raw splats', mode: 2, colors: ['#000000'] }
];
const PIXEL_TARGETS = [130, 190, 270];   // art pixels along the short side of the stage
const PIXEL_NAMES = ['Chunky', 'Classic', 'Fine'];
const FOV = 35 * Math.PI / 180;

const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
function lookAt(e, c, u) { const f = norm(sub(c, e)), s = norm(cross(f, u)), t = cross(s, f); return new Float32Array([s[0], t[0], -f[0], 0, s[1], t[1], -f[1], 0, s[2], t[2], -f[2], 0, -dot(s, e), -dot(t, e), dot(f, e), 1]); }
function persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); }

// Returns null when WebGL2 is unavailable.
export function createEngine(canvas, stage) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function prog(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  const P = prog(VS, FS), PP = prog(PVS, PFS), U = {}, UPP = {};
  for (const n of ['uView', 'uProj', 'uViewport', 'uTime', 'uHop', 'uTapAge', 'uLandAge', 'uBias', 'uAdd']) U[n] = gl.getUniformLocation(P, n);
  for (const n of ['uTex', 'uPal', 'uPalN', 'uMode', 'uRes', 'uBgTop', 'uBgBot', 'uBgCurve', 'uRamp']) UPP[n] = gl.getUniformLocation(PP, n);

  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const vaoPost = gl.createVertexArray();
  function makeVAO(cloud) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cloud.a), gl.STATIC_DRAW);
    for (const [loc, size, offs] of [[1, 3, 0], [2, 3, 3], [3, 4, 6], [4, 4, 10], [5, 4, 14], [6, 3, 18]]) {
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offs * 4); gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    return { vao, buf, n: cloud.n };
  }

  let scene = null;            // { meta, solid, glow }
  let palettes = [], palI = 0, pxI = 1;
  let motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let az = 0, el = 0.3, swayPh = 0, drag = null, tapT = -99;
  const now = () => performance.now() / 1000, t0 = now();

  let W = 1, H = 1, fbo = null, tex = null, rbo = null;
  function resize() {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    const s = Math.max(1, Math.round(Math.min(w, h) / PIXEL_TARGETS[pxI]));
    W = Math.ceil(w / s); H = Math.ceil(h / s);
    canvas.width = W; canvas.height = H; canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
    if (fbo) { gl.deleteFramebuffer(fbo); gl.deleteTexture(tex); gl.deleteRenderbuffer(rbo); }
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    rbo = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rbo); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbo);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function applyPalette() {
    const pal = palettes[palI], arr = new Float32Array(96);
    pal.colors.slice(0, 32).forEach((h, i) => arr.set(hex(h), i * 3));
    gl.useProgram(PP);
    gl.uniform3fv(UPP.uPal, arr); gl.uniform1i(UPP.uPalN, Math.min(32, pal.colors.length)); gl.uniform1i(UPP.uMode, pal.mode);
  }

  // Build a scene module and swap it in. Throws if build() throws; the previous scene stays up.
  function load(mod) {
    const meta = mod.meta, kit = createKit(meta.seed || 1);
    mod.build(kit);
    const next = { meta, solid: makeVAO(kit.solid), glow: makeVAO(kit.glow) };
    if (scene) for (const c of [scene.solid, scene.glow]) { gl.deleteVertexArray(c.vao); gl.deleteBuffer(c.buf); }
    scene = next;
    palettes = [{ name: meta.palette.name, mode: 0, colors: meta.palette.colors }, ...SHARED_PALETTES]; palI = 0;
    applyPalette();
    gl.useProgram(PP);
    gl.uniform3fv(UPP.uBgTop, meta.bg.top); gl.uniform3fv(UPP.uBgBot, meta.bg.bottom); gl.uniform1f(UPP.uBgCurve, meta.bg.curve);
    gl.uniform3fv(UPP.uRamp, meta.ramp || [0.06, 1.4, 0.7]);
    az = meta.camera.az; el = meta.camera.el; swayPh = 0; tapT = -99; drag = null;
    return info();
  }

  function tap() { const t = now() - t0; if (t - tapT > 0.7) tapT = t; }
  const clampCam = () => {
    const c = scene.meta.camera;
    if (c.azRange) az = Math.max(c.azRange[0], Math.min(c.azRange[1], az));
    el = Math.max(c.elRange[0], Math.min(c.elRange[1], el));
  };
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: now(), moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (_) { } });
  canvas.addEventListener('pointermove', e => {
    if (!drag || !scene) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
    if (drag.moved > 6) { az -= dx * 0.007; el += dy * 0.0055; clampCam(); }
  });
  canvas.addEventListener('pointerup', () => { if (drag && drag.moved <= 6 && now() - drag.t < 0.45) tap(); drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('keydown', e => {
    if (!scene) return;
    if (e.key === 'ArrowLeft') az += 0.1; else if (e.key === 'ArrowRight') az -= 0.1;
    else if (e.key === 'ArrowUp') el += 0.05; else if (e.key === 'ArrowDown') el -= 0.05;
    else if (e.key === ' ' || e.key === 'Enter') { tap(); e.preventDefault(); return; } else return;
    clampCam(); e.preventDefault();
  });
  addEventListener('resize', resize);
  resize();

  let last = now();
  function frame() {
    requestAnimationFrame(frame);
    const tn = now(), dt = Math.min(0.1, tn - last); last = tn;
    if (!scene) return;
    const t = tn - t0, cam = scene.meta.camera, tp = scene.meta.tap || { hop: 0, time: 0.5 };
    // 'orbit' turns all the way round; 'sway' rocks about az so a backdrop stays behind the subject
    let azNow = az;
    if (cam.mode === 'sway') { if (motion && !drag) swayPh += dt * cam.speed; azNow = az + cam.swayAmp * Math.sin(swayPh); }
    else if (motion && !drag) { az += dt * cam.speed; azNow = az; }
    const asp = W / H, vh = FOV / 2, hh = Math.atan(Math.tan(vh) * asp);
    const dist = Math.max(cam.fit[0] / Math.tan(hh), cam.fit[1] / Math.tan(vh));   // fit[0] = half-width to keep in frame, fit[1] = half-height
    const T = cam.target, eye = [T[0] + dist * Math.sin(azNow) * Math.cos(el), T[1] + dist * Math.sin(el), T[2] + dist * Math.cos(azNow) * Math.cos(el)];
    const age = t - tapT, hopAge = age / tp.time;
    const hopY = hopAge >= 0 && hopAge < 1 ? tp.hop * 4 * hopAge * (1 - hopAge) : 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(P);
    gl.uniformMatrix4fv(U.uView, false, lookAt(eye, T, UP));
    gl.uniformMatrix4fv(U.uProj, false, persp(FOV, asp, 2, 90));
    gl.uniform2f(U.uViewport, W, H);
    gl.uniform1f(U.uTime, t); gl.uniform1f(U.uHop, hopY);
    gl.uniform1f(U.uTapAge, age > 50 ? 99 : age);                            // seconds since the tap
    gl.uniform1f(U.uLandAge, age >= tp.time && age < 50 ? age - tp.time : 99); // seconds since the hop landed
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.uniform1i(U.uAdd, 0); gl.uniform1f(U.uBias, 0);
    gl.bindVertexArray(scene.solid.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, scene.solid.n);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ZERO, gl.ONE); gl.depthMask(false);
    gl.uniform1i(U.uAdd, 1); gl.uniform1f(U.uBias, 0.004);
    gl.bindVertexArray(scene.glow.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, scene.glow.n);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true);
    gl.useProgram(PP);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(UPP.uTex, 0); gl.uniform2f(UPP.uRes, W, H);
    gl.bindVertexArray(vaoPost); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
  requestAnimationFrame(frame);

  function info() {
    return scene && {
      id: scene.meta.id, title: scene.meta.title, count: scene.solid.n + scene.glow.n,
      palette: palettes[palI].name, paletteSize: palettes[palI].colors.length, pixels: PIXEL_NAMES[pxI], motion
    };
  }
  return {
    load, tap, info,
    nextPalette() { palI = (palI + 1) % palettes.length; applyPalette(); return info(); },
    nextPixelSize() { pxI = (pxI + 1) % PIXEL_TARGETS.length; resize(); return info(); },
    setMotion(on) { motion = !!on; return info(); }
  };
}
