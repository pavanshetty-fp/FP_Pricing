#!/usr/bin/env bash
# Build the Service Work handoff bundle next to the repo:
#   ../FP-DS-2026-service-work/        (folder)
#   ../FP-DS-2026-service-work.zip     (the same, zipped)
# It holds the standalone Service Work HTML, the Service PRD and evals, the
# whole design-system and Unified View doc set, and the packaged skills — so
# whoever picks it up inherits every rule and eval. (Pavan, 2026-09-25.)
set -euo pipefail
cd "$(dirname "$0")/.."                 # repo root
ROOT="$(pwd)"
PARENT="$(dirname "$ROOT")"
NAME="FP-DS-2026-service-work"
OUT="$PARENT/$NAME"

npm run build:service >/dev/null
bash docs/ds/build-bundle.sh >/dev/null

rm -rf "$OUT" "$OUT.zip"
mkdir -p "$OUT/docs" "$OUT/skills"

cp dist-service/service.html "$OUT/service-work.html"
cp docs/unified-view/service/BUNDLE-README.md "$OUT/README.md"
cp docs/apply-design-system.md "$OUT/docs/"
cp -R docs/ds "$OUT/docs/ds"
rm -f "$OUT/docs/ds/build-bundle.sh"
cp -R docs/unified-view "$OUT/docs/unified-view"
# Past eval runs are working notes, not rules.
rm -rf "$OUT/docs/unified-view/evals/results"
rm -f "$OUT/docs/unified-view/service/BUNDLE-README.md"

# An AI opening this folder reads CLAUDE.md first.
cat > "$OUT/CLAUDE.md" <<'EOF'
# Read before doing anything

This folder is the Service Work handoff bundle. Read `README.md`, then
`docs/unified-view/map.md`, then `docs/unified-view/service/PRD.md` (§6
decisions and §7 working agreements are binding), then
`docs/apply-design-system.md` before building any screen. Check work against
`docs/unified-view/service/evals.md` and `docs/unified-view/evals/`.
Authority: docs/ds > docs/unified-view > service/PRD.md.
EOF

for s in fp-ds-2026.skill fp-ds-heuristics-eval.skill; do
  [ -f "$PARENT/$s" ] && cp "$PARENT/$s" "$OUT/skills/"
done

{
  echo "Built: $(date '+%Y-%m-%d %H:%M')"
  echo "Source: $(git remote get-url origin)"
  echo "Commit: $(git rev-parse --short HEAD)$(git diff --quiet && echo '' || echo ' (plus uncommitted changes)')"
} > "$OUT/VERSION.txt"

(cd "$PARENT" && zip -rq "$NAME.zip" "$NAME")
echo "wrote $OUT and $OUT.zip"
