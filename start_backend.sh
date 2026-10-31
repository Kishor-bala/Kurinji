#!/usr/bin/env bash
set -e

# Always resolve project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "Error: Virtual environment .venv not found in $SCRIPT_DIR"
    exit 1
fi

export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"
echo "=========================================================="
echo " Starting FastAPI Backend on http://0.0.0.0:8000"
echo " Pure Vector Database Mode (Milvus & Qdrant) | No SQLite"
echo " Docs available at: http://localhost:8000/docs"
echo "=========================================================="
exec uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload
