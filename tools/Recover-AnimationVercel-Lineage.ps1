param(
  [string]$ExpectedRepo = '8friend8ship-cloud/animation'
)

$ErrorActionPreference = 'Stop'

function Invoke-NativeText {
  param([string]$Command, [string[]]$Arguments = @())
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $text = (& $Command @Arguments 2>&1 | Out-String)
    $code = $LASTEXITCODE
    return [pscustomobject]@{ Text=$text; ExitCode=$code }
  } finally {
    $ErrorActionPreference = $oldPreference
  }
}

Write-Host 'Animation Vercel lineage recovery V2 (READ-ONLY / NO DEPLOY)'
Write-Host "Expected GitHub repo: $ExpectedRepo"

$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCmd) { throw 'Vercel CLI is not installed or not on PATH.' }
Write-Host ('VERCEL_PATH=' + $vercelCmd.Source)

$who = Invoke-NativeText -Command $vercelCmd.Source -Arguments @('whoami')
Write-Host $who.Text
if ($who.ExitCode -ne 0) {
  throw ('vercel whoami failed with exit code ' + $who.ExitCode + '. No login or link action was attempted.')
}

$root = Join-Path $env:TEMP ('animation-vercel-recovery-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null

# Read-only project inventory. Vercel writes its version banner to stderr on some builds;
# native stderr is captured as text and does not terminate this script.
$projects = Invoke-NativeText -Command $vercelCmd.Source -Arguments @('project','ls')
Set-Content (Join-Path $root 'vercel-project-ls.txt') $projects.Text -Encoding UTF8
Write-Host $projects.Text
if ($projects.ExitCode -ne 0) {
  Write-Warning ('vercel project ls exit=' + $projects.ExitCode + '; continuing with local read-only lineage scan.')
}

# Search existing .vercel/project.json under likely user work roots, read-only.
$rootsToScan = @(
  (Get-Location).Path,
  (Join-Path $env:USERPROFILE 'Desktop'),
  (Join-Path $env:USERPROFILE 'Documents'),
  (Join-Path $env:USERPROFILE 'Downloads')
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

$localMappings = @()
foreach ($scanRoot in $rootsToScan) {
  try {
    $files = Get-ChildItem -Path $scanRoot -Filter project.json -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.Directory.Name -eq '.vercel' }
    foreach ($file in $files) {
      try {
        $p = Get-Content $file.FullName -Raw | ConvertFrom-Json
        $repoRoot = Split-Path (Split-Path $file.FullName -Parent) -Parent
        $gitRemote = ''
        if (Test-Path (Join-Path $repoRoot '.git')) {
          $gitProbe = Invoke-NativeText -Command 'git' -Arguments @('-C',$repoRoot,'remote','get-url','origin')
          if ($gitProbe.ExitCode -eq 0) { $gitRemote = $gitProbe.Text.Trim() }
        }
        $localMappings += [pscustomobject]@{
          RepoRoot=$repoRoot; ProjectId=$p.projectId; OrgId=$p.orgId; ProjectName=$p.projectName; GitOrigin=$gitRemote
        }
      } catch {}
    }
  } catch {}
}
$localMappings = $localMappings | Sort-Object RepoRoot -Unique
$localMappings | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $root 'local-vercel-mappings.json') -Encoding UTF8

$repoNeedle = ($ExpectedRepo -replace '^https?://github.com/','' -replace '\.git$','').ToLowerInvariant()
$repoMatches = @($localMappings | Where-Object {
  $_.GitOrigin -and ((($_.GitOrigin -replace '^https?://github.com/','' -replace '^git@github.com:','' -replace '\.git$','').ToLowerInvariant()) -eq $repoNeedle)
})

Write-Host '--- Existing local Vercel mappings ---'
$localMappings | Format-Table RepoRoot,ProjectName,ProjectId,OrgId,GitOrigin -AutoSize
Write-Host ('OUTPUT_DIR=' + $root)

if ($repoMatches.Count -eq 1) {
  $m = $repoMatches[0]
  Write-Host ('UNIQUE_PROJECT_ID=' + $m.ProjectId)
  Write-Host ('UNIQUE_ORG_ID=' + $m.OrgId)
  Write-Host ('UNIQUE_PROJECT_NAME=' + $m.ProjectName)
  Write-Host ('UNIQUE_REPO_ROOT=' + $m.RepoRoot)
  Write-Host ('GIT_ORIGIN=' + $m.GitOrigin)
  Write-Host 'SAFE_NEXT=READ_EXISTING_PROJECT_ONLY'
  exit 0
}
if ($repoMatches.Count -gt 1) {
  Write-Warning 'Multiple existing local Vercel mappings match the animation repo. Stop and compare; no link/deploy was attempted.'
  exit 3
}

Write-Warning 'No unique local Vercel mapping for the animation repo was found. Project inventory was saved. Stop; do not create/link/deploy.'
exit 4
