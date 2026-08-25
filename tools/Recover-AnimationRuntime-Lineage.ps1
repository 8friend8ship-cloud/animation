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

$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Repo='8friend8ship-cloud/animation'
$PreviousCommit='2ca5625b56e13bfd8a30c222828d0c1962be3371'
$ScriptPath='tools/Recover-AnimationRuntime-Lineage.ps1'

function Forward-Previous {
  $h=@{'User-Agent'='HomeDesign-Flow-Recovery';'Accept'='application/vnd.github+json'}
  $u='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$PreviousCommit
  $r=Invoke-RestMethod -Uri $u -Headers $h -Method Get -TimeoutSec 20
  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-prev-'+[guid]::NewGuid().ToString('N')+'.ps1')
  [IO.File]::WriteAllBytes($tmp,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
  $args=@()
  if($DryRun){$args+='-DryRun'}
  if($ListOnly){$args+='-ListOnly'}
  if($ChromeUrlOnly){$args+='-ChromeUrlOnly'}
  if($ChromeUrlPrefix){$args+=@('-ChromeUrlPrefix',$ChromeUrlPrefix)}
  if($TargetSpreadsheetId){$args+=@('-TargetSpreadsheetId',$TargetSpreadsheetId)}
  if($TargetCodePattern){$args+=@('-TargetCodePattern',$TargetCodePattern)}
  if($TargetNamePattern){$args+=@('-TargetNamePattern',$TargetNamePattern)}
  if($TargetLabel){$args+=@('-TargetLabel',$TargetLabel)}
  if($CentralReadbackName){$args+=@('-CentralReadbackName',$CentralReadbackName)}
  try{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tmp @args;exit $LASTEXITCODE}finally{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
}

if(-not $CftBoundScriptRecovery){Forward-Previous}

function Add-ScriptIdEvidence {
  param([System.Collections.Generic.List[object]]$List,[string]$Text,[string]$Source,[string]$Prefix='')
  if([string]::IsNullOrWhiteSpace($Text)){return}
  foreach($m in [regex]::Matches($Text,'https://script\.google\.com/(?:u/\d+/)?home/projects/(?<id>[A-Za-z0-9_-]{57})')){
    $id=[string]$m.Groups['id'].Value;if($Prefix -and -not $id.StartsWith($Prefix,[StringComparison]::OrdinalIgnoreCase)){continue};$List.Add([pscustomobject]@{source=$Source;scriptId=$id;url=[string]$m.Value})
  }
  foreach($m in [regex]::Matches($Text,'https://script\.google\.com/d/(?<id>[A-Za-z0-9_-]{57})(?:/|$)')){
    $id=[string]$m.Groups['id'].Value;if($Prefix -and -not $id.StartsWith($Prefix,[StringComparison]::OrdinalIgnoreCase)){continue};$List.Add([pscustomobject]@{source=$Source;scriptId=$id;url=[string]$m.Value})
  }
}

function Get-DedicatedWindows {
  $marker='HomeDesignAutomationV7\ChromeUserData';$out=@()
  foreach($c in @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue)){
    $cmd=[string]$c.CommandLine;if(-not $cmd -or $cmd -notlike ('*'+$marker+'*')){continue}
    $p=Get-Process -Id ([int]$c.ProcessId) -ErrorAction SilentlyContinue
    if($p -and $p.MainWindowHandle -ne 0){$out += [pscustomobject]@{pid=[int]$p.Id;handle=$p.MainWindowHandle;title=[string]$p.MainWindowTitle}}
  }
  return @($out)
}

function Get-DedicatedUiState {
  param([string]$Prefix='')
  $hits=New-Object System.Collections.Generic.List[object];$values=New-Object System.Collections.Generic.List[object];$tabs=New-Object System.Collections.Generic.List[string];$errors=New-Object System.Collections.Generic.List[string]
  try{Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop;Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop}catch{return [pscustomobject]@{hits=@();values=@();tabs=@();errors=@($_.Exception.Message)}}
  foreach($w in @(Get-DedicatedWindows)){
    try{
      $root=[System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$w.handle);if(-not $root){continue}
      $editCond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)
      foreach($e in @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$editCond))){try{$vp=$e.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);$v=[string]$vp.Current.Value;if($v){$values.Add([pscustomobject]@{pid=$w.pid;title=$w.title;value=$v});Add-ScriptIdEvidence -List $hits -Text $v -Source ('CFT_PID_'+$w.pid) -Prefix $Prefix}}catch{}}
      $tabCond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::TabItem)
      foreach($t in @($root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$tabCond))){try{$n=[string]$t.Current.Name;if($n){$tabs.Add($n)}}catch{}}
    }catch{$errors.Add($_.Exception.Message)}
  }
  return [pscustomobject]@{hits=$hits.ToArray();values=$values.ToArray();tabs=$tabs.ToArray();errors=$errors.ToArray()}
}

