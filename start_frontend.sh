#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/apps/web"

echo "=========================================================="
echo " Starting Next.js Web Frontend on http://localhost:3000"
echo "=========================================================="
exec npm run dev
