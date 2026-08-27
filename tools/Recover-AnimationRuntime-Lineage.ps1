param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [switch]$CftBoundScriptRecovery = $false,
  [switch]$DeploymentInventory = $false,
  [switch]$ExactScriptDeployments = $false,
  [switch]$InteriorBackendE2E = $false,
  [string]$ExactScriptId = '',
  [string]$TargetDeploymentId = '',
  [string]$ChromeUrlPrefix = '',
  [string]$TargetSpreadsheetId = '',
  [string]$TargetCodePattern = '',
  [string]$TargetNamePattern = '',
  [string]$TargetLabel = 'Animation',
  [string]$CentralReadbackName = '',
  [switch]$ChromeWorkerDriveHandoff = $false,
  [string]$Worker = '',
  [string]$WorkerTaskId = '',
  [string]$WorkerParentTaskId = '',
  [string]$WorkerAction = '',
  [string]$WorkerPrompt = '',
  [string]$WorkerTargetUrl = '',
  [int]$WorkerTimeoutSeconds = 240
)

$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Repo='8friend8ship-cloud/animation'
$ScriptPath='tools/Recover-AnimationRuntime-Lineage.ps1'
$PreviousCommit='b1867ff4ef0ed4c42fea2bbc5aab9d7761669beb'

function Resolve-DriveFsParent {
  $target='00_중앙에이전트'
  $roots=@('G:\내 드라이브','G:\My Drive','H:\내 드라이브','H:\My Drive','I:\내 드라이브','I:\My Drive')
  try{foreach($d in [IO.DriveInfo]::GetDrives()){$r=[string]$d.RootDirectory.FullName;if($r){$roots+=@((Join-Path $r '내 드라이브'),(Join-Path $r 'My Drive'))}}}catch{}
  foreach($root in @($roots|Select-Object -Unique)){try{if(Test-Path -LiteralPath (Join-Path $root $target)){return $root}}catch{}}
  return ''
}

