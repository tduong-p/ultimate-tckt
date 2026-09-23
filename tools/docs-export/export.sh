#!/usr/bin/env bash
# Xuất docs/{ba,onboarding,ops}/*.md ra docx (+pdf nếu có xelatex) vào docs-export/, tên kèm doc_id và version.
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=docs-export; rm -rf "$OUT"; mkdir -p "$OUT"
for f in docs/ba/*.md docs/onboarding/*.md docs/ops/*.md; do
  [[ -f "$f" ]] || continue
  id="$(sed -nE 's/^doc_id: *([^ ]+).*/\1/p' "$f" | head -1)"
  ver="$(sed -nE 's/^version: *([0-9.]+).*/\1/p' "$f" | head -1)"
  name="${id}_v${ver}"
  pandoc "$f" --from markdown+yaml_metadata_block --resource-path="$(dirname "$f")" -o "$OUT/$name.docx"
  if command -v xelatex >/dev/null; then
    pandoc "$f" --resource-path="$(dirname "$f")" --pdf-engine=xelatex -V mainfont="DejaVu Sans" -o "$OUT/$name.pdf" || echo "pdf skipped: $f"
  fi
done
ls "$OUT"
