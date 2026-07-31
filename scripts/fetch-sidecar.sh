#!/usr/bin/env bash
# Fetch the pinned `red` sidecar binary for the current build target and
# verify the published sha256 checksum.
#
# On Linux the static musl build is preferred over the glibc-linked build.
# The glibc build crash-loops on older distributions (glibc version mismatch),
# while the musl build is self-contained and runs everywhere.
#
# Usage:
#   scripts/fetch-sidecar.sh              # fetch pinned release for host triple
#   scripts/fetch-sidecar.sh --source     # build from source (unreleased changes)
#
# Options:
#   --source  Build from a local reddb source tree instead of downloading a
#             release asset. Requires the reddb repo checked out at ../reddb
#             or at the path in $REDDB_SRC.
#
# Environment:
#   REDDB_VERSION       Release tag to fetch (default: see pin below).
#   TAURI_TARGET_TRIPLE Override the detected host triple.
#   REDDB_SRC           Path to a reddb source tree (for --source builds).
#   GITHUB_TOKEN        Optional — avoids GitHub API rate limits (60/h unauth).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$HERE/apps/desktop/src-tauri/binaries"

# ── version pin ──────────────────────────────────────────────────────────────
# WHY THIS PIN: >=1.9.1 emits Access-Control-Allow-Origin headers (required for
# browser fetches from the SvelteKit bundle); v1.23.2 is the current release and
# the one whose asset set is verified against the mapping below. Update
# REDDB_VERSION when reddb ships a newer release that red-ui requires, then
# confirm the new release has all required assets via:
#   scripts/preflight-release-assets.sh
REDDB_VERSION="${REDDB_VERSION:-v1.23.2}"
REDDB_REPO="reddb-io/reddb"

# ── target triple ────────────────────────────────────────────────────────────
TRIPLE="${TAURI_TARGET_TRIPLE:-}"
if [ -z "$TRIPLE" ] && command -v rustc >/dev/null 2>&1; then
  TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
fi
if [ -z "$TRIPLE" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)            TRIPLE="x86_64-unknown-linux-gnu" ;;
    Linux-aarch64)           TRIPLE="aarch64-unknown-linux-gnu" ;;
    Darwin-x86_64)           TRIPLE="x86_64-apple-darwin" ;;
    Darwin-arm64|Darwin-aarch64) TRIPLE="aarch64-apple-darwin" ;;
    MINGW*-x86_64|MSYS*-x86_64|CYGWIN*-x86_64) TRIPLE="x86_64-pc-windows-msvc" ;;
    *) echo "✗ cannot determine target triple; set TAURI_TARGET_TRIPLE" >&2; exit 1 ;;
  esac
fi

# ── source-build path ────────────────────────────────────────────────────────
if [[ "${1:-}" == "--source" ]]; then
  REDDB_SRC="${REDDB_SRC:-}"
  if [ -z "$REDDB_SRC" ] && [ -d "$HERE/../reddb" ]; then
    REDDB_SRC="$(cd "$HERE/../reddb" && pwd)"
  fi
  if [ -z "$REDDB_SRC" ] || [ ! -d "$REDDB_SRC" ]; then
    echo "✗ --source requires a reddb checkout at ../reddb or REDDB_SRC=<path>" >&2
    exit 1
  fi
  echo "▸ building red from source: $REDDB_SRC"
  (cd "$REDDB_SRC" && cargo build --release)
  mkdir -p "$DEST_DIR"
  cp "$REDDB_SRC/target/release/red" "$DEST_DIR/red-$TRIPLE"
  chmod +x "$DEST_DIR/red-$TRIPLE"
  echo "▸ sidecar provisioned from source: binaries/red-$TRIPLE"
  exit 0
fi

# ── asset name mapping ────────────────────────────────────────────────────────
# Maps each Tauri target triple to the reddb GitHub release asset filename.
# PREFERRED is fetched first; FALLBACK is tried when PREFERRED is absent.
# Linux: musl static build preferred; glibc build as fallback.
#
# These names are reddb's own release convention (`<arch>` as uname reports it,
# `-static` for the musl link) — verify against a real release before editing:
#   gh release view v1.23.2 -R reddb-io/reddb --json assets --jq '.assets[].name'
case "$TRIPLE" in
  x86_64-unknown-linux-*)
    PREFERRED="red-linux-x86_64-static"
    FALLBACK="red-linux-x86_64"
    ;;
  aarch64-unknown-linux-*)
    PREFERRED="red-linux-aarch64-static"
    FALLBACK="red-linux-aarch64"
    ;;
  x86_64-apple-darwin)
    PREFERRED="red-macos-x86_64"
    FALLBACK=""
    ;;
  aarch64-apple-darwin)
    PREFERRED="red-macos-aarch64"
    FALLBACK=""
    ;;
  x86_64-pc-windows-msvc)
    PREFERRED="red-windows-x86_64.exe"
    FALLBACK=""
    ;;
  universal-apple-darwin)
    # Handled below by fetching both slices and lipo-ing them together.
    PREFERRED=""
    FALLBACK=""
    ;;
  *)
    echo "✗ no asset mapping for triple '$TRIPLE'; add it to scripts/fetch-sidecar.sh" >&2
    exit 1
    ;;
esac

# Tauri appends the host's executable suffix when it resolves an externalBin,
# so the Windows sidecar has to land as red-<triple>.exe.
DEST_SUFFIX=""
case "$TRIPLE" in *-windows-*) DEST_SUFFIX=".exe" ;; esac

