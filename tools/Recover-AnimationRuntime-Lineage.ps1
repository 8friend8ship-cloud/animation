param(
  [switch]$DryRun = $true,
  [switch]$ListOnly = $false,
  [switch]$ChromeUrlOnly = $false,
  [switch]$CftBoundScriptRecovery = $false,
  [switch]$DeploymentInventory = $false,
  [switch]$ExactScriptDeployments = $false,
  [switch]$InteriorBackendE2E = $false,
  [switch]$InspectWorkerStagingOnly = $false,
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

function Read-Json([string]$Path){if(-not(Test-Path -LiteralPath $Path)){return $null};try{return Get-Content -LiteralPath $Path -Raw -Encoding UTF8|ConvertFrom-Json}catch{return $null}}

function Invoke-ExactScriptDeployments {
  if(-not $ExactScriptId){throw 'EXACT_SCRIPT_ID_REQUIRED'}
  $work=Join-Path $env:TEMP ('AppsScriptExactDeployments-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $work|Out-Null
  Set-Content -LiteralPath (Join-Path $work '.clasp.json') -Value ('{"scriptId":"'+$ExactScriptId+'","rootDir":"."}') -Encoding UTF8
  Push-Location $work
  try{$depText=(& npx --yes '@google/clasp@latest' deployments 2>&1|Out-String);$depRc=$LASTEXITCODE}finally{Pop-Location;Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}
  $deploymentIds=@([regex]::Matches($depText,'AKfy[A-Za-z0-9_-]+')|ForEach-Object{$_.Value}|Select-Object -Unique)
  [ordered]@{ok=($depRc -eq 0);action='EXACT_APPS_SCRIPT_DEPLOYMENTS';scriptId=$ExactScriptId;deploymentsExit=$depRc;deploymentIds=$deploymentIds;deployments=$depText.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 20 -Compress
  exit 0
}

function Invoke-DeploymentInventory {
  $listText=(& npx --yes '@google/clasp@latest' list 2>&1|Out-String);$listRc=$LASTEXITCODE
  if($listRc -ne 0){throw ('CLASP_LIST_FAILED rc='+$listRc+' output='+$listText.Trim())}
  $ids=@([regex]::Matches($listText,'https://script\.google\.com/d/([A-Za-z0-9_-]{20,})/edit')|ForEach-Object{$_.Groups[1].Value}|Select-Object -Unique)
  $projects=@()
  foreach($id in $ids){
    $work=Join-Path $env:TEMP ('AppsScriptDeploymentInventory-'+$id.Substring(0,[Math]::Min(8,$id.Length))+'-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $work|Out-Null
    Set-Content -LiteralPath (Join-Path $work '.clasp.json') -Value ('{"scriptId":"'+$id+'","rootDir":"."}') -Encoding UTF8
    Push-Location $work
    try{$depText=(& npx --yes '@google/clasp@latest' deployments 2>&1|Out-String);$depRc=$LASTEXITCODE}finally{Pop-Location;Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue}
    $match=$false;if($TargetDeploymentId){$match=($depText -match [regex]::Escape($TargetDeploymentId))}
    $projects += [ordered]@{scriptId=$id;deploymentsExit=$depRc;deploymentMatch=[bool]$match;deployments=$depText.Trim()}
  }
  $matches=@($projects|Where-Object{$_.deploymentMatch})
  [ordered]@{ok=($listRc -eq 0);action='APPS_SCRIPT_DEPLOYMENT_INVENTORY';targetDeploymentId=$TargetDeploymentId;projectCount=$projects.Count;matchCount=$matches.Count;matches=$matches;projects=$projects;listText=$listText.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 20 -Compress
  if($TargetDeploymentId -and $matches.Count -ne 1){exit 2}else{exit 0}
}

function Invoke-InteriorBackendE2E {
  $endpoint='https://script.google.com/macros/s/AKfycbyuYK2lx8FY0asRtaUaGXt8ha6ayokrTdr3afDozPErnEV4E5APpJcfm3mNujpKkR65Gg/exec'
  $fixture=[ordered]@{project=[ordered]@{area=40;projectScope='full';buildingType='apartment';wants3DGeneration=$false};context=[ordered]@{userRole='CONSUMER';tier='PRO';consumerMode='COMPARE';projectDomain='RESIDENTIAL_INTERIOR';buildingUse='RESIDENTIAL';templateMode='HOMEDESIGN_SIMPLE';requestId='INTERIOR_BACKEND_E2E_20260827'};projectDomain='RESIDENTIAL_INTERIOR';buildingUse='RESIDENTIAL';domainPricingIsolation=$true;coverageGateRequired=$true}
  $actions=@('health','estimate','materials','schedule','render');$results=@()
  foreach($action in $actions){try{$payload=@{action=$action};if($action -ne 'health'){foreach($k in $fixture.Keys){$payload[$k]=$fixture[$k]}};$body=$payload|ConvertTo-Json -Depth 20 -Compress;$resp=Invoke-WebRequest -UseBasicParsing -Uri $endpoint -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 30;$text=[string]$resp.Content;$json=$null;try{$json=$text|ConvertFrom-Json}catch{};$results += [ordered]@{action=$action;http=[int]$resp.StatusCode;ok=([int]$resp.StatusCode -ge 200 -and [int]$resp.StatusCode -lt 300);json=$json;text=$(if($json){''}else{$text.Substring(0,[Math]::Min(1200,$text.Length))})}}catch{$results += [ordered]@{action=$action;http=0;ok=$false;error=$_.Exception.Message}}}
  $internalNames=@('executionCost','executionUnitPrice','margin','marginRate','internalNote','subcontractorCost');$leaks=@()
  foreach($r in $results){$raw=($r|ConvertTo-Json -Depth 30 -Compress);foreach($n in $internalNames){if($raw -match ('"'+[regex]::Escape($n)+'"\s*:')){$leaks+=[ordered]@{action=$r.action;field=$n}}}}
  $healthOk=@($results|Where-Object{$_.action -eq 'health' -and $_.ok}).Count -eq 1
  [ordered]@{ok=$healthOk;action='INTERIOR_BACKEND_LIVE_E2E';endpoint=$endpoint;fixture='40PY_CONSUMER_PRO_COMPARE';results=$results;clientInternalLeakCount=$leaks.Count;leaks=$leaks;at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 40 -Compress
  exit 0
}

function Get-BaseScript([string]$TempPath){
  $h=@{'User-Agent'='HomeDesign-Chrome-Worker';'Accept'='application/vnd.github+json'}
  $u='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$PreviousCommit
  $r=Invoke-RestMethod -Uri $u -Headers $h -Method Get -TimeoutSec 20
  [IO.File]::WriteAllBytes($TempPath,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
}

function Get-WorkerStageDir {
  if(-not $WorkerTaskId){throw 'WORKER_TASK_ID_REQUIRED'}
  if(-not $Worker){throw 'WORKER_REQUIRED'}
  $base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7'
  $central=Join-Path $base 'WorkerStaging\CentralRoot'
  return (Join-Path (Join-Path (Join-Path $central 'Worker_Results') $Worker) $WorkerTaskId)
}

function Invoke-InspectWorkerStaging {
  $stageDir=Get-WorkerStageDir
  $files=@()
  if(Test-Path -LiteralPath $stageDir -PathType Container){$files=@(Get-ChildItem -LiteralPath $stageDir -File -ErrorAction SilentlyContinue|ForEach-Object{[ordered]@{name=$_.Name;size=[int64]$_.Length;lastWrite=$_.LastWriteTime.ToString('o');path=$_.FullName}})}
  $result=Read-Json (Join-Path $stageDir 'result.json')
  $ack=Read-Json (Join-Path $stageDir 'ACK.json')
  $artifactFiles=@($files|Where-Object{$_.name -notin @('result.json','ACK.json') -and $_.name -notlike '*.crdownload' -and $_.size -gt 0})
  [ordered]@{ok=$true;action='FLOW_WORKER_STAGING_FILESYSTEM_ONLY';taskId=$WorkerTaskId;worker=$Worker;stageDir=$stageDir;stageExists=(Test-Path -LiteralPath $stageDir -PathType Container);files=$files;artifactFiles=$artifactFiles;result=$result;ack=$ack;generationEvidence=([bool]$result -or @($artifactFiles).Count -gt 0);at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 30 -Compress
  exit 0
}

function Invoke-ChromeWorkerStaged {
  $stageDir=Get-WorkerStageDir
  New-Item -ItemType Directory -Force -Path $stageDir|Out-Null
  $base=Join-Path $env:LOCALAPPDATA 'HomeDesignAutomationV7'
  $stagingCentral=Join-Path $base 'WorkerStaging\CentralRoot'
  $manager=Join-Path $base 'LocalAgent\capture\ManageChromeExtensionArtifacts.ps1'
  if(-not(Test-Path -LiteralPath $manager -PathType Leaf)){throw 'CAPTUREBRIDGE_MANAGER_NOT_INSTALLED'}

  $preDir=Join-Path $base 'WorkerStaging\Preflight';New-Item -ItemType Directory -Force -Path $preDir|Out-Null
  $preFile=Join-Path $preDir ($WorkerTaskId+'-capture-preflight.json')
  [ordered]@{taskId=$WorkerTaskId;worker=$Worker;gate='PRE_GENERATION_CAPTUREBRIDGE';at=(Get-Date).ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath $preFile -Encoding UTF8
  $oldEap=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try{$preOut=& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $manager -ServiceKey 'FlowMeta' -SourcePath $preFile -TaskId ($WorkerTaskId+'_PREFLIGHT') 2>&1|Out-String;$preRc=$LASTEXITCODE}finally{$ErrorActionPreference=$oldEap}
  if($preRc -ne 0){[ordered]@{ok=$false;action='FLOW_WORKER_STAGED_PREFLIGHT';stage='CAPTUREBRIDGE_PREFLIGHT_FAILED';generationStarted=$false;preflightExit=$preRc;preflight=$preOut.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 10 -Compress;exit 2}

  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-worker-staged-'+[guid]::NewGuid().ToString('N')+'.ps1')
  Get-BaseScript $tmp
  $raw=Get-Content -LiteralPath $tmp -Raw -Encoding UTF8
  $needle="$taskId=Safe-Name `$WorkerTaskId 'WORKER_TASK_ID'"
  if(-not $raw.Contains($needle)){Remove-Item $tmp -Force -ErrorAction SilentlyContinue;throw 'BASE_WORKER_PATCH_ANCHOR_NOT_FOUND'}
  $override="function Find-CentralRoot { return `$env:HOMEDESIGN_FLOW_STAGING_CENTRAL }`r`n"+$needle
  $raw=$raw.Replace($needle,$override)
  Set-Content -LiteralPath $tmp -Value $raw -Encoding UTF8
  $env:HOMEDESIGN_FLOW_STAGING_CENTRAL=$stagingCentral

  $child=@('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$tmp,'-ChromeWorkerDriveHandoff','-Worker',$Worker,'-WorkerTaskId',$WorkerTaskId)
  if($WorkerParentTaskId){$child+=@('-WorkerParentTaskId',$WorkerParentTaskId)}
  if($WorkerAction){$child+=@('-WorkerAction',$WorkerAction)}
  if($WorkerPrompt){$child+=@('-WorkerPrompt',$WorkerPrompt)}
  if($WorkerTargetUrl){$child+=@('-WorkerTargetUrl',$WorkerTargetUrl)}
  $child+=@('-WorkerTimeoutSeconds',[string]$WorkerTimeoutSeconds)
  $oldEap=$ErrorActionPreference;$ErrorActionPreference='Continue'
  try{$childOut=& powershell.exe @child 2>&1|Out-String;$childRc=$LASTEXITCODE}finally{$ErrorActionPreference=$oldEap}
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue

  $resultPath=Join-Path $stageDir 'result.json';$ackPath=Join-Path $stageDir 'ACK.json'
  $result=Read-Json $resultPath;$ack=Read-Json $ackPath
  $mirrors=@();$mirrorOk=$true
  foreach($f in @(Get-ChildItem -LiteralPath $stageDir -File -ErrorAction SilentlyContinue|Where-Object{$_.Name -notlike '*.crdownload' -and $_.Length -gt 0})){
    $svc=$(if($f.Extension.ToLowerInvariant() -eq '.json'){'FlowMeta'}else{'Flow'})
    $oldEap=$ErrorActionPreference;$ErrorActionPreference='Continue'
    try{$mout=& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $manager -ServiceKey $svc -SourcePath $f.FullName -TaskId $WorkerTaskId 2>&1|Out-String;$mrc=$LASTEXITCODE}finally{$ErrorActionPreference=$oldEap}
    if($mrc -ne 0){$mirrorOk=$false}
    $mjson=$null;try{$mjson=($mout.Trim().Split("`n")|Select-Object -Last 1)|ConvertFrom-Json}catch{}
    $mirrors += [ordered]@{file=$f.Name;service=$svc;exit=$mrc;result=$mjson;raw=$(if($mjson){''}else{$mout.Trim()})}
  }
  $browserOk=($result -and [bool]$result.ok -and $ack -and [bool]$ack.ack)
  [ordered]@{ok=([bool]$browserOk -and [bool]$mirrorOk);action='FLOW_WORKER_STAGED_CAPTUREBRIDGE';generationStarted=$true;browserOk=[bool]$browserOk;mirrorOk=[bool]$mirrorOk;childExit=$childRc;stagingDir=$stageDir;result=$result;ack=$ack;mirrors=$mirrors;preflight=$preOut.Trim();childOutput=$childOut.Trim();at=(Get-Date).ToString('o')}|ConvertTo-Json -Depth 40 -Compress
  exit 0
}

function Invoke-Previous {
  $tmp=Join-Path $env:TEMP ('Recover-AnimationRuntime-Lineage-worker-base-'+[guid]::NewGuid().ToString('N')+'.ps1');Get-BaseScript $tmp
  $invoke=@{}
  if($DryRun){$invoke['DryRun']=$true};if($ListOnly){$invoke['ListOnly']=$true};if($ChromeUrlOnly){$invoke['ChromeUrlOnly']=$true};if($CftBoundScriptRecovery){$invoke['CftBoundScriptRecovery']=$true}
  if($ChromeUrlPrefix){$invoke['ChromeUrlPrefix']=$ChromeUrlPrefix};if($TargetSpreadsheetId){$invoke['TargetSpreadsheetId']=$TargetSpreadsheetId};if($TargetCodePattern){$invoke['TargetCodePattern']=$TargetCodePattern};if($TargetNamePattern){$invoke['TargetNamePattern']=$TargetNamePattern};if($TargetLabel){$invoke['TargetLabel']=$TargetLabel};if($CentralReadbackName){$invoke['CentralReadbackName']=$CentralReadbackName}
  & $tmp @invoke;$code=$LASTEXITCODE;Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue;exit $code
}

if($ExactScriptDeployments){Invoke-ExactScriptDeployments}
if($InteriorBackendE2E){Invoke-InteriorBackendE2E}
if($DeploymentInventory){Invoke-DeploymentInventory}
if($InspectWorkerStagingOnly){Invoke-InspectWorkerStaging}
if($ChromeWorkerDriveHandoff){Invoke-ChromeWorkerStaged}
Invoke-Previous
