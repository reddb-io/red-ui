#!/usr/bin/env bash
#
# red-ui — one-line installer / auto-upgrader.
#
#   curl -fsSL https://raw.githubusercontent.com/reddb-io/red-ui/main/install.sh | bash
#   curl -fsSL .../install.sh | bash -s -- --version v0.4.0
#   curl -fsSL .../install.sh | bash -s -- --appimage      # single-file AppImage instead
#
# OS- and arch-agnostic: it detects your platform (linux/macOS/windows · x86_64/aarch64) and
# installs the matching release asset, verifying its sha256 against checksums.txt.
#   • Linux   → the **.deb** by default (system WebKitGTK/glibc, so the bundled `red`
#               sidecar starts cleanly). --appimage for the portable single-file build.
#   • macOS / Windows → downloads + verifies the GUI installer (.dmg / .exe) and hands it to
#               you to open (GUI installers need a click).
# A platform with no published build yet degrades to a clear message. Remove with uninstall.sh.
#
# UI: when stdout is a TTY (and NO_COLOR isn't set) the installer paints a colored banner,
# shows a spinner while downloading, and frames the final report in a box. In non-TTY
# contexts (CI logs, `... > install.log`) it falls back to plain text so logs stay greppable.
set -euo pipefail

REPO="reddb-io/red-ui"
BIN_NAME="red-ui"
SHORTCUT="rui"
INSTALL_DIR="${RED_UI_INSTALL_DIR:-${INSTALL_DIR:-$HOME/.local/bin}}"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/red-ui"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
VERSION=""
FORCE=0
MODIFY_PATH=1
LINUX_FORMAT="deb" # deb (default) | appimage
FORCE_NO_COLOR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="${2:-}"; shift 2 ;;
    --install-dir) INSTALL_DIR="${2:?}"; shift 2 ;;
    --appimage) LINUX_FORMAT="appimage"; shift ;;
    --deb) LINUX_FORMAT="deb"; shift ;;
    --force) FORCE=1; shift ;;
    --no-modify-path) MODIFY_PATH=0; shift ;;
    --no-color) FORCE_NO_COLOR=1; shift ;;
    -h|--help)
      cat <<EOF
red-ui installer

Usage: install.sh [OPTIONS]
  --version <vX.Y.Z>     Install/upgrade to a specific release (default: latest)
  --appimage             Linux: install the single-file AppImage to ~/.local/bin (no sudo)
  --deb                  Linux: install the .deb via apt (default; needs sudo)
  --install-dir <path>   AppImage only — where to put the binary (default: ~/.local/bin)
  --force                Reinstall even if already on the latest version
  --no-modify-path       AppImage only — don't touch your shell rc; just print the PATH hint
  --no-color             Plain output (no ANSI colors / spinner / box) for CI logs
  -h, --help             This help

