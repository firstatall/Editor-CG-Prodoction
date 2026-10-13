// คลิปที่ 1 — 3D cinematic motion graphics (Green Thread motif)
import { THREE, Stage, COL, hdr, clamp, lerp, prog, E, hash, rng, Thread, dustField, skyDome, camPath, addSprite, glowTex, ringTex, beamTex, textGeo, chromeMat, glowMat, makeFlare, textTexture, canvasTex } from './kit.js';

export const CLIPS = {};
const clip = (name, dur, mode, desc, build) => (CLIPS[name] = { dur, mode, desc, build });
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- shared pieces ----------------
function lights(scene, o = {}) {
  scene.add(new THREE.AmbientLight('#0b2a25', o.amb ?? .6));
  const key = new THREE.DirectionalLight('#fff4e0', o.key ?? 2.2); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.PointLight(COL.emerald, o.rim ?? 60, 40, 2); rim.position.set(-4, 3, -4); scene.add(rim);
  const rim2 = new THREE.PointLight(COL.gold, o.rim2 ?? 25, 40, 2); rim2.position.set(5, 4, -6); scene.add(rim2);
  return { key, rim, rim2 };
}
// digits as separate meshes so a counter can swap geometry each frame
function numberRig(parent, str, o = {}) {
  const g = new THREE.Group(); parent.add(g);
  const mat = o.mat ?? chromeMat('#86E3C2', { roughness: .14, env: 1.1, emissive: hdr(COL.emeraldDeep, .06) });
  const size = o.size ?? 1, gap = o.gap ?? .04;
  const digitW = textGeo('0', { size, weight: o.weight ?? 800, depth: o.depth ?? .35 }).userData.width;
  const meshes = [...str].map(() => { const m = new THREE.Mesh(textGeo('0', { size, weight: o.weight ?? 800, depth: o.depth ?? .35 }), mat); g.add(m); return m; });
  return {
    group: g, mat, meshes,
    show(s) {
      let x = 0; const ws = [...s].map(ch => ch === ' ' ? 0 : textGeo(ch, { size, weight: o.weight ?? 800, depth: o.depth ?? .35 }).userData.width);
      const total = ws.reduce((a, b) => a + b, 0) + gap * size * (s.length - 1);
      x = -total / 2;
      meshes.forEach((m, i) => {
        const ch = s[i]; m.visible = !!ch && ch !== ' ';
        if (!m.visible) return;
        m.geometry = textGeo(ch, { size, weight: o.weight ?? 800, depth: o.depth ?? .35 });
        if (o.fixed) { m.position.x = -((str.length - 1) * (digitW + gap * size)) / 2 + i * (digitW + gap * size); }
        else { m.position.x = x + ws[i] / 2; x += ws[i] + gap * size; }
      });
    },
  };
}
function groundGrid(scene, o = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCol: { value: hdr(o.color ?? COL.emerald, o.k ?? .6) }, uA: { value: o.alpha ?? 1 }, uScale: { value: o.scale ?? 1 }, uR: { value: o.radius ?? 18 } },
    vertexShader: `varying vec3 vP; void main(){ vP=(modelMatrix*vec4(position,1.)).xyz; gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.); }`,
    fragmentShader: `uniform vec3 uCol; uniform float uA,uScale,uR; varying vec3 vP; void main(){ vec2 g=abs(fract(vP.xz*uScale-.5)-.5)/fwidth(vP.xz*uScale);
      float l=1.-min(min(g.x,g.y),1.); float f=1.-smoothstep(uR*.3,uR,length(vP.xz)); float a=l*f*.22*uA; gl_FragColor=vec4(uCol*a,a); }`,
  });
  mat.extensions = { derivatives: true };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat); m.rotation.x = -Math.PI / 2; m.position.y = o.y ?? 0; scene.add(m); return { mesh: m, mat };
}
// glossy dark floor that catches reflections of glow (cheap: env + emissive fog)
function glossFloor(scene, y = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(o.r ?? 40, 64), new THREE.MeshPhysicalMaterial({ color: '#03100E', metalness: .6, roughness: .28, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .25 }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); return m;
}
function lightBeam(parent, color, h, w, k = 1.2) {
  const mat = new THREE.MeshBasicMaterial({ map: beamTex(), color: hdr(color, k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const g = new THREE.Group();
  for (let i = 0; i < 2; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.y = h / 2; p.rotation.y = i * Math.PI / 2; g.add(p); }
  parent.add(g); return { group: g, mat };
}
function textSprite(parent, lines, worldH, o = {}) {
  const t = textTexture(lines, o);
  const m = new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.set(worldH * t.aspect, worldH, 1); parent.add(s); return s;
}
function sweepFlare(stage, t, t0, t1, from, to, k = 1.2) {
  // a flare that glides across a hero element
  if (!stage._fl) stage._fl = makeFlare(stage.scene, COL.mint);
  const p = prog(t, t0, t1);
  stage._fl.set(from.clone().lerp(to, E.inOutSine(p)), Math.sin(Math.PI * p) * k, 18);
}

// ======================================================================
// S1 — Thailand map, province light pillars, arcs from มทส., gather into 580+
// ======================================================================
clip('C1_S1_Map_Thailand_580', 12, 'opaque', 'แผนที่ไทย 3D + เสาแสงทุกจังหวัด + เส้นโค้งจาก มทส. → รวมตัวกลางจอเป็น 580+', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .035);
  skyDome(scene, '#03211C', '#000403', [0, .35, -1], '#0C5545');
  lights(scene);
  const grid = groundGrid(scene, { y: -.02, scale: 2, radius: 16 });
  const U = 1 / 100; // px -> world
  const map = new THREE.Group(); scene.add(map); map.position.set(0, 0, 0);
  // extruded map slab
  const shapes = GEO.polys.map(p => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x * U, -y * U))));
  const slabMat = new THREE.MeshPhysicalMaterial({ color: '#06302A', metalness: .4, roughness: .3, clearcoat: 1, clearcoatRoughness: .15, emissive: hdr(COL.emeraldDeep, .25), transparent: true, opacity: 0 });
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shapes, { depth: .12, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 4 }), slabMat);
  slab.rotation.x = -Math.PI / 2; map.add(slab);
  // borders: glowing threads tracing the coastline (draw-on)
  const borders = GEO.polys.filter(p => p.length > 30).map(p => {
    const pts = p.filter((_, i) => i % 2 === 0).map(([x, y]) => V(x * U, .15, y * U)); pts.push(pts[0].clone());
    return new Thread(map, new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .2), { radius: .012, segs: Math.min(1600, pts.length * 3), color: COL.mint, k: 1.8, head: true, headSize: .3, taper: false });
  });
  const P = lat => V((lat[1] - GEO.cLon) * GEO.k * GEO.s * U, .15, -(lat[0] - GEO.cLat) * GEO.s * U);
  const SUT = P([14.88, 102.02]);
  const PROV = [[13.75,100.50],[14.35,100.57],[18.79,98.98],[19.91,99.83],[18.29,99.49],[16.82,100.26],[15.70,100.14],[16.43,102.83],[17.41,102.79],[17.88,102.74],[17.49,101.72],[17.16,104.15],[17.41,104.78],[16.54,104.72],[15.24,104.85],[15.12,104.32],[14.88,103.49],[14.99,103.10],[15.81,102.03],[16.05,103.65],[16.43,103.51],[18.78,100.78],[18.14,100.14],[17.01,99.82],[16.88,99.13],[19.30,97.97],[16.42,101.16],[14.80,100.65],[14.05,101.37],[13.82,102.07],[13.36,100.98],[12.68,101.28],[12.61,102.10],[12.24,102.52],[14.02,99.53],[13.54,99.82],[13.11,99.94],[11.81,99.80],[10.49,99.18],[9.14,99.33],[8.43,99.96],[8.09,98.91],[7.88,98.39],[7.56,99.61],[7.01,100.47],[6.54,101.28],[6.43,101.82],[9.96,98.64],[15.38,100.02],[16.48,99.52],[17.20,102.44],[18.36,103.65],[14.47,100.12],[13.82,100.06],[19.17,99.90],[15.47,102.60]].map(P);
  // pillars + base glows
  const pillars = PROV.map((p, i) => {
    const b = lightBeam(map, i % 5 === 0 ? COL.gold : COL.emerald, 1, .07, .9); b.group.position.copy(p);
    const dot = addSprite(map, COL.mint, .2, 1.6); dot.position.copy(p);
    return { b, dot, st: .9 + hash(i * 3.1) * 2.0, h: .5 + hash(i * 5.7) * 1.1 };
  });
  // มทส. hero point
  const sutCore = addSprite(map, new THREE.Color('#ffffff'), .35, 2); sutCore.position.copy(SUT);
  const sutGlow = addSprite(map, COL.emerald, 1.4, 1); sutGlow.position.copy(SUT);
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex(), color: hdr(COL.mint, 2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat.clone()); m.rotation.x = -Math.PI / 2; m.position.copy(SUT); map.add(m); return m; });
  const sutBeam = lightBeam(map, COL.emerald, 2.4, .25, 2.2); sutBeam.group.position.copy(SUT);
  const label = textSprite(map, [{ s: 'มทส.', size: 64, weight: 600 }, { s: 'นครราชสีมา', size: 34, weight: 400, fam: 'Sarabun', color: '#9DFFD6' }], .5);
  label.position.copy(SUT).add(V(.62, .55, 0));
  // arcs from มทส.
  const arcs = PROV.map((p, i) => {
    const d = p.distanceTo(SUT), mid = SUT.clone().lerp(p, .5); mid.y += .25 + d * .35;
    const c = new THREE.QuadraticBezierCurve3(SUT.clone(), mid, p.clone());
    const th = new Thread(map, c, { radius: .008, segs: 80, k: 2.2, headSize: .2 });
    th.set(0); const pulse = addSprite(map, COL.mint, .12, 1.8);
    return { th, c, pulse, st: 3.0 + hash(i * 7.7) * 2.2 };
  });
  // gather point and number
  const G = V(0, 2.75, .6);
  const gathers = PROV.filter((_, i) => i % 2 === 0).map((p, i) => {
    const c = new THREE.CubicBezierCurve3(p.clone(), p.clone().add(V(0, 1.4 + hash(i) * .8, 0)), G.clone().add(V((hash(i + 3) - .5) * 3, -.6, (hash(i + 4) - .5) * 2)), G.clone());
    const th = new Thread(scene, c, { radius: .012, segs: 90, k: 2.4, headSize: .3 }); th.set(0);
    return { th, st: 5.9 + hash(i * 5.3) * .7 };
  });
  const num = numberRig(scene, '580+', { size: 1.25, depth: .4, gap: .03, fixed: true });
  num.group.position.copy(G); num.group.visible = false;
  const flare = makeFlare(scene, COL.mint);
  const dust = dustField(scene, 1600, [26, 10, 26], { size: 70, focus: 9, center: [0, 3, 0], seed: 11 });
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), color: hdr(COL.mint, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  burst.position.copy(G); scene.add(burst);

  return t => {
    // camera: low cinematic glide over the gulf, push to มทส., crane up for the number
    camPath(camera, [
      { t: 0, pos: [1.2, 12.5, 9.0], look: [0, 0, .2], fov: 34 },
      { t: 6.0, pos: [2.0, 6.2, 4.6], look: [SUT.x - .2, 0, SUT.z + .2], fov: 32 },
      { t: 7.6, pos: [0, 3.25, 7.6], look: [0, 2.65, .6], fov: 30 },
      { t: 12, pos: [0, 3.0, 6.6], look: [0, 2.7, .6], fov: 30 },
    ], t);
    const dimMap = 1 - .75 * E.inOutCubic(prog(t, 6.2, 7.8));
    borders.forEach((b, i) => { b.headAlpha = 1 - prog(t, 1.6, 2.0); b.set(E.inOutCubic(prog(t, i * .05, 1.8 + i * .05)), 0, dimMap); });
    slabMat.opacity = .92 * E.outCubic(prog(t, .6, 2.2)) * (0.35 + .65 * dimMap);
    grid.mat.uniforms.uA.value = prog(t, 0, 1.5) * dimMap;
    pillars.forEach(({ b, dot, st: s0, h }) => {
      const p = E.outExpo(prog(t, s0, s0 + .6)), fl = .8 + .2 * Math.sin(t * 5 + s0 * 9);
      b.group.scale.set(1, Math.max(.001, h * p), 1); b.mat.opacity = p * fl * dimMap; b.group.visible = p > 0;
      dot.material.opacity = p * dimMap; dot.scale.setScalar(.22 * (1 + .4 * E.outCubic(prog(t, s0, s0 + .3)) * (1 - prog(t, s0 + .3, s0 + .9))));
    });
    const sp = E.outBack(prog(t, 2.0, 2.6));
    sutCore.scale.setScalar(.35 * sp); sutGlow.scale.setScalar(1.4 * sp * (1 + .08 * Math.sin(t * 6))); sutCore.material.opacity = sutGlow.material.opacity = dimMap;
    sutBeam.group.scale.set(1, Math.max(.001, E.outExpo(prog(t, 2.1, 2.9))), 1); sutBeam.mat.opacity = dimMap;
    rings.forEach((r, i) => { const u = ((t - 2.2) * .7 + i / 3) % 1; const on = t > 2.2; r.scale.setScalar(.2 + u * 2.4); r.material.opacity = on ? (1 - u) * dimMap : 0; });
    label.material.opacity = E.outCubic(prog(t, 2.5, 3.1)) * (1 - prog(t, 5.6, 6.2));
    arcs.forEach(a => {
      const p = E.inOutCubic(prog(t, a.st, a.st + 1.1));
      a.th.set(p, 0, dimMap);
      const u = ((t - a.st - 1.1) * .55) % 1;
      a.pulse.visible = p >= 1 && dimMap > .05; if (a.pulse.visible) { a.pulse.position.copy(a.c.getPoint(u)); a.pulse.material.opacity = dimMap; }
    });
    gathers.forEach(g => { const p = E.inCubic(prog(t, g.st, g.st + .85)); g.th.set(p, E.inCubic(prog(t, g.st + .35, g.st + .95)), 1); });
    // number
    const nIn = prog(t, 7.0, 7.5);
    num.group.visible = nIn > 0;
    const v = Math.round(580 * E.outExpo(prog(t, 7.0, 8.6)));
    num.show(String(v).padStart(3, ' ') + (t > 8.5 ? '+' : ' '));
    const pop = E.outBack(prog(t, 7.0, 7.7), 1.2);
    num.group.scale.setScalar(lerp(.55, 1, pop)); num.group.rotation.y = lerp(.5, 0, E.outCubic(prog(t, 7.0, 8.8))) + .04 * Math.sin(t * .6);
    num.meshes[3].scale.setScalar(E.outBack(prog(t, 8.5, 8.9), 2));
    // flash on gather + flare sweep after the count lands
    const fk = Math.sin(Math.PI * prog(t, 6.75, 7.45));
    if (t < 8.9) flare.set(G, fk * 1.3, 16);
    else { const p = prog(t, 8.9, 10.4); flare.set(G.clone().add(V(lerp(-2.6, 2.6, E.inOutSine(p)), .5, .5)), Math.sin(Math.PI * p) * .7, 10); }
    st.finish.uniforms.uFlash.value = .2 * Math.pow(fk, 3);
    const b = prog(t, 8.55, 9.6); burst.visible = b > 0 && b < 1; burst.scale.setScalar(1 + 9 * E.outCubic(b)); burst.material.opacity = 1 - b; burst.lookAt(camera.position);
    dust.update(t);
    st.render(t);
  };
});

