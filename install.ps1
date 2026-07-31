# red-ui — one-line installer for Windows.
#
#   irm https://raw.githubusercontent.com/reddb-io/red-ui/main/install.ps1 | iex
#
# The PowerShell counterpart to install.sh: same repo, same release, same
# checksum verification. Windows users get this instead of the bash script
# because `| iex` is the idiom they already have (no Git Bash required).
#
# Environment overrides — the only way to pass options through `| iex`:
#   $env:RED_UI_VERSION       = 'v0.4.0'   # default: latest published release
#   $env:RED_UI_INSTALLER     = 'msi'      # 'nsis' (default, per-user) | 'msi' (per-machine, elevates)
#   $env:RED_UI_DOWNLOAD_ONLY = '1'        # fetch + verify, don't run the installer
#   $env:GITHUB_TOKEN                      # lifts the 60/h anonymous API rate limit
#
# Windows PowerShell 5.1 compatible — no PS7-only syntax.

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Repo = 'reddb-io/red-ui'
$Version = if ($env:RED_UI_VERSION) { $env:RED_UI_VERSION } else { 'latest' }
$Kind = if ($env:RED_UI_INSTALLER) { $env:RED_UI_INSTALLER.ToLower() } else { 'nsis' }

function Write-Step($msg) { Write-Host "▸ $msg" }

$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -eq 'ARM64') {
  Write-Warning "No native ARM64 build yet — installing the x64 build (runs under emulation)."
} elseif ($arch -ne 'AMD64') {
  throw "Unsupported architecture: $arch"
}

$headers = @{ 'User-Agent' = 'red-ui-installer' }
if ($env:GITHUB_TOKEN) { $headers['Authorization'] = "Bearer $env:GITHUB_TOKEN" }

# /releases/latest only ever returns a published, non-draft release — which is
# what release.yml's publish job produces once every platform has built.
$apiUrl = if ($Version -eq 'latest') {
  "https://api.github.com/repos/$Repo/releases/latest"
} else {
  "https://api.github.com/repos/$Repo/releases/tags/$Version"
}

Write-Step "Resolving $Version from $Repo"
$release = Invoke-RestMethod -Uri $apiUrl -Headers $headers
Write-Step "Release $($release.tag_name)"

# Prefer the stable, version-free name the release workflow stages (the same
# one install.sh fetches, and the only one covered by checksums.txt); fall
# back to Tauri's versioned bundle names.
$candidates = if ($Kind -eq 'msi') {
  @('^red-ui-windows-x86_64\.msi$', '_x64.*\.msi$')
} else {
  @('^red-ui-windows-x86_64-setup\.exe$', '_x64-setup\.exe$')
}
$asset = $null
foreach ($pattern in $candidates) {
  $asset = $release.assets | Where-Object { $_.name -match $pattern } | Select-Object -First 1
  if ($asset) { break }
}
if (-not $asset) {
  $names = ($release.assets | ForEach-Object { $_.name }) -join ', '
  throw "No Windows $Kind installer in $($release.tag_name). Assets: $names"
}

$dest = Join-Path ([IO.Path]::GetTempPath()) $asset.name
Write-Step "Downloading $($asset.name)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dest -Headers $headers -UseBasicParsing

# checksums.txt is attached by the release workflow once every platform has
# uploaded. Absent on releases that predate it — warn rather than fail.
$sums = $release.assets | Where-Object { $_.name -eq 'checksums.txt' } | Select-Object -First 1
if ($sums) {
  # GitHub serves release assets as application/octet-stream, so
  # Invoke-WebRequest's .Content comes back as Byte[] rather than a string (on
  # 5.1 and 7 alike) — write it out and read it back as text instead.
  $sumsPath = Join-Path ([IO.Path]::GetTempPath()) 'red-ui-checksums.txt'
  Invoke-WebRequest -Uri $sums.browser_download_url -OutFile $sumsPath -Headers $headers -UseBasicParsing
  $line = Get-Content -Path $sumsPath | Where-Object { $_ -match "\s$([regex]::Escape($asset.name))\s*$" } | Select-Object -First 1
  Remove-Item $sumsPath -Force -ErrorAction SilentlyContinue
  if ($line -and $line -match '([0-9a-fA-F]{64})') {
    $expected = $Matches[1].ToLower()
    $actual = (Get-FileHash -Path $dest -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $expected) {
      Remove-Item $dest -Force
      throw "Checksum mismatch for $($asset.name): $actual != $expected"
    }
    Write-Step "Checksum verified"
  } else {
    Write-Warning "$($asset.name) is not listed in checksums.txt — skipping verification."
  }
} else {
  Write-Warning "No checksums.txt in this release — skipping verification."
}

if ($env:RED_UI_DOWNLOAD_ONLY) {
  Write-Step "Downloaded to $dest (RED_UI_DOWNLOAD_ONLY set, not installing)"
  return
}

Write-Step "Installing $($asset.name)"
if ($Kind -eq 'msi') {
  # WiX bundles install per-machine, so this prompts for elevation.
  $p = Start-Process msiexec -ArgumentList @('/i', "`"$dest`"", '/qn', '/norestart') -Wait -PassThru
} else {
  # Tauri's NSIS bundle is a per-user install; /S is its silent switch.
  $p = Start-Process $dest -ArgumentList '/S' -Wait -PassThru
}
if ($p.ExitCode -ne 0) { throw "Installer exited with code $($p.ExitCode)" }

Remove-Item $dest -Force -ErrorAction SilentlyContinue
Write-Step "red-ui $($release.tag_name) installed — launch it from the Start menu."
