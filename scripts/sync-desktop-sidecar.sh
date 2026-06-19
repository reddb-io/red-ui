#!/usr/bin/env bash
# Provision the bundled `red` sidecar for the host target triple.
#
# Tauri's `externalBin` (apps/desktop/src-tauri/binaries/red-<triple>) must
# exist before `cargo check`, `tauri dev`, or `tauri build` — tauri-build
# validates the path at compile time. The binary itself is gitignored (it's a
# ~15MB platform-specific blob), so install reddb's `red` and run this to drop
# it into place.
#
# Usage:
#   scripts/sync-desktop-sidecar.sh                # copy `red` from PATH
#   scripts/sync-desktop-sidecar.sh /path/to/red   # copy a specific binary
#   RED_BIN=/path/to/red scripts/sync-desktop-sidecar.sh
#
# Install `red` first if it isn't on PATH:
#   curl -fsSL https://raw.githubusercontent.com/reddb-io/reddb/main/install.sh | bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$HERE/apps/desktop/src-tauri/binaries"

# Target triple: prefer rustc's host, fall back to a uname mapping so the
# script works in release jobs that haven't set a toolchain up yet.
TRIPLE="${TAURI_TARGET_TRIPLE:-}"
if [ -z "$TRIPLE" ] && command -v rustc >/dev/null 2>&1; then
  TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
fi
if [ -z "$TRIPLE" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) TRIPLE="x86_64-unknown-linux-gnu" ;;
    Linux-aarch64) TRIPLE="aarch64-unknown-linux-gnu" ;;
    Darwin-x86_64) TRIPLE="x86_64-apple-darwin" ;;
    Darwin-arm64 | Darwin-aarch64) TRIPLE="aarch64-apple-darwin" ;;
    *) echo "✗ cannot determine target triple; set TAURI_TARGET_TRIPLE" >&2; exit 1 ;;
  esac
fi

RED_BIN="${1:-${RED_BIN:-$(command -v red || true)}}"
if [ -z "$RED_BIN" ] || [ ! -x "$RED_BIN" ]; then
  echo "✗ 'red' binary not found." >&2
  echo "  Install it, then re-run:" >&2
  echo "    curl -fsSL https://raw.githubusercontent.com/reddb-io/reddb/main/install.sh | bash" >&2
  echo "  or pass a path: scripts/sync-desktop-sidecar.sh /path/to/red" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$RED_BIN" "$DEST_DIR/red-$TRIPLE"
chmod +x "$DEST_DIR/red-$TRIPLE"
echo "▸ sidecar provisioned: binaries/red-$TRIPLE  (from $RED_BIN)"