// ======================================================================
// S2 — timeline rail 2536 → 2540, the thread crawls then freezes
// ======================================================================
clip('C1_S2_Timeline_2536-2540_Freeze', 15, 'opaque', 'รางเวลา 3D ปี 2536–2542 เส้นเขียวคลานช้า → ถึง 2540 สะดุดหยุด แสงดับ ภาพหม่นเทา', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .06);
  const sky = skyDome(scene, '#03211C', '#000403', [0, .2, -1], '#0A4A3C');
  lights(scene, { rim: 30, rim2: 10 });
  const STEP = 3.2, years = [2536, 2537, 2538, 2539, 2540, 2541, 2542];
  const rail = new THREE.Mesh(new THREE.BoxGeometry(40, .05, .18), new THREE.MeshPhysicalMaterial({ color: '#0A2A25', metalness: .5, roughness: .25, clearcoat: 1, emissive: hdr(COL.emeraldDeep, .08) }));
  rail.position.set(14, -.03, 0); scene.add(rail);
  const markMat = years.map(() => chromeMat('#D8E6E1', { roughness: .25, env: .8, emissive: new THREE.Color('#000') }));
  const marks = years.map((y, i) => {
    const m = new THREE.Mesh(textGeo(String(y), { size: .42, weight: 700, depth: .08 }), markMat[i]); m.position.set(i * STEP, .5, -.25); scene.add(m);
    const tick = new THREE.Mesh(new THREE.BoxGeometry(.025, .22, .025), glowMat(COL.mint, .6)); tick.position.set(i * STEP, .08, 0); scene.add(tick);
    return { m, tick };
  });
  // giant holographic year in the background
  const bigMat = new THREE.MeshBasicMaterial({ color: hdr(COL.emerald, .35), transparent: true, opacity: .5, depthWrite: false });
  const big = numberRig(scene, '2536', { size: 3.2, depth: .05, mat: bigMat, fixed: true, weight: 800 }); big.group.position.set(6, .55, -9);
  const freezeAt = 10.4, endX = 4 * STEP + .5;
  const th = new Thread(scene, new THREE.LineCurve3(V(-4, .07, 0), V(endX, .07, 0)), { radius: .028, segs: 600, headSize: .7, taperLen: .05 });
  const run = t => t < freezeAt ? E.inOutSine(prog(t, .8, 8)) * .62 + .38 * E.inCubic(prog(t, 8, freezeAt)) : 1;
  const dust = dustField(scene, 1400, [30, 8, 14], { size: 60, focus: 4, center: [8, 1.5, 0], seed: 5 });
  const flare = makeFlare(scene, COL.mint);
  return t => {
    const u = run(t), hx = lerp(-4, endX, u);
    const shake = t > freezeAt && t < freezeAt + .3 ? (hash(Math.floor(t * 50)) - .5) * .03 : 0;
    const gray = E.inOutCubic(prog(t, freezeAt + .1, freezeAt + 1.8));
    th.headAlpha = 1 - prog(t, freezeAt + .05, freezeAt + .45) * (1 - .9 * (Math.sin(t * 90) > 0 && t < freezeAt + .4 ? 1 : 0));
    th.setColor(COL.emerald.clone().lerp(COL.gray, gray), lerp(2.4, .5, gray));
    th.set(u); th.core.position.y = th.halo.position.y = shake;
    marks.forEach(({ m, tick }, i) => {
      const lit = prog(hx, i * STEP - .4, i * STEP + .2);
      markMat[i].emissive.copy(hdr(COL.emerald, .5 * lit * (1 - gray * .8)));
      tick.material.color.copy(hdr(lit > .5 ? COL.mint : COL.gray, lit > .5 ? 2 * (1 - gray * .7) : .4));
    });
    const yr = 2536 + Math.min(4, Math.max(0, Math.floor((hx + .3) / STEP)));
    big.show(String(yr)); bigMat.opacity = (.45 + .1 * Math.sin(t * 40) * (hx % STEP < .3 ? 1 : 0)) * (1 - .6 * gray);
    bigMat.color.copy(hdr(COL.emerald.clone().lerp(COL.gray, gray), .35));
    const push = E.inOutSine(prog(t, freezeAt, 15));
    camera.position.set(hx - 2.4 + push * .9, lerp(1.05, .75, push), lerp(3.3, 2.4, push));
    camera.lookAt(hx + .6 - push * .3, .35, 0); camera.fov = lerp(30, 28, push); camera.updateProjectionMatrix();
    big.group.position.x = hx + 5.2;
    flare.set(V(hx, .07, 0), (1 - gray) * .35 * (t < freezeAt + .4 ? 1 : 0), 6);
    st.finish.uniforms.uSat.value = lerp(1, .25, gray);
    sky.material.uniforms.uK.value = lerp(1, .55, gray);
    dust.mat.uniforms.uDrift.value.set(lerp(.05, 0, gray), lerp(.06, -.18, gray), 0);
    dust.update(t);
    st.render(t);
  };
});

