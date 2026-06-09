#!/usr/bin/env bash
# Pull the "Tables Layout" frame from Figma via the REST API.
#
# Usage:
#   FIGMA_TOKEN=figd_xxx ./scripts/pull-figma.sh
#   # or point at a token file:
#   FIGMA_TOKEN="$(cat ../.figma_token)" ./scripts/pull-figma.sh
#
# Env overrides: FILE_KEY, NODE_ID, DEPTH, SCALE
set -euo pipefail

FILE_KEY="${FILE_KEY:-PxzKUl6emRr8QQ5Nb0vlwT}"
NODE_ID="${NODE_ID:-27614:56562}"
DEPTH="${DEPTH:-3}"          # full-depth dumps are >600MB; cap traversal
SCALE="${SCALE:-2}"
OUT="figma"

: "${FIGMA_TOKEN:?Set FIGMA_TOKEN (a Figma personal access token with file_content:read)}"
mkdir -p "$OUT"
API="https://api.figma.com/v1"
auth=(-H "X-Figma-Token: $FIGMA_TOKEN")

echo "→ node JSON (depth=$DEPTH)"
curl -fsS "${auth[@]}" "$API/files/$FILE_KEY/nodes?ids=$NODE_ID&depth=$DEPTH" \
  -o "$OUT/node-d$DEPTH.json"
echo "  $(wc -c < "$OUT/node-d$DEPTH.json") bytes"

echo "→ reference render (png @${SCALE}x)"
url="$(curl -fsS "${auth[@]}" \
  "$API/images/$FILE_KEY?ids=$NODE_ID&format=png&scale=$SCALE" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["images"]["'"$NODE_ID"'"])')"
curl -fsS "$url" -o "$OUT/reference.png"
echo "  saved $OUT/reference.png"

echo "→ design-value digest"
python3 scripts/extract.py "$OUT/node-d$DEPTH.json" || true

echo "Done. Variables endpoint (/variables/local) is Enterprise-only and is"
echo "not fetched here; token-level values are derived from the node fills."
