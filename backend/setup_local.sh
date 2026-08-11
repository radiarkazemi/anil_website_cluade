#!/usr/bin/env bash
# One-shot local backend setup (Git Bash / macOS / Linux).
# Usage from backend/:  bash setup_local.sh
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  python -m venv .venv
fi

# Git Bash on Windows
if [[ -f .venv/Scripts/activate ]]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

python -m pip install --upgrade pip wheel setuptools
python -m pip install -r requirements.txt
python -m pip install --upgrade "uvicorn[standard]"

# Windows often ends up with a broken Pillow wheel (_imaging / PIL mismatch).
# Wipe any PIL/Pillow leftovers, then reinstall a binary wheel with no cache.
python -m pip uninstall -y Pillow pillow PIL 2>/dev/null || true
# Remove leftover package dirs if uninstall left them behind
python - <<'PY'
import pathlib, site, shutil
for base in site.getsitepackages():
    for name in ("PIL", "Pillow.libs", "pillow.libs"):
        p = pathlib.Path(base) / name
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)
            print(f"removed leftover {p}")
PY
python -m pip install --upgrade --force-reinstall --no-cache-dir "Pillow>=10.0"

python - <<'PY'
from PIL import Image
print("Pillow OK", getattr(Image, "__version__", ""))
import PIL
print("PIL path:", PIL.__file__)
PY

python manage.py migrate --noinput
python manage.py seed_layout
python manage.py create_admin || true

echo
echo "Setup done. Start the API with:"
echo "  uvicorn config.asgi:application --host 0.0.0.0 --port 8000"
echo
python manage.py showmigrations store orders | sed -n '1,80p'