# ── helpers ───────────────────────────────────────────────────────────────────
GH_AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  GH_AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

BASE_URL="https://github.com/$REDDB_REPO/releases/download/$REDDB_VERSION"

sha256_of() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "✗ neither sha256sum nor shasum found" >&2; exit 1
  fi
}

# ── fetch checksums file ──────────────────────────────────────────────────────
TMPDIR_LOCAL="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

CHECKSUMS_FILE="$TMPDIR_LOCAL/checksums.txt"
echo "▸ fetching checksums for $REDDB_REPO $REDDB_VERSION …"
if ! curl -fsSL "${GH_AUTH[@]}" "$BASE_URL/checksums.txt" -o "$CHECKSUMS_FILE" 2>/dev/null; then
  echo "  (checksums.txt not found — will try per-file .sha256)" >&2
  CHECKSUMS_FILE=""
fi

lookup_sha() {
  local asset="$1"
  # checksums.txt format: "<hex>  <filename>" or "<hex> <filename>"
  if [ -n "$CHECKSUMS_FILE" ]; then
    grep -m1 "[[:space:]]${asset}$" "$CHECKSUMS_FILE" 2>/dev/null | awk '{print $1}' || true
  fi
}

fetch_and_verify() {
  local asset="$1"
  local dest="$2"

  echo "▸ downloading $asset …"
  if ! curl -fsSL "${GH_AUTH[@]}" "$BASE_URL/$asset" -o "$dest"; then
    return 1
  fi

  # Look for expected checksum: first in checksums.txt, then in a .sha256 file.
  local expected_sha=""
  expected_sha="$(lookup_sha "$asset")"

  if [ -z "$expected_sha" ]; then
    local sha_file="$TMPDIR_LOCAL/${asset}.sha256"
    if curl -fsSL "${GH_AUTH[@]}" "$BASE_URL/${asset}.sha256" -o "$sha_file" 2>/dev/null; then
      expected_sha="$(awk '{print $1}' "$sha_file")"
    fi
  fi

  if [ -n "$expected_sha" ]; then
    local actual_sha
    actual_sha="$(sha256_of "$dest")"
    if [ "$actual_sha" != "$expected_sha" ]; then
      echo "✗ checksum mismatch for $asset" >&2
      echo "  expected: $expected_sha" >&2
      echo "  actual:   $actual_sha" >&2
      return 1
    fi
    echo "▸ checksum verified"
  else
    echo "  ⚠ no checksum found for $asset — skipping verification" >&2
  fi
  return 0
}

# ── universal macOS: lipo the two slices ─────────────────────────────────────
# `tauri build --target universal-apple-darwin` resolves the externalBin as
# red-universal-apple-darwin, and no such asset exists upstream — reddb ships
# one binary per arch. Fuse them here. The per-arch files are kept too, so a
# plain `tauri dev` on the same machine (which resolves the host triple) works.
if [ "$TRIPLE" = "universal-apple-darwin" ]; then
  command -v lipo >/dev/null 2>&1 || { echo "✗ lipo not found (macOS only)" >&2; exit 1; }
  mkdir -p "$DEST_DIR"
  SLICES=()
  for pair in "x86_64-apple-darwin:red-macos-x86_64" "aarch64-apple-darwin:red-macos-aarch64"; do
    slice_triple="${pair%%:*}"
    slice_asset="${pair##*:}"
    fetch_and_verify "$slice_asset" "$TMPDIR_LOCAL/$slice_asset" \
      || { echo "✗ could not fetch $slice_asset from $REDDB_REPO@$REDDB_VERSION" >&2; exit 1; }
    cp "$TMPDIR_LOCAL/$slice_asset" "$DEST_DIR/red-$slice_triple"
    chmod +x "$DEST_DIR/red-$slice_triple"
    SLICES+=("$DEST_DIR/red-$slice_triple")
  done
  lipo -create -output "$DEST_DIR/red-universal-apple-darwin" "${SLICES[@]}"
  chmod +x "$DEST_DIR/red-universal-apple-darwin"
  echo "▸ sidecar provisioned: binaries/red-universal-apple-darwin  (lipo of both macOS slices, $REDDB_REPO $REDDB_VERSION)"
  exit 0
fi

# ── fetch the binary ──────────────────────────────────────────────────────────
mkdir -p "$DEST_DIR"
BIN_TMP="$TMPDIR_LOCAL/red-bin"
FETCHED_ASSET=""

if fetch_and_verify "$PREFERRED" "$BIN_TMP"; then
  FETCHED_ASSET="$PREFERRED"
elif [ -n "$FALLBACK" ]; then
  echo "  ▸ preferred asset unavailable; trying fallback: $FALLBACK" >&2
  if fetch_and_verify "$FALLBACK" "$BIN_TMP"; then
    FETCHED_ASSET="$FALLBACK"
  fi
fi

if [ -z "$FETCHED_ASSET" ]; then
  echo "✗ could not fetch sidecar from $REDDB_REPO@$REDDB_VERSION" >&2
  echo "  tried: $PREFERRED${FALLBACK:+", $FALLBACK"}" >&2
  echo "  to build from source: scripts/fetch-sidecar.sh --source" >&2
  exit 1
fi

cp "$BIN_TMP" "$DEST_DIR/red-$TRIPLE$DEST_SUFFIX"
chmod +x "$DEST_DIR/red-$TRIPLE$DEST_SUFFIX"
echo "▸ sidecar provisioned: binaries/red-$TRIPLE$DEST_SUFFIX  ($FETCHED_ASSET from $REDDB_REPO $REDDB_VERSION)"
