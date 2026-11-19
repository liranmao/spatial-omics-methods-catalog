#!/usr/bin/env bash
# Renders scripts/og-image.html to docs/og-image.png (1200x630) with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
  --window-size=1200,630 --force-device-scale-factor=2 \
  --screenshot="$PWD/docs/og-image@2x.png" "file://$PWD/scripts/og-image.html" >/dev/null 2>&1
python3 - <<'PY'
from PIL import Image
im = Image.open("docs/og-image@2x.png").convert("RGB")
im.resize((1200, 630), Image.LANCZOS).save("docs/og-image.png", optimize=True)
PY
rm -f docs/og-image@2x.png
echo "docs/og-image.png"
