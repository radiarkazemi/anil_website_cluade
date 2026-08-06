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

python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install --upgrade Pillow "uvicorn[standard]"

python - <<'PY'
from PIL import Image  # noqa: F401
print("Pillow OK")
PY

python manage.py migrate --noinput
python manage.py seed_layout
python manage.py create_admin || true

echo
echo "Setup done. Start the API with:"
echo "  uvicorn config.asgi:application --host 0.0.0.0 --port 8000"
echo
python manage.py showmigrations store orders | sed -n '1,80p'