// ======================================================================
// S3 — five agency threads converge, ignite, braid into one rope and surge
// ======================================================================
clip('C1_S3_Braid_Agencies', 10, 'opaque', '5 เส้นสีหน่วยงาน (มทส./สธ./ศธ./แพทยสภา/รพ.พี่เลี้ยง) พุ่งเข้ามาบรรจบ → จุดประกาย → ถักเป็นเกลียวเชือก 3D พุ่งไปข้างหน้า', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .045);
  skyDome(scene, '#03211C', '#000403', [0, .3, -1], '#0C5545');
  const AG = [
    { name: 'มทส.', col: COL.sut, from: [-9, 4.5, -7] }, { name: 'สธ.', col: COL.moph, from: [-8, -4, -5] },
    { name: 'ศธ.', col: COL.moe, from: [-2, 6, -10] }, { name: 'แพทยสภา', col: COL.tmc, from: [-3, -5.5, -9] }, { name: 'รพ.พี่เลี้ยง', col: COL.hosp, from: [-10, .5, 3] },
  ];
  const K = V(0, 0, 0);
  const gray = new Thread(scene, new THREE.LineCurve3(V(-14, 0, 0), K.clone()), { radius: .03, segs: 200, head: false });
  const incoming = AG.map((a, i) => {
    const f = V(...a.from), mid = f.clone().lerp(K, .55).add(V(0, (hash(i) - .5) * 2, (hash(i + 1) - .5) * 2));
    const th = new Thread(scene, new THREE.CatmullRomCurve3([f, mid, K.clone().add(V(-.8, (i - 2) * .05, 0)), K.clone()]), { radius: .035, segs: 260, color: a.col, k: 2.6, headSize: .8 });
    const tag = textSprite(scene, [{ s: a.name, size: 54, weight: 600 }], .5, { pill: { fill: 'rgba(3,20,18,.82)', stroke: '#' + a.col.getHexString() }, pad: 18 });
    return { th, tag, st: .3 + i * .28 };
  });
  // braid: 5 helices + bright core along +x
  const LEN = 34, helix = AG.map((a, i) => {
    const pts = []; for (let k = 0; k <= 680; k++) { const x = k / 680 * LEN, r = .2 * clamp(x / .8), ph = x * 3.2 + i / 5 * Math.PI * 2; pts.push(V(x, Math.cos(ph) * r, Math.sin(ph) * r)); }
    return new Thread(scene, new THREE.CatmullRomCurve3(pts), { radius: .04, segs: 1400, color: a.col, k: 1.5, head: false, taper: false, halo: 1.6 });
  });
  const core = new Thread(scene, new THREE.LineCurve3(V(0, 0, 0), V(LEN, 0, 0)), { radius: .05, segs: 600, color: COL.emerald, k: 1.8, headSize: 1.2, taper: false });
  const flare = makeFlare(scene, COL.mint), headFlare = makeFlare(scene, COL.mint);
  const dust = dustField(scene, 2200, [40, 12, 16], { size: 70, focus: 5, center: [10, 0, 0], seed: 3, drift: [-.6, .02, 0] });
  return t => {
    const ign = prog(t, 3.3, 3.9);
    gray.setColor(COL.gray.clone().lerp(COL.emerald, ign), lerp(.6, 2.4, ign)); gray.set(1, 0, 1);
    incoming.forEach(({ th, tag, st: s0 }) => {
      const p = E.inOutCubic(prog(t, s0, s0 + 2.5)), fade = 1 - prog(t, 4.0, 5.0);
      th.set(p, 0, fade);
      tag.material.opacity = E.outCubic(prog(t, s0 + .3, s0 + .8)) * (1 - prog(t, s0 + 2.2, s0 + 2.7));
      tag.position.copy(th.curve.getPointAt(clamp(p))).add(V(.1, .32, 0));
    });
    const rp = E.inOutCubic(prog(t, 3.5, 9.6)), merge = prog(t, 3.8, 6.8);
    helix.forEach((h, i) => { h.setColor(AG[i].col.clone().lerp(COL.emerald, merge), 1.5); h.set(rp); });
    core.set(rp, 0, prog(t, 3.5, 4.2));
    const head = core.curve.getPointAt(clamp(rp));
    flare.set(K, Math.sin(Math.PI * prog(t, 3.2, 4.2)) * 1.4, 14);
    headFlare.set(head, rp > 0 && rp < 1 ? .45 : 0, 5);
    st.finish.uniforms.uFlash.value = .18 * Math.pow(Math.sin(Math.PI * prog(t, 3.25, 3.7)), 3);
    if (t < 3.6) camPath(camera, [{ t: 0, pos: [3.2, 1.4, 10.5], look: [-2.2, .3, -1.5], fov: 34 }, { t: 3.6, pos: [2.0, .8, 6.2], look: [-.4, 0, 0], fov: 32 }], t, E.inOutSine);
    else {
      const k = E.inOutCubic(prog(t, 3.6, 5.0));
      const from = V(2.0, .8, 6.2), to = V(head.x - 4.2, 1.0 + .2 * Math.sin(t * .7), 3.6);
      camera.position.copy(from.lerp(to, k)); camera.lookAt(V(-.4, 0, 0).lerp(V(head.x + 1.2, 0, 0), k)); camera.fov = lerp(32, 36, k); camera.updateProjectionMatrix();
    }
    dust.update(t);
    st.render(t);
  };
});

