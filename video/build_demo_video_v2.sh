#!/usr/bin/env bash
# Build v2 demo video: v1 content + write-path settle segment + after-state clip.
# Backs up v1 as splitpool-demo-v1.mp4 first.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../../outbox/metropolis/splitpool-demo.mp4
V1=../../../outbox/metropolis/splitpool-demo-v1.mp4
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
BG=0x0e0f13
ACC=0x836EF9

[ -f "$V1" ] || cp "$OUT" "$V1"

printf 'Write-path, live on testnet:' > cards/w1.txt
printf 'pool #4 settles on camera - script-signed with each member key' > cards/w2.txt
printf 'same contract calls the dApp Settle / Withdraw buttons make' > cards/w3.txt

mkcard () {
  local dur="$1" out="$2" l1="$3" l2="$4" l3="${5:-}" fs="${6:-40}"
  local filters="drawtext=fontfile=$FONT:textfile=$l1:fontcolor=$ACC:fontsize=$fs:x=(w-text_w)/2:y=(h-text_h)/2-90"
  filters="$filters,drawtext=fontfile=$FONT:textfile=$l2:fontcolor=0xe8eaf0:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+10"
  if [ -n "$l3" ]; then
    filters="$filters,drawtext=fontfile=$FONT:textfile=$l3:fontcolor=0x9aa0ae:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+66"
  fi
  ffmpeg -y -v error -f lavfi -i "color=c=$BG:s=1280x720:r=30:d=$dur" \
    -vf "$filters" -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "$out"
}
norm () {
  ffmpeg -y -v error -i "$1" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=$BG,fps=30" \
    -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "$2"
}

mkcard 8 cards/writepath.mp4 cards/w1.txt cards/w2.txt cards/w3.txt 40
norm settle.webm cards/settle.mp4
norm after.webm cards/after.mp4

# v1 cards + segments are already in cards/ from the v1 build; regenerate concat
cat > cards/concat_v2.txt <<EOF
file 'title.mp4'
file 'problem.mp4'
file 'term.mp4'
file 'agent.mp4'
file 'dapp.mp4'
file 'writepath.mp4'
file 'settle.mp4'
file 'after.mp4'
file 'verify.mp4'
file 'outro.mp4'
EOF
ffmpeg -y -v error -f concat -safe 0 -i cards/concat_v2.txt -c copy "$OUT"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo "WROTE $OUT (${DUR}s) — v1 backup at $V1"
