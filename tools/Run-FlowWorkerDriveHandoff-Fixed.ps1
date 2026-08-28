param(
  [string]$WorkerTaskId,
  [string]$WorkerParentTaskId='FLOW_DRYWRITER_20260817_001',
  [string]$WorkerAction='GENERATE_SCENE',
  [string]$WorkerPrompt,
  [string]$WorkerTargetUrl='https://labs.google/fx/tools/flow',
  [int]$WorkerTimeoutSeconds=240
)

$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$Repo='8friend8ship-cloud/animation'
$BaseCommit='b1867ff4ef0ed4c42fea2bbc5aab9d7761669beb'
$ScriptPath='tools/Recover-AnimationRuntime-Lineage.ps1'

function Resolve-DriveFsParent {
  $target='00_중앙에이전트'
  $roots=@('G:\내 드라이브','G:\My Drive','H:\내 드라이브','H:\My Drive','I:\내 드라이브','I:\My Drive')
  try {
    foreach($d in [IO.DriveInfo]::GetDrives()) {
      $r=[string]$d.RootDirectory.FullName
      if($r){$roots+=@((Join-Path $r '내 드라이브'),(Join-Path $r 'My Drive'))}
    }
  } catch {}
  foreach($root in @($roots|Select-Object -Unique)) {
    try { if(Test-Path -LiteralPath (Join-Path $root $target)){return $root} } catch {}
  }
  return ''
}

if([string]::IsNullOrWhiteSpace($WorkerTaskId)){throw 'WORKER_TASK_ID_REQUIRED'}
if([string]::IsNullOrWhiteSpace($WorkerPrompt)){throw 'WORKER_PROMPT_REQUIRED'}
if($WorkerTimeoutSeconds -lt 30){$WorkerTimeoutSeconds=30}
if($WorkerTimeoutSeconds -gt 900){$WorkerTimeoutSeconds=900}

$parent=Resolve-DriveFsParent
if(-not $parent){throw 'CENTRAL_DRIVEFS_PARENT_NOT_FOUND'}
try {
  if(Get-PSDrive -Name HDCENTRAL -ErrorAction SilentlyContinue){Remove-PSDrive -Name HDCENTRAL -Force -ErrorAction SilentlyContinue}
  New-PSDrive -Name HDCENTRAL -PSProvider FileSystem -Root $parent -Scope Global -ErrorAction Stop|Out-Null
} catch {
  throw ('CENTRAL_DRIVEFS_PSDrive_FAILED: '+$_.Exception.Message)
}

$headers=@{'User-Agent'='HomeDesign-FlowWorker-Fixed';'Accept'='application/vnd.github+json'}
$url='https://api.github.com/repos/'+$Repo+'/contents/'+$ScriptPath+'?ref='+$BaseCommit
$r=Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 20
$tmp=Join-Path $env:TEMP ('FlowWorkerDriveHandoffFixed-'+[guid]::NewGuid().ToString('N')+'.ps1')
[IO.File]::WriteAllBytes($tmp,[Convert]::FromBase64String(([string]$r.content -replace '\s','')))
try {
  & $tmp -ChromeWorkerDriveHandoff -Worker 'FLOW' -WorkerTaskId $WorkerTaskId -WorkerParentTaskId $WorkerParentTaskId -WorkerAction $WorkerAction -WorkerPrompt $WorkerPrompt -WorkerTargetUrl $WorkerTargetUrl -WorkerTimeoutSeconds $WorkerTimeoutSeconds
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  Remove-PSDrive -Name HDCENTRAL -Force -ErrorAction SilentlyContinue
}