// ======================================================================
// S4 — Hope light sweep (on black: use Screen / Add over client footage)
// ======================================================================
clip('C1_S4_Hope_LightSweep_onBlack', 3, 'black', 'แสงทอง Anamorphic กวาดผ่านจอ + ประกาย (พื้นดำ ใช้ Blend Mode Screen/Add ทับภาพลูกค้า)', async () => {
  const st = new Stage({ overlay: true, bloom: .7 });
  const { scene, camera } = st; camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
  const streaks = [0, 1, 2].map(i => { const m = new THREE.SpriteMaterial({ map: (i ? glowTex() : null) || undefined, color: hdr(COL.gold, 1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }); return m; });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(64, 512, (g, w, h) => { const r = g.createLinearGradient(0, 0, w, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, 'band'), color: hdr(COL.gold, .9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  band.scale.set(3.2, 14, 1); band.rotation.z = -.38; scene.add(band);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), band.material.clone()); core.material.color = hdr(new THREE.Color('#FFF3D0'), 1.6); core.scale.set(.35, 14, 1); core.rotation.z = -.38; scene.add(core);
  const fl = makeFlare(scene, COL.gold);
  const spark = dustField(scene, 500, [16, 9, 4], { size: 40, focus: 10, color: COL.gold, k: 2, seed: 9, drift: [.1, .3, 0] });
  return t => {
    const p = E.inOutSine(prog(t, 0, 2.4)), x = lerp(-11, 11, p);
    band.position.x = core.position.x = x;
    band.material.opacity = core.material.opacity = Math.sin(Math.PI * prog(t, 0, 2.7));
    fl.set(V(x * .6, 1.2 - p * 1.6, 1), Math.sin(Math.PI * prog(t, .2, 2.6)) * 1.1, 18);
    spark.mat.uniforms.uAlpha.value = Math.sin(Math.PI * prog(t, 0, 3));
    spark.update(t); st.render(t);
  };
});

// ======================================================================
// S4 — thread streaks + golden 3D "48" (count 0 -> 48)
// ======================================================================
clip('C1_S4_Counter_48', 9, 'opaque', 'เส้นแสงพุ่งผ่านกล้องอย่างรวดเร็ว → ตัวเลขทอง 3D นับ 0→48 (จบที่ 3.4 วิ)', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .03);
  skyDome(scene, '#03211C', '#000403', [0, .1, -1], '#0C5545');
  lights(scene, { rim: 90, rim2: 60 });
  const grid = groundGrid(scene, { y: -1.6, scale: 1.2, radius: 22, color: COL.gold, k: .35 });
  const streaks = [...Array(14)].map((_, i) => {
    const y = (hash(i) - .5) * 5, x = (hash(i + 4) - .5) * 9;
    const c = new THREE.CatmullRomCurve3([V(x * 1.5, y * 1.4, -30), V(x, y, -10), V(x * .6, y * .6, 4), V(x * .4, y * .4, 14)]);
    return { th: new Thread(scene, c, { radius: .03 + hash(i + 2) * .03, segs: 200, color: i % 4 ? COL.emerald : COL.gold, k: 2.6, headSize: .6 }), st: hash(i + 7) * .9 };
  });
  const goldMat = chromeMat('#F2C46A', { roughness: .16, env: 1.2, emissive: hdr(COL.goldDeep, .05) });
  const num = numberRig(scene, '48', { size: 2.6, depth: .6, mat: goldMat, fixed: true, gap: .05 });
  const flare = makeFlare(scene, COL.gold);
  const burst = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), color: hdr(COL.gold, 1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(burst);
  const dust = dustField(scene, 1500, [22, 10, 22], { size: 60, focus: 9, color: COL.gold, k: 1, seed: 21 });
  return t => {
    streaks.forEach(s => { const u = prog(t, s.st * .7, s.st * .7 + 1.1); s.th.set(clamp(u * 1.25) ** 2, clamp((u - .3) / .7) ** 2); });
    const a = E.outQuint(prog(t, 1.2, 3.6));
    num.group.position.set(0, .1, lerp(-30, 0, a)); num.group.rotation.y = lerp(-.9, 0, E.outCubic(prog(t, 1.2, 4.2))) + .03 * Math.sin(t * .7);
    num.group.visible = t > 1.15;
    num.show(String(Math.round(48 * E.outExpo(prog(t, 1.3, 3.4)))).padStart(2, ' '));
    const b = prog(t, 3.4, 4.4); burst.visible = b > 0 && b < 1; burst.scale.setScalar(2 + 14 * E.outCubic(b)); burst.material.opacity = 1 - b; burst.lookAt(camera.position);
    const sp = prog(t, 4.6, 6.4); flare.set(V(lerp(-3.4, 3.4, E.inOutSine(sp)), 1.2, .6), Math.sin(Math.PI * sp) * .8, 12);
    camPath(camera, [{ t: 0, pos: [0, .4, 9], look: [0, .2, 0], fov: 36 }, { t: 3.4, pos: [.6, .5, 8.2], look: [0, .1, 0], fov: 32 }, { t: 9, pos: [.2, .3, 7.0], look: [0, .1, 0], fov: 31 }], t, E.inOutSine);
    grid.mat.uniforms.uA.value = prog(t, 1, 3);
    dust.update(t); st.render(t);
  };
});

