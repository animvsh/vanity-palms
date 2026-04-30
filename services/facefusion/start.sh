#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
WORKERS="${UVICORN_WORKERS:-1}"

echo "Starting FaceFusion API on port ${PORT} (workers=${WORKERS})"
exec uvicorn app:app --host 0.0.0.0 --port "${PORT}" --workers "${WORKERS}"
