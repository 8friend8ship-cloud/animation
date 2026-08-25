param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [switch]$CftBoundScriptRecovery = $false,
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

function Read-SharedBytes {
  param([string]$Path)
  $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
  $fs = New-Object IO.FileStream($Path,[IO.FileMode]::Open,[IO.FileAccess]::Read,$share)
  try {
    $ms = New-Object IO.MemoryStream
    try { $fs.CopyTo($ms); return $ms.ToArray() } finally { $ms.Dispose() }
  } finally { $fs.Dispose() }
}

function Add-ScriptIdEvidence {
  param([System.Collections.Generic.List[object]]$List,[string]$Text,[string]$Source,[string]$Profile,[string]$Prefix='',[string]$Kind='TEXT')
  if ([string]::IsNullOrWhiteSpace($Text)) { return }
  $seen = @{}
  foreach ($m in [regex]::Matches($Text,'https://script\.google\.com/(?:u/\d+/)?home/projects/(?<id>[A-Za-z0-9_-]{57})')) {
    $id=[string]$m.Groups['id'].Value;if($Prefix -and -not $id.StartsWith($Prefix,[StringComparison]::OrdinalIgnoreCase)){continue};$seen[$id]=[string]$m.Value
  }
  foreach ($m in [regex]::Matches($Text,'https://script\.google\.com/d/(?<id>[A-Za-z0-9_-]{57})(?:/|$)')) {
    $id=[string]$m.Groups['id'].Value;if($Prefix -and -not $id.StartsWith($Prefix,[StringComparison]::OrdinalIgnoreCase)){continue};$seen[$id]=[string]$m.Value
  }
  if ($Prefix -and $Prefix.Length -lt 57) {
    $remain=57-$Prefix.Length;$pattern='(?<id>'+[regex]::Escape($Prefix)+'[A-Za-z0-9_-]{'+$remain+'})'
    foreach($m in [regex]::Matches($Text,$pattern)){$id=[string]$m.Groups['id'].Value;$seen[$id]=$id}
  }
  foreach($id in $seen.Keys){$List.Add([pscustomobject]@{profile=$Profile;source=$Source;kind=$Kind;scriptId=[string]$id;url=[string]$seen[$id]})}
}

function Get-ChromeUiEvidence {
  param([string]$Prefix='')
  $hits=New-Object System.Collections.Generic.List[object]
  $tabHints=New-Object System.Collections.Generic.List[object]
  $errors=New-Object System.Collections.Generic.List[object]
  try { Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop; Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop } catch { return [pscustomobject]@{hits=@();tabHints=@();errors=@([pscustomobject]@{stage='ADD_TYPE';error=$_.Exception.Message})} }
  $dedicatedMarker='HomeDesignAutomationV7\ChromeUserData'
  foreach($cim in @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue)){
    $cmd=[string]$cim.CommandLine;if($cmd -and $cmd -like ('*'+$dedicatedMarker+'*')){continue}
    $p=Get-Process -Id ([int]$cim.ProcessId) -ErrorAction SilentlyContinue;if(-not $p -or $p.MainWindowHandle -eq 0){continue}
    try{
      $root=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$p.MainWindowHandle);if(-not $root){continue}
      $editCond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)
      foreach($el in @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$editCond))){
        try{$vp=$el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);$v=[string]$vp.Current.Value;if($v -and (($Prefix -and $v.IndexOf($Prefix,[StringComparison]::OrdinalIgnoreCase)-ge 0) -or $v -match 'script\.google\.com')){Add-ScriptIdEvidence -List $hits -Text $v -Source ('PID_'+$cim.ProcessId) -Profile 'NORMAL_CHROME_UI' -Prefix $Prefix -Kind 'ADDRESS_BAR'}}catch{}
      }
      $tabCond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::TabItem)
      foreach($tab in @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$tabCond))){
        try{
          $name=[string]$tab.Current.Name
          if($name -match 'WEBAPP_TEMPLATE_03|Apps Script'){
            $legacyValue='';$legacyDescription=''
            try{$lp=$tab.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern);$legacyValue=[string]$lp.Current.Value;$legacyDescription=[string]$lp.Current.Description}catch{}
            $tabHints.Add([pscustomobject]@{pid=[int]$cim.ProcessId;name=$name;legacyValue=$(if($legacyValue -and (($Prefix -and $legacyValue -like ('*'+$Prefix+'*')) -or $legacyValue -match 'script\.google\.com')){$legacyValue}else{''});legacyDescription=$(if($legacyDescription -and (($Prefix -and $legacyDescription -like ('*'+$Prefix+'*')) -or $legacyDescription -match 'script\.google\.com')){$legacyDescription}else{''})})
            Add-ScriptIdEvidence -List $hits -Text $legacyValue -Source ('TAB_PID_'+$cim.ProcessId) -Profile 'NORMAL_CHROME_UI' -Prefix $Prefix -Kind 'TAB_LEGACY_VALUE'
            Add-ScriptIdEvidence -List $hits -Text $legacyDescription -Source ('TAB_PID_'+$cim.ProcessId) -Profile 'NORMAL_CHROME_UI' -Prefix $Prefix -Kind 'TAB_LEGACY_DESCRIPTION'
          }
        }catch{}
      }
    }catch{$errors.Add([pscustomobject]@{stage='WINDOW';pid=[int]$cim.ProcessId;error=$_.Exception.Message})}
  }
  try{$clip=[string](Get-Clipboard -Raw -ErrorAction Stop);if($clip -and $Prefix -and $clip.IndexOf($Prefix,[StringComparison]::OrdinalIgnoreCase)-ge 0){Add-ScriptIdEvidence -List $hits -Text $clip -Source 'CLIPBOARD_PREFIX_MATCH' -Profile 'LOCAL_USER' -Prefix $Prefix -Kind 'CLIPBOARD'}}catch{}
  return [pscustomobject]@{hits=$hits.ToArray();tabHints=$tabHints.ToArray();errors=$errors.ToArray()}
}

