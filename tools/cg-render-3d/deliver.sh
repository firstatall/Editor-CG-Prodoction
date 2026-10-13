#!/bin/bash
# Make <=28MB delivery copies (2-pass H.264) + a review reel.
set -e
cd "$(dirname "$0")"; mkdir -p dlv reel; : > reel/list.txt
for f in out/*.mp4; do
  n=$(basename "$f" .mp4); d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  kb=$(python3 -c "print(min(40000,int(27.5*8*1024/$d)))")
  ffmpeg -loglevel error -y -i "$f" -c:v libx264 -preset slow -b:v ${kb}k -maxrate $((kb*3/2))k -bufsize $((kb*2))k -pass 1 -passlogfile dlv/$n -an -f mp4 /dev/null
  ffmpeg -loglevel error -y -i "$f" -c:v libx264 -preset slow -b:v ${kb}k -maxrate $((kb*3/2))k -bufsize $((kb*2))k -pass 2 -passlogfile dlv/$n -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart -an "dlv/$n.mp4"
  rm -f dlv/$n*.log dlv/$n*.mbtree
  FONT=$(fc-match -f '%{file}' 'DejaVu Sans:bold')
  ffmpeg -loglevel error -y -i "$f" -vf "drawtext=fontfile=$FONT:text='$n':x=30:y=30:fontsize=28:fontcolor=white@0.85:box=1:boxcolor=black@0.5:boxborderw=10,scale=1280:720" -c:v libx264 -crf 24 -preset veryfast -pix_fmt yuv420p "reel/$n.mp4"
done
for n in C1_S1_Map_Thailand_580 C1_S2_Timeline_2536-2540_Freeze C1_S3_Braid_Agencies C1_S4_Hope_LightSweep_onBlack C1_S4_Counter_48 C1_S5_Network_Branching C1_S5_Growth_48-60-80-92 C1_S7_580_to_Mosaic_DRAFT C1_S8_Floor_Thread_onBlack C1_S8_Thread_BurstToCamera C1_S8_EndCard_20Years_MedSUT C1_UTIL_BG_Plate; do echo "file '$n.mp4'" >> reel/list.txt; done
ffmpeg -loglevel error -y -f concat -safe 0 -i reel/list.txt -c:v libx264 -crf 26 -preset medium -pix_fmt yuv420p Preview_Clip01_CG_v2_Reel.mp4
ls -la dlv Preview_Clip01_CG_v2_Reel.mp4