// ======================================================================
// S5 — 3D network growing from one thread
// ======================================================================
clip('C1_S5_Network_Branching', 12, 'opaque', 'เส้นหลักแตกกิ่งเป็นเครือข่าย 3D ปลายกิ่งเป็นดวงแสง กล้องเคลื่อนผ่านแล้วถอยออกเห็นเครือข่ายทั้งหมด', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .04);
  skyDome(scene, '#03211C', '#000403', [.3, .3, -1], '#0C5545');
  lights(scene);
  const r = rng(424242), branches = [], nodes = [];
  function grow(p, dir, len, depth, t0) {
    const end = p.clone().add(dir.clone().multiplyScalar(len));
    const bend = V((r() - .5), (r() - .5), (r() - .5)).multiplyScalar(len * .35);
    const curve = new THREE.CatmullRomCurve3([p.clone(), p.clone().lerp(end, .5).add(bend), end]);
    const dur = .85 + r() * .4;
    branches.push({ th: new Thread(scene, curve, { radius: Math.max(.012, .06 - depth * .011), segs: 90, k: 2.4 - depth * .2, headSize: .5 - depth * .06 }), t0, dur });
    if (depth >= 4) { nodes.push({ p: end, t: t0 + dur, s: .16 + r() * .1 }); return; }
    const kids = depth === 0 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const nd = dir.clone().applyAxisAngle(V(0, 0, 1), (depth === 0 ? (k - 1) * .7 : (k ? .5 : -.5)) + (r() - .5) * .3).applyAxisAngle(V(0, 1, 0), (r() - .5) * .9).normalize();
      grow(end, nd, len * (.74 + r() * .1), depth + 1, t0 + dur * .85);
    }
    if (depth >= 2 && r() > .5) nodes.push({ p: end, t: t0 + dur, s: .1 + r() * .06 });
  }
  grow(V(-7, 0, 0), V(1, 0, 0), 3.4, 0, .2);
  const orbMat = new THREE.MeshPhysicalMaterial({ color: '#0E3B33', metalness: .1, roughness: .05, transmission: 0, clearcoat: 1, emissive: hdr(COL.emerald, .25) });
  const orbGeo = new THREE.SphereGeometry(1, 32, 16);
  const orbs = nodes.map(n => {
    const m = new THREE.Mesh(orbGeo, orbMat); m.position.copy(n.p); scene.add(m);
    const g = addSprite(scene, COL.emerald, n.s * 6, 1.1); g.position.copy(n.p);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), color: hdr(COL.mint, 1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); ring.position.copy(n.p); scene.add(ring);
    return { ...n, m, g, ring };
  });
  const dust = dustField(scene, 2000, [30, 14, 18], { size: 60, focus: 7, seed: 8 });
  return t => {
    branches.forEach(b => b.th.set(E.outCubic(prog(t, b.t0, b.t0 + b.dur))));
    orbs.forEach((o, i) => {
      const p = E.outBack(prog(t, o.t, o.t + .5), 2);
      o.m.scale.setScalar(Math.max(.001, o.s * p)); o.m.visible = p > 0; o.g.material.opacity = clamp(p);
      const u = ((t - o.t) * .6 + hash(i)) % 1; o.ring.visible = t > o.t; o.ring.scale.setScalar(o.s * (2 + u * 5)); o.ring.material.opacity = (1 - u) * .7; o.ring.lookAt(camera.position);
    });
    camPath(camera, [
      { t: 0, pos: [-8.2, .8, 3.0], look: [-5.5, 0, 0], fov: 34 },
      { t: 4.5, pos: [-3.5, 1.4, 6.5], look: [-.5, 0, 0], fov: 34 },
      { t: 12, pos: [1.5, 2.2, 15.5], look: [1.5, 0, 0], fov: 34 },
    ], t, E.inOutSine);
    dust.update(t); st.render(t);
  };
});