function Get-AppsScriptUrlsFromChrome {
  param([string]$Prefix='')
  $root = Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data'
  $hits = New-Object System.Collections.Generic.List[object]
  $readErrors = New-Object System.Collections.Generic.List[object]
  $scanned = New-Object System.Collections.Generic.List[string]
  if (-not (Test-Path -LiteralPath $root)) { return [pscustomobject]@{hits=@();scanned=@();readErrors=@();root=$root} }
  $profiles = @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq 'Default' -or $_.Name -like 'Profile *' })
  foreach ($profile in $profiles) {
    $candidates = New-Object System.Collections.Generic.List[System.IO.FileInfo]
    foreach($name in @('History','History-journal','Current Session','Current Tabs','Last Session','Last Tabs')){$p=Join-Path $profile.FullName $name;if(Test-Path -LiteralPath $p){$candidates.Add((Get-Item -LiteralPath $p))}}
    $sessions = Join-Path $profile.FullName 'Sessions'
    if (Test-Path -LiteralPath $sessions) { foreach ($f in @(Get-ChildItem -LiteralPath $sessions -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 24)) { $candidates.Add($f) } }
    foreach ($file in @($candidates | Sort-Object FullName -Unique)) {
      try {
        $bytes = Read-SharedBytes $file.FullName;if($null -eq $bytes){throw 'READ_SHARED_BYTES_NULL'};$scanned.Add($file.FullName)
        Add-ScriptIdEvidence -List $hits -Text ([Text.Encoding]::UTF8.GetString($bytes)) -Source $file.Name -Profile $profile.Name -Prefix $Prefix -Kind 'CHROME_FILE_UTF8'
        Add-ScriptIdEvidence -List $hits -Text ([Text.Encoding]::ASCII.GetString($bytes)) -Source $file.Name -Profile $profile.Name -Prefix $Prefix -Kind 'CHROME_FILE_ASCII'
      } catch { $readErrors.Add([pscustomobject]@{profile=$profile.Name;source=$file.FullName;error=$_.Exception.Message}) }
    }
  }
  return [pscustomobject]@{hits=$hits.ToArray();scanned=$scanned.ToArray();readErrors=$readErrors.ToArray();root=$root}
}

function Get-DedicatedCftWindows {
  $marker='HomeDesignAutomationV7\ChromeUserData'
  $out=@()
  foreach($cim in @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue)){
    $cmd=[string]$cim.CommandLine;if(-not $cmd -or $cmd -notlike ('*'+$marker+'*')){continue}
    $p=Get-Process -Id ([int]$cim.ProcessId) -ErrorAction SilentlyContinue
    if($p -and $p.MainWindowHandle -ne 0){$out += [pscustomobject]@{cim=$cim;process=$p;title=[string]$p.MainWindowTitle}}
  }
  return @($out)
}

