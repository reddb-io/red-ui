#!/usr/bin/env bash
# Preflight check: verify that the pinned reddb release has all required
# sidecar assets before the Tauri build matrix starts.
#
# Run this as a required job that gates the build matrix. A missing asset
# surfaces immediately (before any Rust compilation) rather than after each
# platform runner has been provisioned and has spent its warmup time.
#
# Usage:
#   scripts/preflight-release-assets.sh
#   REDDB_VERSION=v1.10.0 scripts/preflight-release-assets.sh
#
# Environment:
#   REDDB_VERSION  Release tag to check. Must match the pin in fetch-sidecar.sh.
#   GITHUB_TOKEN   Strongly recommended — unauthenticated GitHub API is capped
#                  at 60 requests/hour (easily exhausted in active CI).
set -euo pipefail

REDDB_REPO="reddb-io/reddb"
# Keep in sync with the default in scripts/fetch-sidecar.sh.
REDDB_VERSION="${REDDB_VERSION:-v1.9.1}"

# Assets required for the full release matrix.
# Update when adding a new platform to the tauri build matrix in release.yml.
REQUIRED_ASSETS=(
  "red-linux-amd64-musl"    # Linux x86_64 — static musl (preferred)
  "red-darwin-arm64"        # macOS Apple Silicon
  "red-darwin-amd64"        # macOS Intel
  "red-windows-amd64.exe"   # Windows x86_64
)

# ── query the GitHub release ─────────────────────────────────────────────────
GH_AUTH=()
if [ -n "${GITHUB_TOKEN:-}" ]; then
  GH_AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
fi

echo "▸ preflight: checking $REDDB_REPO release $REDDB_VERSION …"
API_URL="https://api.github.com/repos/$REDDB_REPO/releases/tags/$REDDB_VERSION"

HTTP_STATUS="$(curl -o /dev/null -sw '%{http_code}' "${GH_AUTH[@]}" "$API_URL")"
if [ "$HTTP_STATUS" = "404" ]; then
  echo "✗ release $REDDB_VERSION not found in $REDDB_REPO" >&2
  echo "  Check: https://github.com/$REDDB_REPO/releases" >&2
  exit 1
fi
if [ "$HTTP_STATUS" != "200" ]; then
  echo "✗ GitHub API returned HTTP $HTTP_STATUS for $API_URL" >&2
  exit 1
fi

RELEASE_JSON="$(curl -fsSL "${GH_AUTH[@]}" "$API_URL")"

# Extract asset names. Works with both `jq` and a grep fallback.
if command -v jq >/dev/null 2>&1; then
  AVAILABLE_ASSETS="$(echo "$RELEASE_JSON" | jq -r '.assets[].name')"
else
  # Fallback: parse the JSON asset name fields without jq.
  # GitHub asset JSON lines look like:  "name": "red-linux-amd64-musl",
  AVAILABLE_ASSETS="$(echo "$RELEASE_JSON" \
    | grep -o '"name": "[^"]*"' \
    | sed 's/"name": "//;s/"$//' \
    | grep -v '^red-ui')"
fi

# ── check for missing assets ─────────────────────────────────────────────────
MISSING=()
for asset in "${REQUIRED_ASSETS[@]}"; do
  if ! echo "$AVAILABLE_ASSETS" | grep -qxF "$asset"; then
    MISSING+=("$asset")
  fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "✗ release $REDDB_VERSION is missing required sidecar assets:" >&2
  for m in "${MISSING[@]}"; do
    echo "  ✗ $m" >&2
  done
  echo "" >&2
  echo "  Available assets in $REDDB_VERSION:" >&2
  echo "$AVAILABLE_ASSETS" | sed 's/^/    /' >&2
  echo "" >&2
  echo "  To fix: wait for the release to publish all assets, or update" >&2
  echo "  REDDB_VERSION in scripts/fetch-sidecar.sh to a complete release." >&2
  exit 1
fi

echo "✓ all required assets present in $REDDB_VERSION:"
for asset in "${REQUIRED_ASSETS[@]}"; do
  echo "  ✓ $asset"
done
