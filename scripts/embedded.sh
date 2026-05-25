#!/usr/bin/env bash
# Launch a local embedded reddb backed by a file on disk.
# UI then connects via http://localhost:8080.
#
# Usage: ./scripts/embedded.sh [path] [http-port] [grpc-port]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$HERE/.data"
DB_PATH="${1:-$DATA_DIR/embedded.rdb}"
HTTP_PORT="${2:-8080}"
GRPC_PORT="${3:-50051}"

mkdir -p "$(dirname "$DB_PATH")"

if ! command -v red >/dev/null 2>&1; then
  echo "✗ 'red' binary not found in PATH. Install from https://github.com/reddb-io/reddb"
  exit 1
fi

echo "▸ red-ui embedded"
echo "  file:  $DB_PATH"
echo "  http:  http://localhost:$HTTP_PORT"
echo "  grpc:  127.0.0.1:$GRPC_PORT"
echo "  ui:    http://localhost:1420  (pnpm dev)"
echo ""

exec red server \
  --path "$DB_PATH" \
  --http-bind "127.0.0.1:$HTTP_PORT" \
  --grpc-bind "127.0.0.1:$GRPC_PORT"
