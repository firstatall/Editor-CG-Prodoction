# CG render tool — 3D (three.js)

Cinematic 3D clips rendered frame-by-frame in headless Chromium (WebGL) and piped to ffmpeg.

Setup (in this folder):

```bash
npm i three@0.170.0 @fontsource/kanit @fontsource/sarabun
cp ../cg-render/thailand.js .        # or run ../cg-render/geo.js
mkdir assets && curl -o assets/Kanit-500.ttf … Kanit-700.ttf … Kanit-800.ttf   # Google Fonts TTFs
npx http-server -p 8123 -s -c-1 . &
node render3.js stills st "C1_S1_Map_Thailand_580:2,9.5"
node render3.js video out C1_S1_Map_Thailand_580
```

- `kit.js` — renderer, bloom/grade/grain, Green Thread tube, dust, flares, 3D text
- `scenes1.js` — one `clip(name, seconds, mode, desc, build)` per shot of clip 1
- The 2D stamp (alpha) lives in `../cg-render/clip1.js`
