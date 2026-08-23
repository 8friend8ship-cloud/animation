param(
  [switch]$DryRun = $true
)

$ErrorActionPreference = 'Stop'
$repo = '8friend8ship-cloud/animation'
$targetSpreadsheetIds = @(
  '1dgLhQnFnOOZgI2K_vxtWbFrTUnvduhQT_OqJmlkJmT4', # Animation-BSH-VTubeTest-1
  '1b0VkG1lttudtgctqRQCC2ZydjwrPLu2cA3vxSBUD7_g'  # ANIMATION_SEED_LIBRARY
)

Write-Host 'Animation runtime lineage recovery (NO NEW PROJECT / NO NEW DEPLOYMENT)'
Write-Host "Repository: $repo"
Write-Host "DryRun: $DryRun"

if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
  throw 'clasp is not installed or not on PATH.'
}

$who = clasp login --status 2>&1
Write-Host $who

$root = Join-Path $env:TEMP ('animation-runtime-recovery-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null

# Do not create a new Apps Script project. Search only already-authorized projects.
$listRaw = clasp list 2>&1 | Out-String
Set-Content -Path (Join-Path $root 'clasp-list.txt') -Value $listRaw -Encoding UTF8
Write-Host $listRaw

$matches = @()
foreach ($line in ($listRaw -split "`r?`n")) {
  if ($line -match '(?<name>.+?)\s+-\s+(?<id>[A-Za-z0-9_-]{20,})\s*$') {
    $matches += [pscustomobject]@{ Name=$Matches.name.Trim(); ScriptId=$Matches.id.Trim() }
  }
}

if (-not $matches.Count) {
  Write-Warning 'No authorized clasp projects could be parsed. Stop without creating anything.'
  exit 2
}

$results = @()
foreach ($m in $matches) {
  $dir = Join-Path $root $m.ScriptId
  New-Item -ItemType Directory -Path $dir | Out-Null
  Push-Location $dir
  try {
    Set-Content .clasp.json ('{"scriptId":"' + $m.ScriptId + '"}') -Encoding UTF8
    clasp clone $m.ScriptId 2>&1 | Out-File clone.log -Encoding UTF8
    $hit = $false
    foreach ($sid in $targetSpreadsheetIds) {
      if (Get-ChildItem -Recurse -File | Select-String -SimpleMatch $sid -Quiet) { $hit = $true }
    }
    $videoHit = Get-ChildItem -Recurse -File | Select-String -Pattern 'Animation|VTube|QUEENS_SCENE|PERSONA_STORYBOARD_PACK|ASSET_AUTOMATION_TRIGGER' -Quiet
    if ($hit -or $videoHit) {
      $results += [pscustomobject]@{ ScriptId=$m.ScriptId; Name=$m.Name; SpreadsheetHit=$hit; AnimationCodeHit=$videoHit; Snapshot=$dir }
    }
  } catch {
    Write-Warning ("Failed to inspect " + $m.ScriptId + ': ' + $_.Exception.Message)
  } finally {
    Pop-Location
  }
}

$results | Format-Table -AutoSize
$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $root 'animation-runtime-candidates.json') -Encoding UTF8

if ($results.Count -eq 1) {
  Write-Host ('UNIQUE_CANDIDATE=' + $results[0].ScriptId)
  Write-Host ('SNAPSHOT=' + $results[0].Snapshot)
  Write-Host 'Next safe step: diff live snapshot against apps-script/VideoAgentDispatcher.gs, VideoPromoWorkflow.gs and EngagementDistributionWorkflow.gs. Do not push until the diff is reviewed.'
  exit 0
}

if ($results.Count -gt 1) {
  Write-Warning 'Multiple candidates found. Stop and compare before any push.'
  exit 3
}

Write-Warning 'No matching existing Animation bound Apps Script was found. Stop. Do not create a new project.'
exit 4
