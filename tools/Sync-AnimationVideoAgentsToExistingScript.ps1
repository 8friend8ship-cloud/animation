param(
  [string]$ScriptId = '14APk3L_PDBaDwUvuqzF2huGZFRKiv8CpTNLV4aYz68pkIdXRiTZ6mnmH',
  [string]$Branch = 'codex/video-promo-agent-workflow-20260823'
)

$ErrorActionPreference = 'Stop'
$Repo = '8friend8ship-cloud/animation'
$RawBase = "https://raw.githubusercontent.com/$Repo/$Branch/apps-script"
$Desktop = [Environment]::GetFolderPath('Desktop')
$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$ResultDir = Join-Path $Desktop "Animation-Sync-Result-$Stamp"
$WorkDir = Join-Path $env:TEMP "animation-existing-script-sync-$Stamp"
New-Item -ItemType Directory -Force -Path $ResultDir,$WorkDir | Out-Null

function Invoke-NativeText {
  param([string]$Command,[string[]]$Arguments=@(),[string]$WorkingDirectory='')
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($WorkingDirectory) { Push-Location $WorkingDirectory }
    $text = (& $Command @Arguments 2>&1 | Out-String)
    $code = $LASTEXITCODE
    return [pscustomobject]@{Text=$text;ExitCode=$code}
  } finally {
    if ($WorkingDirectory) { Pop-Location }
    $ErrorActionPreference = $old
  }
}

Write-Host 'Animation Video Agent existing-script sync (BACKUP FIRST / SAME SCRIPT ID ONLY)'
Write-Host ('SCRIPT_ID=' + $ScriptId)
Write-Host ('RESULT_DIR=' + $ResultDir)

$clasp = Get-Command clasp -ErrorAction SilentlyContinue
if (-not $clasp) { throw 'clasp is not installed or not on PATH.' }

# 1) Clone the exact recovered project. Never create a project.
$clone = Invoke-NativeText -Command $clasp.Source -Arguments @('clone',$ScriptId) -WorkingDirectory $WorkDir
$clone.Text | Set-Content (Join-Path $ResultDir '01_CLONE.txt') -Encoding UTF8
if ($clone.ExitCode -ne 0) { throw ('clasp clone failed: ' + $clone.ExitCode) }

# 2) Backup the complete clone before any modification.
$BackupZip = Join-Path $ResultDir "BEFORE_SYNC_FULL_BACKUP_$ScriptId.zip"
Compress-Archive -Path (Join-Path $WorkDir '*') -DestinationPath $BackupZip -Force
Write-Host ('BACKUP=' + $BackupZip)

# 3) Download only the three additive files from the reviewed PR branch.
$NewFiles = @('VideoAgentDispatcher.gs','VideoPromoWorkflow.gs','EngagementDistributionWorkflow.gs')
$DownloadDir = Join-Path $WorkDir '__incoming_video_agent'
New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
foreach ($name in $NewFiles) {
  Invoke-WebRequest -UseBasicParsing "$RawBase/$name" -OutFile (Join-Path $DownloadDir $name)
}

# 4) Collision guard. Existing same file is allowed only as an explicit update; duplicate top-level functions in OTHER files abort.
$functionPattern = '(?m)^\s*function\s+([A-Za-z0-9_]+)\s*\('
$incomingFunctions = @{}
foreach ($name in $NewFiles) {
  $text = Get-Content (Join-Path $DownloadDir $name) -Raw
  foreach ($m in [regex]::Matches($text,$functionPattern)) { $incomingFunctions[$m.Groups[1].Value] = $name }
}

$collisions = @()
$existingFiles = @(Get-ChildItem $WorkDir -File -Recurse | Where-Object {
  $_.FullName -notlike "$DownloadDir*" -and $_.Extension -in @('.gs','.js') -and $_.Name -notin $NewFiles
})
foreach ($file in $existingFiles) {
  $text = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
  foreach ($fn in $incomingFunctions.Keys) {
    if ($text -match ('(?m)^\s*function\s+' + [regex]::Escape($fn) + '\s*\(')) {
      $collisions += [pscustomobject]@{Function=$fn;ExistingFile=$file.FullName;IncomingFile=$incomingFunctions[$fn]}
    }
  }
}
$collisions | Format-Table -AutoSize | Out-String | Set-Content (Join-Path $ResultDir '02_COLLISIONS.txt') -Encoding UTF8
if ($collisions.Count -gt 0) {
  Write-Warning 'Function collisions found in existing runtime. ABORTING before push.'
  $collisions | Format-Table -AutoSize
  exit 20
}