Env: RED_UI_INSTALL_DIR overrides --install-dir; NO_COLOR=1 forces plain output.
EOF
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── ui: colors / spinner / box ─────────────────────────────────────────────
# ANSI helpers. We only emit escapes when (a) stdout is a TTY, (b) NO_COLOR
# is unset, and (c) the user didn't pass --no-color. That keeps `... > log`
# and CI runs greppable while giving interactive users a colored view.
if [[ -t 1 && -z "${NO_COLOR:-}" && "$FORCE_NO_COLOR" != "1" ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'
  C_CYAN=$'\033[36m'
  C_BRAND=$'\033[38;5;197m'  # surgical red, matches red-ui's #ff2056 accent
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""
  C_YELLOW=""; C_BLUE=""; C_CYAN=""; C_BRAND=""
fi
UI_IS_TTY=0
[[ -t 1 && -z "${NO_COLOR:-}" && "$FORCE_NO_COLOR" != "1" ]] && UI_IS_TTY=1

# Unicode glyphs render fine on every modern terminal (macOS Terminal, iTerm2,
# gnome-terminal, Windows Terminal). When UI is off we fall back to ASCII so
# plain logs still read correctly.
if [[ "$UI_IS_TTY" == "1" ]]; then
  G_ARROW="▸"
  G_OK="✓"
  G_WARN="!"
  G_ERR="✗"
  G_SPINNER='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
else
  G_ARROW="→"; G_OK="✓"; G_WARN="!"; G_ERR="✗"
  G_SPINNER='|/-\'
fi

# ── ui primitives ─────────────────────────────────────────────────────────
say()  { printf '%s%s%s %s\n' "$C_DIM" "$G_ARROW" "$C_RESET" "$*"; }
ok()   { printf '%s%s%s %s\n' "$C_GREEN" "$G_OK" "$C_RESET" "$*"; }
warn() { printf '%s%s%s %s\n' "$C_YELLOW" "$G_WARN" "$C_RESET" "$*" >&2; }
err()  { printf '%s%s%s %s\n' "$C_RED" "$G_ERR" "$C_RESET" "$*" >&2; exit 1; }

# Print a numbered step header (e.g. "Step 2/4 · Resolving latest release").
# Stops any leftover spinner first so the cursor isn't stomping into the next line.
step() {
  stop_spinner 2>/dev/null || true
  local n="$1" total="$2" title="$3"
  printf '\n%s%s Step %s/%s %s%s\n' \
    "$C_BOLD" "$C_BRAND" "$n" "$total" "$title" "$C_RESET"
}

# Animate a spinner while a background job runs. Caller spawns the work,
# captures its PID, and we poll `kill -0` until it goes away. No-op when UI
# is off — installs stay fast and logs stay readable.
SPIN_PID=""
SPIN_ACTIVE=0
SPIN_WATCHER=""
spin_start() {
  [[ "$UI_IS_TTY" == "1" ]] || return 0
  local label="$1" pid="$2"
  SPIN_PID="$pid"
  SPIN_ACTIVE=1
  # Hide the cursor while we draw over the same line.
  printf '\033[?25l' >&2
  (
    local i=0 frame
    while kill -0 "$SPIN_PID" 2>/dev/null; do
      frame="${G_SPINNER:$((i % ${#G_SPINNER})):1}"
      printf '\r%s%s%s %s' "$C_CYAN" "$frame" "$C_RESET" "$label" >&2
      i=$((i + 1))
      sleep 0.08
    done
  ) &
  SPIN_WATCHER=$!
}

stop_spinner() {
  [[ "${SPIN_ACTIVE:-0}" == "1" ]] || return 0
  SPIN_ACTIVE=0
  wait "$SPIN_WATCHER" 2>/dev/null || true
  # Erase the spinner line and restore the cursor. No-op when UI is off so
  # non-TTY logs (CI, `... > install.log`) stay free of stray escapes.
  if [[ "$UI_IS_TTY" == "1" ]]; then
    printf '\r\033[2K\033[?25h' >&2
  fi
  SPIN_PID=""
}

# Frame a multi-line message in a Unicode box. Used for the success / error
# summaries at the end so the final result stands out from the log noise.
# `box "title" "line1" "line2" …` — `title` is required, body lines optional.
box() {
  local title="$1"; shift
  local width=64 pad
  (( ${#title} + 4 > width )) && width=$((${#title} + 4))
  pad=$(printf '%*s' "$((width - ${#title} - 2))" "")
  printf '%s╭─ %s %s%s%s╮\n' "$C_BRAND$C_BOLD" "$title" "$pad" "$C_RESET" "$C_BRAND"
  if [[ $# -gt 0 ]]; then
    local line
    for line in "$@"; do
      printf '%s│%s %-*s %s│\n' "$C_BRAND" "$C_RESET" "$((width - 2))" "$line" "$C_BRAND"
    done
  fi
  printf '%s╰%s╯%s\n' "$C_BRAND" "$(printf '─%.0s' $(seq 1 "$width"))" "$C_RESET"
}

# OS-aware banner. Only on interactive runs — CI doesn't need the logo.
banner() {
  [[ "$UI_IS_TTY" == "1" ]] || return 0
  printf '%s%s  R E D · U I%s\n' "$C_BRAND$C_BOLD" "" "$C_RESET"
  printf '%sUniversal client for reddb · embedded, server, docker, cluster%s\n' "$C_DIM" "$C_RESET"
}

# Make sure the spinner is cleared on any exit path so a stray ^C doesn't
# leave the cursor hidden or a half-drawn frame on screen.
trap 'stop_spinner; [[ "$UI_IS_TTY" == "1" ]] && printf "\033[?25h" >&2' EXIT INT TERM

# ── platform ──────────────────────────────────────────────────────────────
detect_platform() {
  local os arch
  os="$(uname -s)"; arch="$(uname -m)"
  case "$os" in
    Linux*)               OS="linux" ;;
    Darwin*)              OS="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *) err "Unsupported OS: $os" ;;
  esac
  case "$arch" in
    x86_64|amd64)   ARCH="x86_64" ;;
    aarch64|arm64)  ARCH="aarch64" ;;
    *) err "Unsupported architecture: $arch" ;;
  esac
}

# Filename of the asset for this platform (must match release.yml's staged names).
asset_name() {
  case "$OS" in
    linux)   [[ "$LINUX_FORMAT" == "appimage" ]] && printf '%s-linux-%s.AppImage' "$BIN_NAME" "$ARCH" || printf '%s-linux-%s.deb' "$BIN_NAME" "$ARCH" ;;
    darwin)  printf '%s-darwin-%s.dmg' "$BIN_NAME" "$ARCH" ;;
    windows) printf '%s-windows-%s-setup.exe' "$BIN_NAME" "$ARCH" ;;
  esac
}

