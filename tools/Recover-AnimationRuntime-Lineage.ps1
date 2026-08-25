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
  $args=@();if($DryRun){$args+='-DryRun'};if($ListOnly){$args+='-ListOnly'};if($ChromeUrlOnly){$args+='-ChromeUrlOnly'}
  if($ChromeUrlPrefix){$args+=@('-ChromeUrlPrefix',$ChromeUrlPrefix)};if($TargetSpreadsheetId){$args+=@('-TargetSpreadsheetId',$TargetSpreadsheetId)}
  if($TargetCodePattern){$args+=@('-TargetCodePattern',$TargetCodePattern)};if($TargetNamePattern){$args+=@('-TargetNamePattern',$TargetNamePattern)}
  if($TargetLabel){$args+=@('-TargetLabel',$TargetLabel)};if($CentralReadbackName){$args+=@('-CentralReadbackName',$CentralReadbackName)}
  try{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $tmp @args;exit $LASTEXITCODE}finally{Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue}
}

if(-not $CftBoundScriptRecovery){Forward-Previous}

$Base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7'
$UserData=Join-Path $Base 'ChromeUserData'
$ExtensionRoot=Join-Path $Base 'Extension\NotebookLM-WebApp-Bridge'
$CftRoot=Join-Path $Base 'ChromeForTesting'
$SpreadsheetId=$(if($TargetSpreadsheetId){$TargetSpreadsheetId.Trim()}else{'1TbQxEcCiiibu2-EmMGEdt79v4AUpE8JL2XrDEKeVRCk'})
$SheetUrl='https://docs.google.com/spreadsheets/d/'+$SpreadsheetId+'/edit'
$FrontUrl='https://notebooklm-webapp-bridge.vercel.app'
$DebugPort=9223

function Find-CftChrome {
  return Get-ChildItem -LiteralPath $CftRoot -Recurse -Filter chrome.exe -File -ErrorAction SilentlyContinue|Sort-Object FullName -Descending|Select-Object -First 1
}
function Dedicated-Procs {
  try{return @(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue|Where-Object{$_.CommandLine -and ([string]$_.CommandLine).Contains($UserData)})}catch{return @()}
}
function Stop-Dedicated {
  $killed=@();$tops=@(Dedicated-Procs|Where-Object{try{(Get-Process -Id ([int]$_.ProcessId) -ErrorAction Stop).MainWindowHandle -ne 0}catch{$false}})
  foreach($p in $tops){try{& taskkill.exe /PID ([int]$p.ProcessId) /T /F 2>$null|Out-Null;$killed += [int]$p.ProcessId}catch{}}
  Start-Sleep -Seconds 2
  foreach($p in @(Dedicated-Procs)){try{Stop-Process -Id ([int]$p.ProcessId) -Force -ErrorAction SilentlyContinue}catch{}}
  return @($killed)
}
function Start-Cft {
  param([string]$Url,[switch]$Debug)
  $chrome=Find-CftChrome;if(-not $chrome){throw 'CFT_CHROME_EXE_NOT_FOUND'}
  $args=@("--user-data-dir=$UserData",'--profile-directory=Default',"--load-extension=$ExtensionRoot",'--new-window','--no-first-run','--no-default-browser-check','--disable-session-crashed-bubble')
  if($Debug){$args+=@("--remote-debugging-port=$DebugPort",'--remote-debugging-address=127.0.0.1')}
  $args+=$Url
  Start-Process -FilePath $chrome.FullName -ArgumentList $args -WorkingDirectory $chrome.Directory.FullName|Out-Null
  return $chrome.FullName
}
function Wait-Cdp([int]$Seconds=15){$end=(Get-Date).AddSeconds($Seconds);do{try{$v=Invoke-RestMethod -Uri ("http://127.0.0.1:$DebugPort/json/version") -TimeoutSec 2;if($v.webSocketDebuggerUrl){return $true}}catch{};Start-Sleep -Milliseconds 500}while((Get-Date)-lt $end);return $false}
function Run-CdpMenuSearch {
  $node=Get-Command node.exe -ErrorAction SilentlyContinue;if(-not $node){$node=Get-Command node -ErrorAction SilentlyContinue};if(-not $node){throw 'NODE_NOT_FOUND'}
  $js=Join-Path $env:TEMP ('flow-cft-cdp-'+[guid]::NewGuid().ToString('N')+'.js')
  $code=@'
const port=Number(process.argv[2]);
const sid=process.argv[3];
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function list(){return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();}
function connect(url){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);let seq=0;const pending=new Map();ws.onopen=()=>resolve({ws,send:(method,params={})=>new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));})});ws.onerror=e=>reject(e);ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return};if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.rej(new Error(JSON.stringify(m.error)));else p.res(m.result);}};});}
const before=await list();
const sheet=before.find(t=>t.type==='page' && t.url.includes(`/spreadsheets/d/${sid}`));
if(!sheet){console.log(JSON.stringify({ok:false,stage:'SHEET_TARGET_NOT_FOUND',before:before.map(x=>({title:x.title,url:x.url,type:x.type}))}));process.exit(0);}
const c=await connect(sheet.webSocketDebuggerUrl);
await c.send('Page.bringToFront');
await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'/',code:'Slash',modifiers:1,windowsVirtualKeyCode:191,nativeVirtualKeyCode:191});
await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'/',code:'Slash',modifiers:1,windowsVirtualKeyCode:191,nativeVirtualKeyCode:191});
await sleep(800);
await c.send('Input.insertText',{text:'Apps Script'});
await sleep(900);
await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
await sleep(7000);
const after=await list();
const candidates=[];
for(const t of after){for(const re of [/script\.google\.com\/(?:u\/\d+\/)?home\/projects\/([A-Za-z0-9_-]{57})/,/script\.google\.com\/d\/([A-Za-z0-9_-]{57})(?:\/|$)/]){const m=t.url.match(re);if(m)candidates.push({id:m[1],title:t.title,url:t.url});}}
try{c.ws.close()}catch{}
const ids=[...new Set(candidates.map(x=>x.id))];
console.log(JSON.stringify({ok:ids.length===1,stage:ids.length===1?'UNIQUE_BOUND_SCRIPT_ID':(ids.length?'MULTIPLE_BOUND_SCRIPT_IDS':'NO_BOUND_SCRIPT_ID'),ids,candidates,before:before.map(x=>({title:x.title,url:x.url,type:x.type})),after:after.map(x=>({title:x.title,url:x.url,type:x.type}))}));
'@
  Set-Content -LiteralPath $js -Value $code -Encoding UTF8
  try{
    $out=& $node.Source $js ([string]$DebugPort) $SpreadsheetId 2>&1|Out-String
    return ($out.Trim()|ConvertFrom-Json)
  }finally{Remove-Item -LiteralPath $js -Force -ErrorAction SilentlyContinue}
}