function Start-DedicatedUrl {
  param([string]$Url)
  $base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7';$user=Join-Path $base 'ChromeUserData';$ext=Join-Path $base 'Extension\NotebookLM-WebApp-Bridge';$cft=Join-Path $base 'ChromeForTesting'
  $chrome=Get-ChildItem -LiteralPath $cft -Recurse -Filter chrome.exe -File -ErrorAction SilentlyContinue|Sort-Object FullName -Descending|Select-Object -First 1
  if(-not $chrome){throw 'CFT_CHROME_EXE_NOT_FOUND'}
  $arg=@("--user-data-dir=$user",'--profile-directory=Default',"--load-extension=$ext",'--new-window','--no-first-run','--no-default-browser-check','--disable-session-crashed-bubble',$Url)
  Start-Process -FilePath $chrome.FullName -ArgumentList $arg -WorkingDirectory $chrome.Directory.FullName | Out-Null
  return $chrome.FullName
}

function Invoke-UiaElementByName {
  param([string[]]$Names)
  try{Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop;Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop}catch{return $false}
  $desktop=[System.Windows.Automation.AutomationElement]::RootElement
  $all=$desktop.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
  foreach($e in @($all)){
    $n='';try{$n=[string]$e.Current.Name}catch{};if(-not $n -or $Names -notcontains $n){continue}
    try{$ip=$e.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern);$ip.Invoke();return $true}catch{}
    try{$lp=$e.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern);$lp.DoDefaultAction();return $true}catch{}
  }
  return $false
}

$spreadsheetId=$(if($TargetSpreadsheetId){$TargetSpreadsheetId}else{'1TbQxEcCiiibu2-EmMGEdt79v4AUpE8JL2XrDEKeVRCk'})
$sheetUrl='https://docs.google.com/spreadsheets/d/'+$spreadsheetId+'/edit'
$events=New-Object System.Collections.Generic.List[object]
$chromePath='';$menu1=$false;$menu2=$false;$sendKeysUsed=$false;$menuError=''
try{$chromePath=Start-DedicatedUrl $sheetUrl;$events.Add([pscustomobject]@{stage='OPEN_SHEET';ok=$true;at=(Get-Date).ToString('o')})}catch{$events.Add([pscustomobject]@{stage='OPEN_SHEET';ok=$false;error=$_.Exception.Message});$menuError=$_.Exception.Message}
Start-Sleep -Seconds 10
$before=Get-DedicatedUiState -Prefix $ChromeUrlPrefix
try{
  $menu1=Invoke-UiaElementByName @('확장 프로그램','Extensions')
  if($menu1){Start-Sleep -Seconds 1;$menu2=Invoke-UiaElementByName @('Apps Script')}
  if(-not $menu2){
    $w=@(Get-DedicatedWindows)|Where-Object{(([string]$_.title).Contains('WEBAPP_TEMPLATE_03')) -or (([string]$_.title).Contains('Google Sheets'))}|Select-Object -First 1
    if(-not $w){$w=@(Get-DedicatedWindows)|Select-Object -First 1}
    if($w){$sh=New-Object -ComObject WScript.Shell;if($sh.AppActivate([int]$w.pid)){Start-Sleep -Milliseconds 400;$sh.SendKeys('%/');Start-Sleep -Milliseconds 700;$sh.SendKeys('Apps Script');Start-Sleep -Milliseconds 800;$sh.SendKeys('{ENTER}');$sendKeysUsed=$true}}
  }
}catch{$menuError=$_.Exception.Message}
Start-Sleep -Seconds 15
$after=Get-DedicatedUiState -Prefix $ChromeUrlPrefix
$hits=@($before.hits)+@($after.hits);$ids=@($hits|ForEach-Object{[string]$_.scriptId}|Where-Object{$_}|Sort-Object -Unique)
try{Start-DedicatedUrl 'https://notebooklm-webapp-bridge.vercel.app'|Out-Null}catch{}
$result=[ordered]@{ok=($ids.Count -eq 1);status=$(if($ids.Count -eq 1){'UNIQUE_BOUND_SCRIPT_ID'}elseif($ids.Count -gt 1){'MULTIPLE_BOUND_SCRIPT_IDS'}else{'BOUND_SCRIPT_ID_NOT_FOUND'});spreadsheetId=$spreadsheetId;sheetUrl=$sheetUrl;chromePath=$chromePath;prefix=$ChromeUrlPrefix;menuExtensionsInvoked=$menu1;menuAppsScriptInvoked=$menu2;sendKeysFallbackUsed=$sendKeysUsed;menuError=$menuError;uniqueScriptIds=$ids;matches=$hits;beforeValues=@($before.values);afterValues=@($after.values);beforeTabs=@($before.tabs);afterTabs=@($after.tabs);uiErrors=@($before.errors)+@($after.errors);events=$events.ToArray();at=(Get-Date).ToString('o')}
Write-Output ('CFT_BOUND_SCRIPT_RECOVERY_JSON='+($result|ConvertTo-Json -Depth 14 -Compress))
if($ids.Count -eq 1){Write-Host ('UNIQUE_CANDIDATE='+$ids[0])}
exit 0