# ── network ────────────────────────────────────────────────────────────────
have() { command -v "$1" >/dev/null 2>&1; }

download() { # url dest [label]
  # Spin in the foreground while curl/wget runs in the background. We need
  # curl's exit status, so capture it through $? after `wait`. The asset is
  # 80–120 MB on Linux; the spinner is the difference between "is it hung?"
  # and "I can see it's moving".
  local url="$1" dest="$2" label="${3:-downloading}"
  (
    if have curl; then curl -fSL --retry 3 -o "$dest" "$url"
    elif have wget; then wget -qO "$dest" "$url"
    else err "need curl or wget"
    fi
  ) &
  local dl_pid=$!
  spin_start "$label" "$dl_pid"
  wait "$dl_pid"; local rc=$?
  stop_spinner
  return $rc
}

# Resolve the release tag without hitting the rate-limited JSON API: GitHub's
# /releases/latest endpoint 302-redirects to /releases/tag/<tag>, so we read the
# final URL. For an explicit --version we trust the tag as given.
resolve_tag() {
  if [[ -n "$VERSION" ]]; then printf '%s' "$VERSION"; return; fi
  local url=""
  if have curl; then
    url="$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
            "https://github.com/$REPO/releases/latest" 2>/dev/null || true)"
  elif have wget; then
    url="$(wget -q -S --max-redirect=10 -O /dev/null \
            "https://github.com/$REPO/releases/latest" 2>&1 \
            | awk '/^[[:space:]]*Location:/ {print $2}' | tail -1 || true)"
  fi
  [[ "$url" == *"/releases/tag/"* ]] || return 1
  printf '%s' "${url##*/releases/tag/}"
}

asset_url()    { printf 'https://github.com/%s/releases/download/%s/%s' "$REPO" "$1" "$2"; }
checksum_url() { printf 'https://github.com/%s/releases/download/%s/checksums.txt' "$REPO" "$1"; }

sha256_of() { # file -> hex
  if have sha256sum; then sha256sum "$1" | awk '{print $1}'
  elif have shasum;   then shasum -a 256 "$1" | awk '{print $1}'
  else return 1; fi
}

# Verify $1 (file) against the checksums.txt body in $2; each line is "<hex>  <name>".
verify_sha256() { # file checksums_text asset_name
  local want got
  want="$(printf '%s\n' "$2" | awk -v f="$3" '$2==f || $2=="*"f {print $1; exit}')"
  [[ -n "$want" ]] || { warn "no checksum for $3 in checksums.txt — skipping verify"; return 0; }
  got="$(sha256_of "$1")" || { warn "no sha256 tool found — skipping verify"; return 0; }
  [[ "$got" == "$want" ]] || err "checksum mismatch for $3
   expected $want
   got      $got"
  ok "sha256 verified"
}

# Download $asset for $tag into $dir and verify it. Sets $DL to the file path.
fetch_verified() { # tag asset dir
  local tag="$1" asset="$2" dir="$3" url ck_text
  url="$(asset_url "$tag" "$asset")"
  download "$url" "$dir/$asset" "downloading $asset" \
    || err "download failed — is $asset published in $tag? ($url)"
  ck_text="$(download "$(checksum_url "$tag")" /dev/stdout "fetching checksums.txt" 2>/dev/null || true)"
  if [[ -n "$ck_text" ]]; then verify_sha256 "$dir/$asset" "$ck_text" "$asset"
  else warn "no checksums.txt in $tag — skipping verify"; fi
  DL="$dir/$asset"
}