function Get-DedicatedAddressEvidence {
  param([string]$Prefix='')
  $hits=New-Object System.Collections.Generic.List[object]
  $values=New-Object System.Collections.Generic.List[string]
  try{Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop;Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop}catch{return [pscustomobject]@{hits=@();values=@();error=$_.Exception.Message}}
  foreach($w in @(Get-DedicatedCftWindows)){
    try{
      $root=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$w.process.MainWindowHandle);if(-not $root){continue}
      $cond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)
      foreach($el in @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$cond))){
        try{$vp=$el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);$v=[string]$vp.Current.Value;if($v){$values.Add($v);Add-ScriptIdEvidence -List $hits -Text $v -Source ('CFT_PID_'+$w.process.Id) -Profile 'DEDICATED_CFT_UI' -Prefix $Prefix -Kind 'ADDRESS_BAR'}}catch{}
      }
    }catch{}
  }
  return [pscustomobject]@{hits=$hits.ToArray();values=$values.ToArray();error=''}
}

function Start-DedicatedCftUrl {
  param([string]$Url)
  $base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7'
  $userData=Join-Path $base 'ChromeUserData'
  $ext=Join-Path $base 'Extension\NotebookLM-WebApp-Bridge'
  $cftRoot=Join-Path $base 'ChromeForTesting'
  $chrome=Get-ChildItem -LiteralPath $cftRoot -Recurse -Filter chrome.exe -File -ErrorAction SilentlyContinue|Sort-Object FullName -Descending|Select-Object -First 1
  if(-not $chrome){throw 'CFT_CHROME_EXE_NOT_FOUND'}
  $args=@("--user-data-dir=$userData",'--profile-directory=Default',"--load-extension=$ext",'--new-window','--no-first-run','--no-default-browser-check','--disable-session-crashed-bubble',$Url)
  $psi=New-Object Diagnostics.ProcessStartInfo;$psi.FileName=$chrome.FullName;$psi.WorkingDirectory=$chrome.Directory.FullName;$psi.UseShellExecute=$false
  $psi.Arguments=($args|ForEach-Object{if($_ -match '\s'){'"'+$_+'"'}else{$_}})-join ' '
  [void][Diagnostics.Process]::Start($psi)
  return $chrome.FullName
}

function Invoke-DedicatedAppsScriptMenu {
  $windows=@(Get-DedicatedCftWindows)
  $target=$windows|Where-Object{$_.title -match 'WEBAPP_TEMPLATE_03|Google Sheets|스프레드시트'}|Select-Object -First 1
  if(-not $target){$target=$windows|Select-Object -First 1}
  if(-not $target){throw 'DEDICATED_CFT_WINDOW_NOT_FOUND'}
  $shell=New-Object -ComObject WScript.Shell
  $activated=$false
  try{$activated=[bool]$shell.AppActivate([int]$target.process.Id)}catch{}
  if(-not $activated){throw 'DEDICATED_CFT_APPACTIVATE_FAILED'}
  Start-Sleep -Milliseconds 500
  $shell.SendKeys('%/')
  Start-Sleep -Milliseconds 700
  $shell.SendKeys('Apps Script')
  Start-Sleep -Milliseconds 1000
  $shell.SendKeys('{ENTER}')
  return [ordered]@{pid=[int]$target.process.Id;title=[string]$target.title;activated=[bool]$activated}
}