// ======================================================================
// S5 — growth columns 48 → 60 → 80 → 92 people/year
// ======================================================================
clip('C1_S5_Growth_48-60-80-92', 12, 'opaque', 'เสาแก้ว 3D สูงขึ้นทีละต้น 48 ➔ 60 ➔ 80 ➔ 92 คน/ปี เส้นเขียวไต่ตามยอดเสา (ตัวเลขขึ้นที่ 0.6 / 3.1 / 5.6 / 8.1 วิ)', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .035);
  skyDome(scene, '#03211C', '#000403', [0, .2, -1], '#0C5545');
  lights(scene, { rim: 80, rim2: 40 });
  const grid = groundGrid(scene, { y: 0, scale: 1, radius: 26 });
  const DATA = [48, 60, 80, 92], times = [.6, 3.1, 5.6, 8.1], GAP = 3.2, HMAX = 4.6;
  const cols = DATA.map((v, i) => {
    const h = v / 92 * HMAX, x = i * GAP;
    const g = new THREE.Group(); g.position.set(x, 0, 0); scene.add(g);
    const box = new THREE.BoxGeometry(1.5, h, 1.5); box.translate(0, h / 2, 0);
    const glass = new THREE.Mesh(box, new THREE.MeshPhysicalMaterial({ color: '#0C3F36', metalness: .1, roughness: .08, clearcoat: 1, transparent: true, opacity: .55, emissive: hdr(COL.emeraldDeep, .2), envMapIntensity: 1.2 }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: hdr(i === 3 ? COL.gold : COL.mint, 2.2) }));
    const top = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ color: hdr(i === 3 ? COL.gold : COL.emerald, 1.4), transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
    top.rotation.x = -Math.PI / 2; top.position.y = h + .001;
    g.add(glass, edges, top);
    const label = numberRig(scene, String(v), { size: .9, depth: .22, mat: i === 3 ? chromeMat('#F2C46A', { roughness: .16 }) : chromeMat('#DDEFE9', { roughness: .2 }), fixed: true });
    label.show(String(v)); label.group.position.set(x, h + .85, 0);
    return { g, h, x, label };
  });
  const unit = textSprite(scene, [{ s: 'คน/ปี', size: 64, weight: 600, color: '#F5C76B' }], .75); unit.position.set(3 * GAP + 1.55, cols[3].h + .7, 0);
  const pts = [V(-3, .02, .8)];
  cols.forEach((c, i) => { pts.push(V(c.x - .75, i ? cols[i - 1].h : .02, .8), V(c.x - .75, c.h, .8), V(c.x + .75, c.h, .8)); });
  const th = new Thread(scene, new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .02), { radius: .035, segs: 900, headSize: .7, taper: false });
  const stepU = cols.map(c => { let best = 0, bd = 1e9; for (let u = 0; u <= 1; u += .002) { const p = th.curve.getPointAt(u); const d = Math.abs(p.x - c.x) + Math.abs(p.y - c.h) * 3; if (d < bd) { bd = d; best = u; } } return best; });
  const dust = dustField(scene, 1600, [30, 12, 20], { size: 60, focus: 9, center: [5, 3, 0], seed: 13 });
  return t => {
    cols.forEach((c, i) => {
      const p = E.outExpo(prog(t, times[i] - .4, times[i] + .5));
      c.g.scale.set(1, Math.max(.001, p), 1); c.g.visible = p > 0;
      const lp = E.outBack(prog(t, times[i] + .05, times[i] + .55), 1.6);
      c.label.group.visible = lp > 0; c.label.group.scale.setScalar(Math.max(.001, lp)); c.label.group.position.y = c.h * p + .85;
      c.label.group.rotation.y = .25 * (1 - lp);
    });
    let u = 0;
    for (let i = 0; i < 4; i++) if (t >= (i ? times[i - 1] : 0)) u = lerp(i ? stepU[i - 1] : 0, stepU[i], E.inOutCubic(prog(t, (i ? times[i - 1] : 0) + .1, times[i] + .1)));
    if (t > times[3] + .1) u = lerp(stepU[3], 1, E.outCubic(prog(t, times[3] + .1, times[3] + .9)));
    th.set(u);
    unit.material.opacity = E.outCubic(prog(t, times[3] + .4, times[3] + 1));
    const cx = lerp(0, 3 * GAP, E.inOutSine(prog(t, 0, 9.2))), cy = lerp(1.2, 3.4, E.inOutSine(prog(t, 0, 9.2)));
    camera.position.set(cx - 3.2 - (t > 9 ? E.inOutSine(prog(t, 9, 12)) * 2 : 0), cy + 1.6, 9.5 + (t > 9 ? E.inOutSine(prog(t, 9, 12)) * 4 : 0));
    camera.lookAt(cx - (t > 9 ? E.inOutSine(prog(t, 9, 12)) * 3.5 : 0) + .6, cy, 0); camera.fov = 34; camera.updateProjectionMatrix();
    grid.mat.uniforms.uA.value = 1;
    dust.update(t); st.render(t);
  };
});