# ── linux: .deb via apt (default) ──────────────────────────────────────────
deb_installed_version() { dpkg-query -W -f='${Version}' "$BIN_NAME" 2>/dev/null || printf ''; }

# Absolute path of the binary the .deb installs (e.g. /usr/bin/red-ui).
deb_binary_path() { dpkg-query -L "$BIN_NAME" 2>/dev/null | grep -m1 -E "/bin/${BIN_NAME}\$" || true; }

# A prior `--appimage` run drops the 100 MB+ AppImage into ~/.local/bin, which
# usually precedes /usr/bin on PATH and shadows the .deb we just installed — the
# user keeps launching the old AppImage and its bundled-glib errors (e.g.
# "undefined symbol: g_task_set_static_name" from the system gvfs modules).
# Remove our own managed AppImage so /usr/bin/$BIN_NAME wins. Only touches files
# this installer created: $DATA_DIR/version is written solely by install_appimage.
clear_appimage_shadow() {
  [[ -f "$DATA_DIR/version" ]] || return 0
  say "removing prior AppImage install — it shadows the .deb on PATH"
  rm -f "$INSTALL_DIR/$BIN_NAME" "$DATA_DIR/version" "$DESKTOP_DIR/red-ui.desktop"
  rmdir "$DATA_DIR" 2>/dev/null || true
  have update-desktop-database && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
}

# The .deb ships red-ui and the `red` sidecar in /usr/bin but no `rui` alias.
# (Re)create it as a symlink in /usr/local/bin — that dir is on PATH for every
# shell (bash/zsh/fish) out of the box, so `rui` just works with no rc-file
# edits, unlike ~/.local/bin. Points at the system binary so `rui` tracks upgrades.
ensure_deb_shortcut() {
  local deb_bin sudo="" dst="/usr/local/bin/$SHORTCUT"
  deb_bin="$(deb_binary_path)"
  [[ -n "$deb_bin" ]] || { warn "could not locate the installed $BIN_NAME binary; skipping $SHORTCUT alias"; return 0; }
  [[ $EUID -ne 0 ]] && have sudo && sudo="sudo"
  $sudo mkdir -p /usr/local/bin && $sudo ln -sf "$deb_bin" "$dst" \
    && ok "linked $SHORTCUT → $deb_bin ($dst)" \
    || warn "could not create the $SHORTCUT symlink in /usr/local/bin"
}

install_deb() {
  have dpkg || err "no dpkg on this system — re-run with --appimage for the portable build"
  local tag asset cur tmp sudo=""
  tag="$(resolve_tag)" || err "could not resolve the latest release tag"
  asset="$(asset_name)"
  cur="$(deb_installed_version)"

  if [[ -n "$cur" && "v$cur" == "$tag" && "$FORCE" != "1" ]]; then
    ok "red-ui $cur (.deb) is already the latest — nothing to do. (--force to reinstall)"
    return 0
  fi

  step 1 4 "Resolving latest release"
  say "${cur:+upgrading $cur → }${tag} (.deb · $OS/$ARCH)"

  step 2 4 "Downloading + verifying"
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/red-ui.XXXXXX")"
  trap '[ -n "${tmp:-}" ] && rm -rf "$tmp"' RETURN
  fetch_verified "$tag" "$asset" "$tmp"

  # apt drops privileges to the unprivileged "_apt" user to fetch the local file;
  # mktemp -d is 0700, so _apt can't traverse it and apt warns "Download is
  # performed unsandboxed as root … Permission denied". Widen the path it reads.
  chmod 755 "$tmp" && chmod 644 "$DL"

  step 3 4 "Installing via apt"
  [[ $EUID -ne 0 ]] && have sudo && sudo="sudo"
  say "you may be prompted for your password…"
  if have apt-get; then
    $sudo apt-get install -y ${FORCE:+--reinstall --allow-downgrades} "$DL"
  else
    $sudo dpkg -i "$DL" || { $sudo apt-get -f install -y; $sudo dpkg -i "$DL"; }
  fi
  ok "${cur:+upgraded to }red-ui $tag installed (.deb)"
  clear_appimage_shadow
  ensure_deb_shortcut

  step 4 4 "Verifying"
  verify_install "$(deb_binary_path)"

  box "✔ red-ui $tag ready" \
    "" \
    "  $BIN_NAME                     # run the desktop app" \
    "  $SHORTCUT red://localhost      # connect straight to a server"
}

