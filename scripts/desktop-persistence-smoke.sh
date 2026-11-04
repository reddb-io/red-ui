#!/usr/bin/env bash
# Run only the optional native smoke binary, with disposable OS keychain/data.
set -euo pipefail
binary="${1:?Pass the workspace-persistence-smoke binary path}"
binary="$(realpath "$binary")"
smoke_root="$(mktemp -d)"
trap 'rm -rf "$smoke_root"' EXIT
export XDG_DATA_HOME="$smoke_root/data" XDG_RUNTIME_DIR="$smoke_root/runtime"
export XDG_CACHE_HOME="$smoke_root/cache" XDG_CONFIG_HOME="$smoke_root/config"
mkdir -p "$XDG_DATA_HOME" "$XDG_RUNTIME_DIR" "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME"
chmod 700 "$XDG_RUNTIME_DIR"
export GDK_BACKEND=x11 LIBGL_ALWAYS_SOFTWARE=1 WEBKIT_DISABLE_DMABUF_RENDERER=1
timeout 90s dbus-run-session -- xvfb-run -a bash -c '
  printf "disposable-smoke-keyring\n" | gnome-keyring-daemon --unlock --components=secrets --control-directory "$XDG_RUNTIME_DIR/keyring"
  exec "$1"
' -- "$binary"