function Recover-BoundScriptIdWithDedicatedCft {
  param([string]$SpreadsheetId,[string]$Prefix='')
  if([string]::IsNullOrWhiteSpace($SpreadsheetId)){throw 'BOUND_SPREADSHEET_ID_REQUIRED'}
  $sheetUrl='https://docs.google.com/spreadsheets/d/'+$SpreadsheetId+'/edit'
  $chromePath=Start-DedicatedCftUrl -Url $sheetUrl
  Start-Sleep -Seconds 10
  $before=Get-DedicatedAddressEvidence -Prefix $Prefix
  $menu=$null;$menuError=''
  try{$menu=Invoke-DedicatedAppsScriptMenu}catch{$menuError=$_.Exception.Message}
  Start-Sleep -Seconds 12
  $after=Get-DedicatedAddressEvidence -Prefix $Prefix
  $hits=@($before.hits)+@($after.hits)
  $ids=@($hits|ForEach-Object{[string]$_.scriptId}|Where-Object{$_}|Sort-Object -Unique)
  try{Start-DedicatedCftUrl -Url 'https://notebooklm-webapp-bridge.vercel.app'|Out-Null}catch{}
  return [ordered]@{ok=($ids.Count -eq 1);status=$(if($ids.Count -eq 1){'UNIQUE_BOUND_SCRIPT_ID'}elseif($ids.Count -gt 1){'MULTIPLE_BOUND_SCRIPT_IDS'}else{'BOUND_SCRIPT_ID_NOT_FOUND'});spreadsheetId=$SpreadsheetId;sheetUrl=$sheetUrl;chromePath=$chromePath;menu=$menu;menuError=$menuError;beforeValues=@($before.values);afterValues=@($after.values);uniqueScriptIds=$ids;matches=$hits;at=(Get-Date).ToString('o')}
}

Write-Host ($label + ' runtime lineage recovery V12 (READ ONLY / NO NEW PROJECT / NO NEW DEPLOYMENT)')
Write-Host "Repository: $repo"; Write-Host "DryRun: $DryRun"; Write-Host "ListOnly: $ListOnly"; Write-Host "ChromeUrlOnly: $ChromeUrlOnly";Write-Host "CftBoundScriptRecovery: $CftBoundScriptRecovery"
Write-Host ('ChromeUrlPrefix=' + $ChromeUrlPrefix); Write-Host ('TargetSpreadsheetIds=' + ($targetSpreadsheetIds -join ',')); Write-Host ('TargetCodePattern=' + $codePattern); Write-Host ('TargetNamePattern=' + $TargetNamePattern); Write-Host ('CentralReadbackName=' + $CentralReadbackName)

if($CftBoundScriptRecovery){
  $sid=$(if([string]::IsNullOrWhiteSpace($TargetSpreadsheetId)){'1TbQxEcCiiibu2-EmMGEdt79v4AUpE8JL2XrDEKeVRCk'}else{$TargetSpreadsheetId.Trim()})
  $readback=Recover-BoundScriptIdWithDedicatedCft -SpreadsheetId $sid -Prefix $ChromeUrlPrefix
  try{$written=Write-CentralReadback ([hashtable]$readback);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{}
  Write-Output ('CFT_BOUND_SCRIPT_RECOVERY_JSON='+($readback|ConvertTo-Json -Depth 12 -Compress))
  if($readback.ok){Write-Host ('UNIQUE_CANDIDATE='+$readback.uniqueScriptIds[0]);exit 0}
  exit 6
}

if ($ChromeUrlOnly) {
  $diag=Get-AppsScriptUrlsFromChrome -Prefix $ChromeUrlPrefix
  $ui=Get-ChromeUiEvidence -Prefix $ChromeUrlPrefix
  $urls=@($diag.hits)+@($ui.hits);$uniqueIds=@($urls|ForEach-Object{[string]$_.scriptId}|Where-Object{$_}|Sort-Object -Unique)
  $status=if($uniqueIds.Count -eq 1){'UNIQUE_CHROME_SCRIPT_ID'}elseif($uniqueIds.Count -gt 1){'MULTIPLE_CHROME_SCRIPT_IDS'}else{'NO_CHROME_SCRIPT_ID'}
  $readback=[ordered]@{ok=($uniqueIds.Count -eq 1);status=$status;targetLabel=$label;prefix=$ChromeUrlPrefix;matchCount=$urls.Count;uniqueScriptIds=$uniqueIds;matches=$urls;scannedCount=@($diag.scanned).Count;scanned=@($diag.scanned);readErrorCount=@($diag.readErrors).Count;readErrors=@($diag.readErrors);uiMatchCount=@($ui.hits).Count;uiTabHints=@($ui.tabHints);uiErrors=@($ui.errors);at=(Get-Date).ToString('o')}
  try{$written=Write-CentralReadback ([hashtable]$readback);if($written){Write-Host ('CENTRAL_READBACK='+$written)}}catch{}
  Write-Output ('CHROME_APPS_SCRIPT_URLS_JSON='+($readback|ConvertTo-Json -Depth 12 -Compress))
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
