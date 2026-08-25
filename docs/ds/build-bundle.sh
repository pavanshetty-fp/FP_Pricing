#!/usr/bin/env bash
# Regenerate docs/apply-design-system.md as an auto-concatenated bundle of the
# module set (constitution + setup + ui + ux + interactions + figma-asks +
# conformance + preamble). DO NOT hand-edit apply-design-system.md — edit the modules, run this.
set -euo pipefail
cd "$(dirname "$0")"                      # docs/ds/
OUT="../apply-design-system.md"

FILES=(
  00-meta/constitution.md
  00-meta/setup.md
  ui/1-fundamentals.md ui/2-rules.md ui/3-dos-and-donts.md ui/4-common-mistakes.md ui/5-checks.md ui/6-execute.md
  ux/1-fundamentals.md ux/2-rules.md ux/3-dos-and-donts.md ux/4-common-mistakes.md ux/5-checks.md ux/6-execute.md
  interactions/1-fundamentals.md interactions/2-rules.md interactions/3-dos-and-donts.md interactions/4-common-mistakes.md interactions/5-checks.md interactions/6-execute.md
  00-meta/figma-asks.md
  00-meta/conformance.md
  00-meta/prompt-preamble.md
)

{
  echo "# Apply the FleetPanda Design System (FP-DS-2026) to a prototype"
  echo
  echo "> **Auto-generated bundle** — do not hand-edit. Concatenation of the"
  echo "> \`docs/ds/\` module set, produced by \`docs/ds/build-bundle.sh\`. Edit the"
  echo "> modules and regenerate. Feed this whole file to your AI tool before it builds."
  echo
  for f in "${FILES[@]}"; do
    echo
    echo "---"
    echo
    cat "$f"
    echo
  done
} > "$OUT"

echo "wrote $OUT ($(wc -l < "$OUT") lines from ${#FILES[@]} modules)"
