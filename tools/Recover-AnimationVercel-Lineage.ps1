param(
  [string]$ExpectedRepo = '8friend8ship-cloud/animation'
)

$ErrorActionPreference = 'Stop'
Write-Host 'Animation Vercel lineage recovery (READ-ONLY / NO DEPLOY)'
Write-Host "Expected GitHub repo: $ExpectedRepo"

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw 'Vercel CLI is not installed or not on PATH.'
}

$who = vercel whoami 2>&1 | Out-String
Write-Host $who

$root = Join-Path $env:TEMP ('animation-vercel-recovery-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null

# Read-only discovery only. Never call vercel deploy/link/project add here.
$projectsText = vercel project ls 2>&1 | Out-String
Set-Content (Join-Path $root 'vercel-project-ls.txt') $projectsText -Encoding UTF8
Write-Host $projectsText

# Inspect local .vercel/project.json only when already present; never create it.
$localProjectJson = Join-Path (Get-Location) '.vercel/project.json'
if (Test-Path $localProjectJson) {
  Copy-Item $localProjectJson (Join-Path $root 'existing-project.json')
  $p = Get-Content $localProjectJson -Raw | ConvertFrom-Json
  Write-Host ('EXISTING_LOCAL_PROJECT_ID=' + $p.projectId)
  Write-Host ('EXISTING_LOCAL_ORG_ID=' + $p.orgId)
}

$gitRemote = ''
try { $gitRemote = git remote get-url origin 2>$null } catch {}
Set-Content (Join-Path $root 'git-origin.txt') $gitRemote -Encoding UTF8
Write-Host ('GIT_ORIGIN=' + $gitRemote)

Write-Host 'Recovery output saved to:' $root
Write-Host 'Rule: if no existing Vercel project maps to this repo, STOP. Do not deploy to another project. Project creation/linking is a separate explicit decision.'