# ── path wiring (AppImage only) ─────────────────────────────────────────────
on_path() { case ":$PATH:" in *":$INSTALL_DIR:"*) return 0 ;; *) return 1 ;; esac; }

rc_file() {
  case "${SHELL##*/}" in
    zsh)  printf '%s' "${ZDOTDIR:-$HOME}/.zshrc" ;;
    bash) [[ -f "$HOME/.bashrc" ]] && printf '%s' "$HOME/.bashrc" || printf '%s' "$HOME/.profile" ;;
    fish) printf '%s' "${XDG_CONFIG_HOME:-$HOME/.config}/fish/config.fish" ;;
    *)    printf '%s' "$HOME/.profile" ;;
  esac
}

ensure_path() {
  on_path && return 0
  if [[ "$MODIFY_PATH" == "0" ]]; then
    warn "$INSTALL_DIR is not on your PATH — add: export PATH=\"$INSTALL_DIR:\$PATH\""
    return 0
  fi
  local rc; rc="$(rc_file)"
  mkdir -p "$(dirname "$rc")"
  if [[ -f "$rc" ]] && grep -q '# >>> red-ui >>>' "$rc"; then return 0; fi
  # fish doesn't read .profile and uses its own PATH syntax — write the right one for the
  # user's shell so the line actually takes effect (a bash `export` in config.fish is inert).
  if [[ "${SHELL##*/}" == "fish" ]]; then
    {
      printf '\n# >>> red-ui >>>\n'
      printf 'fish_add_path %s\n' "$INSTALL_DIR"
      printf '# <<< red-ui <<<\n'
    } >> "$rc"
  else
    {
      printf '\n# >>> red-ui >>>\n'
      printf 'export PATH="%s:$PATH"\n' "$INSTALL_DIR"
      printf '# <<< red-ui <<<\n'
    } >> "$rc"
  fi
  ok "added $INSTALL_DIR to PATH in $rc — open a new shell or: source $rc"
}

write_desktop_entry() {
  mkdir -p "$DESKTOP_DIR" 2>/dev/null || return 0
  # MimeType registers the red:// deep-link schemes (the .deb gets this from
  # Tauri's bundler; the AppImage needs it written here for links to work).
  cat > "$DESKTOP_DIR/red-ui.desktop" <<EOF || return 0
[Desktop Entry]
Type=Application
Name=red-ui
Comment=Universal client for reddb
Exec=$INSTALL_DIR/$BIN_NAME %U
Terminal=false
Categories=Development;Utility;
MimeType=x-scheme-handler/red;x-scheme-handler/red+tls;x-scheme-handler/red+unix;x-scheme-handler/red+http;x-scheme-handler/red+https;
EOF
  have update-desktop-database && update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
}

appimage_installed_version() { [[ -f "$DATA_DIR/version" ]] && cat "$DATA_DIR/version" || printf ''; }

# ── linux: AppImage single-file (opt-in via --appimage) ─────────────────────
install_appimage() {
  local tag cur asset tmp
  tag="$(resolve_tag)" || err "could not resolve the latest release tag"
  asset="$(asset_name)"
  cur="$(appimage_installed_version)"

  if [[ -n "$cur" && "$cur" == "$tag" && "$FORCE" != "1" ]]; then
    ok "red-ui $cur (AppImage) is already the latest — nothing to do. (--force to reinstall)"
    return 0
  fi

  step 1 4 "Resolving latest release"
  if [[ -n "$cur" ]]; then say "upgrading $cur → $tag (AppImage · $OS/$ARCH)"; else say "installing $tag (AppImage · $OS/$ARCH)"; fi

  step 2 4 "Downloading + verifying"
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/red-ui.XXXXXX")"
  trap '[ -n "${tmp:-}" ] && rm -rf "$tmp"' RETURN
  fetch_verified "$tag" "$asset" "$tmp"

  # The .deb (system libs) is the supported Linux build; an AppImage installed
  # alongside it lands in ~/.local/bin and usually shadows /usr/bin/$BIN_NAME on
  # PATH, so the user ends up running the older-glibc bundle. Warn, don't block.
  if have dpkg && [[ -n "$(deb_installed_version)" ]]; then
    warn "the .deb is already installed; this AppImage in $INSTALL_DIR will shadow it on PATH."
    warn "prefer the .deb (re-run without --appimage), or remove it: sudo apt remove $BIN_NAME"
  fi

  step 3 4 "Installing"
  mkdir -p "$INSTALL_DIR" "$DATA_DIR"
  chmod +x "$DL"
  mv -f "$DL" "$INSTALL_DIR/$BIN_NAME.new"
  mv -f "$INSTALL_DIR/$BIN_NAME.new" "$INSTALL_DIR/$BIN_NAME"
  ln -sf "$BIN_NAME" "$INSTALL_DIR/$SHORTCUT"
  printf '%s\n' "$tag" > "$DATA_DIR/version"
  write_desktop_entry
  ensure_path

  step 4 4 "Verifying"
  verify_install "$INSTALL_DIR/$BIN_NAME"

  box "✔ red-ui $tag ready" \
    "" \
    "  $BIN_NAME                     # run the desktop app" \
    "  $SHORTCUT red://localhost      # connect straight to a server" \
    "" \
    "binary: $INSTALL_DIR/$BIN_NAME"
}