// ======================================================================
// S7 — 580+ shatters into a mosaic wall of alumni portraits (DRAFT placeholders)
// ======================================================================
clip('C1_S7_580_to_Mosaic_DRAFT', 9, 'opaque', 'DRAFT — 580+ แตกเป็นกระเบื้องนับร้อยชิ้น ลอยไปเรียงเป็นกำแพง Mosaic ใบหน้าศิษย์เก่า (ใช้ภาพหุ่นแทน รอรูปจริง)', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .025);
  skyDome(scene, '#03211C', '#000403', [0, .2, -1], '#0C5545');
  lights(scene);
  const num = numberRig(scene, '580+', { size: 1.6, depth: .45, gap: .03, fixed: true }); num.show('580+');
  // sample the number silhouette in 2D to seed tile start positions
  const c = document.createElement('canvas'); c.width = 1200; c.height = 400; const g = c.getContext('2d');
  g.font = '800 330px Kanit'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('580+', 600, 215);
  const d = g.getImageData(0, 0, 1200, 400).data, seeds = [];
  for (let y = 0; y < 400; y += 9) for (let x = 0; x < 1200; x += 9) if (d[(y * 1200 + x) * 4 + 3] > 128) seeds.push(V((x - 600) / 1200 * 6.6, -(y - 200) / 400 * 2.2, 0));
  const COLS = 26, ROWS = 14, TS = .62, N = COLS * ROWS;
  const atlas = canvasTex(1024, 1024, (g2, w) => {
    const cell = w / 4;
    for (let k = 0; k < 16; k++) {
      const x = (k % 4) * cell, y = Math.floor(k / 4) * cell, hue = 150 + (k * 37) % 40, l = 18 + (k * 13) % 16;
      const gr = g2.createLinearGradient(x, y, x, y + cell); gr.addColorStop(0, `hsl(${hue},45%,${l + 12}%)`); gr.addColorStop(1, `hsl(${hue},55%,${l}%)`);
      g2.fillStyle = gr; g2.fillRect(x, y, cell, cell);
      g2.fillStyle = `hsla(${hue},40%,${l + 35}%,.55)`;
      g2.beginPath(); g2.arc(x + cell / 2, y + cell * .42, cell * .17, 0, Math.PI * 2); g2.fill();
      g2.beginPath(); g2.ellipse(x + cell / 2, y + cell * .95, cell * .32, cell * .3, 0, Math.PI, 0); g2.fill();
      g2.strokeStyle = 'rgba(0,0,0,.6)'; g2.lineWidth = 6; g2.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    }
  }, 'atlas');
  const geo = new THREE.PlaneGeometry(TS * .94, TS * .94);
  const uvOff = new Float32Array(N * 2); for (let i = 0; i < N; i++) { const k = Math.floor(hash(i * 3.3) * 16); uvOff[i * 2] = (k % 4) / 4; uvOff[i * 2 + 1] = 1 - (Math.floor(k / 4) + 1) / 4; }
  geo.setAttribute('uvOff', new THREE.InstancedBufferAttribute(uvOff, 2));
  const mat = new THREE.MeshStandardMaterial({ map: atlas, roughness: .5, metalness: .1, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: atlas, emissiveIntensity: .35 });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 uvOff;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = uv*0.25 + uvOff;\n#endif\n#ifdef USE_EMISSIVEMAP\nvEmissiveMapUv = uv*0.25 + uvOff;\n#endif');
  };
  const tiles = new THREE.InstancedMesh(geo, mat, N); scene.add(tiles);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), Eu = new THREE.Euler();
  const flare = makeFlare(scene, COL.mint);
  const dust = dustField(scene, 1400, [30, 14, 20], { size: 60, focus: 9, seed: 31 });
  return t => {
    const shatter = prog(t, 1.25, 1.6);
    num.group.visible = shatter < 1; num.group.scale.setScalar(lerp(.94, 1, E.outCubic(prog(t, 0, 1.2))) * (1 + .06 * shatter));
    num.mat.opacity = 1;
    flare.set(V(0, 0, .5), Math.sin(Math.PI * prog(t, 1.05, 1.75)) * 1.3, 14);
    for (let i = 0; i < N; i++) {
      const gx = (i % COLS - (COLS - 1) / 2) * TS, gy = ((ROWS - 1) / 2 - Math.floor(i / COLS)) * TS;
      const s0 = seeds[(i * 7) % seeds.length];
      const dl = hash(i) * 1.1, fly = E.inOutCubic(prog(t, 1.9 + dl, 3.9 + dl));
      const appear = E.outCubic(prog(t, 1.3 + hash(i + 5) * .25, 1.6 + hash(i + 5) * .25));
      const arc = Math.sin(Math.PI * fly) * (1.5 + hash(i + 9) * 2.5);
      P.set(lerp(s0.x, gx, fly), lerp(s0.y, gy, fly), lerp(0, -3.5, fly) + arc);
      Eu.set(lerp(hash(i + 1) * 2 - 1, 0, fly) * 1.2, (1 - fly) * Math.PI * (hash(i + 2) > .5 ? 1 : -1), 0); Q.setFromEuler(Eu);
      const sc = appear * lerp(.22, 1, fly); S.set(sc, sc, sc);
      M.compose(P, Q, S); tiles.setMatrixAt(i, M);
    }
    tiles.instanceMatrix.needsUpdate = true;
    camPath(camera, [{ t: 0, pos: [0, 0, 7.0], look: [0, 0, 0], fov: 34 }, { t: 2.0, pos: [.3, .1, 7.6], look: [0, 0, -.5], fov: 34 }, { t: 9, pos: [-.6, -.2, 9.5], look: [0, 0, -3.5], fov: 36 }], t, E.inOutSine);
    const sw = prog(t, 5.6, 8.0); if (sw > 0) flare.set(V(lerp(-8, 8, E.inOutSine(sw)), 1.8, -3.2), Math.sin(Math.PI * sw) * .9, 18);
    dust.update(t); st.render(t);
  };
});

// ======================================================================
// S8 — thread runs along the floor and stops in front of the student (on black)
// ======================================================================
clip('C1_S8_Floor_Thread_onBlack', 7, 'black', 'เส้นเขียววิ่งตามพื้นจากระยะไกลมาหยุดตรงหน้าคน (พื้นดำ ใช้ Screen/Add + Corner Pin ให้เข้ากับพื้นใน Footage)', async () => {
  const st = new Stage({ overlay: true });
  const { scene, camera } = st;
  camera.position.set(-.4, 1.6, 4.4); camera.lookAt(.3, 0, -5);
  const c = new THREE.CatmullRomCurve3([V(3.5, .01, -40), V(1.6, .01, -16), V(.5, .01, -5.5), V(.05, .01, -.8), V(0, .01, .6)]);
  const th = new Thread(scene, c, { radius: .045, segs: 700, headSize: .9, taperLen: .06 });
  const embers = dustField(scene, 160, [.8, 1.6, .8], { size: 30, focus: 4, seed: 4, drift: [0, .35, 0], center: [0, .8, .6], k: 1.6 });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), color: hdr(COL.mint, 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, .02, .6); scene.add(ring);
  return t => {
    const p = E.inOutCubic(prog(t, .2, 3.6)); th.set(p);
    th.headAlpha = 1;
    const settle = prog(t, 3.6, 4.4);
    embers.mat.uniforms.uAlpha.value = settle; embers.update(t);
    const u = ((t - 3.6) * .5) % 1; ring.visible = t > 3.6; ring.scale.setScalar(.3 + u * 2.2); ring.material.opacity = (1 - u) * .8;
    st.render(t);
  };
});

