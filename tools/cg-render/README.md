# CG render tool

Renders the motion-graphic clips (Canvas 2D → headless Chromium → ffmpeg).

```bash
npm i @fontsource/kanit @fontsource/sarabun world-atlas topojson-client
node geo.js                       # builds thailand.js from world-atlas
node render.js stills stills "C1_S1-CG02-04_Map_Thailand_580:4,10"   # preview frames
node render.js video out [clipName ...]                              # .mov (Animation+alpha) / .mp4
./reel.sh                         # review reel
```

Clips live in `clip1.js` (`clip(name, seconds, draw)`); shared look (Green Thread, text, counters) in `engine.js`.
Playwright is required (`NODE_PATH` pointing at a global install works).
