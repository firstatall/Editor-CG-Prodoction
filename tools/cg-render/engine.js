// Minimal deterministic motion-graphics engine (Canvas 2D). Every clip is draw(ctx, t) with t in seconds.
const W = 1920, H = 1080, FPS = 25;
const C = {
  green: '#1FB57A', glow: '#7CF2B8', teal: '#0B3B36', tealDeep: '#06231F', white: '#F7F4EC',
  sepia: '#B89B72', gray: '#6E7275', gold: '#F2C14E',
  sut: '#F28C28', moph: '#2BAE66', moe: '#2F6FD6', tmc: '#B5323A', hosp: '#5BC0EB',
};
const FONT_HEAD = 'Kanit', FONT_BODY = 'Sarabun';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
// Standard motion: fast in, soft landing
const ease = E.outCubic;

function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function mixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp(a >> 16 & 255, b >> 16 & 255, t)), g = Math.round(lerp(a >> 8 & 255, b >> 8 & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

// ---------- paths ----------
function cubicPts(p0, p1, p2, p3, n = 80) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
              u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return out;
}
function splinePts(pts, n = 24) { // Catmull-Rom through points
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
class Path {
  constructor(pts) {
    this.pts = pts; this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.len = this.cum[this.cum.length - 1];
  }
  at(L) {
    L = clamp(L, 0, this.len);
    let i = 1; while (i < this.cum.length - 1 && this.cum[i] < L) i++;
    const a = this.pts[i - 1], b = this.pts[i], seg = this.cum[i] - this.cum[i - 1] || 1, f = (L - this.cum[i - 1]) / seg;
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  sub(L0, L1) {
    L0 = clamp(L0, 0, this.len); L1 = clamp(L1, 0, this.len);
    if (L1 <= L0) return [];
    const out = [], s = this.at(L0); out.push([s.x, s.y]);
    for (let i = 0; i < this.pts.length; i++) if (this.cum[i] > L0 && this.cum[i] < L1) out.push(this.pts[i]);
    const e = this.at(L1); out.push([e.x, e.y]);
    return out;
  }
}

function strokePts(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// The Green Thread. head/tail are fractions (0..1) of the path length.
function drawThread(ctx, path, o = {}) {
  const head = (o.head ?? 1) * path.len, tail = (o.tail ?? 0) * path.len;
  const pts = path.sub(tail, head);
  if (pts.length < 2) return;
  const w = o.width ?? 6, col = o.color ?? C.green, gl = o.glowColor ?? C.glow, a = o.alpha ?? 1, glow = o.glow ?? 1;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (glow > 0) {
    ctx.globalAlpha = a * .35 * glow; ctx.strokeStyle = gl; ctx.lineWidth = w * 3.2;
    ctx.shadowColor = gl; ctx.shadowBlur = w * 6; strokePts(ctx, pts);
    ctx.shadowBlur = 0;
  }
  // tapered core: draw segment by segment, width ramps up from tail
  const taper = o.taper ?? Math.min(220, (head - tail) * .45);
  ctx.globalAlpha = a; ctx.strokeStyle = col;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc += d;
    ctx.lineWidth = w * (taper > 0 ? clamp(.15 + acc / taper) : 1);
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
  }
  // bright inner filament
  if (o.filament !== false) {
    ctx.globalAlpha = a * .65; ctx.strokeStyle = '#E9FFF4'; ctx.lineWidth = Math.max(1, w * .28);
    strokePts(ctx, pts.slice(Math.floor(pts.length * .25)));
  }
  ctx.restore();
  if (o.spark !== false && (o.head ?? 1) < 1.0001) {
    const e = path.at(head);
    drawSpark(ctx, e.x, e.y, (o.sparkSize ?? 1) * w, o.t ?? 0, a * (o.sparkAlpha ?? 1), gl);
  }
}
function drawSpark(ctx, x, y, w, t, a = 1, gl = C.glow) {
  if (a <= 0) return;
  ctx.save();
  const r = w * 4.5 * (1 + .12 * Math.sin(t * 23));
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA('#FFFFFF', a)); g.addColorStop(.25, hexA(gl, a * .9)); g.addColorStop(1, hexA(gl, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  // tiny embers
  for (let i = 0; i < 7; i++) {
    const life = (t * 1.7 + hash(i)) % 1, ang = hash(i + 9) * Math.PI * 2, d = life * w * 9;
    ctx.globalAlpha = a * (1 - life) * .8; ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d - life * w * 3, Math.max(.8, w * .22 * (1 - life)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- text ----------
function setFont(ctx, size, weight = 600, fam = FONT_HEAD) { ctx.font = `${weight} ${size}px ${fam}`; }
function measure(ctx, s, size, weight, fam) { setFont(ctx, size, weight, fam); return ctx.measureText(s).width; }
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  setFont(ctx, o.size ?? 56, o.weight ?? 600, o.fam ?? FONT_HEAD);
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = o.shadowBlur ?? 18; ctx.shadowOffsetY = 3; }
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur ?? 30; ctx.shadowOffsetY = 0; }
  ctx.fillStyle = o.color ?? C.white;
  if (o.spacing) { ctx.letterSpacing = o.spacing + 'px'; }
  ctx.fillText(s, x, y);
  ctx.restore();
}

// A "super": lines revealed left->right behind a leading thread, then fade + rise out.
// lines: [{s, size, weight, color, fam, dy}] ; o: {x, y, align, inAt, outAt, dur}
function superText(ctx, t, lines, o) {
  const inAt = o.inAt ?? 0, rev = o.rev ?? .7, outAt = o.outAt ?? 1e9;
  const pin = ease(prog(t, inAt, inAt + rev)), pout = E.inCubic(prog(t, outAt, outAt + .35));
  if (pin <= 0 || pout >= 1) return;
  const widths = lines.map(l => measure(ctx, l.s, l.size, l.weight ?? 600, l.fam ?? FONT_HEAD));
  const maxW = Math.max(...widths);
  const align = o.align ?? 'center';
  const x0 = align === 'center' ? o.x - maxW / 2 : align === 'right' ? o.x - maxW : o.x;
  const rise = -14 * pout;
  ctx.save(); ctx.globalAlpha = 1 - pout;
  // reveal clip
  const pad = 40;
  ctx.beginPath(); ctx.rect(x0 - pad, 0, (maxW + pad * 2) * pin, H); ctx.clip();
  let y = o.y;
  lines.forEach((l, i) => {
    const lx = align === 'center' ? o.x - widths[i] / 2 : align === 'right' ? o.x - widths[i] : o.x;
    y += (l.dy ?? 0);
    text(ctx, l.s, lx, y + rise, { size: l.size, weight: l.weight, color: l.color, fam: l.fam, glow: l.glow });
  });
  ctx.restore();
  // leading thread under the block
  if (o.thread !== false) {
    const ly = (o.lineY ?? (y + 26)) + rise;
    const p = new Path([[x0 - 20, ly], [x0 + maxW + 20, ly]]);
    const fadeLine = 1 - prog(t, inAt + rev + .25, inAt + rev + .9);
    const keep = o.keepLine ? 1 : fadeLine;
    drawThread(ctx, p, { head: pin, width: 4, alpha: (1 - pout) * Math.max(keep, o.keepLine ? 1 : 0), t, spark: pin < .999, glow: .8 });
  }
}

// Rolling digits (slot-machine). value can be fractional during roll.
function rollNumber(ctx, value, x, y, o = {}) {
  const size = o.size ?? 200, digits = o.digits ?? String(Math.round(o.final ?? value)).length;
  setFont(ctx, size, o.weight ?? 700, FONT_HEAD);
  const dw = ctx.measureText('0').width * (o.tight ?? 1);
  const total = dw * digits; let x0 = o.align === 'left' ? x : x - total / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 20, y - size * 1.0, total + 40, size * 1.25); ctx.clip();
  const fl = Math.floor(value + 1e-6), fr = value - fl;
  for (let d = 0; d < digits; d++) {
    const place = Math.pow(10, digits - 1 - d);
    const colInt = Math.floor(fl / place);
    // odometer: a column moves only while every lower column shows 9
    const frac = (fl % place === place - 1) ? fr : 0;
    for (let k = 0; k <= 1; k++) {
      const n = colInt + k;
      if (n <= 0 && d < digits - 1) continue;
      const off = (k - frac) * size * 1.05;
      const a = 1 - Math.min(1, Math.abs(off) / (size * 1.05));
      if (a <= 0.001) continue;
      text(ctx, String(n % 10), x0 + d * dw + dw / 2, y + off, { size, weight: o.weight ?? 700, align: 'center', alpha: a, color: o.color ?? C.white, glow: o.glow, glowBlur: o.glowBlur });
    }
  }
  ctx.restore();
  return { x0, total };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const CLIPS = {};
function clip(name, dur, draw, opts = {}) { CLIPS[name] = { name, dur, draw, alpha: opts.alpha !== false, desc: opts.desc || '' }; }

window.renderFrame = (name, f) => {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  CLIPS[name].draw(ctx, f / FPS);
  return true;
};
window.listClips = () => Object.values(CLIPS).map(c => ({ name: c.name, dur: c.dur, alpha: c.alpha, desc: c.desc }));
