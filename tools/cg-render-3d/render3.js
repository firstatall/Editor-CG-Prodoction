// node render3.js list | stills <out> name:t1,t2 ... | video <out> name...
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [mode, outdir, ...rest] = process.argv.slice(2);
const FPS = 25, BASE = 'http://localhost:8123/index.html';
async function open(browser, clip) {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('pageerror', clip, e.message));
  await p.goto(BASE + (clip ? '?clip=' + encodeURIComponent(clip) : ''));
  await p.waitForFunction(() => window.ready || window.err, null, { timeout: 180000 });
  const err = await p.evaluate(() => window.err); if (err) throw new Error(err);
  return p;
}
async function frame(p, f, png) {
  await p.evaluate(f => window.renderFrame(f), f);
  const url = await p.evaluate(png => window.grab(png ? 'image/png' : 'image/jpeg', .97), png);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  if (mode === 'list') { const p = await open(browser); console.log(JSON.stringify(await p.evaluate(() => listClips()), null, 1)); }
  else if (mode === 'stills') {
    fs.mkdirSync(outdir, { recursive: true });
    for (const spec of rest) { const [name, ts] = spec.split(':'); const p = await open(browser, name);
      for (const t of ts.split(',')) { const t0 = Date.now(); fs.writeFileSync(path.join(outdir, `${name}_${t}.png`), await frame(p, Math.round(+t * FPS), true)); console.log(name, t, (Date.now() - t0) + 'ms'); }
      await p.close(); }
  } else {
    fs.mkdirSync(outdir, { recursive: true });
    for (const name of rest) {
      const p = await open(browser, name); const info = await p.evaluate(() => window.clipInfo);
      const frames = Math.round(info.dur * FPS), png = info.mode === 'alpha';
      const ext = png ? '.mov' : '.mp4', out = path.join(outdir, name + ext);
      const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', png ? 'png' : 'mjpeg', '-i', '-'];
      if (png) args.push('-c:v', 'qtrle', '-pix_fmt', 'argb', out);
      else args.push('-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out);
      const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
      const t0 = Date.now();
      for (let f = 0; f < frames; f++) { const b = await frame(p, f, png); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
      ff.stdin.end(); await done; await p.close();
      console.log('done', name, frames, 'frames', ((Date.now() - t0) / frames).toFixed(0) + 'ms/f');
    }
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