$events=@();$result=$null;$chromePath='';$killed=@();$restoreOk=$false
try{
  $killed=Stop-Dedicated;$events += [ordered]@{stage='STOP_DEDICATED_ONLY';ok=$true;killed=$killed;at=(Get-Date).ToString('o')}
  $chromePath=Start-Cft -Url $SheetUrl -Debug;$events += [ordered]@{stage='START_CFT_CDP';ok=$true;chromePath=$chromePath;at=(Get-Date).ToString('o')}
  if(-not(Wait-Cdp 15)){throw 'CFT_CDP_NOT_READY'}
  $result=Run-CdpMenuSearch
}catch{
  $result=[ordered]@{ok=$false;stage='CFT_CDP_RECOVERY_ERROR';error=$_.Exception.Message}
}finally{
  try{Stop-Dedicated|Out-Null;Start-Cft -Url $FrontUrl|Out-Null;$restoreOk=$true}catch{}
}
$ids=@();if($result -and $result.ids){$ids=@($result.ids)}
$prefixOk=$(if($ids.Count -eq 1 -and $ChromeUrlPrefix){([string]$ids[0]).StartsWith($ChromeUrlPrefix,[StringComparison]::OrdinalIgnoreCase)}elseif($ids.Count -eq 1){$true}else{$false})
$out=[ordered]@{ok=($ids.Count -eq 1 -and $prefixOk);action='FLOW_CFT_CDP_BOUND_SCRIPT_RECOVERY';spreadsheetId=$SpreadsheetId;sheetUrl=$SheetUrl;knownPrefix=$ChromeUrlPrefix;prefixOk=[bool]$prefixOk;uniqueScriptIds=$ids;cdp=$result;dedicatedRestoreOk=[bool]$restoreOk;events=$events;at=(Get-Date).ToString('o')}
Write-Output ('CFT_CDP_BOUND_SCRIPT_RECOVERY_JSON='+($out|ConvertTo-Json -Depth 20 -Compress))
if($out.ok){Write-Host ('UNIQUE_CANDIDATE='+$ids[0])}
exit 0
