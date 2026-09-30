#!/usr/bin/env bash
# Compose the SplitPool Metropolis demo video: caption cards + recorded segments.
# Usage: build_demo_video.sh <term.webm> <dapp.webm>
set -euo pipefail
cd "$(dirname "$0")"
TERM_WEBM="$1"; DAPP_WEBM="$2"
OUT=../../../outbox/metropolis/splitpool-demo.mp4
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
BG=0x0e0f13
ACC=0x836EF9
mkdir -p cards ../../../outbox/metropolis

printf 'SplitPool' > cards/t1.txt
printf 'Group expenses that settle themselves - on Monad' > cards/t2.txt
printf 'Monad Metropolis 2026  ·  Consumer Products & Payments track' > cards/t3.txt

printf 'Splitting group costs is broken:' > cards/p1.txt
printf 'spreadsheets, screenshots, and IOUs that never get paid' > cards/p2.txt
printf 'SplitPool keeps the ledger on-chain and settles in one click' > cards/p3.txt

printf 'An MCP agent parses chat into ledger entries' > cards/m1.txt
printf 'parse_expense -> record_expense -> suggest_settlements' > cards/m2.txt
printf 'works with any MCP-capable AI agent' > cards/m3.txt

printf 'Every transaction above is REAL - Monad testnet, chain 10143' > cards/v1.txt
printf 'contract: 0xe2f7bbd5163b0acd695cc50c34c46109e7d7a4d4' > cards/v2.txt
printf 'verify: testnet.monadexplorer.com' > cards/v3.txt

printf 'Live dApp:  ntoledo319.github.io/splitpool' > cards/o1.txt
printf 'Code (MIT):  github.com/ntoledo319/splitpool' > cards/o2.txt
printf 'MCP server + Solidity + static dApp - testnet only, zero mainnet funds' > cards/o3.txt

mkcard () { # duration outfile line1 line2 [line3]
  local dur="$1" out="$2" l1="$3" l2="$4" l3="${5:-}"
  local filters="drawtext=fontfile=$FONT:textfile=$l1:fontcolor=$ACC:fontsize=60:x=(w-text_w)/2:y=(h-text_h)/2-90"
  filters="$filters,drawtext=fontfile=$FONT:textfile=$l2:fontcolor=0xe8eaf0:fontsize=28:x=(w-text_w)/2:y=(h-text_h)/2+10"
  if [ -n "$l3" ]; then
    filters="$filters,drawtext=fontfile=$FONT:textfile=$l3:fontcolor=0x9aa0ae:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2+66"
  fi
  ffmpeg -y -v error -f lavfi -i "color=c=$BG:s=1280x720:r=30:d=$dur" \
    -vf "$filters" -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "$out"
}

norm () { # normalize a webm segment to 1280x720 h264 yuv420p 30fps
  ffmpeg -y -v error -i "$1" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=$BG,fps=30" \
    -an -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 "$2"
}

mkcard 8  cards/title.mp4   cards/t1.txt cards/t2.txt cards/t3.txt
mkcard 10 cards/problem.mp4 cards/p1.txt cards/p2.txt cards/p3.txt
mkcard 9  cards/agent.mp4   cards/m1.txt cards/m2.txt cards/m3.txt
mkcard 10 cards/verify.mp4  cards/v1.txt cards/v2.txt cards/v3.txt
mkcard 11 cards/outro.mp4   cards/o1.txt cards/o2.txt cards/o3.txt
norm "$TERM_WEBM" cards/term.mp4
norm "$DAPP_WEBM" cards/dapp.mp4

cat > cards/concat.txt <<EOF
file 'title.mp4'
file 'problem.mp4'
file 'term.mp4'
file 'agent.mp4'
file 'dapp.mp4'
file 'verify.mp4'
file 'outro.mp4'
EOF
ffmpeg -y -v error -f concat -safe 0 -i cards/concat.txt -c copy "$OUT"
ffmpeg -v error -i "$OUT" -hide_banner -f null - 2>&1 || true
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
echo "WROTE $OUT (${DUR}s)"
