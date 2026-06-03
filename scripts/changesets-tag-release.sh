#!/usr/bin/env bash
#
# changesets-tag-release.sh — the `publish` step of changesets/action@v1
# (see .github/workflows/changesets.yml). Mirrors reddb's
# scripts/changesets-tag-release.sh, adapted for red-ui.
#
# The action calls this ONLY after all pending changesets have been consumed
# (the "Version Packages" PR was merged and the bump commit just landed on
# main). We:
#   1. Read the canonical version from packages/ui/package.json — the
#      version-locked source of truth for the fixed group
#      (@reddb-io/ui + ui-kit + ui-mcp). `pnpm release:version` already wrote
#      this value into the desktop/Tauri manifests via sync-desktop-version.mjs.
#      (NOTE: the repo-root package.json is NOT in the fixed group and is not a
#      reliable version source here — read packages/ui, like the sync script.)
#   2. Validate it is a release semver.
#   3. Tag and push v<version>. The pushed tag triggers release.yml, which
#      publishes npm (github-hosted, with provenance) and builds Tauri.
#
# Idempotent: if the tag already exists locally or on origin, exit 0 without
# re-pushing — re-running must never break.
#
# Env:
#   GITHUB_TOKEN  Set by changesets/action via the workflow; used implicitly by
#                 `git push` through the checkout token.
set -euo pipefail

VERSION="$(node -e 'process.stdout.write(require("./packages/ui/package.json").version)')"

if [[ -z "$VERSION" ]]; then
  echo "changesets-tag-release: packages/ui/package.json has no version" >&2
  exit 1
fi
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9._-]+)?$ ]]; then
  echo "changesets-tag-release: version '$VERSION' is not a valid semver" >&2
  exit 1
fi

TAG="v$VERSION"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "changesets-tag-release: tag $TAG already exists locally — skipping create"
else
  git tag -a "$TAG" -m "Release $TAG"
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "changesets-tag-release: tag $TAG already on origin — skipping push"
  exit 0
fi

git push origin "refs/tags/$TAG"
echo "changesets-tag-release: pushed $TAG — release.yml will take over"
