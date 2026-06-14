[CmdletBinding()]
param(
  [string]$SiteRepo = "C:\Users\Sarah\Documents\GitHub\personal-site",
  [string]$CommitMessage = "Update Meeting Manager",
  [switch]$NoPull,
  [switch]$NoPush,
  [switch]$AllowDirty,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-ChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Parent,
    [Parameter(Mandatory = $true)][string]$Child
  )

  $parentFull = Get-FullPath $Parent
  $childFull = Get-FullPath $Child

  if (-not $parentFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $parentFull += [System.IO.Path]::DirectorySeparatorChar
  }

  if (-not $childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside expected directory. Parent: $parentFull Child: $childFull"
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string]$Repo,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [switch]$Capture
  )

  if ($Capture) {
    $output = & git -C $Repo @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "git $($Arguments -join ' ') failed in $Repo"
    }
    return @($output)
  }

  & git -C $Repo @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed in $Repo"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git was not found in PATH."
}

$sourceRoot = Get-FullPath $PSScriptRoot
$siteRoot = Get-FullPath $SiteRepo
$staticRoot = Join-Path $siteRoot "static"
$destRoot = Join-Path $staticRoot "meeting-manager"

if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot "meeting-manager.html"))) {
  throw "meeting-manager.html was not found in $sourceRoot"
}

if (-not (Test-Path -LiteralPath (Join-Path $siteRoot ".git"))) {
  throw "Site repo does not look like a git repo: $siteRoot"
}

if (-not (Test-Path -LiteralPath (Join-Path $siteRoot "config.toml"))) {
  throw "Site repo does not look like the Hugo personal-site repo: $siteRoot"
}

$requiredPaths = @(
  "meeting-manager.html",
  "vendor\babel.min.js",
  "vendor\react-dom.production.min.js",
  "vendor\react.production.min.js",
  "fonts\inter\Inter_18pt-Regular.ttf",
  "fonts\inter\Inter_18pt-Medium.ttf",
  "fonts\inter\Inter_18pt-SemiBold.ttf",
  "fonts\inter\Inter_18pt-Bold.ttf",
  "fonts\inter\Inter_18pt-ExtraBold.ttf",
  "fonts\inter\Inter_18pt-Black.ttf",
  "favicon-96x96.png",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "site.webmanifest",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png"
)

foreach ($relativePath in $requiredPaths) {
  $sourcePath = Join-Path $sourceRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Required source asset is missing: $sourcePath"
  }
}

Assert-ChildPath -Parent $staticRoot -Child $destRoot

$preStaged = @(Invoke-Git -Repo $siteRoot -Arguments @("diff", "--cached", "--name-only") -Capture)
if ($preStaged.Count -gt 0) {
  throw "The website repo already has staged changes. Commit or unstage them before publishing Meeting Manager."
}

$preStatus = @(Invoke-Git -Repo $siteRoot -Arguments @("status", "--porcelain") -Capture)
if (($preStatus.Count -gt 0) -and (-not $AllowDirty)) {
  throw "The website repo has local changes. Commit/stash them first, or rerun with -AllowDirty to stage only static/meeting-manager."
}

if ($DryRun) {
  Write-Host "Dry run: would copy $sourceRoot\meeting-manager.html and supporting assets to $destRoot"
  Write-Host "Dry run: would commit '$CommitMessage' in $siteRoot"
  if ($NoPush) {
    Write-Host "Dry run: push disabled by -NoPush"
  } else {
    Write-Host "Dry run: would run git push from $siteRoot"
  }
  exit 0
}

if (-not $NoPull) {
  if ($preStatus.Count -gt 0) {
    Write-Host "Skipping git pull because the website repo has local changes."
  } else {
    & git -C $siteRoot rev-parse --abbrev-ref --symbolic-full-name "@{u}" *> $null
    if ($LASTEXITCODE -eq 0) {
      Invoke-Git -Repo $siteRoot -Arguments @("pull", "--ff-only")
    } else {
      Write-Host "Skipping git pull because the current website branch has no upstream."
    }
  }
}

if (Test-Path -LiteralPath $destRoot) {
  Assert-ChildPath -Parent $staticRoot -Child $destRoot
  Remove-Item -LiteralPath $destRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $destRoot | Out-Null

Copy-Item -LiteralPath (Join-Path $sourceRoot "meeting-manager.html") -Destination (Join-Path $destRoot "index.html") -Force

$assetFiles = @(
  "favicon-96x96.png",
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "site.webmanifest",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png",
  "whip-logo.svg"
)

foreach ($fileName in $assetFiles) {
  $sourcePath = Join-Path $sourceRoot $fileName
  if (Test-Path -LiteralPath $sourcePath) {
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $destRoot $fileName) -Force
  }
}

foreach ($directoryName in @("fonts", "vendor")) {
  Copy-Item -LiteralPath (Join-Path $sourceRoot $directoryName) -Destination (Join-Path $destRoot $directoryName) -Recurse -Force
}

$manifestPath = Join-Path $destRoot "site.webmanifest"
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
foreach ($icon in $manifest.icons) {
  $icon.src = [System.IO.Path]::GetFileName($icon.src)
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

Invoke-Git -Repo $siteRoot -Arguments @("add", "-A", "--", "static/meeting-manager")

& git -C $siteRoot diff --cached --quiet -- "static/meeting-manager"
$diffExit = $LASTEXITCODE
if ($diffExit -eq 0) {
  Write-Host "No Meeting Manager changes to commit."
  if (-not $NoPush) {
    Write-Host "Skipping push because no commit was created."
  }
  exit 0
}

if ($diffExit -ne 1) {
  throw "git diff --cached failed in $siteRoot"
}

Invoke-Git -Repo $siteRoot -Arguments @("commit", "-m", $CommitMessage)

if ($NoPush) {
  Write-Host "Committed website update. Push skipped by -NoPush."
  exit 0
}

Invoke-Git -Repo $siteRoot -Arguments @("push")
Write-Host "Published Meeting Manager to https://sarahmakmq.com/meeting-manager/"
