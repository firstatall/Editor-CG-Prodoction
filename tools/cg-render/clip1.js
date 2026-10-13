// คลิปที่ 1 — "จากก้าวแรก สู่ 20 ปีของ 'หมอดีแห่งแผ่นดิน'" — Green Thread motif
// ---------------------------------------------------------------------------

// ===== Thailand map helpers =====
const MAP = { cx: 960, cy: 540, scale: 1 };
function geo(lat, lon) { return [(lon - GEO.cLon) * GEO.k * GEO.s, -(lat - GEO.cLat) * GEO.s]; }
const SUT = geo(14.88, 102.02); // มทส. นครราชสีมา
const PROVINCES = [[13.75,100.50],[13.86,100.51],[14.35,100.57],[18.79,98.98],[19.91,99.83],[18.29,99.49],[16.82,100.26],[15.70,100.14],[16.43,102.83],[17.41,102.79],[17.88,102.74],[17.49,101.72],[17.16,104.15],[17.41,104.78],[16.54,104.72],[15.24,104.85],[15.12,104.32],[14.88,103.49],[14.99,103.10],[15.81,102.03],[16.05,103.65],[16.18,103.30],[16.43,103.51],[15.79,104.15],[15.86,104.63],[18.78,100.78],[18.14,100.14],[17.01,99.82],[16.88,99.13],[19.30,97.97],[16.42,101.16],[14.80,100.65],[14.53,100.91],[14.05,101.37],[13.82,102.07],[13.36,100.98],[12.68,101.28],[12.61,102.10],[12.24,102.52],[14.02,99.53],[13.54,99.82],[13.11,99.94],[11.81,99.80],[10.49,99.18],[9.14,99.33],[8.43,99.96],[8.09,98.91],[7.88,98.39],[7.56,99.61],[7.62,100.08],[7.01,100.47],[6.54,101.28],[6.87,101.25],[6.43,101.82],[6.62,100.07],[9.96,98.64],[15.38,100.02],[15.19,100.13],[16.48,99.52],[16.44,100.35],[17.20,102.44],[18.36,103.65],[14.21,101.21],[13.69,101.07],[14.47,100.12],[13.82,100.06],[19.17,99.90],[17.62,100.10],[15.47,102.60],[14.60,102.40]].map(([a, b]) => geo(a, b));
const MAP_PATHS = GEO.polys.map(p => new Path(p.concat([p[0]])));

