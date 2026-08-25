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

Invoke-Previous