# 5) Copy reviewed additive files into the exact clone.
foreach ($name in $NewFiles) {
  Copy-Item (Join-Path $DownloadDir $name) (Join-Path $WorkDir $name) -Force
}
Remove-Item $DownloadDir -Recurse -Force

# 6) Record clasp status before push.
$statusBefore = Invoke-NativeText -Command $clasp.Source -Arguments @('status') -WorkingDirectory $WorkDir
$statusBefore.Text | Set-Content (Join-Path $ResultDir '03_STATUS_BEFORE_PUSH.txt') -Encoding UTF8

# 7) Push to SAME recovered Script ID only. No deploy/version/project creation.
$push = Invoke-NativeText -Command $clasp.Source -Arguments @('push','-f') -WorkingDirectory $WorkDir
$push.Text | Set-Content (Join-Path $ResultDir '04_PUSH.txt') -Encoding UTF8
if ($push.ExitCode -ne 0) { throw ('clasp push failed: ' + $push.ExitCode + '. Backup is preserved at ' + $BackupZip) }

# 8) Source readback x2 by fresh pulls into the same clone and version markers.
$readbacks = @()
for ($i=1; $i -le 2; $i++) {
  $pull = Invoke-NativeText -Command $clasp.Source -Arguments @('pull') -WorkingDirectory $WorkDir
  $marker = Select-String -Path (Join-Path $WorkDir '*') -Pattern 'VIDEO_AGENT_DISPATCHER_V3_20260824' -SimpleMatch -ErrorAction SilentlyContinue
  $okFiles = @($NewFiles | Where-Object { Test-Path (Join-Path $WorkDir $_) }).Count -eq $NewFiles.Count
  $readbacks += [pscustomobject]@{Attempt=$i;PullExit=$pull.ExitCode;VersionMarker=[bool]$marker;AllThreeFiles=$okFiles}
  Start-Sleep -Seconds 2
}
$readbacks | Format-Table -AutoSize | Out-String | Set-Content (Join-Path $ResultDir '05_SOURCE_READBACK_X2.txt') -Encoding UTF8
if (@($readbacks | Where-Object { -not $_.VersionMarker -or -not $_.AllThreeFiles -or $_.PullExit -ne 0 }).Count -gt 0) {
  throw 'Source readback x2 failed. Do not continue to runtime promotion.'
}

# 9) Best-effort runtime STATUS x2. This does not deploy anything. Some clasp setups cannot scripts.run without an API-executable deployment.
$runtimeRows = @()
for ($i=1; $i -le 2; $i++) {
  $run = Invoke-NativeText -Command $clasp.Source -Arguments @('run','getVideoAgentDispatcherStatus') -WorkingDirectory $WorkDir
  $runtimeRows += [pscustomobject]@{Attempt=$i;ExitCode=$run.ExitCode;Output=$run.Text.Trim()}
  Start-Sleep -Seconds 2
}
$runtimeRows | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $ResultDir '06_RUNTIME_STATUS_X2.json') -Encoding UTF8

$runtimePass = @($runtimeRows | Where-Object { $_.ExitCode -eq 0 -and $_.Output -match 'VIDEO_AGENT_DISPATCHER_V3_20260824' }).Count -eq 2
$summary = @(
  'ANIMATION_VIDEO_AGENT_SYNC_RESULT',
  ('SCRIPT_ID=' + $ScriptId),
  ('BACKUP=' + $BackupZip),
  'PUSH=PASS',
  'SOURCE_READBACK_X2=PASS',
  ('RUNTIME_STATUS_X2=' + $(if ($runtimePass) {'PASS'} else {'PENDING_CLASP_RUN_CAPABILITY'})),
  'NO_NEW_PROJECT=TRUE',
  'NO_NEW_DEPLOYMENT=TRUE'
)
$summary | Set-Content (Join-Path $ResultDir '00_SUMMARY.txt') -Encoding UTF8
$summary | ForEach-Object { Write-Host $_ }
explorer.exe $ResultDir
exit 0
