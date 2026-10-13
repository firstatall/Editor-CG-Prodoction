// 3D motion-graphics kit: deterministic scenes rendered frame-by-frame (t in seconds).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
export const W = 1920, H = 1080, FPS = 25;

// ---------- palette (linear HDR values for emissive things) ----------
export const COL = {
  emerald: new THREE.Color('#19E39A'),
  emeraldDeep: new THREE.Color('#0A7A55'),
  mint: new THREE.Color('#9DFFD6'),
  gold: new THREE.Color('#F5C76B'),
  goldDeep: new THREE.Color('#B8862F'),
  ink: new THREE.Color('#020B0A'),
  teal: new THREE.Color('#06231F'),
  gray: new THREE.Color('#7A8084'),
  sut: new THREE.Color('#FF8A1F'), moph: new THREE.Color('#2BE27A'), moe: new THREE.Color('#3B82FF'),
  tmc: new THREE.Color('#FF3D4F'), hosp: new THREE.Color('#47D7FF'),
};
export const hdr = (c, k) => c.clone().multiplyScalar(k);

// ---------- math / easing ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const E = {
  outCubic: t => 1 - Math.pow(1 - t, 3), inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t), inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2, outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutQuint: t => t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outBack: (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
export function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
export function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ---------- textures ----------
const texCache = {};
export function canvasTex(w, h, draw, key) {
  if (key && texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (key) texCache[key] = t;
  return t;
}
export const glowTex = () => canvasTex(256, 256, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,255,255,.85)'); r.addColorStop(.35, 'rgba(255,255,255,.22)');
  r.addColorStop(.7, 'rgba(255,255,255,.04)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}, 'glow');
export const streakTex = () => canvasTex(1024, 64, (g, w, h) => {
  const r = g.createLinearGradient(0, 0, w, 0);
  r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, w, h);
}, 'streak');
export const ringTex = () => canvasTex(512, 512, (g, w) => {
  const r = g.createRadialGradient(w / 2, w / 2, w * .3, w / 2, w / 2, w / 2);
  r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.8, 'rgba(255,255,255,.9)'); r.addColorStop(.86, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
}, 'ring');
// soft vertical beam (for light pillars / god rays)
export const beamTex = () => canvasTex(128, 512, (g, w, h) => {
  const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.75, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  const s = g.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = s; g.fillRect(0, 0, w, h);
}, 'beam');

export function textTexture(lines, opt = {}) {
  // lines: [{s, size, weight, color, fam}] -> texture + aspect
  const pad = opt.pad ?? 24, fam = opt.fam ?? 'Kanit';
  const meas = document.createElement('canvas').getContext('2d');
  let w = 0, h = pad * 2;
  lines.forEach(l => { meas.font = `${l.weight ?? 600} ${l.size}px ${l.fam ?? fam}`; if (opt.spacing) meas.letterSpacing = opt.spacing + 'px'; w = Math.max(w, meas.measureText(l.s).width); h += l.size * 1.35; });
  w = Math.ceil(w + pad * 2 + (opt.pill ? lines[0].size : 0));
  const tex = canvasTex(w, Math.ceil(h), (g) => {
    if (opt.pill) {
      const r = h / 2; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, r); g.fillStyle = opt.pill.fill; g.fill();
      g.lineWidth = 4; g.strokeStyle = opt.pill.stroke; g.stroke();
    }
    let y = pad;
    lines.forEach(l => {
      g.font = `${l.weight ?? 600} ${l.size}px ${l.fam ?? fam}`; if (opt.spacing) g.letterSpacing = opt.spacing + 'px';
      g.fillStyle = l.color ?? '#fff'; g.textBaseline = 'top'; g.textAlign = 'center';
      g.fillText(l.s, w / 2, y + l.size * .12); y += l.size * 1.35;
    });
  });
  return { tex, aspect: w / h, w, h };
}

// ---------- fonts / 3D text ----------
const fonts = {};
export async function loadFonts() {
  const loader = new TTFLoader();
  for (const w of [500, 700, 800]) fonts[w] = new Font(await loader.loadAsync(`assets/Kanit-${w}.ttf`));
  await Promise.all([[500, 'Kanit'], [600, 'Kanit'], [700, 'Kanit'], [400, 'Sarabun'], [500, 'Sarabun']].map(([w, f]) => document.fonts.load(`${w} 40px ${f}`, 'กขabc012')));
}
const geoCache = {};
export function textGeo(str, o = {}) {
  const key = JSON.stringify([str, o]);
  if (geoCache[key]) return geoCache[key];
  let g = new TextGeometry(str, {
    font: fonts[o.weight ?? 700], size: o.size ?? 1, depth: o.depth ?? .25, curveSegments: 10,
    bevelEnabled: true, bevelThickness: o.bevel ?? .03, bevelSize: o.bevelSize ?? .02, bevelSegments: 4,
  });
  g = mergeVertices(g); g.computeVertexNormals(); g.computeBoundingBox();
  const bb = g.boundingBox, cx = (bb.max.x + bb.min.x) / 2, cy = o.alignBase ? 0 : (bb.max.y + bb.min.y) / 2;
  g.translate(o.align === 'left' ? -bb.min.x : -cx, -cy, -(o.depth ?? .25) / 2);
  g.userData.width = bb.max.x - bb.min.x;
  return (geoCache[key] = g);
}

// ---------- materials ----------
export function chromeMat(color = '#E9F3EF', o = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: o.roughness ?? .18, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: o.env ?? .9, emissive: o.emissive ?? '#000', emissiveIntensity: o.ei ?? 1 });
}
export function glowMat(color, k = 3, o = {}) {
  return new THREE.MeshBasicMaterial({ color: hdr(color, k), transparent: !!o.transparent, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: true });
}
export function addSprite(parent, color, size, k = 2, tex = glowTex()) {
  const m = new THREE.SpriteMaterial({ map: tex, color: hdr(color, k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(m); s.scale.set(size, size, 1); parent.add(s); return s;
}

// ---------- the Green Thread as a growable glowing tube ----------
export class Thread {
  constructor(parent, curve, o = {}) {
    this.curve = curve; this.segs = o.segs ?? 400;
    const r = o.radius ?? .03;
    this.geo = new THREE.TubeGeometry(curve, this.segs, r, o.radial ?? 10, false);
    if (o.taper !== false) { // taper the tail
      const pos = this.geo.attributes.position, ring = (o.radial ?? 10) + 1;
      const tmp = new THREE.Vector3();
      for (let j = 0; j <= this.segs; j++) {
        const u = j / this.segs, k = clamp(u / (o.taperLen ?? .12)) * .85 + .15;
        const c = curve.getPointAt(u);
        for (let i = 0; i < ring; i++) { const idx = j * ring + i; tmp.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(k).add(c); pos.setXYZ(idx, tmp.x, tmp.y, tmp.z); }
      }
    }
    this.color = (o.color ?? COL.emerald).clone(); this.k = o.k ?? 2.4;
    this.mat = new THREE.MeshBasicMaterial({ color: hdr(this.color, this.k), transparent: true, opacity: 1 });
    this.core = new THREE.Mesh(this.geo, this.mat); parent.add(this.core);
    // soft halo shell
    this.haloGeo = new THREE.TubeGeometry(curve, this.segs, r * (o.halo ?? 2.2), 8, false);
    this.haloMat = new THREE.MeshBasicMaterial({ color: hdr(this.color, .35), transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = new THREE.Mesh(this.haloGeo, this.haloMat); parent.add(this.halo);
    this.headSprite = o.head === false ? null : addSprite(parent, this.color, (o.headSize ?? r * 22), 1.6);
    this.headCore = o.head === false ? null : addSprite(parent, new THREE.Color('#ffffff'), (o.headSize ?? r * 22) * .25, 2);
    this.ringCount = (o.radial ?? 10) * 6; this.haloRing = 8 * 6;
  }
  set(head, tail = 0, alpha = 1) {
    head = clamp(head); tail = clamp(tail);
    const s0 = Math.floor(tail * this.segs), s1 = Math.ceil(head * this.segs);
    this.geo.setDrawRange(s0 * this.ringCount, Math.max(0, s1 - s0) * this.ringCount);
    this.haloGeo.setDrawRange(s0 * this.haloRing, Math.max(0, s1 - s0) * this.haloRing);
    this.mat.opacity = alpha; this.haloMat.opacity = .2 * alpha;
    const vis = head > tail + 1e-4 && alpha > 0;
    this.core.visible = this.halo.visible = vis;
    if (this.headSprite) {
      const p = this.curve.getPointAt(head);
      this.headSprite.position.copy(p); this.headCore.position.copy(p);
      const hv = vis && head < .9999 && (this.headAlpha ?? 1) > 0;
      this.headSprite.visible = this.headCore.visible = hv;
      this.headSprite.material.opacity = this.headCore.material.opacity = alpha * (this.headAlpha ?? 1);
    }
  }
  setColor(c, k = this.k) { this.mat.color.copy(hdr(c, k)); this.haloMat.color.copy(hdr(c, .5)); if (this.headSprite) this.headSprite.material.color.copy(hdr(c, 3)); }
}

// ---------- particles (bokeh dust) ----------
export function dustField(parent, n, box, o = {}) {
  const r = rng(o.seed ?? 7), pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * box[0]; pos[i * 3 + 1] = (r() - .5) * box[1]; pos[i * 3 + 2] = (r() - .5) * box[2]; seed[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: hdr(o.color ?? COL.mint, o.k ?? 1.2) }, uSize: { value: o.size ?? 60 }, uFocus: { value: o.focus ?? 12 }, uAlpha: { value: o.alpha ?? 1 }, uDrift: { value: new THREE.Vector3(...(o.drift ?? [.05, .08, 0])) }, uBox: { value: new THREE.Vector3(...box) }, uCenter: { value: new THREE.Vector3(...(o.center ?? [0, 0, 0])) } },
    vertexShader: `uniform float uTime,uSize,uFocus; uniform vec3 uDrift,uBox,uCenter; attribute float seed; varying float vA,vBlur;
      void main(){ vec3 p=position+uDrift*uTime*(0.5+seed)+vec3(sin(uTime*.4+seed*30.)*.15,cos(uTime*.3+seed*20.)*.15,0.);
        p=mod(p+uBox*.5,uBox)-uBox*.5+uCenter;
        vec4 mv=modelViewMatrix*vec4(p,1.); float d=-mv.z; vBlur=clamp(abs(d-uFocus)/uFocus,0.,1.);
        gl_PointSize=uSize*(0.25+seed*.75)*(1.+vBlur*2.5)/d; vA=(0.35+0.65*seed)*(1.-vBlur*.75)*(0.6+0.4*sin(uTime*1.3+seed*40.));
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uAlpha; varying float vA,vBlur; void main(){ float r=length(gl_PointCoord-.5)*2.; if(r>1.)discard;
        float edge=mix(1.-smoothstep(.0,1.,r), 1.-smoothstep(.75,1.,r)*.9, vBlur); float a=edge*vA*uAlpha*(1.-vBlur*.5); gl_FragColor=vec4(uColor*a,a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const p = new THREE.Points(g, mat); p.frustumCulled = false; parent.add(p);
  return { points: p, update: t => { mat.uniforms.uTime.value = t; }, mat };
}

// ---------- background ----------
export function skyDome(scene, top = '#04201C', bottom = '#010605', glowPos = [0, .2, -1], glowCol = '#0E5E4C') {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: { value: new THREE.Color(top) }, uBot: { value: new THREE.Color(bottom) }, uGlow: { value: new THREE.Color(glowCol) }, uGlowDir: { value: new THREE.Vector3(...glowPos).normalize() }, uK: { value: 1 } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uTop,uBot,uGlow,uGlowDir; uniform float uK; varying vec3 vD; void main(){ float h=vD.y*.5+.5; vec3 c=mix(uBot,uTop,smoothstep(.1,.9,h));
      c+=uGlow*pow(max(dot(vD,uGlowDir),0.),6.)*1.2; gl_FragColor=vec4(c*uK,1.); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), mat); m.renderOrder = -10; scene.add(m); return m;
}

// ---------- finishing (grade, CA, vignette, grain) ----------
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uCA: { value: .0018 }, uVig: { value: .9 }, uGrain: { value: .045 }, uSat: { value: 1 }, uLift: { value: new THREE.Vector3(0, .002, .002) }, uFade: { value: 1 }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color('#E8FFF5') } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uCA,uVig,uGrain,uSat,uFade,uFlash; uniform vec3 uLift,uFlashCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d=vUv-.5; float r2=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse,vUv-d*uCA*r2*8.).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv+d*uCA*r2*8.).b;
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
      c=c+uLift*(1.-c);
      c*=mix(1.,smoothstep(1.05,.25,length(d*vec2(1.,.8))*1.25),uVig);
      c+=(h(vUv*vec2(1920.,1080.)+fract(uTime*7.13)*100.)-.5)*uGrain*(1.-l*.6);
      c=mix(c,uFlashCol,uFlash); c*=uFade;
      gl_FragColor=vec4(c,1.); }`,
};

// ---------- stage: renderer + composer ----------
export class Stage {
  constructor(o = {}) {
    this.alpha = !!o.alpha;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: this.alpha, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W, H);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = o.exposure ?? .9;
    this.renderer.setClearColor(0x000000, this.alpha ? 0 : 1);
    document.body.innerHTML = ''; document.body.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(o.fov ?? 32, W / H, .05, 2000);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: o.msaa ?? 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), o.bloom ?? .55, o.bloomRadius ?? .4, o.bloomThreshold ?? .92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.finish = new ShaderPass(FinishShader);
    if (this.alpha || o.overlay) { this.finish.uniforms.uGrain.value = 0; this.finish.uniforms.uVig.value = 0; this.finish.uniforms.uLift.value.set(0, 0, 0); }
    this.composer.addPass(this.finish);
    this.composer.addPass(new SMAAPass(W, H));
  }
  render(t) { this.finish.uniforms.uTime.value = t; this.composer.render(); }
}

// camera helper: position + target with easing between keyframes [{t, pos:[x,y,z], look:[x,y,z], fov}]
export function camPath(cam, keys, t, ease = E.inOutCubic) {
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
  if (t > keys[keys.length - 1].t) a = b;
  const u = a === b ? 1 : ease(prog(t, a.t, b.t));
  const P = a.pos.map((v, i) => lerp(v, b.pos[i], u)), L = a.look.map((v, i) => lerp(v, b.look[i], u));
  cam.position.set(...P); cam.lookAt(...L);
  if (a.fov) { cam.fov = lerp(a.fov, b.fov ?? a.fov, u); cam.updateProjectionMatrix(); }
}

// anamorphic flare: streak + glow sprites at a world position, scaled by k
export function makeFlare(parent, color = COL.mint) {
  const g = new THREE.Group(); parent.add(g);
  const core = addSprite(g, new THREE.Color('#ffffff'), 1, 1.6);
  const glow = addSprite(g, color, 3, .6);
  const sm = new THREE.SpriteMaterial({ map: streakTex(), color: hdr(color, .9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const streak = new THREE.Sprite(sm); g.add(streak);
  return { group: g, set(pos, k, w = 14) { g.position.copy(pos); g.visible = k > 0.001; core.scale.setScalar(.6 * k); glow.scale.setScalar(3.2 * k); streak.scale.set(w * k, .16 * k, 1); core.material.opacity = glow.material.opacity = sm.opacity = clamp(k); } };
}
