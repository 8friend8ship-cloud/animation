param(
  [switch]$DryRun = $true,
  [string]$TargetSpreadsheetId = '',
  [string]$TargetCodePattern = '',
  [string]$TargetNamePattern = '',
  [string]$TargetLabel = 'Animation'
)

$ErrorActionPreference = 'Stop'
$repo = '8friend8ship-cloud/animation'
$defaultSpreadsheetIds = @(
  '1dgLhQnFnOOZgI2K_vxtWbFrTUnvduhQT_OqJmlkJmT4',
  '1b0VkG1lttudtgctqRQCC2ZydjwrPLu2cA3vxSBUD7_g'
)
$targetSpreadsheetIds = if ([string]::IsNullOrWhiteSpace($TargetSpreadsheetId)) { $defaultSpreadsheetIds } else { @($TargetSpreadsheetId.Trim()) }
$codePattern = if ([string]::IsNullOrWhiteSpace($TargetCodePattern)) { 'Animation|VTube|QUEENS_SCENE|PERSONA_STORYBOARD_PACK|ASSET_AUTOMATION_TRIGGER' } else { $TargetCodePattern }
$label = if ([string]::IsNullOrWhiteSpace($TargetLabel)) { 'Runtime' } else { $TargetLabel.Trim() }

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

Write-Host ($label + ' runtime lineage recovery V4 (READ ONLY / NO NEW PROJECT / NO NEW DEPLOYMENT)')
Write-Host "Repository: $repo"
Write-Host "DryRun: $DryRun"
Write-Host ('TargetSpreadsheetIds=' + ($targetSpreadsheetIds -join ','))
Write-Host ('TargetCodePattern=' + $codePattern)
Write-Host ('TargetNamePattern=' + $TargetNamePattern)

$claspCmd = Get-Command clasp -ErrorAction SilentlyContinue
if (-not $claspCmd) { throw 'clasp is not installed or not on PATH.' }
Write-Host ('CLASP_PATH=' + $claspCmd.Source)

# Do not use `clasp login --status`: recent/older clasp builds differ on this option.
# `clasp list` itself is the read-only authentication/probe step.
$listProbe = Invoke-NativeText -Command $claspCmd.Source -Arguments @('list')
Write-Host $listProbe.Text
if ($listProbe.ExitCode -ne 0) {
  throw ('clasp list failed with exit code ' + $listProbe.ExitCode + '. Existing login may need inspection; no OAuth action was attempted.')
}

$root = Join-Path $env:TEMP (($label -replace '[^A-Za-z0-9_.-]','_') + '-runtime-recovery-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
Set-Content -Path (Join-Path $root 'clasp-list.txt') -Value $listProbe.Text -Encoding UTF8

$matches = @()
foreach ($line in ($listProbe.Text -split "`r?`n")) {
  # clasp list output varies by version. Accept common `name - id`, URL/id, and bare-id forms.
  if ($line -match '(?<name>.+?)\s+-\s+(?<id>[A-Za-z0-9_-]{20,})\s*$') {
    $matches += [pscustomobject]@{ Name=$Matches.name.Trim(); ScriptId=$Matches.id.Trim() }
  } elseif ($line -match 'script\.google\.com/.+?/(?<id>[A-Za-z0-9_-]{20,})') {
    $matches += [pscustomobject]@{ Name=$line.Trim(); ScriptId=$Matches.id.Trim() }
  } elseif ($line -match '^\s*(?<id>[A-Za-z0-9_-]{30,})\s*$') {
    $matches += [pscustomobject]@{ Name='UNKNOWN'; ScriptId=$Matches.id.Trim() }
  }
}
$matches = @($matches | Sort-Object ScriptId -Unique)

if (-not $matches.Count) {
  Write-Warning 'No authorized clasp projects could be parsed. Stop without creating anything.'
  Write-Host ('OUTPUT_DIR=' + $root)
  exit 2
}

$inspectMatches = $matches
if (-not [string]::IsNullOrWhiteSpace($TargetNamePattern)) {
  $inspectMatches = @($matches | Where-Object { [string]$_.Name -match $TargetNamePattern })
  if (-not $inspectMatches.Count) {
    Write-Warning ('No clasp project name matched TargetNamePattern=' + $TargetNamePattern + '. Stop without broad cloning.')
    Write-Host ('OUTPUT_DIR=' + $root)
    exit 5
  }
}
Write-Host ('PARSED_PROJECT_COUNT=' + $matches.Count)
Write-Host ('BOUNDED_INSPECT_COUNT=' + $inspectMatches.Count)

$results = @()
foreach ($m in $inspectMatches) {
  $dir = Join-Path $root $m.ScriptId
  New-Item -ItemType Directory -Path $dir | Out-Null
  Push-Location $dir
  try {
    Set-Content .clasp.json ('{"scriptId":"' + $m.ScriptId + '"}') -Encoding UTF8
    $cloneProbe = Invoke-NativeText -Command $claspCmd.Source -Arguments @('clone', $m.ScriptId)
    Set-Content clone.log $cloneProbe.Text -Encoding UTF8
    if ($cloneProbe.ExitCode -ne 0) {
      Write-Warning ("Failed to inspect " + $m.ScriptId + ': clasp clone exit ' + $cloneProbe.ExitCode)
      continue
    }
    $files = @(Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne '.clasp.json' })
    $spreadsheetHit = $false
    foreach ($sid in $targetSpreadsheetIds) {
      if ($files | Select-String -SimpleMatch $sid -Quiet) { $spreadsheetHit = $true; break }
    }
    $codeHit = $false
    if ($files.Count -and -not [string]::IsNullOrWhiteSpace($codePattern)) {
      $codeHit = [bool]($files | Select-String -Pattern $codePattern -Quiet)
    }
    if ($spreadsheetHit -or $codeHit) {
      $results += [pscustomobject]@{
        ScriptId=$m.ScriptId; Name=$m.Name; SpreadsheetHit=$spreadsheetHit;
        AnimationCodeHit=$codeHit; TargetLabel=$label; Snapshot=$dir
      }
    }
  } catch {
    Write-Warning ("Failed to inspect " + $m.ScriptId + ': ' + $_.Exception.Message)
  } finally {
    Pop-Location
  }
}

$results | Format-Table -AutoSize
$results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $root 'runtime-candidates.json') -Encoding UTF8
Write-Host ('OUTPUT_DIR=' + $root)

if ($results.Count -eq 1) {
  Write-Host ('UNIQUE_CANDIDATE=' + $results[0].ScriptId)
  Write-Host ('SNAPSHOT=' + $results[0].Snapshot)
  Write-Host 'SAFE_NEXT=DIFF_ONLY_EXISTING_SCRIPT'
  exit 0
}
if ($results.Count -gt 1) {
  Write-Warning 'Multiple candidates found. Stop and compare before any push.'
  exit 3
}
Write-Warning ('No matching existing ' + $label + ' Apps Script was found. Stop. Do not create a new project.')
exit 4
