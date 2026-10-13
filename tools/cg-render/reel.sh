#!/bin/bash
# Build a review reel: every clip over dark grey with its file name burned in.
set -e
cd "$(dirname "$0")"; mkdir -p reel; : > reel/list.txt
FONT=$(fc-match -f '%{file}' 'DejaVu Sans:bold')
for f in out/*.mov out/*.mp4; do
  n=$(basename "${f%.*}")
  ffmpeg -loglevel error -y -f lavfi -i color=c=0x2a2f33:s=1920x1080:r=25 -i "$f" \
    -filter_complex "[0][1]overlay=shortest=1,drawtext=fontfile=$FONT:text='$n':x=30:y=30:fontsize=30:fontcolor=white@0.8:box=1:boxcolor=black@0.5:boxborderw=10,scale=1280:720" \
    -c:v libx264 -crf 22 -preset veryfast -pix_fmt yuv420p "reel/$n.mp4"
  echo "file '$n.mp4'" >> reel/list.txt
done
ffmpeg -loglevel error -y -f concat -safe 0 -i reel/list.txt -c copy Preview_Clip01_CG_Reel.mp4
ls -la Preview_Clip01_CG_Reel.mp4