// ===== S1 : Map + 580+ =====
clip('C1_S1-CG02-04_Map_Thailand_580', 12, (ctx, t) => {
  // camera: gentle push-in toward มทส. then pull back to center for the number
  const push = E.inOutSine(prog(t, 0, 6.2));
  const toNum = E.inOutCubic(prog(t, 6.2, 7.6));
  const sc = lerp(.94, 1.06, push) * lerp(1, .78, toNum);
  const fx = lerp(0, SUT[0], push * (1 - toNum)), fy = lerp(0, SUT[1], push * (1 - toNum));
  const mapShiftX = 0;
  const mapFade = 1 - .72 * toNum; // map dims behind the centred number
  ctx.save();
  ctx.translate(MAP.cx + mapShiftX, MAP.cy); ctx.scale(sc, sc); ctx.translate(-fx, -fy);

  // outline draw-on
  const pOut = E.inOutCubic(prog(t, 0, 1.6));
  ctx.save(); ctx.globalAlpha = mapFade;
  const pFill = prog(t, 1.2, 2.2);
  if (pFill > 0) {
    ctx.fillStyle = hexA(C.green, .10 * pFill);
    GEO.polys.forEach(p => { ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); });
  }
  ctx.lineWidth = 2.2 / sc; ctx.strokeStyle = hexA(C.white, .85); ctx.lineJoin = 'round';
  ctx.shadowColor = hexA(C.glow, .6); ctx.shadowBlur = 10;
  MAP_PATHS.forEach(mp => { const s = mp.sub(0, mp.len * pOut); if (s.length > 1) strokePts(ctx, s); });
  ctx.restore();

  // province light dots
  PROVINCES.forEach((q, i) => {
    const st = .9 + hash(i * 3.1) * 1.8;
    const pp = prog(t, st, st + .35); if (pp <= 0) return;
    const reached = prog(t, 3.0 + hash(i * 7.7) * 2.2 + .6, 3.0 + hash(i * 7.7) * 2.2 + 1.0);
    const s = E.outBack(pp) * (1 + .6 * reached);
    const tw = .75 + .25 * Math.sin(t * 4 + i);
    const r = 5.5 * s / sc * 1.4;
    ctx.save(); ctx.globalAlpha = mapFade * tw;
    const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 3.2);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(.3, C.glow); g.addColorStop(1, hexA(C.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], r * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // green threads from มทส. to each dot
  PROVINCES.forEach((q, i) => {
    const st = 3.0 + hash(i * 7.7) * 2.2;
    const pp = E.outCubic(prog(t, st, st + 1.0)); if (pp <= 0) return;
    const mx = (SUT[0] + q[0]) / 2, my = (SUT[1] + q[1]) / 2;
    const dx = q[0] - SUT[0], dy = q[1] - SUT[1];
    const bend = (hash(i) - .5) * .5;
    const path = new Path(cubicPts(SUT, [mx - dy * bend, my + dx * bend], [mx - dy * bend, my + dx * bend], q, 30));
    drawThread(ctx, path, { head: pp, width: 2.4 / sc, alpha: mapFade * .9, glow: .7, t, sparkSize: .9, spark: pp < 1, filament: false });
  });

  // มทส. pin
  const pin = E.outBack(prog(t, 2.2, 2.7));
  if (pin > 0) {
    ctx.save(); ctx.globalAlpha = mapFade;
    const pulse = (t * .8) % 1;
    ctx.strokeStyle = hexA(C.glow, (1 - pulse) * .8); ctx.lineWidth = 2 / sc;
    ctx.beginPath(); ctx.arc(SUT[0], SUT[1], (14 + pulse * 40) / sc, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.green; ctx.shadowColor = C.glow; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(SUT[0], SUT[1], 10 * pin / sc, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SUT[0], SUT[1], 4 * pin / sc, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const lab = prog(t, 2.5, 3.0) * (1 - prog(t, 6.0, 6.5));
    if (lab > 0) {
      ctx.save(); ctx.translate(SUT[0] + 22 / sc, SUT[1] - 18 / sc); ctx.scale(1 / sc, 1 / sc);
      text(ctx, 'มทส.', 0, 0, { size: 34, weight: 600, alpha: lab * mapFade });
      text(ctx, 'นครราชสีมา', 0, 34, { size: 22, weight: 400, fam: FONT_BODY, alpha: lab * mapFade * .85, color: C.glow });
      ctx.restore();
    }
  }
  ctx.restore();

  // 580+ number block (right side)
  // threads gather from the dots into the centre of frame -> become "580+"
  const nx = 900, ny = 640, gx = 960, gy = 540;
  PROVINCES.forEach((q, i) => {
    if (i % 2) return;
    const st = 6.0 + hash(i * 5.3) * .6, pp = E.inCubic(prog(t, st, st + .8));
    if (pp <= 0 || pp >= 1) return;
    const sx = MAP.cx + mapShiftX + (q[0] - fx) * sc, sy = MAP.cy + (q[1] - fy) * sc;
    const bend = (hash(i + 2) - .5) * 300;
    const path = new Path(cubicPts([sx, sy], [sx + bend, sy - bend * .4], [gx - bend * .3, gy + bend * .3], [gx, gy], 30));
    drawThread(ctx, path, { head: pp, tail: E.inCubic(prog(t, st + .25, st + .85)), width: 3, t, sparkSize: .8, filament: false });
  });
  const gather = prog(t, 6.6, 7.2);
  if (gather > 0 && gather < 1) drawSpark(ctx, gx, gy, 6 + 10 * gather, t, Math.sin(Math.PI * gather), C.glow);
  const nIn = prog(t, 6.9, 7.4);
  if (nIn > 0) {
    const v = 580 * E.outExpo(prog(t, 6.9, 8.6));
    const burst = prog(t, 8.6, 9.6);
    if (burst > 0 && burst < 1) {
      ctx.save(); ctx.strokeStyle = hexA(C.glow, (1 - burst) * .7); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(gx, gy, 160 + 300 * E.outCubic(burst), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = ease(nIn);
    const r = rollNumber(ctx, v, nx, ny, { size: 300, final: 580, color: C.white, glow: hexA(C.green, .9), glowBlur: 45 });
    ctx.restore();
    const plus = E.outBack(prog(t, 8.55, 8.9));
    if (plus > 0) {
      ctx.save(); ctx.translate(r.x0 + r.total + 80, ny - 140); ctx.scale(plus, plus);
      text(ctx, '+', 0, 60, { size: 200, weight: 700, color: C.green, align: 'center', glow: C.glow });
      ctx.restore();
    }
  }
}, { desc: 'แผนที่ไทย + จุดแสง + เส้นเขียวจาก มทส. → เส้นรวมตัวกลางจอเป็นตัวเลข 580+' });

// ===== S2 : Timeline 2536 -> 2540, thread freezes =====
clip('C1_S2-CG02-07_Timeline_2536-2540_Freeze', 15, (ctx, t) => {
  const ly = 930, x0 = 150, x1 = 1770;
  const years = [2536, 2537, 2538, 2539, 2540, 2541, 2542];
  const yx = i => x0 + 40 + i * 190;
  const inA = ease(prog(t, 0, .8));
  // base line
  ctx.save(); ctx.globalAlpha = .35 * inA; ctx.strokeStyle = C.white; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, ly); ctx.lineTo(lerp(x0, x1, ease(prog(t, 0, 1.4))), ly); ctx.stroke(); ctx.restore();
  // thread progress (slow) then freeze at 2540
  const freezeAt = 10.4;
  const xHeadFinal = yx(4) + 70;
  const run = t < freezeAt ? E.inOutSine(prog(t, 1.0, 8.0)) * .62 + .38 * E.inCubic(prog(t, 8.0, freezeAt)) : 1;
  const headX = lerp(x0, xHeadFinal, Math.min(1, run));
  const frz = prog(t, freezeAt, freezeAt + .25);
  const gray = E.inOutCubic(prog(t, freezeAt + .15, freezeAt + 1.6));
  const shake = t > freezeAt && t < freezeAt + .28 ? (hash(Math.floor(t * 50)) - .5) * 10 : 0;
  const col = mixHex(C.green, C.gray, gray), gl = mixHex(C.glow, C.gray, gray);
  // ticks + year labels as the thread passes
  years.forEach((y, i) => {
    const x = yx(i); const passed = headX >= x - 4;
    const ap = passed ? 1 : .0;
    ctx.save(); ctx.globalAlpha = inA * (.35 + .65 * ap); ctx.fillStyle = passed ? col : C.white;
    ctx.fillRect(x - 1.5, ly - 14, 3, 28); ctx.restore();
    if (i <= 4) text(ctx, String(y), x, ly + 52, { size: 26, weight: 400, fam: FONT_BODY, align: 'center', alpha: inA * (.25 + .75 * ap), color: passed ? C.white : C.white });
  });
  const tp = new Path([[x0, ly], [headX, ly + shake]]);
  drawThread(ctx, tp, { head: 1, width: lerp(4, 3, gray), color: col, glowColor: gl, glow: 1 - gray * .8, t, spark: false, alpha: inA });
  const sparkA = 1 - prog(t, freezeAt + .05, freezeAt + .5);
  drawSpark(ctx, headX, ly + shake, 4, t, sparkA * inA, C.glow);
  // big year ticker
  const yr = 2536 + 4 * E.inOutCubic(prog(t, 7.6, 9.6));
  const yAlpha = ease(prog(t, .3, 1.1));
  ctx.save(); ctx.globalAlpha = yAlpha;
  text(ctx, 'พ.ศ.', x0, ly - 210, { size: 40, weight: 400, color: C.sepia });
  rollNumber(ctx, yr, x0, ly - 70, { size: 150, final: 2540, align: 'left', color: mixHex(C.white, '#C9CBCC', gray), weight: 700 });
  ctx.restore();
  // impact flash when 2540 lands
  const imp = prog(t, 9.6, 10.2);
  if (imp > 0 && imp < 1) { ctx.save(); ctx.globalAlpha = (1 - imp) * .5; ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, ly - 72, 440, 4); ctx.restore(); }
}, { desc: 'ปี 2536 เส้นเขียวบางเดินช้า → ปีหมุนเป็น 2540 → เส้นหยุดชะงัก Spark ดับ เปลี่ยนเป็นสีเทา (วางล่างจอทับภาพเอกสาร)' });

// ===== S3 : Braid of agencies =====
const AGENCIES = [
  { name: 'มทส.', col: C.sut, from: [-60, 180], via: [380, 260] },
  { name: 'สธ.', col: C.moph, from: [-60, 900], via: [360, 820] },
  { name: 'ศธ.', col: C.moe, from: [520, -60], via: [600, 260] },
  { name: 'แพทยสภา', col: C.tmc, from: [480, 1140], via: [560, 820] },
  { name: 'รพ.พี่เลี้ยง', col: C.hosp, from: [-60, 560], via: [300, 600] },
];
const KNOT = [760, 540];
clip('C1_S3-CG01-03_Braid_Agencies', 10, (ctx, t) => {
  // grey frozen thread from the left reaching the knot
  const gp = new Path([[-20, 540], KNOT]);
  const ignite = prog(t, 3.3, 4.0);
  drawThread(ctx, gp, { head: 1, width: 4, color: mixHex(C.gray, C.green, ignite), glowColor: C.glow, glow: ignite, spark: false, t, alpha: ease(prog(t, 0, .5)) });
  // incoming agency threads
  AGENCIES.forEach((ag, i) => {
    const st = .3 + i * .28, pp = E.inOutCubic(prog(t, st, st + 2.4));
    const fade = 1 - prog(t, 4.2, 5.2);
    if (pp <= 0 || fade <= 0) return;
    const path = new Path(splinePts([ag.from, ag.via, [KNOT[0] - 60, KNOT[1] + (i - 2) * 6], KNOT], 20));
    drawThread(ctx, path, { head: pp, width: 5, color: ag.col, glowColor: ag.col, t, alpha: fade, spark: pp < 1, sparkSize: .8 });
    // name tag following the head
    const tagA = ease(prog(t, st + .3, st + .8)) * (1 - prog(t, st + 2.2, st + 2.7));
    if (tagA > 0) {
      const e = path.at(path.len * pp);
      ctx.save(); ctx.globalAlpha = tagA;
      setFont(ctx, 30, 600); const tw = ctx.measureText(ag.name).width;
      const bx = e.x + 26, by = e.y - 58;
      roundRect(ctx, bx, by, tw + 36, 48, 24); ctx.fillStyle = hexA(C.tealDeep, .85); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = ag.col; ctx.stroke();
      ctx.restore();
      text(ctx, ag.name, bx + 18, by + 35, { size: 30, weight: 600, alpha: tagA, shadow: false });
    }
  });
  // flash at ignition
  const fl = prog(t, 3.3, 4.1);
  if (fl > 0 && fl < 1) {
    ctx.save(); const r = 40 + 220 * E.outCubic(fl);
    const g = ctx.createRadialGradient(KNOT[0], KNOT[1], 0, KNOT[0], KNOT[1], r);
    g.addColorStop(0, hexA('#FFFFFF', (1 - fl) * .9)); g.addColorStop(.4, hexA(C.glow, (1 - fl) * .5)); g.addColorStop(1, hexA(C.glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(KNOT[0], KNOT[1], r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // braided rope running right
  const rp = E.inOutCubic(prog(t, 3.5, 8.6));
  if (rp > 0) {
    const headX = lerp(KNOT[0], 2050, rp);
    const merge = prog(t, 3.8, 6.5);
    const n = AGENCIES.length, amp = 22;
    const segs = [];
    for (let x = KNOT[0]; x < headX; x += 6) segs.push(x);
    // glow under rope
    ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = C.glow; ctx.lineWidth = 46; ctx.lineCap = 'round';
    ctx.shadowColor = C.glow; ctx.shadowBlur = 40; ctx.beginPath(); ctx.moveTo(KNOT[0], KNOT[1]); ctx.lineTo(headX, KNOT[1]); ctx.stroke(); ctx.restore();
    for (let pass = 0; pass < 2; pass++) {
      AGENCIES.forEach((ag, i) => {
        const ph = i / n * Math.PI * 2;
        ctx.save(); ctx.lineCap = 'round';
        for (let j = 1; j < segs.length; j++) {
          const xa = segs[j - 1], xb = segs[j];
          const k = .045, sp = t * 6;
          const za = Math.cos(xa * k - sp + ph), zb = Math.cos(xb * k - sp + ph);
          const front = (za + zb) > 0;
          if ((pass === 0) === front) continue;
          const taperIn = clamp((xa - KNOT[0]) / 120);
          const ya = KNOT[1] + Math.sin(xa * k - sp + ph) * amp * taperIn, yb = KNOT[1] + Math.sin(xb * k - sp + ph) * amp * taperIn;
          ctx.strokeStyle = mixHex(mixHex(ag.col, C.green, merge), front ? '#FFFFFF' : '#000000', front ? .12 : .35);
          ctx.lineWidth = lerp(5, 11, taperIn);
          ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke();
        }
        ctx.restore();
      });
    }
    drawSpark(ctx, headX, KNOT[1], 10, t, 1, C.glow);
  }
}, { desc: '5 เส้นสีหน่วยงาน (มทส./สธ./ศธ./แพทยสภา/รพ.พี่เลี้ยง) พร้อมป้ายชื่อ วิ่งเข้ามาบรรจบ → จุดประกาย → ถักเป็นเกลียวเชือกวิ่งออกขวา' });

// ===== Lower thirds =====
function lowerThird(ctx, t, name, role, dur) {
  const x = 130, y = 850, inP = ease(prog(t, 0, .7)), out = E.inCubic(prog(t, dur - .6, dur));
  const nm = name ? measure(ctx, name, 46, 600) : 0, rl = role ? measure(ctx, role, 30, 500, FONT_BODY) : 0;
  const bw = Math.max(620, nm, rl) + 70;
  // thread underline
  const lp = new Path([[x - 10, y + 92], [x + bw, y + 92]]);
  drawThread(ctx, lp, { head: inP, tail: out, width: 4, t, spark: inP < .999 && out === 0 });
  // bar
  const barP = ease(prog(t, .25, .9)) * (1 - out);
  if (barP > 0) {
    ctx.save(); ctx.globalAlpha = .85 * (1 - out);
    ctx.beginPath(); ctx.rect(x, y - 30, bw * barP, 112); ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, hexA(C.tealDeep, .95)); g.addColorStop(1, hexA(C.teal, .55));
    ctx.fillStyle = g; ctx.fillRect(x, y - 30, bw, 112);
    ctx.fillStyle = C.green; ctx.fillRect(x, y - 30, 8, 112);
    ctx.restore();
  }
  const tn = ease(prog(t, .55, 1.05)) * (1 - out), tr = ease(prog(t, .7, 1.2)) * (1 - out);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y - 30, bw, 112); ctx.clip();
  if (name) text(ctx, name, x + 34, y + 22 + 30 * (1 - tn), { size: 46, weight: 600, alpha: tn, shadow: false });
  if (role) text(ctx, role, x + 34, y + 66 + 30 * (1 - tr), { size: 30, weight: 500, fam: FONT_BODY, color: C.glow, alpha: tr, shadow: false });
  ctx.restore();
}
// ===== S4 =====
clip('C1_S4-CG03-05_Counter_48_FirstClass', 9, (ctx, t) => {
  // fast streak threads
  for (let i = 0; i < 4; i++) {
    const st = .0 + i * .12, pp = E.inOutCubic(prog(t, st, st + .9)), y = 300 + i * 140 + (i % 2 ? 40 : 0);
    const path = new Path([[-100, y + 200], [2050, y - 60]]);
    drawThread(ctx, path, { head: pp, tail: E.inCubic(prog(t, st + .25, st + 1.05)), width: 5 - i * .6, t, spark: true, alpha: .9 });
  }
  const main = new Path(cubicPts([-50, 740], [500, 760], [700, 680], [1500, 680], 60));
  drawThread(ctx, main, { head: E.outCubic(prog(t, .6, 1.8)), width: 9, t, spark: prog(t, .6, 1.8) < 1 });
  const inA = ease(prog(t, 1.4, 2.0)), out = 1 - prog(t, 8.4, 9);
  const v = 48 * E.outExpo(prog(t, 1.6, 3.4));
  ctx.save(); ctx.globalAlpha = inA * out;
  rollNumber(ctx, v, 960, 600, { size: 340, final: 48, glow: hexA(C.green, .9), glowBlur: 50 });
  ctx.restore();
  const burst = prog(t, 3.4, 4.3);
  if (burst > 0 && burst < 1) { ctx.save(); ctx.strokeStyle = hexA(C.glow, (1 - burst) * .7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(960, 480, 200 + 260 * E.outCubic(burst), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}, { desc: 'เส้นสายวิ่งเร็ว + ตัวเลขหมุน 0→48 (จบที่ 3.4 วิ)' });

clip('C1_S4-CG06_Stamp_17May2549', 5, (ctx, t) => {
  const p = prog(t, .2, .45), out = prog(t, 4.5, 5);
  if (p <= 0) return;
  const s = lerp(2.2, 1, E.inCubic(p)), x = 1500, y = 820;
  ctx.save(); ctx.globalAlpha = (p < 1 ? p : 1) * (1 - out); ctx.translate(x, y); ctx.rotate(-.12); ctx.scale(s, s);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 6; roundRect(ctx, -230, -92, 460, 170, 18); ctx.stroke();
  ctx.lineWidth = 2; roundRect(ctx, -218, -80, 436, 146, 12); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = (1 - out); ctx.translate(x, y); ctx.rotate(-.12); ctx.scale(s, s);
  text(ctx, '17 พ.ค. 2549', 0, -4, { size: 62, weight: 700, color: C.gold, align: 'center', shadow: false });
  text(ctx, 'วันรายงานตัว นศพ. รุ่นแรก', 0, 48, { size: 30, weight: 500, color: C.gold, align: 'center', fam: FONT_BODY, shadow: false });
  ctx.restore();
  // impact ring
  const ir = prog(t, .45, 1.0);
  if (ir > 0 && ir < 1) { ctx.save(); ctx.strokeStyle = hexA(C.gold, 1 - ir); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 260 + ir * 120, 110 + ir * 60, -.12, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
}, { desc: 'ตราประทับวันที่ วางมุมขวาล่างบนภาพถ่ายรุ่นแรก' });

// ===== S5 =====
function buildTree() {
  const r = rng(20491), nodes = [], branches = [];
  function grow(x, y, ang, len, depth, t0) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const c1 = [x + Math.cos(ang - .3) * len * .4, y + Math.sin(ang - .3) * len * .4];
    const c2 = [x + Math.cos(ang + .25) * len * .75, y + Math.sin(ang + .25) * len * .75];
    const dur = .9 + r() * .4;
    branches.push({ path: new Path(cubicPts([x, y], c1, c2, [ex, ey], 30)), t0, dur, depth });
    if (depth >= 4) { nodes.push({ x: ex, y: ey, t: t0 + dur, rad: 30 + r() * 18 }); return; }
    const kids = depth === 0 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const spread = depth === 0 ? (k - 1) * .75 : (k ? .45 : -.45) + (r() - .5) * .3;
      grow(ex, ey, ang + spread, len * (.72 + r() * .12), depth + 1, t0 + dur * .85);
    }
    if (depth >= 2 && r() > .45) nodes.push({ x: ex, y: ey, t: t0 + dur, rad: 18 + r() * 10 });
  }
  grow(-40, 560, 0, 380, 0, .2);
  return { nodes, branches };
}
const TREE = buildTree();
clip('C1_S5-CG01_Network_Branching', 12, (ctx, t) => {
  const z = lerp(1.35, 1.0, E.inOutSine(prog(t, 0, 9)));
  ctx.save(); ctx.translate(960, 540); ctx.scale(z, z); ctx.translate(-960 + lerp(240, 0, E.inOutSine(prog(t, 0, 9))), -540);
  TREE.branches.forEach((b, i) => {
    const pp = E.outCubic(prog(t, b.t0, b.t0 + b.dur)); if (pp <= 0) return;
    drawThread(ctx, b.path, { head: pp, width: Math.max(2, 10 - b.depth * 2), t, spark: pp < 1, sparkSize: .7, filament: b.depth < 2 });
  });
  TREE.nodes.forEach((n, i) => {
    const p = E.outBack(prog(t, n.t, n.t + .45)); if (p <= 0) return;
    ctx.save();
    ctx.strokeStyle = C.glow; ctx.lineWidth = 3; ctx.shadowColor = C.glow; ctx.shadowBlur = 18;
    ctx.fillStyle = hexA(C.tealDeep, .55);
    ctx.beginPath(); ctx.arc(n.x, n.y, n.rad * p, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const pulse = (t * .6 + hash(i)) % 1;
    ctx.globalAlpha = (1 - pulse) * .5; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.rad * p * (1 + pulse * .6), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}, { desc: 'เส้นหลักแตกกิ่งเป็นเครือข่าย ปลายกิ่งเป็นวงกลม (ใส่รูปนักศึกษาแต่ละรุ่นในวงกลมได้) กล้องค่อย ๆ Zoom out' });

clip('C1_S5-CG02_Growth_48-60-80-92', 12, (ctx, t) => {
  const steps = [{ v: 48, x: 260, y: 820 }, { v: 60, x: 690, y: 700 }, { v: 80, x: 1120, y: 560 }, { v: 92, x: 1550, y: 400 }];
  const pts = [[60, 820]];
  steps.forEach((s, i) => { if (i) pts.push([s.x - 60, steps[i - 1].y], [s.x - 60, s.y]); pts.push([s.x + 180, s.y]); });
  const path = new Path(pts);
  const times = [.6, 3.1, 5.6, 8.1];
  // head reaches each step's centre at its time
  const stepL = steps.map(s => { let best = 0, bd = 1e9; for (let L = 0; L <= path.len; L += 4) { const p = path.at(L); const d = Math.hypot(p.x - (s.x + 60), p.y - s.y); if (d < bd) { bd = d; best = L; } } return best; });
  let L = 0;
  for (let i = 0; i < 4; i++) { const a = i ? times[i - 1] : 0, b = times[i], la = i ? stepL[i - 1] : 0; if (t >= a) L = lerp(la, stepL[i], E.inOutCubic(prog(t, a + .1, b))); }
  if (t > times[3]) L = lerp(stepL[3], path.len, E.outCubic(prog(t, times[3], times[3] + .8)));
  const out = 1 - prog(t, 11.4, 12);
  drawThread(ctx, path, { head: L / path.len, width: 7, t, alpha: out });
  steps.forEach((s, i) => {
    const p = E.outBack(prog(t, times[i] - .1, times[i] + .35)); if (p <= 0) return;
    const last = i === 3, size = 110 + i * 22;
    ctx.save(); ctx.globalAlpha = out * (last ? 1 : lerp(1, .55, prog(t, times[i] + 2.0, times[i] + 2.5))); ctx.translate(s.x + 60, s.y - 30); ctx.scale(p, p);
    text(ctx, String(s.v), 0, 0, { size, weight: 700, align: 'center', glow: last ? C.glow : undefined, glowBlur: 40 });
    ctx.restore();
  });
  const lab = ease(prog(t, times[3] + .3, times[3] + .8)) * out;
  text(ctx, 'คน/ปี', 1550 + 60 + 125, 370, { size: 52, weight: 500, color: C.glow, alpha: lab });
  // arrows between numbers
  for (let i = 1; i < 4; i++) {
    const a = ease(prog(t, times[i] - .3, times[i])) * out * .7;
    text(ctx, '➔', (steps[i - 1].x + steps[i].x) / 2 + 60, (steps[i - 1].y + steps[i].y) / 2 - 70, { size: 44, align: 'center', alpha: a, color: C.glow, fam: 'sans-serif', weight: 400 });
  }
}, { desc: 'กราฟขั้นบันได 48 ➔ 60 ➔ 80 ➔ 92 คน/ปี ตัวเลขขึ้นที่ 0.6 / 3.1 / 5.6 / 8.1 วิ' });

// ===== S6 : 3 keywords =====
// ===== S7 =====
// ===== S8 =====
clip('C1_S8-CG04_Thread_BurstToCamera', 2.5, (ctx, t) => {
  const p = E.inCubic(prog(t, 0, 1.0));
  const path = new Path(cubicPts([960, 1000], [960, 800], [960, 650], [960, 560], 40));
  const s = lerp(1, 6, p);
  ctx.save(); ctx.translate(960, 560); ctx.scale(s, s); ctx.translate(-960, -560);
  drawThread(ctx, path, { head: clamp(p * 1.3), width: 6, t, alpha: 1 - prog(t, .95, 1.3) });
  ctx.restore();
  const fl = prog(t, .9, 1.5);
  if (fl > 0) {
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * fl) * .95;
    const g = ctx.createRadialGradient(960, 560, 0, 960, 560, 1200); g.addColorStop(0, '#FFFFFF'); g.addColorStop(.35, C.glow); g.addColorStop(1, hexA(C.green, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}, { desc: 'เส้นยกตัวพุ่งเข้ากล้อง + แฟลชขาวเขียว ใช้เป็น Transition เข้า End card (ตัดที่ ~1.2 วิ)' });

clip('C1_S8-CG05_EndCard_20Years_MedSUT', 8, (ctx, t) => {
  const g = ctx.createRadialGradient(960, 480, 50, 960, 540, 1200);
  g.addColorStop(0, '#0F4C45'); g.addColorStop(1, C.tealDeep); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cx = 960, cy = 420, R = 190;
  const pts = []; // spiral in from the left and close into a ring
  for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([lerp(-80, cx - R, E.inOutSine(u)), lerp(700, cy, E.inOutSine(u)) + Math.sin(u * Math.PI) * 60]); }
  for (let i = 1; i <= 120; i++) { const a = Math.PI + i / 120 * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  const path = new Path(pts);
  const p = E.inOutCubic(prog(t, 0, 2.2));
  drawThread(ctx, path, { head: p, tail: E.inOutCubic(prog(t, .9, 2.6)) * (path.len - Math.PI * 2 * R) / path.len, width: 6, t, spark: p < 1 });
  const ring = prog(t, 2.2, 2.8);
  if (ring > 0) { ctx.save(); ctx.globalAlpha = (1 - ring) * .8; ctx.strokeStyle = C.glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R + ring * 60, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  superText(ctx, t, [{ s: '20 YEARS OF MedSUT', size: 76, weight: 600 }], { x: 960, y: 740, align: 'center', inAt: 2.4, rev: .9, thread: false });
  text(ctx, 'สำนักวิชาแพทยศาสตร์  มหาวิทยาลัยเทคโนโลยีสุรนารี', 960, 812, { size: 34, weight: 400, fam: FONT_BODY, align: 'center', color: C.glow, alpha: ease(prog(t, 3.0, 3.8)) });
  // thin divider
  const d = ease(prog(t, 2.8, 3.6)); ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = C.green; ctx.fillRect(960 - 260 * d, 765, 520 * d, 2); ctx.restore();
}, { alpha: false, desc: 'End card พื้นเต็ม — วงกลมเว้นว่างไว้วางโลโก้ (กลางวง x=960,y=420 รัศมี 190px) โลโก้ควร Fade in ที่ ~2.4 วิ' });


// ===== S4 : mood shift to Hope & Bright =====
clip('C1_S4-CG01_Hope_LightSweep', 3, (ctx, t) => {
  const p = E.inOutSine(prog(t, 0, 2.2));
  const x = lerp(-700, 2600, p);
  ctx.save(); ctx.translate(x, 540); ctx.rotate(-.35);
  const g = ctx.createLinearGradient(-520, 0, 520, 0);
  g.addColorStop(0, hexA(C.gold, 0)); g.addColorStop(.4, hexA(C.gold, .35)); g.addColorStop(.5, hexA('#FFF6D8', .75)); g.addColorStop(.6, hexA(C.gold, .35)); g.addColorStop(1, hexA(C.gold, 0));
  ctx.fillStyle = g; ctx.fillRect(-520, -1400, 1040, 2800); ctx.restore();
  // warm bloom that lingers
  const bloom = Math.sin(Math.PI * prog(t, .6, 3));
  const rg = ctx.createRadialGradient(1500, 200, 0, 1500, 200, 1300);
  rg.addColorStop(0, hexA('#FFE9A8', .35 * bloom)); rg.addColorStop(1, hexA(C.gold, 0));
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const lp = prog(t, hash(i) * 1.2, hash(i) * 1.2 + 1.6); if (lp <= 0 || lp >= 1) continue;
    const px = hash(i + 1) * W, py = hash(i + 2) * H - lp * 120, r = 2 + hash(i + 3) * 5;
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * lp) * .8; ctx.fillStyle = '#FFF3C4'; ctx.shadowColor = C.gold; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}, { desc: 'แสงทองกวาดผ่านจอ + ประกาย เปลี่ยนอารมณ์เป็นความหวัง (Blend Mode: Screen / Add ทับภาพลูกค้า)' });

// ===== S7 : 580+ dissolves into a mosaic of alumni faces =====
const MOSAIC = (() => {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  return { cv, c, cells: null };
})();
function mosaicSource() {
  if (MOSAIC.cells) return MOSAIC.cells;
  const c = MOSAIC.c; c.clearRect(0, 0, W, H);
  c.font = `700 360px ${FONT_HEAD}`; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('580+', 960, 680);
  const d = c.getImageData(0, 0, W, H).data, step = 22, cells = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[((y + step / 2) * W + x + step / 2) * 4 + 3] > 128) cells.push([x + step / 2, y + step / 2]);
  return (MOSAIC.cells = cells);
}
function faceTile(ctx, x, y, s, i, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const shade = [C.teal, '#12564E', '#17695F', '#0E463F', '#1D7B6E'][i % 5];
  ctx.fillStyle = shade; ctx.fillRect(x - s / 2, y - s / 2, s, s);
  // placeholder portrait silhouette — replaced by real alumni photos later
  ctx.fillStyle = hexA(C.glow, .28);
  ctx.beginPath(); ctx.arc(x, y - s * .1, s * .18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * .38, s * .32, s * .24, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = hexA(C.tealDeep, .9); ctx.lineWidth = Math.max(1, s * .04); ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  ctx.restore();
}
clip('C1_S7-CG01_580_to_Mosaic_DRAFT', 9, (ctx, t) => {
  const src = mosaicSource();
  const cols = 20, rows = 12, ts = 96, gx0 = (W - cols * ts) / 2 + ts / 2, gy0 = (H - rows * ts) / 2 + ts / 2;
  const numA = ease(prog(t, 0, .5)) * (1 - prog(t, 1.2, 1.8));
  if (numA > 0) text(ctx, '580+', 960, 680, { size: 360, weight: 700, align: 'center', alpha: numA, glow: hexA(C.green, .9), glowBlur: 45 });
  const zoom = lerp(1.0, .9, E.inOutSine(prog(t, 5.0, 9)));
  ctx.save(); ctx.translate(960, 540); ctx.scale(zoom, zoom); ctx.translate(-960, -540);
  for (let i = 0; i < cols * rows; i++) {
    const gx = gx0 + (i % cols) * ts, gy = gy0 + Math.floor(i / cols) * ts;
    const fromNum = i < src.length;
    const sp = fromNum ? src[Math.floor(i * src.length / (cols * rows)) % src.length] : null;
    if (fromNum || true) {
      const s0 = src[(i * 7) % src.length];
      const delay = hash(i) * .9;
      const fly = E.inOutCubic(prog(t, 2.0 + delay, 3.6 + delay));
      const appear = prog(t, 1.1 + hash(i + 5) * .4, 1.5 + hash(i + 5) * .4);
      const x = lerp(s0[0], gx, fly), y = lerp(s0[1], gy, fly), size = lerp(20, ts, fly);
      faceTile(ctx, x, y, size, i, appear);
    }
  }
  ctx.restore();
}, { desc: 'DRAFT — ตัวเลข 580+ แตกเป็นกระเบื้องเล็ก แล้วกระจายเป็น Mosaic เต็มจอ (ตอนนี้ใช้ภาพหุ่นแทน รอรูปศิษย์เก่าจากลูกค้าแล้วเรนเดอร์ใหม่)' });

// ===== S8 : thread runs along the floor and stops in front of the student =====
clip('C1_S8-CG01-02_Floor_Thread_Perspective', 7, (ctx, t) => {
  // far (vanishing) -> near, editor corner-pins to the floor plane in the footage
  const far = [1060, 470], near = [930, 1000];
  const pts = cubicPts(far, [1130, 640], [820, 760], near, 90);
  const path = new Path(pts);
  const head = E.inOutCubic(prog(t, .2, 3.6));
  const sub = path.sub(0, path.len * head);
  if (sub.length > 1) {
    ctx.save(); ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < sub.length; i++) {
      const persp = clamp((sub[i][1] - far[1]) / (near[1] - far[1])); // 0 far .. 1 near
      const w = lerp(1.2, 14, persp * persp);
      if (pass === 0) { ctx.globalAlpha = .35; ctx.strokeStyle = C.glow; ctx.lineWidth = w * 3; ctx.shadowColor = C.glow; ctx.shadowBlur = w * 3; }
      else { ctx.globalAlpha = 1; ctx.strokeStyle = C.green; ctx.lineWidth = w; ctx.shadowBlur = 0; }
      ctx.beginPath(); ctx.moveTo(sub[i - 1][0], sub[i - 1][1]); ctx.lineTo(sub[i][0], sub[i][1]); ctx.stroke();
    }
    ctx.restore();
    const e = path.at(path.len * head);
    const settle = prog(t, 3.6, 4.6);
    drawSpark(ctx, e.x, e.y - 18 * settle, lerp(2, 11, clamp((e.y - far[1]) / (near[1] - far[1]))) * (1 + .15 * Math.sin(t * 3) * settle), t, 1, C.glow);
  }
}, { desc: 'เส้นเขียววิ่งตามพื้นจากระยะไกลมาหยุดตรงหน้าคน (มีมุมมอง Perspective) — ใช้ Corner Pin / Transform ให้เข้ากับพื้นใน Footage' });

// ===== Utility =====
clip('C1_UTIL_BG_Plate_DeepTeal', 10, (ctx, t) => {
  const g = ctx.createRadialGradient(960, 540, 80, 960, 540, 1250);
  g.addColorStop(0, '#0F4C45'); g.addColorStop(1, C.tealDeep); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = (hash(i) * W + t * (8 + hash(i + 3) * 18)) % (W + 200) - 100, y = (hash(i + 7) * H - t * (4 + hash(i + 5) * 10) + H) % H;
    const r = 6 + hash(i + 11) * 40, a = .04 + hash(i + 13) * .08;
    const gg = ctx.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, hexA(C.glow, a)); gg.addColorStop(1, hexA(C.glow, 0));
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}, { alpha: false, desc: 'พื้นหลังเขียวเข้ม + Bokeh เคลื่อนช้า วางใต้ CG ที่ไม่ได้ทับ Footage' });
