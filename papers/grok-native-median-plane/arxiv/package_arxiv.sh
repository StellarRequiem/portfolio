#!/bin/bash
# Local arXiv package helper (operator / parent agent with shell).
# Does NOT submit to arXiv. Does NOT git push.
set -euo pipefail
cd "$(dirname "$0")"

if command -v pdflatex >/dev/null 2>&1; then
  pdflatex -interaction=nonstopmode main.tex
  pdflatex -interaction=nonstopmode main.tex
elif command -v python3 >/dev/null 2>&1; then
  echo "pdflatex missing — running build_preview.py fallback"
  python3 build_preview.py
else
  echo "Neither pdflatex nor python3 available" >&2
  exit 1
fi

TAR_MEMBERS=(main.tex metadata.txt)
if [[ -f main.pdf ]]; then
  TAR_MEMBERS+=(main.pdf)
fi
tar czf grok-native-median-plane-arxiv-src.tar.gz "${TAR_MEMBERS[@]}"
echo "packed: grok-native-median-plane-arxiv-src.tar.gz (${TAR_MEMBERS[*]})"
if command -v pdfinfo >/dev/null 2>&1 && [[ -f main.pdf ]]; then
  pdfinfo main.pdf | sed -n '1,12p'
fi