// ======================================================================
// S8 — light tunnel burst to camera (transition)
// ======================================================================
clip('C1_S8_Thread_BurstToCamera', 2.5, 'opaque', 'อุโมงค์เส้นแสงพุ่งเข้ากล้อง + แฟลชขาวเขียว (ตัดเข้า End card ที่ ~1.3 วิ)', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  skyDome(scene, '#03211C', '#000403', [0, 0, -1], '#0C5545');
  const lines = [...Array(36)].map((_, i) => {
    const a = i / 36 * Math.PI * 2 + hash(i) * .2, r = 1.2 + hash(i + 3) * 2.6;
    const c = new THREE.LineCurve3(V(Math.cos(a) * r, Math.sin(a) * r, -80), V(Math.cos(a) * r * .9, Math.sin(a) * r * .9, 6));
    return { th: new Thread(scene, c, { radius: .02 + hash(i) * .02, segs: 120, color: i % 6 ? COL.emerald : COL.gold, k: 2.4, headSize: .4 }), d: hash(i + 7) * .3 };
  });
  const main = new Thread(scene, new THREE.LineCurve3(V(0, -.2, -60), V(0, 0, 5)), { radius: .08, segs: 200, headSize: 2.2 });
  return t => {
    lines.forEach(l => { const u = prog(t, l.d * .6, 1.15 + l.d * .3), p = u * u; l.th.set(p, clamp(p - .3)); });
    { const u = prog(t, 0, 1.25); main.set(u * u); }
    camera.position.set(0, 0, lerp(10, 4, E.inCubic(prog(t, 0, 1.4)))); camera.lookAt(0, 0, -10); camera.fov = lerp(40, 70, E.inCubic(prog(t, .4, 1.4))); camera.updateProjectionMatrix();
    st.finish.uniforms.uFlash.value = Math.pow(Math.sin(Math.PI * prog(t, 1.0, 2.2)), 1.5);
    st.render(t);
  };
});

// ======================================================================
// S8 — end card: thread forms a ring (logo space), 20 YEARS OF MedSUT
// ======================================================================
clip('C1_S8_EndCard_20Years_MedSUT', 8, 'opaque', 'End card — เส้นวนเป็นวงแหวนแสง (เว้นกลางวงไว้วางโลโก้) + "20 YEARS OF MedSUT" ทอง 3D', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  scene.fog = new THREE.FogExp2('#020B0A', .02);
  skyDome(scene, '#05302A', '#000403', [0, .4, -1], '#127A63');
  lights(scene, { rim: 70, rim2: 50 });
  camera.position.set(0, .15, 9); camera.lookAt(0, .15, 0);
  const R = 1.55, cy = .95;
  const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push(V(lerp(-9, -R, E.inOutSine(u)), lerp(-2.5, cy, E.inOutSine(u)) + Math.sin(u * Math.PI) * .9, lerp(-6, 0, u))); }
  for (let i = 1; i <= 160; i++) { const a = Math.PI + i / 160 * Math.PI * 2; pts.push(V(Math.cos(a) * R, cy + Math.sin(a) * R, 0)); }
  const th = new Thread(scene, new THREE.CatmullRomCurve3(pts), { radius: .03, segs: 1200, headSize: .7, taper: false });
  const ringLen = (2 * Math.PI * R) / th.curve.getLength();
  // soft rays behind the ring
  const rays = new THREE.Group(); rays.position.set(0, cy, -1.5); scene.add(rays);
  for (let i = 0; i < 14; i++) { const b = lightBeam(rays, i % 3 ? COL.emerald : COL.gold, 6, .5, .22); b.group.rotation.z = i / 14 * Math.PI * 2; b.group.children.forEach(p => p.rotation.y = 0); }
  const title = new THREE.Mesh(textGeo('20 YEARS OF MedSUT', { size: .36, weight: 700, depth: .1 }), chromeMat('#F2C46A', { roughness: .15, env: 1.2 }));
  title.position.set(0, -1.35, 0); scene.add(title);
  const sub = textSprite(scene, [{ s: 'สำนักวิชาแพทยศาสตร์  มหาวิทยาลัยเทคโนโลยีสุรนารี', size: 46, weight: 400, fam: 'Sarabun', color: '#BFF5DF' }], .3); sub.position.set(0, -1.95, 0);
  const line = new Thread(scene, new THREE.LineCurve3(V(-2.2, -1.68, 0), V(2.2, -1.68, 0)), { radius: .006, segs: 100, head: false, taper: false, k: 1.6 });
  const flare = makeFlare(scene, COL.gold);
  const dust = dustField(scene, 1200, [20, 10, 14], { size: 55, focus: 9, seed: 17 });
  return t => {
    const p = E.inOutCubic(prog(t, 0, 2.3));
    th.set(p, E.inOutCubic(prog(t, .9, 2.6)) * (1 - ringLen));
    rays.rotation.z = t * .05; rays.children.forEach(g => g.children.forEach(m => m.material.opacity = .3 * E.outCubic(prog(t, 2.0, 3.2))));
    const ti = E.outCubic(prog(t, 2.4, 3.4));
    title.position.y = lerp(-1.55, -1.35, ti); title.scale.setScalar(lerp(.96, 1, ti)); title.visible = ti > 0; title.material.opacity = ti; title.material.transparent = ti < 1;
    sub.material.opacity = E.outCubic(prog(t, 3.0, 3.9)); line.set(E.inOutCubic(prog(t, 2.8, 3.8)));
    const sw = prog(t, 4.2, 6.0); flare.set(V(lerp(-2.6, 2.6, E.inOutSine(sw)), -1.05, .4), Math.sin(Math.PI * sw) * .45, 7);
    camera.position.z = lerp(9.3, 8.7, E.inOutSine(prog(t, 0, 8)));
    dust.update(t); st.render(t);
  };
});

// ======================================================================
// Support — background plate
// ======================================================================
clip('C1_UTIL_BG_Plate', 10, 'opaque', 'พื้นหลังเขียวเข้ม + Bokeh + ลำแสงจาง เคลื่อนช้า (Loop ได้)', async () => {
  const st = new Stage({});
  const { scene, camera } = st;
  skyDome(scene, '#05302A', '#000403', [0, .3, -1], '#0E5E4C');
  camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0);
  const rays = new THREE.Group(); rays.position.set(3, 6, -8); scene.add(rays);
  for (let i = 0; i < 6; i++) { const b = lightBeam(rays, COL.emerald, 18, 1.2, .12); b.group.rotation.z = Math.PI + (i - 2.5) * .12; }
  const dust = dustField(scene, 1800, [24, 14, 16], { size: 80, focus: 6, seed: 2 });
  return t => { rays.rotation.z = .05 * Math.sin(t * .3); dust.update(t); st.render(t); };
});
