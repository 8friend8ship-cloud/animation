param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [string]$ChromeUrlPrefix = '',
  [string]$TargetSpreadsheetId = '',
  [string]$TargetCodePattern = '',
  [string]$TargetNamePattern = '',
  [string]$TargetLabel = 'Animation',
  [string]$CentralReadbackName = ''
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
  } finally { $ErrorActionPreference = $oldPreference }
}

function Find-CentralRoot {
  $target = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('MDBf7KSR7JWZ7JeQ7J207KCE7Yq4'))
  foreach ($drive in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
    $r = [string]$drive.Root; if (-not $r) { continue }
    foreach ($candidate in @((Join-Path $r $target),(Join-Path $r ('My Drive\' + $target)),(Join-Path $r ('내 드라이브\' + $target)),(Join-Path $r ('Google Drive\' + $target)))) {
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
  }
  foreach ($candidate in @((Join-Path $env:USERPROFILE ('My Drive\' + $target)),(Join-Path $env:USERPROFILE ('내 드라이브\' + $target)),(Join-Path $env:USERPROFILE ('Google Drive\' + $target)))) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return ''
}

function Write-CentralReadback {
  param([hashtable]$Data)
  if ([string]::IsNullOrWhiteSpace($CentralReadbackName)) { return '' }
  $name = [IO.Path]::GetFileName($CentralReadbackName)
  if ([string]::IsNullOrWhiteSpace($name) -or $name -notmatch '^[A-Za-z0-9_.-]+\.json$') { throw 'CENTRAL_READBACK_NAME_UNSAFE' }
  $central = Find-CentralRoot; if (-not $central) { return '' }
  $dir = Join-Path $central 'Runtime_Readback'; New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $path = Join-Path $dir $name; $tmp = $path + '.tmp'; $Data['centralWrittenAt'] = (Get-Date).ToString('o')
  $Data | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $tmp -Encoding UTF8; Move-Item -LiteralPath $tmp -Destination $path -Force
  return $path
}

function Get-AppsScriptUrlsFromChrome {
  param([string]$Prefix='')
  $root = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'
  $hits = New-Object System.Collections.Generic.List[object]
  if (-not (Test-Path -LiteralPath $root)) { return @() }
  $profiles = @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })
  foreach ($profile in $profiles) {
    $candidates = New-Object System.Collections.Generic.List[System.IO.FileInfo]
    $history = Join-Path $profile.FullName 'History'; if (Test-Path -LiteralPath $history) { $candidates.Add((Get-Item -LiteralPath $history)) }
    $sessions = Join-Path $profile.FullName 'Sessions'
    if (Test-Path -LiteralPath $sessions) { foreach ($f in @(Get-ChildItem -LiteralPath $sessions -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 12)) { $candidates.Add($f) } }
    foreach ($file in $candidates) {
      try {
        $bytes = [IO.File]::ReadAllBytes($file.FullName)
        foreach ($text in @([Text.Encoding]::UTF8.GetString($bytes),[Text.Encoding]::Unicode.GetString($bytes))) {
          foreach ($m in [regex]::Matches($text,'https://script\.google\.com/(?:u/\d+/)?home/projects/(?<id>[A-Za-z0-9_-]{57})')) {
            $id=[string]$m.Groups['id'].Value
            if ($Prefix -and -not $id.StartsWith($Prefix,[StringComparison]::OrdinalIgnoreCase)) { continue }
            $hits.Add([pscustomobject]@{profile=$profile.Name;source=$file.Name;scriptId=$id;url=[string]$m.Value})
          }
        }
      } catch {}
    }
  }
  return @($hits | Sort-Object scriptId,profile,source -Unique)
}

Write-Host ($label + ' runtime lineage recovery V10 (READ ONLY / NO NEW PROJECT / NO NEW DEPLOYMENT)')
Write-Host "Repository: $repo"; Write-Host "DryRun: $DryRun"; Write-Host "ListOnly: $ListOnly"; Write-Host "ChromeUrlOnly: $ChromeUrlOnly"
Write-Host ('ChromeUrlPrefix=' + $ChromeUrlPrefix); Write-Host ('TargetSpreadsheetIds=' + ($targetSpreadsheetIds -join ',')); Write-Host ('TargetCodePattern=' + $codePattern); Write-Host ('TargetNamePattern=' + $TargetNamePattern); Write-Host ('CentralReadbackName=' + $CentralReadbackName)

if ($ChromeUrlOnly) {
  $urls=@(Get-AppsScriptUrlsFromChrome -Prefix $ChromeUrlPrefix); $uniqueIds=@($urls|ForEach-Object{[string]$_.scriptId}|Sort-Object -Unique)
  $status=if($uniqueIds.Count -eq 1){'UNIQUE_CHROME_SCRIPT_ID'}elseif($uniqueIds.Count -gt 1){'MULTIPLE_CHROME_SCRIPT_IDS'}else{'NO_CHROME_SCRIPT_ID'}
  $readback=[ordered]@{ok=($uniqueIds.Count -eq 1);status=$status;targetLabel=$label;prefix=$ChromeUrlPrefix;matchCount=$urls.Count;uniqueScriptIds=$uniqueIds;matches=$urls;at=(Get-Date).ToString('o')}
  try{$written=Write-CentralReadback ([hashtable]$readback);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{}
  Write-Output ('CHROME_APPS_SCRIPT_URLS_JSON='+($readback|ConvertTo-Json -Depth 8 -Compress))
  if($uniqueIds.Count -eq 1){Write-Host ('UNIQUE_CANDIDATE='+$uniqueIds[0])}
  exit 0
}

$claspCmd=Get-Command clasp -ErrorAction SilentlyContinue
if(-not $claspCmd){throw 'clasp is not installed or not on PATH.'}
Write-Host ('CLASP_PATH='+$claspCmd.Source)
$listProbe=Invoke-NativeText -Command $claspCmd.Source -Arguments @('list');Write-Host $listProbe.Text
if($listProbe.ExitCode -ne 0){$failure=[ordered]@{ok=$false;status='CLASP_LIST_FAILED';targetLabel=$label;exitCode=$listProbe.ExitCode;detail=$listProbe.Text;at=(Get-Date).ToString('o')};try{$written=Write-CentralReadback ([hashtable]$failure);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{};throw ('clasp list failed with exit code '+$listProbe.ExitCode+'. Existing login may need inspection; no OAuth action was attempted.')}
$root=Join-Path $env:TEMP (($label -replace '[^A-Za-z0-9_.-]','_')+'-runtime-recovery-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $root|Out-Null;Set-Content -Path (Join-Path $root 'clasp-list.txt') -Value $listProbe.Text -Encoding UTF8
$projectCandidates=@()
foreach($line in ($listProbe.Text -split "`r?`n")){
  if($line -match '(?<name>.+?)\s+-\s+(?<id>[A-Za-z0-9_-]{20,})\s*$'){$projectCandidates += [pscustomobject]@{Name=$Matches.name.Trim();ScriptId=$Matches.id.Trim()}}
  elseif($line -match 'script\.google\.com/.+?/(?<id>[A-Za-z0-9_-]{20,})'){$projectCandidates += [pscustomobject]@{Name=$line.Trim();ScriptId=$Matches.id.Trim()}}
  elseif($line -match '^\s*(?<id>[A-Za-z0-9_-]{30,})\s*$'){$projectCandidates += [pscustomobject]@{Name='UNKNOWN';ScriptId=$Matches.id.Trim()}}
}
$projectCandidates=@($projectCandidates|Sort-Object ScriptId -Unique)
if(-not $projectCandidates.Count){$failure=[ordered]@{ok=$false;status='NO_AUTHORIZED_CLASP_PROJECTS';targetLabel=$label;outputDir=$root;at=(Get-Date).ToString('o')};try{$written=Write-CentralReadback ([hashtable]$failure);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{};Write-Warning 'No authorized clasp projects could be parsed. Stop without creating anything.';Write-Host ('OUTPUT_DIR='+$root);exit 2}
if($ListOnly){$inventory=@($projectCandidates|ForEach-Object{[ordered]@{name=[string]$_.Name;scriptId=[string]$_.ScriptId}});$readback=[ordered]@{ok=$true;status='CLASP_PROJECT_INVENTORY';targetLabel=$label;projectCount=$inventory.Count;projects=$inventory;outputDir=$root;at=(Get-Date).ToString('o')};try{$written=Write-CentralReadback ([hashtable]$readback);if($written){Write-Host ('CENTRAL_READBACK='+$written)}else{Write-Host 'CENTRAL_READBACK=NOT_FOUND'}}catch{Write-Warning ('CENTRAL_READBACK_WRITE_FAILED: '+$_.Exception.Message)};Write-Output ('CLASP_PROJECT_INVENTORY_JSON='+($readback|ConvertTo-Json -Depth 8 -Compress));exit 0}
$inspectCandidates=$projectCandidates
if(-not [string]::IsNullOrWhiteSpace($TargetNamePattern)){$inspectCandidates=@($projectCandidates|Where-Object{[string]$_.Name -match $TargetNamePattern});if(-not $inspectCandidates.Count){$failure=[ordered]@{ok=$false;status='NO_NAME_MATCH';targetLabel=$label;targetNamePattern=$TargetNamePattern;parsedProjectCount=$projectCandidates.Count;outputDir=$root;at=(Get-Date).ToString('o')};try{$written=Write-CentralReadback ([hashtable]$failure);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{};Write-Warning ('No clasp project name matched TargetNamePattern='+$TargetNamePattern+'. Stop without broad cloning.');Write-Host ('OUTPUT_DIR='+$root);exit 5}}
Write-Host ('PARSED_PROJECT_COUNT='+$projectCandidates.Count);Write-Host ('BOUNDED_INSPECT_COUNT='+$inspectCandidates.Count)
$results=@()
foreach($candidate in $inspectCandidates){$dir=Join-Path $root $candidate.ScriptId;New-Item -ItemType Directory -Path $dir|Out-Null;Push-Location $dir;try{$cloneProbe=Invoke-NativeText -Command $claspCmd.Source -Arguments @('clone',$candidate.ScriptId);Set-Content clone.log $cloneProbe.Text -Encoding UTF8;if($cloneProbe.ExitCode -ne 0){Write-Warning ("Failed to inspect "+$candidate.ScriptId+': clasp clone exit '+$cloneProbe.ExitCode);continue};$files=@(Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -ne '.clasp.json'});$spreadsheetHit=$false;foreach($sid in $targetSpreadsheetIds){if($files|Select-String -SimpleMatch $sid -Quiet){$spreadsheetHit=$true;break}};$codeHit=$false;if($files.Count -and -not [string]::IsNullOrWhiteSpace($codePattern)){$codeHit=[bool]($files|Select-String -Pattern $codePattern -Quiet)};if($spreadsheetHit -or $codeHit){$results += [pscustomobject]@{ScriptId=$candidate.ScriptId;Name=$candidate.Name;SpreadsheetHit=$spreadsheetHit;AnimationCodeHit=$codeHit;TargetLabel=$label;Snapshot=$dir}}}catch{Write-Warning ("Failed to inspect "+$candidate.ScriptId+': '+$_.Exception.Message)}finally{Pop-Location}}
$results|Format-Table -AutoSize;$results|ConvertTo-Json -Depth 4|Set-Content (Join-Path $root 'runtime-candidates.json') -Encoding UTF8;Write-Host ('OUTPUT_DIR='+$root)
$status=if($results.Count -eq 1){'UNIQUE_CANDIDATE'}elseif($results.Count -gt 1){'MULTIPLE_CANDIDATES'}else{'NO_MATCHING_PROJECT'}
$readback=[ordered]@{ok=($results.Count -eq 1);status=$status;targetLabel=$label;targetSpreadsheetIds=@($targetSpreadsheetIds);targetCodePattern=$codePattern;targetNamePattern=$TargetNamePattern;parsedProjectCount=$projectCandidates.Count;inspectedProjectCount=$inspectCandidates.Count;resultCount=$results.Count;results=@($results);uniqueCandidate=$(if($results.Count -eq 1){[string]$results[0].ScriptId}else{''});outputDir=$root;at=(Get-Date).ToString('o')}
try{$written=Write-CentralReadback ([hashtable]$readback);if($written){Write-Host ('CENTRAL_READBACK='+$written)}else{Write-Host 'CENTRAL_READBACK=NOT_FOUND'}}catch{Write-Warning ('CENTRAL_READBACK_WRITE_FAILED: '+$_.Exception.Message)}
if($results.Count -eq 1){Write-Host ('UNIQUE_CANDIDATE='+$results[0].ScriptId);Write-Host ('SNAPSHOT='+$results[0].Snapshot);Write-Host 'SAFE_NEXT=DIFF_ONLY_EXISTING_SCRIPT';exit 0}
if($results.Count -gt 1){Write-Warning 'Multiple candidates found. Stop and compare before any push.';exit 3}
Write-Warning ('No matching existing '+$label+' Apps Script was found. Stop. Do not create a new project.');exit 4
