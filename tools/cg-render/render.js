// usage: node render.js stills <outdir> name:t1,t2 ...   |  node render.js video <outdir> [names...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [mode, outdir, ...rest] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const FPS = 25;
async function newPage(browser, bg) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.resolve('index.html'));
  const ok = await page.evaluate(() => window.fontsReady);
  if (!ok) throw new Error('fonts not loaded');
  if (bg) await page.evaluate(b => document.body.style.background = b, bg);
  return page;
}
async function encode(page, c) {
  const frames = Math.round(c.dur * FPS);
  const out = path.join(outdir, c.name + '.mov');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-'];
  if (c.alpha) args.push('-c:v', 'qtrle', '-pix_fmt', 'argb', out);
  else args.push('-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-tune', 'animation', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out.replace(/\.mov$/, '.mp4'));
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', code => code ? rej(new Error('ffmpeg ' + code)) : res()));
  for (let f = 0; f < frames; f++) {
    await page.evaluate(([n, f]) => window.renderFrame(n, f), [c.name, f]);
    const buf = await page.screenshot({ omitBackground: c.alpha, type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done;
  console.log('done', c.name, frames, 'frames');
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  if (mode === 'stills') {
    const page = await newPage(browser, '#2a2f33');
    for (const spec of rest) {
      const [name, ts] = spec.split(':');
      for (const t of ts.split(',')) {
        await page.evaluate(([n, f]) => window.renderFrame(n, f), [name, Math.round(+t * FPS)]);
        await page.screenshot({ path: path.join(outdir, `${name}_${t}.png`), type: 'png' });
      }
    }
  } else if (mode === 'list') {
    const page = await newPage(browser);
    console.log(JSON.stringify(await page.evaluate(() => window.listClips()), null, 1));
  } else {
    const page0 = await newPage(browser);
    let clips = await page0.evaluate(() => window.listClips());
    if (rest.length) clips = clips.filter(c => rest.includes(c.name));
    const N = 4, queue = [...clips];
    await Promise.all(Array.from({ length: N }, async (_, i) => {
      const page = i === 0 ? page0 : await newPage(browser);
      while (queue.length) await encode(page, queue.shift());
    }));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
