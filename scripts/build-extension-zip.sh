#!/usr/bin/env bash
# Builds dist/werewolf-extension.zip for Twitch (Files -> Assets for Hosted Test). Files sit at the zip's top level.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/werewolf-extension.zip
python3 - <<'PY'
import zipfile, glob, os
files = sorted(f for f in glob.glob('overlay/extension/*') if f.rsplit('.', 1)[-1] in ('html', 'js', 'css'))
with zipfile.ZipFile('dist/werewolf-extension.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, os.path.basename(f))
print('\n'.join(os.path.basename(f) for f in files))
PY