function Invoke-ExactScriptDeployments {
  if(-not $ExactScriptId){throw 'EXACT_SCRIPT_ID_REQUIRED'}
  $work=Join-Path $env:TEMP ('AppsScriptExactDeployments-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $work|Out-Null
  Set-Content -LiteralPath (Join-Path $work '.clasp.json') -Value ('{"scriptId":"'+$ExactScriptId+'","rootDir":"."}') -Encoding UTF8
  Push-Location $work
  try{
    $depText=(& npx --yes '@google/clasp@latest' deployments 2>&1 | Out-String)
    $depRc=$LASTEXITCODE
  } finally { Pop-Location; Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
  $deploymentIds=@([regex]::Matches($depText,'AKfy[A-Za-z0-9_-]+')|ForEach-Object{$_.Value}|Select-Object -Unique)
  [ordered]@{ok=($depRc -eq 0);action='EXACT_APPS_SCRIPT_DEPLOYMENTS';scriptId=$ExactScriptId;deploymentsExit=$depRc;deploymentIds=$deploymentIds;deployments=$depText.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 20 -Compress
  exit 0
}

function Invoke-DeploymentInventory {
  $listText=(& npx --yes '@google/clasp@latest' list 2>&1 | Out-String)
  $listRc=$LASTEXITCODE
  if($listRc -ne 0){throw ('CLASP_LIST_FAILED rc='+$listRc+' output='+$listText.Trim())}
  $ids=@([regex]::Matches($listText,'https://script\.google\.com/d/([A-Za-z0-9_-]{20,})/edit')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique)
  $projects=@()
  foreach($id in $ids){
    $work=Join-Path $env:TEMP ('AppsScriptDeploymentInventory-'+$id.Substring(0,[Math]::Min(8,$id.Length))+'-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $work|Out-Null
    Set-Content -LiteralPath (Join-Path $work '.clasp.json') -Value ('{"scriptId":"'+$id+'","rootDir":"."}') -Encoding UTF8
    Push-Location $work
    try{
      $depText=(& npx --yes '@google/clasp@latest' deployments 2>&1 | Out-String)
      $depRc=$LASTEXITCODE
    } finally { Pop-Location; Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
    $match=$false
    if($TargetDeploymentId){$match=($depText -match [regex]::Escape($TargetDeploymentId))}
    $projects += [ordered]@{scriptId=$id;deploymentsExit=$depRc;deploymentMatch=[bool]$match;deployments=$depText.Trim()}
  }
  $matches=@($projects|Where-Object{$_.deploymentMatch})
  [ordered]@{ok=($listRc -eq 0);action='APPS_SCRIPT_DEPLOYMENT_INVENTORY';targetDeploymentId=$TargetDeploymentId;projectCount=$projects.Count;matchCount=$matches.Count;matches=$matches;projects=$projects;listText=$listText.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 20 -Compress
  if($TargetDeploymentId -and $matches.Count -ne 1){exit 2}else{exit 0}
}

function Invoke-InteriorBackendE2E {
  $endpoint='https://script.google.com/macros/s/AKfycbyuYK2lx8FY0asRtaUaGXt8ha6ayokrTdr3afDozPErnEV4E5APpJcfm3mNujpKkR65Gg/exec'
  $fixture=[ordered]@{
    project=[ordered]@{area=40;projectScope='full';buildingType='apartment';wants3DGeneration=$false}
    context=[ordered]@{userRole='CONSUMER';tier='PRO';consumerMode='COMPARE';projectDomain='RESIDENTIAL_INTERIOR';buildingUse='RESIDENTIAL';templateMode='HOMEDESIGN_SIMPLE';requestId='INTERIOR_BACKEND_E2E_20260827'}
    projectDomain='RESIDENTIAL_INTERIOR';buildingUse='RESIDENTIAL';domainPricingIsolation=$true;coverageGateRequired=$true
  }
  $actions=@('health','estimate','materials','schedule','render')
  $results=@()
  foreach($action in $actions){
    try{
      $payload=@{action=$action}
      if($action -ne 'health'){foreach($k in $fixture.Keys){$payload[$k]=$fixture[$k]}}
      $body=$payload|ConvertTo-Json -Depth 20 -Compress
      $resp=Invoke-WebRequest -UseBasicParsing -Uri $endpoint -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30
      $text=[string]$resp.Content
      $json=$null;try{$json=$text|ConvertFrom-Json}catch{}
      $results += [ordered]@{action=$action;http=[int]$resp.StatusCode;ok=([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300);json=$json;text=$(if($json){''}else{$text.Substring(0,[Math]::Min(1200,$text.Length))})}
    }catch{
      $results += [ordered]@{action=$action;http=0;ok=$false;error=$_.Exception.Message}
    }
  }
  $internalNames=@('executionCost','executionUnitPrice','margin','marginRate','internalNote','subcontractorCost')
  $leaks=@()
  foreach($r in $results){$raw=($r|ConvertTo-Json -Depth 30 -Compress);foreach($n in $internalNames){if($raw -match ('"'+[regex]::Escape($n)+'"\s*:')){$leaks+=[ordered]@{action=$r.action;field=$n}}}}
  $healthOk=@($results|Where-Object{$_.action -eq 'health' -and $_.ok}).Count -eq 1
  [ordered]@{ok=$healthOk;action='INTERIOR_BACKEND_LIVE_E2E';endpoint=$endpoint;fixture='40PY_CONSUMER_PRO_COMPARE';results=$results;clientInternalLeakCount=$leaks.Count;leaks=$leaks;at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 40 -Compress
  exit 0
}

function Invoke-Previous {
  $h=@{'User-Agent'='HomeDesign-Chrome-Worker';'Accept'='application/vnd.github+json'}
  $u='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$PreviousCommit
  $r=Invoke-RestMethod -Uri $u -Headers $h -Method Get -TimeoutSec 20
  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-worker-base-'+[guid]::NewGuid().ToString('N')+'.ps1')
  [IO.File]::WriteAllBytes($tmp,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
  $args=@()
  if($DryRun){$args+='-DryRun'};if($ListOnly){$args+='-ListOnly'};if($ChromeUrlOnly){$args+='-ChromeUrlOnly'};if($CftBoundScriptRecovery){$args+='-CftBoundScriptRecovery'}
  if($ChromeUrlPrefix){$args+=@('-ChromeUrlPrefix',$ChromeUrlPrefix)};if($TargetSpreadsheetId){$args+=@('-TargetSpreadsheetId',$TargetSpreadsheetId)}
  if($TargetCodePattern){$args+=@('-TargetCodePattern',$TargetCodePattern)};if($TargetNamePattern){$args+=@('-TargetNamePattern',$TargetNamePattern)}
  if($TargetLabel){$args+=@('-TargetLabel',$TargetLabel)};if($CentralReadbackName){$args+=@('-CentralReadbackName',$CentralReadbackName)}
  if($ChromeWorkerDriveHandoff){$args+='-ChromeWorkerDriveHandoff'}
  if($Worker){$args+=@('-Worker',$Worker)};if($WorkerTaskId){$args+=@('-WorkerTaskId',$WorkerTaskId)};if($WorkerParentTaskId){$args+=@('-WorkerParentTaskId',$WorkerParentTaskId)}
  if($WorkerAction){$args+=@('-WorkerAction',$WorkerAction)};if($WorkerPrompt){$args+=@('-WorkerPrompt',$WorkerPrompt)};if($WorkerTargetUrl){$args+=@('-WorkerTargetUrl',$WorkerTargetUrl)}
  if($WorkerTimeoutSeconds){$args+=@('-WorkerTimeoutSeconds',[string]$WorkerTimeoutSeconds)}
  if($ChromeWorkerDriveHandoff){
    $parent=Resolve-DriveFsParent
    if($parent){try{New-PSDrive -Name 'HDCENTRAL' -PSProvider FileSystem -Root $parent -Scope Global -ErrorAction Stop|Out-Null;Write-Host ('DRIVEFS_PARENT='+$parent)}catch{}}
  }
  & $tmp @args
  $code=$LASTEXITCODE
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  exit $code
}

if($ExactScriptDeployments){Invoke-ExactScriptDeployments}
if($InteriorBackendE2E){Invoke-InteriorBackendE2E}
if($DeploymentInventory){Invoke-DeploymentInventory}
Invoke-Previous