# ── macOS / Windows: download + verify, then hand off the GUI installer ─────
# GUI installers (.dmg / .exe) need a human to click through, so we fetch + verify
# the right asset for this os/arch and drop it where the user can find it, instead of
# installing headless. Degrades gracefully when that platform isn't published yet.
install_gui() {
  local tag asset tmp ck_text dest
  tag="$(resolve_tag)" || err "could not resolve the latest release tag"
  asset="$(asset_name)"

  step 1 3 "Resolving latest release"
  say "red-ui $tag · $OS/$ARCH"

  step 2 3 "Downloading + verifying"
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/red-ui.XXXXXX")"
  trap '[ -n "${tmp:-}" ] && rm -rf "$tmp"' RETURN

  if ! download "$(asset_url "$tag" "$asset")" "$tmp/$asset" "downloading $asset"; then
    warn "no $OS/$ARCH build published in $tag yet."
    say  "browse all assets: https://github.com/$REPO/releases/tag/$tag"
    return 0
  fi
  ck_text="$(download "$(checksum_url "$tag")" /dev/stdout "fetching checksums.txt" 2>/dev/null || true)"
  [[ -n "$ck_text" ]] && verify_sha256 "$tmp/$asset" "$ck_text" "$asset"

  step 3 3 "Saving installer"
  dest="$HOME/Downloads"; [[ -d "$dest" ]] || dest="$PWD"
  mv -f "$tmp/$asset" "$dest/$asset"

  case "$OS" in
    darwin)
      box "✔ red-ui $tag downloaded" \
        "" \
        "  $dest/$asset" \
        "" \
        "1. open the .dmg" \
        "2. drag red-ui into Applications" \
        "3. first launch: right-click → Open (unsigned build)"
      ;;
    windows)
      box "✔ red-ui $tag downloaded" \
        "" \
        "  $dest/$asset" \
        "" \
        "run the .exe to install."
      ;;
  esac
}

# Post-install sanity check: print the binary versions so a broken sidecar (e.g. a glibc-
# incompatible `red`) surfaces here, at install time, instead of as a blank window on first
# launch. $1 is the red-ui binary path (it may not be on PATH in this shell yet).
verify_install() { # red_ui_path
  local app="$1" red v
  say "verifying…"
  if [[ -x "$app" ]]; then
    # `timeout` guards builds that ignore --version (they would otherwise
    # launch the GUI and hang the installer).
    v="$(timeout 10 "$app" --version 2>/dev/null | head -n1 || true)"
    [[ -n "$v" ]] && ok "$v" || warn "$BIN_NAME --version produced no output (build older than this installer expects)"
  else
    warn "$BIN_NAME not found at $app"
  fi
  # The .deb installs a standalone /usr/bin/red; the AppImage bundles it (nothing on disk).
  red="$(command -v red 2>/dev/null || true)"
  if [[ -n "$red" ]]; then
    if v="$("$red" --version 2>&1)"; then
      ok "$v"
    else
      warn "the embedded reddb sidecar (red) failed to run: $v"
      warn "the app would open to a blank screen — re-run with --force, or report: $red --version"
    fi
  fi
}

main() {
  banner
  detect_platform
  case "$OS" in
    linux)          [[ "$LINUX_FORMAT" == "appimage" ]] && install_appimage || install_deb ;;
    darwin|windows) install_gui ;;
  esac
}

main
